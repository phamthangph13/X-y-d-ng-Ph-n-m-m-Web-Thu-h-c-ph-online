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
                    PageNumber = pageNumber
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

    public class PagedResult<T>
    {
        public List<T> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageSize { get; set; }
        public int PageNumber { get; set; }
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
} 