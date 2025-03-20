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
        showErrorState('Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
    }
    
    console.log('Initializing page for user ID:', userData.userId);
    
    // Update user name in header
    const userNameElement = document.querySelector('.user-name.content-element');
    if (userNameElement && userData.fullName) {
        userNameElement.textContent = userData.fullName;
    }
    
    // Hiển thị trạng thái đang tải
    showLoadingState();
    
    try {
        // Load payment history data with timeout for better reliability
        console.log('Fetching payment history for user ID:', userData.userId);
        
        // Set a timeout to ensure we don't wait forever
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout fetching payment history')), 10000);
        });
        
        // Race the API call against the timeout
        const paymentHistoryData = await Promise.race([
            tuitionApi.getPaymentHistory(userData.userId),
            timeoutPromise
        ]);
        
        console.log('Payment history received:', paymentHistoryData);
        console.log('Data type:', typeof paymentHistoryData);
        console.log('Is array?', Array.isArray(paymentHistoryData));
        
        // Ẩn trạng thái đang tải
        hideLoadingState();
        
        // Delay the UI update slightly to ensure DOM is ready
        setTimeout(() => {
            try {
                let paymentsToDisplay = paymentHistoryData;
                
                // Special case handling
                if (!paymentsToDisplay) {
                    showEmptyState();
                    return;
                }
                
                // Ensure we have an array to work with
                if (!Array.isArray(paymentsToDisplay)) {
                    if (paymentsToDisplay.$values && Array.isArray(paymentsToDisplay.$values)) {
                        paymentsToDisplay = paymentsToDisplay.$values;
                    } else if (typeof paymentsToDisplay === 'object' && !paymentsToDisplay.message) {
                        paymentsToDisplay = [paymentsToDisplay];
                    } else {
                        // If still not an array, show empty state
                        showEmptyState();
                        return;
                    }
                }
                
                if (paymentsToDisplay.length === 0) {
                    showEmptyState();
                    return;
                }
                
                console.log('Displaying payments:', paymentsToDisplay);
                
                // Update UI with payment history data
                updatePaymentHistoryTable(paymentsToDisplay);
                updatePaymentStatistics(paymentsToDisplay);
                
                // Make sure content is visible
                document.querySelectorAll('.content-element').forEach(element => {
                    element.style.opacity = '1';
                });
                
                console.log('UI updated with payment history data');
            } catch (renderError) {
                console.error('Error rendering payment data:', renderError);
                showErrorState('Có lỗi khi hiển thị dữ liệu. Vui lòng tải lại trang.');
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        hideLoadingState();
        showErrorState('Không thể tải lịch sử thanh toán. Vui lòng thử lại sau.');
    }
}

// Update payment history table with real data
function updatePaymentHistoryTable(payments) {
    console.log('Updating payment history table with:', payments);
    
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    // Clear existing rows first
    tableBody.innerHTML = '';
    
    // Simple validation - ensure we have an array with data
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
        console.warn('No valid payment data to display');
        showEmptyState();
        return;
    }
    
    // Process each payment and add to table
    payments.forEach((payment, index) => {
        try {
            console.log(`Processing payment ${index + 1}:`, payment);
            
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
                } catch (dateError) {
                    console.warn('Error formatting date:', dateError);
                }
            }

            // Get transaction ID
            const transactionId = payment.transactionID || 'N/A';
            
            // Get payment method name
            let paymentMethodText = 'N/A';
            if (payment.paymentMethod && payment.paymentMethod.methodName) {
                paymentMethodText = payment.paymentMethod.methodName;
            } else if (payment.paymentMethodName) {
                paymentMethodText = payment.paymentMethodName;
            } else if (payment.methodName) {
                paymentMethodText = payment.methodName;
            }
            
            // Get payment status
            const status = payment.status || 'Unknown';
            
            // Create and append a new row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Mã giao dịch">${transactionId}</td>
                <td data-label="Ngày thanh toán">${formattedDate}</td>
                <td data-label="Phương thức">${paymentMethodText}</td>
                <td data-label="Số tiền">${formatCurrency(payment.amount || 0)}</td>
                <td data-label="Trạng thái"><span class="status-${status.toLowerCase()}">${getStatusText(status)}</span></td>
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
            console.log('Added row for payment:', transactionId);
        } catch (error) {
            console.error(`Error processing payment at index ${index}:`, error);
        }
    });
    
    // If no rows were added (all failed to process), show empty state
    if (tableBody.children.length === 0) {
        showEmptyState();
        return;
    }
    
    // Attach event listeners to the buttons
    attachViewDetailButtonListeners();
    
    // Log success
    console.log(`Successfully displayed ${tableBody.children.length} payment records`);
}

