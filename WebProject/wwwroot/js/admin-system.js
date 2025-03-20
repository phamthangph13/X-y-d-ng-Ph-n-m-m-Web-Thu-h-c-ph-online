import { isAuthenticated, getUserData } from './utils/auth.js';
import { showToast } from './utils/toast.js';

// Initialize the system page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize UI components
    initUIComponents();
    
    // Load user data
    loadUserData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadUsers();
    loadDepartments();
    loadSystemSettings();
    loadSystemLogs();
});

// Initialize UI components
function initUIComponents() {
    // Initialize sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.body.classList.toggle('sidebar-collapsed');
            
            // Toggle the icon direction
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-chevron-left')) {
                icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
            } else {
                icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
            }
        });
    }
    
    // Initialize mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            document.body.classList.toggle('sidebar-mobile-open');
        });
    }
    
    // Initialize logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = 'login.html';
        });
    }
    
    // Initialize date range selectors
    const logDateRange = document.getElementById('logDateRange');
    const customDateRange = document.querySelector('.custom-date-range');
    
    if (logDateRange && customDateRange) {
        logDateRange.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateRange.style.display = 'flex';
            } else {
                customDateRange.style.display = 'none';
            }
        });
    }
}

// Load user data
function loadUserData() {
    const userData = getUserData();
    if (userData) {
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = `Xin chào, ${userData.fullName || 'Quản trị viên'}`;
        }
    }
}

// Setup event listeners for various forms and buttons
function setupEventListeners() {
    // Users tab
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', openAddUserModal);
    }
    
    const searchUserBtn = document.getElementById('searchUserBtn');
    if (searchUserBtn) {
        searchUserBtn.addEventListener('click', searchUsers);
    }
    
    const resetUserSearchBtn = document.getElementById('resetUserSearchBtn');
    if (resetUserSearchBtn) {
        resetUserSearchBtn.addEventListener('click', resetUserSearch);
    }
    
    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveUser);
    }
    
    // Role-specific fields in user form
    const userRole = document.getElementById('userRole');
    if (userRole) {
        userRole.addEventListener('change', function() {
            const studentInfoSection = document.getElementById('studentInfoSection');
            if (this.value === 'student') {
                studentInfoSection.style.display = 'flex';
            } else {
                studentInfoSection.style.display = 'none';
            }
        });
    }
    
    // Departments tab
    const addDepartmentBtn = document.getElementById('addDepartmentBtn');
    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', openAddDepartmentModal);
    }
    
    const saveDepartmentBtn = document.getElementById('saveDepartmentBtn');
    if (saveDepartmentBtn) {
        saveDepartmentBtn.addEventListener('click', saveDepartment);
    }
    
    // Settings tab
    const systemSettingsForm = document.getElementById('systemSettingsForm');
    if (systemSettingsForm) {
        systemSettingsForm.addEventListener('submit', saveSystemSettings);
    }
    
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSystemSettings);
    }
    
    // Logs tab
    const searchLogBtn = document.getElementById('searchLogBtn');
    if (searchLogBtn) {
        searchLogBtn.addEventListener('click', searchLogs);
    }
    
    const resetLogBtn = document.getElementById('resetLogBtn');
    if (resetLogBtn) {
        resetLogBtn.addEventListener('click', resetLogSearch);
    }
    
    const exportLogBtn = document.getElementById('exportLogBtn');
    if (exportLogBtn) {
        exportLogBtn.addEventListener('click', exportLogs);
    }
}

