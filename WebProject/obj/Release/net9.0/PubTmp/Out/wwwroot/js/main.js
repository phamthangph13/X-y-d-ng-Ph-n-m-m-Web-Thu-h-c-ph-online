// Helper function to add field errors
function addFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div'); 
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = errorMessage;
        
        field.parentNode.appendChild(errorDiv);
    }
} 

document.addEventListener('DOMContentLoaded', function() {
    // ===== API CONFIGURATION =====
    const API_BASE_URL = window.location.hostname === "localhost" 
        ? "http://localhost:5083" 
        : `${window.location.protocol}//${window.location.host}`; // Use current domain in production
    const API_AUTH = `${API_BASE_URL}/api/auth`;
    const API_DROPDOWN = `${API_BASE_URL}/api/dropdowndata`;

    // Token management
    const TOKEN_KEY = 'auth_token';
    const USER_KEY = 'user_data';

    // Direct check for authentication state and update body class
    if (localStorage.getItem(TOKEN_KEY)) {
        document.body.classList.add('authenticated');
        console.log("Body class set to authenticated based on token presence");
    } else {
        document.body.classList.remove('authenticated');
        console.log("Body class authenticated removed based on token absence");
    }

    // ===== UTILITY FUNCTIONS =====
    
    // Ensure proper display of UTF-8 characters
    function ensureCorrectEncoding(text) {
        if (!text) return "User";
        try {
            // In case the text has been double-encoded or has encoding issues
            // Try to normalize it for display
            return decodeURIComponent(escape(text));
        } catch (e) {
            console.error("Error normalizing text:", e);
            return text;
        }
    }
    
    // Save auth token to localStorage
    function saveAuthToken(tokenData) {
        localStorage.setItem(TOKEN_KEY, tokenData.token);
        // Make sure user data is always an object before saving it
        if (tokenData.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(tokenData.user));
            console.log("User data saved:", tokenData.user);
        } else {
            // Extract user info from JWT token
            try {
                const tokenParts = tokenData.token.split('.');
                if (tokenParts.length === 3) {
                    // Proper decoding of Base64URL with UTF-8 handling
                    const base64Url = tokenParts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    
                    const payload = JSON.parse(jsonPayload);
                    const userData = {
                        userId: payload.nameid,
                        email: payload.email,
                        fullName: payload.unique_name,
                        role: payload.role
                    };
                    localStorage.setItem(USER_KEY, JSON.stringify(userData));
                    console.log("User data extracted from token:", userData);
                }
            } catch (error) {
                console.error("Failed to extract user data from token:", error);
                // Save empty user object as fallback
                localStorage.setItem(USER_KEY, JSON.stringify({fullName: "User"}));
            }
        }
        console.log("Auth token saved:", tokenData.token);
    }
    
    // Clear auth token from localStorage and update UI
    function clearAuthToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        
        // Remove authenticated class from body
        document.body.classList.remove('authenticated');
        
        console.log("Auth token cleared from localStorage");
    }
    
    // Get auth token from localStorage
    function getAuthToken() {
        return localStorage.getItem(TOKEN_KEY);
    }
    
    // Check if user is authenticated
    function isAuthenticated() {
        const token = getAuthToken();
        console.log("Current auth token:", token);
        return !!token;
    }
    
    // Generic API call function with error handling
    async function apiCall(url, method = 'GET', data = null, requiresAuth = false) {
        console.log(`Making ${method} request to: ${url}`);
        if (data) {
            console.log('Request data:', data);
        }
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        if (requiresAuth) {
            const token = getAuthToken();
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        try {
            console.log('Request options:', options);
            const response = await fetch(url, options);
            
            console.log(`Response status: ${response.status} ${response.statusText}`);
            
            // Log response headers for debugging
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            console.log('Response headers:', headers);
            
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const responseData = await response.json();
                console.log('Response data:', responseData);
                
                if (!response.ok) {
                    throw new Error(responseData.message || getFriendlyErrorMessage(response.status));
                }
                
                return responseData;
            } else {
                // Handle non-JSON response
                const textResponse = await response.text();
                console.log('Non-JSON response:', textResponse);
                
                if (!response.ok) {
                    // Extract error message from text response if possible
                    let errorMessage = getFriendlyErrorMessage(response.status);
                    
                    // Try to extract a more specific message from the response if it contains useful information
                    if (textResponse && textResponse.length > 0) {
                        if (textResponse.includes('Invalid email or password')) {
                            errorMessage = 'Email hoặc mật khẩu không đúng';
                        } else if (textResponse.includes('Account is not active')) {
                            errorMessage = 'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email để xác thực tài khoản.';
                        } else if (textResponse.includes('Email already exists')) {
                            errorMessage = 'Email này đã được đăng ký';
                        } else if (textResponse.includes('Student code already exists')) {
                            errorMessage = 'Mã sinh viên này đã được đăng ký';
                        }
                    }
                    
                    throw new Error(errorMessage);
                }
                
                // Try to return as JSON if possible
                try {
                    return JSON.parse(textResponse);
                } catch (e) {
                    return { message: textResponse || 'Success' };
                }
            }
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Helper function to get user-friendly error messages
    function getFriendlyErrorMessage(statusCode) {
        switch (statusCode) {
            case 400:
                return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
            case 401:
                return 'Bạn cần đăng nhập để thực hiện thao tác này.';
            case 403:
                return 'Bạn không có quyền thực hiện thao tác này.';
            case 404:
                return 'Không tìm thấy thông tin yêu cầu.';
            case 500:
                return 'Có lỗi xảy ra từ hệ thống. Vui lòng thử lại sau.';
            case 503:
                return 'Dịch vụ hiện không khả dụng. Vui lòng thử lại sau.';
            default:
                return 'Có lỗi xảy ra. Vui lòng thử lại.';
        }
    }
    
    // ===== FORM DATA LOADING =====
    
    // Load departments for registration form
    async function loadDepartments() {
        try {
            const departmentSelect = document.getElementById('departmentID');
            if (!departmentSelect) return;
            
            // Clear all options except the first one
            while (departmentSelect.options.length > 1) {
                departmentSelect.remove(1);
            }
            
            const departments = await apiCall(`${API_DROPDOWN}/departments`);
            
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.departmentID;
                option.textContent = `${dept.departmentName} (${dept.departmentCode})`;
                departmentSelect.appendChild(option);
            });
        } catch (error) {
            showToast('Error', 'Failed to load departments', 'error');
        }
    }
    
    // Load classes by department
    async function loadClasses(departmentId = null) {
        try {
            const classSelect = document.getElementById('classID');
            if (!classSelect) return;
            
            // Clear all options except the first one
            while (classSelect.options.length > 1) {
                classSelect.remove(1);
            }
            
            const url = departmentId 
                ? `${API_DROPDOWN}/classes?departmentId=${departmentId}` 
                : `${API_DROPDOWN}/classes`;
                
            const classes = await apiCall(url);
            
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.classID;
                option.textContent = cls.className;
                option.dataset.departmentId = cls.departmentID;
                classSelect.appendChild(option);
            });
        } catch (error) {
            showToast('Error', 'Failed to load classes', 'error');
        }
    }
    
    // Load enrollment years
    async function loadEnrollmentYears() {
        try {
            const yearSelect = document.getElementById('enrollmentYear');
            if (!yearSelect) return;
            
            // Clear all options except the first one
            while (yearSelect.options.length > 1) {
                yearSelect.remove(1);
            }
            
            const years = await apiCall(`${API_DROPDOWN}/enrollment-years`);
            
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        } catch (error) {
            showToast('Error', 'Failed to load enrollment years', 'error');
        }
    }
    
    // ===== AUTHENTICATION API CALLS =====
    
    // Login API call
    async function login(email, password, rememberMe) {
        try {
            // First try the standard endpoint
            try {
                console.log("Trying standard login endpoint...");
                const response = await apiCall(`${API_AUTH}/login`, 'POST', {
                    email,
                    password,
                    rememberMe
                });
                
                if (response.success) {
                    // Ensure we have the right format for saveAuthToken
                    if (!response.token && response.data && response.data.token) {
                        response.token = response.data.token;
                    }
                    
                    if (!response.user && response.data && response.data.user) {
                        response.user = response.data.user;
                    }
                    
                    console.log("Login response:", response);
                    saveAuthToken(response);
                    console.log("Login successful, updating UI immediately");
                    updateUIBasedOnAuth();
                    return response;
                } else {
                    throw new Error(response.message || 'Login failed');
                }
            } catch (error) {
                console.log("Standard login endpoint failed, trying test endpoint...");
                // If that fails, try the test endpoint to check API connectivity
                const testResponse = await apiCall(`${API_AUTH}/test`, 'GET');
                console.log("Test endpoint response:", testResponse);
                
                // Try the general test controller
                const generalTestResponse = await apiCall(`${API_BASE_URL}/api/test`, 'GET');
                console.log("General test endpoint response:", generalTestResponse);
                
                // Try the test controller POST method
                const testPostResponse = await apiCall(`${API_BASE_URL}/api/test`, 'POST', {
                    email,
                    password,
                    rememberMe
                });
                console.log("Test POST endpoint response:", testPostResponse);
                
                // Try a different auth endpoint format
                console.log("Trying alternative login endpoint...");
                const alternativeResponse = await apiCall(`${API_BASE_URL}/Authentication/Login`, 'POST', {
                    email,
                    password,
                    rememberMe
                });
                
                if (alternativeResponse.success) {
                    // Ensure we have the right format for saveAuthToken
                    if (!alternativeResponse.token && alternativeResponse.data && alternativeResponse.data.token) {
                        alternativeResponse.token = alternativeResponse.data.token;
                    }
                    
                    if (!alternativeResponse.user && alternativeResponse.data && alternativeResponse.data.user) {
                        alternativeResponse.user = alternativeResponse.data.user;
                    }
                    
                    console.log("Login response from alternative endpoint:", alternativeResponse);
                    saveAuthToken(alternativeResponse);
                    console.log("Login successful via alternative endpoint, updating UI immediately");
                    updateUIBasedOnAuth();
                    return alternativeResponse;
                }
                
                // If all fail, throw the original error
                throw error;
            }
        } catch (error) {
            throw error;
        }
    }
    
    // Register API call
    async function register(formData) {
        try {
            const response = await apiCall(`${API_AUTH}/register`, 'POST', formData);
            
            if (response.success) {
                return response;
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            throw error;
        }
    }
    
    // Forgot password API call
    async function forgotPassword(email) {
        try {
            const response = await apiCall(`${API_AUTH}/forgot-password`, 'POST', { email });
            return response;
        } catch (error) {
            throw error;
        }
    }
    
    // Logout API call
    async function logout() {
        try {
            if (isAuthenticated()) {
                await apiCall(`${API_AUTH}/logout`, 'POST', null, true);
            }
            clearAuthToken();
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            clearAuthToken(); // Clear token even if API call fails
            return false;
        }
    }
    
    // ===== EVENT HANDLERS =====
    
    // Load dropdown data when register modal is shown
    $('#registerModal').on('show.bs.modal', function() {
        loadDepartments();
        loadEnrollmentYears();
    });
    
    // Handle the "Forgot Password" link click
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Hide login modal and show forgot password modal
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            setTimeout(() => {
                const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
                forgotPasswordModal.show();
            }, 300);
        });
    }

    // Add department change listener to update class options
    const departmentSelect = document.getElementById('departmentID');
    if (departmentSelect) {
        departmentSelect.addEventListener('change', function() {
            loadClasses(this.value);
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Clear previous error messages
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            
            // Validate inputs
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
            
            if (hasErrors) {
                return;
            }
            
            try {
                const loginButton = this.querySelector('button[type="submit"]');
                loginButton.disabled = true;
                loginButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                const result = await login(email, password, rememberMe);
                
                showToast('Thành công', 'Đăng nhập thành công', 'success');
                
                // Update UI immediately
                console.log("Updating UI immediately after successful login");
                updateUIBasedOnAuth();
                
                // Apply direct CSS fix for auth buttons
                const authButtons = document.querySelector('.auth-buttons');
                if (authButtons) {
                    console.log("Applying direct CSS fix for auth buttons after login");
                    authButtons.style.cssText = 'display: none !important'; // Use !important to override any other styles
                }
                
                // Hide modal after a brief delay
                setTimeout(() => {
                    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    if (loginModal) {
                        loginModal.hide();
                    }
                    
                    // Update UI again after modal is hidden
                    console.log("Updating UI again after modal is hidden");
                    updateUIBasedOnAuth();
                    
                    // Force a final check after a bit longer delay
                    setTimeout(() => {
                        console.log("Final UI update check after login");
                        updateUIBasedOnAuth();
                        
                        // Final direct CSS fix for auth buttons
                        const authButtons = document.querySelector('.auth-buttons');
                        if (authButtons) {
                            console.log("Applying final direct CSS fix for auth buttons");
                            authButtons.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
                            authButtons.classList.add('d-none');
                            authButtons.hidden = true;
                        }
                    }, 500);
                }, 1000);
            } catch (error) {
                // Handle specific error cases with Vietnamese messages
                if (error.message.includes('Email hoặc mật khẩu không đúng')) {
                    addFieldError('loginPassword', 'Email hoặc mật khẩu không đúng');
                    showToast('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng', 'error');
                } else if (error.message.includes('Tài khoản chưa kích hoạt')) {
                    showToast('Đăng nhập thất bại', 'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email để xác thực tài khoản.', 'error');
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

    // Handle registration form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous error messages
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            
            // Collect form data
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
            
            // Validate form
            if (!validateRegistrationForm(formData)) {
                return;
            }
            
            try {
                const registerButton = this.querySelector('button[type="submit"]');
                registerButton.disabled = true;
                registerButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                const result = await register(formData);
                
                showToast('Thành công', 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.', 'success');
                
                // Hide modal after a brief delay
                setTimeout(() => {
                    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    if (registerModal) {
                        registerModal.hide();
                    }
                    
                    // Show login modal
                    setTimeout(() => {
                        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                        loginModal.show();
                    }, 500);
                }, 1500);
            } catch (error) {
                // Handle specific registration errors
                const errorMsg = error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
                
                if (errorMsg.includes('Email này đã được đăng ký')) {
                    addFieldError('registerEmail', 'Email này đã được đăng ký');
                    showToast('Đăng ký thất bại', 'Email này đã được đăng ký', 'error');
                } 
                else if (errorMsg.includes('Mã sinh viên này đã được đăng ký')) {
                    addFieldError('studentCode', 'Mã sinh viên này đã được đăng ký');
                    showToast('Đăng ký thất bại', 'Mã sinh viên này đã được đăng ký', 'error');
                }
                else if (errorMsg.includes('department does not exist') || errorMsg.includes('department')) {
                    addFieldError('departmentID', 'Vui lòng chọn khoa hợp lệ');
                    showToast('Đăng ký thất bại', 'Khoa không hợp lệ', 'error');
                }
                else if (errorMsg.includes('class does not exist') || errorMsg.includes('class')) {
                    addFieldError('classID', 'Vui lòng chọn lớp hợp lệ');
                    showToast('Đăng ký thất bại', 'Lớp không hợp lệ', 'error');
                }
                else {
                    showToast('Đăng ký thất bại', errorMsg, 'error');
                }
            } finally {
                const registerButton = this.querySelector('button[type="submit"]');
                registerButton.disabled = false;
                registerButton.innerHTML = '<i class="fas fa-user-plus me-2"></i>Đăng ký';
            }
        });
    }

    // Handle forgot password form submission
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous error messages
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            
            // Validate forgot password form
            const email = document.getElementById('resetEmail').value;
            
            if (!email) {
                addFieldError('resetEmail', 'Vui lòng nhập địa chỉ email');
                showToast('Lỗi', 'Vui lòng nhập địa chỉ email', 'error');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                addFieldError('resetEmail', 'Vui lòng nhập địa chỉ email hợp lệ');
                showToast('Lỗi', 'Địa chỉ email không hợp lệ', 'error');
                return;
            }
            
            try {
                const resetButton = this.querySelector('button[type="submit"]');
                resetButton.disabled = true;
                resetButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                await forgotPassword(email);
                
                // Always show success message for security reasons 
                // (don't reveal if an email exists in the system or not)
                showToast('Thành công', 'Hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn nếu email này tồn tại trong hệ thống', 'success');
                
                // Hide modal after a brief delay
                setTimeout(() => {
                    const forgotPasswordModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                    if (forgotPasswordModal) {
                        forgotPasswordModal.hide();
                    }
                }, 1500);
            } catch (error) {
                // Don't display specific error messages about email existence for security
                showToast('Thông báo', 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong thời gian ngắn', 'info');
            } finally {
                const resetButton = this.querySelector('button[type="submit"]');
                resetButton.disabled = false;
                resetButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Gửi yêu cầu';
            }
        });
    }

    // Handle logout click - direct approach
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Add a delegated event listener for the logout button in case it's added dynamically
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.closest('#logoutButton')) {
            e.preventDefault();
            handleLogout(e);
        }
    });
    
    // Shared logout handler function
    async function handleLogout(e) {
        try {
            await logout();
            
            // Clear authentication state
            clearAuthToken();
            
            // Show success message
            showToast('Success', 'You have been logged out', 'success');
            
            // Reload the page immediately
            window.location.reload();
            
        } catch (error) {
            showToast('Error', 'Logout failed', 'error');
        }
    }
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;
            
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (!targetId) return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add animation when elements come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.card, .section-heading, .contact-form, .contact-info');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Set initial state for animation elements
    document.querySelectorAll('.card, .section-heading, .contact-form, .contact-info').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.5s ease-out';
    });

    // Run animation check on load and scroll
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
    
    // Update UI based on authentication status
    function updateUIBasedOnAuth() {
        const isLoggedIn = isAuthenticated();
        console.log("Authentication status:", isLoggedIn);
        
        // Add or remove authenticated class on body element
        if (isLoggedIn) {
            document.body.classList.add('authenticated');
        } else {
            document.body.classList.remove('authenticated');
        }
        
        const authButtons = document.querySelector('.auth-buttons');
        const userDropdown = document.querySelector('.user-dropdown');
        
        console.log("Auth buttons element:", authButtons);
        console.log("User dropdown element:", userDropdown);
        
        if (authButtons && userDropdown) {
            if (isLoggedIn) {
                // Use multiple approaches to ensure the elements are properly hidden/shown
                // 1. Use inline styles
                authButtons.style.display = 'none';
                userDropdown.style.display = 'block';
                
                // 2. Add/remove classes
                authButtons.classList.add('d-none');
                authButtons.classList.remove('d-flex');
                userDropdown.classList.remove('d-none');
                
                // 3. Set visibility
                authButtons.hidden = true;
                userDropdown.hidden = false;
                
                // Force the reflow of the DOM to ensure the changes are applied
                void authButtons.offsetWidth;
                void userDropdown.offsetWidth;
                
                // Try to load user data for display
                let userData = {fullName: "User"};
                try {
                    const storedData = localStorage.getItem(USER_KEY);
                    console.log("Stored user data:", storedData);
                    if (storedData) {
                        userData = JSON.parse(storedData);
                    } else {
                        console.log("No user data found, using default name");
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    // If we can't parse the user data but we're authenticated,
                    // try to extract basic info from the token
                    try {
                        const token = getAuthToken();
                        if (token) {
                            const tokenParts = token.split('.');
                            if (tokenParts.length === 3) {
                                // Proper decoding of Base64URL with UTF-8 handling
                                const base64Url = tokenParts[1];
                                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                                }).join(''));
                                
                                const payload = JSON.parse(jsonPayload);
                                userData = {
                                    fullName: payload.unique_name || "User"
                                };
                                console.log("Extracted user name from token:", userData.fullName);
                            }
                        }
                    } catch (tokenError) {
                        console.error("Failed to extract name from token:", tokenError);
                    }
                }
                
                const userNameElement = userDropdown.querySelector('.user-name');
                if (userNameElement) {
                    // Apply encoding fix to ensure proper display of UTF-8 characters
                    userNameElement.textContent = ensureCorrectEncoding(userData.fullName) || 'User';
                }
            } else {
                // Use multiple approaches to ensure the elements are properly hidden/shown
                // 1. Use inline styles
                authButtons.style.display = 'flex';
                userDropdown.style.display = 'none';
                
                // 2. Add/remove classes
                authButtons.classList.remove('d-none');
                authButtons.classList.add('d-flex');
                userDropdown.classList.add('d-none');
                
                // 3. Set visibility
                authButtons.hidden = false;
                userDropdown.hidden = true;
                
                // Force DOM reflow to ensure changes take effect
                void authButtons.offsetWidth;
                void userDropdown.offsetWidth;
                
                console.log("UI updated for logged out state");
            }
        } else {
            console.error("Could not find auth buttons or user dropdown elements");
        }
    }
    
    // Initialize UI - Call this function first as soon as the page loads
    console.log("Initializing UI based on authentication status");
    updateUIBasedOnAuth();
    
    // Add an additional check after a short delay to ensure the UI is properly updated
    setTimeout(() => {
        console.log("Running delayed UI update check");
        updateUIBasedOnAuth();
        
        // Force-fix auth buttons if needed
        const isLoggedIn = isAuthenticated();
        if (isLoggedIn) {
            const authButtons = document.querySelector('.auth-buttons');
            const navbarCollapse = document.getElementById('navbarNav');
            if (authButtons && navbarCollapse) {
                console.log("Applying direct CSS fix for auth buttons");
                authButtons.style.cssText = 'display: none !important';  // Use !important to override any other styles
            }
        }
    }, 500);
});

