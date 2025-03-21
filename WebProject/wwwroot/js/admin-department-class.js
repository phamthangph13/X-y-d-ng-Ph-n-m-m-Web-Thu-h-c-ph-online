import { showToast } from './utils/toast.js';
import { checkAdminAuth, logout, getAuthToken } from './utils/auth.js';

// Admin Department and Class Management

// Global variables
let currentDepartmentPage = 1;
let currentClassPage = 1;
const pageSize = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Authentication check for admin
    checkAdminAuth();

    // Initialize the UI
    initializeSidebar();
    initializeLogout();
    loadDepartmentData();

    // Set up tab switching to load appropriate data
    document.getElementById('departments-tab').addEventListener('click', function() {
        loadDepartmentData();
    });

    document.getElementById('classes-tab').addEventListener('click', function() {
        loadClassData();
    });

    // Button event listeners for departments
    document.getElementById('searchDepartmentBtn').addEventListener('click', function() {
        searchDepartments();
    });

    document.getElementById('resetDepartmentSearchBtn').addEventListener('click', function() {
        resetDepartmentSearch();
    });

    document.getElementById('addDepartmentBtn').addEventListener('click', function() {
        showDepartmentModal();
    });

    document.getElementById('saveDepartmentBtn').addEventListener('click', function() {
        saveDepartment();
    });

    document.getElementById('importDepartmentsBtn').addEventListener('click', function() {
        // Import departments from Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng nhập từ Excel đang được phát triển');
    });

    document.getElementById('exportDepartmentsBtn').addEventListener('click', function() {
        // Export departments to Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng xuất ra Excel đang được phát triển');
    });

    // Button event listeners for classes
    document.getElementById('searchClassBtn').addEventListener('click', function() {
        searchClasses();
    });

    document.getElementById('resetClassSearchBtn').addEventListener('click', function() {
        resetClassSearch();
    });

    document.getElementById('addClassBtn').addEventListener('click', function() {
        showClassModal();
    });

    document.getElementById('saveClassBtn').addEventListener('click', function() {
        saveClass();
    });

    document.getElementById('importClassesBtn').addEventListener('click', function() {
        // Import classes from Excel functionality
        showToast('info', 'Tính năng đang phát triển', 'Chức năng nhập từ Excel đang được phát triển');
    });

    document.getElementById('exportClassesBtn').addEventListener('click', function() {
        // Export classes to Excel functionality
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

// DEPARTMENT MANAGEMENT FUNCTIONALITY

// Load department data
function loadDepartmentData(page = 1) {
    currentDepartmentPage = page;
    const tableBody = document.getElementById('departmentsTableBody');
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>';

    // Get filter values
    const departmentId = document.getElementById('searchDepartmentId').value.trim();
    const departmentName = document.getElementById('searchDepartmentName').value.trim();

    // Build query string
    let queryParams = new URLSearchParams();
    if (departmentId) queryParams.append('departmentId', departmentId);
    if (departmentName) queryParams.append('name', departmentName);
    queryParams.append('page', page);
    queryParams.append('pageSize', pageSize);

    // For demo purposes, use mock data instead of API call
    // In a real application, you would make an API call to fetch data
    const mockData = getMockDepartmentData();
    renderDepartmentData(mockData);
}

// Get mock department data for demo
function getMockDepartmentData() {
    return {
        items: [
            {
                departmentID: 1,
                departmentCode: "CNTT",
                departmentName: "Công nghệ thông tin",
                classCount: 5,
                studentCount: 120,
                departmentHead: "Nguyễn Văn A",
                foundingDate: "2000-09-01",
                isActive: true
            },
            {
                departmentID: 2,
                departmentCode: "QTKD",
                departmentName: "Quản trị kinh doanh",
                classCount: 4,
                studentCount: 110,
                departmentHead: "Trần Thị B",
                foundingDate: "2001-09-01",
                isActive: true
            },
            {
                departmentID: 3,
                departmentCode: "KT",
                departmentName: "Kế toán",
                classCount: 3,
                studentCount: 95,
                departmentHead: "Lê Văn C",
                foundingDate: "2002-09-01",
                isActive: true
            },
            {
                departmentID: 4,
                departmentCode: "NNA",
                departmentName: "Ngôn ngữ Anh",
                classCount: 4,
                studentCount: 105,
                departmentHead: "Phạm Thị D",
                foundingDate: "2003-09-01",
                isActive: true
            }
        ],
        totalCount: 4,
        pageSize: 10,
        currentPage: 1,
        totalPages: 1
    };
}

// Render department data to the table
function renderDepartmentData(data) {
    const tableBody = document.getElementById('departmentsTableBody');
    
    if (!data || !data.items || data.items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Không tìm thấy dữ liệu khoa</td></tr>';
        updateDepartmentPagination(data || { totalPages: 1, currentPage: 1 });
        return;
    }

    tableBody.innerHTML = '';
    data.items.forEach(department => {
        // Format data for display
        const foundingDate = department.foundingDate ? formatDate(department.foundingDate) : 'N/A';
        const statusClass = department.isActive ? 'status-active' : 'status-inactive';
        const statusDisplay = department.isActive ? 'Hoạt động' : 'Không hoạt động';

        tableBody.innerHTML += `
        <tr>
            <td>${department.departmentCode || 'N/A'}</td>
            <td>${department.departmentName || 'N/A'}</td>
            <td>${department.classCount || 0}</td>
            <td>${department.studentCount || 0}</td>
            <td>${department.departmentHead || 'N/A'}</td>
            <td>${foundingDate}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td>
                <button class="action-btn edit-btn" data-id="${department.departmentID}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${department.departmentID}" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>`;
    });

    // Add event listeners to action buttons
    document.querySelectorAll('#departmentsTableBody .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const departmentId = this.getAttribute('data-id');
            editDepartment(departmentId);
        });
    });

    document.querySelectorAll('#departmentsTableBody .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const departmentId = this.getAttribute('data-id');
            deleteDepartment(departmentId);
        });
    });

    // Update pagination
    updateDepartmentPagination(data);
}

