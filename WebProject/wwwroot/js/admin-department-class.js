import { showToast } from './utils/toast.js';
import { checkAdminAuth, logout, getAuthToken } from './utils/auth.js';

// Admin Department and Class Management

// Global variables
let currentDepartmentPage = 1;
let currentClassPage = 1;
const pageSize = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Authentication check for admin - Add development mode bypass
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Running in development mode - bypassing admin authentication check');
        // Set a demo token if none exists
        if (!getAuthToken()) {
            localStorage.setItem('auth_token', 'demo_token');
            localStorage.setItem('user_data', JSON.stringify({
                userId: 1,
                email: 'admin@example.com',
                fullName: 'Administrator',
                role: 'Admin'
            }));
        }
    } else {
        checkAdminAuth();
    }

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
    
    // Modal close events
    document.querySelectorAll('.modal .btn-close, .modal .admin-btn-secondary[data-bs-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.closest('.modal').id;
            const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
            if (modal) {
                modal.hide();
            }
            clearModalBackdrop();
        });
    });
    
    // Setup modals
    setupModals();
});

// Setup modals
function setupModals() {
    // Department modal setup
    const departmentModal = document.getElementById('departmentModal');
    if (departmentModal) {
        departmentModal.addEventListener('hidden.bs.modal', function() {
            clearModalBackdrop();
        });
        
        const cancelBtn = departmentModal.querySelector('.admin-btn-secondary[data-bs-dismiss="modal"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const modal = bootstrap.Modal.getInstance(departmentModal);
                if (modal) {
                    modal.hide();
                }
                clearModalBackdrop();
            });
        }
    }
    
    // Class modal setup
    const classModal = document.getElementById('classModal');
    if (classModal) {
        classModal.addEventListener('hidden.bs.modal', function() {
            clearModalBackdrop();
        });
        
        const cancelBtn = classModal.querySelector('.admin-btn-secondary[data-bs-dismiss="modal"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const modal = bootstrap.Modal.getInstance(classModal);
                if (modal) {
                    modal.hide();
                }
                clearModalBackdrop();
            });
        }
    }
}

