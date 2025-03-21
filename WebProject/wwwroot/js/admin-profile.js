import { checkAuth, getUserData, logout, getAuthToken } from './utils/auth.js';
import { showToast } from './utils/toast.js';
import { API_ENDPOINTS, STORAGE_KEYS } from './config.js';

// Check authentication when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // For development only - initialize demo authentication if needed
        // Comment out this line in production
        initDemoAuth();
        
        // Check if user is authenticated
        if (!checkAuth()) {
            return; // checkAuth will redirect to login page if not authenticated
        }

        // Get user data from localStorage
        const userData = getUserData();
        if (userData) {
            document.getElementById('userName').textContent = userData.fullName || 'Admin';
            // Verify this user is admin type - check both role and userType with more permissive OR condition
            if (userData.userType !== 'admin' && userData.role !== 'admin') {
                console.log('User is not admin. userType:', userData.userType, 'role:', userData.role);
                
                // For debugging purposes, log all user data
                console.log('Full user data:', userData);
                
                // For development, allow access regardless of role (remove this in production)
                // window.location.href = 'index.html'; // Redirect non-admin users
                // return;
            }
        } else {
            console.log('No user data found in localStorage');
        }

        // Setup sidebar
        setupSidebar();

        // Setup event listeners
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.getElementById('saveProfileBtn').addEventListener('click', updateProfile);
        document.getElementById('savePasswordBtn').addEventListener('click', changePassword);
        document.getElementById('twoFactorToggle').addEventListener('change', updateTwoFactorAuth);

        // Load user profile data
        await loadUserProfile();
        
        // Load login history data
        await loadLoginHistory();

    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('An error occurred while loading the page. Please try again later.', 'error');
    }
});

// Load user profile data from API
async function loadUserProfile() {
    try {
        const token = getAuthToken(); // Use the function instead of direct localStorage access
        if (!token) return;

        console.log('Fetching user profile with token:', token);
        
        const response = await fetch(`${API_ENDPOINTS.USERS}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch user profile, status:', response.status);
            throw new Error(`Failed to fetch user profile: ${response.status}`);
        }

        const data = await response.json();
        console.log('User profile data received:', data);
        
        if (data.success) {
            // Update profile information in the view
            document.getElementById('userId').textContent = data.userId || '-';
            document.getElementById('userFullName').textContent = data.fullName || '-';
            document.getElementById('userEmail').textContent = data.email || '-';
            document.getElementById('userPhone').textContent = data.phoneNumber || '-';
            document.getElementById('userType').textContent = data.userType || 'Quản trị viên';
            
            // Format dates if they exist
            if (data.registrationDate) {
                document.getElementById('registrationDate').textContent = formatDateTime(new Date(data.registrationDate));
            }
            if (data.lastLogin) {
                document.getElementById('lastLogin').textContent = formatDateTime(new Date(data.lastLogin));
            }
            
            // Update form fields in the edit profile modal
            document.getElementById('editFullName').value = data.fullName || '';
            document.getElementById('editEmail').value = data.email || '';
            document.getElementById('editPhone').value = data.phoneNumber || '';
            
            // Update two-factor toggle
            document.getElementById('twoFactorToggle').checked = data.isTwoFactorEnabled || false;
            
            // Save updated user data to localStorage
            const userData = getUserData() || {};
            const updatedUserData = { ...userData, ...data };
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUserData));
        } else {
            console.error('Profile data indicates failure:', data);
            showToast(data.message || 'Failed to load profile data', 'error');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Could not load user profile information', 'error');
        
        // For development/demo: Set mock data if API is not working
        setMockProfileData();
    }
}

// Set mock profile data when API fails (for development purposes)
function setMockProfileData() {
    const mockData = {
        userId: 1,
        fullName: 'Admin User',
        email: 'admin@example.com',
        phoneNumber: '0123456789',
        userType: 'admin',
        registrationDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isTwoFactorEnabled: false
    };
    
    // Update profile information in the view
    document.getElementById('userId').textContent = mockData.userId;
    document.getElementById('userFullName').textContent = mockData.fullName;
    document.getElementById('userEmail').textContent = mockData.email;
    document.getElementById('userPhone').textContent = mockData.phoneNumber;
    document.getElementById('userType').textContent = mockData.userType;
    document.getElementById('registrationDate').textContent = formatDateTime(new Date(mockData.registrationDate));
    document.getElementById('lastLogin').textContent = formatDateTime(new Date(mockData.lastLogin));
    
    // Update form fields
    document.getElementById('editFullName').value = mockData.fullName;
    document.getElementById('editEmail').value = mockData.email;
    document.getElementById('editPhone').value = mockData.phoneNumber;
    
    console.log('Using mock profile data for development');
}

// Load login history
async function loadLoginHistory() {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        // In a real application, you would fetch login history from an API
        console.log('Loading login history...');
        
        // For now, use mock data while API is being developed
        const mockLoginHistory = [
            { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), ipAddress: '192.168.1.1', status: 'success' },
            { timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), ipAddress: '192.168.1.1', status: 'success' },
            { timestamp: new Date(Date.now() - 73 * 60 * 60 * 1000), ipAddress: '192.168.1.100', status: 'success' }
        ];
        
        renderLoginHistory(mockLoginHistory);
    } catch (error) {
        console.error('Error loading login history:', error);
        showToast('Could not load login history', 'error');
    }
}

// Render login history table
function renderLoginHistory(history) {
    const tableBody = document.getElementById('loginHistoryTable');
    tableBody.innerHTML = '';
    
    if (!history || history.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'No login history available';
        cell.className = 'text-center';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    history.forEach(entry => {
        const row = document.createElement('tr');
        
        // Time column
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDateTime(entry.timestamp);
        row.appendChild(timeCell);
        
        // IP address column
        const ipCell = document.createElement('td');
        ipCell.textContent = entry.ipAddress;
        row.appendChild(ipCell);
        
        // Status column
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ${entry.status === 'success' ? 'text-bg-success' : 'text-bg-danger'}`;
        statusBadge.textContent = entry.status === 'success' ? 'Thành công' : 'Thất bại';
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);
        
        tableBody.appendChild(row);
    });
}