// Users tab functions
function loadUsers(searchParams) {
    // This would be replaced with an actual API call
    showToast('Thông báo', 'Đang tải dữ liệu người dùng...', 'info');
    
    // Simulate loading data
    setTimeout(() => {
        const usersTableBody = document.getElementById('usersTableBody');
        if (usersTableBody) {
            // Dummy data for demonstration
            usersTableBody.innerHTML = `
                <tr>
                    <td>1</td>
                    <td>admin@edupay.vn</td>
                    <td>Quản trị viên</td>
                    <td>Admin</td>
                    <td>Phòng đào tạo</td>
                    <td><span class="badge bg-success">Hoạt động</span></td>
                    <td>01/01/2023</td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-edit-user" data-id="1">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn admin-btn-sm admin-btn-danger btn-delete-user" data-id="1">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td>2</td>
                    <td>staff@edupay.vn</td>
                    <td>Nhân viên</td>
                    <td>Staff</td>
                    <td>Phòng đào tạo</td>
                    <td><span class="badge bg-success">Hoạt động</span></td>
                    <td>05/01/2023</td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-edit-user" data-id="2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn admin-btn-sm admin-btn-danger btn-delete-user" data-id="2">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.btn-edit-user').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    openEditUserModal(userId);
                });
            });
            
            document.querySelectorAll('.btn-delete-user').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    confirmDeleteUser(userId);
                });
            });
        }
    }, 500);
}

function searchUsers() {
    const email = document.getElementById('searchUserEmail').value;
    const name = document.getElementById('searchUserName').value;
    const role = document.getElementById('searchUserRole').value;
    
    // Create search params object
    const searchParams = {
        email,
        name,
        role
    };
    
    // Load users with search params
    loadUsers(searchParams);
}

function resetUserSearch() {
    document.getElementById('searchUserEmail').value = '';
    document.getElementById('searchUserName').value = '';
    document.getElementById('searchUserRole').value = '';
    
    // Reload users without search params
    loadUsers();
}

function openAddUserModal() {
    // Reset form
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModalTitle').textContent = 'Thêm người dùng mới';
    document.getElementById('passwordHint').textContent = 'Mật khẩu cho tài khoản mới';
    document.getElementById('studentInfoSection').style.display = 'none';
    
    // Show modal
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    userModal.show();
}

function openEditUserModal(userId) {
    // Reset form
    document.getElementById('userForm').reset();
    
    // Set user ID
    document.getElementById('userId').value = userId;
    document.getElementById('userModalTitle').textContent = 'Chỉnh sửa người dùng';
    document.getElementById('passwordHint').textContent = 'Để trống nếu không thay đổi mật khẩu';
    
    // This would be replaced with an actual API call to get user data
    // For demo, we'll just set some dummy data
    if (userId === '1') {
        document.getElementById('userEmail').value = 'admin@edupay.vn';
        document.getElementById('userName').value = 'Quản trị viên';
        document.getElementById('userRole').value = 'admin';
        document.getElementById('userStatus').value = 'active';
        document.getElementById('studentInfoSection').style.display = 'none';
    } else if (userId === '2') {
        document.getElementById('userEmail').value = 'staff@edupay.vn';
        document.getElementById('userName').value = 'Nhân viên';
        document.getElementById('userRole').value = 'staff';
        document.getElementById('userStatus').value = 'active';
        document.getElementById('studentInfoSection').style.display = 'none';
    }
    
    // Show modal
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    userModal.show();
}

function saveUser() {
    const userId = document.getElementById('userId').value;
    const email = document.getElementById('userEmail').value;
    const name = document.getElementById('userName').value;
    const role = document.getElementById('userRole').value;
    const department = document.getElementById('userDepartment').value;
    const password = document.getElementById('userPassword').value;
    const status = document.getElementById('userStatus').value;
    
    // Validate form
    if (!email || !name || !role || !status) {
        showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return;
    }
    
    // Collect student-specific information if role is student
    let studentData = null;
    if (role === 'student') {
        const studentId = document.getElementById('studentId').value;
        const studentClass = document.getElementById('studentClass').value;
        
        if (!studentId) {
            showToast('Lỗi', 'Vui lòng nhập mã sinh viên', 'error');
            return;
        }
        
        studentData = { studentId, class: studentClass };
    }
    
    // This would be replaced with an actual API call
    showToast('Thông báo', 'Đang lưu thông tin người dùng...', 'info');
    
    // Simulate API call
    setTimeout(() => {
        showToast('Thành công', 'Đã lưu thông tin người dùng thành công', 'success');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        
        // Reload users
        loadUsers();
    }, 500);
}

function confirmDeleteUser(userId) {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
        // This would be replaced with an actual API call
        showToast('Thông báo', 'Đang xóa người dùng...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            showToast('Thành công', 'Đã xóa người dùng thành công', 'success');
            
            // Reload users
            loadUsers();
        }, 500);
    }
}

// Departments tab functions
function loadDepartments() {
    // This would be replaced with an actual API call
    showToast('Thông báo', 'Đang tải dữ liệu khoa/phòng ban...', 'info');
    
    // Simulate loading data
    setTimeout(() => {
        const departmentsTableBody = document.getElementById('departmentsTableBody');
        if (departmentsTableBody) {
            // Dummy data for demonstration
            departmentsTableBody.innerHTML = `
                <tr>
                    <td>CNTT</td>
                    <td>Công nghệ thông tin</td>
                    <td>Khoa Công nghệ thông tin</td>
                    <td>245</td>
                    <td><span class="badge bg-success">Hoạt động</span></td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-edit-department" data-id="CNTT">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn admin-btn-sm admin-btn-danger btn-delete-department" data-id="CNTT">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td>QTKD</td>
                    <td>Quản trị kinh doanh</td>
                    <td>Khoa Quản trị kinh doanh</td>
                    <td>187</td>
                    <td><span class="badge bg-success">Hoạt động</span></td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-edit-department" data-id="QTKD">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn admin-btn-sm admin-btn-danger btn-delete-department" data-id="QTKD">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.btn-edit-department').forEach(btn => {
                btn.addEventListener('click', function() {
                    const departmentId = this.getAttribute('data-id');
                    openEditDepartmentModal(departmentId);
                });
            });
            
            document.querySelectorAll('.btn-delete-department').forEach(btn => {
                btn.addEventListener('click', function() {
                    const departmentId = this.getAttribute('data-id');
                    confirmDeleteDepartment(departmentId);
                });
            });
            
            // Also populate department dropdown in user form
            const userDepartment = document.getElementById('userDepartment');
            if (userDepartment) {
                userDepartment.innerHTML = `
                    <option value="">Chọn khoa/phòng ban</option>
                    <option value="CNTT">Công nghệ thông tin</option>
                    <option value="QTKD">Quản trị kinh doanh</option>
                    <option value="KT">Kế toán</option>
                    <option value="NNA">Ngôn ngữ Anh</option>
                `;
            }
        }
    }, 500);
}