// Hàm xóa modal backdrop
function clearModalBackdrop() {
    // Xóa tất cả các modal-backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
    });
    
    // Reset body style
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

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
async function loadDepartmentData(page = 1) {
    currentDepartmentPage = page;
    const tableBody = document.getElementById('departmentsTableBody');
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>';

    // Get filter values
    const departmentCode = document.getElementById('searchDepartmentId').value.trim();
    const departmentName = document.getElementById('searchDepartmentName').value.trim();

    // Build query string
    let queryParams = new URLSearchParams();
    if (departmentCode) queryParams.append('departmentCode', departmentCode);
    if (departmentName) queryParams.append('name', departmentName);
    queryParams.append('page', page);
    queryParams.append('pageSize', pageSize);

    try {
        const token = getAuthToken();
        
        // If no token and in development mode, use mock data
        if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.warn('No authentication token found, using mock data for development');
            const mockData = {
                items: [
                    {
                        departmentID: 1,
                        departmentCode: "CNTT",
                        departmentName: "Công nghệ thông tin",
                        classCount: 5,
                        studentCount: 120,
                        head: "Nguyễn Văn A",
                        foundingDate: "2000-09-01",
                        isActive: true
                    },
                    {
                        departmentID: 2,
                        departmentCode: "QTKD",
                        departmentName: "Quản trị kinh doanh",
                        classCount: 4,
                        studentCount: 110,
                        head: "Trần Thị B",
                        foundingDate: "2001-09-01",
                        isActive: true
                    }
                ],
                totalCount: 2,
                pageSize: 10,
                currentPage: 1,
                totalPages: 1
            };
            renderDepartmentData(mockData);
            return;
        }
        
        const response = await fetch(`/api/departments?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch department data');
        }

        const data = await response.json();
        renderDepartmentData(data);
    } catch (error) {
        console.error('Error loading department data:', error);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
        showToast('error', 'Lỗi', 'Không thể tải dữ liệu khoa');
    }
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
            <td>${department.head || 'N/A'}</td>
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
    loadDepartmentData(1);
}

// Reset department search form
function resetDepartmentSearch() {
    document.getElementById('searchDepartmentId').value = '';
    document.getElementById('searchDepartmentName').value = '';
    loadDepartmentData(1);
}

// Update department pagination
function updateDepartmentPagination(data) {
    const paginationContainer = document.querySelector('#departments-content .pagination-container');
    
    if (!paginationContainer) return;
    
    // Clear previous pagination
    paginationContainer.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.setAttribute('data-page', 'prev');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = data.currentPage <= 1;
    prevBtn.addEventListener('click', function() {
        if (data.currentPage > 1) {
            loadDepartmentData(data.currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevBtn);
    
    // Page buttons
    const totalPages = Math.min(data.totalPages, 5);
    let startPage = Math.max(1, data.currentPage - 2);
    let endPage = Math.min(data.totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        if (i === data.currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.setAttribute('data-page', i);
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', function() {
            loadDepartmentData(i);
        });
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.setAttribute('data-page', 'next');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = data.currentPage >= data.totalPages;
    nextBtn.addEventListener('click', function() {
        if (data.currentPage < data.totalPages) {
            loadDepartmentData(data.currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextBtn);
}

// Show department modal for add/edit
async function showDepartmentModal(departmentId = null) {
    // Đảm bảo xóa các modal backdrop cũ
    clearModalBackdrop();
    
    // Đóng modal hiện tại nếu có
    const existingModal = bootstrap.Modal.getInstance(document.getElementById('departmentModal'));
    if (existingModal) {
        existingModal.dispose();
    }
    
    const modalElement = document.getElementById('departmentModal');
    
    // Đặt lại style ban đầu
    modalElement.style.display = '';
    modalElement.style.paddingRight = '';
    modalElement.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true,
        focus: true
    });
    
    const modalTitle = document.getElementById('departmentModalTitle');
    const departmentForm = document.getElementById('departmentForm');
    
    // Reset form
    departmentForm.reset();
    document.getElementById('departmentId').value = '';
    
    // Set default status to active
    document.getElementById('departmentStatus').value = 'active';
    
    if (departmentId) {
        // Edit mode
        modalTitle.textContent = 'Chỉnh sửa thông tin khoa';
        try {
            const token = getAuthToken();
            
            // Nếu đang ở chế độ dev và không có token, sử dụng dữ liệu mẫu
            if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                const mockDepartment = {
                    departmentID: departmentId,
                    departmentCode: "CNTT",
                    departmentName: "Công nghệ thông tin",
                    head: "Nguyễn Văn A",
                    foundingDate: "2000-09-01",
                    description: "Khoa đào tạo về công nghệ thông tin",
                    isActive: true
                };
                
                // Fill form with department data
                document.getElementById('departmentId').value = mockDepartment.departmentID;
                document.getElementById('departmentCode').value = mockDepartment.departmentCode;
                document.getElementById('departmentName').value = mockDepartment.departmentName;
                document.getElementById('departmentHead').value = mockDepartment.head || '';
                
                if (mockDepartment.foundingDate) {
                    document.getElementById('departmentFoundingDate').value = formatDateForInput(mockDepartment.foundingDate);
                }
                
                document.getElementById('departmentDescription').value = mockDepartment.description || '';
                document.getElementById('departmentStatus').value = mockDepartment.isActive ? 'active' : 'inactive';
                
                modal.show();
                return;
            }
            
            const response = await fetch(`/api/departments/${departmentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch department data');
            }

            const department = await response.json();
            
            // Fill form with department data
            document.getElementById('departmentId').value = department.departmentID;
            document.getElementById('departmentCode').value = department.departmentCode;
            document.getElementById('departmentName').value = department.departmentName;
            document.getElementById('departmentHead').value = department.head || '';
            
            if (department.foundingDate) {
                document.getElementById('departmentFoundingDate').value = formatDateForInput(department.foundingDate);
            }
            
            document.getElementById('departmentDescription').value = department.description || '';
            document.getElementById('departmentStatus').value = department.isActive ? 'active' : 'inactive';
        } catch (error) {
            console.error('Error fetching department:', error);
            showToast('error', 'Lỗi', 'Không thể tải thông tin khoa');
            return;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Thêm khoa mới';
    }
    
    // Hiển thị modal
    modal.show();
}

