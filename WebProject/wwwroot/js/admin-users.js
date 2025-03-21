import { showToast } from './utils/toast.js';
import { checkAdminAuth, logout, getAuthToken } from './utils/auth.js';

// Admin Users Management

// Global variables
let currentStudentPage = 1;
let currentAccountantPage = 1;
const pageSize = 10;

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

// Load student data
function loadStudentData(page = 1) {
    currentStudentPage = page;
    const tableBody = document.getElementById('studentsTableBody');
    tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Đang tải dữ liệu...</td></tr>';

    // Get filter values
    const studentId = document.getElementById('searchStudentId').value.trim();
    const studentName = document.getElementById('searchStudentName').value.trim();
    const className = document.getElementById('searchClass').value.trim();
    const faculty = document.getElementById('searchFaculty').value;

    // Build query string
    let queryParams = new URLSearchParams();
    if (studentId) queryParams.append('studentId', studentId);
    if (studentName) queryParams.append('name', studentName);
    if (className) queryParams.append('className', className);
    if (faculty) queryParams.append('departmentId', getDepartmentIdFromCode(faculty));
    queryParams.append('userType', 'Student');
    queryParams.append('page', page);
    queryParams.append('pageSize', pageSize);

    // Make API call
    fetch(`/api/user-management/students?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            console.error('API response error:', response.status, response.statusText);
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Student data received:', data);
        
        if (!data || !data.items || data.items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Không tìm thấy dữ liệu sinh viên</td></tr>';
            updateStudentPagination(data || { totalPages: 1, currentPage: 1 });
            return;
        }

        // Filter out non-Student users client-side
        const filteredItems = data.items.filter(student => {
            // Filter out users with specific admin/accountant fullNames
            return student.fullName !== 'Admin' && student.fullName !== 'Accountant';
        });

        if (filteredItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Không tìm thấy dữ liệu sinh viên</td></tr>';
            updateStudentPagination({ ...data, items: [], totalCount: 0, totalPages: 1, currentPage: 1 });
            return;
        }

        tableBody.innerHTML = '';
        filteredItems.forEach(student => {
            // Format data for display
            const genderDisplay = student.gender || 'N/A';
            const dob = student.dateOfBirth ? formatDate(student.dateOfBirth) : 'N/A';
            const statusClass = student.isActive ? 'status-active' : 'status-inactive';
            const statusDisplay = student.isActive ? 'Đang học' : 'Không hoạt động';

            tableBody.innerHTML += `
            <tr>
                <td>${student.studentCode || 'N/A'}</td>
                <td>${student.fullName || 'N/A'}</td>
                <td>${dob}</td>
                <td>${genderDisplay}</td>
                <td>${student.className || 'N/A'}</td>
                <td>${student.departmentName || 'N/A'}</td>
                <td>${student.email || 'N/A'}</td>
                <td>${student.phoneNumber || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td>
                    <button class="action-btn edit-btn" data-id="${student.studentID}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${student.studentID}" title="Xóa">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
        });

        // Add event listeners to action buttons
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

        // Update pagination
        updateStudentPagination({
            ...data,
            items: filteredItems,
            totalCount: filteredItems.length,
            totalPages: Math.max(1, Math.ceil(filteredItems.length / pageSize))
        });
    })
    .catch(error => {
        console.error('Error fetching student data:', error);
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
        // Still show pagination even if there's an error
        updateStudentPagination({ totalPages: 1, currentPage: 1 });
    });
}

// Search students
function searchStudents() {
    loadStudentData(1); // Reset to page 1 when searching
}

// Reset student search
function resetStudentSearch() {
    document.getElementById('searchStudentId').value = '';
    document.getElementById('searchStudentName').value = '';
    document.getElementById('searchClass').value = '';
    document.getElementById('searchFaculty').value = '';
    loadStudentData(1); // Reset to page 1
}

