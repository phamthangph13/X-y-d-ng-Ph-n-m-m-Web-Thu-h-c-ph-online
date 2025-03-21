import { showToast } from './utils/toast.js';
import { checkAdminAuth, logout } from './utils/auth.js';

document.addEventListener('DOMContentLoaded', function() {
    // Authentication check for admin
    checkAdminAuth();

    // Initialize the UI
    initializeSidebar();
    initializeLogout();
    loadStudentData();

    // Set up tab switching to load appropriate data
    document.getElementById('students-tab').addEventListener('click', function() {
        loadStudentData();
    });

    document.getElementById('accountants-tab').addEventListener('click', function() {
        loadAccountantData();
    });

    // Button event listeners for students
    document.getElementById('searchStudentBtn').addEventListener('click', function() {
        searchStudents();
    });

    document.getElementById('resetSearchBtn').addEventListener('click', function() {
        resetStudentSearch();
    });

    document.getElementById('addStudentBtn').addEventListener('click', function() {
        showStudentModal();
    });

    document.getElementById('saveStudentBtn').addEventListener('click', function() {
        saveStudent();
    });

    document.getElementById('importStudentsBtn').addEventListener('click', function() {
        // Import students from Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng nhập từ Excel đang được phát triển');
    });

    document.getElementById('exportStudentsBtn').addEventListener('click', function() {
        // Export students to Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng xuất ra Excel đang được phát triển');
    });

    // Button event listeners for accountants
    document.getElementById('searchAccountantBtn').addEventListener('click', function() {
        searchAccountants();
    });

    document.getElementById('resetAccountantSearchBtn').addEventListener('click', function() {
        resetAccountantSearch();
    });

    document.getElementById('addAccountantBtn').addEventListener('click', function() {
        showAccountantModal();
    });

    document.getElementById('saveAccountantBtn').addEventListener('click', function() {
        saveAccountant();
    });

    document.getElementById('importAccountantsBtn').addEventListener('click', function() {
        // Import accountants from Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng nhập từ Excel đang được phát triển');
    });

    document.getElementById('exportAccountantsBtn').addEventListener('click', function() {
        // Export accountants to Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng xuất ra Excel đang được phát triển');
    });
});

// Sidebar functionality
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        mainContainer.classList.toggle('expanded');
        
        const icon = sidebarToggle.querySelector('i');
        if (icon.classList.contains('fa-chevron-left')) {
            icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
    });

    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('mobile-visible');
        this.classList.toggle('active');
    });
}

// Logout functionality
function initializeLogout() {
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
    });
}

// STUDENT MANAGEMENT FUNCTIONALITY

// Mock data for students
const mockStudents = [
    {
        id: 1,
        code: 'SV001',
        name: 'Nguyễn Văn An',
        dob: '2002-05-15',
        gender: 'male',
        class: 'CNTT2022',
        faculty: 'CNTT',
        email: 'an.nguyenvan@example.com',
        phone: '0987654321',
        address: 'Hà Nội',
        status: 'active'
    },
    {
        id: 2,
        code: 'SV002',
        name: 'Trần Thị Bình',
        dob: '2003-08-20',
        gender: 'female',
        class: 'QTKD2022',
        faculty: 'QTKD',
        email: 'binh.tranthi@example.com',
        phone: '0987123456',
        address: 'TP. Hồ Chí Minh',
        status: 'active'
    },
    {
        id: 3,
        code: 'SV003',
        name: 'Lê Minh Cường',
        dob: '2002-03-10',
        gender: 'male',
        class: 'KT2022',
        faculty: 'KT',
        email: 'cuong.leminh@example.com',
        phone: '0912345678',
        address: 'Đà Nẵng',
        status: 'suspended'
    }
];

