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
    console.log('Complete user data from localStorage:', userData);
    
    if (!userData || !userData.userId) {
        console.error('User data not found or missing userId');
        return;
    }
    
    console.log('User ID for API calls:', userData.userId);
    
    // Update user name in header
    const userNameElement = document.querySelector('.user-name.content-element');
    if (userNameElement && userData.fullName) {
        userNameElement.textContent = userData.fullName;
    }
    
    // Define modal functions globally to prevent reference errors
    window.openModal = function(modal) {
        if (!modal) return;
        
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        document.body.style.overflow = 'hidden';
    };
    
    window.closeModal = function(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };
    
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
                showErrorState('Không có dữ liệu học phí trong hệ thống. Vui lòng liên hệ vải trị viên.');
                return;
            }
        } catch (dataError) {
            console.error('Database data check failed:', dataError);
            // Continue with other API calls
        }
        
        // Assuming the student ID is the same as the user ID for simplicity
        // In a real application, you might need to fetch the student ID first
        const studentId = userData.userId; // Changed from StudentID to userId
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
            console.log('Fetching unpaid fees for student ID:', studentId);
            unpaidFees = await tuitionApi.getUnpaidFees(studentId);
            console.log('Unpaid fees raw response:', unpaidFees);
            if (Array.isArray(unpaidFees)) {
                console.log('Unpaid fees is array with', unpaidFees.length, 'items');
            } else if (unpaidFees && typeof unpaidFees === 'object') {
                console.log('Unpaid fees is object with keys:', Object.keys(unpaidFees));
            } else {
                console.log('Unpaid fees has unexpected type:', typeof unpaidFees);
            }
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
        if (allFees && (Array.isArray(allFees) || allFees.$values)) {
            console.log('Using allFees for table display, type:', typeof allFees, 'is array:', Array.isArray(allFees));
            updateTuitionTable(allFees);
        } else if (unpaidFees && (Array.isArray(unpaidFees) || unpaidFees.$values)) {
            console.log('Using unpaidFees for table display, type:', typeof unpaidFees, 'is array:', Array.isArray(unpaidFees));
            updateTuitionTable(unpaidFees);
        } else if (currentSemesterFees && !currentSemesterFees.message) {
            console.log('Using currentSemesterFees for table display');
            updateTuitionTable([currentSemesterFees]);
        } else {
            // Giải pháp dự phòng cực kỳ đặc biệt - truy cập trực tiếp JSON
            try {
                console.log('Attempting direct access to unpaid fees via raw text JSON');
                // Lấy dữ liệu raw JSON gốc từ API
                const preElement = document.querySelector('pre');
                if (preElement && preElement.textContent) {
                    console.log('Found raw JSON text, attempting to parse');
                    const directData = JSON.parse(preElement.textContent);
                    if (Array.isArray(directData) && directData.length > 0) {
                        console.log('Successfully parsed raw JSON into array', directData);
                        // Render dữ liệu trực tiếp
                        renderDirectFeeTable(directData);
                        return;
                    }
                } else {
                    console.log('No pre element found on the page, skipping direct JSON access');
                }
            } catch (directError) {
                console.error('Direct JSON access failed:', directError);
            }
            
            // Dự phòng: Nếu unpaidFees có dữ liệu thô, hãy thử cách khác
            if (unpaidFees) {
                console.log('Trying fallback method with direct raw JSON data');
                try {
                    let unpaidFeesArray = JSON.parse(JSON.stringify(unpaidFees));
                    console.log('Parsed unpaid fees:', unpaidFeesArray);
                    if (Array.isArray(unpaidFeesArray) && unpaidFeesArray.length > 0) {
                        console.log('Successfully parsed unpaid fees into array');
                        updateFallbackTuitionTable(unpaidFeesArray);
                        return;
                    }
                } catch (parseError) {
                    console.error('Error parsing unpaid fees JSON:', parseError);
                }
            }
            
            // No data available, show empty state
            console.log('No data available to display');
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

// Attach event listeners to payment buttons
function attachPaymentButtonListeners() {
    const payButtons = document.querySelectorAll('.btn-pay');
    const viewDetailButtons = document.querySelectorAll('.btn-view-detail');
    
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