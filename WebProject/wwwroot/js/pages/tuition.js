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

    // Initialize tuition page functionality
    initTuitionPage();
});

// Initialize tuition page functionality
async function initTuitionPage() {
    console.log('Tuition page initialized for authenticated user');
    
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
    
    // Load student data
    try {
        // First, test if the controller is working
        console.log('Testing StudentTuitionController...');
        try {
            const testResult = await tuitionApi.testStudentTuition();
            console.log('StudentTuitionController test result:', testResult);
        } catch (testError) {
            console.error('StudentTuitionController test failed:', testError);
            showErrorState('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            return;
        }
        
        // Check if there is data in the database
        console.log('Checking database data...');
        try {
            const dataResult = await tuitionApi.checkData();
            console.log('Database data check result:', dataResult);
            
            // If there is no data, show a message
            if (dataResult.studentFeesCount === 0) {
                console.warn('No student fees found in the database');
                showErrorState('Không có dữ liệu học phí trong hệ thống. Vui lòng liên hệ quản trị viên.');
                return;
            }
        } catch (dataError) {
            console.error('Database data check failed:', dataError);
            // Continue with other API calls
        }
        
        // Assuming the student ID is the same as the user ID for simplicity
        // In a real application, you might need to fetch the student ID first
        const studentId = userData.userId;
        console.log('Fetching data for student ID:', studentId);
        
        // Load all student fees first
        let allFees = null;
        try {
            allFees = await tuitionApi.getStudentFees(studentId);
            console.log('All student fees:', allFees);
        } catch (error) {
            console.warn('Could not load all student fees:', error);
        }
        
        // Load current semester fees
        let currentSemesterFees = null;
        try {
            currentSemesterFees = await tuitionApi.getCurrentSemesterFees(studentId);
            console.log('Current semester fees:', currentSemesterFees);
        } catch (error) {
            console.warn('Could not load current semester fees:', error);
        }
        
        // Load unpaid fees
        let unpaidFees = null;
        try {
            unpaidFees = await tuitionApi.getUnpaidFees(studentId);
            console.log('Unpaid fees:', unpaidFees);
        } catch (error) {
            console.warn('Could not load unpaid fees:', error);
        }
        
        // If we couldn't load any data, show an error
        if (!currentSemesterFees && !allFees && !unpaidFees) {
            showErrorState('Không thể tải bất kỳ dữ liệu học phí nào.');
            return;
        }
        
        // Ẩn trạng thái đang tải
        hideLoadingState();
        
        // Update UI with the fetched data
        updateTuitionOverview(currentSemesterFees, allFees, unpaidFees);
        
        // Ưu tiên hiển thị dữ liệu theo thứ tự: allFees > unpaidFees > currentSemesterFees
        if (allFees) {
            updateTuitionTable(allFees);
        } else if (unpaidFees) {
            updateTuitionTable(unpaidFees);
        } else if (currentSemesterFees) {
            updateTuitionTable([currentSemesterFees]);
        } else {
            // Nếu không có dữ liệu nào, hiển thị trạng thái trống
            updateEmptyStateUI();
        }
        
    } catch (error) {
        console.error('Error loading tuition data:', error);
        // Show error message to user
        showErrorState('Không thể tải dữ liệu học phí. Vui lòng thử lại sau.');
    }
    
    // Initialize UI event handlers
    initUIEventHandlers();
}

// Update tuition overview section with real data
function updateTuitionOverview(currentSemesterFees, allFees, unpaidFees) {
    console.log('Updating overview with:', { currentSemesterFees, allFees, unpaidFees });
    
    // Calculate total amounts
    let totalAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;
    
    // Xử lý dữ liệu allFees
    let allFeesArray = [];
    
    // Kiểm tra nếu có thông báo lỗi
    if (allFees && allFees.message) {
        console.warn('API returned message for allFees:', allFees.message);
    } 
    // Xử lý dữ liệu bình thường
    else if (allFees) {
        if (allFees.$values) {
            allFeesArray = allFees.$values;
        } else if (allFees.values) {
            allFeesArray = allFees.values;
        } else if (Array.isArray(allFees)) {
            allFeesArray = allFees;
        } else if (typeof allFees === 'object') {
            // Nếu là đối tượng đơn lẻ
            allFeesArray = [allFees];
        }
    }
    
    if (allFeesArray && allFeesArray.length > 0) {
        // Sum up all fees
        totalAmount = allFeesArray.reduce((sum, fee) => sum + (fee.totalAmount || 0), 0);
        
        // Calculate paid amount (fees with status "Paid")
        paidAmount = allFeesArray
            .filter(fee => fee.status === "Paid")
            .reduce((sum, fee) => sum + (fee.totalAmount || 0), 0);
        
        // Nếu có học phí với trạng thái "Partially Paid", tính toán số tiền đã thanh toán
        const partiallyPaidFees = allFeesArray.filter(fee => fee.status === "Partially Paid");
        if (partiallyPaidFees.length > 0) {
            partiallyPaidFees.forEach(fee => {
                let payments = [];
                if (fee.payments && fee.payments.$values) {
                    payments = fee.payments.$values;
                } else if (fee.payments && fee.payments.values) {
                    payments = fee.payments.values;
                } else if (fee.payments && Array.isArray(fee.payments)) {
                    payments = fee.payments;
                }
                
                if (payments && payments.length > 0) {
                    const paidForThisFee = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                    paidAmount += paidForThisFee;
                }
            });
        }
        
        // Calculate outstanding amount
        outstandingAmount = totalAmount - paidAmount;
    } else {
        // Nếu không có dữ liệu từ allFees, thử lấy từ unpaidFees
        let unpaidFeesArray = [];
        
        if (unpaidFees && unpaidFees.$values) {
            unpaidFeesArray = unpaidFees.$values;
        } else if (unpaidFees && unpaidFees.values) {
            unpaidFeesArray = unpaidFees.values;
        } else if (unpaidFees && Array.isArray(unpaidFees)) {
            unpaidFeesArray = unpaidFees;
        } else if (unpaidFees && typeof unpaidFees === 'object' && !unpaidFees.message) {
            // Nếu là đối tượng đơn lẻ và không phải là thông báo lỗi
            unpaidFeesArray = [unpaidFees];
        }
        
        if (unpaidFeesArray && unpaidFeesArray.length > 0) {
            // Tính tổng số tiền chưa thanh toán
            outstandingAmount = unpaidFeesArray.reduce((sum, fee) => sum + (fee.totalAmount || 0), 0);
            totalAmount = outstandingAmount; // Giả sử tổng số tiền bằng số tiền chưa thanh toán
        }
    }
    
    // Update UI elements
    document.querySelector('.total-tuition').textContent = formatCurrency(totalAmount);
    document.querySelector('.paid-amount').textContent = formatCurrency(paidAmount);
    document.querySelector('.outstanding-amount').textContent = formatCurrency(outstandingAmount);
    
    // Update progress bar
    const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.width = `${progressPercentage}%`;
    progressBar.textContent = `${Math.round(progressPercentage)}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progressPercentage));
    
    // Update progress labels
    const progressLabels = document.querySelectorAll('.progress-labels span');
    progressLabels[0].textContent = '0 ₫';
    progressLabels[1].textContent = formatCurrency(totalAmount);
}

// Update tuition table with real data
function updateTuitionTable(fees) {
    if (!fees) {
        return;
    }
    
    // Kiểm tra cấu trúc dữ liệu trả về
    console.log('Updating table with fees data structure:', typeof fees, fees);
    
    // Kiểm tra nếu có thông báo lỗi
    if (fees.message) {
        console.warn('API returned message:', fees.message);
        
        // Hiển thị trạng thái trống với thông báo từ API
        const tableBody = document.querySelector('.tuition-table tbody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-info-circle"></i>
                        <p>${fees.message}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Xử lý dữ liệu trả về từ API
    let feesArray = [];
    
    // Kiểm tra nếu dữ liệu có cấu trúc $values (từ ReferenceHandler.Preserve)
    if (fees.$values) {
        feesArray = fees.$values;
    } 
    // Kiểm tra nếu dữ liệu có cấu trúc values (từ API trả về khi không có dữ liệu)
    else if (fees.values) {
        feesArray = fees.values;
    }
    // Kiểm tra nếu dữ liệu là mảng
    else if (Array.isArray(fees)) {
        feesArray = fees;
    }
    // Nếu là đối tượng đơn lẻ
    else if (typeof fees === 'object' && fees !== null) {
        feesArray = [fees];
    }
    
    console.log('Processed fees array:', feesArray);
    
    if (feesArray.length === 0) {
        // Hiển thị trạng thái trống nếu không có dữ liệu
        const tableBody = document.querySelector('.tuition-table tbody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-info-circle"></i>
                        <p>Không có dữ liệu học phí</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const tableBody = document.querySelector('.tuition-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows
    
    feesArray.forEach(fee => {
        // Kiểm tra cấu trúc của fee
        console.log('Processing fee:', fee);
        
        // Lấy danh sách chi tiết học phí
        let feeDetails = [];
        if (fee.studentFeeDetails && fee.studentFeeDetails.$values) {
            feeDetails = fee.studentFeeDetails.$values;
        } else if (fee.studentFeeDetails && Array.isArray(fee.studentFeeDetails)) {
            feeDetails = fee.studentFeeDetails;
        }
        
        console.log('Fee details:', feeDetails);
        
        // Nếu không có chi tiết học phí, hiển thị một hàng cho học phí
        if (!feeDetails || feeDetails.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Mã học phần">${fee.studentFeeID || 'N/A'}</td>
                <td data-label="Tên học phần">Học phí</td>
                <td data-label="Số tín chỉ">-</td>
                <td data-label="Học kỳ">${fee.semester ? fee.semester.semesterName : 'N/A'}</td>
                <td data-label="Số tiền">${formatCurrency(fee.totalAmount || 0)}</td>
                <td data-label="Trạng thái"><span class="status-${(fee.status || 'unknown').toLowerCase()}">${getStatusText(fee.status || 'Unknown')}</span></td>
                <td data-label="Hành động">
                    ${fee.status !== "Paid" ? 
                        `<button class="btn-pay" data-fee-id="${fee.studentFeeID}" data-amount="${fee.totalAmount}"><i class="fas fa-credit-card"></i></button>` : 
                        `<button class="btn-view-detail" data-fee-id="${fee.studentFeeID}"><i class="fas fa-eye"></i></button>`
                    }
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        // Hiển thị một hàng cho mỗi chi tiết học phí
        feeDetails.forEach(detail => {
            const row = document.createElement('tr');
            
            // Lấy thông tin danh mục học phí
            let categoryName = 'Học phí';
            if (detail.feeCategory) {
                categoryName = detail.feeCategory.categoryName;
            }
            
            // Create a unique ID for the fee detail
            const feeDetailId = `${fee.studentFeeID}-${detail.studentFeeDetailID}`;
            
            row.innerHTML = `
                <td data-label="Mã học phần">${feeDetailId}</td>
                <td data-label="Tên học phần">${categoryName}</td>
                <td data-label="Số tín chỉ">-</td>
                <td data-label="Học kỳ">${fee.semester ? fee.semester.semesterName : 'N/A'}</td>
                <td data-label="Số tiền">${formatCurrency(detail.amount)}</td>
                <td data-label="Trạng thái"><span class="status-${fee.status.toLowerCase()}">${getStatusText(fee.status)}</span></td>
                <td data-label="Hành động">
                    ${fee.status !== "Paid" ? 
                        `<button class="btn-pay" data-fee-id="${fee.studentFeeID}" data-fee-detail-id="${detail.studentFeeDetailID}" data-amount="${detail.amount}"><i class="fas fa-credit-card"></i></button>` : 
                        `<button class="btn-view-detail" data-fee-id="${fee.studentFeeID}"><i class="fas fa-eye"></i></button>`
                    }
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    });
    
    // Re-attach event listeners to the new buttons
    attachPaymentButtonListeners();
}

