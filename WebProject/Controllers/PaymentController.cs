using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;

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
} 