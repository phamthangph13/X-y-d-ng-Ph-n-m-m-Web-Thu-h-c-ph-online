using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProject.Models;
using WebProject.Models.Entities;

namespace WebProject.Controllers.StudentTuition
{
    [Route("api/[controller]")]
    [ApiController]
    public class StudentTuitionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StudentTuitionController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/StudentTuition/GetStudentFees/{userId}
        [HttpGet("GetStudentFees/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetStudentFees(int userId)
        {
            try
            {
                var studentFees = await _context.StudentFees
                    .Include(sf => sf.Semester)
                    .Include(sf => sf.StudentFeeDetails)
                        .ThenInclude(sfd => sfd.FeeCategory)
                    .Include(sf => sf.Payments)
                        .ThenInclude(p => p.PaymentMethod)
                    .Where(sf => sf.Student.UserID == userId)
                    .OrderByDescending(sf => sf.Semester.StartDate)
                    .ToListAsync();

                if (studentFees == null || !studentFees.Any())
                {
                    // Trả về mảng trống thay vì NotFound
                    return Ok(new List<object>());
                }

                // Chuyển đổi sang DTO để tránh vòng lặp tham chiếu
                var result = studentFees.Select(sf => new
                {
                    sf.StudentFeeID,
                    sf.StudentID,
                    sf.SemesterID,
                    sf.TotalAmount,
                    sf.DueDate,
                    sf.Status,
                    sf.CreatedDate,
                    sf.LastUpdated,
                    Semester = new
                    {
                        sf.Semester.SemesterID,
                        sf.Semester.SemesterName,
                        sf.Semester.StartDate,
                        sf.Semester.EndDate,
                        sf.Semester.AcademicYear,
                        sf.Semester.IsActive
                    },
                    StudentFeeDetails = sf.StudentFeeDetails.Select(sfd => new
                    {
                        sfd.StudentFeeDetailID,
                        sfd.StudentFeeID,
                        sfd.FeeCategoryID,
                        sfd.Amount,
                        FeeCategory = new
                        {
                            sfd.FeeCategory.FeeCategoryID,
                            sfd.FeeCategory.CategoryName,
                            sfd.FeeCategory.Description,
                            sfd.FeeCategory.IsActive
                        }
                    }).ToList(),
                    Payments = sf.Payments.Select(p => new
                    {
                        p.PaymentID,
                        p.StudentFeeID,
                        p.PaymentMethodID,
                        p.Amount,
                        p.TransactionID,
                        p.PaymentDate,
                        p.Status,
                        p.PaymentReference,
                        PaymentMethod = new
                        {
                            p.PaymentMethod.PaymentMethodID,
                            p.PaymentMethod.MethodName,
                            p.PaymentMethod.Description,
                            p.PaymentMethod.IsActive
                        }
                    }).ToList()
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: api/StudentTuition/GetFeeDetails/{studentFeeId}
        [HttpGet("GetFeeDetails/{studentFeeId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetFeeDetails(int studentFeeId)
        {
            var feeDetails = await _context.StudentFeeDetails
                .Include(sfd => sfd.FeeCategory)
                .Where(sfd => sfd.StudentFeeID == studentFeeId)
                .ToListAsync();

            if (feeDetails == null || !feeDetails.Any())
            {
                // Trả về mảng trống thay vì NotFound
                return Ok(new { message = "No fee details found for this fee record.", values = new object[] { } });
            }

            // Chuyển đổi sang DTO để tránh vòng lặp tham chiếu
            var result = feeDetails.Select(sfd => new
            {
                sfd.StudentFeeDetailID,
                sfd.StudentFeeID,
                sfd.FeeCategoryID,
                sfd.Amount,
                FeeCategory = new
                {
                    sfd.FeeCategory.FeeCategoryID,
                    sfd.FeeCategory.CategoryName,
                    sfd.FeeCategory.Description,
                    sfd.FeeCategory.IsActive
                }
            }).ToList();

            return Ok(result);
        }

        // GET: api/StudentTuition/GetPaymentHistory/{userId}
        [HttpGet("GetPaymentHistory/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetPaymentHistory(int userId)
        {
            var payments = await _context.Payments
                .Include(p => p.PaymentMethod)
                .Include(p => p.StudentFee)
                    .ThenInclude(sf => sf.Semester)
                .Where(p => p.StudentFee.Student.UserID == userId)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            if (payments == null || !payments.Any())
            {
                // Trả về mảng trống thay vì NotFound
                return Ok(new { message = "No payment history found for this student.", values = new object[] { } });
            }

            // Chuyển đổi sang DTO để tránh vòng lặp tham chiếu
            var result = payments.Select(p => new
            {
                p.PaymentID,
                p.StudentFeeID,
                p.PaymentMethodID,
                p.Amount,
                p.TransactionID,
                p.PaymentDate,
                p.Status,
                p.PaymentReference,
                PaymentMethod = new
                {
                    p.PaymentMethod.PaymentMethodID,
                    p.PaymentMethod.MethodName,
                    p.PaymentMethod.Description,
                    p.PaymentMethod.IsActive
                },
                StudentFee = new
                {
                    p.StudentFee.StudentFeeID,
                    p.StudentFee.StudentID,
                    p.StudentFee.SemesterID,
                    p.StudentFee.TotalAmount,
                    p.StudentFee.Status,
                    Semester = new
                    {
                        p.StudentFee.Semester.SemesterID,
                        p.StudentFee.Semester.SemesterName,
                        p.StudentFee.Semester.AcademicYear
                    }
                }
            }).ToList();

            return Ok(result);
        }

        // GET: api/StudentTuition/GetCurrentSemesterFees/{userId}
        [HttpGet("GetCurrentSemesterFees/{userId}")]
        public async Task<ActionResult<object>> GetCurrentSemesterFees(int userId)
        {
            // Get the current active semester
            var currentSemester = await _context.Semesters
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();

            if (currentSemester == null)
            {
                // Trả về dữ liệu trống thay vì NotFound
                return Ok(new { message = "No active semester found." });
            }

            // Get the student's fees for the current semester
            var studentFee = await _context.StudentFees
                .Include(sf => sf.Semester)
                .Include(sf => sf.StudentFeeDetails)
                    .ThenInclude(sfd => sfd.FeeCategory)
                .Include(sf => sf.Payments)
                .Where(sf => sf.Student.UserID == userId && sf.SemesterID == currentSemester.SemesterID)
                .FirstOrDefaultAsync();

            if (studentFee == null)
            {
                // Trả về dữ liệu trống thay vì NotFound
                return Ok(new { 
                    message = "No fee record found for the current semester.",
                    semester = new {
                        currentSemester.SemesterID,
                        currentSemester.SemesterName,
                        currentSemester.StartDate,
                        currentSemester.EndDate,
                        currentSemester.AcademicYear,
                        currentSemester.IsActive
                    }
                });
            }

            // Chuyển đổi sang DTO để tránh vòng lặp tham chiếu
            var result = new
            {
                studentFee.StudentFeeID,
                studentFee.StudentID,
                studentFee.SemesterID,
                studentFee.TotalAmount,
                studentFee.DueDate,
                studentFee.Status,
                studentFee.CreatedDate,
                studentFee.LastUpdated,
                Semester = new
                {
                    studentFee.Semester.SemesterID,
                    studentFee.Semester.SemesterName,
                    studentFee.Semester.StartDate,
                    studentFee.Semester.EndDate,
                    studentFee.Semester.AcademicYear,
                    studentFee.Semester.IsActive
                },
                StudentFeeDetails = studentFee.StudentFeeDetails.Select(sfd => new
                {
                    sfd.StudentFeeDetailID,
                    sfd.StudentFeeID,
                    sfd.FeeCategoryID,
                    sfd.Amount,
                    FeeCategory = new
                    {
                        sfd.FeeCategory.FeeCategoryID,
                        sfd.FeeCategory.CategoryName,
                        sfd.FeeCategory.Description,
                        sfd.FeeCategory.IsActive
                    }
                }).ToList(),
                Payments = studentFee.Payments.Select(p => new
                {
                    p.PaymentID,
                    p.StudentFeeID,
                    p.PaymentMethodID,
                    p.Amount,
                    p.TransactionID,
                    p.PaymentDate,
                    p.Status,
                    p.PaymentReference
                }).ToList()
            };

            return Ok(result);
        }

        // GET: api/StudentTuition/GetUnpaidFees/{userId}
        [HttpGet("GetUnpaidFees/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUnpaidFees(int userId)
        {
            var unpaidFees = await _context.StudentFees
                .Include(sf => sf.Semester)
                .Include(sf => sf.StudentFeeDetails)
                    .ThenInclude(sfd => sfd.FeeCategory)
                .Where(sf => sf.Student.UserID == userId && sf.Status != "Paid")
                .OrderByDescending(sf => sf.DueDate)
                .ToListAsync();

            if (unpaidFees == null || !unpaidFees.Any())
            {
                // Trả về mảng trống thay vì NotFound
                return Ok(new { message = "No unpaid fees found for this student.", values = new object[] { } });
            }

            // Chuyển đổi sang DTO để tránh vòng lặp tham chiếu
            var result = unpaidFees.Select(sf => new
            {
                sf.StudentFeeID,
                sf.StudentID,
                sf.SemesterID,
                sf.TotalAmount,
                sf.DueDate,
                sf.Status,
                sf.CreatedDate,
                sf.LastUpdated,
                Semester = new
                {
                    sf.Semester.SemesterID,
                    sf.Semester.SemesterName,
                    sf.Semester.StartDate,
                    sf.Semester.EndDate,
                    sf.Semester.AcademicYear,
                    sf.Semester.IsActive
                },
                StudentFeeDetails = sf.StudentFeeDetails.Select(sfd => new
                {
                    sfd.StudentFeeDetailID,
                    sfd.StudentFeeID,
                    sfd.FeeCategoryID,
                    sfd.Amount,
                    FeeCategory = new
                    {
                        sfd.FeeCategory.FeeCategoryID,
                        sfd.FeeCategory.CategoryName,
                        sfd.FeeCategory.Description,
                        sfd.FeeCategory.IsActive
                    }
                }).ToList()
            }).ToList();

            return Ok(result);
        }

        // GET: api/StudentTuition/Test
        [HttpGet("Test")]
        public ActionResult<object> Test()
        {
            try
            {
                return Ok(new { 
                    message = "StudentTuitionController is working!",
                    timestamp = DateTime.Now,
                    version = "1.0.1",
                    status = "OK"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: api/StudentTuition/CheckData
        [HttpGet("CheckData")]
        public async Task<ActionResult<object>> CheckData()
        {
            try
            {
                // Count records in main tables
                var studentCount = await _context.Students.CountAsync();
                var semesterCount = await _context.Semesters.CountAsync();
                var studentFeesCount = await _context.StudentFees.CountAsync();
                var studentFeeDetailsCount = await _context.StudentFeeDetails.CountAsync();
                var feeCategoriesCount = await _context.FeeCategories.CountAsync();
                var paymentsCount = await _context.Payments.CountAsync();
                
                return Ok(new
                {
                    studentCount,
                    semesterCount,
                    studentFeesCount,
                    studentFeeDetailsCount,
                    feeCategoriesCount,
                    paymentsCount,
                    timestamp = DateTime.Now,
                    status = "OK"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }
    }
} 