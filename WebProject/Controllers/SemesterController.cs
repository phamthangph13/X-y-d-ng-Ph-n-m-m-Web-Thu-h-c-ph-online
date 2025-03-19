using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using WebProject.Models.Entities;
using WebProject.Models;

namespace WebProject.Controllers
{
    [ApiController]
    [Route("api/semesters")]
    public class SemesterController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SemesterController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Semester>>> GetSemesters()
        {
            try
            {
                // Trả về tất cả học kỳ, không lọc theo IsActive
                var semesters = await _context.Semesters.ToListAsync();
                Console.WriteLine($"Returned {semesters.Count} semesters");
                return semesters;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting semesters: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
} 