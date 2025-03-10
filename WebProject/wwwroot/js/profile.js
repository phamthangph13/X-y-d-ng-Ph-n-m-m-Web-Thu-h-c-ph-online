import { isAuthenticated, getUserData } from './utils/auth.js';
import { showToast } from './utils/ui.js';
import { authApi } from './services/api.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        // Redirect to login page if not authenticated
        window.location.href = '/';
        return;
    }

    try {
        // Show loading state
        showLoadingState(true);
        
        // Fetch profile data
        const profileData = await authApi.getProfile();
        
        // Update UI with profile data
        updateProfileUI(profileData);
    } catch (error) {
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
        contentElements.forEach(el => el.style.display = 'none');
    } else {
        loadingElements.forEach(el => el.style.display = 'none');
        contentElements.forEach(el => el.style.display = 'block');
    }
}

// Update UI with profile data
function updateProfileUI(userData) {
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
    
    if (userData.class) {
        document.querySelector('.user-class').textContent = 
            `${userData.class.className} (${userData.class.classCode})` || 'N/A';
    } else {
        document.querySelector('.user-class').textContent = 'N/A';
    }
    
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

// Initialize all event handlers
function initializeEventHandlers() {
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
        showToast('Lỗi', error.message, 'error');
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

            // Close modal
            const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            changePasswordModal.hide();

            // Reset form
            this.reset();
        }
    } catch (error) {
        showToast('Lỗi', error.message, 'error');
    } finally {
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Đổi mật khẩu';
    }
}

// Handle two factor authentication toggle
async function handleTwoFactorAuth(e) {
    const isEnabled = e.target.checked;

    try {
        // Call API to update 2FA status
        const response = await authApi.updateTwoFactorAuth(isEnabled);

        if (response.success) {
            showToast('Thành công', 
                isEnabled ? 'Đã bật xác thực hai lớp' : 'Đã tắt xác thực hai lớp', 
                'success'
            );
        }
    } catch (error) {
        // Revert toggle if failed
        e.target.checked = !isEnabled;
        showToast('Lỗi', error.message, 'error');
    }
} 