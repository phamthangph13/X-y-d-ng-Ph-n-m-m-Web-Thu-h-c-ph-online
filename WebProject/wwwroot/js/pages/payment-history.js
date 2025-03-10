// Import utilities
import { isAuthenticated, getUserData } from '../utils/auth.js';
import { tuitionApi } from '../services/api.js';

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
async function initPaymentHistoryPage() {
    console.log('Payment history page initialized for authenticated user');
    
    // Get user data
    const userData = getUserData();
    if (!userData || !userData.userId) {
        console.error('User data not found');
        return;
    }
    
    // Update user name in header
    const userNameElement = document.querySelector('.user-name.content-element');
    if (userNameElement && userData.fullName) {
        userNameElement.textContent = userData.fullName;
    }
    
    // Hiển thị trạng thái đang tải
    showLoadingState();
    
    try {
        // Load payment history data
        const paymentHistory = await tuitionApi.getPaymentHistory(userData.userId);
        console.log('Payment history:', paymentHistory);
        
        // Ẩn trạng thái đang tải
        hideLoadingState();
        
        // Update UI with payment history data
        updatePaymentHistoryTable(paymentHistory);
        updatePaymentStatistics(paymentHistory);
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        showErrorState('Không thể tải lịch sử thanh toán. Vui lòng thử lại sau.');
    }
}

// Update payment history table with real data
function updatePaymentHistoryTable(payments) {
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (!tableBody) return;
    
    // Xử lý dữ liệu trả về từ API
    let paymentsArray = [];
    
    if (!payments) {
        showEmptyState();
        return;
    }
    
    // Kiểm tra nếu có thông báo lỗi
    if (payments.message) {
        console.warn('API returned message:', payments.message);
        showErrorState(payments.message);
        return;
    }
    
    // Xử lý cấu trúc dữ liệu trả về
    if (payments.$values) {
        paymentsArray = payments.$values;
    } else if (payments.values) {
        paymentsArray = payments.values;
    } else if (Array.isArray(payments)) {
        paymentsArray = payments;
    } else if (typeof payments === 'object') {
        paymentsArray = [payments];
    }
    
    if (paymentsArray.length === 0) {
        showEmptyState();
        return;
    }
    
    console.log('Processing payments array:', paymentsArray);
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows
    paymentsArray.forEach(payment => {
        const row = document.createElement('tr');
        
        // Format payment date
        let formattedDate = 'N/A';
        if (payment.paymentDate) {
            try {
                const paymentDate = new Date(payment.paymentDate);
                formattedDate = new Intl.DateTimeFormat('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(paymentDate);
            } catch (error) {
                console.warn('Error formatting date:', error);
            }
        }

        // Get transaction ID - use transactionID field
        const transactionId = payment.transactionID || 'N/A';
        
        // Get payment method - extract methodName from paymentMethod object
        const paymentMethodText = payment.paymentMethod && payment.paymentMethod.methodName 
            ? payment.paymentMethod.methodName 
            : 'N/A';
        
        row.innerHTML = `
            <td data-label="Mã giao dịch">${transactionId}</td>
            <td data-label="Ngày thanh toán">${formattedDate}</td>
            <td data-label="Phương thức">${paymentMethodText}</td>
            <td data-label="Số tiền">${formatCurrency(payment.amount || 0)}</td>
            <td data-label="Trạng thái"><span class="status-${(payment.status || '').toLowerCase()}">${getStatusText(payment.status)}</span></td>
            <td data-label="Hành động">
                <button class="btn-view-detail" data-payment-id="${payment.paymentID || ''}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-download" data-payment-id="${payment.paymentID || ''}">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Attach event listeners to the new buttons
    attachViewDetailButtonListeners();
}

// Update payment statistics
function updatePaymentStatistics(payments) {
    let paymentsArray = [];
    
    // Xử lý cấu trúc dữ liệu
    if (payments && payments.$values) {
        paymentsArray = payments.$values;
    } else if (payments && payments.values) {
        paymentsArray = payments.values;
    } else if (Array.isArray(payments)) {
        paymentsArray = payments;
    } else if (payments && typeof payments === 'object' && !payments.message) {
        paymentsArray = [payments];
    }
    
    if (!paymentsArray || paymentsArray.length === 0) {
        updateEmptyStatistics();
        return;
    }
    
    // Calculate statistics
    const totalPayments = paymentsArray.length;
    const totalAmount = paymentsArray.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const successfulPayments = paymentsArray.filter(p => (p.status || '').toLowerCase() === 'success').length;
    const successRate = (successfulPayments / totalPayments) * 100;
    
    // Group payments by method
    const paymentMethods = paymentsArray.reduce((acc, payment) => {
        const method = payment.paymentMethod || payment.method || 'unknown';
        const methodText = getPaymentMethodText(method);
        acc[methodText] = (acc[methodText] || 0) + 1;
        return acc;
    }, {});
    
    // Find most used payment method
    const mostUsedMethod = Object.entries(paymentMethods)
        .sort(([,a], [,b]) => b - a)[0][0];
    
    // Update UI
    document.querySelector('.total-transactions').textContent = totalPayments;
    document.querySelector('.total-amount').textContent = formatCurrency(totalAmount);
    document.querySelector('.success-rate').textContent = `${Math.round(successRate)}%`;
    document.querySelector('.preferred-method').textContent = mostUsedMethod;
}

// Show empty state
function showEmptyState() {
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-history"></i>
                        <p>Chưa có lịch sử thanh toán</p>
                    </div>
                </td>
            </tr>
        `;
    }
    updateEmptyStatistics();
}

// Update statistics with empty state
function updateEmptyStatistics() {
    document.querySelector('.total-transactions').textContent = '0';
    document.querySelector('.total-amount').textContent = formatCurrency(0);
    document.querySelector('.success-rate').textContent = '0%';
    document.querySelector('.preferred-method').textContent = 'N/A';
}

// Show loading state
function showLoadingState() {
    // Hiển thị placeholder và ẩn nội dung
    document.querySelectorAll('.loading-placeholder').forEach(placeholder => {
        placeholder.style.display = 'block';
    });
    document.querySelectorAll('.content-element').forEach(element => {
        element.style.opacity = '0';
    });
    
    // Hiển thị trạng thái đang tải trong bảng
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang tải lịch sử thanh toán...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Hide loading state
function hideLoadingState() {
    document.querySelectorAll('.loading-placeholder').forEach(placeholder => {
        placeholder.style.display = 'none';
    });
    document.querySelectorAll('.content-element').forEach(element => {
        element.style.opacity = '1';
    });
}

// Show error state
function showErrorState(errorMessage) {
    hideLoadingState();
    
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>${errorMessage}</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateEmptyStatistics();
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(amount);
}

// Helper function to get payment method text
function getPaymentMethodText(method) {
    if (!method) return 'N/A';
    
    // If method is an object with methodName, return it
    if (typeof method === 'object' && method.methodName) {
        return method.methodName;
    }
    
    // Otherwise use the switch case for string values
    try {
        switch (String(method).toLowerCase()) {
            case 'banking': return 'Internet Banking';
            case 'credit': return 'Thẻ tín dụng/ghi nợ';
            case 'momo': return 'Ví MoMo';
            case 'vnpay': return 'VN Pay';
            case 'zalopay': return 'Zalo Pay';
            default: return method;
        }
    } catch (error) {
        console.warn('Error processing payment method:', error);
        return 'N/A';
    }
}

// Helper function to get status text
function getStatusText(status) {
    if (!status) return 'N/A';
    
    try {
        switch (String(status).toLowerCase()) {
            case 'success': return 'Thành công';
            case 'pending': return 'Đang xử lý';
            case 'failed': return 'Thất bại';
            case 'refunded': return 'Đã hoàn tiền';
            default: return status;
        }
    } catch (error) {
        console.warn('Error processing status:', error);
        return 'N/A';
    }
}

// Attach event listeners to view detail buttons
function attachViewDetailButtonListeners() {
    const viewButtons = document.querySelectorAll('.btn-view-detail');
    const downloadButtons = document.querySelectorAll('.btn-download');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const paymentId = btn.dataset.paymentId;
            
            try {
                const paymentDetails = await tuitionApi.getPaymentDetails(paymentId);
                showPaymentDetailsModal(paymentDetails);
            } catch (error) {
                console.error('Error fetching payment details:', error);
                alert('Không thể tải thông tin chi tiết giao dịch. Vui lòng thử lại sau.');
            }
        });
    });
    
    downloadButtons.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const paymentId = btn.dataset.paymentId;
            
            try {
                await tuitionApi.downloadInvoice(paymentId);
            } catch (error) {
                console.error('Error downloading invoice:', error);
                alert('Không thể tải hoá đơn. Vui lòng thử lại sau.');
            }
        });
    });
}

