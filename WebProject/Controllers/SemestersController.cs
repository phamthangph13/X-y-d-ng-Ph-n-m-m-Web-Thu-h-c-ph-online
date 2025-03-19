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
    [Route("api/semesters")]
    [ApiController]
    public class SemestersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SemestersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/semesters
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SemesterDto>>> GetSemesters()
        {
            try
            {
                var semesters = await _context.Semesters
                    .Select(s => new SemesterDto
                    {
                        SemesterID = s.SemesterID,
                        SemesterName = s.SemesterName,
                        StartDate = s.StartDate,
                        EndDate = s.EndDate,
                        AcademicYear = s.AcademicYear,
                        IsActive = s.IsActive
                    })
                    .ToListAsync();

                return semesters;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting semesters: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/semesters/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SemesterDto>> GetSemester(int id)
        {
            try
            {
                var semester = await _context.Semesters
                    .Where(s => s.SemesterID == id)
                    .Select(s => new SemesterDto
                    {
                        SemesterID = s.SemesterID,
                        SemesterName = s.SemesterName,
                        StartDate = s.StartDate,
                        EndDate = s.EndDate,
                        AcademicYear = s.AcademicYear,
                        IsActive = s.IsActive
                    })
                    .FirstOrDefaultAsync();

                if (semester == null)
                {
                    return NotFound();
                }

                return semester;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting semester: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // Other methods...
    }

    public class SemesterDto
    {
        public int SemesterID { get; set; }
        public string SemesterName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string AcademicYear { get; set; }
        public bool IsActive { get; set; }
    }
} 