import { checkAuth, getUserData } from './utils/auth.js';
import { showToast } from './utils/toast.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated
    if (!await checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // Get user data
    const userData = await getUserData();
    
    // Initialize the sidebar toggle functionality
    initSidebar();
    
    // Load report history
    loadReportHistory();
    
    // Add event listener for form submission
    document.getElementById('reportForm').addEventListener('submit', handleReportSubmission);
});

function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

async function loadReportHistory() {
    try {
        const userData = await getUserData();
        const studentId = userData.userId;
        
        // Make API call to get report history
        const response = await fetch(`/api/reports/student/${studentId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load report history');
        }
        
        const reports = await response.json();
        
        // Display reports or show "no reports" message
        const reportHistoryTable = document.getElementById('reportHistory');
        const noReportsDiv = document.getElementById('noReports');
        
        if (reports.length === 0) {
            reportHistoryTable.innerHTML = '';
            noReportsDiv.classList.remove('d-none');
        } else {
            noReportsDiv.classList.add('d-none');
            reportHistoryTable.innerHTML = '';
            
            reports.forEach(report => {
                const row = document.createElement('tr');
                
                // Map report type to display name
                const reportTypeMap = {
                    'payment_issue': 'Vấn đề thanh toán',
                    'system_error': 'Lỗi hệ thống',
                    'incorrect_info': 'Thông tin không chính xác',
                    'transaction_error': 'Lỗi giao dịch',
                    'other': 'Vấn đề khác'
                };
                
                // Map status to display name and badge class
                const statusMap = {
                    'pending': { text: 'Đang chờ xử lý', class: 'bg-warning' },
                    'processing': { text: 'Đang xử lý', class: 'bg-info' },
                    'resolved': { text: 'Đã giải quyết', class: 'bg-success' },
                    'rejected': { text: 'Từ chối', class: 'bg-danger' }
                };
                
                const statusInfo = statusMap[report.status] || { text: 'Không xác định', class: 'bg-secondary' };
                
                row.innerHTML = `
                    <td>${report.reportId}</td>
                    <td>${report.subject}</td>
                    <td>${reportTypeMap[report.type] || report.type}</td>
                    <td>${new Date(report.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td><span class="badge ${statusInfo.class}">${statusInfo.text}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-report" data-id="${report.reportId}">
                            Xem chi tiết
                        </button>
                    </td>
                `;
                
                reportHistoryTable.appendChild(row);
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-report').forEach(button => {
                button.addEventListener('click', function() {
                    const reportId = this.getAttribute('data-id');
                    viewReportDetails(reportId);
                });
            });
        }
    } catch (error) {
        console.error('Error loading report history:', error);
        showToast('error', 'Không thể tải lịch sử báo cáo. Vui lòng thử lại sau.');
    }
}

async function handleReportSubmission(event) {
    event.preventDefault();
    
    try {
        const reportType = document.getElementById('reportType').value;
        const reportSubject = document.getElementById('reportSubject').value;
        const reportDescription = document.getElementById('reportDescription').value;
        const fileInput = document.getElementById('reportAttachment');
        
        // Get user data
        const userData = await getUserData();
        const studentId = userData.userId;
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('studentId', studentId);
        formData.append('type', reportType);
        formData.append('subject', reportSubject);
        formData.append('description', reportDescription);
        
        // Add files if any
        if (fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('attachments', fileInput.files[i]);
            }
        }
        
        // Submit the form data to API
        const response = await fetch('/api/reports', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit report');
        }
        
        // Show success message
        showToast('success', 'Báo cáo đã được gửi thành công!');
        
        // Reset the form
        document.getElementById('reportForm').reset();
        
        // Reload the report history
        loadReportHistory();
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showToast('error', 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
    }
}

async function viewReportDetails(reportId) {
    try {
        // Fetch report details
        const response = await fetch(`/api/reports/${reportId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load report details');
        }
        
        const report = await response.json();
        
        // Map report type to display name
        const reportTypeMap = {
            'payment_issue': 'Vấn đề thanh toán',
            'system_error': 'Lỗi hệ thống',
            'incorrect_info': 'Thông tin không chính xác',
            'transaction_error': 'Lỗi giao dịch',
            'other': 'Vấn đề khác'
        };
        
        // Map status to display name and badge class
        const statusMap = {
            'pending': { text: 'Đang chờ xử lý', class: 'bg-warning' },
            'processing': { text: 'Đang xử lý', class: 'bg-info' },
            'resolved': { text: 'Đã giải quyết', class: 'bg-success' },
            'rejected': { text: 'Từ chối', class: 'bg-danger' }
        };
        
        const statusInfo = statusMap[report.status] || { text: 'Không xác định', class: 'bg-secondary' };
        
        // Format the response date if available
        let responseDate = '';
        if (report.respondedAt) {
            responseDate = `<p><strong>Ngày phản hồi:</strong> ${new Date(report.respondedAt).toLocaleString('vi-VN')}</p>`;
        }
        
        // Format attachments if available
        let attachmentsHtml = '';
        if (report.attachments && report.attachments.length > 0) {
            attachmentsHtml = `
                <div class="mt-3">
                    <h6>Tài liệu đính kèm:</h6>
                    <div class="row">
                        ${report.attachments.map(attachment => `
                            <div class="col-md-4 mb-2">
                                <a href="${attachment.url}" target="_blank" class="text-decoration-none">
                                    <div class="attachment-item p-2 border rounded">
                                        <i class="fas fa-file me-2"></i>
                                        ${attachment.fileName}
                                    </div>
                                </a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Format the response if available
        let responseHtml = '';
        if (report.response) {
            responseHtml = `
                <div class="mt-4 p-3 bg-light rounded">
                    <h6>Phản hồi từ nhà trường:</h6>
                    <p>${report.response}</p>
                    ${responseDate}
                    <p><strong>Người phản hồi:</strong> ${report.responderName || 'Không xác định'}</p>
                </div>
            `;
        }
        
        // Populate the modal with report details
        const modalContent = document.getElementById('reportDetailContent');
        modalContent.innerHTML = `
            <div class="report-detail">
                <div class="d-flex justify-content-between mb-3">
                    <h6>Mã báo cáo: #${report.reportId}</h6>
                    <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
                </div>
                
                <div class="mb-3">
                    <h5>${report.subject}</h5>
                    <p class="text-muted small">
                        <strong>Loại báo cáo:</strong> ${reportTypeMap[report.type] || report.type} | 
                        <strong>Ngày gửi:</strong> ${new Date(report.createdAt).toLocaleString('vi-VN')}
                    </p>
                </div>
                
                <div class="mb-3">
                    <h6>Mô tả chi tiết:</h6>
                    <p>${report.description}</p>
                </div>
                
                ${attachmentsHtml}
                ${responseHtml}
            </div>
        `;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('reportDetailModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading report details:', error);
        showToast('error', 'Không thể tải chi tiết báo cáo. Vui lòng thử lại sau.');
    }
} 