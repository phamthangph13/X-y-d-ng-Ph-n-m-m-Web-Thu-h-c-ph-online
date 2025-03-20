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
        const parsedData = userData ? JSON.parse(userData) : null;
        
        console.log('getUserData from localStorage:', parsedData);
        
        // Debug check for class info in localStorage
        if (parsedData && parsedData.class_) {
            console.log('localStorage has class_ field:', parsedData.class_);
        } else if (parsedData && parsedData.class) {
            console.log('localStorage has class field:', parsedData.class);
        } else {
            console.log('localStorage data does not contain class or class_ field');
            // Log all keys to see what's available
            if (parsedData) {
                console.log('Available keys in localStorage:', Object.keys(parsedData));
            }
        }
        
        return parsedData;
    } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
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

/**
 * Authentication utility functions
 */

const TOKEN_KEY = 'auth_token';
const REDIRECT_URL = 'login.html';

/**
 * Check if user is authenticated and redirect to login page if not
 * @returns {boolean} True if authenticated, false otherwise
 */
export function checkAuth() {
    const token = getAuthToken();
    
    if (!token) {
        // Redirect to login page if not authenticated
        window.location.href = REDIRECT_URL;
        return false;
    }
    
    return true;
}

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The authentication token or null if not found
 */
export function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the authentication token in localStorage
 * @param {string} token - The authentication token to store
 */
export function setAuthToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the authentication token from localStorage and redirect to login page
 */
export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = REDIRECT_URL;
}

/**
 * Initialize authentication for development/demo purposes
 * This would be removed in a production environment
 */
export function initDemoAuth() {
    // For development/demo only: create a fake token if none exists
    if (!getAuthToken()) {
        setAuthToken('demo_token_for_development');
        console.log('Demo authentication initialized');
    }
} 