// Update student pagination
function updateStudentPagination(data) {
    const paginationContainer = document.querySelector('#students-content .pagination-container');
    paginationContainer.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentStudentPage <= 1 ? 'disabled' : ''}`;
    prevBtn.dataset.page = 'prev';
    prevBtn.disabled = currentStudentPage <= 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => loadStudentData(currentStudentPage - 1));
    paginationContainer.appendChild(prevBtn);

    // Page buttons
    for (let i = 1; i <= data.totalPages; i++) {
        if (data.totalPages > 5 && i > 2 && i < data.totalPages - 1 && Math.abs(i - currentStudentPage) > 1) {
            if (paginationContainer.lastChild && paginationContainer.lastChild.className !== 'pagination-ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            continue;
        }

        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentStudentPage ? 'active' : ''}`;
        pageBtn.dataset.page = i;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => loadStudentData(i));
        paginationContainer.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentStudentPage >= data.totalPages ? 'disabled' : ''}`;
    nextBtn.dataset.page = 'next';
    nextBtn.disabled = currentStudentPage >= data.totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => loadStudentData(currentStudentPage + 1));
    paginationContainer.appendChild(nextBtn);
}

// Show student modal for adding new student
function showStudentModal(studentId = null) {
    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    document.getElementById('studentForm').reset();
    document.getElementById('studentModalTitle').textContent = studentId ? 'Cập nhật sinh viên' : 'Thêm sinh viên mới';
    document.getElementById('studentId').value = studentId || '';

    if (studentId) {
        // Fetch student data for editing
        fetch(`/api/user-management/students/${studentId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('studentCode').value = data.studentCode;
            document.getElementById('studentName').value = data.fullName;
            document.getElementById('studentEmail').value = data.email;
            document.getElementById('studentPhone').value = data.phoneNumber || '';
            document.getElementById('studentClass').value = data.classCode;
            document.getElementById('studentFaculty').value = data.departmentCode;
            document.getElementById('studentStatus').value = data.isActive ? 'active' : 'inactive';
            // Add other fields as needed
        })
        .catch(error => {
            console.error('Error fetching student details:', error);
            alert('Không thể tải thông tin sinh viên. Vui lòng thử lại sau.');
            modal.hide();
        });
    }

    modal.show();
}

