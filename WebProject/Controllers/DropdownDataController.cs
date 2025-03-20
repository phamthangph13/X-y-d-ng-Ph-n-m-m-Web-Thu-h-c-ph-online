using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;
using Microsoft.Extensions.Logging;

namespace WebProject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DropdownDataController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DropdownDataController> _logger;

        public DropdownDataController(ApplicationDbContext context, ILogger<DropdownDataController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/dropdowndata/departments
        [HttpGet("departments")]
        public async Task<ActionResult<IEnumerable<object>>> GetDepartments()
        {
            try
            {
                _logger.LogInformation("GetDepartments: Attempting to fetch departments");
                
                var departments = await _context.Departments
                    .Select(d => new { d.DepartmentID, d.DepartmentName, d.DepartmentCode })
                    .ToListAsync();

                _logger.LogInformation($"GetDepartments: Successfully fetched {departments.Count} departments");

                if (departments.Count == 0)
                {
                    _logger.LogWarning("GetDepartments: No departments found in the database");
                }

                return Ok(departments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDepartments: Error fetching departments");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: api/dropdowndata/classes
        [HttpGet("classes")]
        public async Task<ActionResult<IEnumerable<object>>> GetClasses(int? departmentId = null)
        {
            try
            {
                _logger.LogInformation($"GetClasses: Attempting to fetch classes. DepartmentId filter: {departmentId}");
                
                var query = _context.Classes.AsQueryable();

                if (departmentId.HasValue)
                {
                    query = query.Where(c => c.DepartmentID == departmentId.Value);
                    _logger.LogInformation($"GetClasses: Filtering by department ID {departmentId}");
                }

                var classes = await query
                    .Select(c => new { c.ClassID, c.ClassName, c.ClassCode, c.DepartmentID })
                    .ToListAsync();

                _logger.LogInformation($"GetClasses: Successfully fetched {classes.Count} classes");

                if (classes.Count == 0)
                {
                    _logger.LogWarning($"GetClasses: No classes found for department ID {departmentId}");
                }

                return Ok(classes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"GetClasses: Error fetching classes for departmentId {departmentId}");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: api/dropdowndata/enrollment-years
        [HttpGet("enrollment-years")]
        public ActionResult<IEnumerable<int>> GetEnrollmentYears()
        {
            try
            {
                _logger.LogInformation("GetEnrollmentYears: Generating enrollment years");
                
                // Generate a list of enrollment years (current year and previous 10 years)
                var currentYear = DateTime.Now.Year;
                var years = Enumerable.Range(currentYear - 10, 11).OrderByDescending(y => y).ToList();
                
                _logger.LogInformation($"GetEnrollmentYears: Successfully generated {years.Count} years from {years.Last()} to {years.First()}");
                
                return Ok(years);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetEnrollmentYears: Error generating enrollment years");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: Lấy danh sách sinh viên có học phí chưa thanh toán hết
        [HttpGet("students-with-fees")]
        public async Task<ActionResult<IEnumerable<StudentWithFeeDto>>> GetStudentsWithFees()
        {
            try
            {
                var students = await _context.Students
                    .Include(s => s.User)
                    .Include(s => s.StudentFees.Where(sf => sf.Status != "Paid"))
                    .Where(s => s.StudentFees.Any(sf => sf.Status != "Paid"))
                    .Select(s => new StudentWithFeeDto
                    {
                        StudentId = s.StudentID,
                        StudentCode = s.StudentCode,
                        StudentName = s.User.FullName
                    })
                    .ToListAsync();

                return students;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting students with fees: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: Lấy danh sách học kỳ cho dropdown
        [HttpGet("semesters")]
        public async Task<ActionResult<IEnumerable<DropdownSemesterDto>>> GetSemesters()
        {
            try
            {
                _logger.LogInformation("GetSemesters: Attempting to fetch semesters");
                
                var semesters = await _context.Semesters
                    .OrderByDescending(s => s.EndDate)
                    .Select(s => new DropdownSemesterDto
                    {
                        SemesterID = s.SemesterID,
                        SemesterName = s.SemesterName,
                        IsActive = s.IsActive
                    })
                    .ToListAsync();

                _logger.LogInformation($"GetSemesters: Successfully fetched {semesters.Count} semesters");

                return semesters;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetSemesters: Error fetching semesters");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
    }

    public class StudentWithFeeDto
    {
        public int StudentId { get; set; }
        public string StudentCode { get; set; }
        public string StudentName { get; set; }
    }

    public class DropdownSemesterDto
    {
        public int SemesterID { get; set; }
        public string SemesterName { get; set; }
        public bool IsActive { get; set; }
    }
} 