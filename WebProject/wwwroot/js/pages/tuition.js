// Import utilities
import { isAuthenticated, getUserData } from '../utils/auth.js';
import { tuitionApi } from '../services/api.js';
import { processCompletedPayment } from './payment-update.js';

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
    
    // Initialize UI event handlers
    initUIEventHandlers();
});

// Initialize tuition page functionality
async function initTuitionPage() {
    try {
        // Lấy thông tin người dùng từ localStorage
        const userData = getUserData();
        if (!userData || !userData.userId) {
            window.location.href = '/login.html';
            return;
        }

        // Lấy thông tin sinh viên từ user data
        const studentId = userData.userId;
        if (!studentId) {
            showErrorState('Không tìm thấy thông tin sinh viên');
            return;
        }

        // Hiển thị tên người dùng
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = userData.fullName || userData.email;
        }

        // Kiểm tra dữ liệu trong database
        const dataCheck = await tuitionApi.checkData();
        console.log('Database check result:', dataCheck);

        if (!dataCheck || dataCheck.studentFeesCount === 0 || dataCheck.studentCount === 0) {
            showErrorState('Vui lòng liên hệ quản trị viên');
            return;
        }

        // Fetch dữ liệu học phí
        const fees = await tuitionApi.getStudentFees(studentId);
        console.log('Fetched fees:', fees);

        if (!fees || (Array.isArray(fees) && fees.length === 0)) {
            showErrorState('Không tìm thấy thông tin học phí');
            return;
        }

        // Cập nhật UI với dữ liệu thực
        updateTuitionTable(fees);
        
        // Tính toán tổng tiền sau khi cập nhật bảng
        setTimeout(() => {
            calculateFeeTotals();
        }, 100);

        // Ẩn loading state
        hideLoadingState();
    } catch (error) {
        console.error('Error initializing tuition page:', error);
        showErrorState('Có lỗi xảy ra khi tải dữ liệu học phí');
    }
}

// Update tuition overview section with real data
function updateTuitionOverview(currentSemesterFees, allFees, unpaidFees) {
    console.log('Updating overview with raw data:', { currentSemesterFees, allFees, unpaidFees });
    
    // Calculate total amounts
    let totalAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;
    
    // Check if we were passed a pre-calculated object with totals
    if (currentSemesterFees && typeof currentSemesterFees === 'object' && 
        'totalAmount' in currentSemesterFees && 
        'paidAmount' in currentSemesterFees && 
        'outstandingAmount' in currentSemesterFees) {
        
        console.log('Using pre-calculated totals:', currentSemesterFees);
        totalAmount = currentSemesterFees.totalAmount;
        paidAmount = currentSemesterFees.paidAmount;
        outstandingAmount = currentSemesterFees.outstandingAmount;
        
        // Update UI with pre-calculated values
        updateUIWithCalculatedTotals(totalAmount, paidAmount, outstandingAmount);
        return;
    }
    
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
        }
    }
    
    if (allFeesArray && allFeesArray.length > 0) {
        // Sum up all fees
        totalAmount = allFeesArray.reduce((sum, fee) => sum + (parseFloat(fee.totalAmount) || 0), 0);
        
        // Calculate paid amount (fees with status "Paid")
        paidAmount = allFeesArray
            .filter(fee => fee.status === "Paid")
            .reduce((sum, fee) => sum + (parseFloat(fee.totalAmount) || 0), 0);
        
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
                    const paidForThisFee = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
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
            outstandingAmount = unpaidFeesArray.reduce((sum, fee) => sum + (parseFloat(fee.totalAmount) || 0), 0);
            totalAmount = outstandingAmount; // Giả sử tổng số tiền bằng số tiền chưa thanh toán
        }
    }
    
    // If we still don't have any data, try to get it from the table directly
    if (totalAmount === 0) {
        try {
            console.log('No valid API data found, trying to calculate from DOM...');
            // Try to calculate from DOM as a last resort
            const tableRows = document.querySelectorAll('.tuition-table tbody tr');
            if (tableRows && tableRows.length > 0 && !tableRows[0].querySelector('.empty-state')) {
                tableRows.forEach(row => {
                    if (row.querySelector('.empty-state')) return;
                    
                    const amountCell = row.querySelector('td[data-label="Số tiền"]');
                    const statusCell = row.querySelector('td[data-label="Trạng thái"] span');
                    
                    if (amountCell && statusCell) {
                        const amountText = amountCell.textContent.trim();
                        const amount = parseInt(amountText.replace(/[^\d]/g, '')) || 0;
                        
                        totalAmount += amount;
                        
                        if (statusCell.textContent.includes('Đã thanh toán') || 
                            statusCell.classList.contains('status-paid')) {
                            paidAmount += amount;
                        } else {
                            outstandingAmount += amount;
                        }
                    }
                });
                
                console.log('Calculated from DOM:', { totalAmount, paidAmount, outstandingAmount });
            }
        } catch (domError) {
            console.error('Error calculating from DOM:', domError);
        }
    }
    
    // Update UI with calculated values
    updateUIWithCalculatedTotals(totalAmount, paidAmount, outstandingAmount);
}

