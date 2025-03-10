import { API_ENDPOINTS } from '../config.js';
import { getAuthToken } from '../utils/auth.js';

// Generic API call function with error handling
async function apiCall(url, method = 'GET', data = null, requiresAuth = false) {
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
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.message || getFriendlyErrorMessage(response.status));
            }
            return responseData;
        } else {
            const textResponse = await response.text();
            if (!response.ok) {
                throw new Error(getFriendlyErrorMessage(response.status, textResponse));
            }
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
function getFriendlyErrorMessage(statusCode, responseText = '') {
    if (responseText) {
        if (responseText.includes('Invalid email or password')) {
            return 'Email hoặc mật khẩu không đúng';
        } else if (responseText.includes('Account is not active')) {
            return 'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email để xác thực tài khoản.';
        } else if (responseText.includes('Email already exists')) {
            return 'Email này đã được đăng ký';
        } else if (responseText.includes('Student code already exists')) {
            return 'Mã sinh viên này đã được đăng ký';
        } else if (responseText.includes('Current password is incorrect')) {
            return 'Mật khẩu hiện tại không đúng';
        }
    }

    switch (statusCode) {
        case 400: return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
        case 401: return 'Bạn cần đăng nhập để thực hiện thao tác này.';
        case 403: return 'Bạn không có quyền thực hiện thao tác này.';
        case 404: return 'Không tìm thấy thông tin yêu cầu.';
        case 500: return 'Có lỗi xảy ra từ hệ thống. Vui lòng thử lại sau.';
        case 503: return 'Dịch vụ hiện không khả dụng. Vui lòng thử lại sau.';
        default: return 'Có lỗi xảy ra. Vui lòng thử lại.';
    }
}

// Authentication API calls
export const authApi = {
    login: (email, password, rememberMe) => 
        apiCall(`${API_ENDPOINTS.AUTH}/login`, 'POST', { email, password, rememberMe }),
        
    register: (formData) => 
        apiCall(`${API_ENDPOINTS.AUTH}/register`, 'POST', formData),
        
    forgotPassword: (email) => 
        apiCall(`${API_ENDPOINTS.AUTH}/forgot-password`, 'POST', { email }),
        
    logout: () => 
        apiCall(`${API_ENDPOINTS.AUTH}/logout`, 'POST', null, true),
        
    // Profile related API calls
    getProfile: () =>
        apiCall(`${API_ENDPOINTS.USERS}/profile`, 'GET', null, true),
        
    updateProfile: (formData) => 
        apiCall(`${API_ENDPOINTS.USERS}/profile`, 'PUT', formData, true),
        
    changePassword: (passwordData) => 
        apiCall(`${API_ENDPOINTS.USERS}/change-password`, 'POST', passwordData, true),
        
    updateTwoFactorAuth: (isEnabled) => 
        apiCall(`${API_ENDPOINTS.USERS}/two-factor`, 'POST', { isEnabled }, true)
};

// Dropdown data API calls
export const dropdownApi = {
    getDepartments: () => 
        apiCall(`${API_ENDPOINTS.DROPDOWN}/departments`),
        
    getClasses: (departmentId = null) => {
        const url = departmentId 
            ? `${API_ENDPOINTS.DROPDOWN}/classes?departmentId=${departmentId}` 
            : `${API_ENDPOINTS.DROPDOWN}/classes`;
        return apiCall(url);
    },
        
    getEnrollmentYears: () => 
        apiCall(`${API_ENDPOINTS.DROPDOWN}/enrollment-years`)
}; 