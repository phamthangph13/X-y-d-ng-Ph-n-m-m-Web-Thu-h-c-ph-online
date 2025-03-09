// payment.js - JavaScript cho trang thanh toán

document.addEventListener('DOMContentLoaded', function() {
    // Payment Method Selection
    const paymentMethods = document.querySelectorAll('.payment-method-option');
    const cardDetails = document.querySelector('.card-details');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            // Remove active class from all methods
            paymentMethods.forEach(m => m.classList.remove('active'));
            
            // Add active class to clicked method
            this.classList.add('active');
            
            // Find the radio button inside and check it
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
            
            // Show/hide card details based on selected method
            if (cardDetails) {
                if (radio && radio.value === 'credit_card') {
                    cardDetails.style.display = 'block';
                } else {
                    cardDetails.style.display = 'none';
                }
            }
            
            // Update summary based on selected method
            updatePaymentSummary();
        });
    });
    
    // Credit Card Form Validation
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            let formattedValue = '';
            
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            
            e.target.value = formattedValue;
        });
    }
    
    const expiryInput = document.getElementById('expiry-date');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            let formattedValue = '';
            
            if (value.length > 0) {
                formattedValue = value.substring(0, 2);
                
                if (value.length > 2) {
                    formattedValue += '/' + value.substring(2, 4);
                }
            }
            
            e.target.value = formattedValue;
        });
    }
    
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
        });
    }
    
    // Update Payment Summary
    function updatePaymentSummary() {
        const selectedMethod = document.querySelector('.payment-method-option.active input[type="radio"]');
        const processingFeeElement = document.getElementById('processing-fee');
        
        if (selectedMethod && processingFeeElement) {
            let processingFee = 0;
            
            // Different fees based on payment method
            switch(selectedMethod.value) {
                case 'credit_card':
                    processingFee = 0.025; // 2.5%
                    break;
                case 'bank_transfer':
                    processingFee = 0.01; // 1%
                    break;
                case 'e_wallet':
                    processingFee = 0.015; // 1.5%
                    break;
                default:
                    processingFee = 0;
            }
            
            // Get total amount
            const tuitionAmount = parseFloat(document.getElementById('tuition-amount').innerText.replace(/[^0-9.-]+/g, '')) || 0;
            const feeAmount = tuitionAmount * processingFee;
            
            // Update processing fee display
            processingFeeElement.innerText = formatCurrency(feeAmount);
            
            // Update total
            const totalElement = document.getElementById('total-amount');
            if (totalElement) {
                totalElement.innerText = formatCurrency(tuitionAmount + feeAmount);
            }
        }
    }
    
    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
    
    // Initial summary update
    updatePaymentSummary();
    
    // Payment Form Submission
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate required fields
            const requiredFields = paymentForm.querySelectorAll('[required]:not([type="hidden"])');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('is-invalid');
                    
                    let errorMessage = field.parentElement.querySelector('.error-message');
                    if (!errorMessage) {
                        errorMessage = document.createElement('div');
                        errorMessage.classList.add('error-message');
                        field.parentElement.appendChild(errorMessage);
                    }
                    
                    errorMessage.textContent = 'Trường này là bắt buộc';
                } else {
                    field.classList.remove('is-invalid');
                    const errorMessage = field.parentElement.querySelector('.error-message');
                    if (errorMessage) {
                        errorMessage.remove();
                    }
                }
            });
            
            // If credit card is selected, validate credit card fields
            const creditCardRadio = document.querySelector('input[value="credit_card"]:checked');
            if (creditCardRadio && isValid) {
                const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
                const expiryDate = document.getElementById('expiry-date').value;
                const cvv = document.getElementById('cvv').value;
                
                // Validate card number (simple Luhn algorithm)
                if (!validateCardNumber(cardNumber)) {
                    isValid = false;
                    document.getElementById('card-number').classList.add('is-invalid');
                    let errorMessage = document.getElementById('card-number').parentElement.querySelector('.error-message');
                    if (!errorMessage) {
                        errorMessage = document.createElement('div');
                        errorMessage.classList.add('error-message');
                        document.getElementById('card-number').parentElement.appendChild(errorMessage);
                    }
                    errorMessage.textContent = 'Số thẻ không hợp lệ';
                }
                
                // Validate expiry date
                if (!validateExpiryDate(expiryDate)) {
                    isValid = false;
                    document.getElementById('expiry-date').classList.add('is-invalid');
                    let errorMessage = document.getElementById('expiry-date').parentElement.querySelector('.error-message');
                    if (!errorMessage) {
                        errorMessage = document.createElement('div');
                        errorMessage.classList.add('error-message');
                        document.getElementById('expiry-date').parentElement.appendChild(errorMessage);
                    }
                    errorMessage.textContent = 'Ngày hết hạn không hợp lệ';
                }
                
                // Validate CVV
                if (cvv.length < 3) {
                    isValid = false;
                    document.getElementById('cvv').classList.add('is-invalid');
                    let errorMessage = document.getElementById('cvv').parentElement.querySelector('.error-message');
                    if (!errorMessage) {
                        errorMessage = document.createElement('div');
                        errorMessage.classList.add('error-message');
                        document.getElementById('cvv').parentElement.appendChild(errorMessage);
                    }
                    errorMessage.textContent = 'CVV không hợp lệ';
                }
            }
            
            // If valid, simulate payment process
            if (isValid) {
                const paymentButton = document.querySelector('.payment-button');
                paymentButton.textContent = 'Đang xử lý...';
                paymentButton.disabled = true;
                
                // Simulate payment processing (3 seconds)
                setTimeout(function() {
                    // Redirect to success page or show success message
                    window.location.href = '/Payment/Success';
                }, 3000);
            }
        });
    }
    
    // Helper functions for validation
    function validateCardNumber(number) {
        // Simple validation - check if number is 16 digits
        // In a real application, you would use Luhn algorithm or more sophisticated validation
        return number.length === 16 && !isNaN(number);
    }
    
    function validateExpiryDate(date) {
        // Check format
        if (!/^\d{2}\/\d{2}$/.test(date)) {
            return false;
        }
        
        const parts = date.split('/');
        const month = parseInt(parts[0]);
        let year = parseInt(parts[1]);
        
        // Add 2000 to get 4-digit year
        year += 2000;
        
        // Check if month is valid
        if (month < 1 || month > 12) {
            return false;
        }
        
        // Check if date is in the future
        const now = new Date();
        const expiryDate = new Date(year, month - 1);
        
        return expiryDate > now;
    }
}); 