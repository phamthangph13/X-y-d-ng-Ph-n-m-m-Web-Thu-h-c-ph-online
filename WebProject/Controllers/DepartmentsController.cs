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
    [Route("api/departments")]
    [ApiController]
    public class DepartmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DepartmentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/departments
        [HttpGet]
        public async Task<ActionResult<PagedResult<DepartmentViewModel>>> GetDepartments(
            [FromQuery] string departmentCode = null,
            [FromQuery] string name = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var query = _context.Departments.AsQueryable();

                // Apply filters
                if (!string.IsNullOrEmpty(departmentCode))
                {
                    query = query.Where(d => d.DepartmentCode.Contains(departmentCode));
                }

                if (!string.IsNullOrEmpty(name))
                {
                    query = query.Where(d => d.DepartmentName.Contains(name));
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination
                var departments = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(d => new DepartmentViewModel
                    {
                        DepartmentID = d.DepartmentID,
                        DepartmentName = d.DepartmentName,
                        DepartmentCode = d.DepartmentCode,
                        ClassCount = d.Classes.Count,
                        StudentCount = d.Students.Count,
                        // Additional fields would be added here if you extend the Department entity
                        Head = "N/A", // Replace with actual field if available
                        FoundingDate = null, // Replace with actual field if available
                        IsActive = true // Replace with actual field if available
                    })
                    .ToListAsync();

                // Create paged result
                var result = new PagedResult<DepartmentViewModel>
                {
                    Items = departments,
                    TotalCount = totalCount,
                    PageSize = pageSize,
                    CurrentPage = page,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting departments: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/departments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DepartmentViewModel>> GetDepartment(int id)
        {
            try
            {
                var department = await _context.Departments
                    .Where(d => d.DepartmentID == id)
                    .Select(d => new DepartmentViewModel
                    {
                        DepartmentID = d.DepartmentID,
                        DepartmentName = d.DepartmentName,
                        DepartmentCode = d.DepartmentCode,
                        ClassCount = d.Classes.Count,
                        StudentCount = d.Students.Count,
                        // Additional fields would be added here if you extend the Department entity
                        Head = "N/A", // Replace with actual field if available
                        FoundingDate = null, // Replace with actual field if available
                        IsActive = true // Replace with actual field if available
                    })
                    .FirstOrDefaultAsync();

                if (department == null)
                {
                    return NotFound();
                }

                return department;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting department: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/departments
        [HttpPost]
        public async Task<ActionResult<DepartmentViewModel>> CreateDepartment(CreateDepartmentDto dto)
        {
            try
            {
                // Check if department code already exists
                var existingDepartment = await _context.Departments
                    .FirstOrDefaultAsync(d => d.DepartmentCode == dto.DepartmentCode);

                if (existingDepartment != null)
                {
                    return Conflict(new { message = "Mã khoa đã tồn tại" });
                }

                var department = new Department
                {
                    DepartmentName = dto.DepartmentName,
                    DepartmentCode = dto.DepartmentCode
                };

                _context.Departments.Add(department);
                await _context.SaveChangesAsync();

                var result = new DepartmentViewModel
                {
                    DepartmentID = department.DepartmentID,
                    DepartmentName = department.DepartmentName,
                    DepartmentCode = department.DepartmentCode,
                    ClassCount = 0,
                    StudentCount = 0,
                    Head = dto.Head,
                    FoundingDate = dto.FoundingDate,
                    IsActive = dto.IsActive
                };

                return CreatedAtAction(nameof(GetDepartment), new { id = department.DepartmentID }, result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating department: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/departments/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDepartment(int id, UpdateDepartmentDto dto)
        {
            try
            {
                var department = await _context.Departments.FindAsync(id);
                if (department == null)
                {
                    return NotFound();
                }

                // Check if department code already exists (if it was changed)
                if (department.DepartmentCode != dto.DepartmentCode)
                {
                    var existingDepartment = await _context.Departments
                        .FirstOrDefaultAsync(d => d.DepartmentCode == dto.DepartmentCode);

                    if (existingDepartment != null)
                    {
                        return Conflict(new { message = "Mã khoa đã tồn tại" });
                    }
                }

                department.DepartmentName = dto.DepartmentName;
                department.DepartmentCode = dto.DepartmentCode;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating department: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/departments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDepartment(int id)
        {
            try
            {
                var department = await _context.Departments.FindAsync(id);
                if (department == null)
                {
                    return NotFound();
                }

                // Check if department has any classes
                var hasClasses = await _context.Classes.AnyAsync(c => c.DepartmentID == id);
                if (hasClasses)
                {
                    return BadRequest(new { message = "Không thể xóa khoa vì có lớp học liên quan" });
                }

                // Check if department has any students
                var hasStudents = await _context.Students.AnyAsync(s => s.DepartmentID == id);
                if (hasStudents)
                {
                    return BadRequest(new { message = "Không thể xóa khoa vì có sinh viên liên quan" });
                }

                _context.Departments.Remove(department);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting department: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class DepartmentViewModel
    {
        public int DepartmentID { get; set; }
        public string DepartmentName { get; set; }
        public string DepartmentCode { get; set; }
        public int ClassCount { get; set; }
        public int StudentCount { get; set; }
        public string Head { get; set; }
        public DateTime? FoundingDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateDepartmentDto
    {
        public string DepartmentName { get; set; }
        public string DepartmentCode { get; set; }
        public string Head { get; set; }
        public DateTime? FoundingDate { get; set; }
        public bool IsActive { get; set; }
        public string Description { get; set; }
    }

    public class UpdateDepartmentDto
    {
        public string DepartmentName { get; set; }
        public string DepartmentCode { get; set; }
        public string Head { get; set; }
        public DateTime? FoundingDate { get; set; }
        public bool IsActive { get; set; }
        public string Description { get; set; }
    }
} 