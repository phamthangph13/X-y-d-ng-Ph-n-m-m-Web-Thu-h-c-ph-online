import { checkAuth, getUserData, logout } from './utils/auth.js';
import { showToast } from './utils/toast.js';
import { API_ENDPOINTS } from './config.js';

// Kiểm tra xác thực
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Kiểm tra người dùng đã đăng nhập
        if (!checkAuth()) {
            return; // checkAuth will redirect to login page if not authenticated
        }

        // Lấy thông tin người dùng từ localStorage
        const userData = getUserData();
        if (userData) {
            document.getElementById('userName').textContent = `${userData.fullName || 'Admin'}`;
            // Verify this user is admin type
            if (userData.userType !== 'admin' && userData.role !== 'admin') {
                window.location.href = 'index.html'; // Redirect non-admin users
                return;
            }
        }

        // Tải dữ liệu người dùng từ API
        await loadUserProfile();

        // Thiết lập sự kiện đăng xuất
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);

        // Thiết lập sự kiện sidebar toggle
        setupSidebar();

        // Tải dữ liệu tổng quan
        loadDashboardData();

        // Tải hoạt động gần đây
        loadRecentActivities();

    } catch (error) {
        console.error('Lỗi khởi tạo trang:', error);
        showToast('Đã xảy ra lỗi khi tải trang. Vui lòng thử lại sau.', 'error');
    }
});

// Tải thông tin hồ sơ người dùng từ API
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_ENDPOINTS.USERS}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();
        
        if (data.success) {
            // Update profile information in the view
            document.getElementById('userName').textContent = data.fullName;
            
            // Save updated user data to localStorage if needed
            const userData = getUserData() || {};
            const updatedUserData = { ...userData, ...data };
            localStorage.setItem('user_data', JSON.stringify(updatedUserData));
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Could not load user profile information', 'error');
    }
}

// Xử lý đăng xuất
async function handleLogout() {
    try {
        await logout();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        showToast('Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại.', 'error');
    }
}

// Thiết lập sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
            } else {
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
            }
        });
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

// Tải dữ liệu tổng quan
async function loadDashboardData() {
    try {
        // Trong thực tế, bạn sẽ gọi API để lấy dữ liệu
        // Đây là dữ liệu mẫu
        const dashboardData = await fetchDashboardData();
        
        // Cập nhật số liệu trên giao diện
        document.getElementById('totalStudents').textContent = dashboardData.totalStudents;
        document.getElementById('pendingPayments').textContent = dashboardData.pendingPayments;
        document.getElementById('totalCourses').textContent = dashboardData.totalCourses;
        document.getElementById('monthlyRevenue').textContent = formatCurrency(dashboardData.monthlyRevenue);
    } catch (error) {
        console.error('Lỗi tải dữ liệu tổng quan:', error);
        showToast('Không thể tải dữ liệu tổng quan. Vui lòng thử lại sau.', 'error');
    }
}

// Hàm giả lập gọi API lấy dữ liệu tổng quan
async function fetchDashboardData() {
    // Giả lập độ trễ mạng
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trả về dữ liệu mẫu
    return {
        totalStudents: 1254,
        pendingPayments: 28,
        totalCourses: 42,
        monthlyRevenue: 458620000 // 458,620,000 VND
    };
}

// Tải dữ liệu hoạt động gần đây
async function loadRecentActivities() {
    try {
        // Trong thực tế, bạn sẽ gọi API để lấy dữ liệu
        const activities = await fetchRecentActivities();
        
        // Render dữ liệu hoạt động
        renderActivities(activities);
    } catch (error) {
        console.error('Lỗi tải hoạt động gần đây:', error);
        showToast('Không thể tải hoạt động gần đây. Vui lòng thử lại sau.', 'error');
    }
}

// Hàm giả lập gọi API lấy hoạt động gần đây
async function fetchRecentActivities() {
    // Giả lập độ trễ mạng
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Trả về dữ liệu mẫu
    return [
        {
            time: new Date(Date.now() - 15 * 60 * 1000),
            action: 'Thanh toán',
            details: 'SV Nguyễn Văn A đã thanh toán học phí',
            status: 'success'
        },
        {
            time: new Date(Date.now() - 45 * 60 * 1000),
            action: 'Đăng ký',
            details: 'SV Trần Thị B đã đăng ký khóa học mới',
            status: 'success'
        },
        {
            time: new Date(Date.now() - 2 * 60 * 60 * 1000),
            action: 'Thanh toán',
            details: 'SV Lê Văn C đã yêu cầu hủy thanh toán',
            status: 'warning'
        },
        {
            time: new Date(Date.now() - 5 * 60 * 60 * 1000),
            action: 'Hệ thống',
            details: 'Cập nhật thông tin học phí kỳ mới',
            status: 'info'
        },
        {
            time: new Date(Date.now() - 24 * 60 * 60 * 1000),
            action: 'Lỗi',
            details: 'Lỗi kết nối cổng thanh toán',
            status: 'danger'
        }
    ];
}

// Hiển thị hoạt động gần đây
function renderActivities(activities) {
    const tableBody = document.getElementById('recentActivitiesTable');
    tableBody.innerHTML = '';
    
    activities.forEach(activity => {
        const row = document.createElement('tr');
        
        // Cột thời gian
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDateTime(activity.time);
        row.appendChild(timeCell);
        
        // Cột hoạt động
        const actionCell = document.createElement('td');
        actionCell.textContent = activity.action;
        row.appendChild(actionCell);
        
        // Cột chi tiết
        const detailsCell = document.createElement('td');
        detailsCell.textContent = activity.details;
        row.appendChild(detailsCell);
        
        // Cột trạng thái
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge text-bg-${activity.status}`;
        statusBadge.textContent = getStatusText(activity.status);
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);
        
        tableBody.appendChild(row);
    });
}

// Định dạng ngày giờ
function formatDateTime(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(amount);
}

// Lấy text trạng thái
function getStatusText(status) {
    const statusMap = {
        'success': 'Thành công',
        'info': 'Thông tin',
        'warning': 'Cảnh báo',
        'danger': 'Lỗi'
    };
    
    return statusMap[status] || status;
} 