// Attach event listeners to payment buttons
function attachPaymentButtonListeners() {
    const payButtons = document.querySelectorAll('.btn-pay');
    
    payButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const feeId = btn.dataset.feeId || '';
            const feeDetailId = btn.dataset.feeDetailId || '';
            const amount = btn.dataset.amount || '';
            
            document.getElementById('courseCode').textContent = feeDetailId;
            document.getElementById('courseName').textContent = 'Học phí';
            document.getElementById('courseAmount').textContent = formatCurrency(amount);
            
            openModal(document.getElementById('paymentModal'));
        });
    });
}

// Initialize UI event handlers
function initUIEventHandlers() {
    // Payment modals
    const paymentModal = document.getElementById('paymentModal');
    const successModal = document.getElementById('successModal');
    const payAllBtn = document.getElementById('payAllBtn');
    const cancelBtns = document.querySelectorAll('.cancel-btn');
    const closeSuccessBtn = document.querySelector('.close-success-btn');
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const bankingDetails = document.getElementById('bankingDetails');
    const creditDetails = document.getElementById('creditDetails');

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

    // Show payment details based on selected method
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', function() {
            const selectedMethod = this.value;
            
            // Hide all payment details first
            bankingDetails.style.display = 'none';
            creditDetails.style.display = 'none';
            
            // Show selected payment details
            if (selectedMethod === 'banking') {
                bankingDetails.style.display = 'block';
            } else if (selectedMethod === 'credit') {
                creditDetails.style.display = 'block';
            }
        });
    }
    
    // Handle "Pay All" button click
    if (payAllBtn) {
        payAllBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                const userData = getUserData();
                if (!userData || !userData.userId) {
                    console.error('User data not found');
                    return;
                }
                
                const unpaidFees = await tuitionApi.getUnpaidFees(userData.userId);
                
                if (!unpaidFees || unpaidFees.length === 0) {
                    alert('Không có khoản học phí nào cần thanh toán.');
                    return;
                }
                
                // Calculate total unpaid amount
                const totalUnpaid = unpaidFees.reduce((sum, fee) => sum + fee.totalAmount, 0);
                
                document.getElementById('courseCode').textContent = 'ALL';
                document.getElementById('courseName').textContent = 'Tất cả học phần chưa thanh toán';
                document.getElementById('courseAmount').textContent = formatCurrency(totalUnpaid);
                openModal(paymentModal);
            } catch (error) {
                console.error('Error fetching unpaid fees:', error);
                alert('Không thể tải dữ liệu học phí chưa thanh toán. Vui lòng thử lại sau.');
            }
        });
    }
    
    // Close modals
    if (cancelBtns) {
        cancelBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const modal = btn.closest('.modal');
                closeModal(modal);
            });
        });
    }
    
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal(successModal);
            
            // Reload page to show updated status
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });
    }
    
    // Process payment
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate payment processing
            closeModal(paymentModal);
            
            // Show success message after a short delay
            setTimeout(() => {
                // Generate a random transaction ID
                const transactionId = 'TXN' + Math.floor(Math.random() * 1000000000);
                document.querySelector('.transaction-id').textContent = transactionId;
                
                openModal(successModal);
            }, 1000);
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Make openModal and closeModal available globally in this function
    window.openModal = openModal;
    window.closeModal = closeModal;
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(amount);
}

