// API Configuration
const API_BASE_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5083" 
    : `${window.location.protocol}//${window.location.host}`;

// API Endpoints
const API_ENDPOINTS = {
    AUTH: `${API_BASE_URL}/api/auth`,
    USERS: `${API_BASE_URL}/api/users`,
    DROPDOWN: `${API_BASE_URL}/api/dropdowndata`,
    STUDENT_TUITION: `${API_BASE_URL}/api/StudentTuition`
};

// Local Storage Keys
const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data'
};

export { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS }; 