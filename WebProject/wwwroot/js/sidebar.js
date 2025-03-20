/**
 * Sidebar functionality for EduPay accountant pages
 * Handles sidebar toggle and mobile menu functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Sidebar toggle functionality for desktop
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContainer.classList.toggle('expanded');
            
            // Save preference
            const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebar_collapsed', isCollapsed);
        });
    }
    
    // Mobile menu toggle functionality
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            const isClickInside = sidebar.contains(e.target) || mobileMenuToggle.contains(e.target);
            
            if (!isClickInside && sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    }
    
    // Apply saved sidebar state on page load
    const sidebarState = localStorage.getItem('sidebar_collapsed');
    if (sidebarState === 'true') {
        sidebar.classList.add('sidebar-collapsed');
        mainContainer.classList.add('expanded');
    }
});