// Show payment details modal
function showPaymentDetailsModal(details) {
    const modal = document.getElementById('paymentDetailModal');
    if (!modal) return;

    // Format payment date
    const paymentDate = new Date(details.paymentDate);
    const formattedDate = new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(paymentDate);

    // Get payment method text from the object
    const paymentMethodText = details.paymentMethod && details.paymentMethod.methodName 
        ? details.paymentMethod.methodName 
        : 'N/A';

    // Update modal content
    modal.querySelector('.transaction-id').textContent = details.transactionID || 'N/A';
    modal.querySelector('.payment-date').textContent = formattedDate;
    modal.querySelector('.payment-method').textContent = paymentMethodText;
    modal.querySelector('.payment-amount').textContent = formatCurrency(details.amount);
    modal.querySelector('.payment-status').textContent = getStatusText(details.status);
    modal.querySelector('.payment-description').textContent = details.paymentReference || 'Thanh toán học phí';

    // Update payment items table
    const tableBody = modal.querySelector('.payment-items-table tbody');
    if (tableBody && details.items && details.items.length > 0) {
        tableBody.innerHTML = details.items.map(item => `
            <tr>
                <td>${item.courseCode || 'N/A'}</td>
                <td>${item.courseName || 'N/A'}</td>
                <td>${item.credits || '-'}</td>
                <td>${item.semester || 'N/A'}</td>
                <td>${formatCurrency(item.amount)}</td>
            </tr>
        `).join('');
    } else if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-info-circle"></i>
                        <p>Không có dữ liệu chi tiết</p>
                    </div>
                </td>
            </tr>
        `;
    }

    // Add event listeners for modal buttons
    const closeButtons = modal.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.onclick = () => closeModal(modal);
    });

    const downloadButton = modal.querySelector('.download-btn');
    if (downloadButton) {
        downloadButton.onclick = async () => {
            try {
                await tuitionApi.downloadInvoice(details.paymentId);
            } catch (error) {
                console.error('Error downloading invoice:', error);
                alert('Không thể tải hoá đơn. Vui lòng thử lại sau.');
            }
        };
    }

    // Show modal
    openModal(modal);
}

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

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
}); 