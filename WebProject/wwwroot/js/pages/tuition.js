// Import utilities
import { isAuthenticated } from '../utils/auth.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        // Redirect to login page if not authenticated
        console.log('User not authenticated, redirecting to login page');
        window.location.href = 'login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
        return;
    }

    // Initialize tuition page functionality
    initTuitionPage();
});

// Initialize tuition page functionality
function initTuitionPage() {
    console.log('Tuition page initialized for authenticated user');
    
    // Payment modals
    const paymentModal = document.getElementById('paymentModal');
    const successModal = document.getElementById('successModal');
    const payButtons = document.querySelectorAll('.btn-pay');
    const payAllBtn = document.getElementById('payAllBtn');
    const cancelBtns = document.querySelectorAll('.cancel-btn');
    const closeSuccessBtn = document.querySelector('.close-success-btn');
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const bankingDetails = document.getElementById('bankingDetails');
    const creditDetails = document.getElementById('creditDetails');

    // Open modal function
    function openModal(modal) {
        if (!modal) return;
        
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal function
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    // Show payment details based on selected method
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', function() {
            const selectedMethod = this.value;
            
            // Hide all payment details first
            bankingDetails.style.display = 'none';
            creditDetails.style.display = 'none';
            
            // Show selected payment details
            if (selectedMethod === 'banking') {
                bankingDetails.style.display = 'block';
            } else if (selectedMethod === 'credit') {
                creditDetails.style.display = 'block';
            }
        });
    }
    
    // Open payment modal for specific course
    if (payButtons) {
        payButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const course = btn.dataset.course || '';
                const courseName = btn.dataset.courseName || '';
                const amount = btn.dataset.amount || '';
                
                document.getElementById('courseCode').textContent = course;
                document.getElementById('courseName').textContent = courseName;
                document.getElementById('courseAmount').textContent = amount;
                
                openModal(paymentModal);
            });
        });
    }
    
    // Handle "Pay All" button click
    if (payAllBtn) {
        payAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('courseCode').textContent = 'ALL';
            document.getElementById('courseName').textContent = 'Tất cả học phần chưa thanh toán';
            document.getElementById('courseAmount').textContent = '8,000,000 VNĐ';
            openModal(paymentModal);
        });
    }
    
    // Close modals
    if (cancelBtns) {
        cancelBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const modal = btn.closest('.modal');
                closeModal(modal);
            });
        });
    }
    
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal(successModal);
            
            // Reload page to show updated status
            // In real application, we would update UI without reload
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });
    }
    
    // Process payment
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate payment processing
            closeModal(paymentModal);
            
            // Show success message after a short delay
            setTimeout(() => {
                openModal(successModal);
            }, 1000);
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
} 