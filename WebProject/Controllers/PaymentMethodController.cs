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
    [Route("api/payment-methods")]
    public class PaymentMethodController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentMethodController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: Lấy danh sách phương thức thanh toán
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PaymentMethodDto>>> GetPaymentMethods()
        {
            try
            {
                var methods = await _context.PaymentMethods
                    .Where(pm => pm.IsActive)
                    .Select(pm => new PaymentMethodDto
                    {
                        PaymentMethodID = pm.PaymentMethodID,
                        MethodName = pm.MethodName,
                        Description = pm.Description,
                        IsActive = pm.IsActive
                    })
                    .ToListAsync();

                return methods;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payment methods: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Lấy chi tiết phương thức thanh toán theo ID
        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentMethodDto>> GetPaymentMethod(int id)
        {
            try
            {
                var method = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.PaymentMethodID == id);

                if (method == null)
                {
                    return NotFound(new { message = "Không tìm thấy phương thức thanh toán" });
                }

                var result = new PaymentMethodDto
                {
                    PaymentMethodID = method.PaymentMethodID,
                    MethodName = method.MethodName,
                    Description = method.Description,
                    IsActive = method.IsActive
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payment method details: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Tạo mới phương thức thanh toán
        [HttpPost]
        public async Task<ActionResult<PaymentMethodDto>> CreatePaymentMethod(PaymentMethodCreateDto model)
        {
            try
            {
                // Kiểm tra tên phương thức thanh toán đã tồn tại chưa
                var existingMethod = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.MethodName == model.MethodName);

                if (existingMethod != null)
                {
                    return BadRequest(new { message = "Tên phương thức thanh toán đã tồn tại" });
                }

                var method = new PaymentMethod
                {
                    MethodName = model.MethodName,
                    Description = model.Description,
                    IsActive = true
                };

                _context.PaymentMethods.Add(method);
                await _context.SaveChangesAsync();

                var result = new PaymentMethodDto
                {
                    PaymentMethodID = method.PaymentMethodID,
                    MethodName = method.MethodName,
                    Description = method.Description,
                    IsActive = method.IsActive
                };

                return CreatedAtAction(nameof(GetPaymentMethod), new { id = method.PaymentMethodID }, result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating payment method: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: Cập nhật phương thức thanh toán
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePaymentMethod(int id, PaymentMethodUpdateDto model)
        {
            try
            {
                var method = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.PaymentMethodID == id);

                if (method == null)
                {
                    return NotFound(new { message = "Không tìm thấy phương thức thanh toán" });
                }

                // Kiểm tra tên phương thức thanh toán đã tồn tại chưa (nếu có thay đổi tên)
                if (method.MethodName != model.MethodName)
                {
                    var existingMethod = await _context.PaymentMethods
                        .FirstOrDefaultAsync(pm => pm.MethodName == model.MethodName);

                    if (existingMethod != null)
                    {
                        return BadRequest(new { message = "Tên phương thức thanh toán đã tồn tại" });
                    }
                }

                method.MethodName = model.MethodName;
                method.Description = model.Description;
                method.IsActive = model.IsActive;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating payment method: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: Vô hiệu hóa phương thức thanh toán
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeactivatePaymentMethod(int id)
        {
            try
            {
                var method = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.PaymentMethodID == id);

                if (method == null)
                {
                    return NotFound(new { message = "Không tìm thấy phương thức thanh toán" });
                }

                // Kiểm tra xem phương thức thanh toán đã được sử dụng chưa
                var hasPayments = await _context.Payments
                    .AnyAsync(p => p.PaymentMethodID == id);

                if (hasPayments)
                {
                    // Nếu đã được sử dụng, chỉ vô hiệu hóa thay vì xóa
                    method.IsActive = false;
                    await _context.SaveChangesAsync();
                    return NoContent();
                }

                // Nếu chưa được sử dụng, có thể xóa hoàn toàn
                _context.PaymentMethods.Remove(method);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deactivating payment method: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    // DTO Models
    public class PaymentMethodDto
    {
        public int PaymentMethodID { get; set; }
        public string MethodName { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
    }

    public class PaymentMethodCreateDto
    {
        public string MethodName { get; set; }
        public string Description { get; set; }
    }

    public class PaymentMethodUpdateDto
    {
        public string MethodName { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
    }
} 