// ===== VALIDATION FUNCTIONS =====

function validateRegistrationForm(data) {
    // Clear previous error messages
    document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    let isValid = true;
    
    // Check if all required fields are filled
    for (const [key, value] of Object.entries(data)) {
        if (!value && key !== 'departmentID' && key !== 'classID' && key !== 'enrollmentYear') {
            addFieldError(key, `Vui lòng nhập ${getFieldLabel(key)}`);
            isValid = false;
        }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
        addFieldError('registerEmail', 'Địa chỉ email không hợp lệ');
        showToast('Lỗi', 'Địa chỉ email không hợp lệ', 'error');
        isValid = false;
    }
    
    // Validate phone number (Vietnamese format)
    const phoneRegex = /^(0|\+84)(\d{9,10})$/;
    if (data.phoneNumber && !phoneRegex.test(data.phoneNumber)) {
        addFieldError('phoneNumber', 'Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxxx)');
        showToast('Lỗi', 'Số điện thoại không hợp lệ', 'error');
        isValid = false;
    }
    
    // Validate student code
    const studentCodeRegex = /^[A-Za-z0-9]{5,10}$/;
    if (data.studentCode && !studentCodeRegex.test(data.studentCode)) {
        addFieldError('studentCode', 'Mã sinh viên phải có 5-10 ký tự chữ và số');
        showToast('Lỗi', 'Mã sinh viên không hợp lệ', 'error');
        isValid = false;
    }
    
    // Check if passwords match
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        addFieldError('confirmPassword', 'Mật khẩu xác nhận không khớp');
        showToast('Lỗi', 'Mật khẩu xác nhận không khớp', 'error');
        isValid = false;
    }
    
    // Validate password strength
    if (data.password && data.password.length < 6) {
        addFieldError('registerPassword', 'Mật khẩu phải có ít nhất 6 ký tự');
        showToast('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự', 'error');
        isValid = false;
    }
    
    // Validate dropdown selections
    if (!data.departmentID) {
        addFieldError('departmentID', 'Vui lòng chọn khoa');
        showToast('Lỗi', 'Vui lòng chọn khoa', 'error');
        isValid = false;
    }
    
    if (!data.classID) {
        addFieldError('classID', 'Vui lòng chọn lớp');
        showToast('Lỗi', 'Vui lòng chọn lớp', 'error');
        isValid = false;
    }
    
    if (!data.enrollmentYear) {
        addFieldError('enrollmentYear', 'Vui lòng chọn năm nhập học');
        showToast('Lỗi', 'Vui lòng chọn năm nhập học', 'error');
        isValid = false;
    }
    
    return isValid;
}

function validatePasswordStrength(password) {
    // Password must be at least 6 characters
    // For better UX, we're not enforcing complex password rules in the client
    // The server-side validation will handle complex validation
    const passwordField = document.getElementById('registerPassword');
    let feedback = '';
    
    if (password.length < 6) {
        feedback = 'Password must be at least 6 characters';
        passwordField.setCustomValidity(feedback);
    } else {
        passwordField.setCustomValidity('');
    }
}

function getFieldLabel(fieldName) {
    const fieldLabels = {
        'fullName': 'họ và tên',
        'studentCode': 'mã sinh viên',
        'email': 'email',
        'registerEmail': 'email',
        'loginEmail': 'email',
        'resetEmail': 'email',
        'phoneNumber': 'số điện thoại',
        'password': 'mật khẩu',
        'registerPassword': 'mật khẩu',
        'loginPassword': 'mật khẩu',
        'confirmPassword': 'xác nhận mật khẩu',
        'departmentID': 'khoa',
        'classID': 'lớp',
        'enrollmentYear': 'năm nhập học'
    };
    
    return fieldLabels[fieldName] || fieldName;
}

// Toast notification system
function showToast(title, message, type = 'info') {
    // Check if toast container exists, if not create it
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
} 