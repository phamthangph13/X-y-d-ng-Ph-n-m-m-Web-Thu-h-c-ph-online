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
    [Route("api/classes")]
    [ApiController]
    public class ClassesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ClassesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/classes
        [HttpGet]
        public async Task<ActionResult<PagedResult<ClassViewModel>>> GetClasses(
            [FromQuery] string classCode = null,
            [FromQuery] string className = null,
            [FromQuery] int? departmentId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var query = _context.Classes.AsQueryable();

                // Apply filters
                if (!string.IsNullOrEmpty(classCode))
                {
                    query = query.Where(c => c.ClassCode.Contains(classCode));
                }

                if (!string.IsNullOrEmpty(className))
                {
                    query = query.Where(c => c.ClassName.Contains(className));
                }

                if (departmentId.HasValue)
                {
                    query = query.Where(c => c.DepartmentID == departmentId.Value);
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination
                var classes = await query
                    .Include(c => c.Department)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(c => new ClassViewModel
                    {
                        ClassID = c.ClassID,
                        ClassName = c.ClassName,
                        ClassCode = c.ClassCode,
                        DepartmentID = c.DepartmentID,
                        DepartmentName = c.Department.DepartmentName,
                        StudentCount = c.Students.Count,
                        Teacher = "N/A", // Replace with actual field if available
                        StartYear = null, // Replace with actual field if available
                        IsActive = true // Replace with actual field if available
                    })
                    .ToListAsync();

                // Create paged result
                var result = new PagedResult<ClassViewModel>
                {
                    Items = classes,
                    TotalCount = totalCount,
                    PageSize = pageSize,
                    CurrentPage = page,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting classes: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/classes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClassViewModel>> GetClass(int id)
        {
            try
            {
                var classEntity = await _context.Classes
                    .Include(c => c.Department)
                    .Where(c => c.ClassID == id)
                    .Select(c => new ClassViewModel
                    {
                        ClassID = c.ClassID,
                        ClassName = c.ClassName,
                        ClassCode = c.ClassCode,
                        DepartmentID = c.DepartmentID,
                        DepartmentName = c.Department.DepartmentName,
                        StudentCount = c.Students.Count,
                        Teacher = "N/A", // Replace with actual field if available
                        StartYear = null, // Replace with actual field if available
                        IsActive = true // Replace with actual field if available
                    })
                    .FirstOrDefaultAsync();

                if (classEntity == null)
                {
                    return NotFound();
                }

                return classEntity;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting class: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/classes/by-department/{departmentId}
        [HttpGet("by-department/{departmentId}")]
        public async Task<ActionResult<PagedResult<ClassViewModel>>> GetClassesByDepartment(
            int departmentId, 
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var query = _context.Classes
                    .Include(c => c.Department)
                    .Where(c => c.DepartmentID == departmentId);

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination
                var classes = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(c => new ClassViewModel
                    {
                        ClassID = c.ClassID,
                        ClassName = c.ClassName,
                        ClassCode = c.ClassCode,
                        DepartmentID = c.DepartmentID,
                        DepartmentName = c.Department.DepartmentName,
                        StudentCount = c.Students.Count,
                        Teacher = "N/A", // Replace with actual field if available
                        StartYear = null, // Replace with actual field if available
                        IsActive = true // Replace with actual field if available
                    })
                    .ToListAsync();

                // Create paged result
                var result = new PagedResult<ClassViewModel>
                {
                    Items = classes,
                    TotalCount = totalCount,
                    PageSize = pageSize,
                    CurrentPage = page,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting classes by department: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/classes
        [HttpPost]
        public async Task<ActionResult<ClassViewModel>> CreateClass(CreateClassDto dto)
        {
            try
            {
                // Check if class code already exists
                var existingClass = await _context.Classes
                    .FirstOrDefaultAsync(c => c.ClassCode == dto.ClassCode);

                if (existingClass != null)
                {
                    return Conflict(new { message = "Mã lớp đã tồn tại" });
                }

                // Check if department exists
                var department = await _context.Departments.FindAsync(dto.DepartmentID);
                if (department == null)
                {
                    return BadRequest(new { message = "Khoa không tồn tại" });
                }

                var classEntity = new Class
                {
                    ClassName = dto.ClassName,
                    ClassCode = dto.ClassCode,
                    DepartmentID = dto.DepartmentID
                };

                _context.Classes.Add(classEntity);
                await _context.SaveChangesAsync();

                var result = new ClassViewModel
                {
                    ClassID = classEntity.ClassID,
                    ClassName = classEntity.ClassName,
                    ClassCode = classEntity.ClassCode,
                    DepartmentID = classEntity.DepartmentID,
                    DepartmentName = department.DepartmentName,
                    StudentCount = 0,
                    Teacher = dto.Teacher,
                    StartYear = dto.StartYear,
                    IsActive = dto.IsActive
                };

                return CreatedAtAction(nameof(GetClass), new { id = classEntity.ClassID }, result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating class: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/classes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateClass(int id, UpdateClassDto dto)
        {
            try
            {
                var classEntity = await _context.Classes.FindAsync(id);
                if (classEntity == null)
                {
                    return NotFound();
                }

                // Check if class code already exists (if it was changed)
                if (classEntity.ClassCode != dto.ClassCode)
                {
                    var existingClass = await _context.Classes
                        .FirstOrDefaultAsync(c => c.ClassCode == dto.ClassCode);

                    if (existingClass != null)
                    {
                        return Conflict(new { message = "Mã lớp đã tồn tại" });
                    }
                }

                // Check if department exists
                if (classEntity.DepartmentID != dto.DepartmentID)
                {
                    var department = await _context.Departments.FindAsync(dto.DepartmentID);
                    if (department == null)
                    {
                        return BadRequest(new { message = "Khoa không tồn tại" });
                    }
                }

                classEntity.ClassName = dto.ClassName;
                classEntity.ClassCode = dto.ClassCode;
                classEntity.DepartmentID = dto.DepartmentID;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating class: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/classes/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteClass(int id)
        {
            try
            {
                var classEntity = await _context.Classes.FindAsync(id);
                if (classEntity == null)
                {
                    return NotFound();
                }

                // Check if class has any students
                var hasStudents = await _context.Students.AnyAsync(s => s.ClassID == id);
                if (hasStudents)
                {
                    return BadRequest(new { message = "Không thể xóa lớp vì có sinh viên liên quan" });
                }

                _context.Classes.Remove(classEntity);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting class: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class ClassViewModel
    {
        public int ClassID { get; set; }
        public string ClassName { get; set; }
        public string ClassCode { get; set; }
        public int DepartmentID { get; set; }
        public string DepartmentName { get; set; }
        public int StudentCount { get; set; }
        public string Teacher { get; set; }
        public int? StartYear { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateClassDto
    {
        public string ClassName { get; set; }
        public string ClassCode { get; set; }
        public int DepartmentID { get; set; }
        public string Teacher { get; set; }
        public int? StartYear { get; set; }
        public int? MaxStudents { get; set; }
        public bool IsActive { get; set; }
        public string Description { get; set; }
    }

    public class UpdateClassDto
    {
        public string ClassName { get; set; }
        public string ClassCode { get; set; }
        public int DepartmentID { get; set; }
        public string Teacher { get; set; }
        public int? StartYear { get; set; }
        public int? MaxStudents { get; set; }
        public bool IsActive { get; set; }
        public string Description { get; set; }
    }
} 