// Helper function to get status text
function getStatusText(status) {
    switch (status.toLowerCase()) {
        case 'paid': return 'Đã thanh toán';
        case 'unpaid': return 'Chưa thanh toán';
        case 'partial': return 'Thanh toán một phần';
        case 'overdue': return 'Quá hạn';
        default: return status;
    }
}

// Show empty state UI when no data is available
function updateEmptyStateUI() {
    // Update overview with zeros
    document.querySelector('.total-tuition').textContent = formatCurrency(0);
    document.querySelector('.paid-amount').textContent = formatCurrency(0);
    document.querySelector('.outstanding-amount').textContent = formatCurrency(0);
    
    // Update progress bar
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    
    // Update table with empty state message
    const tableBody = document.querySelector('.tuition-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                <div class="empty-state-container">
                    <i class="fas fa-info-circle"></i>
                    <p>Không có dữ liệu học phí</p>
                </div>
            </td>
        </tr>
    `;
    
    // Disable action buttons
    document.getElementById('payAllBtn').disabled = true;
    document.getElementById('downloadInvoiceBtn').disabled = true;
}

// Hiển thị trạng thái đang tải
function showLoadingState() {
    // Hiển thị placeholder và ẩn nội dung
    document.querySelectorAll('.loading-placeholder').forEach(placeholder => {
        placeholder.style.display = 'block';
    });
    document.querySelectorAll('.content-element').forEach(element => {
        element.style.opacity = '0';
    });
    
    // Hiển thị thông báo đang tải trong bảng
    const tableBody = document.querySelector('.tuition-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang tải dữ liệu học phí...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Ẩn trạng thái đang tải
function hideLoadingState() {
    // Ẩn placeholder và hiển thị nội dung
    document.querySelectorAll('.loading-placeholder').forEach(placeholder => {
        placeholder.style.display = 'none';
    });
    document.querySelectorAll('.content-element').forEach(element => {
        element.style.opacity = '1';
    });
}

// Hiển thị trạng thái lỗi
function showErrorState(errorMessage) {
    // Ẩn placeholder và hiển thị nội dung
    hideLoadingState();
    
    // Hiển thị thông báo lỗi trong bảng
    const tableBody = document.querySelector('.tuition-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-container">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>${errorMessage}</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Hiển thị giá trị 0 cho các thông tin tổng quát
    document.querySelector('.total-tuition').textContent = formatCurrency(0);
    document.querySelector('.paid-amount').textContent = formatCurrency(0);
    document.querySelector('.outstanding-amount').textContent = formatCurrency(0);
    
    // Cập nhật thanh tiến độ
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressBar.setAttribute('aria-valuenow', 0);
    
    // Cập nhật nhãn tiến độ
    const progressLabels = document.querySelectorAll('.progress-labels span');
    progressLabels[0].textContent = '0 ₫';
    progressLabels[1].textContent = '0 ₫';
} 