// Save student (create or update)
function saveStudent() {
    // Validate form
    const form = document.getElementById('studentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form values
    const studentId = document.getElementById('studentId').value;
    const studentCode = document.getElementById('studentCode').value;
    const studentName = document.getElementById('studentName').value;
    const studentDob = document.getElementById('studentDob').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const studentClass = document.getElementById('studentClass').value;
    const studentFaculty = document.getElementById('studentFaculty').value;
    const studentEmail = document.getElementById('studentEmail').value;
    const studentPhone = document.getElementById('studentPhone').value;
    const studentAddress = document.getElementById('studentAddress').value;
    const studentStatus = document.getElementById('studentStatus').value;

    // Create data object
    let data = {
        studentCode: studentCode,
        email: studentEmail,
        password: "defaultPassword123", // Default password, should be changed by user
        fullName: studentName,
        phoneNumber: studentPhone,
        departmentID: getDepartmentIdFromCode(studentFaculty),
        classID: 1, // Placeholder, should be retrieved from class lookup
        enrollmentYear: new Date().getFullYear(),
        isActive: studentStatus === 'active'
    };

    // Get current year if enrollment year is not specified
    data.enrollmentYear = data.enrollmentYear || new Date().getFullYear();

    // Try to map class name to class ID if available
    // This is a placeholder. In a real app, you would have a lookup service or API
    if (studentClass) {
        // For demo, just use a simple mapping or API call
        data.classID = getClassIdFromCode(studentClass) || 1;
    }

    console.log('Saving student data:', data);

    // Determine if this is a create or update operation
    const url = studentId
        ? `/api/user-management/students/${studentId}`
        : '/api/user-management/students';
    const method = studentId ? 'PUT' : 'POST';

    // Make API call
    fetch(url, {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            console.error('API response error:', response.status, response.statusText);
            return response.json().then(errData => {
                throw new Error(errData.message || `Server error: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Student saved successfully:', data);
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
        modal.hide();

        // Show success message
        showToast('success', 'Thành công', studentId ? 'Cập nhật sinh viên thành công' : 'Thêm sinh viên mới thành công');

        // Reload data
        loadStudentData(currentStudentPage);
    })
    .catch(error => {
        console.error('Error saving student:', error);
        showToast('error', 'Lỗi', `Không thể lưu sinh viên: ${error.message}`);
    });
}

// Edit student
function editStudent(studentId) {
    showStudentModal(studentId);
}

// Delete student
function deleteStudent(studentId) {
    if (confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) {
        fetch(`/api/user-management/students/${studentId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Có lỗi xảy ra');
                });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message);
            loadStudentData(currentStudentPage);
        })
        .catch(error => {
            console.error('Error deleting student:', error);
            alert(`Lỗi: ${error.message}`);
        });
    }
}

// ACCOUNTANT MANAGEMENT FUNCTIONALITY

// Load accountant data
function loadAccountantData(page = 1) {
    currentAccountantPage = page;
    const tableBody = document.getElementById('accountantsTableBody');
    tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Đang tải dữ liệu...</td></tr>';

    // Get filter values
    const accountantId = document.getElementById('searchAccountantId').value.trim();
    const accountantName = document.getElementById('searchAccountantName').value.trim();
    const department = document.getElementById('searchDepartment').value;

    // Build query string
    let queryParams = new URLSearchParams();
    if (accountantId) queryParams.append('employeeId', accountantId);
    if (accountantName) queryParams.append('name', accountantName);
    if (department) queryParams.append('department', department);
    queryParams.append('userType', 'Accountant');
    queryParams.append('page', page);
    queryParams.append('pageSize', pageSize);

    // Make API call
    fetch(`/api/user-management/accountants?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            console.error('API response error:', response.status, response.statusText);
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Accountant data received:', data);
        
        if (!data || !data.items || data.items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Không tìm thấy dữ liệu kế toán</td></tr>';
            updateAccountantPagination(data || { totalPages: 1, currentPage: 1 });
            return;
        }

        // Filter out non-Accountant users client-side
        const filteredItems = data.items.filter(accountant => {
            // Only include users with fullName "Accountant"
            return accountant.fullName === "Accountant";
        });

        if (filteredItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Không tìm thấy dữ liệu kế toán</td></tr>';
            updateAccountantPagination({ ...data, items: [], totalCount: 0, totalPages: 1, currentPage: 1 });
            return;
        }

        tableBody.innerHTML = '';
        filteredItems.forEach(accountant => {
            // Format data for display
            const dob = accountant.dateOfBirth ? formatDate(accountant.dateOfBirth) : 'N/A';
            const genderDisplay = accountant.gender || 'N/A';
            const departmentDisplay = accountant.department || 'N/A';
            const positionDisplay = accountant.position ? getPositionName(accountant.position) : 'N/A';
            const statusDisplay = accountant.isActive ? 'Đang làm việc' : 'Không hoạt động';
            const statusClass = accountant.isActive ? 'status-active' : 'status-inactive';

            tableBody.innerHTML += `
            <tr>
                <td>${accountant.employeeCode || accountant.email.split('@')[0] || 'N/A'}</td>
                <td>${accountant.fullName || 'N/A'}</td>
                <td>${dob}</td>
                <td>${genderDisplay}</td>
                <td>${departmentDisplay}</td>
                <td>${positionDisplay}</td>
                <td>${accountant.email || 'N/A'}</td>
                <td>${accountant.phoneNumber || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td>
                    <button class="action-btn edit-btn" data-id="${accountant.userID}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${accountant.userID}" title="Xóa">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
        });

        // Add event listeners to action buttons
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

        // Update pagination
        updateAccountantPagination({
            ...data,
            items: filteredItems,
            totalCount: filteredItems.length,
            totalPages: Math.max(1, Math.ceil(filteredItems.length / pageSize))
        });
    })
    .catch(error => {
        console.error('Error fetching accountant data:', error);
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
        // Still show pagination even if there's an error
        updateAccountantPagination({ totalPages: 1, currentPage: 1 });
    });
}