// Update user profile
async function updateProfile() {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        const fullName = document.getElementById('editFullName').value;
        const phoneNumber = document.getElementById('editPhone').value;
        
        console.log('Updating profile with data:', { fullName, phoneNumber });
        
        const response = await fetch(`${API_ENDPOINTS.USERS}/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName,
                phoneNumber
            })
        });
        
        if (!response.ok) {
            console.error('Failed to update profile, status:', response.status);
            throw new Error(`Failed to update profile: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Profile update response:', data);
        
        if (data.success) {
            showToast('Profile updated successfully', 'success');
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            if (modal) {
                modal.hide();
            } else {
                // If modal instance not found, close it manually
                document.getElementById('editProfileModal').classList.remove('show');
                document.body.classList.remove('modal-open');
                const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                while (modalBackdrops.length > 0) {
                    modalBackdrops[0].parentNode.removeChild(modalBackdrops[0]);
                }
            }
            // Reload user profile
            await loadUserProfile();
        } else {
            showToast(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Could not update profile', 'error');
        
        // For development, simulate successful update
        document.getElementById('userFullName').textContent = document.getElementById('editFullName').value;
        document.getElementById('userPhone').textContent = document.getElementById('editPhone').value;
        
        // Close the modal manually
        try {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            if (modal) {
                modal.hide();
            }
        } catch (e) {
            console.error('Error closing modal:', e);
        }
    }
}

// Change password
async function changePassword() {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all password fields', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('New password and confirmation do not match', 'error');
            return;
        }
        
        console.log('Changing password...');
        
        const response = await fetch(`${API_ENDPOINTS.USERS}/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });
        
        if (!response.ok) {
            console.error('Failed to change password, status:', response.status);
            throw new Error(`Failed to change password: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Password change response:', data);
        
        if (data.success) {
            showToast('Password changed successfully', 'success');
            // Reset form
            document.getElementById('changePasswordForm').reset();
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            if (modal) {
                modal.hide();
            } else {
                // If modal instance not found, close it manually
                document.getElementById('changePasswordModal').classList.remove('show');
                document.body.classList.remove('modal-open');
                const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                while (modalBackdrops.length > 0) {
                    modalBackdrops[0].parentNode.removeChild(modalBackdrops[0]);
                }
            }
        } else {
            showToast(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Could not change password', 'error');
        
        // For development, simulate successful password change
        document.getElementById('changePasswordForm').reset();
        
        // Close the modal manually
        try {
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            if (modal) {
                modal.hide();
            }
        } catch (e) {
            console.error('Error closing modal:', e);
        }
    }
}

// Update two-factor authentication
async function updateTwoFactorAuth(event) {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        const isEnabled = event.target.checked;
        
        console.log('Updating two-factor authentication:', isEnabled);
        
        const response = await fetch(`${API_ENDPOINTS.USERS}/two-factor`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                isEnabled
            })
        });
        
        if (!response.ok) {
            console.error('Failed to update two-factor authentication, status:', response.status);
            throw new Error(`Failed to update two-factor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Two-factor update response:', data);
        
        if (data.success) {
            showToast(`Two-factor authentication ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
        } else {
            // Revert toggle if request failed
            event.target.checked = !isEnabled;
            showToast(data.message || 'Failed to update two-factor authentication', 'error');
        }
    } catch (error) {
        // Revert toggle if request failed
        event.target.checked = !event.target.checked;
        console.error('Error updating two-factor authentication:', error);
        showToast('Could not update two-factor authentication', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        console.log('Logging out...');
        logout();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        showToast('Could not log out. Please try again.', 'error');
    }
}

// Setup sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
            } else {
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
            }
        });
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

// Format date and time
function formatDateTime(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Initialize demo authentication for development
function initDemoAuth() {
    if (!getAuthToken()) {
        console.log('Setting demo auth token for development');
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'demo_token_for_development');
        
        // Set demo user data
        const demoUser = {
            userId: 1,
            fullName: 'Admin Demo',
            email: 'admin@example.com',
            phoneNumber: '0123456789',
            userType: 'admin',
            role: 'admin'
        };
        
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
    }
} 