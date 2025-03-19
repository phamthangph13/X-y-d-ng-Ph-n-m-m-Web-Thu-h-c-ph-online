/**
 * Sidebar functionality for EduPay accountant pages
 * Handles sidebar toggle and mobile menu functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get sidebar elements
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Check if elements exist before adding event listeners
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContainer.classList.toggle('expanded');
        });
    }
    
    // Mobile menu toggle functionality
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-visible');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const isMobile = window.innerWidth < 992;
        if (isMobile && sidebar.classList.contains('mobile-visible')) {
            // Check if click is outside sidebar and not on the toggle button
            if (!sidebar.contains(event.target) && event.target !== mobileMenuToggle) {
                sidebar.classList.remove('mobile-visible');
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 992) {
            sidebar.classList.remove('mobile-visible');
        }
    });
});