// Save department (create or update)
async function saveDepartment() {
    // Get form data
    const departmentId = document.getElementById('departmentId').value;
    const departmentCode = document.getElementById('departmentCode').value;
    const departmentName = document.getElementById('departmentName').value;
    const departmentHead = document.getElementById('departmentHead').value;
    const departmentFoundingDate = document.getElementById('departmentFoundingDate').value;
    const departmentDescription = document.getElementById('departmentDescription').value;
    const departmentStatus = document.getElementById('departmentStatus').value;

    // Validate required fields
    if (!departmentCode || !departmentName) {
        showToast('error', 'Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }

    try {
        const token = getAuthToken();
        let url = '/api/departments';
        let method = 'POST';
        
        // Prepare data
        const data = {
            departmentCode: departmentCode,
            departmentName: departmentName,
            head: departmentHead,
            foundingDate: departmentFoundingDate || null,
            isActive: departmentStatus === 'active',
            description: departmentDescription
        };
        
        // If updating existing department
        if (departmentId) {
            url = `/api/departments/${departmentId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save department');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('departmentModal'));
        modal.hide();
        
        // Reload department data
        loadDepartmentData(currentDepartmentPage);
        
        showToast('success', 'Thành công', departmentId ? 'Đã cập nhật thông tin khoa' : 'Đã thêm khoa mới');
    } catch (error) {
        console.error('Error saving department:', error);
        showToast('error', 'Lỗi', error.message || 'Không thể lưu thông tin khoa');
    }
}

// Edit department
function editDepartment(departmentId) {
    showDepartmentModal(departmentId);
}

// Delete department
async function deleteDepartment(departmentId) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoa này không?')) {
        return;
    }
    
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/departments/${departmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete department');
        }
        
        // Reload department data
        loadDepartmentData(currentDepartmentPage);
        showToast('success', 'Thành công', 'Đã xóa khoa');
    } catch (error) {
        console.error('Error deleting department:', error);
        showToast('error', 'Lỗi', error.message || 'Không thể xóa khoa');
    }
}

// CLASS MANAGEMENT FUNCTIONALITY

// Load class data
async function loadClassData(page = 1) {
    currentClassPage = page;
    const tableBody = document.getElementById('classesTableBody');
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>';
    
    // Get filter values
    const classCode = document.getElementById('searchClassId').value.trim();
    const className = document.getElementById('searchClassName').value.trim();
    const departmentId = document.getElementById('searchClassDepartment').value.trim();
    
    // Build query string
    let queryParams = new URLSearchParams();
    if (classCode) queryParams.append('classCode', classCode);
    if (className) queryParams.append('className', className);
    if (departmentId) queryParams.append('departmentId', departmentId);
    queryParams.append('page', page);
    queryParams.append('pageSize', pageSize);
    
    try {
        const token = getAuthToken();
        
        // If no token and in development mode, use mock data
        if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.warn('No authentication token found, using mock data for development');
            const mockData = {
                items: [
                    {
                        classID: 1,
                        classCode: "CSA",
                        className: "Computer Science - Class A",
                        departmentID: 1,
                        departmentName: "Công nghệ thông tin",
                        studentCount: 30,
                        teacher: "Nguyễn Văn X",
                        startYear: 2022,
                        isActive: true
                    },
                    {
                        classID: 2,
                        classCode: "CSB",
                        className: "Computer Science - Class B",
                        departmentID: 1,
                        departmentName: "Công nghệ thông tin",
                        studentCount: 32,
                        teacher: "Trần Thị Y",
                        startYear: 2022,
                        isActive: true
                    }
                ],
                totalCount: 2,
                pageSize: 10,
                currentPage: 1,
                totalPages: 1
            };
            renderClassData(mockData);
            return;
        }
        
        const response = await fetch(`/api/classes?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch class data');
        }

        const data = await response.json();
        renderClassData(data);
    } catch (error) {
        console.error('Error loading class data:', error);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
        showToast('error', 'Lỗi', 'Không thể tải dữ liệu lớp học');
    }
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
    data.items.forEach(classItem => {
        const startYear = classItem.startYear || 'N/A';
        const statusClass = classItem.isActive ? 'status-active' : 'status-inactive';
        const statusDisplay = classItem.isActive ? 'Đang hoạt động' : 'Đã kết thúc';
        
        tableBody.innerHTML += `
        <tr>
            <td>${classItem.classCode || 'N/A'}</td>
            <td>${classItem.className || 'N/A'}</td>
            <td>${classItem.departmentName || 'N/A'}</td>
            <td>${classItem.studentCount || 0}</td>
            <td>${classItem.teacher || 'N/A'}</td>
            <td>${startYear}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td>
                <button class="action-btn edit-btn" data-id="${classItem.classID}" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${classItem.classID}" title="Xóa">
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
    loadClassData(1);
}

// Reset class search form
function resetClassSearch() {
    document.getElementById('searchClassId').value = '';
    document.getElementById('searchClassName').value = '';
    document.getElementById('searchClassDepartment').value = '';
    loadClassData(1);
}

// Update class pagination
function updateClassPagination(data) {
    const paginationContainer = document.querySelector('#classes-content .pagination-container');
    
    if (!paginationContainer) return;
    
    // Clear previous pagination
    paginationContainer.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.setAttribute('data-page', 'prev');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = data.currentPage <= 1;
    prevBtn.addEventListener('click', function() {
        if (data.currentPage > 1) {
            loadClassData(data.currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevBtn);
    
    // Page buttons
    const totalPages = Math.min(data.totalPages, 5);
    let startPage = Math.max(1, data.currentPage - 2);
    let endPage = Math.min(data.totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        if (i === data.currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.setAttribute('data-page', i);
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', function() {
            loadClassData(i);
        });
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.setAttribute('data-page', 'next');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = data.currentPage >= data.totalPages;
    nextBtn.addEventListener('click', function() {
        if (data.currentPage < data.totalPages) {
            loadClassData(data.currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextBtn);
}

// Show class modal for add/edit
async function showClassModal(classId = null) {
    // Đảm bảo xóa các modal backdrop cũ
    clearModalBackdrop();
    
    // Đóng modal hiện tại nếu có
    const existingModal = bootstrap.Modal.getInstance(document.getElementById('classModal'));
    if (existingModal) {
        existingModal.dispose();
    }
    
    const modalElement = document.getElementById('classModal');
    
    // Đặt lại style ban đầu
    modalElement.style.display = '';
    modalElement.style.paddingRight = '';
    modalElement.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true,
        focus: true
    });
    
    const modalTitle = document.getElementById('classModalTitle');
    const classForm = document.getElementById('classForm');
    
    // Reset form
    classForm.reset();
    document.getElementById('classId').value = '';
    
    // Set default status to active
    document.getElementById('classStatus').value = 'active';
    
    // Load departments for dropdown
    await loadDepartmentsForDropdown();
    
    if (classId) {
        // Edit mode
        modalTitle.textContent = 'Chỉnh sửa thông tin lớp học';
        try {
            const token = getAuthToken();
            
            // Nếu đang ở chế độ dev và không có token, sử dụng dữ liệu mẫu
            if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                const mockClass = {
                    classID: classId,
                    classCode: "CSA",
                    className: "Computer Science - Class A",
                    departmentID: 1,
                    teacher: "Nguyễn Văn X",
                    startYear: 2022,
                    maxStudents: 50,
                    description: "Lớp học chuyên ngành khoa học máy tính",
                    isActive: true
                };
                
                // Fill form with class data
                document.getElementById('classId').value = mockClass.classID;
                document.getElementById('classCode').value = mockClass.classCode;
                document.getElementById('className').value = mockClass.className;
                document.getElementById('classDepartment').value = mockClass.departmentID;
                document.getElementById('classTeacher').value = mockClass.teacher || '';
                document.getElementById('classStartYear').value = mockClass.startYear || '';
                document.getElementById('classMaxStudents').value = mockClass.maxStudents || '';
                document.getElementById('classDescription').value = mockClass.description || '';
                document.getElementById('classStatus').value = mockClass.isActive ? 'active' : 'inactive';
                
                modal.show();
                return;
            }
            
            const response = await fetch(`/api/classes/${classId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch class data');
            }

            const classData = await response.json();
            
            // Fill form with class data
            document.getElementById('classId').value = classData.classID;
            document.getElementById('classCode').value = classData.classCode;
            document.getElementById('className').value = classData.className;
            document.getElementById('classDepartment').value = classData.departmentID;
            document.getElementById('classTeacher').value = classData.teacher || '';
            document.getElementById('classStartYear').value = classData.startYear || '';
            document.getElementById('classMaxStudents').value = classData.maxStudents || '';
            document.getElementById('classDescription').value = classData.description || '';
            document.getElementById('classStatus').value = classData.isActive ? 'active' : 'inactive';
        } catch (error) {
            console.error('Error fetching class:', error);
            showToast('error', 'Lỗi', 'Không thể tải thông tin lớp học');
            return;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Thêm lớp học mới';
    }
    
    // Hiển thị modal
    modal.show();
}

// Load departments for class dropdown
async function loadDepartmentsForDropdown() {
    try {
        const token = getAuthToken();
        
        // If no token and in development mode, use mock data
        if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.warn('No authentication token found, using mock data for development');
            const mockDepartments = [
                { departmentID: 1, departmentName: "Công nghệ thông tin", departmentCode: "CNTT" },
                { departmentID: 2, departmentName: "Quản trị kinh doanh", departmentCode: "QTKD" },
                { departmentID: 3, departmentName: "Kế toán", departmentCode: "KT" },
                { departmentID: 4, departmentName: "Ngôn ngữ Anh", departmentCode: "NNA" }
            ];
            
            const departmentDropdown = document.getElementById('classDepartment');
            const searchDepartmentDropdown = document.getElementById('searchClassDepartment');
            
            // Clear existing options except the first one
            departmentDropdown.innerHTML = '<option value="">Chọn khoa</option>';
            searchDepartmentDropdown.innerHTML = '<option value="">Tất cả</option>';
            
            mockDepartments.forEach(department => {
                departmentDropdown.innerHTML += `<option value="${department.departmentID}">${department.departmentName} (${department.departmentCode})</option>`;
                searchDepartmentDropdown.innerHTML += `<option value="${department.departmentID}">${department.departmentName}</option>`;
            });
            
            return;
        }
        
        const response = await fetch('/api/departments', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }

        const data = await response.json();
        const departmentDropdown = document.getElementById('classDepartment');
        const searchDepartmentDropdown = document.getElementById('searchClassDepartment');
        
        // Clear existing options except the first one
        departmentDropdown.innerHTML = '<option value="">Chọn khoa</option>';
        searchDepartmentDropdown.innerHTML = '<option value="">Tất cả</option>';
        
        if (data.items && data.items.length > 0) {
            data.items.forEach(department => {
                departmentDropdown.innerHTML += `<option value="${department.departmentID}">${department.departmentName} (${department.departmentCode})</option>`;
                searchDepartmentDropdown.innerHTML += `<option value="${department.departmentID}">${department.departmentName}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        showToast('error', 'Lỗi', 'Không thể tải danh sách khoa');
    }
}

// Save class (create or update)
async function saveClass() {
    // Get form data
    const classId = document.getElementById('classId').value;
    const classCode = document.getElementById('classCode').value;
    const className = document.getElementById('className').value;
    const departmentId = document.getElementById('classDepartment').value;
    const teacher = document.getElementById('classTeacher').value;
    const startYear = document.getElementById('classStartYear').value;
    const maxStudents = document.getElementById('classMaxStudents').value;
    const description = document.getElementById('classDescription').value;
    const status = document.getElementById('classStatus').value;

    // Validate required fields
    if (!classCode || !className || !departmentId) {
        showToast('error', 'Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }

    try {
        const token = getAuthToken();
        let url = '/api/classes';
        let method = 'POST';
        
        // Prepare data
        const data = {
            classCode: classCode,
            className: className,
            departmentID: parseInt(departmentId),
            teacher: teacher,
            startYear: startYear ? parseInt(startYear) : null,
            maxStudents: maxStudents ? parseInt(maxStudents) : null,
            isActive: status === 'active',
            description: description
        };
        
        // If updating existing class
        if (classId) {
            url = `/api/classes/${classId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save class');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('classModal'));
        modal.hide();
        
        // Reload class data
        loadClassData(currentClassPage);
        
        showToast('success', 'Thành công', classId ? 'Đã cập nhật thông tin lớp học' : 'Đã thêm lớp học mới');
    } catch (error) {
        console.error('Error saving class:', error);
        showToast('error', 'Lỗi', error.message || 'Không thể lưu thông tin lớp học');
    }
}

// Edit class
function editClass(classId) {
    showClassModal(classId);
}

// Delete class
async function deleteClass(classId) {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp học này không?')) {
        return;
    }
    
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete class');
        }
        
        // Reload class data
        loadClassData(currentClassPage);
        showToast('success', 'Thành công', 'Đã xóa lớp học');
    } catch (error) {
        console.error('Error deleting class:', error);
        showToast('error', 'Lỗi', error.message || 'Không thể xóa lớp học');
    }
}

// UTILITY FUNCTIONS

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Format date for input fields (yyyy-MM-dd)
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
} 