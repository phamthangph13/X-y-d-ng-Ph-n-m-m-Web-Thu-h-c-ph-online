import { STORAGE_KEYS } from '../config.js';

// Save auth token to localStorage
export function saveAuthToken(tokenData) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, tokenData.token);
    if (tokenData.user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(tokenData.user));
    } else {
        try {
            const tokenParts = tokenData.token.split('.');
            if (tokenParts.length === 3) {
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
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            }
        } catch (error) {
            console.error("Failed to extract user data from token:", error);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({fullName: "User"}));
        }
    }
}

// Clear auth token from localStorage
export function clearAuthToken() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    document.body.classList.remove('authenticated');
}

// Get auth token from localStorage
export function getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

// Check if user is authenticated
export function isAuthenticated() {
    return !!getAuthToken();
}

// Get user data
export function getUserData() {
    try {
        const userData = localStorage.getItem(STORAGE_KEYS.USER);
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Ensure proper display of UTF-8 characters
export function ensureCorrectEncoding(text) {
    if (!text) return "User";
    try {
        return decodeURIComponent(escape(text));
    } catch (e) {
        console.error("Error normalizing text:", e);
        return text;
    }
} 