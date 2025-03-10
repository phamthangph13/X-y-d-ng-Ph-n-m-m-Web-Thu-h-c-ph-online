// Import utilities
import { isAuthenticated } from '../utils/auth.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        // Redirect to login page if not authenticated
        console.log('User not authenticated, redirecting to login page');
        window.location.href = 'login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
        return;
    }

    // Initialize payment history page functionality
    initPaymentHistoryPage();
});

// Initialize payment history page functionality
function initPaymentHistoryPage() {
    console.log('Payment history page initialized for authenticated user');
    
    // Get payment detail buttons
    const viewDetailButtons = document.querySelectorAll('.view-detail-btn');
    const paymentDetailModal = document.getElementById('paymentDetailModal');
    const closeDetailButtons = document.querySelectorAll('.close-detail-btn');
    
    // Open payment detail modal
    if (viewDetailButtons && viewDetailButtons.length > 0) {
        viewDetailButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get payment details from data attributes
                const paymentId = this.dataset.paymentId;
                const courseName = this.dataset.courseName;
                const amount = this.dataset.amount;
                const date = this.dataset.date;
                const method = this.dataset.method;
                const status = this.dataset.status;
                
                // Populate modal with payment details
                if (paymentDetailModal) {
                    const idElement = paymentDetailModal.querySelector('.payment-id');
                    const courseElement = paymentDetailModal.querySelector('.payment-course');
                    const amountElement = paymentDetailModal.querySelector('.payment-amount');
                    const dateElement = paymentDetailModal.querySelector('.payment-date');
                    const methodElement = paymentDetailModal.querySelector('.payment-method');
                    const statusElement = paymentDetailModal.querySelector('.payment-status');
                    
                    if (idElement) idElement.textContent = paymentId || '';
                    if (courseElement) courseElement.textContent = courseName || '';
                    if (amountElement) amountElement.textContent = amount || '';
                    if (dateElement) dateElement.textContent = date || '';
                    if (methodElement) methodElement.textContent = method || '';
                    if (statusElement) {
                        statusElement.textContent = status || '';
                        // Set status class
                        statusElement.className = 'payment-status';
                        if (status === 'Hoàn thành') {
                            statusElement.classList.add('text-success');
                        } else if (status === 'Đang xử lý') {
                            statusElement.classList.add('text-warning');
                        } else if (status === 'Thất bại') {
                            statusElement.classList.add('text-danger');
                        }
                    }
                    
                    // Open modal
                    openModal(paymentDetailModal);
                }
            });
        });
    }
    
    // Close payment detail modal
    if (closeDetailButtons && closeDetailButtons.length > 0) {
        closeDetailButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const modal = this.closest('.modal');
                if (modal) {
                    closeModal(modal);
                }
            });
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Open modal function
    function openModal(modal) {
        if (!modal) return;
        
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal function
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
    
    // Handle download invoice button
    const downloadInvoiceButtons = document.querySelectorAll('.download-invoice-btn');
    if (downloadInvoiceButtons && downloadInvoiceButtons.length > 0) {
        downloadInvoiceButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                alert('Tính năng tải hóa đơn sẽ được cập nhật trong phiên bản tiếp theo.');
            });
        });
    }
} 