// Load student data
function loadStudentData() {
    const tableBody = document.getElementById('studentsTableBody');
    tableBody.innerHTML = '';

    // Normally this would be a fetch call to an API
    const students = mockStudents;

    students.forEach(student => {
        const row = document.createElement('tr');
        
        // Format display values
        const genderDisplay = student.gender === 'male' ? 'Nam' : 'Nữ';
        const facultyDisplay = getFacultyName(student.faculty);
        const statusDisplay = getStudentStatusDisplay(student.status);
        const statusClass = getStatusClass(student.status);
        
        row.innerHTML = `
            <td>${student.code}</td>
            <td>${student.name}</td>
            <td>${formatDate(student.dob)}</td>
            <td>${genderDisplay}</td>
            <td>${student.class}</td>
            <td>${facultyDisplay}</td>
            <td>${student.email}</td>
            <td>${student.phone}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" data-id="${student.id}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${student.id}" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });

    // Add event listeners for action buttons
    document.querySelectorAll('#studentsTableBody .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.getAttribute('data-id');
            editStudent(studentId);
        });
    });

    document.querySelectorAll('#studentsTableBody .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.getAttribute('data-id');
            deleteStudent(studentId);
        });
    });
}

// Search students
function searchStudents() {
    const studentId = document.getElementById('searchStudentId').value.trim().toLowerCase();
    const studentName = document.getElementById('searchStudentName').value.trim().toLowerCase();
    const studentClass = document.getElementById('searchClass').value.trim().toLowerCase();
    const studentFaculty = document.getElementById('searchFaculty').value;

    // In a real application, this would be an API call with search parameters
    const filteredStudents = mockStudents.filter(student => {
        return (studentId === '' || student.code.toLowerCase().includes(studentId)) &&
               (studentName === '' || student.name.toLowerCase().includes(studentName)) &&
               (studentClass === '' || student.class.toLowerCase().includes(studentClass)) &&
               (studentFaculty === '' || student.faculty === studentFaculty);
    });

    displayFilteredStudents(filteredStudents);
}

// Reset student search
function resetStudentSearch() {
    document.getElementById('searchStudentId').value = '';
    document.getElementById('searchStudentName').value = '';
    document.getElementById('searchClass').value = '';
    document.getElementById('searchFaculty').value = '';
    
    loadStudentData();
}

// Display filtered students
function displayFilteredStudents(students) {
    const tableBody = document.getElementById('studentsTableBody');
    tableBody.innerHTML = '';

    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">Không tìm thấy sinh viên nào phù hợp</td>
            </tr>
        `;
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        
        // Format display values
        const genderDisplay = student.gender === 'male' ? 'Nam' : 'Nữ';
        const facultyDisplay = getFacultyName(student.faculty);
        const statusDisplay = getStudentStatusDisplay(student.status);
        const statusClass = getStatusClass(student.status);
        
        row.innerHTML = `
            <td>${student.code}</td>
            <td>${student.name}</td>
            <td>${formatDate(student.dob)}</td>
            <td>${genderDisplay}</td>
            <td>${student.class}</td>
            <td>${facultyDisplay}</td>
            <td>${student.email}</td>
            <td>${student.phone}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" data-id="${student.id}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${student.id}" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });

    // Add event listeners for action buttons
    document.querySelectorAll('#studentsTableBody .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.getAttribute('data-id');
            editStudent(studentId);
        });
    });

    document.querySelectorAll('#studentsTableBody .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.getAttribute('data-id');
            deleteStudent(studentId);
        });
    });
}

// Show student modal for adding
function showStudentModal() {
    // Reset the form
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    
    // Set the modal title
    document.getElementById('studentModalTitle').textContent = 'Thêm sinh viên mới';
    
    // Show the modal
    const studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
    studentModal.show();
}

// Edit student
function editStudent(studentId) {
    // Find the student by ID
    const student = mockStudents.find(s => s.id == studentId);
    if (!student) return;
    
    // Fill the form with student data
    document.getElementById('studentId').value = student.id;
    document.getElementById('studentCode').value = student.code;
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentDob').value = student.dob;
    
    if (student.gender === 'male') {
        document.getElementById('genderMale').checked = true;
    } else {
        document.getElementById('genderFemale').checked = true;
    }
    
    document.getElementById('studentClass').value = student.class;
    document.getElementById('studentFaculty').value = student.faculty;
    document.getElementById('studentEmail').value = student.email;
    document.getElementById('studentPhone').value = student.phone;
    document.getElementById('studentAddress').value = student.address;
    document.getElementById('studentStatus').value = student.status;
    
    // Set the modal title
    document.getElementById('studentModalTitle').textContent = 'Chỉnh sửa thông tin sinh viên';
    
    // Show the modal
    const studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
    studentModal.show();
}

// Save student
function saveStudent() {
    // Get form data
    const studentId = document.getElementById('studentId').value;
    const studentData = {
        code: document.getElementById('studentCode').value,
        name: document.getElementById('studentName').value,
        dob: document.getElementById('studentDob').value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        class: document.getElementById('studentClass').value,
        faculty: document.getElementById('studentFaculty').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        address: document.getElementById('studentAddress').value,
        status: document.getElementById('studentStatus').value
    };
    
    // Validate form data
    if (!studentData.code || !studentData.name || !studentData.dob || !studentData.class || 
        !studentData.faculty || !studentData.email || !studentData.phone) {
        showToast('error', 'Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // In a real application, this would be an API call to save the data
    // For now, we'll just update our mock data
    if (studentId) {
        // Update existing student
        const index = mockStudents.findIndex(s => s.id == studentId);
        if (index !== -1) {
            mockStudents[index] = { ...mockStudents[index], ...studentData };
            showToast('success', 'Thành công', 'Cập nhật thông tin sinh viên thành công');
        }
    } else {
        // Add new student
        const newStudent = {
            id: mockStudents.length + 1,
            ...studentData
        };
        mockStudents.push(newStudent);
        showToast('success', 'Thành công', 'Thêm sinh viên mới thành công');
    }
    
    // Hide the modal
    const studentModal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
    studentModal.hide();
    
    // Reload the data
    loadStudentData();
}

// Delete student
function deleteStudent(studentId) {
    // Find the student to get their name
    const student = mockStudents.find(s => s.id == studentId);
    if (!student) return;
    
    // Confirm deletion
    if (confirm(`Bạn có chắc chắn muốn xóa sinh viên ${student.name}?`)) {
        // In a real application, this would be an API call to delete the student
        const index = mockStudents.findIndex(s => s.id == studentId);
        if (index !== -1) {
            mockStudents.splice(index, 1);
            showToast('success', 'Thành công', 'Xóa sinh viên thành công');
            loadStudentData();
        }
    }
}

// ACCOUNTANT MANAGEMENT FUNCTIONALITY

// Mock data for accountants
const mockAccountants = [
    {
        id: 1,
        code: 'KT001',
        name: 'Phạm Thị Mai',
        dob: '1985-10-12',
        gender: 'female',
        department: 'KTTC',
        position: 'truong_phong',
        email: 'mai.phamthi@example.com',
        phone: '0912345678',
        address: 'Hà Nội',
        status: 'active'
    },
    {
        id: 2,
        code: 'KT002',
        name: 'Nguyễn Văn Hoàng',
        dob: '1990-05-25',
        gender: 'male',
        department: 'KTHP',
        position: 'nhan_vien',
        email: 'hoang.nguyenvan@example.com',
        phone: '0987123456',
        address: 'Hà Nội',
        status: 'active'
    },
    {
        id: 3,
        code: 'KT003',
        name: 'Trần Minh Đức',
        dob: '1988-08-15',
        gender: 'male',
        department: 'KTTS',
        position: 'pho_phong',
        email: 'duc.tranminh@example.com',
        phone: '0978123456',
        address: 'Hà Nội',
        status: 'on_leave'
    }
];

// Load accountant data
function loadAccountantData() {
    const tableBody = document.getElementById('accountantsTableBody');
    tableBody.innerHTML = '';

    // Normally this would be a fetch call to an API
    const accountants = mockAccountants;

    accountants.forEach(accountant => {
        const row = document.createElement('tr');
        
        // Format display values
        const genderDisplay = accountant.gender === 'male' ? 'Nam' : 'Nữ';
        const departmentDisplay = getDepartmentName(accountant.department);
        const positionDisplay = getPositionName(accountant.position);
        const statusDisplay = getAccountantStatusDisplay(accountant.status);
        const statusClass = getAccountantStatusClass(accountant.status);
        
        row.innerHTML = `
            <td>${accountant.code}</td>
            <td>${accountant.name}</td>
            <td>${formatDate(accountant.dob)}</td>
            <td>${genderDisplay}</td>
            <td>${departmentDisplay}</td>
            <td>${positionDisplay}</td>
            <td>${accountant.email}</td>
            <td>${accountant.phone}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" data-id="${accountant.id}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${accountant.id}" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });

    // Add event listeners for action buttons
    document.querySelectorAll('#accountantsTableBody .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountantId = this.getAttribute('data-id');
            editAccountant(accountantId);
        });
    });

    document.querySelectorAll('#accountantsTableBody .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountantId = this.getAttribute('data-id');
            deleteAccountant(accountantId);
        });
    });
}