// Search accountants
function searchAccountants() {
    loadAccountantData(1); // Reset to page 1 when searching
}

// Reset accountant search
function resetAccountantSearch() {
    document.getElementById('searchAccountantId').value = '';
    document.getElementById('searchAccountantName').value = '';
    document.getElementById('searchDepartment').value = '';
    loadAccountantData(1); // Reset to page 1
}

// Update accountant pagination
function updateAccountantPagination(data) {
    const paginationContainer = document.querySelector('#accountants-content .pagination-container');
    paginationContainer.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentAccountantPage <= 1 ? 'disabled' : ''}`;
    prevBtn.dataset.page = 'prev';
    prevBtn.disabled = currentAccountantPage <= 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => loadAccountantData(currentAccountantPage - 1));
    paginationContainer.appendChild(prevBtn);

    // Page buttons
    for (let i = 1; i <= data.totalPages; i++) {
        if (data.totalPages > 5 && i > 2 && i < data.totalPages - 1 && Math.abs(i - currentAccountantPage) > 1) {
            if (paginationContainer.lastChild && paginationContainer.lastChild.className !== 'pagination-ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            continue;
        }

        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentAccountantPage ? 'active' : ''}`;
        pageBtn.dataset.page = i;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => loadAccountantData(i));
        paginationContainer.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentAccountantPage >= data.totalPages ? 'disabled' : ''}`;
    nextBtn.dataset.page = 'next';
    nextBtn.disabled = currentAccountantPage >= data.totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => loadAccountantData(currentAccountantPage + 1));
    paginationContainer.appendChild(nextBtn);
}

// Show accountant modal for adding new accountant
function showAccountantModal(accountantId = null) {
    const modal = new bootstrap.Modal(document.getElementById('accountantModal'));
    document.getElementById('accountantForm').reset();
    document.getElementById('accountantModalTitle').textContent = accountantId ? 'Cập nhật nhân viên kế toán' : 'Thêm nhân viên kế toán mới';
    document.getElementById('accountantId').value = accountantId || '';

    if (accountantId) {
        // Fetch accountant data for editing
        fetch(`/api/user-management/accountants/${accountantId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('accountantCode').value = data.userId; // Using UserID as employee code
            document.getElementById('accountantName').value = data.fullName;
            document.getElementById('accountantEmail').value = data.email;
            document.getElementById('accountantPhone').value = data.phoneNumber || '';
            document.getElementById('accountantDepartment').value = data.department || '';
            document.getElementById('accountantPosition').value = data.position || '';
            document.getElementById('accountantStatus').value = data.isActive ? 'active' : 'inactive';
            // Add other fields as needed
        })
        .catch(error => {
            console.error('Error fetching accountant details:', error);
            alert('Không thể tải thông tin nhân viên kế toán. Vui lòng thử lại sau.');
            modal.hide();
        });
    }

    modal.show();
}

