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
        public async Task<ActionResult<IEnumerable<DepartmentDto>>> GetDepartments()
        {
            try
            {
                var departments = await _context.Departments
                    .Select(d => new DepartmentDto
                    {
                        DepartmentID = d.DepartmentID,
                        DepartmentName = d.DepartmentName,
                        DepartmentCode = d.DepartmentCode
                    })
                    .ToListAsync();

                return departments;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting departments: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/departments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DepartmentDto>> GetDepartment(int id)
        {
            try
            {
                var department = await _context.Departments
                    .Where(d => d.DepartmentID == id)
                    .Select(d => new DepartmentDto
                    {
                        DepartmentID = d.DepartmentID,
                        DepartmentName = d.DepartmentName,
                        DepartmentCode = d.DepartmentCode
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

        // Other methods...
    }

    public class DepartmentDto
    {
        public int DepartmentID { get; set; }
        public string DepartmentName { get; set; }
        public string DepartmentCode { get; set; }
    }
} 