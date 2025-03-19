// Thêm biến kiểm tra trạng thái
let hasDataLoaded = {
    feeCategories: false,
    departments: false,
    semesters: false,
    feeStructures: false
};

// Hàm kiểm tra dữ liệu và tự làm mới nếu cần
function checkAndRefreshData() {
    console.log("Checking data status:", hasDataLoaded);
    
    if (!hasDataLoaded.feeCategories) {
        console.log("Re-loading fee categories...");
        loadFeeCategories();
    }
    
    if (!hasDataLoaded.departments) {
        console.log("Re-loading departments...");
        loadDepartments();
    }
    
    if (!hasDataLoaded.semesters) {
        console.log("Re-loading semesters...");
        loadSemesters();
    }
    
    if (!hasDataLoaded.feeStructures) {
        console.log("Re-loading fee structures...");
        loadFeeStructures();
    }
}

$(document).ready(function() {
    // Debug modal triggers
    console.log("Document ready");
    
    // Thêm sự kiện manual để debug modal
    $('button[data-bs-target="#addCategoryModal"]').on('click', function() {
        console.log("Add category button clicked");
        var categoryModal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
        categoryModal.show();
    });
    
    $('button[data-bs-target="#addFeeStructureModal"]').on('click', function() {
        console.log("Add fee structure button clicked");
        var feeModal = new bootstrap.Modal(document.getElementById('addFeeStructureModal'));
        feeModal.show();
    });
    
    // Load initial data
    loadFeeCategories();
    loadDepartments();
    loadSemesters();
    loadFeeStructures();
    
    // Setup event handlers
    $('#departmentFilter, #semesterFilter').change(function() {
        loadFeeStructures();
    });
    
    // Form submissions
    $('#addCategoryForm').submit(function(e) {
        e.preventDefault();
        saveFeeCategory();
    });
    
    $('#addFeeStructureForm').submit(function(e) {
        e.preventDefault();
        saveFeeStructure();
    });

    // Load fee categories dropdown in the fee structure modal
    loadCategoryDropdown();
    
    // Kiểm tra và làm mới dữ liệu sau 3 giây
    setTimeout(checkAndRefreshData, 3000);
});