// Update payment statistics
function updatePaymentStatistics(payments) {
    console.log('Updating payment statistics with:', payments);
    
    // Simple validation - ensure we have valid data
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
        console.warn('No valid payment data for statistics');
        updateEmptyStatistics();
        return;
    }
    
    try {
        // Calculate statistics
        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, payment) => {
            const amount = parseFloat(payment.amount) || 0;
            return sum + amount;
        }, 0);
        
        // Count successful payments
        const successfulPayments = payments.filter(payment => {
            return payment.status && payment.status.toLowerCase() === 'success';
        }).length;
        
        // Calculate success rate
        const successRate = totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 0;
        
        // Count payment methods
        const methodCounts = {};
        payments.forEach(payment => {
            let methodName = 'N/A';
            
            // Extract method name from different possible structures
            if (payment.paymentMethod && payment.paymentMethod.methodName) {
                methodName = payment.paymentMethod.methodName;
            } else if (payment.paymentMethodName) {
                methodName = payment.paymentMethodName;
            } else if (payment.methodName) {
                methodName = payment.methodName;
            }
            
            methodCounts[methodName] = (methodCounts[methodName] || 0) + 1;
        });
        
        // Find most used payment method
        let mostUsedMethod = 'N/A';
        let highestCount = 0;
        
        for (const [method, count] of Object.entries(methodCounts)) {
            if (count > highestCount) {
                highestCount = count;
                mostUsedMethod = method;
            }
        }
        
        // Update UI
        document.querySelector('.total-transactions').textContent = totalPayments;
        document.querySelector('.total-amount').textContent = formatCurrency(totalAmount);
        document.querySelector('.success-rate').textContent = `${successRate}%`;
        document.querySelector('.preferred-method').textContent = mostUsedMethod;
        
        console.log('Payment statistics updated successfully');
    } catch (error) {
        console.error('Error updating payment statistics:', error);
        updateEmptyStatistics();
    }
}

// Show empty state
function showEmptyState() {
    console.log('Showing empty state - no payment data available');
    
    // Update table with empty state
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-history"></i>
                        <p>Chưa có lịch sử thanh toán</p>
                        <small>Các giao dịch thanh toán sẽ xuất hiện tại đây sau khi bạn thanh toán học phí</small>
                        <a href="tuition.html" class="btn btn-refresh mt-3">
                            <i class="fas fa-money-bill-wave"></i> Đến trang thanh toán học phí
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Update statistics with empty values
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
    console.log('Hiding loading state');
    
    // Ẩn tất cả placeholder
    document.querySelectorAll('.loading-placeholder').forEach(placeholder => {
        placeholder.style.display = 'none';
    });
    
    // Hiển thị nội dung thực
    document.querySelectorAll('.content-element').forEach(element => {
        element.style.opacity = '1';
    });
    
    // Add CSS class to show everything is loaded
    document.body.classList.add('loaded');
}

// Show error state
function showErrorState(message) {
    console.warn('Showing error state:', message);
    
    // Hide loading placeholders
    document.querySelectorAll('.loading-placeholder').forEach(placeholder => {
        placeholder.style.display = 'none';
    });
    
    // Show content elements
    document.querySelectorAll('.content-element').forEach(element => {
        element.style.opacity = '1';
    });
    
    // Display error message in table
    const tableBody = document.querySelector('.payment-history-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message || 'Đã xảy ra lỗi khi tải dữ liệu'}</p>
                        <button class="btn btn-refresh" onclick="window.location.reload();">
                            <i class="fas fa-sync-alt"></i> Thử lại
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Update statistics with empty values
    updateEmptyStatistics();
    
    // Show a toast notification if available
    if (typeof showToast === 'function') {
        showToast('error', message || 'Đã xảy ra lỗi khi tải dữ liệu');
    }
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