import { API_ENDPOINTS } from '../config.js';
import { getAuthToken } from '../utils/auth.js';

// Generic API call function with enhanced error handling
async function apiCall(url, method = 'GET', data = null, requiresAuth = false) {
    console.log(`Making ${method} request to: ${url}`);
    
    // Detect if we're on production server
    const isProduction = window.location.hostname !== "localhost";
    if (isProduction) {
        console.log('Running in production environment');
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
        
        // For all environments, log the raw response text for debugging
        const responseClone = response.clone();
        const rawText = await responseClone.text();
        console.log('Raw response text:', rawText);
        
        if (!rawText || rawText.trim() === '') {
            console.error('Empty response received from server');
            return [];  // Return empty array as fallback
        }
        
        try {
            // Try to parse the raw text manually
            const parsedData = JSON.parse(rawText);
            console.log('Successfully parsed JSON response:', parsedData);
            
            // Check if not OK status
            if (!response.ok) {
                const errorMessage = parsedData.message || getFriendlyErrorMessage(response.status);
                console.error('Error response with parsed JSON:', errorMessage);
                throw new Error(errorMessage);
            }
            
            // Check if the response has $id and $values properties (ASP.NET format)
            if (parsedData && parsedData.$id && parsedData.$values) {
                console.log('Detected ASP.NET serialization format with $values');
                return parsedData; // Return the whole object, the api functions will extract $values
            }
            
            return parsedData;
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            
            // Check if not OK status
            if (!response.ok) {
                const errorMessage = rawText || getFriendlyErrorMessage(response.status);
                console.error('Error response with text:', errorMessage);
                throw new Error(errorMessage);
            }
            
            return [];  // Return empty array as fallback
        }
    } catch (error) {
        console.error(`API call error (${method} ${url}):`, error);
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
    getProfile: async () => {
        try {
            const result = await apiCall(`${API_ENDPOINTS.USERS}/profile`, 'GET', null, true);
            console.log('API getProfile raw response:', result);
            
            // Debug check for class info
            if (result && result.class_) {
                console.log('API returned class_ field:', result.class_);
            } else if (result && result.class) {
                console.log('API returned class field:', result.class);
            } else {
                console.log('API response does not contain class or class_ field');
                // Log all keys to see what's available
                if (result) {
                    console.log('Available keys in API response:', Object.keys(result));
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error in getProfile:', error);
            throw error;
        }
    },
        
    updateProfile: (formData) => 
        apiCall(`${API_ENDPOINTS.USERS}/profile`, 'PUT', formData, true),
        
    changePassword: (passwordData) => 
        apiCall(`${API_ENDPOINTS.USERS}/change-password`, 'POST', passwordData, true),
        
    updateTwoFactorAuth: (isEnabled) => 
        apiCall(`${API_ENDPOINTS.USERS}/two-factor`, 'POST', { isEnabled }, true)
};

// Dropdown data API calls
export const dropdownApi = {
    getDepartments: async () => {
        try {
            console.log('Getting departments...');
            const response = await apiCall(`${API_ENDPOINTS.DROPDOWN}/departments`);
            console.log('Raw departments response:', response);
            
            // Handle various response formats
            if (!response) {
                console.warn('Empty response from departments API');
                return [];
            }
            
            // Check if it's the special response format with $values
            if (response.$values) {
                console.log('Response contains $values array with', response.$values.length, 'items');
                
                // Sửa tên thuộc tính để trùng khớp với dữ liệu trả về
                const uniqueValues = Array.from(new Set(response.$values.map(item => item.departmentID)))
                    .map(id => response.$values.find(item => item.departmentID === id));
                return uniqueValues;
            }
            
            // Check if it's already an array
            if (Array.isArray(response)) {
                console.log('Response is an array with', response.length, 'items');
                
                // Sửa tên thuộc tính để trùng khớp với dữ liệu trả về
                const uniqueValues = Array.from(new Set(response.map(item => item.departmentID)))
                    .map(id => response.find(item => item.departmentID === id));
                return uniqueValues;
            }
            
            // Try to check if response is a JSON string
            if (typeof response === 'string') {
                try {
                    const parsedResponse = JSON.parse(response);
                    console.log('Parsed string response:', parsedResponse);
                    
                    if (parsedResponse.$values) {
                        console.log('Parsed response contains $values with', parsedResponse.$values.length, 'items');
                        return parsedResponse.$values;
                    }
                    
                    if (Array.isArray(parsedResponse)) {
                        console.log('Parsed response is an array with', parsedResponse.length, 'items');
                        return parsedResponse;
                    }
                } catch (error) {
                    console.error('Error parsing response string:', error);
                }
            }
            
            // Log all properties of the response for debugging
            console.log('Response properties:', Object.keys(response));
            
            // If it's some other object, try to extract departments from it
            console.warn('Unexpected response format:', response);
            return [];
        } catch (error) {
            console.error('Error in getDepartments:', error);
            return []; // Return empty array instead of propagating error
        }
    },
        
    getClasses: async (departmentId = null) => {
        try {
            const url = departmentId 
                ? `${API_ENDPOINTS.DROPDOWN}/classes?departmentId=${departmentId}` 
                : `${API_ENDPOINTS.DROPDOWN}/classes`;
                
            console.log('Getting classes...', departmentId ? `for department ${departmentId}` : 'for all departments');
            console.log('API call stack trace:', new Error().stack);
            console.log('API call timestamp:', new Date().toISOString());
            
            const response = await apiCall(url);
            console.log('Raw classes response:', response);
            
            // Handle various response formats
            if (!response) {
                console.warn('Empty response from classes API');
                return [];
            }
            
            // Lấy mảng dữ liệu chính xác từ response
            let classData = [];
            
            // Check if response has $values property - this is the primary case
            if (response && response.$values && Array.isArray(response.$values)) {
                console.log(`Found ${response.$values.length} classes in $values property`);
                classData = response.$values;
            } 
            // Check if response is a plain array
            else if (Array.isArray(response)) {
                console.log(`Found ${response.length} classes in array response`);
                classData = response;
            }
            // Handle other formats
            else {
                console.warn('Unexpected response format, checking if response is JSON object');
                // If response is an object without $values but with numeric keys, it might be an array-like object
                if (typeof response === 'object') {
                    let possibleArrayData = [];
                    let hasNumericKeys = false;
                    
                    for (let key in response) {
                        // Skip $id and $values properties
                        if (key === '$id' || key === '$values') continue;
                        
                        // Check if the key is numeric, indicating an array-like object
                        if (!isNaN(parseInt(key))) {
                            hasNumericKeys = true;
                            if (response[key] && typeof response[key] === 'object' && 
                                response[key].classID) {
                                possibleArrayData.push(response[key]);
                            }
                        }
                    }
                    
                    if (hasNumericKeys && possibleArrayData.length > 0) {
                        console.log(`Extracted ${possibleArrayData.length} classes from object with numeric keys`);
                        classData = possibleArrayData;
                    } else {
                        console.warn('Could not extract class data from response');
                    }
                } else {
                    console.warn('Response is neither an object nor an array');
                }
            }
            
            console.log(`Original data contains ${classData.length} classes`);
            
            // Filter out duplicates based on classID
            const uniqueClassData = [];
            const seenClassIDs = new Set();
            
            classData.forEach(cls => {
                if (cls && cls.classID && !seenClassIDs.has(cls.classID)) {
                    seenClassIDs.add(cls.classID);
                    uniqueClassData.push(cls);
                }
            });
            
            console.log(`After removing duplicates: ${uniqueClassData.length} unique classes`);
            console.log('Final classes data:', uniqueClassData);
            
            return uniqueClassData;
        } catch (error) {
            console.error('Error in getClasses:', error);
            return []; // Return empty array instead of propagating error
        }
    },
        
    getEnrollmentYears: async () => {
        try {
            console.log('Getting enrollment years...');
            const response = await apiCall(`${API_ENDPOINTS.DROPDOWN}/enrollment-years`);
            console.log('Raw enrollment years response:', response);
            
            // Handle various response formats
            if (!response) {
                console.warn('Empty response from enrollment years API');
                return [];
            }
            
            // Check if it's the special response format with $values
            if (response.$values) {
                console.log('Response contains $values array with', response.$values.length, 'items');
                return response.$values;
            }
            
            // Check if it's already an array
            if (Array.isArray(response)) {
                console.log('Response is an array with', response.length, 'items');
                return response;
            }
            
            // Try to check if response is a JSON string
            if (typeof response === 'string') {
                try {
                    const parsedResponse = JSON.parse(response);
                    console.log('Parsed string response:', parsedResponse);
                    
                    if (parsedResponse.$values) {
                        console.log('Parsed response contains $values with', parsedResponse.$values.length, 'items');
                        return parsedResponse.$values;
                    }
                    
                    if (Array.isArray(parsedResponse)) {
                        console.log('Parsed response is an array with', parsedResponse.length, 'items');
                        return parsedResponse;
                    }
                } catch (error) {
                    console.error('Error parsing response string:', error);
                }
            }
            
            // Log all properties of the response for debugging
            console.log('Response properties:', Object.keys(response));
            
            // If it's some other object, try to extract years from it
            console.warn('Unexpected response format:', response);
            return [];
        } catch (error) {
            console.error('Error in getEnrollmentYears:', error);
            return []; // Return empty array instead of propagating error
        }
    }
};

// Student Tuition API calls
export const tuitionApi = {
    testStudentTuition: () =>
        apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/Test`, 'GET', null, false),
        
    checkData: () =>
        apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/CheckData`, 'GET', null, false),
        
    getStudentFees: async (studentId) => {
        console.log(`Calling getStudentFees API for studentId: ${studentId}`);
        try {
            const result = await apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/GetStudentFees/${studentId}`, 'GET', null, true);
            console.log(`GetStudentFees API returned data type: ${typeof result}, is array: ${Array.isArray(result)}`);
            return result;
        } catch (error) {
            console.error(`Error in getStudentFees API call: ${error.message}`);
            throw error;
        }
    },
        
    getCurrentSemesterFees: async (studentId) => {
        console.log(`Calling getCurrentSemesterFees API for studentId: ${studentId}`);
        try {
            const result = await apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/GetCurrentSemesterFees/${studentId}`, 'GET', null, true);
            console.log(`GetCurrentSemesterFees API returned data type: ${typeof result}, is array: ${Array.isArray(result)}`);
            return result;
        } catch (error) {
            console.error(`Error in getCurrentSemesterFees API call: ${error.message}`);
            throw error;
        }
    },
        
    getUnpaidFees: async (studentId) => {
        console.log(`Calling getUnpaidFees API for studentId: ${studentId}`);
        try {
            const result = await apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/GetUnpaidFees/${studentId}`, 'GET', null, true);
            console.log(`GetUnpaidFees API returned data type: ${typeof result}, is array: ${Array.isArray(result)}`);
            if (Array.isArray(result)) {
                console.log(`Array length: ${result.length}`);
            }
            return result;
        } catch (error) {
            console.error(`Error in getUnpaidFees API call: ${error.message}`);
            throw error;
        }
    },

    // Get fee details for a specific fee
    getFeeDetails: (feeId) => 
        apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/GetFeeDetails/${feeId}`, 'GET', null, true),

    // Get payment history for a student
    getPaymentHistory: (studentId) => 
        apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/GetPaymentHistory/${studentId}`, 'GET', null, true),
        
    // Get payment details
    getPaymentDetails: (paymentId) => 
        apiCall(`${API_ENDPOINTS.STUDENT_TUITION}/GetPaymentDetails/${paymentId}`, 'GET', null, true),
        
    // Download invoice
    downloadInvoice: async (paymentId) => {
        try {
            const token = getAuthToken();
            const response = await fetch(
                `${API_ENDPOINTS.STUDENT_TUITION}/DownloadInvoice/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'invoice.pdf';
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            throw error;
        }
    }
};