// Helper function to update UI with calculated totals
function updateUIWithCalculatedTotals(totalAmount, paidAmount, outstandingAmount) {
    console.log('Updating UI with calculated totals:', { totalAmount, paidAmount, outstandingAmount });
    
    // Update UI elements
    document.querySelector('.total-tuition').textContent = formatCurrency(totalAmount);
    document.querySelector('.paid-amount').textContent = formatCurrency(paidAmount);
    document.querySelector('.outstanding-amount').textContent = formatCurrency(outstandingAmount);
    
    // Update progress bar and payment progress section
    const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const progressBar = document.querySelector('.progress-bar');
    
    // Update the progress bar
    progressBar.style.width = `${progressPercentage}%`;
    progressBar.textContent = `${Math.round(progressPercentage)}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progressPercentage));
    
    // Apply appropriate color based on progress
    if (progressPercentage >= 100) {
        progressBar.classList.remove('bg-warning', 'bg-danger');
        progressBar.classList.add('bg-success');
    } else if (progressPercentage >= 50) {
        progressBar.classList.remove('bg-success', 'bg-danger');
        progressBar.classList.add('bg-warning');
    } else {
        progressBar.classList.remove('bg-success', 'bg-warning');
        progressBar.classList.add('bg-danger');
    }
    
    // Update progress labels
    const progressLabels = document.querySelectorAll('.progress-labels span');
    progressLabels[0].textContent = formatCurrency(0);
    progressLabels[1].textContent = formatCurrency(totalAmount);
    
    // Add a middle label showing the paid amount
    const progressContainer = document.querySelector('.progress-container');
    const middleLabel = document.querySelector('.progress-middle-label') || document.createElement('div');
    middleLabel.className = 'progress-middle-label';
    middleLabel.innerHTML = `
        <span class="paid-progress">Đã thanh toán: ${formatCurrency(paidAmount)}</span>
        <span class="progress-percentage">(${Math.round(progressPercentage)}%)</span>
    `;
    
    // Position the middle label based on the progress percentage
    middleLabel.style.left = `${Math.min(Math.max(progressPercentage, 5), 95)}%`;
    
    // Add the middle label if it doesn't exist
    if (!document.querySelector('.progress-middle-label')) {
        progressContainer.appendChild(middleLabel);
    }
    
    // Show payment status text
    const paymentStatusText = document.querySelector('.payment-status-text') || document.createElement('div');
    paymentStatusText.className = 'payment-status-text';
    
    if (progressPercentage >= 100) {
        paymentStatusText.innerHTML = '<i class="fas fa-check-circle"></i> Đã thanh toán đầy đủ';
        paymentStatusText.classList.remove('status-warning', 'status-danger');
        paymentStatusText.classList.add('status-success');
    } else if (progressPercentage > 0) {
        paymentStatusText.innerHTML = '<i class="fas fa-clock"></i> Đã thanh toán một phần';
        paymentStatusText.classList.remove('status-success', 'status-danger');
        paymentStatusText.classList.add('status-warning');
    } else {
        paymentStatusText.innerHTML = '<i class="fas fa-exclamation-circle"></i> Chưa thanh toán';
        paymentStatusText.classList.remove('status-success', 'status-warning');
        paymentStatusText.classList.add('status-danger');
    }
    
    // Add the payment status text if it doesn't exist
    if (!document.querySelector('.payment-status-text')) {
        progressContainer.appendChild(paymentStatusText);
    }
}

// Update tuition table with real data
function updateTuitionTable(fees) {
    if (!fees) {
        console.error('Fees data is null or undefined');
        return;
    }
    
    // Kiểm tra cấu trúc dữ liệu trả về
    console.log('Updating table with fees data structure:', typeof fees, fees);
    
    // Kiểm tra nếu có thông báo lỗi
    if (fees && fees.message) {
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
    
    // Xử lý dữ liệu trả về từ API - Cách hoàn toàn mới
    let feesArray = [];
    
    // Thêm logging chi tiết hơn
    console.log('Raw fees data type:', typeof fees);
    
    // Cách xử lý mới với kiểm tra nghiêm ngặt
    if (Array.isArray(fees)) {
        console.log('Fees is an array directly');
        // Tạo một mảng mới từ dữ liệu
        feesArray = Array.from(fees);
    } else if (fees && typeof fees === 'object') {
        // Cấu trúc có $values
        if (fees.$values && Array.isArray(fees.$values)) {
            console.log('Using $values array');
            feesArray = Array.from(fees.$values);
        } 
        // Trường hợp đối tượng đơn lẻ, không phải mảng
        else if (!Array.isArray(fees) && !fees.message) {
            console.log('Single fee object detected');
            feesArray = [fees];
        }
    }
    
    // Log details for debugging
    console.log('Processed fees array is Array?', Array.isArray(feesArray));
    console.log('Processed fees array length:', feesArray ? feesArray.length : 0);
    
    // Check the first item in more detail
    if (feesArray.length > 0) {
        console.log('First fee item details:', feesArray[0]);
    } else {
        console.log('No items in fees array');
    }
    
    if (!feesArray || feesArray.length === 0) {
        console.warn('No fees data after processing');
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
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    tableBody.innerHTML = ''; // Clear existing rows
    console.log('Cleared existing table rows, processing', feesArray.length, 'fee items');
    
    feesArray.forEach((fee, index) => {
        console.log(`Processing fee ${index+1}/${feesArray.length}:`, fee);
        
        if (!fee) {
            console.warn(`Fee at index ${index} is null or undefined, skipping`);
            return;
        }
        
        // Lấy danh sách chi tiết học phí
        let feeDetails = [];
        console.log('Raw studentFeeDetails type:', typeof fee.studentFeeDetails);
        
        if (fee.studentFeeDetails) {
            if (fee.studentFeeDetails.$values && Array.isArray(fee.studentFeeDetails.$values)) {
                console.log('Using $values array for fee details');
                feeDetails = Array.from(fee.studentFeeDetails.$values);
            } else if (Array.isArray(fee.studentFeeDetails)) {
                console.log('Fee details is directly an array');
                feeDetails = Array.from(fee.studentFeeDetails);
            } else if (typeof fee.studentFeeDetails === 'object') {
                console.log('Fee details is a single object');
                feeDetails = [fee.studentFeeDetails];
            }
        }
        
        console.log('Processed fee details is array?', Array.isArray(feeDetails));
        console.log('Fee details length:', feeDetails.length);
        
        // Nếu không có chi tiết học phí, hiển thị một hàng cho học phí
        if (!feeDetails || feeDetails.length === 0) {
            console.log('No fee details, creating single row for fee');
            const row = document.createElement('tr');
            
            // Lấy thông tin học kỳ
            let semesterName = 'N/A';
            if (fee.semester && fee.semester.semesterName) {
                semesterName = fee.semester.semesterName;
            }
            
            // Xác định trạng thái thanh toán
            let statusClass = 'unknown';
            let statusText = getStatusText(fee.status || 'Unknown');
            
            if (fee.status) {
                statusClass = fee.status.toLowerCase();
            }
            
            row.innerHTML = `
                <td data-label="Mã học phần">${fee.studentFeeID || 'N/A'}</td>
                <td data-label="Tên học phần">Học phí ${semesterName}</td>
                <td data-label="Số tín chỉ">-</td>
                <td data-label="Học kỳ">${semesterName}</td>
                <td data-label="Số tiền">${formatCurrency(fee.totalAmount || 0)}</td>
                <td data-label="Trạng thái"><span class="status-${statusClass}">${statusText}</span></td>
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
            console.log('Creating row for fee detail:', detail);
            const row = document.createElement('tr');
            
            // Lấy thông tin danh mục học phí
            let categoryName = 'Học phí';
            if (detail.feeCategory) {
                categoryName = detail.feeCategory.categoryName;
            }
            
            // Lấy thông tin học kỳ
            let semesterName = 'N/A';
            if (fee.semester && fee.semester.semesterName) {
                semesterName = fee.semester.semesterName;
            }
            
            // Create a unique ID for the fee detail
            const feeDetailId = `${fee.studentFeeID}-${detail.studentFeeDetailID}`;
            
            // Xác định trạng thái thanh toán
            let statusClass = 'unknown';
            let statusText = getStatusText(fee.status || 'Unknown');
            
            if (fee.status) {
                statusClass = fee.status.toLowerCase();
            }
            
            row.innerHTML = `
                <td data-label="Mã học phần">${feeDetailId}</td>
                <td data-label="Tên học phần">${categoryName}</td>
                <td data-label="Số tín chỉ">-</td>
                <td data-label="Học kỳ">${semesterName}</td>
                <td data-label="Số tiền">${formatCurrency(detail.amount)}</td>
                <td data-label="Trạng thái"><span class="status-${statusClass}">${statusText}</span></td>
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
    
    console.log('Finished rendering table rows');
    
    // Re-attach event listeners to the new buttons
    attachPaymentButtonListeners();
}

// Hàm dự phòng hiển thị dữ liệu học phí mà không xử lý phức tạp
function updateFallbackTuitionTable(feesData) {
    console.log('Using fallback table display method');
    if (!feesData || !Array.isArray(feesData) || feesData.length === 0) {
        console.warn('Fallback method: No data to display');
        updateEmptyStateUI();
        return;
    }
    
    const tableBody = document.querySelector('.tuition-table tbody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    tableBody.innerHTML = ''; // Clear existing rows
    
    feesData.forEach((fee, index) => {
        console.log(`Processing fallback fee ${index+1}/${feesData.length}:`, fee);
        
        const row = document.createElement('tr');
        
        // Lấy thông tin học kỳ
        let semesterName = 'N/A';
        if (fee.semester && fee.semester.semesterName) {
            semesterName = fee.semester.semesterName;
        }
        
        // Xác định trạng thái thanh toán
        let statusClass = 'unknown';
        let statusText = getStatusText(fee.status || 'Unknown');
        
        if (fee.status) {
            statusClass = fee.status.toLowerCase();
        }
        
        row.innerHTML = `
            <td data-label="Mã học phần">${fee.studentFeeID || 'N/A'}</td>
            <td data-label="Tên học phần">Học phí ${semesterName}</td>
            <td data-label="Số tín chỉ">-</td>
            <td data-label="Học kỳ">${semesterName}</td>
            <td data-label="Số tiền">${formatCurrency(fee.totalAmount || 0)}</td>
            <td data-label="Trạng thái"><span class="status-${statusClass}">${statusText}</span></td>
            <td data-label="Hành động">
                ${fee.status !== "Paid" ? 
                    `<button class="btn-pay" data-fee-id="${fee.studentFeeID}" data-amount="${fee.totalAmount}"><i class="fas fa-credit-card"></i></button>` : 
                    `<button class="btn-view-detail" data-fee-id="${fee.studentFeeID}"><i class="fas fa-eye"></i></button>`
                }
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Re-attach event listeners to new buttons
    attachPaymentButtonListeners();
}

