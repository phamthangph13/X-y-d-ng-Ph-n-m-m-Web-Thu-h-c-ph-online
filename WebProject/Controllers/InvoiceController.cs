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
    [Route("api/payments/invoices")]
    public class InvoiceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InvoiceController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: Lấy chi tiết hóa đơn theo ID
        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceDetailDto>> GetInvoice(int id)
        {
            try
            {
                var invoice = await _context.Invoices
                    .Include(i => i.Payment)
                        .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(i => i.Payment.PaymentMethod)
                    .FirstOrDefaultAsync(i => i.InvoiceID == id);

                if (invoice == null)
                {
                    return NotFound(new { message = "Không tìm thấy hóa đơn" });
                }

                var result = new InvoiceDetailDto
                {
                    InvoiceID = invoice.InvoiceID,
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.InvoiceDate,
                    InvoicePath = invoice.InvoicePath,
                    SentToEmail = invoice.SentToEmail,
                    PaymentID = invoice.PaymentID,
                    StudentCode = invoice.Payment.StudentFee.Student.StudentCode,
                    StudentName = invoice.Payment.StudentFee.Student.User.FullName,
                    StudentEmail = invoice.Payment.StudentFee.Student.User.Email,
                    Amount = invoice.Payment.Amount,
                    PaymentDate = invoice.Payment.PaymentDate,
                    TransactionID = invoice.Payment.TransactionID,
                    PaymentMethodName = invoice.Payment.PaymentMethod.MethodName,
                    PaymentReference = invoice.Payment.PaymentReference,
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting invoice details: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Tìm kiếm hóa đơn
        [HttpPost("search")]
        public async Task<ActionResult<PagedResult<InvoiceResponseDto>>> SearchInvoices(InvoiceSearchDto model)
        {
            try
            {
                var query = _context.Invoices
                    .Include(i => i.Payment)
                        .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .AsQueryable();
                    
                // Apply filters if provided
                if (!string.IsNullOrEmpty(model.InvoiceNumber))
                {
                    query = query.Where(i => i.InvoiceNumber.Contains(model.InvoiceNumber));
                }
                
                if (!string.IsNullOrEmpty(model.StudentCode))
                {
                    query = query.Where(i => i.Payment.StudentFee.Student.StudentCode.Contains(model.StudentCode));
                }
                
                if (!string.IsNullOrEmpty(model.TransactionId))
                {
                    query = query.Where(i => i.Payment.TransactionID.Contains(model.TransactionId));
                }
                
                if (model.SentToEmail.HasValue)
                {
                    query = query.Where(i => i.SentToEmail == model.SentToEmail.Value);
                }
                
                if (model.StartDate.HasValue)
                {
                    query = query.Where(i => i.InvoiceDate >= model.StartDate.Value);
                }
                
                if (model.EndDate.HasValue)
                {
                    // Add one day to include the end date
                    var endDate = model.EndDate.Value.AddDays(1);
                    query = query.Where(i => i.InvoiceDate < endDate);
                }
                
                // Calculate total count
                var totalCount = await query.CountAsync();
                
                // Apply pagination
                var invoices = await query
                    .OrderByDescending(i => i.InvoiceDate)
                    .Skip((model.PageNumber - 1) * model.PageSize)
                    .Take(model.PageSize)
                    .Select(i => new InvoiceResponseDto
                    {
                        InvoiceID = i.InvoiceID,
                        InvoiceNumber = i.InvoiceNumber,
                        InvoiceDate = i.InvoiceDate,
                        InvoicePath = i.InvoicePath,
                        SentToEmail = i.SentToEmail,
                        PaymentID = i.PaymentID,
                        StudentCode = i.Payment.StudentFee.Student.StudentCode,
                        StudentName = i.Payment.StudentFee.Student.User.FullName,
                        Amount = i.Payment.Amount,
                        TransactionID = i.Payment.TransactionID
                    })
                    .ToListAsync();
                
                var result = new PagedResult<InvoiceResponseDto>
                {
                    Items = invoices,
                    TotalCount = totalCount,
                    CurrentPage = model.PageNumber,
                    PageSize = model.PageSize
                };
                
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error searching invoices: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Tải xuống hóa đơn
        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadInvoice(int id)
        {
            try
            {
                var invoice = await _context.Invoices
                    .FirstOrDefaultAsync(i => i.InvoiceID == id);

                if (invoice == null)
                {
                    return NotFound(new { message = "Không tìm thấy hóa đơn" });
                }

                if (string.IsNullOrEmpty(invoice.InvoicePath) || !System.IO.File.Exists(invoice.InvoicePath))
                {
                    return NotFound(new { message = "Không tìm thấy file hóa đơn" });
                }

                var fileName = Path.GetFileName(invoice.InvoicePath);
                var fileBytes = await System.IO.File.ReadAllBytesAsync(invoice.InvoicePath);
                return File(fileBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error downloading invoice: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Gửi hóa đơn qua email
        [HttpPost("{id}/send-email")]
        public async Task<IActionResult> SendInvoiceEmail(int id)
        {
            try
            {
                var invoice = await _context.Invoices
                    .Include(i => i.Payment)
                        .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .FirstOrDefaultAsync(i => i.InvoiceID == id);

                if (invoice == null)
                {
                    return NotFound(new { message = "Không tìm thấy hóa đơn" });
                }

                if (string.IsNullOrEmpty(invoice.InvoicePath) || !System.IO.File.Exists(invoice.InvoicePath))
                {
                    return BadRequest(new { message = "Không tìm thấy file hóa đơn" });
                }

                var studentEmail = invoice.Payment.StudentFee.Student.User.Email;
                
                // TODO: Implement email sending logic here (using SMTP)
                // For now, we'll just mark it as sent
                invoice.SentToEmail = true;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Gửi hóa đơn qua email thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending invoice email: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Gửi nhiều hóa đơn qua email
        [HttpPost("send-batch")]
        public async Task<IActionResult> SendBatchInvoices(BatchInvoiceRequestDto model)
        {
            try
            {
                if (model.InvoiceIds == null || model.InvoiceIds.Count == 0)
                {
                    return BadRequest(new { message = "Vui lòng cung cấp danh sách hóa đơn" });
                }

                var invoices = await _context.Invoices
                    .Include(i => i.Payment)
                        .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Where(i => model.InvoiceIds.Contains(i.InvoiceID))
                    .ToListAsync();

                if (invoices.Count == 0)
                {
                    return NotFound(new { message = "Không tìm thấy hóa đơn" });
                }

                // TODO: Implement batch email sending logic here
                // For now, we'll just mark them all as sent
                foreach (var invoice in invoices)
                {
                    invoice.SentToEmail = true;
                }
                
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Đã gửi {invoices.Count} hóa đơn qua email thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending batch invoices: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Xuất dữ liệu ra Excel
        [HttpGet("export")]
        public async Task<IActionResult> ExportInvoicesToExcel([FromQuery] InvoiceExportDto model)
        {
            try
            {
                var query = _context.Invoices
                    .Include(i => i.Payment)
                        .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(i => i.Payment.PaymentMethod)
                    .AsQueryable();
                
                // Apply filters if provided
                if (!string.IsNullOrEmpty(model.InvoiceNumber))
                {
                    query = query.Where(i => i.InvoiceNumber.Contains(model.InvoiceNumber));
                }
                
                if (!string.IsNullOrEmpty(model.StudentCode))
                {
                    query = query.Where(i => i.Payment.StudentFee.Student.StudentCode.Contains(model.StudentCode));
                }
                
                if (!string.IsNullOrEmpty(model.TransactionId))
                {
                    query = query.Where(i => i.Payment.TransactionID.Contains(model.TransactionId));
                }
                
                if (!string.IsNullOrEmpty(model.SentToEmail))
                {
                    bool sentToEmail;
                    if (bool.TryParse(model.SentToEmail, out sentToEmail))
                    {
                        query = query.Where(i => i.SentToEmail == sentToEmail);
                    }
                }
                
                if (!string.IsNullOrEmpty(model.StartDate))
                {
                    DateTime startDate;
                    if (DateTime.TryParse(model.StartDate, out startDate))
                    {
                        query = query.Where(i => i.InvoiceDate >= startDate);
                    }
                }
                
                if (!string.IsNullOrEmpty(model.EndDate))
                {
                    DateTime endDate;
                    if (DateTime.TryParse(model.EndDate, out endDate))
                    {
                        // Add one day to include the end date
                        endDate = endDate.AddDays(1);
                        query = query.Where(i => i.InvoiceDate < endDate);
                    }
                }
                
                var invoices = await query
                    .OrderByDescending(i => i.InvoiceDate)
                    .ToListAsync();
                
                using (var workbook = new XLWorkbook())
                {
                    var worksheet = workbook.Worksheets.Add("Invoices");
                    
                    // Add headers
                    worksheet.Cell(1, 1).Value = "Số hóa đơn";
                    worksheet.Cell(1, 2).Value = "Mã sinh viên";
                    worksheet.Cell(1, 3).Value = "Tên sinh viên";
                    worksheet.Cell(1, 4).Value = "Mã giao dịch";
                    worksheet.Cell(1, 5).Value = "Số tiền";
                    worksheet.Cell(1, 6).Value = "Phương thức thanh toán";
                    worksheet.Cell(1, 7).Value = "Ngày tạo";
                    worksheet.Cell(1, 8).Value = "Đã gửi email";
                    
                    // Style the header
                    var headerRange = worksheet.Range(1, 1, 1, 8);
                    headerRange.Style.Font.Bold = true;
                    headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;
                    
                    // Add data
                    for (int i = 0; i < invoices.Count; i++)
                    {
                        var invoice = invoices[i];
                        int row = i + 2;
                        
                        worksheet.Cell(row, 1).Value = invoice.InvoiceNumber;
                        worksheet.Cell(row, 2).Value = invoice.Payment.StudentFee.Student.StudentCode;
                        worksheet.Cell(row, 3).Value = invoice.Payment.StudentFee.Student.User.FullName;
                        worksheet.Cell(row, 4).Value = invoice.Payment.TransactionID ?? "N/A";
                        worksheet.Cell(row, 5).Value = invoice.Payment.Amount;
                        worksheet.Cell(row, 6).Value = invoice.Payment.PaymentMethod.MethodName;
                        worksheet.Cell(row, 7).Value = invoice.InvoiceDate;
                        worksheet.Cell(row, 8).Value = invoice.SentToEmail ? "Đã gửi" : "Chưa gửi";
                    }
                    
                    // Format columns
                    worksheet.Column(5).Style.NumberFormat.Format = "#,##0";
                    worksheet.Column(7).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                    
                    // Auto-fit columns
                    worksheet.Columns().AdjustToContents();
                    
                    using (var stream = new MemoryStream())
                    {
                        workbook.SaveAs(stream);
                        var content = stream.ToArray();
                        
                        return File(
                            content,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            $"Invoices_{DateTime.Now:yyyyMMdd}.xlsx"
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error exporting invoices: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Lấy danh sách thanh toán chưa có hóa đơn
        [HttpGet("/api/payments/without-invoice")]
        public async Task<ActionResult<IEnumerable<PaymentWithoutInvoiceDto>>> GetPaymentsWithoutInvoice()
        {
            try
            {
                var payments = await _context.Payments
                    .Include(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Where(p => p.Status == "Success")
                    .Where(p => !p.Invoices.Any())
                    .Select(p => new PaymentWithoutInvoiceDto
                    {
                        PaymentID = p.PaymentID,
                        StudentCode = p.StudentFee.Student.StudentCode,
                        StudentName = p.StudentFee.Student.User.FullName,
                        Amount = p.Amount,
                        PaymentDate = p.PaymentDate,
                        TransactionID = p.TransactionID
                    })
                    .ToListAsync();

                return payments;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payments without invoice: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Tạo hóa đơn mới
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateInvoice(GenerateInvoiceDto model)
        {
            try
            {
                var payment = await _context.Payments
                    .Include(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .FirstOrDefaultAsync(p => p.PaymentID == model.PaymentId);

                if (payment == null)
                {
                    return NotFound(new { message = "Không tìm thấy thanh toán" });
                }

                // Check if invoice already exists
                var existingInvoice = await _context.Invoices
                    .AnyAsync(i => i.PaymentID == model.PaymentId);

                if (existingInvoice)
                {
                    return BadRequest(new { message = "Thanh toán này đã có hóa đơn" });
                }

                // Generate invoice number
                var invoiceCount = await _context.Invoices.CountAsync();
                var invoiceNumber = $"INV-{DateTime.Now:yyyyMMdd}-{invoiceCount + 1:D4}";

                // Create invoice file path
                // In a real system, this would generate a PDF file
                var invoicePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "invoices", $"{invoiceNumber}.pdf");
                
                // Create invoices directory if it doesn't exist
                var invoiceDir = Path.GetDirectoryName(invoicePath);
                if (!Directory.Exists(invoiceDir))
                {
                    Directory.CreateDirectory(invoiceDir);
                }

                // Create a placeholder PDF file
                // In a real system, this would use a PDF generation library
                // For now, just create an empty file
                await System.IO.File.WriteAllTextAsync(invoicePath, "Placeholder for invoice file");

                // Create invoice record
                var invoice = new Invoice
                {
                    PaymentID = payment.PaymentID,
                    InvoiceNumber = invoiceNumber,
                    InvoiceDate = DateTime.Now,
                    InvoicePath = invoicePath,
                    SentToEmail = false
                };

                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();

                // Send email if requested
                if (model.SendEmail)
                {
                    invoice.SentToEmail = true;
                    await _context.SaveChangesAsync();
                    
                    // TODO: Add real email sending logic here
                }

                return Ok(new { 
                    message = "Tạo hóa đơn thành công", 
                    invoiceId = invoice.InvoiceID,
                    invoiceNumber = invoice.InvoiceNumber
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating invoice: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    // DTO Models
    public class InvoiceResponseDto
    {
        public int InvoiceID { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string InvoicePath { get; set; }
        public bool SentToEmail { get; set; }
        public int PaymentID { get; set; }
        public string StudentCode { get; set; }
        public string StudentName { get; set; }
        public decimal Amount { get; set; }
        public string TransactionID { get; set; }
    }

    public class InvoiceDetailDto : InvoiceResponseDto
    {
        public string StudentEmail { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethodName { get; set; }
        public string PaymentReference { get; set; }
    }

    public class InvoiceSearchDto
    {
        public string InvoiceNumber { get; set; }
        public string StudentCode { get; set; }
        public string TransactionId { get; set; }
        public bool? SentToEmail { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class BatchInvoiceRequestDto
    {
        public List<int> InvoiceIds { get; set; }
    }

    public class InvoiceExportDto
    {
        public string InvoiceNumber { get; set; }
        public string StudentCode { get; set; }
        public string TransactionId { get; set; }
        public string SentToEmail { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
    }

    public class PaymentWithoutInvoiceDto
    {
        public int PaymentID { get; set; }
        public string StudentCode { get; set; }
        public string StudentName { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string TransactionID { get; set; }
    }

    public class GenerateInvoiceDto
    {
        public int PaymentId { get; set; }
        public bool SendEmail { get; set; }
    }
} 