function openAddDepartmentModal() {
    // Reset form
    document.getElementById('departmentForm').reset();
    document.getElementById('departmentId').value = '';
    document.getElementById('departmentCode').disabled = false;
    document.getElementById('departmentModalTitle').textContent = 'Thêm khoa/phòng ban mới';
    
    // Show modal
    const departmentModal = new bootstrap.Modal(document.getElementById('departmentModal'));
    departmentModal.show();
}

function openEditDepartmentModal(departmentId) {
    // Reset form
    document.getElementById('departmentForm').reset();
    
    // Set department ID
    document.getElementById('departmentId').value = departmentId;
    document.getElementById('departmentModalTitle').textContent = 'Chỉnh sửa khoa/phòng ban';
    
    // Disable code field for editing (primary key)
    document.getElementById('departmentCode').disabled = true;
    
    // This would be replaced with an actual API call to get department data
    // For demo, we'll just set some dummy data
    if (departmentId === 'CNTT') {
        document.getElementById('departmentCode').value = 'CNTT';
        document.getElementById('departmentName').value = 'Công nghệ thông tin';
        document.getElementById('departmentDescription').value = 'Khoa Công nghệ thông tin';
        document.getElementById('departmentStatus').value = 'active';
    } else if (departmentId === 'QTKD') {
        document.getElementById('departmentCode').value = 'QTKD';
        document.getElementById('departmentName').value = 'Quản trị kinh doanh';
        document.getElementById('departmentDescription').value = 'Khoa Quản trị kinh doanh';
        document.getElementById('departmentStatus').value = 'active';
    }
    
    // Show modal
    const departmentModal = new bootstrap.Modal(document.getElementById('departmentModal'));
    departmentModal.show();
}

