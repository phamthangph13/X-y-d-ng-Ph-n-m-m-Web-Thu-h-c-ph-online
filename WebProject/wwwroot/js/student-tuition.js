// Thêm timestamp để tránh cache
console.log('Student Tuition JS loaded at:', new Date().toISOString());

$(document).ready(function() {
    // Biến toàn cục để lưu trữ thông tin đang xử lý
    let currentStudentFee = null;
    let currentPage = 1;
    let pageSize = 10;
    
    // Hàm để xử lý dữ liệu trả về từ API
    function processApiResponse(data) {
        console.log('processApiResponse raw input:', data);
        
        // Nếu data là chuỗi, thử parse thành JSON
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
                console.log('Đã parse JSON từ string:', data);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                return [];
            }
        }
        
        // Kiểm tra nếu data có cấu trúc .NET với $values
        if (data && data.$values && Array.isArray(data.$values)) {
            console.log('Trả về $values array:', data.$values);
            return data.$values;
        }
        
        // Nếu data đã là mảng, trả về nó
        if (Array.isArray(data)) {
            console.log('Data đã là mảng, giữ nguyên:', data);
            return data;
        }

        // Trường hợp đặc biệt: data là items array từ API response
        if (data && Array.isArray(data.items)) {
            console.log('Trả về items array từ response:', data.items);
            return data.items;
        }
        
        // Nếu không xác định được cấu trúc, ghi log và trả về mảng rỗng
        console.error('Unknown data structure:', data);
        return [];
    }
    
    // Khởi tạo dữ liệu ban đầu
    loadSemesters();
    loadDepartments();
    loadPaymentMethods();
    
    // Xử lý sự kiện
    $("#searchButton").click(function() {
        currentPage = 1;
        loadStudents();
    });
    
    $("#semesterSelect").change(function() {
        if ($(this).val()) {
            loadStudents();
        }
    });
    
    $("#departmentSelect").change(function() {
        $("#classSelect").empty().append($('<option>', {
            value: '',
            text: 'Chọn lớp'
        }));
        
        if ($(this).val()) {
            loadClasses();
        }
    });
    
    $("#classSelect, #feeStatusSelect").change(function() {
        loadStudents();
    });
    
    $("#searchInput").keypress(function(e) {
        if (e.which === 13) {
            loadStudents();
            e.preventDefault();
        }
    });
    
    $("#createBatchFeesButton").click(function() {
        loadBatchForm();
        $("#batchFeeModal").modal("show");
    });
    
    $("#createBatchFeesSubmitButton").click(function() {
        createBatchFees();
    });
    
    $("#editFeeButton").click(function() {
        openEditFeeModal();
    });
    
    $("#addPaymentButton").click(function() {
        openAddPaymentModal();
    });
    
    $("#saveFeeButton").click(function() {
        saveStudentFee();
    });
    
    $("#savePaymentButton").click(function() {
        savePayment();
    });
    
    $("#addFeeItemButton").click(function() {
        addFeeItemRow();
    });
    
    $("#generateInvoiceButton").click(function() {
        generateInvoice();
    });
    
    $("#sendReminderButton").click(function() {
        sendPaymentReminder();
    });
    
    // Load danh sách học kỳ
    function loadSemesters() {
        showLoading();
        $.ajax({
            url: '/api/semesters',
            type: 'GET',
            success: function(data) {
                const semesterSelect = $("#semesterSelect");
                semesterSelect.empty();
                
                semesterSelect.append($('<option>', {
                    value: '',
                    text: 'Chọn học kỳ'
                }));
                
                // Xử lý dữ liệu trả về
                const semesters = processApiResponse(data);
                if (semesters.length > 0) {
                    semesters.forEach(function(semester) {
                        semesterSelect.append($('<option>', {
                            value: semester.semesterID,
                            text: semester.semesterName + ' - ' + semester.academicYear
                        }));
                    });
                    
                    // Cập nhật selector cho modal tạo học phí hàng loạt nếu có
                    const batchSemesterSelect = $("#batchSemester");
                    if (batchSemesterSelect.length > 0) {
                        batchSemesterSelect.empty();
                        batchSemesterSelect.append($('<option>', {
                            value: '',
                            text: 'Chọn học kỳ'
                        }));
                        
                        semesters.forEach(function(semester) {
                            batchSemesterSelect.append($('<option>', {
                                value: semester.semesterID,
                                text: semester.semesterName + ' - ' + semester.academicYear
                            }));
                        });
                    }
                }
                hideLoading();
            },
            error: function(error) {
                console.error('Error loading semesters:', error);
                showAlert('error', 'Không thể tải danh sách học kỳ. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Load danh sách khoa
    function loadDepartments() {
        showLoading();
        $.ajax({
            url: '/api/departments',
            type: 'GET',
            success: function(data) {
                const departmentSelect = $("#departmentSelect");
                departmentSelect.empty();
                
                departmentSelect.append($('<option>', {
                    value: '',
                    text: 'Chọn khoa'
                }));
                
                // Xử lý dữ liệu trả về
                const departments = processApiResponse(data);
                if (departments.length > 0) {
                    departments.forEach(function(department) {
                        departmentSelect.append($('<option>', {
                            value: department.departmentID,
                            text: department.departmentName
                        }));
                    });
                    
                    // Cập nhật selector cho modal tạo học phí hàng loạt nếu có
                    const batchDepartmentSelect = $("#batchDepartment");
                    if (batchDepartmentSelect.length > 0) {
                        batchDepartmentSelect.empty();
                        batchDepartmentSelect.append($('<option>', {
                            value: '',
                            text: 'Chọn khoa'
                        }));
                        
                        departments.forEach(function(department) {
                            batchDepartmentSelect.append($('<option>', {
                                value: department.departmentID,
                                text: department.departmentName
                            }));
                        });
                    }
                }
                hideLoading();
            },
            error: function(error) {
                console.error('Error loading departments:', error);
                showAlert('error', 'Không thể tải danh sách khoa. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Load danh sách lớp dựa theo khoa
    function loadClasses() {
        const departmentId = $("#departmentSelect").val();
        if (!departmentId) {
            $("#classSelect").empty().append($('<option>', {
                value: '',
                text: 'Chọn lớp'
            }));
            return;
        }
        
        showLoading();
        $.ajax({
            url: `/api/classes/by-department/${departmentId}`,
            type: 'GET',
            success: function(data) {
                const classSelect = $("#classSelect");
                classSelect.empty();
                
                classSelect.append($('<option>', {
                    value: '',
                    text: 'Chọn lớp'
                }));
                
                // Xử lý dữ liệu trả về
                const classes = processApiResponse(data);
                if (classes.length > 0) {
                    classes.forEach(function(cls) {
                        classSelect.append($('<option>', {
                            value: cls.classID,
                            text: cls.className
                        }));
                    });
                    
                    // Cập nhật selector cho modal tạo học phí hàng loạt nếu có
                    const batchClassSelect = $("#batchClass");
                    if (batchClassSelect.length > 0) {
                        batchClassSelect.empty();
                        batchClassSelect.append($('<option>', {
                            value: '',
                            text: 'Chọn lớp'
                        }));
                        
                        classes.forEach(function(cls) {
                            batchClassSelect.append($('<option>', {
                                value: cls.classID,
                                text: cls.className
                            }));
                        });
                    }
                }
                hideLoading();
            },
            error: function(error) {
                console.error('Error loading classes:', error);
                showAlert('error', 'Không thể tải danh sách lớp. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Tìm kiếm học phí sinh viên
    function loadStudents() {
        const semesterId = $("#semesterSelect").val();
        const departmentId = $("#departmentSelect").val();
        const classId = $("#classSelect").val();
        const feeStatus = $("#feeStatusSelect").val();
        const searchTerm = $("#searchInput").val();
        
        console.log('Giá trị filter:', {
            semesterId,
            departmentId,
            classId,
            feeStatus,
            searchTerm
        });
        
        if (!semesterId) {
            showAlert('warning', 'Vui lòng chọn học kỳ trước.');
            return;
        }
        
        showLoading();
        let url = `/api/student-fees?semesterId=${semesterId}`;
        
        if (departmentId) url += `&departmentId=${departmentId}`;
        if (classId) url += `&classId=${classId}`;
        if (feeStatus) url += `&status=${feeStatus}`;
        if (searchTerm) url += `&searchQuery=${encodeURIComponent(searchTerm)}`;
        
        console.log('Gọi API URL:', url);
        
        $.ajax({
            url: url,
            type: 'GET',
            success: function(data) {
                console.log('API trả về dữ liệu:', data);
                
                // Xử lý dữ liệu trả về
                let students = [];
                if (data && data.items) {
                    students = data.items; // Sử dụng trực tiếp data.items thay vì xử lý qua processApiResponse
                    console.log('Sử dụng trực tiếp data.items:', students);
                } else {
                    students = processApiResponse(data);
                }
                console.log('Sau khi xử lý:', students);
                
                // Thêm debug để kiểm tra các thuộc tính liên quan đến semester
                if (students.length > 0) {
                    const firstStudent = students[0];
                    console.log('Chi tiết thuộc tính semester của sinh viên đầu tiên:', {
                        semesterName: firstStudent.semesterName,
                        semester: firstStudent.semester,
                        semesterID: firstStudent.semesterID,
                        // Log tất cả các thuộc tính của đối tượng để kiểm tra
                        allProperties: Object.keys(firstStudent)
                    });
                }
                
                renderStudentTable(students);
                hideLoading();
            },
            error: function(error) {
                console.error('Chi tiết lỗi tải sinh viên:', error);
                if (error.responseJSON) {
                    console.error('Response JSON:', error.responseJSON);
                }
                if (error.responseText) {
                    console.error('Response Text:', error.responseText);
                }
                showAlert('error', 'Không thể tải danh sách sinh viên. Vui lòng thử lại sau.');
                hideLoading();
            },
            complete: function() {
                hideLoading(); // Đảm bảo luôn ẩn loading
            }
        });
    }
    
    // Hiển thị danh sách học phí sinh viên
    function renderStudentTable(students) {
        const tableBody = $("#studentFeesList");
        tableBody.empty();
        
        if (!students || students.length === 0) {
            tableBody.append(`
                <tr>
                    <td colspan="10" class="text-center">Không tìm thấy dữ liệu phù hợp</td>
                </tr>
            `);
            return;
        }
        
        // Log chi tiết thông tin học kỳ của mỗi sinh viên
        students.forEach((student, index) => {
            console.log(`Chi tiết sinh viên #${index + 1}:`, {
                id: student.studentFeeID,
                studentName: student.studentName,
                semesterID: student.semesterID,
                semesterName: student.semesterName,
                semester: student.semester
            });
        });
        
        students.forEach(function(student) {
            let statusBadge = '';
            let paymentPercent = 0;
            
            if (student.totalAmount > 0) {
                paymentPercent = Math.round((student.paidAmount / student.totalAmount) * 100);
            }
            
            switch (student.status) {
                case 'Paid':
                    statusBadge = `<span class="badge bg-success">Đã thanh toán</span>`;
                    break;
                case 'Partial':
                    statusBadge = `<span class="badge bg-info">Thanh toán một phần</span>`;
                    break;
                case 'Unpaid':
                    statusBadge = `<span class="badge bg-warning text-dark">Chưa thanh toán</span>`;
                    break;
                case 'Overdue':
                    statusBadge = `<span class="badge bg-danger">Quá hạn</span>`;
                    break;
                default:
                    statusBadge = `<span class="badge bg-secondary">${student.status || 'N/A'}</span>`;
            }
            
            const dueDate = student.dueDate ? new Date(student.dueDate).toLocaleDateString('vi-VN') : 'N/A';
            
            // In ra log giá trị semesterName ngay trước khi render
            console.log(`Hiển thị học kỳ cho sinh viên ${student.studentName}:`, student.semesterName);
            
            tableBody.append(`
                <tr>
                    <td>${student.studentCode || 'N/A'}</td>
                    <td>${student.studentName || 'N/A'}</td>
                    <td>${student.className || 'N/A'}</td>
                    <td>${student.departmentName || 'N/A'}</td>
                    <td>${student.semesterName}</td>
                    <td>${formatCurrency(student.totalAmount || 0)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="progress progress-thin flex-grow-1 me-2">
                                <div class="progress-bar bg-primary" role="progressbar" style="width: ${paymentPercent}%" 
                                    aria-valuenow="${paymentPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <span>${formatCurrency(student.paidAmount || 0)}</span>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${dueDate}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary view-fee" data-id="${student.studentFeeID}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-fee" data-id="${student.studentFeeID}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
        
        // Bind events cho các nút hành động
        $(".view-fee").click(function() {
            const feeId = $(this).data('id');
            viewStudentFeeDetail(feeId);
        });
        
        $(".delete-fee").click(function() {
            const feeId = $(this).data('id');
            confirmDeleteFee(feeId);
        });
    }
    
    // Load danh sách phương thức thanh toán
    function loadPaymentMethods() {
        showLoading();
        $.ajax({
            url: '/api/payment-methods',
            type: 'GET',
            success: function(data) {
                const methodSelect = $("#paymentMethod");
                methodSelect.empty();
                
                methodSelect.append($('<option>', {
                    value: '',
                    text: 'Chọn phương thức thanh toán'
                }));
                
                // Xử lý dữ liệu trả về
                const methods = processApiResponse(data);
                if (methods.length > 0) {
                    methods.forEach(function(method) {
                        methodSelect.append($('<option>', {
                            value: method.paymentMethodID,
                            text: method.methodName
                        }));
                    });
                } else {
                    console.error('No payment methods found in data:', data);
                }
                hideLoading();
            },
            error: function(error) {
                console.error('Error loading payment methods:', error);
                showAlert('error', 'Không thể tải danh sách phương thức thanh toán. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Xem chi tiết học phí sinh viên
    function viewStudentFeeDetail(feeId) {
        showLoading();
        $.ajax({
            url: `/api/student-fees/${feeId}`,
            type: 'GET',
            success: function(data) {
                console.log('Fee detail response:', data);
                
                // Kiểm tra dữ liệu hợp lệ
                if (data && data.studentFee && data.feeDetails) {
                    currentStudentFee = data;
                    renderStudentFeeDetail(data);
                    $("#studentFeeModal").modal("show");
                } else {
                    console.error('Invalid fee detail data:', data);
                    showAlert('error', 'Không thể tải chi tiết học phí. Dữ liệu không đúng định dạng.');
                }
                
                hideLoading();
            },
            error: function(error) {
                console.error('Error loading student fee details:', error);
                showAlert('error', 'Không thể tải chi tiết học phí. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Hiển thị chi tiết học phí
    function renderStudentFeeDetail(data) {
        // Render thông tin sinh viên
        if (data.studentInfo) {
            $("#studentInfo").html(`
                <div class="detail-row">
                    <small class="text-muted">Mã sinh viên:</small>
                    <div class="fw-bold">${data.studentInfo.studentCode || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Họ tên:</small>
                    <div class="fw-bold">${data.studentInfo.fullName || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Lớp:</small>
                    <div>${data.studentInfo.className || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Khoa:</small>
                    <div>${data.studentInfo.departmentName || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Email:</small>
                    <div>${data.studentInfo.email || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Điện thoại:</small>
                    <div>${data.studentInfo.phoneNumber || 'Không có'}</div>
                </div>
            `);
        } else {
            $("#studentInfo").html('<div class="alert alert-warning">Không có thông tin sinh viên</div>');
        }
        
        // Render tổng quan học phí
        if (data.studentFee) {
            let paymentPercent = 0;
            if (data.studentFee.totalAmount > 0) {
                paymentPercent = Math.round((data.studentFee.paidAmount / data.studentFee.totalAmount) * 100);
            }
            
            let statusBadge = '';
            switch (data.studentFee.status) {
                case 'Paid':
                    statusBadge = `<span class="badge bg-success">Đã thanh toán</span>`;
                    break;
                case 'Partial':
                    statusBadge = `<span class="badge bg-info">Thanh toán một phần</span>`;
                    break;
                case 'Unpaid':
                    statusBadge = `<span class="badge bg-warning text-dark">Chưa thanh toán</span>`;
                    break;
                case 'Overdue':
                    statusBadge = `<span class="badge bg-danger">Quá hạn</span>`;
                    break;
                default:
                    statusBadge = `<span class="badge bg-secondary">${data.studentFee.status || 'N/A'}</span>`;
            }
            
            const dueDate = data.studentFee.dueDate ? new Date(data.studentFee.dueDate).toLocaleDateString('vi-VN') : 'N/A';
            
            $("#feeOverview").html(`
                <div class="detail-row">
                    <small class="text-muted">Học kỳ:</small>
                    <div class="fw-bold">${data.studentFee.semesterName || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Tổng học phí:</small>
                    <div class="fw-bold">${formatCurrency(data.studentFee.totalAmount)}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Đã thanh toán:</small>
                    <div>${formatCurrency(data.studentFee.paidAmount)}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Còn lại:</small>
                    <div>${formatCurrency(data.studentFee.totalAmount - data.studentFee.paidAmount)}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Tiến độ thanh toán:</small>
                    <div class="progress progress-thin mt-1">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${paymentPercent}%" 
                            aria-valuenow="${paymentPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Trạng thái:</small>
                    <div>${statusBadge}</div>
                </div>
                <div class="detail-row">
                    <small class="text-muted">Hạn nộp:</small>
                    <div>${dueDate}</div>
                </div>
            `);
        } else {
            $("#feeOverview").html('<div class="alert alert-warning">Không có thông tin học phí</div>');
        }
        
        // Render chi tiết học phí
        const feeDetailsList = $("#feeDetailsList");
        feeDetailsList.empty();
        
        if (data.feeDetails && Array.isArray(data.feeDetails) && data.feeDetails.length > 0) {
            data.feeDetails.forEach(function(detail) {
                feeDetailsList.append(`
                    <tr>
                        <td>${detail.categoryName || 'N/A'}</td>
                        <td>${formatCurrency(detail.amount)}</td>
                        <td></td>
                    </tr>
                `);
            });
            
            if (data.studentFee) {
                $("#totalFeeAmount").text(formatCurrency(data.studentFee.totalAmount));
            }
        } else {
            feeDetailsList.append(`
                <tr>
                    <td colspan="3" class="text-center">Không có chi tiết học phí</td>
                </tr>
            `);
            $("#totalFeeAmount").text(formatCurrency(0));
        }
        
        // Render lịch sử thanh toán
        const paymentHistoryList = $("#paymentHistoryList");
        paymentHistoryList.empty();
        
        if (data.payments && Array.isArray(data.payments) && data.payments.length > 0) {
            data.payments.forEach(function(payment) {
                let paymentStatus = '';
                switch (payment.status) {
                    case 'Success':
                        paymentStatus = `<span class="badge bg-success">Thành công</span>`;
                        break;
                    case 'Pending':
                        paymentStatus = `<span class="badge bg-warning text-dark">Đang xử lý</span>`;
                        break;
                    case 'Failed':
                        paymentStatus = `<span class="badge bg-danger">Thất bại</span>`;
                        break;
                    default:
                        paymentStatus = `<span class="badge bg-secondary">${payment.status || 'N/A'}</span>`;
                }
                
                const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('vi-VN') : 'N/A';
                
                paymentHistoryList.append(`
                    <tr>
                        <td>${paymentDate}</td>
                        <td>${formatCurrency(payment.amount)}</td>
                        <td>${payment.paymentMethodName || 'N/A'}</td>
                        <td>${payment.transactionID || 'N/A'}</td>
                        <td>${paymentStatus}</td>
                    </tr>
                `);
            });
        } else {
            paymentHistoryList.append(`
                <tr>
                    <td colspan="5" class="text-center">Chưa có lịch sử thanh toán</td>
                </tr>
            `);
        }
    }
    
    // Mở modal chỉnh sửa học phí
    function openEditFeeModal() {
        if (!currentStudentFee) {
            showAlert('error', 'Không tìm thấy thông tin học phí để chỉnh sửa');
            return;
        }
        
        // Reset form
        $("#editFeeForm")[0].reset();
        $("#feeItemsContainer").empty();
        
        // Set giá trị ban đầu
        $("#studentFeeId").val(currentStudentFee.studentFee.studentFeeID);
        
        // Format date cho input type="date"
        const dueDate = new Date(currentStudentFee.studentFee.dueDate);
        const formattedDueDate = dueDate.toISOString().split('T')[0];
        $("#feeDueDate").val(formattedDueDate);
        
        // Load danh mục học phí
        loadFeeCategories(function() {
            // Thêm từng khoản phí
            currentStudentFee.feeDetails.forEach(function(detail) {
                addFeeItemRow(detail);
            });
            
            $("#editFeeModal").modal("show");
        });
    }
    
    // Mở modal thêm thanh toán
    function openAddPaymentModal() {
        if (!currentStudentFee) {
            showAlert('error', 'Không tìm thấy thông tin học phí để thêm thanh toán');
            return;
        }
        
        // Reset form
        $("#addPaymentForm")[0].reset();
        
        // Set giá trị ban đầu
        $("#paymentStudentFeeId").val(currentStudentFee.studentFee.studentFeeID);
        
        // Tính số tiền còn lại phải thanh toán
        const remainingAmount = currentStudentFee.studentFee.totalAmount - currentStudentFee.studentFee.paidAmount;
        $("#paymentAmount").val(remainingAmount > 0 ? remainingAmount : 0);
        
        $("#addPaymentModal").modal("show");
    }
    
    // Load danh mục học phí cho form chỉnh sửa
    function loadFeeCategories(callback) {
        showLoading();
        $.ajax({
            url: '/api/fee-categories',
            type: 'GET',
            success: function(data) {
                window.feeCategories = data;
                hideLoading();
                if (callback) callback();
            },
            error: function(error) {
                console.error('Error loading fee categories:', error);
                showAlert('error', 'Không thể tải danh mục học phí. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Thêm dòng khoản phí trong form chỉnh sửa
    function addFeeItemRow(feeDetail = null) {
        if (!window.feeCategories) {
            showAlert('error', 'Không thể tải danh mục học phí. Vui lòng thử lại sau.');
            return;
        }
        
        const index = $("#feeItemsContainer .fee-item").length;
        const container = $("#feeItemsContainer");
        
        let categoryOptions = '<option value="">Chọn danh mục học phí</option>';
        window.feeCategories.forEach(function(category) {
            const selected = feeDetail && feeDetail.feeCategoryID === category.feeCategoryID ? 'selected' : '';
            categoryOptions += `<option value="${category.feeCategoryID}" ${selected}>${category.categoryName}</option>`;
        });
        
        const amount = feeDetail ? feeDetail.amount : '';
        
        container.append(`
            <div class="fee-item card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="m-0">Khoản phí #${index + 1}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger remove-fee-item">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Danh mục học phí</label>
                        <select class="form-select fee-category" name="feeDetails[${index}].feeCategoryID" required>
                            ${categoryOptions}
                        </select>
                    </div>
                    
                    <div class="mb-0">
                        <label class="form-label">Số tiền</label>
                        <input type="number" class="form-control fee-amount" name="feeDetails[${index}].amount" 
                            value="${amount}" min="0" required>
                    </div>
                </div>
            </div>
        `);
        
        // Bind event cho nút xóa khoản phí
        container.find(".remove-fee-item").last().click(function() {
            $(this).closest(".fee-item").remove();
        });
    }
    
    // Lưu thông tin học phí sau khi chỉnh sửa
    function saveStudentFee() {
        const feeId = $("#studentFeeId").val();
        const dueDate = $("#feeDueDate").val();
        
        if (!feeId || !dueDate) {
            showAlert('error', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        // Lấy thông tin các khoản phí
        const feeDetails = [];
        let isValid = true;
        
        $(".fee-item").each(function() {
            const categoryId = $(this).find(".fee-category").val();
            const amount = $(this).find(".fee-amount").val();
            
            if (!categoryId || !amount) {
                isValid = false;
                return false;
            }
            
            feeDetails.push({
                feeCategoryID: parseInt(categoryId),
                amount: parseFloat(amount)
            });
        });
        
        if (!isValid) {
            showAlert('error', 'Vui lòng điền đầy đủ thông tin cho từng khoản phí');
            return;
        }
        
        const data = {
            dueDate: dueDate,
            feeDetails: feeDetails
        };
        
        showLoading();
        $.ajax({
            url: `/api/student-fees/${feeId}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                showAlert('success', 'Cập nhật học phí thành công');
                $("#editFeeModal").modal("hide");
                viewStudentFeeDetail(feeId);
                loadStudents();
            },
            error: function(error) {
                console.error('Error updating student fee:', error);
                showAlert('error', 'Không thể cập nhật học phí. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Lưu thông tin thanh toán mới
    function savePayment() {
        const studentFeeId = $("#paymentStudentFeeId").val();
        const amount = $("#paymentAmount").val();
        const paymentMethodId = $("#paymentMethod").val();
        const transactionId = $("#transactionId").val();
        const reference = $("#paymentReference").val();
        
        if (!studentFeeId || !amount || !paymentMethodId) {
            showAlert('error', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        
        const data = {
            studentFeeID: parseInt(studentFeeId),
            paymentMethodID: parseInt(paymentMethodId),
            amount: parseFloat(amount),
            transactionID: transactionId,
            paymentReference: reference
        };
        
        showLoading();
        $.ajax({
            url: '/api/payments',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                showAlert('success', 'Thêm thanh toán thành công');
                $("#addPaymentModal").modal("hide");
                viewStudentFeeDetail(studentFeeId);
                loadStudents();
            },
            error: function(error) {
                console.error('Error adding payment:', error);
                showAlert('error', 'Không thể thêm thanh toán. Vui lòng thử lại sau.');
                hideLoading();
            }
        });
    }
    
    // Xác nhận xóa học phí
    function confirmDeleteFee(feeId) {
        if (confirm('Bạn có chắc chắn muốn xóa học phí này không? Hành động này không thể hoàn tác.')) {
            deleteStudentFee(feeId);
        }
    }
    
    // Xóa học phí
    function deleteStudentFee(feeId) {
        showLoading();
        $.ajax({
            url: `/api/student-fees/${feeId}`,
            type: 'DELETE',
            success: function() {
                showAlert('success', 'Xóa học phí thành công');
                loadStudents();
            },
            error: function(error) {
                console.error('Error deleting student fee:', error);
                
                if (error.responseJSON && error.responseJSON.message) {
                    showAlert('error', error.responseJSON.message);
                } else {
                    showAlert('error', 'Không thể xóa học phí. Vui lòng thử lại sau.');
                }
                
                hideLoading();
            }
        });
    }
    
    // Load form tạo học phí hàng loạt
    function loadBatchForm() {
        const today = new Date();
        // Add 30 days to today for default due date
        const dueDate = new Date(today.setDate(today.getDate() + 30));
        
        // Format date for input type="date"
        const formattedDueDate = dueDate.toISOString().split('T')[0];
        $("#batchDueDate").val(formattedDueDate);
        
        // Reset other fields
        $("#batchSemester").val('');
        $("#batchDepartment").val('');
        $("#batchClass").val('');
        $("#overwriteExisting").prop('checked', false);
    }
    
    // Tạo học phí hàng loạt
    function createBatchFees() {
        const semesterId = $("#batchSemester").val();
        const departmentId = $("#batchDepartment").val() || null;
        const classId = $("#batchClass").val() || null;
        const dueDate = $("#batchDueDate").val();
        const overwriteExisting = $("#overwriteExisting").is(':checked');
        
        if (!semesterId || !dueDate) {
            showAlert('error', 'Vui lòng chọn học kỳ và hạn nộp học phí');
            return;
        }
        
        const data = {
            semesterID: parseInt(semesterId),
            departmentID: departmentId ? parseInt(departmentId) : null,
            classID: classId ? parseInt(classId) : null,
            dueDate: dueDate,
            overwriteExisting: overwriteExisting
        };
        
        showLoading();
        $.ajax({
            url: '/api/student-fees/batch',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                hideLoading();
                showAlert('success', `Tạo học phí hàng loạt thành công! Đã tạo học phí cho ${response.created} sinh viên. Đã bỏ qua ${response.skipped} sinh viên.`);
                $("#batchFeeModal").modal("hide");
                loadStudents();
            },
            error: function(error) {
                console.error('Error creating batch fees:', error);
                
                if (error.responseJSON && error.responseJSON.message) {
                    showAlert('error', error.responseJSON.message);
                } else {
                    showAlert('error', 'Không thể tạo học phí hàng loạt. Vui lòng thử lại sau.');
                }
                
                hideLoading();
            },
            complete: function() {
                hideLoading(); // Đảm bảo luôn ẩn loading
            }
        });
    }
    
    // Tạo hóa đơn
    function generateInvoice() {
        if (!currentStudentFee) {
            showAlert('error', 'Không tìm thấy thông tin học phí để tạo hóa đơn');
            return;
        }
        
        showAlert('info', 'Chức năng tạo hóa đơn đang được phát triển. Vui lòng thử lại sau.');
    }
    
    // Gửi nhắc nhở thanh toán
    function sendPaymentReminder() {
        if (!currentStudentFee) {
            showAlert('error', 'Không tìm thấy thông tin học phí để gửi nhắc nhở');
            return;
        }
        
        showAlert('info', 'Chức năng gửi nhắc nhở thanh toán đang được phát triển. Vui lòng thử lại sau.');
    }
    
    // Hiển thị thông báo
    function showAlert(type, message) {
        let alertClass = 'alert-info';
        
        switch (type) {
            case 'success':
                alertClass = 'alert-success';
                break;
            case 'error':
                alertClass = 'alert-danger';
                break;
            case 'warning':
                alertClass = 'alert-warning';
                break;
        }
        
        // Tạo alert element
        const alertElement = $(`
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `);
        
        // Tìm container phù hợp
        const container = $(".main-container .container");
        if (container.length === 0) {
            console.error('Alert container not found');
            return;
        }
        
        // Thêm alert vào đầu container
        container.prepend(alertElement);
        
        // Xóa alert sau 5 giây
        setTimeout(function() {
            if (alertElement.length) {
                alertElement.alert('close');
            }
        }, 5000);
    }
    
    // Hiển thị loading
    function showLoading() {
        $("#loadingOverlay").removeClass('d-none');
    }
    
    // Ẩn loading
    function hideLoading() {
        $("#loadingOverlay").addClass('d-none');
    }
    
    // Format số tiền
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
});