// Search departments
function searchDepartments() {
    loadDepartmentData(1); // Reset to page 1 when searching
}

// Reset department search
function resetDepartmentSearch() {
    document.getElementById('searchDepartmentId').value = '';
    document.getElementById('searchDepartmentName').value = '';
    loadDepartmentData(1); // Reset to page 1
}

// Update department pagination
function updateDepartmentPagination(data) {
    const paginationContainer = document.querySelector('#departments-content .pagination-container');
    paginationContainer.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentDepartmentPage <= 1 ? 'disabled' : ''}`;
    prevBtn.dataset.page = 'prev';
    prevBtn.disabled = currentDepartmentPage <= 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => loadDepartmentData(currentDepartmentPage - 1));
    paginationContainer.appendChild(prevBtn);

    // Page buttons
    for (let i = 1; i <= data.totalPages; i++) {
        if (data.totalPages > 5 && i > 2 && i < data.totalPages - 1 && Math.abs(i - currentDepartmentPage) > 1) {
            if (paginationContainer.lastChild && paginationContainer.lastChild.className !== 'pagination-ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            continue;
        }

        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentDepartmentPage ? 'active' : ''}`;
        pageBtn.dataset.page = i;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => loadDepartmentData(i));
        paginationContainer.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentDepartmentPage >= data.totalPages ? 'disabled' : ''}`;
    nextBtn.dataset.page = 'next';
    nextBtn.disabled = currentDepartmentPage >= data.totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => loadDepartmentData(currentDepartmentPage + 1));
    paginationContainer.appendChild(nextBtn);
}

// Show department modal for adding new department
function showDepartmentModal(departmentId = null) {
    const modal = new bootstrap.Modal(document.getElementById('departmentModal'));
    document.getElementById('departmentForm').reset();
    document.getElementById('departmentModalTitle').textContent = departmentId ? 'Cập nhật khoa' : 'Thêm khoa mới';
    document.getElementById('departmentId').value = departmentId || '';

    if (departmentId) {
        // For demo purposes, fetch from mock data
        // In a real application, you would make an API call
        const mockData = getMockDepartmentData();
        const department = mockData.items.find(d => d.departmentID == departmentId);
        
        if (department) {
            document.getElementById('departmentCode').value = department.departmentCode;
            document.getElementById('departmentName').value = department.departmentName;
            document.getElementById('departmentHead').value = department.departmentHead || '';
            document.getElementById('departmentFoundingDate').value = department.foundingDate ? formatDateForInput(department.foundingDate) : '';
            document.getElementById('departmentStatus').value = department.isActive ? 'active' : 'inactive';
        } else {
            showToast('error', 'Lỗi', 'Không tìm thấy thông tin khoa');
            return;
        }
    }

    modal.show();
}

// Save department (create or update)
function saveDepartment() {
    // Validate form
    const form = document.getElementById('departmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form values
    const departmentId = document.getElementById('departmentId').value;
    const departmentCode = document.getElementById('departmentCode').value;
    const departmentName = document.getElementById('departmentName').value;
    const departmentHead = document.getElementById('departmentHead').value;
    const foundingDate = document.getElementById('departmentFoundingDate').value;
    const description = document.getElementById('departmentDescription').value;
    const status = document.getElementById('departmentStatus').value;

    // Create data object
    let data = {
        departmentCode: departmentCode,
        departmentName: departmentName,
        departmentHead: departmentHead,
        foundingDate: foundingDate,
        description: description,
        isActive: status === 'active'
    };

    console.log('Saving department data:', data);

    // In a real application, you would make an API call to save data
    // For demo purposes, just show success message and reload

    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('departmentModal'));
    modal.hide();

    // Show success message
    showToast('success', 'Thành công', departmentId ? 'Cập nhật khoa thành công' : 'Thêm khoa mới thành công');

    // Reload data
    loadDepartmentData(currentDepartmentPage);
}

// Edit department
function editDepartment(departmentId) {
    showDepartmentModal(departmentId);
}

// Delete department
function deleteDepartment(departmentId) {
    if (confirm('Bạn có chắc chắn muốn xóa khoa này?')) {
        // In a real application, you would make an API call to delete
        // For demo purposes, just show success message and reload
        showToast('success', 'Thành công', 'Xóa khoa thành công');
        loadDepartmentData(currentDepartmentPage);
    }
}

// CLASS MANAGEMENT FUNCTIONALITY

// Load class data
function loadClassData(page = 1) {
    currentClassPage = page;
    const tableBody = document.getElementById('classesTableBody');
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>';

    // Get filter values
    const classId = document.getElementById('searchClassId').value.trim();
    const className = document.getElementById('searchClassName').value.trim();
    const department = document.getElementById('searchClassDepartment').value;

    // Build query string
    let queryParams = new URLSearchParams();
    if (classId) queryParams.append('classId', classId);
    if (className) queryParams.append('name', className);
    if (department) queryParams.append('departmentId', getDepartmentIdFromCode(department));
    queryParams.append('page', page);
    queryParams.append('pageSize', pageSize);

    // For demo purposes, use mock data instead of API call
    // In a real application, you would make an API call to fetch data
    const mockData = getMockClassData();
    renderClassData(mockData);
}

// Get mock class data for demo
function getMockClassData() {
    return {
        items: [
            {
                classID: 1,
                classCode: "CSA",
                className: "Computer Science - Class A",
                departmentCode: "CNTT",
                departmentName: "Công nghệ thông tin",
                studentCount: 30,
                teacher: "Nguyễn Văn X",
                startYear: 2020,
                isActive: true
            },
            {
                classID: 2,
                classCode: "CSB",
                className: "Computer Science - Class B",
                departmentCode: "CNTT",
                departmentName: "Công nghệ thông tin",
                studentCount: 32,
                teacher: "Trần Thị Y",
                startYear: 2020,
                isActive: true
            },
            {
                classID: 3,
                classCode: "BMA",
                className: "Business Management - Class A",
                departmentCode: "QTKD",
                departmentName: "Quản trị kinh doanh",
                studentCount: 28,
                teacher: "Lê Văn Z",
                startYear: 2021,
                isActive: true
            },
            {
                classID: 4,
                classCode: "ACA",
                className: "Accounting - Class A",
                departmentCode: "KT",
                departmentName: "Kế toán",
                studentCount: 25,
                teacher: "Phạm Thị W",
                startYear: 2021,
                isActive: true
            },
            {
                classID: 5,
                classCode: "ENA",
                className: "English - Class A",
                departmentCode: "NNA",
                departmentName: "Ngôn ngữ Anh",
                studentCount: 26,
                teacher: "Hoàng Văn V",
                startYear: 2022,
                isActive: true
            }
        ],
        totalCount: 5,
        pageSize: 10,
        currentPage: 1,
        totalPages: 1
    };
}

// Render class data to the table
function renderClassData(data) {
    const tableBody = document.getElementById('classesTableBody');
    
    if (!data || !data.items || data.items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Không tìm thấy dữ liệu lớp học</td></tr>';
        updateClassPagination(data || { totalPages: 1, currentPage: 1 });
        return;
    }

    tableBody.innerHTML = '';
    data.items.forEach(cls => {
        // Format data for display
        const statusClass = cls.isActive ? 'status-active' : 'status-inactive';
        const statusDisplay = cls.isActive ? 'Đang hoạt động' : 'Đã kết thúc';

        tableBody.innerHTML += `
        <tr>
            <td>${cls.classCode || 'N/A'}</td>
            <td>${cls.className || 'N/A'}</td>
            <td>${cls.departmentName || 'N/A'}</td>
            <td>${cls.studentCount || 0}</td>
            <td>${cls.teacher || 'N/A'}</td>
            <td>${cls.startYear || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td>
                <button class="action-btn edit-btn" data-id="${cls.classID}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${cls.classID}" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>`;
    });

    // Add event listeners to action buttons
    document.querySelectorAll('#classesTableBody .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = this.getAttribute('data-id');
            editClass(classId);
        });
    });

    document.querySelectorAll('#classesTableBody .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = this.getAttribute('data-id');
            deleteClass(classId);
        });
    });

    // Update pagination
    updateClassPagination(data);
}

// Search classes
function searchClasses() {
    loadClassData(1); // Reset to page 1 when searching
}

// Reset class search
function resetClassSearch() {
    document.getElementById('searchClassId').value = '';
    document.getElementById('searchClassName').value = '';
    document.getElementById('searchClassDepartment').value = '';
    loadClassData(1); // Reset to page 1
}

// Update class pagination
function updateClassPagination(data) {
    const paginationContainer = document.querySelector('#classes-content .pagination-container');
    paginationContainer.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentClassPage <= 1 ? 'disabled' : ''}`;
    prevBtn.dataset.page = 'prev';
    prevBtn.disabled = currentClassPage <= 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => loadClassData(currentClassPage - 1));
    paginationContainer.appendChild(prevBtn);

    // Page buttons
    for (let i = 1; i <= data.totalPages; i++) {
        if (data.totalPages > 5 && i > 2 && i < data.totalPages - 1 && Math.abs(i - currentClassPage) > 1) {
            if (paginationContainer.lastChild && paginationContainer.lastChild.className !== 'pagination-ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            continue;
        }

        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentClassPage ? 'active' : ''}`;
        pageBtn.dataset.page = i;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => loadClassData(i));
        paginationContainer.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentClassPage >= data.totalPages ? 'disabled' : ''}`;
    nextBtn.dataset.page = 'next';
    nextBtn.disabled = currentClassPage >= data.totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => loadClassData(currentClassPage + 1));
    paginationContainer.appendChild(nextBtn);
}

