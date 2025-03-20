$(document).ready(function() {
    // Global variables
    let currentSemester = null;
    let chart = null;
    
    // Initialize components
    initializePage();

    // Initialize page function
    function initializePage() {
        loadSummaryData();
        loadSemesters();
        setupDateDefaults();
        setupEventListeners();
    }

    // Load summary data for dashboard
    function loadSummaryData() {
        $.ajax({
            url: '/api/payments/summary',
            type: 'GET',
            success: function(data) {
                updateSummaryCards(data);
                currentSemester = data.currentSemester;
            },
            error: function(error) {
                console.error('Error loading summary data:', error);
                showToast('error', 'Không thể tải dữ liệu tổng hợp');
            }
        });
    }

    // Load semesters for dropdown
    function loadSemesters() {
        $.ajax({
            url: '/api/dropdowndata/semesters',
            type: 'GET',
            success: function(data) {
                populateSemesterDropdown(data);
            },
            error: function(error) {
                console.error('Error loading semesters:', error);
                showToast('error', 'Không thể tải danh sách học kỳ');
            }
        });
    }
    
    // Setup default dates (current month)
    function setupDateDefaults() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        $('#startDateFilter').val(formatDateForInput(firstDay));
        $('#endDateFilter').val(formatDateForInput(lastDay));
    }

    // Update summary cards with data
    function updateSummaryCards(data) {
        $('#totalRevenue').text(formatCurrency(data.totalAmount));
        $('#totalPaid').text(formatCurrency(data.successAmount));
        $('#totalUnpaid').text(formatCurrency(data.totalAmount - data.successAmount - data.pendingAmount));
        $('#totalOverdue').text(formatCurrency(data.pendingAmount));
    }

    // Populate semester dropdown
    function populateSemesterDropdown(semesters) {
        const $select = $('#semesterFilter');
        $select.empty();
        $select.append('<option value="">Tất cả các học kỳ</option>');
        
        semesters.forEach(semester => {
            $select.append(`<option value="${semester.semesterID}">${semester.semesterName}</option>`);
        });
        
        // Select current semester if available
        if (currentSemester) {
            $select.val(currentSemester.semesterID);
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Report type change
        $('#reportType').on('change', function() {
            const reportType = $(this).val();
            updateFilterVisibility(reportType);
        });
        
        // Generate report button
        $('#generateReportBtn').on('click', function() {
            generateReport();
        });
        
        // Export report button
        $('#exportReportBtn').on('click', function() {
            exportReport();
        });
    }

    // Update filter visibility based on report type
    function updateFilterVisibility(reportType) {
        // Show/hide filters based on report type
        if (reportType === 'daily' || reportType === 'monthly') {
            $('#semesterFilter').closest('.col-md-3').show();
        } else {
            $('#semesterFilter').closest('.col-md-3').show();
        }
    }

    // Generate report based on selected filters
    function generateReport() {
        const reportType = $('#reportType').val();
        const semesterId = $('#semesterFilter').val();
        const startDate = $('#startDateFilter').val();
        const endDate = $('#endDateFilter').val();
        
        // Validate dates
        if (!startDate || !endDate) {
            showToast('error', 'Vui lòng chọn ngày bắt đầu và kết thúc');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('error', 'Ngày bắt đầu phải trước ngày kết thúc');
            return;
        }
        
        // Show loading state
        $('#reportTableBody').html('<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>');
        $('#quickStats').html('<li class="list-group-item text-center"><div class="spinner-border text-primary" role="status"></div></li>');
        
        // API endpoint based on report type
        let endpoint = '';
        let requestData = {
            startDate: startDate,
            endDate: endDate
        };
        
        if (semesterId) {
            requestData.semesterId = semesterId;
        }
        
        switch (reportType) {
            case 'semester':
                endpoint = '/api/payments/reports/by-semester';
                break;
            case 'department':
                endpoint = '/api/payments/reports/by-department';
                break;
            case 'category':
                endpoint = '/api/payments/reports/by-category';
                break;
            case 'method':
                endpoint = '/api/payments/reports/by-method';
                break;
            case 'daily':
                endpoint = '/api/payments/reports/by-day';
                break;
            case 'monthly':
                endpoint = '/api/payments/reports/by-month';
                break;
            default:
                endpoint = '/api/payments/reports/by-semester';
        }
        
        // Fetch report data
        $.ajax({
            url: endpoint,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(requestData),
            success: function(data) {
                displayReport(data, reportType);
            },
            error: function(error) {
                console.error('Error generating report:', error);
                showToast('error', 'Không thể tạo báo cáo');
                $('#reportTableBody').html('<tr><td colspan="6" class="text-center">Lỗi khi tải dữ liệu</td></tr>');
                $('#quickStats').html('<li class="list-group-item">Không có dữ liệu</li>');
            }
        });
    }

    // Display report data based on type
    function displayReport(data, reportType) {
        // Update chart title
        $('#chartTitle').text(`Biểu đồ báo cáo theo ${getReportTypeText(reportType)}`);
        
        // Display table headers based on report type
        updateTableHeaders(reportType);
        
        // Display table data
        displayTableData(data, reportType);
        
        // Display quick stats
        displayQuickStats(data, reportType);
        
        // Display chart
        displayChart(data, reportType);
    }

    // Update table headers based on report type
    function updateTableHeaders(reportType) {
        let headers = '';
        
        switch (reportType) {
            case 'semester':
                headers = `
                    <tr>
                        <th>Học kỳ</th>
                        <th>Tổng học phí</th>
                        <th>Đã thanh toán</th>
                        <th>Chưa thanh toán</th>
                        <th>Tỷ lệ thanh toán</th>
                        <th>Số sinh viên</th>
                    </tr>
                `;
                break;
            case 'department':
                headers = `
                    <tr>
                        <th>Khoa</th>
                        <th>Tổng học phí</th>
                        <th>Đã thanh toán</th>
                        <th>Chưa thanh toán</th>
                        <th>Tỷ lệ thanh toán</th>
                        <th>Số sinh viên</th>
                    </tr>
                `;
                break;
            case 'category':
                headers = `
                    <tr>
                        <th>Danh mục học phí</th>
                        <th>Tổng học phí</th>
                        <th>Đã thanh toán</th>
                        <th>Chưa thanh toán</th>
                        <th>Tỷ lệ thanh toán</th>
                    </tr>
                `;
                break;
            case 'method':
                headers = `
                    <tr>
                        <th>Phương thức thanh toán</th>
                        <th>Số lượng giao dịch</th>
                        <th>Tổng tiền</th>
                        <th>Tỷ lệ</th>
                    </tr>
                `;
                break;
            case 'daily':
                headers = `
                    <tr>
                        <th>Ngày</th>
                        <th>Số lượng giao dịch</th>
                        <th>Tổng tiền</th>
                        <th>Thành công</th>
                        <th>Đang xử lý</th>
                        <th>Thất bại</th>
                    </tr>
                `;
                break;
            case 'monthly':
                headers = `
                    <tr>
                        <th>Tháng</th>
                        <th>Số lượng giao dịch</th>
                        <th>Tổng tiền</th>
                        <th>Thành công</th>
                        <th>Đang xử lý</th>
                        <th>Thất bại</th>
                    </tr>
                `;
                break;
            default:
                headers = `
                    <tr>
                        <th>Học kỳ</th>
                        <th>Tổng học phí</th>
                        <th>Đã thanh toán</th>
                        <th>Chưa thanh toán</th>
                        <th>Tỷ lệ thanh toán</th>
                    </tr>
                `;
        }
        
        $('#reportTableHead').html(headers);
    }

    // Display table data based on report type
    function displayTableData(data, reportType) {
        const $tbody = $('#reportTableBody');
        $tbody.empty();
        
        if (!data || !data.items || data.items.length === 0) {
            $tbody.html('<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>');
            return;
        }
        
        let rows = '';
        
        switch (reportType) {
            case 'semester':
                data.items.forEach(item => {
                    const paymentRate = item.totalAmount > 0 ? (item.paidAmount / item.totalAmount * 100).toFixed(2) : 0;
                    rows += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${formatCurrency(item.totalAmount)}</td>
                            <td>${formatCurrency(item.paidAmount)}</td>
                            <td>${formatCurrency(item.totalAmount - item.paidAmount)}</td>
                            <td>${paymentRate}%</td>
                            <td>${item.studentCount}</td>
                        </tr>
                    `;
                });
                break;
            case 'department':
                data.items.forEach(item => {
                    const paymentRate = item.totalAmount > 0 ? (item.paidAmount / item.totalAmount * 100).toFixed(2) : 0;
                    rows += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${formatCurrency(item.totalAmount)}</td>
                            <td>${formatCurrency(item.paidAmount)}</td>
                            <td>${formatCurrency(item.totalAmount - item.paidAmount)}</td>
                            <td>${paymentRate}%</td>
                            <td>${item.studentCount}</td>
                        </tr>
                    `;
                });
                break;
            case 'category':
                data.items.forEach(item => {
                    const paymentRate = item.totalAmount > 0 ? (item.paidAmount / item.totalAmount * 100).toFixed(2) : 0;
                    rows += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${formatCurrency(item.totalAmount)}</td>
                            <td>${formatCurrency(item.paidAmount)}</td>
                            <td>${formatCurrency(item.totalAmount - item.paidAmount)}</td>
                            <td>${paymentRate}%</td>
                        </tr>
                    `;
                });
                break;
            case 'method':
                data.items.forEach(item => {
                    const percentage = data.summary.totalAmount > 0 ? (item.amount / data.summary.totalAmount * 100).toFixed(2) : 0;
                    rows += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.count}</td>
                            <td>${formatCurrency(item.amount)}</td>
                            <td>${percentage}%</td>
                        </tr>
                    `;
                });
                break;
            case 'daily':
                data.items.forEach(item => {
                    rows += `
                        <tr>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.count}</td>
                            <td>${formatCurrency(item.totalAmount)}</td>
                            <td>${formatCurrency(item.successAmount)}</td>
                            <td>${formatCurrency(item.pendingAmount)}</td>
                            <td>${formatCurrency(item.failedAmount)}</td>
                        </tr>
                    `;
                });
                break;
            case 'monthly':
                data.items.forEach(item => {
                    rows += `
                        <tr>
                            <td>${item.month}/${item.year}</td>
                            <td>${item.count}</td>
                            <td>${formatCurrency(item.totalAmount)}</td>
                            <td>${formatCurrency(item.successAmount)}</td>
                            <td>${formatCurrency(item.pendingAmount)}</td>
                            <td>${formatCurrency(item.failedAmount)}</td>
                        </tr>
                    `;
                });
                break;
            default:
                rows = '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';
        }
        
        $tbody.html(rows);
    }

    // Display quick stats based on report type
    function displayQuickStats(data, reportType) {
        const $stats = $('#quickStats');
        $stats.empty();
        
        if (!data || !data.summary) {
            $stats.html('<li class="list-group-item">Không có dữ liệu</li>');
            return;
        }
        
        const summary = data.summary;
        let stats = '';
        
        switch (reportType) {
            case 'semester':
            case 'department':
            case 'category':
                const paymentRate = summary.totalAmount > 0 ? (summary.paidAmount / summary.totalAmount * 100).toFixed(2) : 0;
                stats = `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Tổng học phí
                        <span class="badge bg-primary rounded-pill">${formatCurrency(summary.totalAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Đã thanh toán
                        <span class="badge bg-success rounded-pill">${formatCurrency(summary.paidAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Chưa thanh toán
                        <span class="badge bg-warning rounded-pill">${formatCurrency(summary.totalAmount - summary.paidAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Tỷ lệ thanh toán
                        <span class="badge bg-info rounded-pill">${paymentRate}%</span>
                    </li>
                `;
                break;
            case 'method':
                stats = `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Tổng số giao dịch
                        <span class="badge bg-primary rounded-pill">${summary.totalCount}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Tổng tiền
                        <span class="badge bg-success rounded-pill">${formatCurrency(summary.totalAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Phương thức phổ biến
                        <span class="badge bg-info rounded-pill">${summary.mostPopularMethod}</span>
                    </li>
                `;
                break;
            case 'daily':
            case 'monthly':
                stats = `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Tổng số giao dịch
                        <span class="badge bg-primary rounded-pill">${summary.totalCount}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Tổng tiền
                        <span class="badge bg-info rounded-pill">${formatCurrency(summary.totalAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Thành công
                        <span class="badge bg-success rounded-pill">${formatCurrency(summary.successAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Đang xử lý
                        <span class="badge bg-warning rounded-pill">${formatCurrency(summary.pendingAmount)}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Thất bại
                        <span class="badge bg-danger rounded-pill">${formatCurrency(summary.failedAmount)}</span>
                    </li>
                `;
                break;
            default:
                stats = '<li class="list-group-item">Không có dữ liệu</li>';
        }
        
        $stats.html(stats);
    }

    // Display chart based on report type
    function displayChart(data, reportType) {
        const ctx = document.getElementById('reportChart').getContext('2d');
        
        // Destroy existing chart if any
        if (chart) {
            chart.destroy();
        }
        
        if (!data || !data.items || data.items.length === 0) {
            return;
        }
        
        const labels = [];
        const datasets = [];
        
        switch (reportType) {
            case 'semester':
            case 'department':
            case 'category':
                data.items.forEach(item => {
                    labels.push(item.name);
                });
                
                datasets.push({
                    label: 'Tổng học phí',
                    data: data.items.map(item => item.totalAmount),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                });
                
                datasets.push({
                    label: 'Đã thanh toán',
                    data: data.items.map(item => item.paidAmount),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                });
                
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrencyShort(value);
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + formatCurrency(context.raw);
                                    }
                                }
                            }
                        }
                    }
                });
                break;
            case 'method':
                data.items.forEach(item => {
                    labels.push(item.name);
                });
                
                datasets.push({
                    label: 'Tổng tiền',
                    data: data.items.map(item => item.amount),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                });
                
                chart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = formatCurrency(context.raw);
                                        const percentage = ((context.raw / data.summary.totalAmount) * 100).toFixed(2) + '%';
                                        return `${label}: ${value} (${percentage})`;
                                    }
                                }
                            }
                        }
                    }
                });
                break;
            case 'daily':
            case 'monthly':
                data.items.forEach(item => {
                    if (reportType === 'daily') {
                        labels.push(formatDate(item.date));
                    } else {
                        labels.push(`${item.month}/${item.year}`);
                    }
                });
                
                datasets.push({
                    label: 'Thành công',
                    data: data.items.map(item => item.successAmount),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                });
                
                datasets.push({
                    label: 'Đang xử lý',
                    data: data.items.map(item => item.pendingAmount),
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                });
                
                datasets.push({
                    label: 'Thất bại',
                    data: data.items.map(item => item.failedAmount),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                });
                
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrencyShort(value);
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + formatCurrency(context.raw);
                                    }
                                }
                            }
                        }
                    }
                });
                break;
            default:
                // Don't create a chart if no data or unrecognized type
                break;
        }
    }

    // Export report to Excel
    function exportReport() {
        const reportType = $('#reportType').val();
        const semesterId = $('#semesterFilter').val();
        const startDate = $('#startDateFilter').val();
        const endDate = $('#endDateFilter').val();
        
        if (!startDate || !endDate) {
            showToast('error', 'Vui lòng chọn ngày bắt đầu và kết thúc');
            return;
        }
        
        let queryParams = `reportType=${reportType}&startDate=${startDate}&endDate=${endDate}`;
        
        if (semesterId) {
            queryParams += `&semesterId=${semesterId}`;
        }
        
        window.location.href = `/api/payments/reports/export?${queryParams}`;
    }

    // Helper function to get report type text
    function getReportTypeText(reportType) {
        switch (reportType) {
            case 'semester':
                return 'học kỳ';
            case 'department':
                return 'khoa';
            case 'category':
                return 'danh mục học phí';
            case 'method':
                return 'phương thức thanh toán';
            case 'daily':
                return 'ngày';
            case 'monthly':
                return 'tháng';
            default:
                return 'học kỳ';
        }
    }

    // Helper function to format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
    
    // Helper function to format currency for chart labels (shorter)
    function formatCurrencyShort(amount) {
        if (amount >= 1000000000) {
            return (amount / 1000000000).toFixed(1) + ' tỷ';
        } else if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + ' triệu';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount;
    }

    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // Helper function to format date for input fields
    function formatDateForInput(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) 
            month = '0' + month;
        if (day.length < 2) 
            day = '0' + day;

        return [year, month, day].join('-');
    }

    // Show toast notification
    function showToast(type, message) {
        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        if (!$('.toast-container').length) {
            $('body').append('<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
        }
        
        $('.toast-container').append(toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
        toast.show();
    }
}); 