// Save accountant (create or update)
function saveAccountant() {
    // Validate form
    const form = document.getElementById('accountantForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form values
    const accountantId = document.getElementById('accountantId').value;
    const accountantCode = document.getElementById('accountantCode').value;
    const accountantName = document.getElementById('accountantName').value;
    const accountantDob = document.getElementById('accountantDob').value;
    const gender = document.querySelector('input[name="accountantGender"]:checked').value;
    const accountantDepartment = document.getElementById('accountantDepartment').value;
    const accountantPosition = document.getElementById('accountantPosition').value;
    const accountantEmail = document.getElementById('accountantEmail').value;
    const accountantPhone = document.getElementById('accountantPhone').value;
    const accountantAddress = document.getElementById('accountantAddress').value;
    const accountantStatus = document.getElementById('accountantStatus').value;

    // Create data object
    let data = {
        email: accountantEmail,
        password: "defaultPassword123", // Default password, should be changed by user
        fullName: accountantName,
        phoneNumber: accountantPhone,
        department: accountantDepartment,
        position: accountantPosition,
        isActive: accountantStatus === 'active'
    };

    console.log('Saving accountant data:', data);

    // Determine if this is a create or update operation
    const url = accountantId
        ? `/api/user-management/accountants/${accountantId}`
        : '/api/user-management/accountants';
    const method = accountantId ? 'PUT' : 'POST';

    // Make API call
    fetch(url, {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            console.error('API response error:', response.status, response.statusText);
            return response.json().then(errData => {
                throw new Error(errData.message || `Server error: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Accountant saved successfully:', data);
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountantModal'));
        modal.hide();

        // Show success message
        showToast('success', 'Thành công', accountantId ? 'Cập nhật kế toán thành công' : 'Thêm kế toán mới thành công');

        // Reload data
        loadAccountantData(currentAccountantPage);
    })
    .catch(error => {
        console.error('Error saving accountant:', error);
        showToast('error', 'Lỗi', `Không thể lưu kế toán: ${error.message}`);
    });
}

// Edit accountant
function editAccountant(accountantId) {
    showAccountantModal(accountantId);
}

// Delete accountant
function deleteAccountant(accountantId) {
    if (confirm('Bạn có chắc chắn muốn xóa nhân viên kế toán này?')) {
        fetch(`/api/user-management/accountants/${accountantId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Có lỗi xảy ra');
                });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message);
            loadAccountantData(currentAccountantPage);
        })
        .catch(error => {
            console.error('Error deleting accountant:', error);
            alert(`Lỗi: ${error.message}`);
        });
    }
}

// UTILITY FUNCTIONS

// Format date for display (YYYY-MM-DD to DD/MM/YYYY)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Get department ID from code
function getDepartmentIdFromCode(departmentCode) {
    // This is a placeholder function - in a real app, you'd map department codes to IDs
    // For now, we'll return a placeholder value
    const departmentMap = {
        'CNTT': 1,
        'QTKD': 2,
        'KT': 3,
        'NNA': 4
    };
    return departmentMap[departmentCode] || 1;
}

// Get class ID from code
function getClassIdFromCode(classCode) {
    // This is a placeholder function - in a real app, you'd map class codes to IDs
    // For now, we'll return a placeholder value
    return 1;
}

// Get department name from code
function getDepartmentName(departmentCode) {
    const departmentMap = {
        'CNTT': 'Công nghệ thông tin',
        'QTKD': 'Quản trị kinh doanh',
        'KT': 'Kế toán',
        'NNA': 'Ngôn ngữ Anh',
        'KTTC': 'Kế toán tài chính',
        'KTHP': 'Kế toán học phí',
        'KTTS': 'Kế toán tài sản'
    };
    return departmentMap[departmentCode] || departmentCode;
}

// Get position name from code
function getPositionName(positionCode) {
    const positionMap = {
        'truong_phong': 'Trưởng phòng',
        'pho_phong': 'Phó phòng',
        'nhan_vien': 'Nhân viên'
    };
    return positionMap[positionCode] || positionCode;
}

// Get accountant status display
function getAccountantStatusDisplay(status) {
    const statusMap = {
        'active': 'Đang làm việc',
        'on_leave': 'Nghỉ phép',
        'retired': 'Đã nghỉ việc'
    };
    return statusMap[status] || status;
}

// Get accountant status CSS class
function getAccountantStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'on_leave': 'status-warning',
        'retired': 'status-inactive'
    };
    return statusMap[status] || '';
}
