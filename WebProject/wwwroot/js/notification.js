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
        
        // Get filter values if any
        const type = notificationTypeFilter?.value || '';
        const isRead = readStatusFilter?.value 
            ? readStatusFilter.value === 'read' 
            : null;
        
        // Construct URL with query parameters
        let url = '/api/notifications?';
        if (type) url += `type=${type}&`;
        if (isRead !== null) url += `isRead=${isRead}&`;
        url += `page=1&pageSize=${perPage}`;
        
        // Fetch notifications from API
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
            // Store the notifications
            if (data && data.items) {
                notifications = data.items;
                filteredNotifications = [...notifications];
                currentPage = data.currentPage || 1;
                
                // Set pagination data
                if (data.totalPages) {
                    renderPaginationWithTotalPages(data.totalPages, data.currentPage);
                } else {
                    renderPagination();
                }
            } else {
                notifications = [];
                filteredNotifications = [];
                renderPagination();
            }
            
            // Render notifications
            renderNotifications();
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            
            // For demo purposes, create sample data if API fails
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
                sentDate: '2023-09-18T10:10:00',
                isRead: true
            },
            {
                notificationId: 9,
                title: 'Thông báo về thời khóa biểu học kỳ 2',
                message: 'Thời khóa biểu học kỳ 2 năm học 2023-2024 đã được cập nhật trên cổng thông tin. Sinh viên vui lòng kiểm tra và sắp xếp lịch học phù hợp.',
                notificationType: 'deadline',
                sentDate: '2023-12-28T14:00:00',
                isRead: false
            },
            {
                notificationId: 10,
                title: 'Thông báo về đăng ký khóa luận tốt nghiệp',
                message: 'Sinh viên năm cuối cần đăng ký khóa luận tốt nghiệp trước ngày 20/02/2024. Vui lòng liên hệ giáo viên hướng dẫn và nộp đề cương nghiên cứu.',
                notificationType: 'important',
                sentDate: '2024-01-15T09:00:00',
                isRead: false
            },
            {
                notificationId: 11,
                title: 'Thông báo nghỉ Tết Nguyên đán 2024',
                message: 'Trường thông báo lịch nghỉ Tết Nguyên đán từ ngày 08/02/2024 đến hết ngày 18/02/2024. Chúc sinh viên và gia đình năm mới an khang, thịnh vượng.',
                notificationType: 'general',
                sentDate: '2024-01-25T11:30:00',
                isRead: true
            },
            {
                notificationId: 12,
                title: 'Cập nhật thông tin thanh toán học phí kỳ 2',
                message: 'Nhà trường đã cập nhật thông tin học phí học kỳ 2 năm học 2023-2024. Sinh viên vui lòng đăng nhập vào cổng thông tin để kiểm tra chi tiết học phí và thực hiện thanh toán.',
                notificationType: 'payment',
                sentDate: '2023-12-10T08:45:00',
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
        
        // Clear existing rows
        notificationTableBody.innerHTML = '';
        
        // If no notifications, show empty message
        if (filteredNotifications.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center">
                    <i class="fas fa-bell-slash"></i>
                    <p>Không có thông báo nào</p>
                </td>
            `;
            notificationTableBody.appendChild(emptyRow);
            return;
        }
        
        // Calculate start and end index for current page
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, filteredNotifications.length);
        
        // Create table rows for current page
        for (let i = startIndex; i < endIndex; i++) {
            const notification = filteredNotifications[i];
            const row = document.createElement('tr');
            row.className = notification.isRead ? '' : 'unread';
            row.setAttribute('data-id', notification.notificationId);
            
            // Format date
            const date = new Date(notification.sentDate);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            // Get notification type label
            const typeLabel = getNotificationTypeLabel(notification.notificationType);
            
            row.innerHTML = `
                <td>${i + 1}</td>
                <td class="title">${notification.title}</td>
                <td class="message">${notification.message.length > 100 ? notification.message.substring(0, 100) + '...' : notification.message}</td>
                <td><span class="type-badge ${notification.notificationType}">${typeLabel}</span></td>
                <td>${formattedDate}</td>
                <td>${notification.isRead ? '<span class="status-badge read">Đã đọc</span>' : '<span class="status-badge unread">Chưa đọc</span>'}</td>
            `;
            
            // Add click event to open detail modal
            row.addEventListener('click', () => {
                openNotificationDetail(notification);
            });
            
            notificationTableBody.appendChild(row);
        }
    }
    
    /**
     * Render pagination buttons
     */
    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(filteredNotifications.length / perPage);
        renderPaginationWithTotalPages(totalPages, currentPage);
    }
    
    /**
     * Render pagination with server-side total pages
     */
    function renderPaginationWithTotalPages(totalPages, currentPageNumber) {
        const paginationContainer = document.querySelector('.pagination-container');
        if (!paginationContainer) return;
        
        // Clear existing buttons
        paginationContainer.innerHTML = '';
        
        // If no pages, hide pagination
        if (totalPages === 0) {
            paginationContainer.style.display = 'none';
            return;
        } else {
            paginationContainer.style.display = 'flex';
        }
        
        // Create previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.setAttribute('data-page', 'prev');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPageNumber <= 1;
        paginationContainer.appendChild(prevBtn);
        
        // If less than 5 pages, show all
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `pagination-btn ${i === currentPageNumber ? 'active' : ''}`;
                pageBtn.setAttribute('data-page', i);
                pageBtn.textContent = i;
                paginationContainer.appendChild(pageBtn);
            }
        } else {
            // Show first page, current page and neighbors, and last page
            const pagesToShow = new Set();
            pagesToShow.add(1); // First page
            pagesToShow.add(totalPages); // Last page
            
            // Current page and neighbors
            for (let i = Math.max(2, currentPageNumber - 1); i <= Math.min(totalPages - 1, currentPageNumber + 1); i++) {
                pagesToShow.add(i);
            }
            
            // Add ellipsis if needed
            const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
            
            for (let i = 0; i < sortedPages.length; i++) {
                // If there's a gap, add ellipsis
                if (i > 0 && sortedPages[i] - sortedPages[i - 1] > 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'pagination-ellipsis';
                    ellipsis.textContent = '...';
                    paginationContainer.appendChild(ellipsis);
                }
                
                // Add the page button
                const pageBtn = document.createElement('button');
                pageBtn.className = `pagination-btn ${sortedPages[i] === currentPageNumber ? 'active' : ''}`;
                pageBtn.setAttribute('data-page', sortedPages[i]);
                pageBtn.textContent = sortedPages[i];
                paginationContainer.appendChild(pageBtn);
            }
        }
        
        // Create next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.setAttribute('data-page', 'next');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPageNumber >= totalPages;
        paginationContainer.appendChild(nextBtn);
    }
    
    /**
     * Show loading state while fetching data
     */
    function showLoadingState() {
        if (!notificationTableBody) return;
        
        notificationTableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6" class="text-center">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang tải thông báo...</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * Apply filters to the notifications
     */
    function applyFilters() {
        const typeValue = notificationTypeFilter ? notificationTypeFilter.value : '';
        const readValue = readStatusFilter ? readStatusFilter.value : '';
        
        // Reload from API with filters
        const token = getAuthToken();
        
        // Construct URL with query parameters
        let url = '/api/notifications?';
        if (typeValue) url += `type=${typeValue}&`;
        if (readValue) {
            const isRead = readValue === 'read' ? true : readValue === 'unread' ? false : null;
            if (isRead !== null) url += `isRead=${isRead}&`;
        }
        url += `page=1&pageSize=${perPage}`;
        
        // Show loading state
        showLoadingState();
        
        // Fetch filtered notifications
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to apply filters');
            }
            return response.json();
        })
        .then(data => {
            // Update notifications
            if (data && data.items) {
                notifications = data.items;
                filteredNotifications = [...notifications];
                currentPage = 1;
                
                // Render with updated data
                renderNotifications();
                renderPaginationWithTotalPages(data.totalPages, 1);
            }
        })
        .catch(error => {
            console.error('Error applying filters:', error);
            
            // Fallback to client-side filtering for demo
            filteredNotifications = notifications.filter(notification => {
                const typeMatch = !typeValue || notification.notificationType === typeValue;
                let readMatch = true;
                if (readValue === 'read') readMatch = notification.isRead;
                if (readValue === 'unread') readMatch = !notification.isRead;
                return typeMatch && readMatch;
            });
            
            currentPage = 1;
            renderNotifications();
            renderPagination();
        });
    }
    
    /**
     * Reset all filters
     */
    function resetFilters() {
        if (notificationTypeFilter) notificationTypeFilter.value = '';
        if (readStatusFilter) readStatusFilter.value = '';
        
        // Reload notifications without filters
        loadNotifications();
    }
    
    /**
     * Open notification detail modal
     */
    function openNotificationDetail(notification) {
        if (!modal || !modalTitle || !modalMessage || !modalType || !modalDate || !markAsReadBtn) return;
        
        // Set modal content
        modalTitle.textContent = notification.title;
        modalMessage.textContent = notification.message;
        modalType.textContent = getNotificationTypeLabel(notification.notificationType);
        
        // Format date
        const date = new Date(notification.sentDate);
        modalDate.textContent = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        // Set notification ID for mark as read button
        markAsReadBtn.dataset.notificationId = notification.notificationId;
        
        // Hide mark as read button if already read
        markAsReadBtn.style.display = notification.isRead ? 'none' : 'block';
        
        // Show modal
        modal.style.display = 'flex';
        
        // If not read, mark as read automatically when opened
        if (!notification.isRead) {
            markAsRead(notification.notificationId, false); // Don't show toast message
        }
    }
    
    /**
     * Close notification detail modal
     */
    function closeModal() {
        if (!modal) return;
        modal.style.display = 'none';
    }
    
    /**
     * Mark notification as read
     */
    function markAsRead(notificationId, showToastMessage = true) {
        const token = getAuthToken();
        
        // Send request to API
        fetch(`/api/notifications/${notificationId}/mark-as-read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
            return response.json();
        })
        .then(data => {
            // Update notification in local data
            const notificationIndex = notifications.findIndex(n => n.notificationId === parseInt(notificationId));
            if (notificationIndex >= 0) {
                notifications[notificationIndex].isRead = true;
                filteredNotifications = filteredNotifications.map(n => {
                    if (n.notificationId === parseInt(notificationId)) {
                        return { ...n, isRead: true };
                    }
                    return n;
                });
            }
            
            // Rerender notifications
            renderNotifications();
            
            // Hide mark as read button in modal
            if (markAsReadBtn) markAsReadBtn.style.display = 'none';
            
            // Show success message
            if (showToastMessage) {
                showToast('Đã đánh dấu thông báo như đã đọc', 'success');
            }
        })
        .catch(error => {
            console.error('Error marking notification as read:', error);
            
            // For demo, still update UI even if API fails
            const notificationIndex = notifications.findIndex(n => n.notificationId === parseInt(notificationId));
            if (notificationIndex >= 0) {
                notifications[notificationIndex].isRead = true;
                filteredNotifications = filteredNotifications.map(n => {
                    if (n.notificationId === parseInt(notificationId)) {
                        return { ...n, isRead: true };
                    }
                    return n;
                });
                renderNotifications();
                if (markAsReadBtn) markAsReadBtn.style.display = 'none';
            }
        });
    }
    
    /**
     * Mark all notifications as read
     */
    function markAllAsRead() {
        const token = getAuthToken();
        
        // Send request to API
        fetch('/api/notifications/mark-all-read', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }
            return response.json();
        })
        .then(data => {
            // Update all notifications as read
            notifications = notifications.map(n => ({ ...n, isRead: true }));
            filteredNotifications = filteredNotifications.map(n => ({ ...n, isRead: true }));
            
            // Rerender notifications
            renderNotifications();
            
            // Show success message
            showToast(data.message || 'Tất cả thông báo đã được đánh dấu như đã đọc', 'success');
        })
        .catch(error => {
            console.error('Error marking all notifications as read:', error);
            
            // For demo, still update UI even if API fails
            notifications = notifications.map(n => ({ ...n, isRead: true }));
            filteredNotifications = filteredNotifications.map(n => ({ ...n, isRead: true }));
            renderNotifications();
            
            showToast('Tất cả thông báo đã được đánh dấu như đã đọc', 'success');
        });
    }
    
    /**
     * Get label for notification type
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
     * Handle logout
     */
    function handleLogout() {
        logout();
    }
}); 