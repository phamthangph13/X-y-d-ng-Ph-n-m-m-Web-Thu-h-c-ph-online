$(document).ready(function() {
    // Global variables
    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 0;
    let paymentMethods = [];
    let currentSemester = null;

    // Initialize components
    initializePage();

    // Initialize page function
    function initializePage() {
        loadPaymentMethods();
        loadSummaryData();
        loadPayments();
        
        // Set up event listeners
        setupEventListeners();
    }

    // Load payment methods for dropdown
    function loadPaymentMethods() {
        $.ajax({
            url: '/api/payment-methods',
            type: 'GET',
            success: function(data) {
                paymentMethods = data;
                populatePaymentMethodDropdown(data);
            },
            error: function(error) {
                console.error('Error loading payment methods:', error);
                showToast('error', 'Không thể tải phương thức thanh toán');
            }
        });
    }

    // Populate payment method dropdown
    function populatePaymentMethodDropdown(methods) {
        const $select = $('#paymentMethodSearch');
        $select.empty();
        $select.append('<option value="">Tất cả</option>');
        
        methods.forEach(method => {
            $select.append(`<option value="${method.paymentMethodID}">${method.methodName}</option>`);
        });
    }

    // Load summary data for dashboard
    function loadSummaryData() {
        $.ajax({
            url: '/api/payments/summary',
            type: 'GET',
            success: function(data) {
                updateSummaryCards(data);
                currentSemester = data.currentSemester;
            },
            error: function(error) {
                console.error('Error loading summary data:', error);
                showToast('error', 'Không thể tải dữ liệu tổng hợp');
            }
        });
    }

    // Update summary cards with data
    function updateSummaryCards(data) {
        $('#totalPayments').text(formatCurrency(data.totalAmount));
        $('#successfulPayments').text(formatCurrency(data.successAmount));
        $('#pendingPayments').text(formatCurrency(data.pendingAmount));
    }

    // Load payments with optional filters
    function loadPayments(filters = {}) {
        // Show loading indicator
        $('#payments').html('<tr><td colspan="9" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>');
        
        let url = '/api/payments/search';
        
        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                transactionId: filters.transactionId || '',
                studentCode: filters.studentCode || '',
                paymentMethodId: filters.paymentMethodId || null,
                status: filters.status || '',
                startDate: filters.startDate || null,
                endDate: filters.endDate || null,
                pageNumber: currentPage,
                pageSize: pageSize
            }),
            success: function(response) {
                displayPayments(response.items);
                updatePagination(response.totalCount);
            },
            error: function(error) {
                console.error('Error loading payments:', error);
                showToast('error', 'Không thể tải dữ liệu thanh toán');
                $('#payments').html('<tr><td colspan="9" class="text-center">Lỗi khi tải dữ liệu</td></tr>');
            }
        });
    }

    // Display payments in table
    function displayPayments(payments) {
        const $tbody = $('#payments');
        $tbody.empty();
        
        if (payments.length === 0) {
            $tbody.html('<tr><td colspan="9" class="text-center">Không có dữ liệu</td></tr>');
            return;
        }
        
        payments.forEach(payment => {
            let statusBadge = '';
            if (payment.status === 'Success') {
                statusBadge = '<span class="badge bg-success">Thành công</span>';
            } else if (payment.status === 'Failed') {
                statusBadge = '<span class="badge bg-danger">Thất bại</span>';
            } else if (payment.status === 'Pending') {
                statusBadge = '<span class="badge bg-warning text-dark">Đang xử lý</span>';
            }
            
            $tbody.append(`
                <tr>
                    <td>${payment.paymentID}</td>
                    <td>${payment.studentCode}</td>
                    <td>${payment.studentName}</td>
                    <td>${payment.transactionID || 'N/A'}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td>${payment.paymentMethodName}</td>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-payment" data-id="${payment.paymentID}" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning update-status" data-id="${payment.paymentID}" title="Cập nhật trạng thái">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    // Update pagination controls
    function updatePagination(totalCount) {
        totalPages = Math.ceil(totalCount / pageSize);
        const $pagination = $('#pagination');
        $pagination.empty();
        
        if (totalPages <= 1) {
            return;
        }
        
        const $ul = $('<ul class="pagination justify-content-center"></ul>');
        
        // Previous button
        $ul.append(`
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">Trước</a>
            </li>
        `);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            $ul.append(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }
        
        // Next button
        $ul.append(`
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">Sau</a>
            </li>
        `);
        
        $pagination.append($ul);
        
        // Add pagination click event
        $('.page-link').on('click', function(e) {
            e.preventDefault();
            const page = $(this).data('page');
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                const filters = getSearchFilters();
                loadPayments(filters);
            }
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Search button click
        $('#searchBtn').on('click', function() {
            currentPage = 1;
            const filters = getSearchFilters();
            loadPayments(filters);
        });
        
        // Reset button click
        $('#resetBtn').on('click', function() {
            // Clear all filters
            $('#transactionIdSearch').val('');
            $('#studentCodeSearch').val('');
            $('#paymentMethodSearch').val('');
            $('#statusSearch').val('');
            $('#startDateSearch').val('');
            $('#endDateSearch').val('');
            
            currentPage = 1;
            loadPayments();
        });
        
        // Export Excel button
        $('#exportExcelBtn').on('click', function() {
            const filters = getSearchFilters();
            exportToExcel(filters);
        });
        
        // View payment details
        $(document).on('click', '.view-payment', function() {
            const paymentId = $(this).data('id');
            openPaymentDetailsModal(paymentId);
        });
        
        // Update payment status
        $(document).on('click', '.update-status', function() {
            const paymentId = $(this).data('id');
            openUpdateStatusModal(paymentId);
        });
        
        // Add payment button
        $('#addPaymentBtn').on('click', function() {
            openAddPaymentModal();
        });
    }

    // Get search filters from form
    function getSearchFilters() {
        return {
            transactionId: $('#transactionIdSearch').val(),
            studentCode: $('#studentCodeSearch').val(),
            paymentMethodId: $('#paymentMethodSearch').val(),
            status: $('#statusSearch').val(),
            startDate: $('#startDateSearch').val(),
            endDate: $('#endDateSearch').val()
        };
    }

    // Open payment details modal
    function openPaymentDetailsModal(paymentId) {
        $.ajax({
            url: `/api/payments/${paymentId}`,
            type: 'GET',
            success: function(payment) {
                // Populate modal with payment details
                const modal = $('#paymentDetailsModal');
                modal.find('.modal-title').text(`Chi tiết thanh toán #${payment.paymentID}`);
                
                let statusBadge = '';
                if (payment.status === 'Success') {
                    statusBadge = '<span class="badge bg-success">Thành công</span>';
                } else if (payment.status === 'Failed') {
                    statusBadge = '<span class="badge bg-danger">Thất bại</span>';
                } else if (payment.status === 'Pending') {
                    statusBadge = '<span class="badge bg-warning text-dark">Đang xử lý</span>';
                }
                
                // Prepare invoice list if available
                let invoiceList = '<p>Không có hóa đơn</p>';
                if (payment.invoices && payment.invoices.length > 0) {
                    invoiceList = '<ul class="list-group">';
                    payment.invoices.forEach(invoice => {
                        invoiceList += `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                ${invoice.invoiceNumber} (${formatDate(invoice.invoiceDate)})
                                <div>
                                    <a href="${invoice.invoicePath}" target="_blank" class="btn btn-sm btn-primary">
                                        <i class="fas fa-download"></i>
                                    </a>
                                </div>
                            </li>
                        `;
                    });
                    invoiceList += '</ul>';
                }
                
                const modalBody = `
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Mã sinh viên:</strong> ${payment.studentCode}</p>
                            <p><strong>Họ tên:</strong> ${payment.studentName}</p>
                            <p><strong>Email:</strong> ${payment.studentEmail}</p>
                            <p><strong>Học kỳ:</strong> ${payment.semesterName}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Phương thức:</strong> ${payment.paymentMethodName}</p>
                            <p><strong>Mã giao dịch:</strong> ${payment.transactionID || 'N/A'}</p>
                            <p><strong>Ngày thanh toán:</strong> ${formatDate(payment.paymentDate)}</p>
                            <p><strong>Trạng thái:</strong> ${statusBadge}</p>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-12">
                            <p><strong>Số tiền:</strong> ${formatCurrency(payment.amount)}</p>
                            <p><strong>Ghi chú:</strong> ${payment.paymentReference || 'Không có ghi chú'}</p>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-12">
                            <h5>Hóa đơn</h5>
                            ${invoiceList}
                        </div>
                    </div>
                `;
                
                modal.find('.modal-body').html(modalBody);
                
                // Show modal
                modal.modal('show');
            },
            error: function(error) {
                console.error('Error loading payment details:', error);
                showToast('error', 'Không thể tải chi tiết thanh toán');
            }
        });
    }

    // Open update status modal
    function openUpdateStatusModal(paymentId) {
        $.ajax({
            url: `/api/payments/${paymentId}`,
            type: 'GET',
            success: function(payment) {
                // Create modal content
                const modalContent = `
                    <div class="modal fade" id="updateStatusModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Cập nhật trạng thái thanh toán #${payment.paymentID}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="updateStatusForm">
                                        <div class="mb-3">
                                            <label for="paymentStatus" class="form-label">Trạng thái</label>
                                            <select class="form-select" id="paymentStatus" required>
                                                <option value="Success" ${payment.status === 'Success' ? 'selected' : ''}>Thành công</option>
                                                <option value="Failed" ${payment.status === 'Failed' ? 'selected' : ''}>Thất bại</option>
                                                <option value="Pending" ${payment.status === 'Pending' ? 'selected' : ''}>Đang xử lý</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="paymentReference" class="form-label">Ghi chú</label>
                                            <textarea class="form-control" id="paymentReference" rows="3">${payment.paymentReference || ''}</textarea>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                    <button type="button" class="btn btn-primary" id="saveStatusBtn">Lưu thay đổi</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if any
                $('#updateStatusModal').remove();
                
                // Add modal to body
                $('body').append(modalContent);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
                modal.show();
                
                // Save button click
                $('#saveStatusBtn').on('click', function() {
                    const status = $('#paymentStatus').val();
                    const reference = $('#paymentReference').val();
                    
                    // Update payment status
                    $.ajax({
                        url: `/api/payments/${paymentId}/status`,
                        type: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            status: status,
                            paymentReference: reference
                        }),
                        success: function() {
                            modal.hide();
                            showToast('success', 'Cập nhật trạng thái thành công');
                            loadPayments(getSearchFilters());
                            loadSummaryData();
                        },
                        error: function(error) {
                            console.error('Error updating payment status:', error);
                            showToast('error', 'Không thể cập nhật trạng thái thanh toán');
                        }
                    });
                });
            },
            error: function(error) {
                console.error('Error loading payment details:', error);
                showToast('error', 'Không thể tải chi tiết thanh toán');
            }
        });
    }

    // Open add payment modal
    function openAddPaymentModal() {
        // First fetch student list for dropdown
        $.ajax({
            url: '/api/dropdown/students-with-fees',
            type: 'GET',
            success: function(students) {
                // Create modal content
                const modalContent = `
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Thêm thanh toán mới</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="addPaymentForm">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="studentSelect" class="form-label">Sinh viên</label>
                                            <select class="form-select" id="studentSelect" required>
                                                <option value="">-- Chọn sinh viên --</option>
                                                ${students.map(s => `<option value="${s.studentId}" data-code="${s.studentCode}">${s.studentCode} - ${s.studentName}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="studentFeeSelect" class="form-label">Học phí</label>
                                            <select class="form-select" id="studentFeeSelect" required disabled>
                                                <option value="">-- Chọn học phí --</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="paymentAmount" class="form-label">Số tiền</label>
                                            <input type="number" class="form-control" id="paymentAmount" required min="1000">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="paymentMethodSelect" class="form-label">Phương thức thanh toán</label>
                                            <select class="form-select" id="paymentMethodSelect" required>
                                                <option value="">-- Chọn phương thức --</option>
                                                ${paymentMethods.map(m => `<option value="${m.paymentMethodID}">${m.methodName}</option>`).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="transactionId" class="form-label">Mã giao dịch</label>
                                            <input type="text" class="form-control" id="transactionId">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="paymentDate" class="form-label">Ngày thanh toán</label>
                                            <input type="date" class="form-control" id="paymentDate" value="${new Date().toISOString().split('T')[0]}" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="paymentNote" class="form-label">Ghi chú</label>
                                        <textarea class="form-control" id="paymentNote" rows="2"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                <button type="button" class="btn btn-primary" id="savePaymentBtn">Lưu thanh toán</button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Update modal content
                $('#addPaymentModal').html(modalContent);
                
                // Student select change event
                $('#studentSelect').on('change', function() {
                    const studentId = $(this).val();
                    if (!studentId) {
                        $('#studentFeeSelect').html('<option value="">-- Chọn học phí --</option>').prop('disabled', true);
                        return;
                    }
                    
                    // Load student fees
                    $.ajax({
                        url: `/api/student-fees/student/${studentId}`,
                        type: 'GET',
                        success: function(fees) {
                            const $select = $('#studentFeeSelect');
                            $select.empty().prop('disabled', false);
                            $select.append('<option value="">-- Chọn học phí --</option>');
                            
                            fees.forEach(fee => {
                                const remainingAmount = fee.totalAmount - fee.paidAmount;
                                if (remainingAmount > 0) {
                                    $select.append(`<option value="${fee.studentFeeID}" data-amount="${remainingAmount}" data-semester="${fee.semesterName}">
                                        ${fee.semesterName} - Còn lại: ${formatCurrency(remainingAmount)}
                                    </option>`);
                                }
                            });
                        },
                        error: function(error) {
                            console.error('Error loading student fees:', error);
                            showToast('error', 'Không thể tải học phí của sinh viên');
                        }
                    });
                });
                
                // Student fee select change event
                $('#studentFeeSelect').on('change', function() {
                    const $selectedOption = $(this).find('option:selected');
                    const remainingAmount = $selectedOption.data('amount');
                    if (remainingAmount) {
                        $('#paymentAmount').val(remainingAmount);
                    }
                });
                
                // Save payment button click
                $('#savePaymentBtn').on('click', function() {
                    // Validate form
                    const form = document.getElementById('addPaymentForm');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    
                    const studentFeeId = $('#studentFeeSelect').val();
                    const paymentMethodId = $('#paymentMethodSelect').val();
                    const amount = $('#paymentAmount').val();
                    const transactionId = $('#transactionId').val();
                    const paymentReference = $('#paymentNote').val();
                    
                    // Create payment
                    $.ajax({
                        url: '/api/payments',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            studentFeeID: Number(studentFeeId),
                            paymentMethodID: Number(paymentMethodId),
                            amount: Number(amount),
                            transactionID: transactionId,
                            paymentReference: paymentReference
                        }),
                        success: function() {
                            $('#addPaymentModal').modal('hide');
                            showToast('success', 'Thêm thanh toán thành công');
                            loadPayments(getSearchFilters());
                            loadSummaryData();
                        },
                        error: function(error) {
                            console.error('Error creating payment:', error);
                            showToast('error', 'Không thể tạo thanh toán mới');
                        }
                    });
                });
            },
            error: function(error) {
                console.error('Error loading students:', error);
                showToast('error', 'Không thể tải danh sách sinh viên');
            }
        });
    }

    // Export to Excel function
    function exportToExcel(filters) {
        const queryParams = new URLSearchParams({
            transactionId: filters.transactionId || '',
            studentCode: filters.studentCode || '',
            paymentMethodId: filters.paymentMethodId || '',
            status: filters.status || '',
            startDate: filters.startDate || '',
            endDate: filters.endDate || ''
        }).toString();
        
        window.location.href = `/api/payments/export?${queryParams}`;
    }

    // Helper function to format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Show toast notification
    function showToast(type, message) {
        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        if (!$('.toast-container').length) {
            $('body').append('<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
        }
        
        $('.toast-container').append(toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
        toast.show();
    }
}); 