import { authApi } from '../services/api.js';
import { saveAuthToken, clearAuthToken } from '../utils/auth.js';
import { validateRegistrationForm } from '../utils/validation.js';
import { showToast, updateUIBasedOnAuth } from '../utils/ui.js';
import { addFieldError } from '../utils/validation.js';

// Handle login form submission
export function initLoginHandler() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Clear previous errors
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            
            // Basic validation
            let hasErrors = false;
            
            if (!email) {
                addFieldError('loginEmail', 'Vui lòng nhập địa chỉ email');
                hasErrors = true;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                addFieldError('loginEmail', 'Vui lòng nhập địa chỉ email hợp lệ');
                hasErrors = true;
            }
            
            if (!password) {
                addFieldError('loginPassword', 'Vui lòng nhập mật khẩu');
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            try {
                const loginButton = this.querySelector('button[type="submit"]');
                loginButton.disabled = true;
                loginButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                const result = await authApi.login(email, password, rememberMe);
                
                if (result.success) {
                    saveAuthToken(result);
                    showToast('Thành công', 'Đăng nhập thành công', 'success');
                    updateUIBasedOnAuth();
                    
                    setTimeout(() => {
                        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                        if (loginModal) {
                            loginModal.hide();
                        }
                    }, 1000);
                }
            } catch (error) {
                if (error.message.includes('Email hoặc mật khẩu không đúng')) {
                    addFieldError('loginPassword', 'Email hoặc mật khẩu không đúng');
                    showToast('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng', 'error');
                } else {
                    showToast('Đăng nhập thất bại', error.message, 'error');
                }
            } finally {
                const loginButton = this.querySelector('button[type="submit"]');
                loginButton.disabled = false;
                loginButton.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Đăng nhập';
            }
        });
    }
}

// Handle registration form submission
export function initRegisterHandler() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value,
                studentCode: document.getElementById('studentCode').value,
                email: document.getElementById('registerEmail').value,
                phoneNumber: document.getElementById('phoneNumber').value,
                password: document.getElementById('registerPassword').value,
                confirmPassword: document.getElementById('confirmPassword').value,
                departmentID: parseInt(document.getElementById('departmentID').value),
                classID: parseInt(document.getElementById('classID').value),
                enrollmentYear: parseInt(document.getElementById('enrollmentYear').value)
            };
            
            if (!validateRegistrationForm(formData)) return;
            
            try {
                const registerButton = this.querySelector('button[type="submit"]');
                registerButton.disabled = true;
                registerButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                const result = await authApi.register(formData);
                
                showToast('Thành công', 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.', 'success');
                
                setTimeout(() => {
                    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    if (registerModal) {
                        registerModal.hide();
                    }
                    
                    setTimeout(() => {
                        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                        loginModal.show();
                    }, 500);
                }, 1500);
            } catch (error) {
                const errorMsg = error.message;
                if (errorMsg.includes('Email này đã được đăng ký')) {
                    addFieldError('registerEmail', 'Email này đã được đăng ký');
                } else if (errorMsg.includes('Mã sinh viên này đã được đăng ký')) {
                    addFieldError('studentCode', 'Mã sinh viên này đã được đăng ký');
                } else {
                    showToast('Đăng ký thất bại', errorMsg, 'error');
                }
            } finally {
                const registerButton = this.querySelector('button[type="submit"]');
                registerButton.disabled = false;
                registerButton.innerHTML = '<i class="fas fa-user-plus me-2"></i>Đăng ký';
            }
        });
    }
}

// Handle forgot password form submission
export function initForgotPasswordHandler() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            
            // Clear previous errors
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            
            if (!email) {
                addFieldError('resetEmail', 'Vui lòng nhập địa chỉ email');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                addFieldError('resetEmail', 'Vui lòng nhập địa chỉ email hợp lệ');
                return;
            }
            
            try {
                const resetButton = this.querySelector('button[type="submit"]');
                resetButton.disabled = true;
                resetButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                await authApi.forgotPassword(email);
                
                showToast('Thành công', 'Hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn nếu email này tồn tại trong hệ thống', 'success');
                
                setTimeout(() => {
                    const forgotPasswordModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                    if (forgotPasswordModal) {
                        forgotPasswordModal.hide();
                    }
                }, 1500);
            } catch (error) {
                showToast('Thông báo', 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong thời gian ngắn', 'info');
            } finally {
                const resetButton = this.querySelector('button[type="submit"]');
                resetButton.disabled = false;
                resetButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Gửi yêu cầu';
            }
        });
    }
}

// Handle logout
export function initLogoutHandler() {
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await authApi.logout();
            clearAuthToken();
            showToast('Thành công', 'Đăng xuất thành công', 'success');
            window.location.reload();
        } catch (error) {
            showToast('Lỗi', 'Đăng xuất thất bại', 'error');
        }
    };

    // Direct logout button handler
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Delegated event handler for dynamically added logout buttons
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.closest('#logoutButton')) {
            handleLogout(e);
        }
    });
}

// Initialize all auth handlers
export function initAuthHandlers() {
    initLoginHandler();
    initRegisterHandler();
    initForgotPasswordHandler();
    initLogoutHandler();
} 