function saveDepartment() {
    const departmentId = document.getElementById('departmentId').value;
    const code = document.getElementById('departmentCode').value;
    const name = document.getElementById('departmentName').value;
    const description = document.getElementById('departmentDescription').value;
    const status = document.getElementById('departmentStatus').value;
    
    // Validate form
    if (!code || !name || !status) {
        showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return;
    }
    
    // This would be replaced with an actual API call
    showToast('Thông báo', 'Đang lưu thông tin khoa/phòng ban...', 'info');
    
    // Simulate API call
    setTimeout(() => {
        showToast('Thành công', 'Đã lưu thông tin khoa/phòng ban thành công', 'success');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
        
        // Reload departments
        loadDepartments();
    }, 500);
}

function confirmDeleteDepartment(departmentId) {
    if (confirm('Bạn có chắc chắn muốn xóa khoa/phòng ban này?')) {
        // This would be replaced with an actual API call
        showToast('Thông báo', 'Đang xóa khoa/phòng ban...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            showToast('Thành công', 'Đã xóa khoa/phòng ban thành công', 'success');
            
            // Reload departments
            loadDepartments();
        }, 500);
    }
}

// System settings functions
function loadSystemSettings() {
    // This would be replaced with an actual API call
    // For a demo, we'll just use the default values in the form
    showToast('Thông báo', 'Đã tải cài đặt hệ thống', 'info');
}

function saveSystemSettings(e) {
    e.preventDefault();
    
    // This would be replaced with an actual API call
    showToast('Thông báo', 'Đang lưu cài đặt hệ thống...', 'info');
    
    // Simulate API call
    setTimeout(() => {
        showToast('Thành công', 'Đã lưu cài đặt hệ thống thành công', 'success');
    }, 500);
}

function resetSystemSettings() {
    if (confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định?')) {
        // Reset form to default values
        document.getElementById('systemSettingsForm').reset();
        
        // This would be replaced with an actual API call
        showToast('Thông báo', 'Đã khôi phục cài đặt mặc định', 'info');
    }
}