// Search accountants
function searchAccountants() {
    const accountantId = document.getElementById('searchAccountantId').value.trim().toLowerCase();
    const accountantName = document.getElementById('searchAccountantName').value.trim().toLowerCase();
    const department = document.getElementById('searchDepartment').value;

    // In a real application, this would be an API call with search parameters
    const filteredAccountants = mockAccountants.filter(accountant => {
        return (accountantId === '' || accountant.code.toLowerCase().includes(accountantId)) &&
               (accountantName === '' || accountant.name.toLowerCase().includes(accountantName)) &&
               (department === '' || accountant.department === department);
    });

    displayFilteredAccountants(filteredAccountants);
}

// Reset accountant search
function resetAccountantSearch() {
    document.getElementById('searchAccountantId').value = '';
    document.getElementById('searchAccountantName').value = '';
    document.getElementById('searchDepartment').value = '';
    
    loadAccountantData();
}

// Display filtered accountants
function displayFilteredAccountants(accountants) {
    const tableBody = document.getElementById('accountantsTableBody');
    tableBody.innerHTML = '';

    if (accountants.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">Không tìm thấy nhân viên kế toán nào phù hợp</td>
            </tr>
        `;
        return;
    }

    accountants.forEach(accountant => {
        const row = document.createElement('tr');
        
        // Format display values
        const genderDisplay = accountant.gender === 'male' ? 'Nam' : 'Nữ';
        const departmentDisplay = getDepartmentName(accountant.department);
        const positionDisplay = getPositionName(accountant.position);
        const statusDisplay = getAccountantStatusDisplay(accountant.status);
        const statusClass = getAccountantStatusClass(accountant.status);
        
        row.innerHTML = `
            <td>${accountant.code}</td>
            <td>${accountant.name}</td>
            <td>${formatDate(accountant.dob)}</td>
            <td>${genderDisplay}</td>
            <td>${departmentDisplay}</td>
            <td>${positionDisplay}</td>
            <td>${accountant.email}</td>
            <td>${accountant.phone}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" data-id="${accountant.id}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${accountant.id}" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });

    // Add event listeners for action buttons
    document.querySelectorAll('#accountantsTableBody .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountantId = this.getAttribute('data-id');
            editAccountant(accountantId);
        });
    });

    document.querySelectorAll('#accountantsTableBody .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountantId = this.getAttribute('data-id');
            deleteAccountant(accountantId);
        });
    });
}

