import { checkAuth, getAuthToken, logout } from './utils/auth.js';
import { showToast } from './utils/toast.js';

// Check if user is authenticated
checkAuth();

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const userNameElement = document.getElementById('userName');
    const typeFilter = document.getElementById('typeFilter');
    const searchNotification = document.getElementById('searchNotification');
    const refreshBtn = document.getElementById('refreshBtn');
    const notificationHistory = document.getElementById('notificationHistory');
    const totalNotificationsElement = document.getElementById('totalNotifications');
    const readNotificationsElement = document.getElementById('readNotifications');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const paginationContainer = document.getElementById('paginationContainer');

    // Tuition Reminder Elements
    const tuitionReminderForm = document.getElementById('tuitionReminderForm');
    const reminderSemesterSelect = document.getElementById('reminderSemester');
    const daysBeforeDue = document.getElementById('daysBeforeDue');
    const customizeMessage = document.getElementById('customizeMessage');
    const customMessageContainer = document.getElementById('customMessageContainer');
    const reminderTitle = document.getElementById('reminderTitle');
    const reminderContent = document.getElementById('reminderContent');

    // Standard Notification Elements
    const scheduleNotificationForm = document.getElementById('scheduleNotificationForm');
    const receiverType = document.getElementById('receiverType');
    const receiverFilterContainer = document.getElementById('receiverFilterContainer');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationContent = document.getElementById('notificationContent');
    const notificationType = document.getElementById('notificationType');
    const sendTime = document.getElementById('sendTime');
    const scheduledTimeContainer = document.getElementById('scheduledTimeContainer');
    const scheduledTime = document.getElementById('scheduledTime');
    const previewBtn = document.getElementById('previewBtn');

    // Preview elements
    const previewTitle = document.getElementById('previewTitle');
    const previewType = document.getElementById('previewType');
    const previewContent = document.getElementById('previewContent');
    const previewDate = document.getElementById('previewDate');

    // State variables
    let notifications = [];
    let semesters = [];
    let currentPage = 1;
    const pageSize = 10;
    let totalNotifications = 0;
    let totalPages = 0;

    // Initialize
    loadUserInfo();
    loadNotificationStats();
    loadNotifications();
    loadSemesters();
    initializeChart();

    // Event listeners
    if (customizeMessage) {
        customizeMessage.addEventListener('change', toggleCustomMessage);
    }

    if (tuitionReminderForm) {
        tuitionReminderForm.addEventListener('submit', handleTuitionReminderSubmit);
    }

    if (scheduleNotificationForm) {
        scheduleNotificationForm.addEventListener('submit', handleScheduleNotificationSubmit);
    }

    if (sendTime) {
        sendTime.addEventListener('change', () => {
            scheduledTimeContainer.style.display = sendTime.value === 'scheduled' ? 'block' : 'none';
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadNotifications();
            loadNotificationStats();
        });
    }

    if (previewBtn) {
        previewBtn.addEventListener('click', previewNotification);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContainer.classList.toggle('expanded');
        });
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }

    if (receiverType) {
        receiverType.addEventListener('change', handleReceiverTypeChange);
    }

    /**
     * Toggle custom message container visibility
     */
    function toggleCustomMessage() {
        if (customMessageContainer) {
            customMessageContainer.style.display = customizeMessage.checked ? 'block' : 'none';
        }
    }

    /**
     * Handle tuition reminder form submission
     * @param {Event} e - Form submit event
     */
    function handleTuitionReminderSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!reminderSemesterSelect.value) {
            showToast('Vui lòng chọn học kỳ', 'error');
            return;
        }

        // Prepare data
        const data = {
            semesterId: parseInt(reminderSemesterSelect.value),
            daysBeforeDue: parseInt(daysBeforeDue.value) || 7,
            reminderDate: new Date(),
        };

        // Add custom message if enabled
        if (customizeMessage.checked) {
            if (reminderTitle.value) {
                data.title = reminderTitle.value;
            }
            if (reminderContent.value) {
                data.message = reminderContent.value;
            }
        }

        // Send API request
        const token = getAuthToken();
        
        // Show loading button state
        const submitButton = tuitionReminderForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

        fetch('/api/notifications/tuition-reminder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send tuition reminders');
            }
            return response.json();
        })
        .then(result => {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('tuitionReminderModal'));
            if (modal) {
                modal.hide();
            }

            // Show success message
            showToast(`Đã gửi ${result.notificationsSent} thông báo nhắc nhở học phí cho ${result.totalStudents} sinh viên`, 'success');
            
            // Reload data
            loadNotifications();
            loadNotificationStats();
            
            // Reset form
            tuitionReminderForm.reset();
            customMessageContainer.style.display = 'none';
        })
        .catch(error => {
            console.error('Error sending tuition reminders:', error);
            showToast('Lỗi khi gửi thông báo nhắc nhở học phí', 'error');
        })
        .finally(() => {
            // Restore button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    }

    /**
     * Handle schedule notification form submission
     * @param {Event} e - Form submit event
     */
    function handleScheduleNotificationSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!notificationTitle.value || !notificationContent.value || !notificationType.value) {
            showToast('Vui lòng điền đầy đủ thông tin thông báo', 'error');
            return;
        }

        // Get user IDs based on receiver type
        let userIds = [];
        
        // In a real app, you would fetch real user IDs
        // This is a simplified example
        if (receiverType.value === 'all') {
            userIds = [1, 2, 3, 4, 5]; // Placeholder IDs
        } else if (receiverType.value === 'department') {
            const departmentSelect = document.getElementById('departmentSelect');
            if (departmentSelect && departmentSelect.value) {
                userIds = [1, 2, 3]; // Placeholder IDs for the department
            }
        } else if (receiverType.value === 'class') {
            const classSelect = document.getElementById('classSelect');
            if (classSelect && classSelect.value) {
                userIds = [4, 5]; // Placeholder IDs for the class
            }
        } else if (receiverType.value === 'individual') {
            const studentSelect = document.getElementById('studentSelect');
            if (studentSelect && studentSelect.value) {
                userIds = [parseInt(studentSelect.value)];
            }
        }

        if (userIds.length === 0) {
            showToast('Không có sinh viên nào được chọn', 'error');
            return;
        }

        // Prepare scheduled time
        let scheduledTimeValue = new Date();
        if (sendTime.value === 'scheduled' && scheduledTime.value) {
            scheduledTimeValue = new Date(scheduledTime.value);
        }

        // Show loading button state
        const submitButton = scheduleNotificationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

        // Send notifications to each user
        const promises = userIds.map(userId => {
            const notificationData = {
                userId: userId,
                title: notificationTitle.value,
                message: notificationContent.value,
                notificationType: notificationType.value
            };

            return fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });
        });

        Promise.allSettled(promises)
            .then(results => {
                const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
                const failed = results.length - successful;
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleNotificationModal'));
                if (modal) {
                    modal.hide();
                }

                // Show success message
                showToast(`Đã gửi ${successful} thông báo${failed > 0 ? `, ${failed} thông báo thất bại` : ''}`, 'success');
                
                // Reload data
                loadNotifications();
                loadNotificationStats();
                
                // Reset form
                scheduleNotificationForm.reset();
            })
            .catch(error => {
                console.error('Error sending notifications:', error);
                showToast('Lỗi khi gửi thông báo', 'error');
            })
            .finally(() => {
                // Restore button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            });
    }

    /**
     * Handle receiver type change
     */
    function handleReceiverTypeChange() {
        receiverFilterContainer.innerHTML = '';
        
        if (receiverType.value === 'department') {
            receiverFilterContainer.innerHTML = `
                <label for="departmentSelect" class="form-label">Chọn khoa</label>
                <select class="form-select" id="departmentSelect" required>
                    <option value="">-- Chọn khoa --</option>
                    <option value="1">Khoa Công nghệ thông tin</option>
                    <option value="2">Khoa Kinh tế</option>
                    <option value="3">Khoa Ngoại ngữ</option>
                </select>
            `;
        } else if (receiverType.value === 'class') {
            receiverFilterContainer.innerHTML = `
                <label for="classSelect" class="form-label">Chọn lớp</label>
                <select class="form-select" id="classSelect" required>
                    <option value="">-- Chọn lớp --</option>
                    <option value="1">CNTT1</option>
                    <option value="2">CNTT2</option>
                    <option value="3">KT1</option>
                </select>
            `;
        } else if (receiverType.value === 'individual') {
            receiverFilterContainer.innerHTML = `
                <label for="studentSelect" class="form-label">Chọn sinh viên</label>
                <select class="form-select" id="studentSelect" required>
                    <option value="">-- Chọn sinh viên --</option>
                    <option value="1">Nguyễn Văn A - SV001</option>
                    <option value="2">Trần Thị B - SV002</option>
                    <option value="3">Lê Văn C - SV003</option>
                </select>
            `;
        }
    }

    /**
     * Preview notification before sending
     */
    function previewNotification() {
        if (!previewTitle || !previewType || !previewContent || !previewDate) return;

        previewTitle.textContent = notificationTitle.value || 'Tiêu đề thông báo';
        
        const typeValue = notificationType.value || 'general';
        previewType.textContent = getNotificationTypeLabel(typeValue);
        previewType.className = `badge bg-${getTypeColor(typeValue)}`;
        
        previewContent.textContent = notificationContent.value || 'Nội dung thông báo sẽ hiển thị ở đây...';
        
        const dateValue = sendTime.value === 'scheduled' && scheduledTime.value 
            ? new Date(scheduledTime.value) 
            : new Date();
        previewDate.textContent = `Ngày gửi: ${formatDate(dateValue)}`;
    }

    /**
     * Load notification statistics
     */
    function loadNotificationStats() {
        const token = getAuthToken();
        
        // This would typically be a dedicated API endpoint
        // For now, just fetch all notifications and count
        fetch('/api/notifications?pageSize=1000', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load notification stats');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.items) {
                // Update notification stats in UI
                if (totalNotificationsElement) {
                    totalNotificationsElement.textContent = data.items.length;
                }
                
                if (readNotificationsElement) {
                    const readCount = data.items.filter(n => n.isRead).length;
                    readNotificationsElement.textContent = readCount;
                }
                
                // Update chart
                updateChart(data.items);
            }
        })
        .catch(error => {
            console.error('Error loading notification stats:', error);
            
            // For demo, use sample data
            if (totalNotificationsElement) {
                totalNotificationsElement.textContent = '12';
            }
            
            if (readNotificationsElement) {
                readNotificationsElement.textContent = '5';
            }
            
            // Update chart with sample data
            updateChart([
                { notificationType: 'payment', isRead: true },
                { notificationType: 'payment', isRead: false },
                { notificationType: 'payment', isRead: false },
                { notificationType: 'deadline', isRead: true },
                { notificationType: 'deadline', isRead: false },
                { notificationType: 'important', isRead: true },
                { notificationType: 'important', isRead: false },
                { notificationType: 'general', isRead: true },
                { notificationType: 'general', isRead: true },
                { notificationType: 'general', isRead: false },
                { notificationType: 'payment', isRead: false },
                { notificationType: 'important', isRead: false }
            ]);
        });
    }

    /**
     * Load notification list
     */
    function loadNotifications(page = 1) {
        // Show loading state
        if (notificationHistory) {
            notificationHistory.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Đang tải dữ liệu...</p>
                    </td>
                </tr>
            `;
        }
        
        const token = getAuthToken();
        
        // Construct URL with query parameters
        let url = `/api/notifications?page=${page}&pageSize=${pageSize}`;
        
        if (typeFilter && typeFilter.value) {
            url += `&type=${typeFilter.value}`;
        }
        
        if (searchNotification && searchNotification.value) {
            url += `&search=${encodeURIComponent(searchNotification.value)}`;
        }
        
        // Fetch notifications
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }
            return response.json();
        })
        .then(data => {
            notifications = data.items || [];
            currentPage = data.currentPage || 1;
            totalPages = data.totalPages || 1;
            totalNotifications = data.totalCount || 0;
            
            renderNotifications();
            renderPagination();
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            
            // For demo purposes, use sample data
            createSampleData();
            renderNotifications();
            renderPagination();
        });
    }

    /**
     * Create sample notification data
     */
    function createSampleData() {
        notifications = [
            {
                notificationId: 1,
                userId: 1,
                userName: 'Nguyễn Văn A',
                title: 'Nhắc nhở thanh toán học phí kỳ 1',
                message: 'Bạn còn khoản học phí chưa thanh toán: 8,500,000 VNĐ. Hạn thanh toán: 15/09/2023. Vui lòng thanh toán đúng hạn.',
                notificationType: 'payment',
                sentDate: '2023-09-01T09:30:00',
                isRead: false
            },
            {
                notificationId: 2,
                userId: 2,
                userName: 'Trần Thị B',
                title: 'Nhắc nhở thanh toán học phí kỳ 1',
                message: 'Bạn còn khoản học phí chưa thanh toán: 9,200,000 VNĐ. Hạn thanh toán: 15/09/2023. Vui lòng thanh toán đúng hạn.',
                notificationType: 'payment',
                sentDate: '2023-09-01T09:35:00',
                isRead: true
            },
            {
                notificationId: 3,
                userId: 3,
                userName: 'Lê Văn C',
                title: 'Nhắc nhở thanh toán học phí kỳ 1',
                message: 'Bạn còn khoản học phí chưa thanh toán: 7,800,000 VNĐ. Hạn thanh toán: 15/09/2023. Vui lòng thanh toán đúng hạn.',
                notificationType: 'payment',
                sentDate: '2023-09-01T09:40:00',
                isRead: false
            },
            {
                notificationId: 4,
                userId: 4,
                userName: 'Phạm Thị D',
                title: 'Thông báo học phí học kỳ 2',
                message: 'Học phí học kỳ 2 năm học 2023-2024 đã được cập nhật. Vui lòng kiểm tra và thanh toán trước ngày 15/01/2024.',
                notificationType: 'deadline',
                sentDate: '2023-12-15T14:00:00',
                isRead: false
            },
            {
                notificationId: 5,
                userId: 5,
                userName: 'Hoàng Văn E',
                title: 'Thông báo học phí học kỳ 2',
                message: 'Học phí học kỳ 2 năm học 2023-2024 đã được cập nhật. Vui lòng kiểm tra và thanh toán trước ngày 15/01/2024.',
                notificationType: 'deadline',
                sentDate: '2023-12-15T14:05:00',
                isRead: true
            }
        ];
        
        currentPage = 1;
        totalPages = 1;
        totalNotifications = notifications.length;
    }

    /**
     * Render notifications to the table
     */
    function renderNotifications() {
        if (!notificationHistory) return;
        
        // Clear existing rows
        notificationHistory.innerHTML = '';
        
        // If no notifications, show empty message
        if (!notifications || notifications.length === 0) {
            notificationHistory.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-bell-slash fs-4 my-3"></i>
                        <p>Không có thông báo nào</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Create table rows
        notifications.forEach((notification, index) => {
            const row = document.createElement('tr');
            row.className = notification.isRead ? '' : 'table-light';
            
            // Format date
            const date = new Date(notification.sentDate);
            const formattedDate = formatDate(date);
            
            // Get notification type label
            const typeLabel = getNotificationTypeLabel(notification.notificationType);
            const typeColor = getTypeColor(notification.notificationType);
            
            row.innerHTML = `
                <td>${notification.notificationId}</td>
                <td>${notification.userName || 'Unknown'}</td>
                <td>${notification.title}</td>
                <td><span class="badge bg-${typeColor}">${typeLabel}</span></td>
                <td>${formattedDate}</td>
                <td>${notification.isRead ? 
                    '<span class="badge bg-secondary">Đã đọc</span>' : 
                    '<span class="badge bg-success">Chưa đọc</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-btn" data-id="${notification.notificationId}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${notification.notificationId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners to buttons
            const viewBtn = row.querySelector('.view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    viewNotification(notification);
                });
            }
            
            const deleteBtn = row.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    deleteNotification(notification.notificationId);
                });
            }
            
            notificationHistory.appendChild(row);
        });
    }

    /**
     * Render pagination buttons
     */
    function renderPagination() {
        if (!paginationContainer) return;
        
        // Clear existing buttons
        paginationContainer.innerHTML = '';
        
        // If only one page, hide pagination
        if (totalPages <= 1) {
            return;
        }
        
        // Create pagination list
        const paginationList = document.createElement('ul');
        paginationList.className = 'pagination justify-content-center';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <button class="page-link" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        prevLi.addEventListener('click', () => {
            if (currentPage > 1) {
                loadNotifications(currentPage - 1);
            }
        });
        paginationList.appendChild(prevLi);
        
        // Page buttons
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<button class="page-link">${i}</button>`;
            li.addEventListener('click', () => {
                if (i !== currentPage) {
                    loadNotifications(i);
                }
            });
            paginationList.appendChild(li);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <button class="page-link" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        nextLi.addEventListener('click', () => {
            if (currentPage < totalPages) {
                loadNotifications(currentPage + 1);
            }
        });
        paginationList.appendChild(nextLi);
        
        paginationContainer.appendChild(paginationList);
    }

    /**
     * View notification details
     * @param {Object} notification - Notification object
     */
    function viewNotification(notification) {
        // Create a modal to show notification details
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'viewNotificationModal';
        modal.tabIndex = '-1';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Chi tiết thông báo</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="fw-bold">ID:</label>
                            <span>${notification.notificationId}</span>
                        </div>
                        <div class="mb-3">
                            <label class="fw-bold">Người nhận:</label>
                            <span>${notification.userName || 'Unknown'}</span>
                        </div>
                        <div class="mb-3">
                            <label class="fw-bold">Tiêu đề:</label>
                            <span>${notification.title}</span>
                        </div>
                        <div class="mb-3">
                            <label class="fw-bold">Loại thông báo:</label>
                            <span class="badge bg-${getTypeColor(notification.notificationType)}">${getNotificationTypeLabel(notification.notificationType)}</span>
                        </div>
                        <div class="mb-3">
                            <label class="fw-bold">Ngày gửi:</label>
                            <span>${formatDate(new Date(notification.sentDate))}</span>
                        </div>
                        <div class="mb-3">
                            <label class="fw-bold">Trạng thái:</label>
                            <span class="badge ${notification.isRead ? 'bg-secondary' : 'bg-success'}">${notification.isRead ? 'Đã đọc' : 'Chưa đọc'}</span>
                        </div>
                        <div class="mb-3">
                            <label class="fw-bold">Nội dung:</label>
                            <div class="border rounded p-3 mt-2">${notification.message}</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        // Remove modal from DOM when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    /**
     * Delete notification
     * @param {number} id - Notification ID
     */
    function deleteNotification(id) {
        // Confirm delete
        if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
            return;
        }
        
        const token = getAuthToken();
        
        // In a real app, you would have a delete endpoint
        // For demo, just remove from local array
        notifications = notifications.filter(n => n.notificationId !== id);
        renderNotifications();
        
        showToast('Đã xóa thông báo', 'success');
    }

    /**
     * Load user information
     */
    function loadUserInfo() {
        const token = getAuthToken();
        
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // You would typically fetch this from an API
        if (userNameElement) {
            userNameElement.textContent = 'Quản trị viên';
        }
    }

    /**
     * Load semesters for dropdown
     */
    function loadSemesters() {
        const token = getAuthToken();
        
        // Fetch semesters from API (this endpoint would exist in a real app)
        fetch('/api/semesters', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load semesters');
            }
            return response.json();
        })
        .then(data => {
            semesters = data || [];
            populateSemesterDropdown();
        })
        .catch(error => {
            console.error('Error loading semesters:', error);
            
            // For demo purposes, create sample data
            semesters = [
                { semesterId: 1, semesterName: 'Học kỳ 1 - 2023/2024' },
                { semesterId: 2, semesterName: 'Học kỳ 2 - 2023/2024' },
                { semesterId: 3, semesterName: 'Học kỳ Hè - 2023/2024' }
            ];
            populateSemesterDropdown();
        });
    }

    /**
     * Populate semester dropdown
     */
    function populateSemesterDropdown() {
        if (!reminderSemesterSelect || !semesters) return;
        
        // Clear existing options
        reminderSemesterSelect.innerHTML = '<option value="">-- Chọn học kỳ --</option>';
        
        // Add semester options
        semesters.forEach(semester => {
            const option = document.createElement('option');
            option.value = semester.semesterId;
            option.textContent = semester.semesterName;
            reminderSemesterSelect.appendChild(option);
        });
    }

    /**
     * Initialize notification type chart
     */
    function initializeChart() {
        const ctx = document.getElementById('notificationTypeChart');
        if (!ctx) return;
        
        window.notificationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Thanh toán', 'Thời hạn', 'Quan trọng', 'Chung'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#4361EE',
                        '#F72585',
                        '#4CC9F0',
                        '#3A0CA3'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12
                        }
                    }
                }
            }
        });
    }

    /**
     * Update notification type chart
     * @param {Array} notifications - Notification data
     */
    function updateChart(notifications) {
        if (!window.notificationChart) return;
        
        // Count notifications by type
        const typeCount = {
            payment: 0,
            deadline: 0,
            important: 0,
            general: 0
        };
        
        notifications.forEach(notification => {
            if (typeCount[notification.notificationType] !== undefined) {
                typeCount[notification.notificationType]++;
            } else {
                typeCount.general++;
            }
        });
        
        // Update chart data
        window.notificationChart.data.datasets[0].data = [
            typeCount.payment,
            typeCount.deadline,
            typeCount.important,
            typeCount.general
        ];
        
        window.notificationChart.update();
    }

    /**
     * Format date as DD/MM/YYYY HH:MM
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    function formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    /**
     * Get notification type label
     * @param {string} type - Notification type
     * @returns {string} Type label
     */
    function getNotificationTypeLabel(type) {
        switch (type) {
            case 'payment':
                return 'Thanh toán';
            case 'deadline':
                return 'Thời hạn';
            case 'important':
                return 'Quan trọng';
            case 'general':
                return 'Chung';
            default:
                return 'Chung';
        }
    }

    /**
     * Get notification type color
     * @param {string} type - Notification type
     * @returns {string} Bootstrap color class
     */
    function getTypeColor(type) {
        switch (type) {
            case 'payment':
                return 'primary';
            case 'deadline':
                return 'warning';
            case 'important':
                return 'danger';
            case 'general':
                return 'info';
            default:
                return 'secondary';
        }
    }

    /**
     * Handle logout
     */
    function handleLogout() {
        logout();
    }
}); 