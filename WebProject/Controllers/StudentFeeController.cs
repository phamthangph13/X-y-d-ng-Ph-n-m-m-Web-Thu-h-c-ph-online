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
    [Route("api/student-fees")]
    public class StudentFeeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StudentFeeController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: Lấy danh sách học phí sinh viên với lọc và phân trang
        [HttpGet]
        public async Task<ActionResult<PagedResponse<StudentFeeDto>>> GetStudentFees(
            [FromQuery] int? departmentId, 
            [FromQuery] int? classId, 
            [FromQuery] int? semesterId, 
            [FromQuery] string? status = null,
            [FromQuery] string? searchQuery = null,
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10)
        {
            try
            {
                if (!semesterId.HasValue)
                {
                    return BadRequest(new { message = "SemesterId is required" });
                }
                
                var query = _context.StudentFees
                    .Include(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(sf => sf.Student.Class)
                    .Include(sf => sf.Student.Department)
                    .Include(sf => sf.Semester)
                    .AsQueryable();

                // Áp dụng các bộ lọc
                query = query.Where(sf => sf.SemesterID == semesterId.Value);
                
                if (departmentId.HasValue)
                {
                    query = query.Where(sf => sf.Student.DepartmentID == departmentId.Value);
                }

                if (classId.HasValue)
                {
                    query = query.Where(sf => sf.Student.ClassID == classId.Value);
                }

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(sf => sf.Status == status);
                }

                if (!string.IsNullOrEmpty(searchQuery))
                {
                    searchQuery = searchQuery.ToLower();
                    query = query.Where(sf => 
                        sf.Student.StudentCode.ToLower().Contains(searchQuery) ||
                        sf.Student.User.FullName.ToLower().Contains(searchQuery) ||
                        sf.Student.User.Email.ToLower().Contains(searchQuery));
                }

                // Tính tổng số bản ghi
                var totalItems = await query.CountAsync();
                
                // Tính số trang
                var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
                
                // Lấy dữ liệu theo trang
                var studentFees = await query
                    .OrderByDescending(sf => sf.DueDate)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                // Lấy tổng đã thanh toán cho mỗi học phí sinh viên
                var studentFeeIds = studentFees.Select(sf => sf.StudentFeeID).ToList();
                var paymentTotals = await _context.Payments
                    .Where(p => studentFeeIds.Contains(p.StudentFeeID) && p.Status == "Success")
                    .GroupBy(p => p.StudentFeeID)
                    .Select(g => new { StudentFeeID = g.Key, TotalPaid = g.Sum(p => p.Amount) })
                    .ToDictionaryAsync(x => x.StudentFeeID, x => x.TotalPaid);

                // Chuyển đổi sang DTO
                var resultDto = studentFees.Select(sf => new StudentFeeDto
                {
                    StudentFeeID = sf.StudentFeeID,
                    StudentID = sf.StudentID,
                    StudentCode = sf.Student.StudentCode,
                    StudentName = sf.Student.User.FullName,
                    ClassName = sf.Student.Class.ClassName,
                    DepartmentName = sf.Student.Department.DepartmentName,
                    SemesterID = sf.SemesterID,
                    SemesterName = sf.Semester.SemesterName,
                    TotalAmount = sf.TotalAmount,
                    PaidAmount = paymentTotals.ContainsKey(sf.StudentFeeID) ? paymentTotals[sf.StudentFeeID] : 0,
                    Status = sf.Status,
                    DueDate = sf.DueDate
                }).ToList();

                // Trả về kết quả phân trang
                return new PagedResponse<StudentFeeDto>
                {
                    Items = resultDto,
                    Page = page,
                    PageSize = pageSize,
                    TotalItems = totalItems,
                    TotalPages = totalPages
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting student fees: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Lấy chi tiết học phí của một sinh viên
        [HttpGet("{id}")]
        public async Task<ActionResult<StudentFeeDetailDto>> GetStudentFeeDetail(int id)
        {
            try
            {
                var studentFee = await _context.StudentFees
                    .Include(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(sf => sf.Student.Class)
                    .Include(sf => sf.Student.Department)
                    .Include(sf => sf.Semester)
                    .FirstOrDefaultAsync(sf => sf.StudentFeeID == id);

                if (studentFee == null)
                {
                    return NotFound(new { message = "Không tìm thấy học phí sinh viên" });
                }

                // Lấy chi tiết học phí
                var feeDetails = await _context.StudentFeeDetails
                    .Include(sfd => sfd.FeeCategory)
                    .Where(sfd => sfd.StudentFeeID == id)
                    .ToListAsync();

                // Lấy lịch sử thanh toán
                var payments = await _context.Payments
                    .Include(p => p.PaymentMethod)
                    .Where(p => p.StudentFeeID == id)
                    .OrderByDescending(p => p.PaymentDate)
                    .ToListAsync();

                // Tính tổng đã thanh toán
                var totalPaid = payments
                    .Where(p => p.Status == "Success")
                    .Sum(p => p.Amount);

                // Chuyển đổi sang DTO
                var studentFeeDetailDto = new StudentFeeDetailDto
                {
                    StudentFee = new StudentFeeDto
                    {
                        StudentFeeID = studentFee.StudentFeeID,
                        StudentID = studentFee.StudentID,
                        StudentCode = studentFee.Student.StudentCode,
                        StudentName = studentFee.Student.User.FullName,
                        ClassName = studentFee.Student.Class.ClassName,
                        DepartmentName = studentFee.Student.Department.DepartmentName,
                        SemesterID = studentFee.SemesterID,
                        SemesterName = studentFee.Semester.SemesterName,
                        TotalAmount = studentFee.TotalAmount,
                        PaidAmount = totalPaid,
                        Status = studentFee.Status,
                        DueDate = studentFee.DueDate
                    },
                    FeeDetails = feeDetails.Select(fd => new FeeDetailDto
                    {
                        StudentFeeDetailID = fd.StudentFeeDetailID,
                        FeeCategoryID = fd.FeeCategoryID,
                        CategoryName = fd.FeeCategory.CategoryName,
                        Amount = fd.Amount
                    }).ToList(),
                    Payments = payments.Select(p => new PaymentDto
                    {
                        PaymentID = p.PaymentID,
                        Amount = p.Amount,
                        PaymentDate = p.PaymentDate,
                        PaymentMethodName = p.PaymentMethod.MethodName,
                        TransactionID = p.TransactionID,
                        Status = p.Status
                    }).ToList()
                };

                // Thêm thông tin sinh viên
                studentFeeDetailDto.StudentInfo = new StudentInfoDto
                {
                    StudentID = studentFee.Student.StudentID,
                    StudentCode = studentFee.Student.StudentCode,
                    Email = studentFee.Student.User.Email,
                    PhoneNumber = studentFee.Student.User.PhoneNumber,
                    FullName = studentFee.Student.User.FullName,
                    ClassName = studentFee.Student.Class.ClassName,
                    DepartmentName = studentFee.Student.Department.DepartmentName,
                    EnrollmentYear = studentFee.Student.EnrollmentYear,
                    CurrentSemester = studentFee.Student.CurrentSemester
                };

                return studentFeeDetailDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting student fee detail: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Tạo mới học phí cho sinh viên
        [HttpPost]
        public async Task<ActionResult<StudentFee>> CreateStudentFee(StudentFeeCreateDto model)
        {
            try
            {
                var student = await _context.Students
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.StudentID == model.StudentID);

                if (student == null)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên" });
                }

                var semester = await _context.Semesters
                    .FirstOrDefaultAsync(s => s.SemesterID == model.SemesterID);

                if (semester == null)
                {
                    return NotFound(new { message = "Không tìm thấy học kỳ" });
                }

                // Kiểm tra xem đã tồn tại học phí cho sinh viên và học kỳ chưa
                var existingFee = await _context.StudentFees
                    .FirstOrDefaultAsync(sf => sf.StudentID == model.StudentID && sf.SemesterID == model.SemesterID);

                if (existingFee != null)
                {
                    return BadRequest(new { message = "Học phí cho sinh viên này trong học kỳ đã tồn tại" });
                }

                // Tính tổng học phí
                decimal totalAmount = model.FeeDetails.Sum(fd => fd.Amount);

                // Tạo học phí mới
                var newStudentFee = new StudentFee
                {
                    StudentID = model.StudentID,
                    SemesterID = model.SemesterID,
                    TotalAmount = totalAmount,
                    DueDate = model.DueDate,
                    Status = "Unpaid",
                    CreatedDate = DateTime.Now
                };

                _context.StudentFees.Add(newStudentFee);
                await _context.SaveChangesAsync();

                // Tạo chi tiết học phí
                foreach (var detail in model.FeeDetails)
                {
                    var feeDetail = new StudentFeeDetail
                    {
                        StudentFeeID = newStudentFee.StudentFeeID,
                        FeeCategoryID = detail.FeeCategoryID,
                        Amount = detail.Amount
                    };

                    _context.StudentFeeDetails.Add(feeDetail);
                }

                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetStudentFeeDetail), new { id = newStudentFee.StudentFeeID }, newStudentFee);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating student fee: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: Cập nhật học phí
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStudentFee(int id, StudentFeeUpdateDto model)
        {
            try
            {
                var studentFee = await _context.StudentFees
                    .FirstOrDefaultAsync(sf => sf.StudentFeeID == id);

                if (studentFee == null)
                {
                    return NotFound(new { message = "Không tìm thấy học phí sinh viên" });
                }

                // Cập nhật thông tin học phí
                studentFee.DueDate = model.DueDate;
                studentFee.LastUpdated = DateTime.Now;

                // Tính tổng học phí mới
                decimal totalAmount = model.FeeDetails.Sum(fd => fd.Amount);
                studentFee.TotalAmount = totalAmount;

                // Lấy tổng đã thanh toán
                var totalPaid = await _context.Payments
                    .Where(p => p.StudentFeeID == id && p.Status == "Success")
                    .SumAsync(p => p.Amount);

                // Cập nhật trạng thái học phí
                if (totalPaid >= totalAmount)
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

                // Xóa chi tiết học phí cũ
                var existingDetails = await _context.StudentFeeDetails
                    .Where(sfd => sfd.StudentFeeID == id)
                    .ToListAsync();

                _context.StudentFeeDetails.RemoveRange(existingDetails);

                // Thêm chi tiết học phí mới
                foreach (var detail in model.FeeDetails)
                {
                    var feeDetail = new StudentFeeDetail
                    {
                        StudentFeeID = id,
                        FeeCategoryID = detail.FeeCategoryID,
                        Amount = detail.Amount
                    };

                    _context.StudentFeeDetails.Add(feeDetail);
                }

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating student fee: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: Xóa học phí
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStudentFee(int id)
        {
            try
            {
                var studentFee = await _context.StudentFees
                    .FirstOrDefaultAsync(sf => sf.StudentFeeID == id);

                if (studentFee == null)
                {
                    return NotFound(new { message = "Không tìm thấy học phí sinh viên" });
                }

                // Kiểm tra xem có thanh toán nào cho học phí này chưa
                var hasPayments = await _context.Payments
                    .AnyAsync(p => p.StudentFeeID == id);

                if (hasPayments)
                {
                    return BadRequest(new { message = "Không thể xóa học phí đã có thanh toán" });
                }

                // Xóa chi tiết học phí
                var feeDetails = await _context.StudentFeeDetails
                    .Where(sfd => sfd.StudentFeeID == id)
                    .ToListAsync();

                _context.StudentFeeDetails.RemoveRange(feeDetails);

                // Xóa học phí
                _context.StudentFees.Remove(studentFee);

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting student fee: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: Tạo học phí hàng loạt
        [HttpPost("batch")]
        public async Task<ActionResult<BatchFeeResult>> CreateBatchFees(BatchFeeCreateDto model)
        {
            try
            {
                var students = await _context.Students
                    .Include(s => s.User)
                    .Where(s => 
                        (!model.DepartmentID.HasValue || s.DepartmentID == model.DepartmentID) &&
                        (!model.ClassID.HasValue || s.ClassID == model.ClassID))
                    .ToListAsync();

                if (students.Count == 0)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên nào phù hợp với điều kiện" });
                }

                // Lấy cấu trúc học phí
                var feeStructures = await _context.FeeStructures
                    .Include(fs => fs.FeeCategory)
                    .Where(fs => fs.SemesterID == model.SemesterID)
                    .ToListAsync();

                if (feeStructures.Count == 0)
                {
                    return NotFound(new { message = "Không tìm thấy cấu trúc học phí cho học kỳ này" });
                }

                int created = 0;
                int skipped = 0;

                // Tạo học phí cho từng sinh viên
                foreach (var student in students)
                {
                    // Kiểm tra xem đã tồn tại học phí cho sinh viên này trong học kỳ chưa
                    var existingFee = await _context.StudentFees
                        .FirstOrDefaultAsync(sf => sf.StudentID == student.StudentID && sf.SemesterID == model.SemesterID);

                    if (existingFee != null && !model.OverwriteExisting)
                    {
                        skipped++;
                        continue;
                    }

                    // Lấy cấu trúc học phí phù hợp với khoa của sinh viên
                    var departmentFeeStructures = feeStructures
                        .Where(fs => fs.DepartmentID == student.DepartmentID)
                        .ToList();

                    if (departmentFeeStructures.Count == 0)
                    {
                        skipped++;
                        continue;
                    }

                    // Xóa học phí cũ nếu tồn tại và cho phép ghi đè
                    if (existingFee != null)
                    {
                        // Xóa chi tiết học phí cũ
                        var oldFeeDetails = await _context.StudentFeeDetails
                            .Where(sfd => sfd.StudentFeeID == existingFee.StudentFeeID)
                            .ToListAsync();

                        _context.StudentFeeDetails.RemoveRange(oldFeeDetails);

                        // Xóa học phí cũ
                        _context.StudentFees.Remove(existingFee);
                        await _context.SaveChangesAsync();
                    }

                    // Tính tổng học phí
                    decimal totalAmount = departmentFeeStructures.Sum(fs => fs.Amount);

                    // Tạo học phí mới
                    var newStudentFee = new StudentFee
                    {
                        StudentID = student.StudentID,
                        SemesterID = model.SemesterID,
                        TotalAmount = totalAmount,
                        DueDate = model.DueDate,
                        Status = "Unpaid",
                        CreatedDate = DateTime.Now
                    };

                    _context.StudentFees.Add(newStudentFee);
                    await _context.SaveChangesAsync();

                    // Tạo chi tiết học phí
                    foreach (var feeStructure in departmentFeeStructures)
                    {
                        var feeDetail = new StudentFeeDetail
                        {
                            StudentFeeID = newStudentFee.StudentFeeID,
                            FeeCategoryID = feeStructure.FeeCategoryID,
                            Amount = feeStructure.Amount
                        };

                        _context.StudentFeeDetails.Add(feeDetail);
                    }

                    await _context.SaveChangesAsync();
                    created++;
                }

                return new BatchFeeResult
                {
                    TotalStudents = students.Count,
                    Created = created,
                    Skipped = skipped
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating batch fees: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Lấy danh sách học phí của sinh viên theo ID sinh viên
        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<IEnumerable<StudentFeeSummaryDto>>> GetStudentFeesByStudentId(int studentId)
        {
            try
            {
                var student = await _context.Students
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.StudentID == studentId);
                    
                if (student == null)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên" });
                }
                
                var studentFees = await _context.StudentFees
                    .Include(sf => sf.Semester)
                    .Where(sf => sf.StudentID == studentId)
                    .OrderByDescending(sf => sf.Semester.EndDate)
                    .Select(sf => new StudentFeeSummaryDto
                    {
                        StudentFeeID = sf.StudentFeeID,
                        SemesterName = sf.Semester.SemesterName,
                        TotalAmount = sf.TotalAmount,
                        PaidAmount = _context.Payments
                            .Where(p => p.StudentFeeID == sf.StudentFeeID && p.Status == "Success")
                            .Sum(p => p.Amount),
                        DueDate = sf.DueDate,
                        Status = sf.Status
                    })
                    .ToListAsync();
                    
                return studentFees;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting student fees by student ID: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    // DTO Models
    public class StudentFeeDto
    {
        public int StudentFeeID { get; set; }
        public int StudentID { get; set; }
        public string StudentCode { get; set; }
        public string StudentName { get; set; }
        public string ClassName { get; set; }
        public string DepartmentName { get; set; }
        public int SemesterID { get; set; }
        public string SemesterName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class FeeDetailDto
    {
        public int StudentFeeDetailID { get; set; }
        public int FeeCategoryID { get; set; }
        public string CategoryName { get; set; }
        public decimal Amount { get; set; }
    }

    public class PaymentDto
    {
        public int PaymentID { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethodName { get; set; }
        public string TransactionID { get; set; }
        public string Status { get; set; }
    }

    public class StudentInfoDto
    {
        public int StudentID { get; set; }
        public string StudentCode { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string FullName { get; set; }
        public string ClassName { get; set; }
        public string DepartmentName { get; set; }
        public int EnrollmentYear { get; set; }
        public int? CurrentSemester { get; set; }
    }

    public class StudentFeeDetailDto
    {
        public StudentFeeDto StudentFee { get; set; }
        public StudentInfoDto StudentInfo { get; set; }
        public List<FeeDetailDto> FeeDetails { get; set; }
        public List<PaymentDto> Payments { get; set; }
    }

    public class StudentFeeCreateDto
    {
        public int StudentID { get; set; }
        public int SemesterID { get; set; }
        public DateTime DueDate { get; set; }
        public List<FeeDetailCreateDto> FeeDetails { get; set; }
    }

    public class StudentFeeUpdateDto
    {
        public DateTime DueDate { get; set; }
        public List<FeeDetailCreateDto> FeeDetails { get; set; }
    }

    public class FeeDetailCreateDto
    {
        public int FeeCategoryID { get; set; }
        public decimal Amount { get; set; }
    }

    public class BatchFeeCreateDto
    {
        public int SemesterID { get; set; }
        public int? DepartmentID { get; set; }
        public int? ClassID { get; set; }
        public DateTime DueDate { get; set; }
        public bool OverwriteExisting { get; set; }
    }

    public class BatchFeeResult
    {
        public int TotalStudents { get; set; }
        public int Created { get; set; }
        public int Skipped { get; set; }
    }

    public class PagedResponse<T>
    {
        public List<T> Items { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    public class StudentFeeSummaryDto
    {
        public int StudentFeeID { get; set; }
        public string SemesterName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; }
    }
} 