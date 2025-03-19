// Import utilities
import { isAuthenticated, getUserData } from '../utils/auth.js';
import { showToast } from '../utils/ui.js';
import { authApi, dropdownApi } from '../services/api.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        // Redirect to login page if not authenticated
        console.log('User not authenticated, redirecting to login page');
        window.location.href = 'login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
        return;
    }

    console.log('Profile page initialized for authenticated user');

    try {
        // Show loading state
        showLoadingState(true);
        
        // Fetch profile data
        const profileData = await authApi.getProfile();
        
        // Update UI with profile data
        updateProfileUI(profileData);
    } catch (error) {
        console.error('Error loading profile data:', error);
        
        // If API call fails, try to use data from localStorage as fallback
        const userData = getUserData();
        if (userData) {
            updateProfileUI(userData);
        } else {
            showToast('Lỗi', 'Không thể tải thông tin người dùng', 'error');
        }
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
    
    // Initialize event handlers
    initializeEventHandlers();
});

// Show/hide loading state
function showLoadingState(isLoading) {
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    const contentElements = document.querySelectorAll('.content-element');
    
    if (isLoading) {
        loadingElements.forEach(el => el.style.display = 'block');
        contentElements.forEach(el => el.style.opacity = '0');
    } else {
        setTimeout(() => {
            loadingElements.forEach(el => el.style.display = 'none');
            contentElements.forEach(el => el.style.opacity = '1');
        }, 500);
    }
}

// Update UI with profile data
function updateProfileUI(userData) {
    // Debug - log the entire userData object to see its structure
    console.log("Profile data received:", JSON.stringify(userData, null, 2));
    
    // Basic user info
    document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = userData.fullName || 'User';
    });
    
    document.querySelector('.user-fullname').textContent = userData.fullName || 'N/A';
    document.querySelector('.user-email').textContent = userData.email || 'N/A';
    
    // Detailed user info
    document.querySelector('.user-student-code').textContent = userData.studentCode || 'N/A';
    document.querySelector('.user-phone').textContent = userData.phoneNumber || 'N/A';
    
    // Academic info
    if (userData.department) {
        document.querySelector('.user-department').textContent = 
            `${userData.department.departmentName} (${userData.department.departmentCode})` || 'N/A';
    } else {
        document.querySelector('.user-department').textContent = 'N/A';
    }
    
    // Enhanced fix for class information - check all possible property names
    updateClassInfo(userData);
    
    document.querySelector('.user-enrollment-year').textContent = userData.enrollmentYear || 'N/A';

    // Pre-fill edit form
    document.getElementById('editFullName').value = userData.fullName || '';
    document.getElementById('editPhone').value = userData.phoneNumber || '';

    // Set two-factor auth toggle state
    const twoFactorToggle = document.getElementById('twoFactorAuth');
    if (twoFactorToggle) {
        twoFactorToggle.checked = userData.isTwoFactorEnabled || false;
    }
    
    // Store the complete profile data for later use
    localStorage.setItem('user_data', JSON.stringify(userData));
}

// New function to handle class information update
async function updateClassInfo(userData) {
    const classElement = document.querySelector('.user-class');
    
    // Try all possible ways to get class info from userData
    if (userData.class_) {
        console.log("Found class_ property:", userData.class_);
        classElement.textContent = `${userData.class_.className} (${userData.class_.classCode})`;
        return;
    } else if (userData.class) {
        console.log("Found class property:", userData.class);
        classElement.textContent = `${userData.class.className} (${userData.class.classCode})`;
        return;
    }
    
    // If we have departmentId and classId but no class object, try to fetch it
    if (userData.student && userData.student.classID) {
        try {
            console.log("Trying to fetch class info using classID:", userData.student.classID);
            const classesData = await dropdownApi.getClasses(userData.student.departmentID);
            if (classesData && Array.isArray(classesData)) {
                const classInfo = classesData.find(c => c.classID === userData.student.classID);
                if (classInfo) {
                    console.log("Found class info from API:", classInfo);
                    classElement.textContent = `${classInfo.className} (${classInfo.classCode})`;
                    return;
                }
            }
        } catch (error) {
            console.error("Error fetching class info:", error);
        }
    }
    
    // Last resort - search through all properties
    for (const key in userData) {
        if (userData[key] && typeof userData[key] === 'object' && 
            userData[key].className && userData[key].classCode) {
            console.log(`Found potential class info in property: ${key}`, userData[key]);
            classElement.textContent = `${userData[key].className} (${userData[key].classCode})`;
            return;
        }
    }
    
    // If all attempts fail
    classElement.textContent = 'N/A';
}