// Load fee categories for the table
function loadFeeCategories() {
    console.log("Loading fee categories...");
    $.ajax({
        url: '/api/fee-categories',
        type: 'GET',
        success: function(data) {
            console.log("Fee categories loaded:", data);
            let html = '';
            // Lấy mảng từ $values nếu có
            let categories = data.$values || data;
            if(categories && categories.length > 0) {
                hasDataLoaded.feeCategories = true;
                categories.forEach(category => {
                    html += `
                    <tr>
                        <td>${category.feeCategoryID}</td>
                        <td>${category.categoryName}</td>
                        <td>${category.description || ''}</td>
                        <td>${category.isActive ? '<span class="badge bg-success">Hoạt động</span>' : '<span class="badge bg-danger">Không hoạt động</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-category" data-id="${category.feeCategoryID}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category" data-id="${category.feeCategoryID}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                    `;
                });
            } else {
                hasDataLoaded.feeCategories = false;
                html = '<tr><td colspan="5" class="text-center">Không có dữ liệu</td></tr>';
            }
            $('#feeCategories').html(html);
            
            // Setup edit and delete handlers
            $('.edit-category').click(function() {
                editFeeCategory($(this).data('id'));
            });
            
            $('.delete-category').click(function() {
                deleteFeeCategory($(this).data('id'));
            });
        },
        error: function(xhr, status, error) {
            hasDataLoaded.feeCategories = false;
            console.error("Error loading fee categories:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            $('#feeCategories').html('<tr><td colspan="5" class="text-center text-danger">Lỗi khi tải dữ liệu: ' + error + '</td></tr>');
        }
    });
}

// Load fee categories for the dropdown
function loadCategoryDropdown() {
    console.log("Loading fee categories for dropdown...");
    $.ajax({
        url: '/api/fee-categories',
        type: 'GET',
        success: function(data) {
            console.log("Fee categories for dropdown loaded:", data);
            let html = '<option value="">Chọn danh mục</option>';
            // Lấy mảng từ $values nếu có
            let categories = data.$values || data;
            if(categories && categories.length > 0) {
                categories.forEach(category => {
                    if (category.isActive) {
                        html += `<option value="${category.feeCategoryID}">${category.categoryName}</option>`;
                    }
                });
            }
            $('#feeStructureCategory').html(html);
        },
        error: function(xhr, status, error) {
            console.error("Error loading fee categories for dropdown:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            $('#feeStructureCategory').html('<option value="">Lỗi khi tải dữ liệu</option>');
        }
    });
}

// Load departments for filter and dropdown
function loadDepartments() {
    console.log("Loading departments...");
    $.ajax({
        url: '/api/departments',
        type: 'GET',
        success: function(data) {
            console.log("Departments loaded:", data);
            let filterHtml = '<option value="">Tất cả các khoa</option>';
            let dropdownHtml = '<option value="">Chọn khoa</option>';
            
            // Lấy mảng từ $values nếu có
            let departments = data.$values || data;
            if(departments && departments.length > 0) {
                hasDataLoaded.departments = true;
                departments.forEach(dept => {
                    let option = `<option value="${dept.departmentID}">${dept.departmentName}</option>`;
                    filterHtml += option;
                    dropdownHtml += option;
                });
            } else {
                hasDataLoaded.departments = false;
            }
            
            $('#departmentFilter').html(filterHtml);
            $('#feeStructureDepartment').html(dropdownHtml);
        },
        error: function(xhr, status, error) {
            hasDataLoaded.departments = false;
            console.error("Error loading departments:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            $('#departmentFilter').html('<option value="">Lỗi khi tải dữ liệu</option>');
            $('#feeStructureDepartment').html('<option value="">Lỗi khi tải dữ liệu</option>');
        }
    });
}

// Load semesters for filter and dropdown
function loadSemesters() {
    console.log("Loading semesters...");
    $.ajax({
        url: '/api/semesters',
        type: 'GET',
        success: function(data) {
            console.log("Semesters loaded:", data);
            let filterHtml = '<option value="">Tất cả các học kỳ</option>';
            let dropdownHtml = '<option value="">Chọn học kỳ</option>';
            
            // Lấy mảng từ $values nếu có
            let semesters = data.$values || data;
            if(semesters && semesters.length > 0) {
                hasDataLoaded.semesters = true;
                semesters.forEach(sem => {
                    let option = `<option value="${sem.semesterID}">${sem.semesterName}</option>`;
                    filterHtml += option;
                    dropdownHtml += option;
                });
            } else {
                hasDataLoaded.semesters = false;
            }
            
            $('#semesterFilter').html(filterHtml);
            $('#feeStructureSemester').html(dropdownHtml);
        },
        error: function(xhr, status, error) {
            hasDataLoaded.semesters = false;
            console.error("Error loading semesters:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            $('#semesterFilter').html('<option value="">Lỗi khi tải dữ liệu</option>');
            $('#feeStructureSemester').html('<option value="">Lỗi khi tải dữ liệu</option>');
        }
    });
}

// Load fee structures with optional filtering
function loadFeeStructures() {
    console.log("Loading fee structures...");
    const departmentId = $('#departmentFilter').val();
    const semesterId = $('#semesterFilter').val();
    
    let url = '/api/fee-structure';
    if (departmentId || semesterId) {
        url += '/filter?';
        if (departmentId) url += `departmentId=${departmentId}&`;
        if (semesterId) url += `semesterId=${semesterId}`;
        // Remove trailing & if exists
        url = url.endsWith('&') ? url.slice(0, -1) : url;
    }
    
    console.log("Fee structure URL:", url);
    
    $.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
            console.log("Fee structures loaded:", data);
            let html = '';
            // Lấy mảng từ $values nếu có
            let structures = data.$values || data;
            if (structures && structures.length > 0) {
                hasDataLoaded.feeStructures = true;
                structures.forEach(structure => {
                    html += `
                    <tr>
                        <td>${structure.departmentName}</td>
                        <td>${structure.semesterName}</td>
                        <td>${structure.categoryName}</td>
                        <td>${structure.amount.toLocaleString('vi-VN')} VNĐ</td>
                        <td>${structure.perCredit ? '<span class="badge bg-info">Có</span>' : '<span class="badge bg-secondary">Không</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-structure" data-id="${structure.feeStructureID}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-structure" data-id="${structure.feeStructureID}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                    `;
                });
            } else {
                hasDataLoaded.feeStructures = false;
                html = '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';
            }
            $('#feeStructures').html(html);
            
            // Setup edit and delete handlers
            $('.edit-structure').click(function() {
                editFeeStructure($(this).data('id'));
            });
            
            $('.delete-structure').click(function() {
                deleteFeeStructure($(this).data('id'));
            });
        },
        error: function(xhr, status, error) {
            hasDataLoaded.feeStructures = false;
            console.error("Error loading fee structures:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            $('#feeStructures').html('<tr><td colspan="6" class="text-center text-danger">Lỗi khi tải dữ liệu: ' + error + '</td></tr>');
        }
    });
}

// Fee category management functions
function saveFeeCategory() {
    const categoryData = {
        categoryName: $('#categoryName').val(),
        description: $('#categoryDescription').val(),
        isActive: $('#categoryStatus').prop('checked')
    };
    
    const categoryId = $('#categoryId').val();
    const isEdit = categoryId !== '';
    
    console.log("Saving fee category:", isEdit ? "UPDATE" : "CREATE", categoryData);
    
    $.ajax({
        url: isEdit ? `/api/fee-categories/${categoryId}` : '/api/fee-categories',
        type: isEdit ? 'PUT' : 'POST',
        contentType: 'application/json',
        data: JSON.stringify(isEdit ? {...categoryData, feeCategoryID: parseInt(categoryId)} : categoryData),
        success: function(response) {
            console.log("Save fee category success:", response);
            $('#addCategoryModal').modal('hide');
            // Đảm bảo tải lại dữ liệu
            setTimeout(function() {
                loadFeeCategories();
                loadCategoryDropdown();
            }, 500); // Thêm độ trễ nhỏ để đảm bảo dữ liệu được lưu vào DB
            resetCategoryForm();
            showToast(isEdit ? 'Cập nhật danh mục thành công!' : 'Thêm danh mục thành công!');
        },
        error: function(xhr, status, error) {
            console.error("Error saving fee category:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            showToast('Có lỗi xảy ra: ' + (xhr.responseJSON?.message || error || 'Không thể lưu danh mục'), 'error');
        }
    });
}

function editFeeCategory(id) {
    $.ajax({
        url: `/api/fee-categories/${id}`,
        type: 'GET',
        success: function(data) {
            $('#categoryId').val(data.feeCategoryID);
            $('#categoryName').val(data.categoryName);
            $('#categoryDescription').val(data.description);
            $('#categoryStatus').prop('checked', data.isActive);
            
            $('#addCategoryModal').modal('show');
            $('#addCategoryModalLabel').text('Chỉnh sửa danh mục học phí');
        },
        error: function() {
            showToast('Không thể tải thông tin danh mục', 'error');
        }
    });
}

function deleteFeeCategory(id) {
    if (confirm('Bạn có chắc chắn muốn xóa danh mục học phí này?')) {
        $.ajax({
            url: `/api/fee-categories/${id}`,
            type: 'DELETE',
            success: function() {
                loadFeeCategories();
                loadCategoryDropdown();
                showToast('Xóa danh mục thành công!');
            },
            error: function(xhr) {
                showToast('Không thể xóa danh mục: ' + (xhr.responseJSON?.message || 'Có lỗi xảy ra'), 'error');
            }
        });
    }
}

function resetCategoryForm() {
    $('#categoryId').val('');
    $('#categoryName').val('');
    $('#categoryDescription').val('');
    $('#categoryStatus').prop('checked', true);
    $('#addCategoryModalLabel').text('Thêm danh mục học phí');
}

// Fee structure management functions
function saveFeeStructure() {
    const structureData = {
        departmentID: parseInt($('#feeStructureDepartment').val()),
        semesterID: parseInt($('#feeStructureSemester').val()),
        feeCategoryID: parseInt($('#feeStructureCategory').val()),
        amount: parseFloat($('#feeAmount').val()),
        perCredit: $('#feePerCredit').prop('checked')
    };
    
    const structureId = $('#feeStructureId').val();
    const isEdit = structureId !== '';
    
    console.log("Saving fee structure:", isEdit ? "UPDATE" : "CREATE", structureData);
    
    $.ajax({
        url: isEdit ? `/api/fee-structure/${structureId}` : '/api/fee-structure',
        type: isEdit ? 'PUT' : 'POST',
        contentType: 'application/json',
        data: JSON.stringify(isEdit ? {...structureData, feeStructureID: parseInt(structureId)} : structureData),
        success: function(response) {
            console.log("Save fee structure success:", response);
            $('#addFeeStructureModal').modal('hide');
            // Đảm bảo tải lại dữ liệu
            setTimeout(function() {
                loadFeeStructures();
            }, 500); // Thêm độ trễ nhỏ để đảm bảo dữ liệu được lưu vào DB
            resetFeeStructureForm();
            showToast(isEdit ? 'Cập nhật cấu trúc học phí thành công!' : 'Thêm cấu trúc học phí thành công!');
        },
        error: function(xhr, status, error) {
            console.error("Error saving fee structure:", error);
            console.error("Status:", status);
            console.error("Response:", xhr.responseText);
            showToast('Có lỗi xảy ra: ' + (xhr.responseJSON?.message || error || 'Không thể lưu cấu trúc học phí'), 'error');
        }
    });
}

function editFeeStructure(id) {
    $.ajax({
        url: `/api/fee-structure/${id}`,
        type: 'GET',
        success: function(data) {
            $('#feeStructureId').val(data.feeStructureID);
            $('#feeStructureDepartment').val(data.departmentID);
            $('#feeStructureSemester').val(data.semesterID);
            $('#feeStructureCategory').val(data.feeCategoryID);
            $('#feeAmount').val(data.amount);
            $('#feePerCredit').prop('checked', data.perCredit);
            
            $('#addFeeStructureModal').modal('show');
            $('#addFeeStructureModalLabel').text('Chỉnh sửa cấu trúc học phí');
        },
        error: function() {
            showToast('Không thể tải thông tin cấu trúc học phí', 'error');
        }
    });
}

function deleteFeeStructure(id) {
    if (confirm('Bạn có chắc chắn muốn xóa cấu trúc học phí này?')) {
        $.ajax({
            url: `/api/fee-structure/${id}`,
            type: 'DELETE',
            success: function() {
                loadFeeStructures();
                showToast('Xóa cấu trúc học phí thành công!');
            },
            error: function(xhr) {
                showToast('Không thể xóa cấu trúc học phí: ' + (xhr.responseJSON?.message || 'Có lỗi xảy ra'), 'error');
            }
        });
    }
}

function resetFeeStructureForm() {
    $('#feeStructureId').val('');
    $('#feeStructureDepartment').val('');
    $('#feeStructureSemester').val('');
    $('#feeStructureCategory').val('');
    $('#feeAmount').val('');
    $('#feePerCredit').prop('checked', false);
    $('#addFeeStructureModalLabel').text('Thêm cấu trúc học phí');
}

// Helper functions
function showToast(message, type = 'success') {
    // Check if the toast container exists, if not, create it
    if ($('#toastContainer').length === 0) {
        $('body').append(`<div id="toastContainer" style="position: fixed; top: 10px; right: 10px; z-index: 9999;"></div>`);
    }
    
    const toastId = 'toast' + new Date().getTime();
    const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
    
    const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    </div>
    `;
    
    $('#toastContainer').append(toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        $(this).remove();
    });
} 