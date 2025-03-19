using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Collections.Generic;
using WebProject.Models.Entities;
using WebProject.Models;

namespace WebProject.Controllers
{
    [ApiController]
    [Route("api/departments")]
    public class DepartmentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DepartmentController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Department>>> GetDepartments()
        {
            try
            {
                var departments = await _context.Departments.ToListAsync();
                Console.WriteLine($"Returned {departments.Count} departments");
                return departments;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting departments: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
} 