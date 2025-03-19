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
        public async Task<ActionResult<IEnumerable<ClassDto>>> GetClasses([FromQuery] int? departmentId)
        {
            try
            {
                var query = _context.Classes.AsQueryable();

                if (departmentId.HasValue)
                {
                    query = query.Where(c => c.DepartmentID == departmentId.Value);
                }

                var classes = await query
                    .Include(c => c.Department)
                    .Select(c => new ClassDto
                    {
                        ClassID = c.ClassID,
                        ClassName = c.ClassName,
                        ClassCode = c.ClassCode,
                        DepartmentID = c.DepartmentID,
                        DepartmentName = c.Department.DepartmentName
                    })
                    .ToListAsync();

                return classes;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting classes: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/classes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClassDto>> GetClass(int id)
        {
            try
            {
                var classEntity = await _context.Classes
                    .Include(c => c.Department)
                    .Where(c => c.ClassID == id)
                    .Select(c => new ClassDto
                    {
                        ClassID = c.ClassID,
                        ClassName = c.ClassName,
                        ClassCode = c.ClassCode,
                        DepartmentID = c.DepartmentID,
                        DepartmentName = c.Department.DepartmentName
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
        public async Task<ActionResult<IEnumerable<ClassDto>>> GetClassesByDepartment(int departmentId)
        {
            try
            {
                var classes = await _context.Classes
                    .Include(c => c.Department)
                    .Where(c => c.DepartmentID == departmentId)
                    .Select(c => new ClassDto
                    {
                        ClassID = c.ClassID,
                        ClassName = c.ClassName,
                        ClassCode = c.ClassCode,
                        DepartmentID = c.DepartmentID,
                        DepartmentName = c.Department.DepartmentName
                    })
                    .ToListAsync();

                if (classes.Count == 0)
                {
                    return new List<ClassDto>();
                }

                return classes;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting classes by department: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // Other methods...
    }

    public class ClassDto
    {
        public int ClassID { get; set; }
        public string ClassName { get; set; }
        public string ClassCode { get; set; }
        public int DepartmentID { get; set; }
        public string DepartmentName { get; set; }
    }
} 