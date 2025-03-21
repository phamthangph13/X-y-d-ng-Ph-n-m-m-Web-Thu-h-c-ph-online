using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;
using System.IO;
using ClosedXML.Excel;

namespace WebProject.Controllers
{
    [ApiController]
    [Route("api/payments")]
    public class PaymentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: Lấy danh sách thanh toán
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetPayments()
        {
            try
            {
                var payments = await _context.Payments
                    .Include(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(p => p.PaymentMethod)
                    .OrderByDescending(p => p.PaymentDate)
                    .Take(100) // Giới hạn 100 kết quả gần nhất
                    .Select(p => new PaymentResponseDto
                    {
                        PaymentID = p.PaymentID,
                        StudentFeeID = p.StudentFeeID,
                        StudentName = p.StudentFee.Student.User.FullName,
                        StudentCode = p.StudentFee.Student.StudentCode,
                        Amount = p.Amount,
                        PaymentDate = p.PaymentDate,
                        PaymentMethodName = p.PaymentMethod.MethodName,
                        TransactionID = p.TransactionID,
                        Status = p.Status,
                        PaymentReference = p.PaymentReference
                    })
                    .ToListAsync();

                return payments;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payments: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Lấy chi tiết thanh toán theo ID
        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentDetailDto>> GetPayment(int id)
        {
            try
            {
                var payment = await _context.Payments
                    .Include(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(p => p.StudentFee.Semester)
                    .Include(p => p.PaymentMethod)
                    .FirstOrDefaultAsync(p => p.PaymentID == id);

                if (payment == null)
                {
                    return NotFound(new { message = "Không tìm thấy thanh toán" });
                }

                var invoices = await _context.Invoices
                    .Where(i => i.PaymentID == id)
                    .Select(i => new InvoiceDto
                    {
                        InvoiceID = i.InvoiceID,
                        InvoiceNumber = i.InvoiceNumber,
                        InvoiceDate = i.InvoiceDate,
                        InvoicePath = i.InvoicePath,
                        SentToEmail = i.SentToEmail
                    })
                    .ToListAsync();

                var result = new PaymentDetailDto
                {
                    PaymentID = payment.PaymentID,
                    StudentFeeID = payment.StudentFeeID,
                    StudentName = payment.StudentFee.Student.User.FullName,
                    StudentCode = payment.StudentFee.Student.StudentCode,
                    StudentEmail = payment.StudentFee.Student.User.Email,
                    SemesterName = payment.StudentFee.Semester.SemesterName,
                    Amount = payment.Amount,
                    PaymentDate = payment.PaymentDate,
                    PaymentMethodID = payment.PaymentMethodID,
                    PaymentMethodName = payment.PaymentMethod.MethodName,
                    TransactionID = payment.TransactionID,
                    Status = payment.Status,
                    PaymentReference = payment.PaymentReference,
                    Invoices = invoices
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payment details: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Tạo mới thanh toán
        [HttpPost]
        public async Task<ActionResult<Payment>> CreatePayment(PaymentCreateDto model)
        {
            try
            {
                var studentFee = await _context.StudentFees
                    .Include(sf => sf.Student)
                    .FirstOrDefaultAsync(sf => sf.StudentFeeID == model.StudentFeeID);

                if (studentFee == null)
                {
                    return NotFound(new { message = "Không tìm thấy học phí" });
                }

                var paymentMethod = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.PaymentMethodID == model.PaymentMethodID);

                if (paymentMethod == null)
                {
                    return NotFound(new { message = "Không tìm thấy phương thức thanh toán" });
                }

                var payment = new Payment
                {
                    StudentFeeID = model.StudentFeeID,
                    PaymentMethodID = model.PaymentMethodID,
                    Amount = model.Amount,
                    TransactionID = model.TransactionID,
                    PaymentDate = DateTime.Now,
                    Status = "Success", // Mặc định là thành công, có thể thay đổi nếu có xử lý thanh toán thực tế
                    PaymentReference = model.PaymentReference
                };

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                // Cập nhật trạng thái học phí
                var totalPaid = await _context.Payments
                    .Where(p => p.StudentFeeID == model.StudentFeeID && p.Status == "Success")
                    .SumAsync(p => p.Amount);

                if (totalPaid >= studentFee.TotalAmount)
                {
                    studentFee.Status = "Paid";
                }
                else if (totalPaid > 0)
                {
                    studentFee.Status = "Partial";
                }
                else
                {
                    studentFee.Status = "Unpaid";
                }

                studentFee.LastUpdated = DateTime.Now;
                await _context.SaveChangesAsync();

                // Tạo DTO để trả về
                var result = new PaymentResponseDto
                {
                    PaymentID = payment.PaymentID,
                    StudentFeeID = payment.StudentFeeID,
                    StudentName = studentFee.Student.User.FullName,
                    StudentCode = studentFee.Student.StudentCode,
                    Amount = payment.Amount,
                    PaymentDate = payment.PaymentDate,
                    PaymentMethodName = paymentMethod.MethodName,
                    TransactionID = payment.TransactionID,
                    Status = payment.Status,
                    PaymentReference = payment.PaymentReference
                };

                return CreatedAtAction(nameof(GetPayment), new { id = payment.PaymentID }, result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating payment: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: Cập nhật trạng thái thanh toán
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, PaymentStatusUpdateDto model)
        {
            try
            {
                var payment = await _context.Payments
                    .Include(p => p.StudentFee)
                    .FirstOrDefaultAsync(p => p.PaymentID == id);

                if (payment == null)
                {
                    return NotFound(new { message = "Không tìm thấy thanh toán" });
                }

                // Cập nhật trạng thái thanh toán
                payment.Status = model.Status;
                
                // Nếu có ghi chú, cập nhật ghi chú
                if (!string.IsNullOrEmpty(model.PaymentReference))
                {
                    payment.PaymentReference = model.PaymentReference;
                }

                await _context.SaveChangesAsync();

                // Cập nhật trạng thái học phí
                var studentFee = payment.StudentFee;
                var totalPaid = await _context.Payments
                    .Where(p => p.StudentFeeID == studentFee.StudentFeeID && p.Status == "Success")
                    .SumAsync(p => p.Amount);

                if (totalPaid >= studentFee.TotalAmount)
                {
                    studentFee.Status = "Paid";
                }
                else if (totalPaid > 0)
                {
                    studentFee.Status = "Partial";
                }
                else
                {
                    studentFee.Status = "Unpaid";
                }

                studentFee.LastUpdated = DateTime.Now;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating payment status: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: Xóa thanh toán
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            try
            {
                var payment = await _context.Payments
                    .Include(p => p.StudentFee)
                    .FirstOrDefaultAsync(p => p.PaymentID == id);

                if (payment == null)
                {
                    return NotFound(new { message = "Không tìm thấy thanh toán" });
                }

                // Kiểm tra xem thanh toán có hóa đơn không
                var hasInvoice = await _context.Invoices
                    .AnyAsync(i => i.PaymentID == id);

                if (hasInvoice)
                {
                    return BadRequest(new { message = "Không thể xóa thanh toán đã có hóa đơn" });
                }

                _context.Payments.Remove(payment);
                await _context.SaveChangesAsync();

                // Cập nhật trạng thái học phí
                var studentFee = payment.StudentFee;
                var totalPaid = await _context.Payments
                    .Where(p => p.StudentFeeID == studentFee.StudentFeeID && p.Status == "Success")
                    .SumAsync(p => p.Amount);

                if (totalPaid >= studentFee.TotalAmount)
                {
                    studentFee.Status = "Paid";
                }
                else if (totalPaid > 0)
                {
                    studentFee.Status = "Partial";
                }
                else
                {
                    studentFee.Status = "Unpaid";
                }

                studentFee.LastUpdated = DateTime.Now;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting payment: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: API tìm kiếm thanh toán với phân trang và lọc
        [HttpPost("search")]
        public async Task<ActionResult<PagedResult<PaymentResponseDto>>> SearchPayments(PaymentSearchDto model)
        {
            try
            {
                var query = _context.Payments
                    .Include(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(p => p.PaymentMethod)
                    .AsQueryable();
                    
                // Apply filters if provided
                if (!string.IsNullOrEmpty(model.TransactionId))
                {
                    query = query.Where(p => p.TransactionID.Contains(model.TransactionId));
                }
                
                if (!string.IsNullOrEmpty(model.StudentCode))
                {
                    query = query.Where(p => p.StudentFee.Student.StudentCode.Contains(model.StudentCode));
                }
                
                if (model.PaymentMethodId.HasValue)
                {
                    query = query.Where(p => p.PaymentMethodID == model.PaymentMethodId.Value);
                }
                
                if (!string.IsNullOrEmpty(model.Status))
                {
                    query = query.Where(p => p.Status == model.Status);
                }
                
                if (model.StartDate.HasValue)
                {
                    var startDate = model.StartDate.Value.Date;
                    query = query.Where(p => p.PaymentDate >= startDate);
                }
                
                if (model.EndDate.HasValue)
                {
                    var endDate = model.EndDate.Value.Date.AddDays(1).AddTicks(-1);
                    query = query.Where(p => p.PaymentDate <= endDate);
                }
                
                // Get total count for pagination
                var totalCount = await query.CountAsync();
                
                // Apply pagination
                var pageSize = model.PageSize > 0 ? model.PageSize : 10;
                var pageNumber = model.PageNumber > 0 ? model.PageNumber : 1;
                
                var payments = await query
                    .OrderByDescending(p => p.PaymentDate)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new PaymentResponseDto
                    {
                        PaymentID = p.PaymentID,
                        StudentFeeID = p.StudentFeeID,
                        StudentName = p.StudentFee.Student.User.FullName,
                        StudentCode = p.StudentFee.Student.StudentCode,
                        Amount = p.Amount,
                        PaymentDate = p.PaymentDate,
                        PaymentMethodName = p.PaymentMethod.MethodName,
                        TransactionID = p.TransactionID,
                        Status = p.Status,
                        PaymentReference = p.PaymentReference
                    })
                    .ToListAsync();
                    
                return new PagedResult<PaymentResponseDto>
                {
                    Items = payments,
                    TotalCount = totalCount,
                    PageSize = pageSize,
                    CurrentPage = pageNumber
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error searching payments: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // GET: Lấy tổng hợp thông tin thanh toán cho dashboard
        [HttpGet("summary")]
        public async Task<ActionResult<PaymentSummaryDto>> GetPaymentSummary()
        {
            try
            {
                // Lấy học kỳ hiện tại
                var currentSemester = await _context.Semesters
                    .Where(s => s.IsActive)
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();
                    
                if (currentSemester == null)
                {
                    return NotFound(new { message = "Không tìm thấy học kỳ hiện tại" });
                }
                
                // Lấy tổng số tiền thanh toán
                var totalAmount = await _context.Payments
                    .Where(p => p.StudentFee.SemesterID == currentSemester.SemesterID)
                    .SumAsync(p => p.Amount);
                    
                // Lấy tổng số tiền thanh toán thành công
                var successAmount = await _context.Payments
                    .Where(p => p.StudentFee.SemesterID == currentSemester.SemesterID && p.Status == "Success")
                    .SumAsync(p => p.Amount);
                    
                // Lấy tổng số tiền thanh toán đang xử lý
                var pendingAmount = await _context.Payments
                    .Where(p => p.StudentFee.SemesterID == currentSemester.SemesterID && p.Status == "Pending")
                    .SumAsync(p => p.Amount);
                    
                return new PaymentSummaryDto
                {
                    TotalAmount = totalAmount,
                    SuccessAmount = successAmount,
                    PendingAmount = pendingAmount,
                    CurrentSemester = new PaymentSemesterDto
                    {
                        SemesterID = currentSemester.SemesterID,
                        SemesterName = currentSemester.SemesterName,
                        StartDate = currentSemester.StartDate,
                        EndDate = currentSemester.EndDate
                    }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payment summary: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // GET: Xuất dữ liệu thanh toán ra file Excel
        [HttpGet("export")]
        public async Task<IActionResult> ExportPaymentsToExcel([FromQuery] PaymentExportDto model)
        {
            try
            {
                var query = _context.Payments
                    .Include(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(p => p.StudentFee.Semester)
                    .Include(p => p.PaymentMethod)
                    .AsQueryable();
                    
                // Apply filters if provided
                if (!string.IsNullOrEmpty(model.TransactionId))
                {
                    query = query.Where(p => p.TransactionID.Contains(model.TransactionId));
                }
                
                if (!string.IsNullOrEmpty(model.StudentCode))
                {
                    query = query.Where(p => p.StudentFee.Student.StudentCode.Contains(model.StudentCode));
                }
                
                if (!string.IsNullOrEmpty(model.PaymentMethodId))
                {
                    int methodId;
                    if (int.TryParse(model.PaymentMethodId, out methodId))
                    {
                        query = query.Where(p => p.PaymentMethodID == methodId);
                    }
                }
                
                if (!string.IsNullOrEmpty(model.Status))
                {
                    query = query.Where(p => p.Status == model.Status);
                }
                
                if (!string.IsNullOrEmpty(model.StartDate))
                {
                    DateTime startDate;
                    if (DateTime.TryParse(model.StartDate, out startDate))
                    {
                        query = query.Where(p => p.PaymentDate >= startDate);
                    }
                }
                
                if (!string.IsNullOrEmpty(model.EndDate))
                {
                    DateTime endDate;
                    if (DateTime.TryParse(model.EndDate, out endDate))
                    {
                        endDate = endDate.Date.AddDays(1).AddTicks(-1);
                        query = query.Where(p => p.PaymentDate <= endDate);
                    }
                }
                
                var payments = await query
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => new
                    {
                        PaymentID = p.PaymentID,
                        StudentCode = p.StudentFee.Student.StudentCode,
                        StudentName = p.StudentFee.Student.User.FullName,
                        Semester = p.StudentFee.Semester.SemesterName,
                        Amount = p.Amount,
                        PaymentDate = p.PaymentDate,
                        PaymentMethod = p.PaymentMethod.MethodName,
                        TransactionID = p.TransactionID,
                        Status = p.Status,
                        Reference = p.PaymentReference
                    })
                    .ToListAsync();
                
                using (var workbook = new XLWorkbook())
                {
                    var worksheet = workbook.Worksheets.Add("Thanh toán");
                    
                    // Add headers
                    worksheet.Cell(1, 1).Value = "ID";
                    worksheet.Cell(1, 2).Value = "Mã sinh viên";
                    worksheet.Cell(1, 3).Value = "Họ tên";
                    worksheet.Cell(1, 4).Value = "Học kỳ";
                    worksheet.Cell(1, 5).Value = "Số tiền";
                    worksheet.Cell(1, 6).Value = "Ngày thanh toán";
                    worksheet.Cell(1, 7).Value = "Phương thức";
                    worksheet.Cell(1, 8).Value = "Mã giao dịch";
                    worksheet.Cell(1, 9).Value = "Trạng thái";
                    worksheet.Cell(1, 10).Value = "Ghi chú";
                    
                    // Style the header row
                    var headerRow = worksheet.Row(1);
                    headerRow.Style.Font.Bold = true;
                    headerRow.Style.Fill.BackgroundColor = XLColor.LightGray;
                    
                    // Add data
                    int row = 2;
                    foreach (var payment in payments)
                    {
                        worksheet.Cell(row, 1).Value = payment.PaymentID;
                        worksheet.Cell(row, 2).Value = payment.StudentCode;
                        worksheet.Cell(row, 3).Value = payment.StudentName;
                        worksheet.Cell(row, 4).Value = payment.Semester;
                        worksheet.Cell(row, 5).Value = payment.Amount;
                        worksheet.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                        worksheet.Cell(row, 6).Value = payment.PaymentDate;
                        worksheet.Cell(row, 6).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                        worksheet.Cell(row, 7).Value = payment.PaymentMethod;
                        worksheet.Cell(row, 8).Value = payment.TransactionID;
                        worksheet.Cell(row, 9).Value = payment.Status;
                        worksheet.Cell(row, 10).Value = payment.Reference;
                        
                        row++;
                    }
                    
                    // Auto-fit columns
                    worksheet.Columns().AdjustToContents();
                    
                    // Prepare the response
                    var stream = new MemoryStream();
                    workbook.SaveAs(stream);
                    stream.Position = 0;
                    
                    return File(
                        fileContents: stream.ToArray(),
                        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        fileDownloadName: $"Thanh-toan_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error exporting payments: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // FINANCIAL REPORTS API ENDPOINTS
        
        // POST: Báo cáo theo học kỳ
        [HttpPost("reports/by-semester")]
        public async Task<ActionResult<FinancialReportDto>> GetReportBySemester(ReportRequestDto request)
        {
            try
            {
                // Validate request
                if (request.StartDate > request.EndDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }

                // Query for report by semester
                var query = from sf in _context.StudentFees
                            join sem in _context.Semesters on sf.SemesterID equals sem.SemesterID
                            join p in _context.Payments.Where(p => p.Status == "Success" && 
                                                                p.PaymentDate >= request.StartDate && 
                                                                p.PaymentDate <= request.EndDate)
                                    on sf.StudentFeeID equals p.StudentFeeID into payments
                            from p in payments.DefaultIfEmpty()
                            group new { sf, p } by new { sf.SemesterID, sem.SemesterName } into g
                            select new ReportItemDto
                            {
                                Id = g.Key.SemesterID.ToString(),
                                Name = g.Key.SemesterName,
                                TotalAmount = g.Sum(x => x.sf.TotalAmount),
                                PaidAmount = g.Sum(x => x.p != null ? x.p.Amount : 0),
                                StudentCount = g.Select(x => x.sf.StudentID).Distinct().Count()
                            };
                
                var items = await query.ToListAsync();
                
                // Calculate summary
                var summary = new ReportSummaryDto
                {
                    TotalAmount = items.Sum(i => i.TotalAmount),
                    PaidAmount = items.Sum(i => i.PaidAmount),
                    TotalCount = items.Sum(i => i.StudentCount)
                };
                
                return new FinancialReportDto
                {
                    Items = items,
                    Summary = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating semester report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // POST: Báo cáo theo khoa
        [HttpPost("reports/by-department")]
        public async Task<ActionResult<FinancialReportDto>> GetReportByDepartment(ReportRequestDto request)
        {
            try
            {
                // Validate request
                if (request.StartDate > request.EndDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }

                // Query for report by department
                var query = from sf in _context.StudentFees
                            join s in _context.Students on sf.StudentID equals s.StudentID
                            join d in _context.Departments on s.DepartmentID equals d.DepartmentID
                            join p in _context.Payments.Where(p => p.Status == "Success" &&
                                                                p.PaymentDate >= request.StartDate &&
                                                                p.PaymentDate <= request.EndDate)
                                    on sf.StudentFeeID equals p.StudentFeeID into payments
                            from p in payments.DefaultIfEmpty()
                            where (!request.SemesterId.HasValue || sf.SemesterID == request.SemesterId.Value)
                            group new { sf, p } by new { d.DepartmentID, d.DepartmentName } into g
                            select new ReportItemDto
                            {
                                Id = g.Key.DepartmentID.ToString(),
                                Name = g.Key.DepartmentName,
                                TotalAmount = g.Sum(x => x.sf.TotalAmount),
                                PaidAmount = g.Sum(x => x.p != null ? x.p.Amount : 0),
                                StudentCount = g.Select(x => x.sf.StudentID).Distinct().Count()
                            };
                
                var items = await query.ToListAsync();
                
                // Calculate summary
                var summary = new ReportSummaryDto
                {
                    TotalAmount = items.Sum(i => i.TotalAmount),
                    PaidAmount = items.Sum(i => i.PaidAmount),
                    TotalCount = items.Sum(i => i.StudentCount)
                };
                
                return new FinancialReportDto
                {
                    Items = items,
                    Summary = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating department report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // POST: Báo cáo theo danh mục học phí
        [HttpPost("reports/by-category")]
        public async Task<ActionResult<FinancialReportDto>> GetReportByCategory(ReportRequestDto request)
        {
            try
            {
                // Validate request
                if (request.StartDate > request.EndDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }

                // Query student fees in the given period
                var studentFees = _context.StudentFees
                    .Where(sf => (!request.SemesterId.HasValue || sf.SemesterID == request.SemesterId.Value))
                    .Select(sf => sf.StudentFeeID)
                    .ToList();

                // Query for report by fee category
                var query = from sfd in _context.StudentFeeDetails
                            join fc in _context.FeeCategories on sfd.FeeCategoryID equals fc.FeeCategoryID
                            join sf in _context.StudentFees on sfd.StudentFeeID equals sf.StudentFeeID
                            join p in _context.Payments.Where(p => p.Status == "Success" &&
                                                                p.PaymentDate >= request.StartDate &&
                                                                p.PaymentDate <= request.EndDate)
                                    on sf.StudentFeeID equals p.StudentFeeID into payments
                            where studentFees.Contains(sfd.StudentFeeID)
                            group new { sfd, payments } by new { fc.FeeCategoryID, fc.CategoryName } into g
                            select new ReportItemDto
                            {
                                Id = g.Key.FeeCategoryID.ToString(),
                                Name = g.Key.CategoryName,
                                TotalAmount = g.Sum(x => x.sfd.Amount),
                                PaidAmount = g.Sum(x => x.payments.Sum(p => p.Amount) * (x.sfd.Amount / _context.StudentFeeDetails
                                                    .Where(d => d.StudentFeeID == x.sfd.StudentFeeID)
                                                    .Sum(d => d.Amount)))
                            };
                
                var items = await query.ToListAsync();
                
                // Calculate summary
                var summary = new ReportSummaryDto
                {
                    TotalAmount = items.Sum(i => i.TotalAmount),
                    PaidAmount = items.Sum(i => i.PaidAmount)
                };
                
                return new FinancialReportDto
                {
                    Items = items,
                    Summary = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating category report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // POST: Báo cáo theo phương thức thanh toán
        [HttpPost("reports/by-method")]
        public async Task<ActionResult<FinancialReportDto>> GetReportByMethod(ReportRequestDto request)
        {
            try
            {
                // Validate request
                if (request.StartDate > request.EndDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }

                // Query for payments by method
                var query = from p in _context.Payments
                            join pm in _context.PaymentMethods on p.PaymentMethodID equals pm.PaymentMethodID
                            join sf in _context.StudentFees on p.StudentFeeID equals sf.StudentFeeID
                            where p.Status == "Success" &&
                                  p.PaymentDate >= request.StartDate &&
                                  p.PaymentDate <= request.EndDate &&
                                  (!request.SemesterId.HasValue || sf.SemesterID == request.SemesterId.Value)
                            group p by new { pm.PaymentMethodID, pm.MethodName } into g
                            select new PaymentMethodReportItemDto
                            {
                                Id = g.Key.PaymentMethodID.ToString(),
                                Name = g.Key.MethodName,
                                Count = g.Count(),
                                Amount = g.Sum(p => p.Amount)
                            };
                
                var items = await query.ToListAsync();
                
                // Get most popular payment method
                var mostPopularMethod = items.OrderByDescending(i => i.Count).FirstOrDefault()?.Name ?? "N/A";
                
                // Calculate summary
                var summary = new PaymentMethodReportSummaryDto
                {
                    TotalAmount = items.Sum(i => i.Amount),
                    TotalCount = items.Sum(i => i.Count),
                    MostPopularMethod = mostPopularMethod
                };
                
                return new FinancialReportDto
                {
                    Items = items,
                    Summary = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating payment method report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // POST: Báo cáo theo ngày
        [HttpPost("reports/by-day")]
        public async Task<ActionResult<FinancialReportDto>> GetReportByDay(ReportRequestDto request)
        {
            try
            {
                // Validate request
                if (request.StartDate > request.EndDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }

                // Query for payments by day
                var query = from p in _context.Payments
                            join sf in _context.StudentFees on p.StudentFeeID equals sf.StudentFeeID
                            where p.PaymentDate >= request.StartDate &&
                                  p.PaymentDate <= request.EndDate &&
                                  (!request.SemesterId.HasValue || sf.SemesterID == request.SemesterId.Value)
                            group p by p.PaymentDate.Date into g
                            select new PaymentTimeReportItemDto
                            {
                                Date = g.Key,
                                Count = g.Count(),
                                TotalAmount = g.Sum(p => p.Amount),
                                SuccessAmount = g.Where(p => p.Status == "Success").Sum(p => p.Amount),
                                PendingAmount = g.Where(p => p.Status == "Pending").Sum(p => p.Amount),
                                FailedAmount = g.Where(p => p.Status == "Failed").Sum(p => p.Amount)
                            };
                
                var items = await query.ToListAsync();
                
                // Calculate summary
                var summary = new PaymentTimeReportSummaryDto
                {
                    TotalAmount = items.Sum(i => i.TotalAmount),
                    SuccessAmount = items.Sum(i => i.SuccessAmount),
                    PendingAmount = items.Sum(i => i.PendingAmount),
                    FailedAmount = items.Sum(i => i.FailedAmount),
                    TotalCount = items.Sum(i => i.Count)
                };
                
                return new FinancialReportDto
                {
                    Items = items,
                    Summary = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating daily report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // POST: Báo cáo theo tháng
        [HttpPost("reports/by-month")]
        public async Task<ActionResult<FinancialReportDto>> GetReportByMonth(ReportRequestDto request)
        {
            try
            {
                // Validate request
                if (request.StartDate > request.EndDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }

                // Query for payments by month
                var query = from p in _context.Payments
                            join sf in _context.StudentFees on p.StudentFeeID equals sf.StudentFeeID
                            where p.PaymentDate >= request.StartDate &&
                                  p.PaymentDate <= request.EndDate &&
                                  (!request.SemesterId.HasValue || sf.SemesterID == request.SemesterId.Value)
                            group p by new { Month = p.PaymentDate.Month, Year = p.PaymentDate.Year } into g
                            select new PaymentMonthReportItemDto
                            {
                                Month = g.Key.Month,
                                Year = g.Key.Year,
                                Count = g.Count(),
                                TotalAmount = g.Sum(p => p.Amount),
                                SuccessAmount = g.Where(p => p.Status == "Success").Sum(p => p.Amount),
                                PendingAmount = g.Where(p => p.Status == "Pending").Sum(p => p.Amount),
                                FailedAmount = g.Where(p => p.Status == "Failed").Sum(p => p.Amount)
                            };
                
                var items = await query.OrderBy(i => i.Year).ThenBy(i => i.Month).ToListAsync();
                
                // Calculate summary
                var summary = new PaymentTimeReportSummaryDto
                {
                    TotalAmount = items.Sum(i => i.TotalAmount),
                    SuccessAmount = items.Sum(i => i.SuccessAmount),
                    PendingAmount = items.Sum(i => i.PendingAmount),
                    FailedAmount = items.Sum(i => i.FailedAmount),
                    TotalCount = items.Sum(i => i.Count)
                };
                
                return new FinancialReportDto
                {
                    Items = items,
                    Summary = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating monthly report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // GET: Xuất báo cáo ra file Excel
        [HttpGet("reports/export")]
        public async Task<IActionResult> ExportReport([FromQuery] ReportExportDto model)
        {
            try
            {
                // Validate dates
                if (string.IsNullOrEmpty(model.StartDate) || string.IsNullOrEmpty(model.EndDate))
                {
                    return BadRequest(new { message = "Ngày bắt đầu và kết thúc không được để trống" });
                }
                
                if (!DateTime.TryParse(model.StartDate, out var startDate) || !DateTime.TryParse(model.EndDate, out var endDate))
                {
                    return BadRequest(new { message = "Định dạng ngày không hợp lệ" });
                }
                
                if (startDate > endDate)
                {
                    return BadRequest(new { message = "Ngày bắt đầu phải trước ngày kết thúc" });
                }
                
                // Generate report data based on report type
                FinancialReportDto reportData = null;
                
                // Create report request
                var request = new ReportRequestDto
                {
                    StartDate = startDate,
                    EndDate = endDate
                };
                
                if (!string.IsNullOrEmpty(model.SemesterId) && int.TryParse(model.SemesterId, out var semesterId))
                {
                    request.SemesterId = semesterId;
                }
                
                switch (model.ReportType)
                {
                    case "semester":
                        reportData = (await GetReportBySemester(request)).Value;
                        break;
                    case "department":
                        reportData = (await GetReportByDepartment(request)).Value;
                        break;
                    case "category":
                        reportData = (await GetReportByCategory(request)).Value;
                        break;
                    case "method":
                        reportData = (await GetReportByMethod(request)).Value;
                        break;
                    case "daily":
                        reportData = (await GetReportByDay(request)).Value;
                        break;
                    case "monthly":
                        reportData = (await GetReportByMonth(request)).Value;
                        break;
                    default:
                        return BadRequest(new { message = "Loại báo cáo không hợp lệ" });
                }
                
                if (reportData == null || reportData.Items == null || !reportData.Items.Any())
                {
                    return NotFound(new { message = "Không có dữ liệu báo cáo" });
                }
                
                using (var workbook = new XLWorkbook())
                {
                    var worksheet = workbook.Worksheets.Add("Báo cáo tài chính");
                    
                    // Set up headers based on report type
                    int headerRow = 1;
                    worksheet.Cell(headerRow, 1).Value = "Báo cáo tài chính";
                    worksheet.Cell(headerRow, 1).Style.Font.Bold = true;
                    worksheet.Cell(headerRow, 1).Style.Font.FontSize = 16;
                    
                    headerRow += 2;
                    worksheet.Cell(headerRow, 1).Value = "Loại báo cáo:";
                    worksheet.Cell(headerRow, 2).Value = GetReportTypeName(model.ReportType);
                    
                    headerRow += 1;
                    worksheet.Cell(headerRow, 1).Value = "Thời gian:";
                    worksheet.Cell(headerRow, 2).Value = $"Từ {startDate.ToShortDateString()} đến {endDate.ToShortDateString()}";
                    
                    if (request.SemesterId.HasValue)
                    {
                        headerRow += 1;
                        var semester = await _context.Semesters.FindAsync(request.SemesterId.Value);
                        worksheet.Cell(headerRow, 1).Value = "Học kỳ:";
                        worksheet.Cell(headerRow, 2).Value = semester?.SemesterName ?? "N/A";
                    }
                    
                    headerRow += 2;
                    
                    // Add column headers based on report type
                    switch (model.ReportType)
                    {
                        case "semester":
                        case "department":
                            worksheet.Cell(headerRow, 1).Value = model.ReportType == "semester" ? "Học kỳ" : "Khoa";
                            worksheet.Cell(headerRow, 2).Value = "Tổng học phí";
                            worksheet.Cell(headerRow, 3).Value = "Đã thanh toán";
                            worksheet.Cell(headerRow, 4).Value = "Chưa thanh toán";
                            worksheet.Cell(headerRow, 5).Value = "Tỷ lệ thanh toán";
                            worksheet.Cell(headerRow, 6).Value = "Số sinh viên";
                            break;
                        case "category":
                            worksheet.Cell(headerRow, 1).Value = "Danh mục học phí";
                            worksheet.Cell(headerRow, 2).Value = "Tổng học phí";
                            worksheet.Cell(headerRow, 3).Value = "Đã thanh toán";
                            worksheet.Cell(headerRow, 4).Value = "Chưa thanh toán";
                            worksheet.Cell(headerRow, 5).Value = "Tỷ lệ thanh toán";
                            break;
                        case "method":
                            worksheet.Cell(headerRow, 1).Value = "Phương thức thanh toán";
                            worksheet.Cell(headerRow, 2).Value = "Số lượng giao dịch";
                            worksheet.Cell(headerRow, 3).Value = "Tổng tiền";
                            worksheet.Cell(headerRow, 4).Value = "Tỷ lệ";
                            break;
                        case "daily":
                            worksheet.Cell(headerRow, 1).Value = "Ngày";
                            worksheet.Cell(headerRow, 2).Value = "Số lượng giao dịch";
                            worksheet.Cell(headerRow, 3).Value = "Tổng tiền";
                            worksheet.Cell(headerRow, 4).Value = "Thành công";
                            worksheet.Cell(headerRow, 5).Value = "Đang xử lý";
                            worksheet.Cell(headerRow, 6).Value = "Thất bại";
                            break;
                        case "monthly":
                            worksheet.Cell(headerRow, 1).Value = "Tháng";
                            worksheet.Cell(headerRow, 2).Value = "Số lượng giao dịch";
                            worksheet.Cell(headerRow, 3).Value = "Tổng tiền";
                            worksheet.Cell(headerRow, 4).Value = "Thành công";
                            worksheet.Cell(headerRow, 5).Value = "Đang xử lý";
                            worksheet.Cell(headerRow, 6).Value = "Thất bại";
                            break;
                    }
                    
                    // Style header row
                    var dataHeaderRow = worksheet.Row(headerRow);
                    dataHeaderRow.Style.Font.Bold = true;
                    dataHeaderRow.Style.Fill.BackgroundColor = XLColor.LightGray;
                    
                    // Add data rows
                    int row = headerRow + 1;
                    switch (model.ReportType)
                    {
                        case "semester":
                        case "department":
                        case "category":
                            foreach (var item in reportData.Items.Cast<ReportItemDto>())
                            {
                                decimal paymentRate = item.TotalAmount > 0 ? (item.PaidAmount / item.TotalAmount * 100) : 0;
                                
                                worksheet.Cell(row, 1).Value = item.Name;
                                worksheet.Cell(row, 2).Value = item.TotalAmount;
                                worksheet.Cell(row, 2).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 3).Value = item.PaidAmount;
                                worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 4).Value = item.TotalAmount - item.PaidAmount;
                                worksheet.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 5).Value = paymentRate;
                                worksheet.Cell(row, 5).Style.NumberFormat.Format = "0.00%";
                                
                                if (model.ReportType != "category")
                                {
                                    worksheet.Cell(row, 6).Value = item.StudentCount;
                                }
                                
                                row++;
                            }
                            break;
                        case "method":
                            foreach (var item in reportData.Items.Cast<PaymentMethodReportItemDto>())
                            {
                                var summary = (PaymentMethodReportSummaryDto)reportData.Summary;
                                decimal percentage = summary.TotalAmount > 0 ? (item.Amount / summary.TotalAmount * 100) : 0;
                                
                                worksheet.Cell(row, 1).Value = item.Name;
                                worksheet.Cell(row, 2).Value = item.Count;
                                worksheet.Cell(row, 3).Value = item.Amount;
                                worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 4).Value = percentage;
                                worksheet.Cell(row, 4).Style.NumberFormat.Format = "0.00%";
                                
                                row++;
                            }
                            break;
                        case "daily":
                            foreach (var item in reportData.Items.Cast<PaymentTimeReportItemDto>())
                            {
                                worksheet.Cell(row, 1).Value = item.Date;
                                worksheet.Cell(row, 1).Style.DateFormat.Format = "dd/MM/yyyy";
                                worksheet.Cell(row, 2).Value = item.Count;
                                worksheet.Cell(row, 3).Value = item.TotalAmount;
                                worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 4).Value = item.SuccessAmount;
                                worksheet.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 5).Value = item.PendingAmount;
                                worksheet.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 6).Value = item.FailedAmount;
                                worksheet.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                                
                                row++;
                            }
                            break;
                        case "monthly":
                            foreach (var item in reportData.Items.Cast<PaymentMonthReportItemDto>())
                            {
                                worksheet.Cell(row, 1).Value = $"{item.Month}/{item.Year}";
                                worksheet.Cell(row, 2).Value = item.Count;
                                worksheet.Cell(row, 3).Value = item.TotalAmount;
                                worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 4).Value = item.SuccessAmount;
                                worksheet.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 5).Value = item.PendingAmount;
                                worksheet.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                                worksheet.Cell(row, 6).Value = item.FailedAmount;
                                worksheet.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                                
                                row++;
                            }
                            break;
                    }
                    
                    // Add summary row
                    row++;
                    worksheet.Cell(row, 1).Value = "Tổng cộng";
                    worksheet.Cell(row, 1).Style.Font.Bold = true;
                    
                    switch (model.ReportType)
                    {
                        case "semester":
                        case "department":
                        case "category":
                            var summaryData = (ReportSummaryDto)reportData.Summary;
                            decimal totalPaymentRate = summaryData.TotalAmount > 0 ? (summaryData.PaidAmount / summaryData.TotalAmount * 100) : 0;
                            
                            worksheet.Cell(row, 2).Value = summaryData.TotalAmount;
                            worksheet.Cell(row, 2).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 3).Value = summaryData.PaidAmount;
                            worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 4).Value = summaryData.TotalAmount - summaryData.PaidAmount;
                            worksheet.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 5).Value = totalPaymentRate;
                            worksheet.Cell(row, 5).Style.NumberFormat.Format = "0.00%";
                            
                            if (model.ReportType != "category")
                            {
                                worksheet.Cell(row, 6).Value = summaryData.TotalCount;
                            }
                            break;
                        case "method":
                            var methodSummary = (PaymentMethodReportSummaryDto)reportData.Summary;
                            
                            worksheet.Cell(row, 2).Value = methodSummary.TotalCount;
                            worksheet.Cell(row, 3).Value = methodSummary.TotalAmount;
                            worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 4).Value = "100%";
                            break;
                        case "daily":
                        case "monthly":
                            var timeSummary = (PaymentTimeReportSummaryDto)reportData.Summary;
                            
                            worksheet.Cell(row, 2).Value = timeSummary.TotalCount;
                            worksheet.Cell(row, 3).Value = timeSummary.TotalAmount;
                            worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 4).Value = timeSummary.SuccessAmount;
                            worksheet.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 5).Value = timeSummary.PendingAmount;
                            worksheet.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                            worksheet.Cell(row, 6).Value = timeSummary.FailedAmount;
                            worksheet.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                            break;
                    }
                    
                    // Auto-fit columns
                    worksheet.Columns().AdjustToContents();
                    
                    // Prepare response
                    var stream = new MemoryStream();
                    workbook.SaveAs(stream);
                    stream.Position = 0;
                    
                    return File(
                        fileContents: stream.ToArray(),
                        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        fileDownloadName: $"Bao-cao-tai-chinh_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error exporting report: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
        
        // Helper method to get report type text
        private string GetReportTypeName(string reportType)
        {
            switch (reportType)
            {
                case "semester":
                    return "Theo học kỳ";
                case "department":
                    return "Theo khoa";
                case "category":
                    return "Theo danh mục học phí";
                case "method":
                    return "Theo phương thức thanh toán";
                case "daily":
                    return "Theo ngày";
                case "monthly":
                    return "Theo tháng";
                default:
                    return "Không xác định";
            }
        }
    }

    // DTO Models
    public class PaymentResponseDto
    {
        public int PaymentID { get; set; }
        public int StudentFeeID { get; set; }
        public string StudentName { get; set; }
        public string StudentCode { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethodName { get; set; }
        public string TransactionID { get; set; }
        public string Status { get; set; }
        public string PaymentReference { get; set; }
    }

    public class PaymentDetailDto : PaymentResponseDto
    {
        public string StudentEmail { get; set; }
        public string SemesterName { get; set; }
        public int PaymentMethodID { get; set; }
        public List<InvoiceDto> Invoices { get; set; }
    }

    public class PaymentCreateDto
    {
        public int StudentFeeID { get; set; }
        public int PaymentMethodID { get; set; }
        public decimal Amount { get; set; }
        public string TransactionID { get; set; }
        public string PaymentReference { get; set; }
    }

    public class PaymentStatusUpdateDto
    {
        public string Status { get; set; }
        public string PaymentReference { get; set; }
    }

    public class InvoiceDto
    {
        public int InvoiceID { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string InvoicePath { get; set; }
        public bool SentToEmail { get; set; }
    }

    public class PaymentSearchDto
    {
        public string TransactionId { get; set; }
        public string StudentCode { get; set; }
        public int? PaymentMethodId { get; set; }
        public string Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
    
    public class PaymentSummaryDto
    {
        public decimal TotalAmount { get; set; }
        public decimal SuccessAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public PaymentSemesterDto CurrentSemester { get; set; }
    }
    
    public class PaymentSemesterDto
    {
        public int SemesterID { get; set; }
        public string SemesterName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
    
    public class PaymentExportDto
    {
        public string TransactionId { get; set; }
        public string StudentCode { get; set; }
        public string PaymentMethodId { get; set; }
        public string Status { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
    }

    // Financial Report DTO Models
    public class ReportRequestDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? SemesterId { get; set; }
    }

    public class ReportExportDto
    {
        public string ReportType { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
        public string SemesterId { get; set; }
    }

    public class FinancialReportDto
    {
        public IEnumerable<object> Items { get; set; }
        public object Summary { get; set; }
    }

    public class ReportItemDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public int StudentCount { get; set; }
    }

    public class ReportSummaryDto
    {
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public int TotalCount { get; set; }
    }

    public class PaymentMethodReportItemDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }

    public class PaymentMethodReportSummaryDto
    {
        public decimal TotalAmount { get; set; }
        public int TotalCount { get; set; }
        public string MostPopularMethod { get; set; }
    }

    public class PaymentTimeReportItemDto
    {
        public DateTime Date { get; set; }
        public int Count { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal SuccessAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public decimal FailedAmount { get; set; }
    }

    public class PaymentMonthReportItemDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public int Count { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal SuccessAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public decimal FailedAmount { get; set; }
    }

    public class PaymentTimeReportSummaryDto
    {
        public decimal TotalAmount { get; set; }
        public decimal SuccessAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public decimal FailedAmount { get; set; }
        public int TotalCount { get; set; }
    }
} 