// System logs functions
function loadSystemLogs(searchParams) {
    // This would be replaced with an actual API call
    showToast('Thông báo', 'Đang tải nhật ký hệ thống...', 'info');
    
    // Simulate loading data
    setTimeout(() => {
        const logsTableBody = document.getElementById('logsTableBody');
        if (logsTableBody) {
            // Dummy data for demonstration
            logsTableBody.innerHTML = `
                <tr>
                    <td>1001</td>
                    <td>10/11/2023 08:15:22</td>
                    <td><span class="badge bg-info">Thông tin</span></td>
                    <td>admin@edupay.vn</td>
                    <td>Đăng nhập</td>
                    <td>Đăng nhập thành công</td>
                    <td>192.168.1.1</td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-view-log" data-id="1001">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td>1002</td>
                    <td>10/11/2023 09:30:15</td>
                    <td><span class="badge bg-warning">Cảnh báo</span></td>
                    <td>staff@edupay.vn</td>
                    <td>Cập nhật</td>
                    <td>Cập nhật thông tin sinh viên không thành công</td>
                    <td>192.168.1.2</td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-view-log" data-id="1002">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td>1003</td>
                    <td>10/11/2023 10:45:33</td>
                    <td><span class="badge bg-danger">Lỗi</span></td>
                    <td>system</td>
                    <td>Hệ thống</td>
                    <td>Lỗi kết nối cơ sở dữ liệu</td>
                    <td>192.168.1.10</td>
                    <td>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary btn-view-log" data-id="1003">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listeners to view buttons
            document.querySelectorAll('.btn-view-log').forEach(btn => {
                btn.addEventListener('click', function() {
                    const logId = this.getAttribute('data-id');
                    openLogDetailModal(logId);
                });
            });
        }
    }, 500);
}

function searchLogs() {
    const level = document.getElementById('logLevel').value;
    const dateRange = document.getElementById('logDateRange').value;
    const userAction = document.getElementById('logUserAction').value;
    
    let startDate = null;
    let endDate = null;
    
    if (dateRange === 'custom') {
        startDate = document.getElementById('logStartDate').value;
        endDate = document.getElementById('logEndDate').value;
        
        if (!startDate || !endDate) {
            showToast('Lỗi', 'Vui lòng chọn ngày bắt đầu và kết thúc', 'error');
            return;
        }
    }
    
    // Create search params object
    const searchParams = {
        level,
        dateRange,
        userAction,
        startDate,
        endDate
    };
    
    // Load logs with search params
    loadSystemLogs(searchParams);
}

function resetLogSearch() {
    document.getElementById('logLevel').value = '';
    document.getElementById('logDateRange').value = 'last7days';
    document.getElementById('logUserAction').value = '';
    document.getElementById('logStartDate').value = '';
    document.getElementById('logEndDate').value = '';
    document.querySelector('.custom-date-range').style.display = 'none';
    
    // Reload logs without search params
    loadSystemLogs();
}

function openLogDetailModal(logId) {
    // This would be replaced with an actual API call to get log details
    // For demo, we'll just set some dummy data
    
    document.getElementById('logDetailId').textContent = logId;
    
    if (logId === '1001') {
        document.getElementById('logDetailTime').textContent = '10/11/2023 08:15:22';
        document.getElementById('logDetailLevel').textContent = 'Thông tin';
        document.getElementById('logDetailLevel').className = 'badge bg-info';
        document.getElementById('logDetailUser').textContent = 'admin@edupay.vn (Quản trị viên)';
        document.getElementById('logDetailAction').textContent = 'Đăng nhập';
        document.getElementById('logDetailDescription').textContent = 'Đăng nhập thành công';
        document.getElementById('logDetailData').textContent = JSON.stringify({
            user_id: 1,
            ip: '192.168.1.1',
            browser: 'Chrome 98.0.4758.102',
            os: 'Windows 10',
            status: 'success'
        }, null, 2);
        document.getElementById('logDetailIp').textContent = '192.168.1.1';
        document.getElementById('logDetailUserAgent').textContent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';
        document.getElementById('logDetailUrl').textContent = '/api/auth/login';
    } else if (logId === '1002') {
        document.getElementById('logDetailTime').textContent = '10/11/2023 09:30:15';
        document.getElementById('logDetailLevel').textContent = 'Cảnh báo';
        document.getElementById('logDetailLevel').className = 'badge bg-warning';
        document.getElementById('logDetailUser').textContent = 'staff@edupay.vn (Nhân viên)';
        document.getElementById('logDetailAction').textContent = 'Cập nhật';
        document.getElementById('logDetailDescription').textContent = 'Cập nhật thông tin sinh viên không thành công';
        document.getElementById('logDetailData').textContent = JSON.stringify({
            user_id: 2,
            student_id: 'SV12345',
            error: 'Dữ liệu không hợp lệ',
            fields: ['email', 'phone_number'],
            status: 'failed'
        }, null, 2);
        document.getElementById('logDetailIp').textContent = '192.168.1.2';
        document.getElementById('logDetailUserAgent').textContent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';
        document.getElementById('logDetailUrl').textContent = '/api/students/SV12345';
    } else if (logId === '1003') {
        document.getElementById('logDetailTime').textContent = '10/11/2023 10:45:33';
        document.getElementById('logDetailLevel').textContent = 'Lỗi';
        document.getElementById('logDetailLevel').className = 'badge bg-danger';
        document.getElementById('logDetailUser').textContent = 'system';
        document.getElementById('logDetailAction').textContent = 'Hệ thống';
        document.getElementById('logDetailDescription').textContent = 'Lỗi kết nối cơ sở dữ liệu';
        document.getElementById('logDetailData').textContent = JSON.stringify({
            error_code: 'DB_CONNECTION_ERROR',
            message: 'Không thể kết nối đến cơ sở dữ liệu',
            server: 'db.example.com',
            port: 3306,
            retry_count: 3,
            status: 'error'
        }, null, 2);
        document.getElementById('logDetailIp').textContent = '192.168.1.10';
        document.getElementById('logDetailUserAgent').textContent = 'System Service';
        document.getElementById('logDetailUrl').textContent = 'N/A';
    }
    
    // Show modal
    const logDetailModal = new bootstrap.Modal(document.getElementById('logDetailModal'));
    logDetailModal.show();
}

function exportLogs() {
    // This would be replaced with an actual export functionality
    showToast('Thông báo', 'Đang xuất nhật ký...', 'info');
    
    // Simulate export
    setTimeout(() => {
        showToast('Thành công', 'Đã xuất nhật ký thành công', 'success');
    }, 1000);
} 