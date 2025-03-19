import { dropdownApi } from './services/api.js';
import { initAuthHandlers } from './handlers/auth.js';
import { updateUIBasedOnAuth, initSmoothScroll, initAnimations } from './utils/ui.js';

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Error', 'Có lỗi xảy ra trong quá trình xử lý dữ liệu', 'error');
});

// Helper function to add field errors
function addFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        
        // Remove any existing error messages
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = errorMessage;
        field.parentNode.appendChild(errorDiv);
    }
} 

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing application...');
    
    try {
        // ===== API CONFIGURATION =====
        const API_BASE_URL = window.location.hostname === "localhost" 
            ? "http://localhost:5083" 
            : `${window.location.protocol}//${window.location.host}`; // Use current domain in production
        
        console.log('API Base URL:', API_BASE_URL);
        
        // Check if we're in production environment
        const isProduction = window.location.hostname !== "localhost";
        console.log('Running in production mode:', isProduction);
        
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

        // Initialize form elements
        initFormElements().catch(error => {
            console.error('Error initializing form elements:', error);
        });
        
        // ===== UTILITY FUNCTIONS =====
        
        // Ensure proper display of UTF-8 characters
        function ensureCorrectEncoding(text) {
            if (!text) return "User";
            try {
                // Simpler approach that doesn't try to decode already decoded text
                return text;
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
                        console.log("JWT payload:", payload);
                        console.log("Role from token:", payload.role);
                        
                        // Normalize the role value
                        let userRole = payload.role;
                        
                        // Check alternative role claim names if role is undefined
                        if (!userRole) {
                            console.log("Role not found in standard claim, checking alternatives");
                            // Try common JWT role claim alternatives
                            if (payload.roles) {
                                userRole = payload.roles;
                                console.log("Found role in 'roles' claim:", userRole);
                            } else if (payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]) {
                                userRole = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
                                console.log("Found role in Microsoft claim format:", userRole);
                            }
                        }
                        
                        if (Array.isArray(userRole)) {
                            // Some JWT implementations return roles as arrays
                            userRole = userRole[0];
                            console.log("Role was in array format, using first value:", userRole);
                        }
                        
                        const userData = {
                            userId: payload.nameid,
                            email: payload.email,
                            fullName: payload.unique_name,
                            role: userRole
                        };
                        
                        console.log("Extracted user data:", userData);
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
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'same-origin'
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
                console.log('Request options:', JSON.stringify({...options, body: options.body ? '[DATA]' : undefined}));
                const response = await fetch(url, options);
                
                console.log(`Response status: ${response.status} ${response.statusText}`);
                
                // Log response headers for debugging
                const headers = {};
                response.headers.forEach((value, key) => {
                    headers[key] = value;
                });
                console.log('Response headers:', headers);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response text:', errorText);
                    
                    let errorMessage;
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.message || getFriendlyErrorMessage(response.status);
                    } catch (e) {
                        errorMessage = errorText || getFriendlyErrorMessage(response.status);
                    }
                    
                    throw new Error(errorMessage);
                }
                
                // Handle response
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const responseData = await response.json();
                        console.log('Response data:', responseData);
                        return responseData;
                    } catch (error) {
                        console.error('JSON parsing error:', error);
                        throw new Error('Failed to parse JSON response');
                    }
                } else {
                    // Handle non-JSON response
                    const textResponse = await response.text();
                    console.log('Returning as text response');
                    return { message: textResponse || 'Success' };
                }
            } catch (error) {
                console.error('API call failed:', error);
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
                if (!departmentSelect) {
                    console.warn('Department select element not found in the DOM');
                    return;
                }
                
                console.log('Loading departments...');
                showToast('Loading', 'Đang tải dữ liệu khoa...', 'info');
                
                // Clear all options except the first one
                while (departmentSelect.options.length > 1) {
                    departmentSelect.remove(1);
                }
                
                try {
                    // Use the dropdownApi to handle different response formats
                    const departments = await dropdownApi.getDepartments();
                    console.log('Processed departments data:', departments);
                    
                    if (!departments || !Array.isArray(departments)) {
                        console.error('Invalid departments data format:', departments);
                        if (isProduction) {
                            // In production, try to load hardcoded departments as fallback
                            console.warn('Using hardcoded departments as fallback in production');
                            loadHardcodedDepartments(departmentSelect);
                            return;
                        } else {
                            showToast('Warning', 'Dữ liệu khoa không đúng định dạng', 'warning');
                            return;
                        }
                    }
                    
                    if (departments.length === 0) {
                        console.warn('No departments found');
                        if (isProduction) {
                            // In production, try to load hardcoded departments as fallback
                            console.warn('Using hardcoded departments as fallback in production');
                            loadHardcodedDepartments(departmentSelect);
                            return;
                        } else {
                            showToast('Warning', 'Không tìm thấy khoa nào trong hệ thống', 'warning');
                            return;
                        }
                    }
                    
                    // Successfully retrieved departments, add them to the select
                    departments.forEach(dept => {
                        if (!dept || typeof dept !== 'object') {
                            console.warn('Invalid department data:', dept);
                            return;
                        }
                        
                        // Convert department property names to lowercase for case-insensitive matching
                        const deptData = {};
                        Object.keys(dept).forEach(key => {
                            deptData[key.toLowerCase()] = dept[key];
                        });
                        
                        const option = document.createElement('option');
                        option.value = deptData.departmentid || deptData.departmentID || '';
                        option.textContent = `${deptData.departmentname || deptData.departmentName || 'Unknown'} (${deptData.departmentcode || deptData.departmentCode || ''})`;
                        departmentSelect.appendChild(option);
                    });
                    
                    console.log(`Successfully loaded ${departments.length} departments`);
                    
                    // Auto-select first department and load related classes
                    if (departments.length > 0 && departmentSelect.options.length > 1) {
                        departmentSelect.selectedIndex = 1; // Select first real option
                        
                        // Trigger change event to load classes
                        const event = new Event('change');
                        departmentSelect.dispatchEvent(event);
                    }
                } catch (apiError) {
                    console.error('API error loading departments:', apiError);
                    if (isProduction) {
                        // In production, try to load hardcoded departments as fallback
                        console.warn('Using hardcoded departments as fallback in production');
                        loadHardcodedDepartments(departmentSelect);
                    } else {
                        throw apiError; // Re-throw for local development
                    }
                }
            } catch (error) {
                console.error('Error loading departments:', error);
                showToast('Error', `Không thể tải dữ liệu khoa: ${error.message}`, 'error');
                
                if (isProduction) {
                    // In production, don't show detailed error messages to users
                    showToast('Warning', 'Không thể tải dữ liệu khoa. Vui lòng thử lại sau.', 'warning');
                    
                    // Use hardcoded departments as fallback in production
                    const departmentSelect = document.getElementById('departmentID');
                    if (departmentSelect) {
                        loadHardcodedDepartments(departmentSelect);
                    }
                }
            }
        }
        
        // Fallback function for production environment
        function loadHardcodedDepartments(departmentSelect) {
            const hardcodedDepartments = [
                { departmentID: 1, departmentName: "Computer Science", departmentCode: "CS" },
                { departmentID: 2, departmentName: "Information Technology", departmentCode: "IT" },
                { departmentID: 3, departmentName: "Business Administration", departmentCode: "BA" },
                { departmentID: 4, departmentName: "Electrical Engineering", departmentCode: "EE" },
                { departmentID: 5, departmentName: "Khoa CNTT & TT", departmentCode: "CNTT" },
                { departmentID: 6, departmentName: "Khoa Quản Trị Và Kinh Doanh", departmentCode: "QTKD" },
                { departmentID: 7, departmentName: "Khoa Ngôn Ngữ Hàn", departmentCode: "NNH" },
                { departmentID: 8, departmentName: "Khoa Ngôn Ngữ Nhật", departmentCode: "NNN" }
            ];
            
            console.log('Loading hardcoded departments:', hardcodedDepartments);
            
            hardcodedDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.departmentID;
                option.textContent = `${dept.departmentName} (${dept.departmentCode})`;
                departmentSelect.appendChild(option);
            });
            
            console.log(`Successfully loaded ${hardcodedDepartments.length} hardcoded departments`);
            
            // Auto-select first department
            if (departmentSelect.options.length > 1) {
                departmentSelect.selectedIndex = 1;
                
                // Trigger the change event
                const event = new Event('change');
                departmentSelect.dispatchEvent(event);
            }
        }
        
        // Load classes by department
        async function loadClasses(departmentId = null) {
            try {
                const classSelect = document.getElementById('classID');
                if (!classSelect) {
                    console.warn('Class select element not found in the DOM');
                    return;
                }
                
                console.log(`Loading classes for department ID: ${departmentId || 'all'}`);
                showToast('Loading', 'Đang tải dữ liệu lớp...', 'info');
                
                // Clear all options except the first one
                while (classSelect.options.length > 1) {
                    classSelect.remove(1);
                }
                
                try {
                    // Use the dropdownApi to handle different response formats
                    const classes = await dropdownApi.getClasses(departmentId);
                    console.log('Processed classes data:', classes);
                    
                    if (!classes || !Array.isArray(classes)) {
                        console.error('Invalid classes data format:', classes);
                        if (isProduction) {
                            // In production, try to load hardcoded classes as fallback
                            console.warn('Using hardcoded classes as fallback in production');
                            loadHardcodedClasses(classSelect, departmentId);
                            return;
                        } else {
                            showToast('Warning', 'Dữ liệu lớp không đúng định dạng', 'warning');
                            return;
                        }
                    }
                    
                    if (classes.length === 0) {
                        console.warn(`No classes found for department ID ${departmentId}`);
                        if (isProduction) {
                            // In production, try to load hardcoded classes as fallback
                            console.warn('Using hardcoded classes as fallback in production');
                            loadHardcodedClasses(classSelect, departmentId);
                            return;
                        } else {
                            showToast('Warning', 'Không tìm thấy lớp nào cho khoa đã chọn', 'warning');
                            return;
                        }
                    }
                    
                    // Successfully retrieved classes, add them to the select
                    classes.forEach(cls => {
                        if (!cls || typeof cls !== 'object') {
                            console.warn('Invalid class data:', cls);
                            return;
                        }
                        
                        const option = document.createElement('option');
                        option.value = cls.classID;
                        option.textContent = cls.className;
                        option.dataset.departmentId = cls.departmentID;
                        classSelect.appendChild(option);
                    });
                    
                    console.log(`Successfully loaded ${classes.length} classes`);
                } catch (apiError) {
                    console.error('API error loading classes:', apiError);
                    if (isProduction) {
                        // In production, try to load hardcoded classes as fallback
                        console.warn('Using hardcoded classes as fallback in production');
                        loadHardcodedClasses(classSelect, departmentId);
                    } else {
                        throw apiError; // Re-throw for local development
                    }
                }
            } catch (error) {
                console.error('Error loading classes:', error);
                showToast('Error', `Không thể tải dữ liệu lớp: ${error.message}`, 'error');
                
                if (isProduction) {
                    // In production, don't show detailed error messages to users
                    showToast('Warning', 'Không thể tải dữ liệu lớp. Vui lòng thử lại sau.', 'warning');
                }
            }
        }
        
        // Fallback function for production environment
        function loadHardcodedClasses(classSelect, departmentId = null) {
            // Hardcoded classes data for fallback
            const hardcodedClasses = [
                // CS Department
                { classID: 1, className: "CS - K2022 - Lớp A", classCode: "CS22A", departmentID: 1 },
                { classID: 2, className: "CS - K2022 - Lớp B", classCode: "CS22B", departmentID: 1 },
                { classID: 3, className: "CS - K2023 - Lớp A", classCode: "CS23A", departmentID: 1 },
                
                // IT Department
                { classID: 4, className: "IT - K2022 - Lớp A", classCode: "IT22A", departmentID: 2 },
                { classID: 5, className: "IT - K2023 - Lớp A", classCode: "IT23A", departmentID: 2 },
                
                // BA Department
                { classID: 6, className: "BA - K2022 - Lớp A", classCode: "BA22A", departmentID: 3 },
                { classID: 7, className: "BA - K2023 - Lớp A", classCode: "BA23A", departmentID: 3 },
                
                // EE Department
                { classID: 8, className: "EE - K2022 - Lớp A", classCode: "EE22A", departmentID: 4 },
                { classID: 9, className: "EE - K2023 - Lớp A", classCode: "EE23A", departmentID: 4 },
                
                // CNTT Department
                { classID: 10, className: "CNTT - K2022 - Lớp A", classCode: "CNTT22A", departmentID: 5 },
                { classID: 11, className: "CNTT - K2023 - Lớp A", classCode: "CNTT23A", departmentID: 5 },
                
                // QTKD Department
                { classID: 12, className: "QTKD - K2022 - Lớp A", classCode: "QTKD22A", departmentID: 6 },
                { classID: 13, className: "QTKD - K2023 - Lớp A", classCode: "QTKD23A", departmentID: 6 },
                
                // NNH Department
                { classID: 14, className: "NNH - K2022 - Lớp A", classCode: "NNH22A", departmentID: 7 },
                { classID: 15, className: "NNH - K2023 - Lớp A", classCode: "NNH23A", departmentID: 7 },
                
                // NNN Department
                { classID: 16, className: "NNN - K2022 - Lớp A", classCode: "NNN22A", departmentID: 8 },
                { classID: 17, className: "NNN - K2023 - Lớp A", classCode: "NNN23A", departmentID: 8 }
            ];
            
            // Filter by department ID if specified
            const filteredClasses = departmentId 
                ? hardcodedClasses.filter(cls => cls.departmentID == departmentId) 
                : hardcodedClasses;
            
            console.log(`Loading hardcoded classes for department ${departmentId || 'all'}:`, filteredClasses);
            
            filteredClasses.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.classID;
                option.textContent = cls.className;
                option.dataset.departmentId = cls.departmentID;
                classSelect.appendChild(option);
            });
            
            console.log(`Successfully loaded ${filteredClasses.length} hardcoded classes`);
        }
        
        // Load enrollment years
        async function loadEnrollmentYears() {
            try {
                const yearSelect = document.getElementById('enrollmentYear');
                if (!yearSelect) {
                    console.warn('Enrollment year select element not found in the DOM');
                    return;
                }
                
                console.log('Loading enrollment years...');
                
                // Clear all options except the first one
                while (yearSelect.options.length > 1) {
                    yearSelect.remove(1);
                }
                
                try {
                    // Use the dropdownApi to handle different response formats
                    const years = await dropdownApi.getEnrollmentYears();
                    console.log('Processed enrollment years data:', years);
                    
                    if (!years || !Array.isArray(years)) {
                        console.error('Invalid enrollment years data format:', years);
                        if (isProduction) {
                            // In production, use hardcoded years as fallback
                            console.warn('Using hardcoded enrollment years as fallback in production');
                            loadHardcodedEnrollmentYears(yearSelect);
                            return;
                        } else {
                            showToast('Warning', 'Dữ liệu năm nhập học không đúng định dạng', 'warning');
                            return;
                        }
                    }
                    
                    if (years.length === 0) {
                        console.warn('No enrollment years found');
                        if (isProduction) {
                            // In production, use hardcoded years as fallback
                            console.warn('Using hardcoded enrollment years as fallback in production');
                            loadHardcodedEnrollmentYears(yearSelect);
                            return;
                        } else {
                            showToast('Warning', 'Không tìm thấy dữ liệu năm nhập học', 'warning');
                            return;
                        }
                    }
                    
                    // Successfully retrieved enrollment years, add them to the select
                    years.forEach(year => {
                        // Convert to string to ensure consistency
                        const yearValue = String(year);
                        
                        const option = document.createElement('option');
                        option.value = yearValue;
                        option.textContent = yearValue;
                        yearSelect.appendChild(option);
                    });
                    
                    console.log(`Successfully loaded ${years.length} enrollment years`);
                } catch (apiError) {
                    console.error('API error loading enrollment years:', apiError);
                    if (isProduction) {
                        // In production, use hardcoded years as fallback
                        console.warn('Using hardcoded enrollment years as fallback in production');
                        loadHardcodedEnrollmentYears(yearSelect);
                    } else {
                        throw apiError; // Re-throw for local development
                    }
                }
            } catch (error) {
                console.error('Error loading enrollment years:', error);
                showToast('Error', `Không thể tải dữ liệu năm nhập học: ${error.message}`, 'error');
                
                if (isProduction) {
                    // In production, don't show detailed error messages to users
                    showToast('Warning', 'Không thể tải dữ liệu năm nhập học. Vui lòng thử lại sau.', 'warning');
                    
                    // Use hardcoded years as fallback in production
                    const yearSelect = document.getElementById('enrollmentYear');
                    if (yearSelect) {
                        loadHardcodedEnrollmentYears(yearSelect);
                    }
                }
            }
        }
        
        // Fallback function for production environment
        function loadHardcodedEnrollmentYears(yearSelect) {
            // Generate current year and previous 10 years
            const currentYear = new Date().getFullYear();
            const years = Array.from({length: 11}, (_, i) => currentYear - i);
            
            console.log('Loading hardcoded enrollment years:', years);
            
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
            
            console.log(`Successfully loaded ${years.length} hardcoded enrollment years`);
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
        $('#registerModal').on('show.bs.modal', async function() {
            try {
                console.log('Register modal is being shown, loading dropdown data...');
                
                // Load departments with retry mechanism
                try {
                    await retryApiCall(loadDepartments);
                    console.log('Successfully loaded departments for register modal');
                } catch (deptError) {
                    console.error('Failed to load departments after retries:', deptError);
                }
                
                // Load enrollment years with retry mechanism
                try {
                    await retryApiCall(loadEnrollmentYears);
                    console.log('Successfully loaded enrollment years for register modal');
                } catch (yearError) {
                    console.error('Failed to load enrollment years after retries:', yearError);
                }
            } catch (error) {
                console.error('Error loading dropdown data for register modal:', error);
                showToast('Error', 'Không thể tải dữ liệu cho biểu mẫu. Vui lòng thử lại.', 'error');
            }
        });
        
        // Handle "Forgot Password" link click
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

        // Handle logout button click
        async function handleLogout(e) {
            if (e) e.preventDefault();
            
            console.log("Logout button clicked");
            
            try {
                await logout();
                console.log("Logout successful");
                
                // Update UI to reflect logged out state
                updateUIBasedOnAuth();
                
                // Redirect to home page
                window.location.href = "/";
            } catch (error) {
                console.error("Logout failed:", error);
                showToast("Error", "Failed to log out: " + error.message, "error");
            }
        }
        
        // Add event listener to both logout buttons (for both menus)
        document.addEventListener('DOMContentLoaded', function() {
            const logoutButtons = document.querySelectorAll('#logoutButton');
            logoutButtons.forEach(button => {
                button.addEventListener('click', handleLogout);
            });
        });
        
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
            console.log("Updating UI based on authentication state");
            
            try {
                const isUserAuthenticated = isAuthenticated();
                console.log("Is user authenticated:", isUserAuthenticated);
                
                const authButtons = document.querySelector('.auth-buttons');
                const userDropdown = document.querySelector('.user-dropdown');
                const studentMenu = document.querySelector('.student-menu');
                const accountantMenu = document.querySelector('.accountant-menu');
                
                if (isUserAuthenticated) {
                    console.log("User is authenticated, showing user dropdown");
                    
                    // Get user data and directly normalize role
                    const userData = JSON.parse(localStorage.getItem(USER_KEY) || '{"fullName":"User"}');
                    console.log("User data for UI:", userData);
                    
                    // Get the role from either role or userType property
                    const userRole = userData.role || userData.userType || 'Student';
                    console.log("User role from data (normalized):", userRole);
                    
                    // Update user name and role in dropdown
                    const userNameElement = document.querySelector('.user-name');
                    const userRoleIndicator = document.getElementById('userRoleIndicator');
                    
                    if (userNameElement) {
                        userNameElement.textContent = ensureCorrectEncoding(userData.fullName || 'User');
                    }
                    
                    if (userRoleIndicator) {
                        userRoleIndicator.textContent = userRole;
                        userRoleIndicator.className = 'user-role'; // Reset class
                        userRoleIndicator.classList.add('role-' + userRole.toLowerCase());
                    }
                    
                    // Display the appropriate menu based on user role
                    if (userDropdown) {
                        userDropdown.style.display = 'block';
                        
                        // Debug the actual role value
                        console.log("Using role value for menu selection:", userRole);
                        
                        // Get menu items by class
                        const studentItems = document.querySelectorAll('.student-item');
                        const accountantItems = document.querySelectorAll('.accountant-item');
                        
                        // Check user role and show the appropriate menu items
                        if (userRole && userRole.toLowerCase() === 'accountant') {
                            console.log("User is an Accountant, showing accountant menu items");
                            
                            // Hide student items
                            studentItems.forEach(item => {
                                item.style.display = 'none';
                            });
                            
                            // Show accountant items
                            accountantItems.forEach(item => {
                                item.style.display = '';
                            });
                        } else {
                            // Default to Student role menu
                            console.log("User is a Student or other role, showing student menu items");
                            
                            // Show student items
                            studentItems.forEach(item => {
                                item.style.display = '';
                            });
                            
                            // Hide accountant items
                            accountantItems.forEach(item => {
                                item.style.display = 'none';
                            });
                        }
                    }
                    
                    // Hide auth buttons when authenticated
                    if (authButtons) {
                        authButtons.style.display = 'none';
                    }
                    
                    // Add authenticated class to body for CSS targeting
                    document.body.classList.add('authenticated');
                    
                } else {
                    console.log("User is not authenticated, showing auth buttons");
                    
                    // Show auth buttons
                    if (authButtons) {
                        authButtons.style.display = 'flex';
                    }
                    
                    // Hide user dropdown
                    if (userDropdown) {
                        userDropdown.style.display = 'none';
                    }
                    
                    // Remove authenticated class from body
                    document.body.classList.remove('authenticated');
                }
            } catch (error) {
                console.error("Error updating UI based on auth:", error);
            }
        }
        
        // Initialize UI - Call this function first as soon as the page loads
        console.log("Initializing UI based on authentication status");
        updateUIBasedOnAuth();
        
        // Initialize all auth handlers
        initAuthHandlers();
        
        // Initialize smooth scrolling
        initSmoothScroll();
        
        // Initialize animations
        initAnimations();
        
        // Add a forced menu check as early as possible
        document.addEventListener('DOMContentLoaded', function() {
            console.log("DOM content loaded - applying menu visibility immediately");
            // Execute immediately without timeout
            try {
                window.forceCorrectMenu();
            } catch (error) {
                console.error("Error in immediate menu check:", error);
            }
        });
        
        // Also run on window load just to be safe
        window.addEventListener('load', function() {
            console.log("Window loaded - ensuring correct menu visibility");
            window.forceCorrectMenu();
        });

        // Function to retry failed API calls
        async function retryApiCall(fn, maxRetries = 3, delay = 1000) {
            let lastError;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Attempt ${attempt}/${maxRetries}...`);
                    return await fn();
                } catch (error) {
                    console.warn(`Attempt ${attempt} failed:`, error);
                    lastError = error;
                    
                    if (attempt < maxRetries) {
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        // Increase delay for next retry (exponential backoff)
                        delay *= 2;
                    }
                }
            }
            
            // All retries failed
            console.error(`All ${maxRetries} retry attempts failed.`);
            throw lastError;
        }

        // Initialize form select elements
        async function initFormElements() {
            try {
                console.log('Initializing form elements...');
                
                // Load departments with retry mechanism
                await retryApiCall(loadDepartments);
                
                // Load enrollment years with retry mechanism
                await retryApiCall(loadEnrollmentYears);
                
                // Listen for department changes
                const departmentSelect = document.getElementById('departmentID');
                if (departmentSelect) {
                    console.log('Setting up department change listener');
                    departmentSelect.addEventListener('change', async function() {
                        if (this.value) {
                            try {
                                await retryApiCall(() => loadClasses(this.value));
                            } catch (error) {
                                console.error('Failed to load classes after multiple retries:', error);
                                showToast('Error', 'Không thể tải dữ liệu lớp sau nhiều lần thử', 'error');
                            }
                        }
                    });
                }
                
                console.log('Form elements initialized successfully');
            } catch (error) {
                console.error('Failed to initialize form elements:', error);
                showToast('Error', 'Không thể khởi tạo biểu mẫu', 'error');
            }
        }

        // Call this in your document.ready function
        function initFormHandlers() {
            console.log('Initializing form handlers...');
            initFormElements().catch(error => {
                console.error('Error initializing form elements:', error);
                showToast('Error', 'Không thể khởi tạo biểu mẫu', 'error');
            });
        }

        // FOR DEBUGGING: Function to manually set user role
        window.setUserRole = function(role) {
            try {
                const userData = JSON.parse(localStorage.getItem(USER_KEY) || '{"fullName":"User"}');
                userData.role = role;
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                console.log("User role manually set to:", role);
                updateUIBasedOnAuth();
                return "User role updated to: " + role;
            } catch (error) {
                console.error("Error setting user role:", error);
                return "Error: " + error.message;
            }
        };
        
        // FOR DEBUGGING: Function to check current user data
        window.checkUserData = function() {
            try {
                const userData = JSON.parse(localStorage.getItem(USER_KEY) || '{"fullName":"User"}');
                console.log("Current user data:", userData);
                return userData;
            } catch (error) {
                console.error("Error checking user data:", error);
                return "Error: " + error.message;
            }
        };

        // FOR DEBUGGING: Function to force display the correct menu
        window.forceCorrectMenu = function() {
            try {
                const userData = JSON.parse(localStorage.getItem(USER_KEY) || '{"fullName":"User"}');
                const userRole = userData.role || userData.userType || '';
                console.log("Setting menu items for role:", userRole);
                
                const studentItems = document.querySelectorAll('.student-item');
                const accountantItems = document.querySelectorAll('.accountant-item');
                
                if (userRole.toLowerCase() === 'accountant') {
                    console.log("Displaying ACCOUNTANT menu items");
                    
                    // Hide student items
                    studentItems.forEach(item => {
                        item.style.display = 'none';
                    });
                    
                    // Show accountant items
                    accountantItems.forEach(item => {
                        item.style.display = '';
                    });
                    
                    return "Accountant menu items displayed";
                } else {
                    console.log("Displaying STUDENT menu items");
                    
                    // Show student items
                    studentItems.forEach(item => {
                        item.style.display = '';
                    });
                    
                    // Hide accountant items
                    accountantItems.forEach(item => {
                        item.style.display = 'none';
                    });
                    
                    return "Student menu items displayed";
                }
            } catch (error) {
                console.error("Error setting menu items:", error);
                return "Error: " + error.message;
            }
        };
    } catch (error) {
        console.error('Error during application initialization:', error);
        showToast('Error', 'Không thể khởi tạo ứng dụng', 'error');
    }
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