/**
 * Shows a toast notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create a unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Determine the correct color class based on the type
    let typeClass = 'bg-info text-white';
    let icon = '<i class="fas fa-info-circle me-2"></i>';
    
    switch (type) {
        case 'success':
            typeClass = 'bg-success text-white';
            icon = '<i class="fas fa-check-circle me-2"></i>';
            break;
        case 'error':
            typeClass = 'bg-danger text-white';
            icon = '<i class="fas fa-exclamation-circle me-2"></i>';
            break;
        case 'warning':
            typeClass = 'bg-warning text-dark';
            icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
            break;
    }
    
    // Create the toast element
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${typeClass}">
                ${icon}
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add the toast to the container
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Initialize the toast
    const toastElement = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: duration
    });
    
    // Show the toast
    bsToast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
} 