// Hàm để hiển thị dữ liệu học phí từ dữ liệu JSON trực tiếp
function renderDirectFeeTable(feesData) {
    console.log('Rendering fee table from direct JSON data');
    if (!feesData || !Array.isArray(feesData) || feesData.length === 0) {
        console.warn('No direct fee data to display');
        updateEmptyStateUI();
        return;
    }
    
    const tableBody = document.querySelector('.tuition-table tbody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    tableBody.innerHTML = ''; // Clear existing rows
    
    feesData.forEach((fee, index) => {
        console.log(`Processing fee ${index+1}/${feesData.length}:`, fee);
        
        // Nếu có studentFeeDetails và nó là mảng, hiển thị từng chi tiết
        if (fee.studentFeeDetails && Array.isArray(fee.studentFeeDetails) && fee.studentFeeDetails.length > 0) {
            fee.studentFeeDetails.forEach(detail => {
                const row = document.createElement('tr');
                
                // Lấy thông tin danh mục học phí
                let categoryName = detail.feeCategory ? detail.feeCategory.categoryName : 'Học phí';
                
                // Lấy thông tin học kỳ
                let semesterName = fee.semester ? fee.semester.semesterName : 'N/A';
                
                // Tạo ID duy nhất cho chi tiết học phí
                const feeDetailId = `${fee.studentFeeID}-${detail.studentFeeDetailID}`;
                
                // Xác định trạng thái thanh toán
                let statusClass = 'unknown';
                let statusText = getStatusText(fee.status || 'Unknown');
                
                if (fee.status) {
                    statusClass = fee.status.toLowerCase();
                }
                
                row.innerHTML = `
                    <td data-label="Mã học phần">${feeDetailId}</td>
                    <td data-label="Tên học phần">${categoryName}</td>
                    <td data-label="Số tín chỉ">-</td>
                    <td data-label="Học kỳ">${semesterName}</td>
                    <td data-label="Số tiền">${formatCurrency(detail.amount)}</td>
                    <td data-label="Trạng thái"><span class="status-${statusClass}">${statusText}</span></td>
                    <td data-label="Hành động">
                        ${fee.status !== "Paid" ? 
                            `<button class="btn-pay" data-fee-id="${fee.studentFeeID}" data-fee-detail-id="${detail.studentFeeDetailID}" data-amount="${detail.amount}"><i class="fas fa-credit-card"></i></button>` : 
                            `<button class="btn-view-detail" data-fee-id="${fee.studentFeeID}"><i class="fas fa-eye"></i></button>`
                        }
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        } else {
            // Nếu không có chi tiết, hiển thị một hàng cho khoản học phí
            const row = document.createElement('tr');
            
            // Lấy thông tin học kỳ
            let semesterName = fee.semester ? fee.semester.semesterName : 'N/A';
            
            // Xác định trạng thái thanh toán
            let statusClass = fee.status ? fee.status.toLowerCase() : 'unknown';
            let statusText = getStatusText(fee.status || 'Unknown');
            
            row.innerHTML = `
                <td data-label="Mã học phần">${fee.studentFeeID || 'N/A'}</td>
                <td data-label="Tên học phần">Học phí ${semesterName}</td>
                <td data-label="Số tín chỉ">-</td>
                <td data-label="Học kỳ">${semesterName}</td>
                <td data-label="Số tiền">${formatCurrency(fee.totalAmount || 0)}</td>
                <td data-label="Trạng thái"><span class="status-${statusClass}">${statusText}</span></td>
                <td data-label="Hành động">
                    ${fee.status !== "Paid" ? 
                        `<button class="btn-pay" data-fee-id="${fee.studentFeeID}" data-amount="${fee.totalAmount}"><i class="fas fa-credit-card"></i></button>` : 
                        `<button class="btn-view-detail" data-fee-id="${fee.studentFeeID}"><i class="fas fa-eye"></i></button>`
                    }
                </td>
            `;
            tableBody.appendChild(row);
        }
    });
    
    // Re-attach event listeners to the new buttons
    attachPaymentButtonListeners();
}

// Function to attach payment button event listeners
function attachPaymentButtonListeners() {
    console.log('Attaching payment button listeners');
    
    // Get all payment buttons
    const payButtons = document.querySelectorAll('.btn-pay');
    const viewDetailButtons = document.querySelectorAll('.btn-view-detail');
    
    console.log(`Found ${payButtons.length} payment buttons and ${viewDetailButtons.length} view detail buttons`);
    
    // Add event listeners to payment buttons
    payButtons.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const feeId = btn.dataset.feeId || '';
            const feeDetailId = btn.dataset.feeDetailId || '';
            const amount = btn.dataset.amount || '';
            
            if (!feeId || isNaN(amount)) {
                console.error('Invalid fee data:', { feeId, amount });
                alert('Dữ liệu thanh toán không hợp lệ. Vui lòng thử lại.');
                return;
            }
            
            // Set payment details in modal
            document.querySelector('#courseCode').textContent = feeId;
            document.querySelector('#courseName').textContent = 'Học phí';
            document.querySelector('#courseAmount').textContent = amount.toLocaleString('vi-VN') + ' VNĐ';
            
            // Show payment modal
            openModal(paymentModal);
        });
    });
    
    // Add event listeners to view detail buttons
    viewDetailButtons.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const feeId = btn.dataset.feeId || '';
            if (!feeId) return;
            
            try {
                // Show loading state
                showLoadingState();
                
                // Fetch fee details using the API
                const feeDetails = await tuitionApi.getFeeDetails(feeId);
                console.log('Fee details:', feeDetails);
                
                // Process and display fee details
                if (feeDetails) {
                    // Here you would typically show a modal with the details
                    // For now, we'll just show an alert
                    alert(`Đã tải chi tiết học phí ID: ${feeId}`);
                    // In a real implementation, you would open a modal and display the details
                }
                
                // Hide loading state
                hideLoadingState();
            } catch (error) {
                console.error('Error loading fee details:', error);
                alert('Không thể tải chi tiết học phí. Vui lòng thử lại sau.');
                hideLoadingState();
            }
        });
    });
}

// Định nghĩa các hàm modal ở mức global
function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    }
}

// Export các hàm để có thể sử dụng từ bên ngoài
window.openModal = openModal;
window.closeModal = closeModal;

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

    console.log('Initializing UI event handlers...');
    console.log('Pay All button found:', payAllBtn !== null);

    // Load payment methods from database
    loadPaymentMethodsFromDatabase();
    
    // Show payment details based on selected method
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', function() {
            const selectedMethodID = this.value;
            console.log(`Payment method changed to ID: ${selectedMethodID}`);
            
            // Hide all payment details first
            const allPaymentDetails = document.querySelectorAll('.payment-details');
            allPaymentDetails.forEach(detail => {
                detail.style.display = 'none';
            });
            
            // Show the appropriate payment details section based on method ID
            if (selectedMethodID) {
                switch (parseInt(selectedMethodID)) {
                    case 1: // Cash
                        const cashDetails = document.getElementById('cashDetails');
                        if (cashDetails) cashDetails.style.display = 'block';
                        break;
                    case 2: // Bank Transfer
                        const bankingDetails = document.getElementById('bankingDetails');
                        if (bankingDetails) bankingDetails.style.display = 'block';
                        break;
                    case 3: // MoMo E-wallet
                        const momoDetails = document.getElementById('momoDetails');
                        if (momoDetails) momoDetails.style.display = 'block';
                        break;
                    case 4: // ZaloPay E-wallet
                        const zaloDetails = document.getElementById('zaloDetails');
                        if (zaloDetails) zaloDetails.style.display = 'block';
                        break;
                    case 5: // Credit/Debit Card
                        const creditDetails = document.getElementById('creditDetails');
                        if (creditDetails) creditDetails.style.display = 'block';
                        break;
                    default:
                        console.warn(`Unknown payment method ID: ${selectedMethodID}`);
                        break;
                }
            }
        });
    }
    
    // Handle "Pay All" button click
    if (payAllBtn) {
        payAllBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Pay All button clicked');
            
            try {
                const userData = getUserData();
                if (!userData || !userData.userId) {
                    console.error('User data not found');
                    alert('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
                    return;
                }
                
                // Hiển thị trạng thái loading
                payAllBtn.disabled = true;
                payAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                
                const unpaidFees = await tuitionApi.getUnpaidFees(userData.userId);
                console.log('Unpaid fees:', unpaidFees);
                
                // Khôi phục trạng thái nút
                payAllBtn.disabled = false;
                payAllBtn.innerHTML = '<i class="fas fa-credit-card"></i>Thanh toán tất cả';
                
                // Kiểm tra dữ liệu học phí chưa thanh toán
                let unpaidFeesArray = [];
                
                if (Array.isArray(unpaidFees)) {
                    unpaidFeesArray = unpaidFees;
                } else if (unpaidFees && unpaidFees.$values) {
                    unpaidFeesArray = unpaidFees.$values;
                }
                
                if (!unpaidFeesArray || unpaidFeesArray.length === 0) {
                    alert('Không có khoản học phí nào cần thanh toán.');
                    return;
                }
                
                // Calculate total unpaid amount
                const totalUnpaid = unpaidFeesArray.reduce((sum, fee) => sum + (parseFloat(fee.totalAmount) || 0), 0);
                
                document.getElementById('courseCode').textContent = 'ALL';
                document.getElementById('courseName').textContent = 'Tất cả học phần chưa thanh toán';
                document.getElementById('courseAmount').textContent = formatCurrency(totalUnpaid);
                
                if (paymentModal) {
                    openModal(paymentModal);
                } else {
                    console.error('Payment modal not found in the DOM');
                    alert('Có lỗi xảy ra. Không tìm thấy cửa sổ thanh toán.');
                }
            } catch (error) {
                console.error('Error fetching unpaid fees:', error);
                alert('Không thể tải dữ liệu học phí chưa thanh toán. Vui lòng thử lại sau.');
                
                // Khôi phục trạng thái nút
                if (payAllBtn) {
                    payAllBtn.disabled = false;
                    payAllBtn.innerHTML = '<i class="fas fa-credit-card"></i>Thanh toán tất cả';
                }
            }
        });
    } else {
        console.warn('Pay All button not found in the DOM');
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
            
            // Instead of reloading the entire page, fetch updated data
            reloadPageData();
        });
    }
    
    // Process payment
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const paymentMethod = document.getElementById('paymentMethod').value;
            const feeId = document.querySelector('#courseCode').textContent;
            const amount = parseFloat(document.querySelector('#courseAmount').textContent.replace(/[^\d]/g, ''));
            
            if (!paymentMethod) {
                alert('Vui lòng chọn phương thức thanh toán');
                return;
            }
            
            // Use payment method ID directly from database
            const paymentMethodID = parseInt(paymentMethod);
            if (!paymentMethodID || isNaN(paymentMethodID)) {
                alert('Phương thức thanh toán không hợp lệ. Vui lòng thử lại.');
                return;
            }
            
            console.log(`Selected payment method ID: ${paymentMethodID}`);
            
            // Disable submit button and show processing state
            const submitBtn = document.getElementById('confirmPaymentBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            }
            
            // Close payment modal
            closeModal(paymentModal);
            
            try {
                // Show loading or processing state
                document.body.style.cursor = 'wait';
                
                // Create payment data object
                const paymentData = {
                    studentFeeID: parseInt(feeId === 'ALL' ? 0 : feeId),
                    paymentMethodID: paymentMethodID,
                    amount: amount,
                    transactionID: 'TXN' + Math.floor(Math.random() * 1000000000),
                    paymentReference: `Payment via method ID ${paymentMethodID} on ${new Date().toLocaleDateString()}`
                };
                
                // Process the payment
                if (feeId === 'ALL') {
                    // Get unpaid fees and process each one separately
                    try {
                        const userData = getUserData();
                        if (!userData || !userData.userId) {
                            throw new Error('User data not found');
                        }
                        
                        const unpaidFees = await tuitionApi.getUnpaidFees(userData.userId);
                        console.log('Processing all unpaid fees:', unpaidFees);
                        
                        let processedFees = [];
                        let successCount = 0;
                        
                        // Xử lý dữ liệu unpaidFees
                        let unpaidFeesArray = [];
                        if (Array.isArray(unpaidFees)) {
                            unpaidFeesArray = unpaidFees;
                        } else if (unpaidFees && unpaidFees.$values) {
                            unpaidFeesArray = unpaidFees.$values;
                        }
                        
                        // Check if unpaidFees is a proper array
                        if (unpaidFeesArray && unpaidFeesArray.length > 0) {
                            // Process each unpaid fee as a separate payment
                            for (let fee of unpaidFeesArray) {
                                if (!fee.studentFeeID) {
                                    console.error('Invalid fee data, missing studentFeeID', fee);
                                    continue;
                                }
                                
                                const singlePaymentData = {
                                    studentFeeID: fee.studentFeeID,
                                    paymentMethodID: paymentMethodID,
                                    amount: parseFloat(fee.totalAmount) || 0,
                                    transactionID: 'TXN' + Math.floor(Math.random() * 1000000000),
                                    paymentReference: `Bulk payment via method ID ${paymentMethodID} on ${new Date().toLocaleDateString()}`
                                };
                                
                                console.log(`Processing payment for fee ID ${fee.studentFeeID}:`, singlePaymentData);
                                try {
                                    const paymentResult = await processCompletedPayment(singlePaymentData);
                                    processedFees.push(fee.studentFeeID);
                                    successCount++;
                                } catch (feeError) {
                                    console.error(`Error processing fee ID ${fee.studentFeeID}:`, feeError);
                                }
                            }
                            
                            // Reset cursor and form state
                            document.body.style.cursor = 'default';
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = '<i class="fas fa-check"></i>Xác nhận thanh toán';
                            }
                            
                            // Reload page data
                            await reloadPageData();
                            
                            // Show success message
                            const transactionIdElement = document.querySelector('.transaction-id');
                            if (transactionIdElement) {
                                transactionIdElement.textContent = `${successCount} khoản thanh toán thành công`;
                            }
                            openModal(successModal);
                        } else {
                            throw new Error('No unpaid fees found or fees in unexpected format');
                        }
                    } catch (error) {
                        console.error('Error processing bulk payment:', error);
                        document.body.style.cursor = 'default';
                        
                        // Reset form state
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i class="fas fa-check"></i>Xác nhận thanh toán';
                        }
                        
                        alert('Có lỗi xảy ra khi xử lý thanh toán hàng loạt. Vui lòng thử lại sau.');
                    }
                } else {
                    // Process single payment
                    try {
                        // Process the payment
                        const result = await processCompletedPayment(paymentData);
                        
                        console.log('Payment processed with result:', result);
                        
                        // Reset cursor and form state
                        document.body.style.cursor = 'default';
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i class="fas fa-check"></i>Xác nhận thanh toán';
                        }
                        
                        // Force a data reload to ensure UI is updated
                        await reloadPageData();
                        
                        // Show success message
                        const transactionIdElement = document.querySelector('.transaction-id');
                        if (transactionIdElement) {
                            transactionIdElement.textContent = result?.transactionID || paymentData.transactionID;
                        }
                        
                        // Show success modal
                        openModal(successModal);
                    } catch (error) {
                        console.error('Error processing single payment:', error);
                        document.body.style.cursor = 'default';
                        
                        // Reset form state
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i class="fas fa-check"></i>Xác nhận thanh toán';
                        }
                        
                        alert(`Có lỗi xảy ra khi xử lý thanh toán: ${error.message}`);
                    }
                }
            } catch (error) {
                console.error('Payment processing error:', error);
                document.body.style.cursor = 'default';
                
                // Reset form state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-check"></i>Xác nhận thanh toán';
                }
                
                alert(`Có lỗi xảy ra: ${error.message}`);
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
}

// Helper function to get status text in Vietnamese
function getStatusText(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'Đã thanh toán';
        case 'partial':
        case 'partially paid':
            return 'Thanh toán một phần';
        case 'unpaid':
            return 'Chưa thanh toán';
        case 'overdue':
            return 'Quá hạn';
        default:
            return status || 'Không xác định';
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Show loading state
function showLoadingState() {
    const tableBody = document.querySelector('.tuition-table tbody');
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

// Show error state
function showErrorState(message) {
    const tableBody = document.querySelector('.tuition-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                <div class="empty-state-container">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                </div>
            </td>
        </tr>
    `;
}

// Hide loading state
function hideLoadingState() {
    // This function is called when data is loaded and will be replaced by actual data
}

// Update empty state UI
function updateEmptyStateUI() {
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
}

// Reload page data after payment
async function reloadPageData() {
    console.log('Reloading page data after payment...');
    
    try {
        // Get current user ID
        const userData = getUserData();
        if (!userData || !userData.userId) {
            console.error('User data not found, cannot reload page data');
            return;
        }
        
        // Show loading state
        showLoadingState();
        
        // Fetch updated data
        const allFees = await tuitionApi.getStudentFees(userData.userId);
        
        // Update UI with the new data
        updateTuitionTable(allFees);
        
        // Calculate fee totals
        calculateFeeTotals();
        
        // Hide loading state
        hideLoadingState();
        
        console.log('Page data reloaded successfully');
    } catch (error) {
        console.error('Error reloading page data:', error);
        hideLoadingState();
    }
}

// Calculate fee totals from the table data
function calculateFeeTotals() {
    console.log('Calculating fee totals from table data');
    
    let totalAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;
    
    try {
        const tableRows = document.querySelectorAll('.tuition-table tbody tr');
        console.log('Found table rows:', tableRows.length);
        
        if (tableRows && tableRows.length > 0 && !tableRows[0].querySelector('.empty-state')) {
            tableRows.forEach(row => {
                // Skip rows with empty state
                if (row.querySelector('.empty-state')) return;
                
                // Get fee amount
                const amountCell = row.querySelector('td[data-label="Số tiền"]');
                const statusCell = row.querySelector('td[data-label="Trạng thái"] span');
                
                if (amountCell && statusCell) {
                    // Extract amount from formatted string
                    const amountText = amountCell.textContent.trim();
                    const amount = parseInt(amountText.replace(/[^\d]/g, '')) || 0;
                    
                    // Add to total
                    totalAmount += amount;
                    
                    // Check status
                    if (statusCell.textContent.includes('Đã thanh toán') || 
                        statusCell.classList.contains('status-paid')) {
                        paidAmount += amount;
                    } else {
                        outstandingAmount += amount;
                    }
                }
            });
            
            // Log calculated values
            console.log('DOM calculated values:', { totalAmount, paidAmount, outstandingAmount });
            
            // If we have valid total amount, update UI
            if (totalAmount > 0) {
                // Update the overview with calculated values
                updateUIWithCalculatedTotals(totalAmount, paidAmount, outstandingAmount);
            }
        }
    } catch (error) {
        console.error('Error calculating fee totals:', error);
    }
}

// Function to load payment methods from database
async function loadPaymentMethodsFromDatabase() {
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (!paymentMethodSelect) {
        console.error('Payment method select element not found');
        return;
    }

    try {
        // Clear existing options
        paymentMethodSelect.innerHTML = '<option value="">Chọn phương thức thanh toán</option>';
        
        // Show loading indicator
        const loadingOption = document.createElement('option');
        loadingOption.disabled = true;
        loadingOption.text = 'Đang tải...';
        paymentMethodSelect.appendChild(loadingOption);
        
        // Fetch payment methods from database
        const paymentMethods = await tuitionApi.getPaymentMethods();
        
        // Remove loading indicator
        if (paymentMethodSelect.contains(loadingOption)) {
            paymentMethodSelect.removeChild(loadingOption);
        }
        
        // Process payment methods
        if (paymentMethods && (Array.isArray(paymentMethods) || paymentMethods.$values)) {
            let methodsArray = [];
            
            // Handle different response formats
            if (Array.isArray(paymentMethods)) {
                methodsArray = paymentMethods;
            } else if (paymentMethods.$values) {
                methodsArray = paymentMethods.$values;
            }
            
            console.log('Payment methods loaded:', methodsArray);
            
            if (methodsArray.length > 0) {
                // Add options to select
                methodsArray.forEach(method => {
                    const option = document.createElement('option');
                    // Use the numeric ID directly from the database
                    option.value = method.paymentMethodID;
                    option.text = method.methodName || 'Unknown Method';
                    // Add additional data attributes for later use
                    option.dataset.description = method.description || '';
                    option.dataset.isActive = method.isActive ? 'true' : 'false';
                    paymentMethodSelect.appendChild(option);
                });
            } else {
                console.warn('Empty payment methods array');
                addFallbackOptions(paymentMethodSelect);
            }
        } else {
            console.warn('No payment methods received from API');
            addFallbackOptions(paymentMethodSelect);
        }
    } catch (error) {
        console.error('Error loading payment methods:', error);
        // Add fallback options if an error occurs
        addFallbackOptions(paymentMethodSelect);
    }
}

// Helper function to add fallback options
function addFallbackOptions(paymentMethodSelect) {
    if (!paymentMethodSelect) return;
    
    // Thêm thông báo không có phương thức thanh toán thay vì các phương thức mặc định
    const emptyOption = document.createElement('option');
    emptyOption.disabled = true;
    emptyOption.text = 'Không có phương thức thanh toán';
    paymentMethodSelect.appendChild(emptyOption);
}