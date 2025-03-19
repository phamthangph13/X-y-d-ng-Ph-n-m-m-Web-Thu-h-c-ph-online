import { isAuthenticated, getUserData, ensureCorrectEncoding } from './auth.js';

// Show toast notification
export function showToast(title, message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Update UI based on authentication status
export function updateUIBasedOnAuth() {
    const isLoggedIn = isAuthenticated();
    
    if (isLoggedIn) {
        document.body.classList.add('authenticated');
    } else {
        document.body.classList.remove('authenticated');
    }
    
    const authButtons = document.querySelector('.auth-buttons');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (authButtons && userDropdown) {
        if (isLoggedIn) {
            // Hide auth buttons, show user dropdown
            authButtons.style.display = 'none';
            userDropdown.style.display = 'block';
            
            authButtons.classList.add('d-none');
            authButtons.classList.remove('d-flex');
            userDropdown.classList.remove('d-none');
            
            authButtons.hidden = true;
            userDropdown.hidden = false;
            
            // Update user name in dropdown
            const userData = getUserData() || {fullName: "User"};
            const userNameElement = userDropdown.querySelector('.user-name');
            if (userNameElement) {
                userNameElement.textContent = ensureCorrectEncoding(userData.fullName);
            }
        } else {
            // Show auth buttons, hide user dropdown
            authButtons.style.display = 'flex';
            userDropdown.style.display = 'none';
            
            authButtons.classList.remove('d-none');
            authButtons.classList.add('d-flex');
            userDropdown.classList.add('d-none');
            
            authButtons.hidden = false;
            userDropdown.hidden = true;
        }
    }
}

// Add smooth scrolling for anchor links
export function initSmoothScroll() {
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
}

// Initialize animations
export function initAnimations() {
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
} 