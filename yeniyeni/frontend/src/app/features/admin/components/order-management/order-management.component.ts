import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderResponse } from '../../../../services/order.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.css'],
  providers: [OrderService]
})
export class OrderManagementComponent implements OnInit {
  orders: OrderResponse[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Detay modali için değişkenler
  selectedOrder: OrderResponse | null = null;
  showDetailModal: boolean = false;
  
  // Durum güncelleme modali için değişkenler
  showUpdateModal: boolean = false;
  updatingOrder: OrderResponse | null = null;
  newStatus: string = '';
  newPaymentStatus: string = '';
  statusOptions: string[] = [];
  paymentStatusOptions: string[] = [];
  updateLoading: boolean = false;
  updateError: string | null = null;

  constructor(private orderService: OrderService) { }

  ngOnInit(): void {
    this.loadOrders();
    this.statusOptions = this.orderService.getOrderStatuses();
    this.paymentStatusOptions = this.orderService.getPaymentStatuses();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getAllOrders().subscribe({
      next: (data: OrderResponse[]) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  // Detay modalını açan fonksiyon
  openOrderDetails(order: OrderResponse): void {
    this.selectedOrder = order;
    this.showDetailModal = true;
  }

  // Durum güncelleme modalını açan fonksiyon
  openUpdateStatus(order: OrderResponse): void {
    this.updatingOrder = order;
    this.newStatus = order.status;
    this.newPaymentStatus = order.paymentStatus;
    this.showUpdateModal = true;
  }

  // Modali kapatma fonksiyonu
  closeModal(): void {
    this.showDetailModal = false;
    this.showUpdateModal = false;
    this.selectedOrder = null;
    this.updatingOrder = null;
    this.updateError = null;
  }

  // Sipariş durumunu güncelleyen fonksiyon
  updateOrderStatus(): void {
    if (!this.updatingOrder) return;
    
    this.updateLoading = true;
    this.updateError = null;
    
    // Önce sipariş durumunu güncelle
    this.orderService.updateOrderStatus(this.updatingOrder.id, this.newStatus).subscribe({
      next: () => {
        // Sonra ödeme durumunu güncelle
        this.orderService.updatePaymentStatus(this.updatingOrder!.id, this.newPaymentStatus).subscribe({
          next: () => {
            this.updateLoading = false;
            this.closeModal();
            // Siparişleri yeniden yükle
            this.loadOrders();
          },
          error: (err: Error) => {
            this.updateError = `Payment status update failed: ${err.message}`;
            this.updateLoading = false;
          }
        });
      },
      error: (err: Error) => {
        this.updateError = `Order status update failed: ${err.message}`;
        this.updateLoading = false;
      }
    });
  }

  // Siparişi yazdıran fonksiyon
  printOrder(order: OrderResponse): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popup windows for printing');
      return;
    }
    
    // Basit yazdırma HTML template'i
    const printContent = `
      <html>
        <head>
          <title>Order #${order.id} - Print</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 20px; }
            .order-info { margin-bottom: 20px; }
            .order-info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; text-align: right; margin-top: 20px; }
            .address { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order Invoice</h1>
            <h2>Order #${order.id}</h2>
            <p>Date: ${new Date(order.orderDate || order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div class="order-info">
            <p><strong>Customer:</strong> ${order.userFirstName} ${order.userLastName}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          </div>
          
          <div class="address">
            <h3>Shipping Address</h3>
            <p>${order.shippingAddress.recipientName}</p>
            <p>${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p>${order.shippingAddress.addressLine2}</p>` : ''}
            <p>${order.shippingAddress.city}, ${order.shippingAddress.postalCode}</p>
            <p>${order.shippingAddress.country}</p>
            <p>Phone: ${order.shippingAddress.phoneNumber}</p>
          </div>
          
          <h3>Order Items</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.price.toFixed(2)} ₺</td>
                  <td>${item.quantity}</td>
                  <td>${item.subtotal.toFixed(2)} ₺</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p>Total Amount: ${order.totalAmount.toFixed(2)} ₺</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Belgeden resimler yüklendikten sonra yazdır
    printWindow.onload = function() {
      printWindow.print();
      // printWindow.close();
    };
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-warning text-dark';
      case 'PROCESSING':
        return 'bg-info text-white';
      case 'SHIPPED':
        return 'bg-primary text-white';
      case 'DELIVERED':
        return 'bg-success text-white';
      case 'CANCELLED':
        return 'bg-danger text-white';
      case 'RETURNED':
        return 'bg-secondary text-white';
      default:
        return 'bg-light text-dark';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'PAID':
        return 'bg-success text-white';
      case 'PENDING':
        return 'bg-warning text-dark';
      case 'REFUNDED':
        return 'bg-info text-white';
      case 'FAILED':
        return 'bg-danger text-white';
      default:
        return 'bg-light text-dark';
    }
  }
} 