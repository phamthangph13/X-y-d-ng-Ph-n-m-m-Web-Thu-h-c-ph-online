import { checkAuth, getAuthToken, logout } from './utils/auth.js';
import { showToast } from './utils/toast.js';

// Check if user is authenticated
checkAuth();

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let notifications = [];
    let currentPage = 1;
    const perPage = 10;
    let filteredNotifications = [];
    
    // DOM Elements
    const userNameElement = document.getElementById('userName');
    const notificationTypeFilter = document.getElementById('notificationType');
    const readStatusFilter = document.getElementById('readStatus');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const notificationTableBody = document.getElementById('notificationTableBody');
    const modal = document.getElementById('notificationDetailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalType = document.getElementById('modalType');
    const modalDate = document.getElementById('modalDate');
    const markAsReadBtn = document.getElementById('markAsReadBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Load user info
    loadUserInfo();
    
    // Load notifications
    loadNotifications();
    
    // Event Listeners
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilters);
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetFilters);
    if (markAllReadBtn) markAllReadBtn.addEventListener('click', markAllAsRead);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Close modal events
    document.querySelectorAll('.close-modal, .close-btn').forEach(element => {
        element.addEventListener('click', () => {
            closeModal();
        });
    });
    
    // Mark as read
    if (markAsReadBtn) {
        markAsReadBtn.addEventListener('click', () => {
            const notificationId = markAsReadBtn.dataset.notificationId;
            if (notificationId) {
                markAsRead(notificationId);
            }
        });
    }
    
    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContainer.classList.toggle('expanded');
        });
    }
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
    
    // Pagination event delegation
    document.querySelector('.pagination-container').addEventListener('click', (event) => {
        const button = event.target.closest('.pagination-btn');
        if (!button || button.disabled) return;
        
        const page = button.dataset.page;
        
        if (page === 'prev') {
            if (currentPage > 1) {
                currentPage--;
                renderPagination();
                renderNotifications();
            }
        } else if (page === 'next') {
            const totalPages = Math.ceil(filteredNotifications.length / perPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPagination();
                renderNotifications();
            }
        } else {
            currentPage = parseInt(page);
            renderPagination();
            renderNotifications();
        }
    });
    
    /**
     * Load user information from the server
     */
    function loadUserInfo() {
        const token = getAuthToken();
        
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // You would typically fetch this from an API
        fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load user info');
            }
            return response.json();
        })
        .then(data => {
            // Update user info in UI
            if (userNameElement) {
                userNameElement.textContent = data.fullName || 'Sinh viên';
            }
        })
        .catch(error => {
            console.error('Error loading user info:', error);
            // For demo purposes, set a default name
            if (userNameElement) {
                userNameElement.textContent = 'Sinh viên Demo';
            }
        });
    }
    
    /**
     * Load notifications from the server
     */
    function loadNotifications() {
        // Display loading state
        showLoadingState();
        
        const token = getAuthToken();
        
        // You would typically fetch this from an API
        fetch('/api/notifications', {
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
            // Store the notifications
            notifications = data;
            filteredNotifications = [...notifications];
            
            // Render notifications
            renderNotifications();
            renderPagination();
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            
            // For demo purposes, create sample data
            createSampleData();
            
            // Render notifications with sample data
            renderNotifications();
            renderPagination();
        });
    }
    
    /**
     * Create sample data for demonstration purposes
     */
    function createSampleData() {
        notifications = [
            {
                notificationId: 1,
                title: 'Thanh toán học phí học kỳ 1',
                message: 'Bạn đã thanh toán thành công học phí học kỳ 1 năm học 2023-2024. Số tiền: 8,500,000 VNĐ',
                notificationType: 'payment',
                sentDate: '2023-08-15T09:30:00',
                isRead: true
            },
            {
                notificationId: 2,
                title: 'Hạn thanh toán học phí học kỳ 2',
                message: 'Nhà trường thông báo hạn cuối đóng học phí học kỳ 2 năm học 2023-2024 là ngày 15/01/2024. Vui lòng thanh toán đúng hạn để tránh ảnh hưởng đến việc học.',
                notificationType: 'deadline',
                sentDate: '2023-12-20T10:15:00',
                isRead: false
            },
            {
                notificationId: 3,
                title: 'Thông báo lịch thi học kỳ 1',
                message: 'Lịch thi học kỳ 1 năm học 2023-2024 đã được công bố. Vui lòng kiểm tra lịch thi trên cổng thông tin của trường.',
                notificationType: 'important',
                sentDate: '2023-11-10T14:20:00',
                isRead: true
            },
            {
                notificationId: 4,
                title: 'Thông báo nghỉ lễ 30/4 và 1/5',
                message: 'Trường thông báo lịch nghỉ lễ 30/4 và 1/5 như sau: Nghỉ từ ngày 30/4/2024 đến hết ngày 1/5/2024. Sinh viên vui lòng sắp xếp lịch học và công việc cá nhân phù hợp.',
                notificationType: 'general',
                sentDate: '2024-04-25T08:00:00',
                isRead: false
            },
            {
                notificationId: 5,
                title: 'Nhắc nhở thanh toán học phí còn nợ',
                message: 'Bạn còn khoản học phí chưa thanh toán từ kỳ trước. Vui lòng thanh toán trước ngày 30/11/2023 để tránh bị phạt và ảnh hưởng đến việc đăng ký môn học cho kỳ tiếp theo.',
                notificationType: 'payment',
                sentDate: '2023-11-15T09:00:00',
                isRead: false
            },
            {
                notificationId: 6,
                title: 'Kết quả xét học bổng học kỳ 1',
                message: 'Kết quả xét học bổng học kỳ 1 năm học 2023-2024 đã được công bố. Vui lòng kiểm tra kết quả trên cổng thông tin của trường.',
                notificationType: 'general',
                sentDate: '2023-10-05T16:30:00',
                isRead: true
            },
            {
                notificationId: 7,
                title: 'Thông báo đăng ký môn học học kỳ 2',
                message: 'Thời gian đăng ký môn học học kỳ 2 năm học 2023-2024 bắt đầu từ ngày 01/12/2023 đến hết ngày 15/12/2023. Sinh viên vui lòng đăng ký môn học đúng thời hạn.',
                notificationType: 'important',
                sentDate: '2023-11-25T11:45:00',
                isRead: false
            },
            {
                notificationId: 8,
                title: 'Thông báo về việc cấp giấy chứng nhận sinh viên',
                message: 'Sinh viên có nhu cầu xin giấy chứng nhận sinh viên vui lòng đăng ký trực tuyến qua cổng thông tin hoặc liên hệ trực tiếp phòng Đào tạo.',
                notificationType: 'general',
                sentDate: '2023-09-10T14:00:00',
                isRead: true
            },
            {
                notificationId: 9,
                title: 'Thông báo kiểm tra giữa kỳ',
                message: 'Lịch kiểm tra giữa kỳ học kỳ 1 năm học 2023-2024 đã được công bố. Vui lòng kiểm tra lịch thi trên cổng thông tin của trường.',
                notificationType: 'deadline',
                sentDate: '2023-09-25T13:20:00',
                isRead: false
            },
            {
                notificationId: 10,
                title: 'Chương trình học bổng đặc biệt',
                message: 'Trường thông báo chương trình học bổng đặc biệt dành cho sinh viên có thành tích xuất sắc. Hạn nộp hồ sơ: 30/10/2023.',
                notificationType: 'important',
                sentDate: '2023-10-01T10:00:00',
                isRead: true
            },
            {
                notificationId: 11,
                title: 'Thông báo về việc cài đặt phần mềm học trực tuyến',
                message: 'Để chuẩn bị cho kế hoạch học trực tuyến, sinh viên vui lòng cài đặt các phần mềm cần thiết theo hướng dẫn đính kèm.',
                notificationType: 'general',
                sentDate: '2023-08-20T09:10:00',
                isRead: true
            },
            {
                notificationId: 12,
                title: 'Giảm 10% học phí cho sinh viên đóng sớm',
                message: 'Trường thông báo chương trình giảm 10% học phí cho sinh viên đóng học phí trước ngày 01/01/2024.',
                notificationType: 'payment',
                sentDate: '2023-12-01T11:30:00',
                isRead: false
            }
        ];
        
        filteredNotifications = [...notifications];
    }
    
    /**
     * Render notifications to the table
     */
    function renderNotifications() {
        if (!notificationTableBody) return;
        
        // Clear the table body
        notificationTableBody.innerHTML = '';
        
        // Calculate start and end indices
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const displayedNotifications = filteredNotifications.slice(startIndex, endIndex);
        
        // Check if there are no notifications after filtering
        if (displayedNotifications.length === 0) {
            notificationTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="fas fa-bell-slash"></i>
                            <p>Không có thông báo nào phù hợp với bộ lọc!</p>
                            <button class="refresh-btn" onclick="location.reload()">
                                <i class="fas fa-sync-alt"></i> Làm mới
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Render each notification
        displayedNotifications.forEach(notification => {
            const row = document.createElement('tr');
            row.className = notification.isRead ? '' : 'unread';
            row.setAttribute('data-id', notification.notificationId);
            
            // Format date for display
            const date = new Date(notification.sentDate);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            // Get type label
            const typeLabel = getNotificationTypeLabel(notification.notificationType);
            const typeClass = `type-${notification.notificationType}`;
            
            // Get status label
            const statusLabel = notification.isRead ? 'Đã đọc' : 'Chưa đọc';
            const statusClass = notification.isRead ? 'status-read' : 'status-unread';
            
            // Create row content
            row.innerHTML = `
                <td data-label="#">${notification.notificationId}</td>
                <td data-label="Tiêu đề">${notification.title}</td>
                <td data-label="Nội dung" class="notification-message">${notification.message}</td>
                <td data-label="Loại thông báo"><span class="notification-type ${typeClass}">${typeLabel}</span></td>
                <td data-label="Ngày gửi">${formattedDate}</td>
                <td data-label="Trạng thái"><span class="notification-status ${statusClass}">${statusLabel}</span></td>
            `;
            
            // Add click event to open notification detail
            row.addEventListener('click', () => {
                openNotificationDetail(notification);
            });
            
            // Add the row to the table
            notificationTableBody.appendChild(row);
        });
    }
    
    /**
     * Render pagination controls
     */
    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (!paginationContainer) return;
        
        // Calculate total pages
        const totalPages = Math.ceil(filteredNotifications.length / perPage);
        
        // Clear pagination
        paginationContainer.innerHTML = '';
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.dataset.page = 'prev';
        prevButton.disabled = currentPage <= 1;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        paginationContainer.appendChild(prevButton);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4 && totalPages > 5) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn${i === currentPage ? ' active' : ''}`;
            pageButton.dataset.page = i;
            pageButton.textContent = i;
            paginationContainer.appendChild(pageButton);
        }
        
        // Ellipsis
        if (endPage < totalPages) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
            
            // Last page
            const lastPageButton = document.createElement('button');
            lastPageButton.className = 'pagination-btn';
            lastPageButton.dataset.page = totalPages;
            lastPageButton.textContent = totalPages;
            paginationContainer.appendChild(lastPageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.dataset.page = 'next';
        nextButton.disabled = currentPage >= totalPages;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        paginationContainer.appendChild(nextButton);
    }
    
    /**
     * Show loading state while fetching data
     */
    function showLoadingState() {
        if (!notificationTableBody) return;
        
        notificationTableBody.innerHTML = '';
        
        // Create 5 loading rows
        for (let i = 0; i < 5; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div class="loading-placeholder" style="width: 30px;"></div></td>
                <td><div class="loading-placeholder" style="width: 80%;"></div></td>
                <td><div class="loading-placeholder" style="width: 90%;"></div></td>
                <td><div class="loading-placeholder" style="width: 60%;"></div></td>
                <td><div class="loading-placeholder" style="width: 70%;"></div></td>
                <td><div class="loading-placeholder" style="width: 50%;"></div></td>
            `;
            notificationTableBody.appendChild(row);
        }
    }
    
    /**
     * Apply filters to the notifications
     */
    function applyFilters() {
        const typeFilter = notificationTypeFilter.value;
        const statusFilter = readStatusFilter.value;
        
        // Apply filters
        filteredNotifications = notifications.filter(notification => {
            let matchesType = true;
            let matchesStatus = true;
            
            if (typeFilter) {
                matchesType = notification.notificationType === typeFilter;
            }
            
            if (statusFilter) {
                matchesStatus = (statusFilter === 'read' && notification.isRead) || 
                               (statusFilter === 'unread' && !notification.isRead);
            }
            
            return matchesType && matchesStatus;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Render the filtered notifications
        renderNotifications();
        renderPagination();
    }
    
    /**
     * Reset all filters
     */
    function resetFilters() {
        // Reset filter dropdowns
        notificationTypeFilter.value = '';
        readStatusFilter.value = '';
        
        // Reset filtered data
        filteredNotifications = [...notifications];
        
        // Reset to first page
        currentPage = 1;
        
        // Render notifications
        renderNotifications();
        renderPagination();
    }
    
    /**
     * Open notification detail modal
     */
    function openNotificationDetail(notification) {
        // Populate modal content
        modalTitle.textContent = notification.title;
        modalMessage.textContent = notification.message;
        modalType.textContent = getNotificationTypeLabel(notification.notificationType);
        
        // Format date
        const date = new Date(notification.sentDate);
        modalDate.textContent = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        // Set notification ID for mark as read button
        markAsReadBtn.dataset.notificationId = notification.notificationId;
        
        // Show/hide mark as read button based on current status
        markAsReadBtn.style.display = notification.isRead ? 'none' : 'flex';
        
        // Open modal
        modal.classList.add('show');
        
        // If notification is unread, mark it as read
        if (!notification.isRead) {
            markAsRead(notification.notificationId, false);
        }
    }
    
    /**
     * Close notification detail modal
     */
    function closeModal() {
        modal.classList.remove('show');
    }
    
    /**
     * Mark notification as read
     */
    function markAsRead(notificationId, showToastMessage = true) {
        const token = getAuthToken();
        
        // In a real app, you would make an API call
        // For demo purposes, update locally
        const notification = notifications.find(n => n.notificationId == notificationId);
        if (notification) {
            notification.isRead = true;
            
            // Update the filtered array as well
            const filteredNotification = filteredNotifications.find(n => n.notificationId == notificationId);
            if (filteredNotification) {
                filteredNotification.isRead = true;
            }
            
            // Update UI
            renderNotifications();
            
            // Hide the mark as read button in modal
            markAsReadBtn.style.display = 'none';
            
            // Show success message
            if (showToastMessage) {
                showToast('success', 'Đã đánh dấu thông báo là đã đọc!');
            }
        }
    }
    
    /**
     * Mark all notifications as read
     */
    function markAllAsRead() {
        const token = getAuthToken();
        
        // In a real app, you would make an API call
        // For demo purposes, update locally
        notifications.forEach(notification => {
            notification.isRead = true;
        });
        
        // Update filtered notifications
        filteredNotifications.forEach(notification => {
            notification.isRead = true;
        });
        
        // Update UI
        renderNotifications();
        
        // Show success message
        showToast('success', 'Đã đánh dấu tất cả thông báo là đã đọc!');
    }
    
    /**
     * Get notification type label for display
     */
    function getNotificationTypeLabel(type) {
        switch (type) {
            case 'general':
                return 'Thông báo chung';
            case 'payment':
                return 'Thanh toán';
            case 'deadline':
                return 'Thời hạn';
            case 'important':
                return 'Quan trọng';
            default:
                return 'Khác';
        }
    }
    
    /**
     * Handle logout
     */
    function handleLogout() {
        logout();
        window.location.href = 'login.html';
    }
}); 