// Show accountant modal for adding
function showAccountantModal() {
    // Reset the form
    document.getElementById('accountantForm').reset();
    document.getElementById('accountantId').value = '';
    
    // Set the modal title
    document.getElementById('accountantModalTitle').textContent = 'Thêm nhân viên kế toán mới';
    
    // Show the modal
    const accountantModal = new bootstrap.Modal(document.getElementById('accountantModal'));
    accountantModal.show();
}

// Edit accountant
function editAccountant(accountantId) {
    // Find the accountant by ID
    const accountant = mockAccountants.find(a => a.id == accountantId);
    if (!accountant) return;
    
    // Fill the form with accountant data
    document.getElementById('accountantId').value = accountant.id;
    document.getElementById('accountantCode').value = accountant.code;
    document.getElementById('accountantName').value = accountant.name;
    document.getElementById('accountantDob').value = accountant.dob;
    
    if (accountant.gender === 'male') {
        document.getElementById('accountantGenderMale').checked = true;
    } else {
        document.getElementById('accountantGenderFemale').checked = true;
    }
    
    document.getElementById('accountantDepartment').value = accountant.department;
    document.getElementById('accountantPosition').value = accountant.position;
    document.getElementById('accountantEmail').value = accountant.email;
    document.getElementById('accountantPhone').value = accountant.phone;
    document.getElementById('accountantAddress').value = accountant.address;
    document.getElementById('accountantStatus').value = accountant.status;
    
    // Set the modal title
    document.getElementById('accountantModalTitle').textContent = 'Chỉnh sửa thông tin nhân viên kế toán';
    
    // Show the modal
    const accountantModal = new bootstrap.Modal(document.getElementById('accountantModal'));
    accountantModal.show();
}

