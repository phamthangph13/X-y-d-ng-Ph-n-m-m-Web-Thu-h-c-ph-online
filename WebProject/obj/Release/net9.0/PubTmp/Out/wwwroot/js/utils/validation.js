// Add field error to form
export function addFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div'); 
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = errorMessage;
        
        field.parentNode.appendChild(errorDiv);
    }
}

// Get field label for error messages
export function getFieldLabel(fieldName) {
    const fieldLabels = {
        'fullName': 'họ và tên',
        'studentCode': 'mã sinh viên',
        'email': 'email',
        'registerEmail': 'email',
        'loginEmail': 'email',
        'resetEmail': 'email',
        'phoneNumber': 'số điện thoại',
        'password': 'mật khẩu',
        'registerPassword': 'mật khẩu',
        'loginPassword': 'mật khẩu',
        'confirmPassword': 'xác nhận mật khẩu',
        'departmentID': 'khoa',
        'classID': 'lớp',
        'enrollmentYear': 'năm nhập học'
    };
    
    return fieldLabels[fieldName] || fieldName;
}

// Validate registration form data
export function validateRegistrationForm(data) {
    // Clear previous error messages
    document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    let isValid = true;
    
    // Check required fields
    for (const [key, value] of Object.entries(data)) {
        if (!value && key !== 'departmentID' && key !== 'classID' && key !== 'enrollmentYear') {
            addFieldError(key, `Vui lòng nhập ${getFieldLabel(key)}`);
            isValid = false;
        }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
        addFieldError('registerEmail', 'Địa chỉ email không hợp lệ');
        isValid = false;
    }
    
    // Validate phone number (Vietnamese format)
    const phoneRegex = /^(0|\+84)(\d{9,10})$/;
    if (data.phoneNumber && !phoneRegex.test(data.phoneNumber)) {
        addFieldError('phoneNumber', 'Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxxx)');
        isValid = false;
    }
    
    // Validate student code
    const studentCodeRegex = /^[A-Za-z0-9]{5,10}$/;
    if (data.studentCode && !studentCodeRegex.test(data.studentCode)) {
        addFieldError('studentCode', 'Mã sinh viên phải có 5-10 ký tự chữ và số');
        isValid = false;
    }
    
    // Validate password match
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        addFieldError('confirmPassword', 'Mật khẩu xác nhận không khớp');
        isValid = false;
    }
    
    // Validate password strength
    if (data.password && data.password.length < 6) {
        addFieldError('registerPassword', 'Mật khẩu phải có ít nhất 6 ký tự');
        isValid = false;
    }
    
    // Validate dropdown selections
    if (!data.departmentID) {
        addFieldError('departmentID', 'Vui lòng chọn khoa');
        isValid = false;
    }
    
    if (!data.classID) {
        addFieldError('classID', 'Vui lòng chọn lớp');
        isValid = false;
    }
    
    if (!data.enrollmentYear) {
        addFieldError('enrollmentYear', 'Vui lòng chọn năm nhập học');
        isValid = false;
    }
    
    return isValid;
}

// Validate password strength
export function validatePasswordStrength(password) {
    const passwordField = document.getElementById('registerPassword');
    let feedback = '';
    
    if (password.length < 6) {
        feedback = 'Password must be at least 6 characters';
        passwordField.setCustomValidity(feedback);
    } else {
        passwordField.setCustomValidity('');
    }
} 