// Initialize all event handlers
function initializeEventHandlers() {
    // Sidebar functionality
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContainer = document.querySelector('.main-container');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContainer.classList.toggle('expanded');
        });
    }
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            this.querySelector('i').classList.toggle('fa-bars');
            this.querySelector('i').classList.toggle('fa-times');
        });
    }
    
    // Edit Profile Button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
            editProfileModal.show();
        });
    }

    // Edit Profile Form
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleEditProfile);
    }

    // Change Password Button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
            changePasswordModal.show();
        });
    }

    // Change Password Form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    // Two Factor Auth Toggle
    const twoFactorAuth = document.getElementById('twoFactorAuth');
    if (twoFactorAuth) {
        twoFactorAuth.addEventListener('change', handleTwoFactorAuth);
    }
    
    // Info row hover effect
    const infoRows = document.querySelectorAll('.info-row');
    infoRows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.transform = 'translateX(10px)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.transform = 'translateX(0)';
        });
    });
}

// Handle edit profile form submission
async function handleEditProfile(e) {
    e.preventDefault();
    
    const formData = {
        fullName: document.getElementById('editFullName').value,
        phoneNumber: document.getElementById('editPhone').value
    };

    try {
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';

        // Call API to update profile
        const response = await authApi.updateProfile(formData);

        if (response.success) {
            // Fetch updated profile data
            const profileData = await authApi.getProfile();
            updateProfileUI(profileData);

            // Show success message
            showToast('Thành công', 'Cập nhật thông tin thành công', 'success');

            // Close modal
            const editProfileModal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            editProfileModal.hide();
        }
    } catch (error) {
        showToast('Lỗi', error.message || 'Cập nhật thông tin thất bại', 'error');
    } finally {
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Lưu thay đổi';
    }
}

// Handle change password form submission
async function handleChangePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    // Validate passwords
    if (newPassword !== confirmNewPassword) {
        showToast('Lỗi', 'Mật khẩu mới không khớp', 'error');
        return;
    }

    try {
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';

        // Call API to change password
        const response = await authApi.changePassword({
            currentPassword,
            newPassword,
            confirmNewPassword
        });

        if (response.success) {
            showToast('Thành công', 'Đổi mật khẩu thành công', 'success');

            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';

            // Close modal
            const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            changePasswordModal.hide();
        }
    } catch (error) {
        showToast('Lỗi', error.message || 'Đổi mật khẩu thất bại', 'error');
    } finally {
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Đổi mật khẩu';
    }
}

// Handle two-factor auth toggle
async function handleTwoFactorAuth(e) {
    const isEnabled = e.target.checked;
    
    try {
        // Call API to enable/disable two-factor auth
        const response = await authApi.updateTwoFactorAuth(isEnabled);
        
        if (response.success) {
            showToast('Thành công', 
                isEnabled ? 'Đã bật xác thực hai yếu tố' : 'Đã tắt xác thực hai yếu tố', 
                'success');
        }
    } catch (error) {
        // Revert the toggle state
        e.target.checked = !isEnabled;
        showToast('Lỗi', error.message || 'Cập nhật xác thực hai yếu tố thất bại', 'error');
    }
} 