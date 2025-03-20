$(document).ready(function() {
    // Global variables
    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 0;
    let selectedInvoices = [];
    
    // Initialize components
    initializePage();
    
    // Initialize page function
    function initializePage() {
        loadInvoices();
        
        // Set up event listeners
        setupEventListeners();
    }
    
    // Load invoices with optional filters
    function loadInvoices(filters = {}) {
        // Show loading indicator
        $('#invoices').html('<tr><td colspan="9" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>');
        
        $.ajax({
            url: '/api/payments/invoices/search',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                invoiceNumber: filters.invoiceNumber || '',
                studentCode: filters.studentCode || '',
                transactionId: filters.transactionId || '',
                sentToEmail: filters.sentToEmail === '1' ? true : (filters.sentToEmail === '0' ? false : null),
                startDate: filters.startDate || null,
                endDate: filters.endDate || null,
                pageNumber: currentPage,
                pageSize: pageSize
            }),
            success: function(response) {
                displayInvoices(response.items);
                updatePagination(response.totalCount);
                // Reset selection
                selectedInvoices = [];
                $('#selectAll').prop('checked', false);
            },
            error: function(error) {
                console.error('Error loading invoices:', error);
                showToast('error', 'Không thể tải dữ liệu hóa đơn');
                $('#invoices').html('<tr><td colspan="9" class="text-center">Lỗi khi tải dữ liệu</td></tr>');
            }
        });
    }
    
    // Display invoices in table
    function displayInvoices(invoices) {
        const $tbody = $('#invoices');
        $tbody.empty();
        
        if (invoices.length === 0) {
            $tbody.html('<tr><td colspan="9" class="text-center">Không có dữ liệu</td></tr>');
            return;
        }
        
        invoices.forEach(invoice => {
            const emailStatus = invoice.sentToEmail
                ? '<span class="badge bg-success">Đã gửi</span>'
                : '<span class="badge bg-warning text-dark">Chưa gửi</span>';
            
            $tbody.append(`
                <tr>
                    <td><input type="checkbox" class="invoice-checkbox" data-id="${invoice.invoiceID}"></td>
                    <td>${invoice.invoiceNumber}</td>
                    <td>${invoice.studentCode}</td>
                    <td>${invoice.studentName}</td>
                    <td>${invoice.transactionID || 'N/A'}</td>
                    <td>${formatCurrency(invoice.amount)}</td>
                    <td>${formatDate(invoice.invoiceDate)}</td>
                    <td>${emailStatus}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-invoice" data-id="${invoice.invoiceID}" title="Xem hóa đơn">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-success download-invoice" data-id="${invoice.invoiceID}" title="Tải xuống">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-info send-email" data-id="${invoice.invoiceID}" title="Gửi email" ${invoice.sentToEmail ? 'disabled' : ''}>
                            <i class="fas fa-envelope"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
        
        // Attach event listeners to newly created elements
        $('.invoice-checkbox').on('change', function() {
            const invoiceId = $(this).data('id');
            if ($(this).is(':checked')) {
                if (!selectedInvoices.includes(invoiceId)) {
                    selectedInvoices.push(invoiceId);
                }
            } else {
                const index = selectedInvoices.indexOf(invoiceId);
                if (index > -1) {
                    selectedInvoices.splice(index, 1);
                }
                $('#selectAll').prop('checked', false);
            }
        });
        
        $('.view-invoice').on('click', function() {
            const invoiceId = $(this).data('id');
            viewInvoice(invoiceId);
        });
        
        $('.download-invoice').on('click', function() {
            const invoiceId = $(this).data('id');
            downloadInvoice(invoiceId);
        });
        
        $('.send-email').on('click', function() {
            const invoiceId = $(this).data('id');
            sendInvoiceEmail(invoiceId);
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
                loadInvoices(filters);
            }
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Search button click
        $('#searchBtn').on('click', function() {
            currentPage = 1;
            const filters = getSearchFilters();
            loadInvoices(filters);
        });
        
        // Reset button click
        $('#resetBtn').on('click', function() {
            // Clear all filters
            $('#invoiceNumberSearch').val('');
            $('#studentCodeSearch').val('');
            $('#transactionIdSearch').val('');
            $('#emailStatusSearch').val('');
            $('#startDateSearch').val('');
            $('#endDateSearch').val('');
            
            currentPage = 1;
            loadInvoices();
        });
        
        // Export Excel button
        $('#exportExcelBtn').on('click', function() {
            const filters = getSearchFilters();
            exportToExcel(filters);
        });
        
        // Generate invoice button
        $('#generateInvoiceBtn').on('click', function() {
            openGenerateInvoiceModal();
        });
        
        // Select all checkboxes
        $('#selectAll').on('change', function() {
            const isChecked = $(this).is(':checked');
            $('.invoice-checkbox').prop('checked', isChecked);
            
            selectedInvoices = [];
            if (isChecked) {
                $('.invoice-checkbox').each(function() {
                    selectedInvoices.push($(this).data('id'));
                });
            }
        });
        
        // Send selected invoices by email
        $('#sendSelectedBtn').on('click', function() {
            if (selectedInvoices.length === 0) {
                showToast('error', 'Vui lòng chọn ít nhất một hóa đơn');
                return;
            }
            
            sendSelectedInvoices();
        });
    }
    
    // Get search filters from form
    function getSearchFilters() {
        return {
            invoiceNumber: $('#invoiceNumberSearch').val(),
            studentCode: $('#studentCodeSearch').val(),
            transactionId: $('#transactionIdSearch').val(),
            sentToEmail: $('#emailStatusSearch').val(),
            startDate: $('#startDateSearch').val(),
            endDate: $('#endDateSearch').val()
        };
    }
    
    // View invoice details
    function viewInvoice(invoiceId) {
        $.ajax({
            url: `/api/payments/invoices/${invoiceId}`,
            type: 'GET',
            success: function(invoice) {
                // Create modal content
                const modalContent = `
                    <div class="modal fade" id="viewInvoiceModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Chi tiết hóa đơn #${invoice.invoiceNumber}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>Mã sinh viên:</strong> ${invoice.studentCode}</p>
                                            <p><strong>Họ tên:</strong> ${invoice.studentName}</p>
                                            <p><strong>Email:</strong> ${invoice.studentEmail}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>Ngày tạo:</strong> ${formatDate(invoice.invoiceDate)}</p>
                                            <p><strong>Mã giao dịch:</strong> ${invoice.transactionID || 'N/A'}</p>
                                            <p><strong>Trạng thái email:</strong> ${invoice.sentToEmail ? 'Đã gửi' : 'Chưa gửi'}</p>
                                        </div>
                                    </div>
                                    <div class="row mt-3">
                                        <div class="col-12">
                                            <p><strong>Số tiền:</strong> ${formatCurrency(invoice.amount)}</p>
                                            <p><strong>Ghi chú:</strong> ${invoice.paymentReference || 'Không có ghi chú'}</p>
                                        </div>
                                    </div>
                                    <div class="row mt-3">
                                        <div class="col-12 text-center">
                                            <a href="${invoice.invoicePath}" target="_blank" class="btn btn-primary">
                                                <i class="fas fa-eye me-2"></i>Xem hóa đơn
                                            </a>
                                            <button class="btn btn-success download-btn" data-id="${invoice.invoiceID}">
                                                <i class="fas fa-download me-2"></i>Tải xuống
                                            </button>
                                            <button class="btn btn-info send-email-btn" data-id="${invoice.invoiceID}" ${invoice.sentToEmail ? 'disabled' : ''}>
                                                <i class="fas fa-envelope me-2"></i>Gửi email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if any
                $('#viewInvoiceModal').remove();
                
                // Add modal to body
                $('body').append(modalContent);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('viewInvoiceModal'));
                modal.show();
                
                // Add event listeners
                $('.download-btn').on('click', function() {
                    downloadInvoice($(this).data('id'));
                });
                
                $('.send-email-btn').on('click', function() {
                    sendInvoiceEmail($(this).data('id'));
                    $(this).prop('disabled', true);
                    $(this).html('<i class="fas fa-check me-2"></i>Đã gửi');
                    modal.hide();
                });
            },
            error: function(error) {
                console.error('Error loading invoice details:', error);
                showToast('error', 'Không thể tải chi tiết hóa đơn');
            }
        });
    }
    
    // Download invoice
    function downloadInvoice(invoiceId) {
        // Open the invoice in a new tab or download
        window.open(`/api/payments/invoices/${invoiceId}/download`, '_blank');
    }
    
    // Send invoice by email
    function sendInvoiceEmail(invoiceId) {
        $.ajax({
            url: `/api/payments/invoices/${invoiceId}/send-email`,
            type: 'POST',
            success: function() {
                showToast('success', 'Gửi hóa đơn qua email thành công');
                loadInvoices(getSearchFilters());
            },
            error: function(error) {
                console.error('Error sending invoice email:', error);
                showToast('error', 'Không thể gửi hóa đơn qua email');
            }
        });
    }
    
    // Send selected invoices by email
    function sendSelectedInvoices() {
        $.ajax({
            url: '/api/payments/invoices/send-batch',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                invoiceIds: selectedInvoices
            }),
            success: function() {
                showToast('success', 'Gửi các hóa đơn đã chọn qua email thành công');
                loadInvoices(getSearchFilters());
            },
            error: function(error) {
                console.error('Error sending batch invoices:', error);
                showToast('error', 'Không thể gửi các hóa đơn qua email');
            }
        });
    }
    
    // Export to Excel function
    function exportToExcel(filters) {
        const queryParams = new URLSearchParams({
            invoiceNumber: filters.invoiceNumber || '',
            studentCode: filters.studentCode || '',
            transactionId: filters.transactionId || '',
            sentToEmail: filters.sentToEmail || '',
            startDate: filters.startDate || '',
            endDate: filters.endDate || ''
        }).toString();
        
        window.location.href = `/api/payments/invoices/export?${queryParams}`;
    }
    
    // Open generate invoice modal
    function openGenerateInvoiceModal() {
        // First fetch payment list for dropdown (payments without invoices)
        $.ajax({
            url: '/api/payments/without-invoice',
            type: 'GET',
            success: function(payments) {
                // Create modal content
                const modalContent = `
                    <div class="modal fade" id="generateInvoiceModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Tạo hóa đơn mới</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="generateInvoiceForm">
                                        <div class="mb-3">
                                            <label for="paymentSelect" class="form-label">Chọn thanh toán</label>
                                            <select class="form-select" id="paymentSelect" required>
                                                <option value="">-- Chọn thanh toán --</option>
                                                ${payments.map(p => `<option value="${p.paymentID}">${p.studentCode} - ${p.studentName} - ${formatCurrency(p.amount)}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="sendEmail" class="form-label">Gửi qua email</label>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="sendEmail">
                                                <label class="form-check-label" for="sendEmail">
                                                    Gửi hóa đơn qua email sau khi tạo
                                                </label>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                    <button type="button" class="btn btn-primary" id="confirmGenerateBtn">Tạo hóa đơn</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if any
                $('#generateInvoiceModal').remove();
                
                // Add modal to body
                $('body').append(modalContent);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('generateInvoiceModal'));
                modal.show();
                
                // Confirm button click
                $('#confirmGenerateBtn').on('click', function() {
                    const paymentId = $('#paymentSelect').val();
                    const sendEmail = $('#sendEmail').is(':checked');
                    
                    if (!paymentId) {
                        alert('Vui lòng chọn thanh toán');
                        return;
                    }
                    
                    generateInvoice(paymentId, sendEmail);
                    modal.hide();
                });
            },
            error: function(error) {
                console.error('Error loading payments:', error);
                showToast('error', 'Không thể tải danh sách thanh toán');
            }
        });
    }
    
    // Generate invoice for payment
    function generateInvoice(paymentId, sendEmail) {
        $.ajax({
            url: '/api/payments/invoices/generate',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                paymentId: paymentId,
                sendEmail: sendEmail
            }),
            success: function() {
                showToast('success', 'Tạo hóa đơn thành công');
                loadInvoices(getSearchFilters());
            },
            error: function(error) {
                console.error('Error generating invoice:', error);
                showToast('error', 'Không thể tạo hóa đơn');
            }
        });
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