// Show class modal for adding new class
function showClassModal(classId = null) {
    const modal = new bootstrap.Modal(document.getElementById('classModal'));
    document.getElementById('classForm').reset();
    document.getElementById('classModalTitle').textContent = classId ? 'Cập nhật lớp học' : 'Thêm lớp học mới';
    document.getElementById('classId').value = classId || '';

    if (classId) {
        // For demo purposes, fetch from mock data
        // In a real application, you would make an API call
        const mockData = getMockClassData();
        const classData = mockData.items.find(c => c.classID == classId);
        
        if (classData) {
            document.getElementById('classCode').value = classData.classCode;
            document.getElementById('className').value = classData.className;
            document.getElementById('classDepartment').value = classData.departmentCode;
            document.getElementById('classTeacher').value = classData.teacher || '';
            document.getElementById('classStartYear').value = classData.startYear || '';
            document.getElementById('classStatus').value = classData.isActive ? 'active' : 'inactive';
        } else {
            showToast('error', 'Lỗi', 'Không tìm thấy thông tin lớp học');
            return;
        }
    }

    modal.show();
}

// Save class (create or update)
function saveClass() {
    // Validate form
    const form = document.getElementById('classForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form values
    const classId = document.getElementById('classId').value;
    const classCode = document.getElementById('classCode').value;
    const className = document.getElementById('className').value;
    const department = document.getElementById('classDepartment').value;
    const teacher = document.getElementById('classTeacher').value;
    const startYear = document.getElementById('classStartYear').value;
    const maxStudents = document.getElementById('classMaxStudents').value;
    const description = document.getElementById('classDescription').value;
    const status = document.getElementById('classStatus').value;

    // Create data object
    let data = {
        classCode: classCode,
        className: className,
        departmentCode: department,
        departmentId: getDepartmentIdFromCode(department),
        teacher: teacher,
        startYear: startYear,
        maxStudents: maxStudents,
        description: description,
        isActive: status === 'active'
    };

    console.log('Saving class data:', data);

    // In a real application, you would make an API call to save data
    // For demo purposes, just show success message and reload

    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('classModal'));
    modal.hide();

    // Show success message
    showToast('success', 'Thành công', classId ? 'Cập nhật lớp học thành công' : 'Thêm lớp học mới thành công');

    // Reload data
    loadClassData(currentClassPage);
}

// Edit class
function editClass(classId) {
    showClassModal(classId);
}

// Delete class
function deleteClass(classId) {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
        // In a real application, you would make an API call to delete
        // For demo purposes, just show success message and reload
        showToast('success', 'Thành công', 'Xóa lớp học thành công');
        loadClassData(currentClassPage);
    }
}

// UTILITY FUNCTIONS

// Format date for display (YYYY-MM-DD to DD/MM/YYYY)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Get department ID from code
function getDepartmentIdFromCode(departmentCode) {
    // This is a placeholder function - in a real app, you'd map department codes to IDs
    const departmentMap = {
        'CNTT': 1,
        'QTKD': 2,
        'KT': 3,
        'NNA': 4
    };
    return departmentMap[departmentCode] || 1;
}

// Get department name from code
function getDepartmentName(departmentCode) {
    const departmentMap = {
        'CNTT': 'Công nghệ thông tin',
        'QTKD': 'Quản trị kinh doanh',
        'KT': 'Kế toán',
        'NNA': 'Ngôn ngữ Anh'
    };
    return departmentMap[departmentCode] || departmentCode;
} 