// Save accountant
function saveAccountant() {
    // Get form data
    const accountantId = document.getElementById('accountantId').value;
    const accountantData = {
        code: document.getElementById('accountantCode').value,
        name: document.getElementById('accountantName').value,
        dob: document.getElementById('accountantDob').value,
        gender: document.querySelector('input[name="accountantGender"]:checked').value,
        department: document.getElementById('accountantDepartment').value,
        position: document.getElementById('accountantPosition').value,
        email: document.getElementById('accountantEmail').value,
        phone: document.getElementById('accountantPhone').value,
        address: document.getElementById('accountantAddress').value,
        status: document.getElementById('accountantStatus').value
    };
    
    // Validate form data
    if (!accountantData.code || !accountantData.name || !accountantData.dob || 
        !accountantData.department || !accountantData.position || 
        !accountantData.email || !accountantData.phone) {
        showToast('error', 'Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // In a real application, this would be an API call to save the data
    // For now, we'll just update our mock data
    if (accountantId) {
        // Update existing accountant
        const index = mockAccountants.findIndex(a => a.id == accountantId);
        if (index !== -1) {
            mockAccountants[index] = { ...mockAccountants[index], ...accountantData };
            showToast('success', 'Thành công', 'Cập nhật thông tin nhân viên kế toán thành công');
        }
    } else {
        // Add new accountant
        const newAccountant = {
            id: mockAccountants.length + 1,
            ...accountantData
        };
        mockAccountants.push(newAccountant);
        showToast('success', 'Thành công', 'Thêm nhân viên kế toán mới thành công');
    }
    
    // Hide the modal
    const accountantModal = bootstrap.Modal.getInstance(document.getElementById('accountantModal'));
    accountantModal.hide();
    
    // Reload the data
    loadAccountantData();
}

// Delete accountant
function deleteAccountant(accountantId) {
    // Find the accountant to get their name
    const accountant = mockAccountants.find(a => a.id == accountantId);
    if (!accountant) return;
    
    // Confirm deletion
    if (confirm(`Bạn có chắc chắn muốn xóa nhân viên kế toán ${accountant.name}?`)) {
        // In a real application, this would be an API call to delete the accountant
        const index = mockAccountants.findIndex(a => a.id == accountantId);
        if (index !== -1) {
            mockAccountants.splice(index, 1);
            showToast('success', 'Thành công', 'Xóa nhân viên kế toán thành công');
            loadAccountantData();
        }
    }
}

// UTILITY FUNCTIONS

// Format date to DD/MM/YYYY
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Get faculty name from code
function getFacultyName(facultyCode) {
    const faculties = {
        'CNTT': 'Công nghệ thông tin',
        'QTKD': 'Quản trị kinh doanh',
        'KT': 'Kế toán',
        'NNA': 'Ngôn ngữ Anh'
    };
    return faculties[facultyCode] || facultyCode;
}

// Get department name from code
function getDepartmentName(departmentCode) {
    const departments = {
        'KTTC': 'Kế toán tài chính',
        'KTHP': 'Kế toán học phí',
        'KTTS': 'Kế toán tài sản'
    };
    return departments[departmentCode] || departmentCode;
}

// Get position name from code
function getPositionName(positionCode) {
    const positions = {
        'truong_phong': 'Trưởng phòng',
        'pho_phong': 'Phó phòng',
        'nhan_vien': 'Nhân viên'
    };
    return positions[positionCode] || positionCode;
}

// Get student status display
function getStudentStatusDisplay(status) {
    const statuses = {
        'active': 'Đang học',
        'graduated': 'Đã tốt nghiệp',
        'suspended': 'Đình chỉ',
        'dropped': 'Nghỉ học'
    };
    return statuses[status] || status;
}

// Get accountant status display
function getAccountantStatusDisplay(status) {
    const statuses = {
        'active': 'Đang làm việc',
        'on_leave': 'Nghỉ phép',
        'retired': 'Đã nghỉ việc'
    };
    return statuses[status] || status;
}

// Get status class for styling
function getStatusClass(status) {
    const classes = {
        'active': 'status-active',
        'graduated': 'status-success',
        'suspended': 'status-warning',
        'dropped': 'status-danger'
    };
    return classes[status] || '';
}

// Get accountant status class for styling
function getAccountantStatusClass(status) {
    const classes = {
        'active': 'status-active',
        'on_leave': 'status-warning',
        'retired': 'status-muted'
    };
    return classes[status] || '';
}
