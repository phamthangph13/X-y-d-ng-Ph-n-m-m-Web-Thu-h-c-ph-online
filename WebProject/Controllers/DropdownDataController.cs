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
    [Route("api/[controller]")]
    [ApiController]
    public class DropdownDataController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DropdownDataController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/dropdowndata/departments
        [HttpGet("departments")]
        public async Task<ActionResult<IEnumerable<object>>> GetDepartments()
        {
            try
            {
                var departments = await _context.Departments
                    .Select(d => new { d.DepartmentID, d.DepartmentName, d.DepartmentCode })
                    .ToListAsync();

                return Ok(departments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: api/dropdowndata/classes
        [HttpGet("classes")]
        public async Task<ActionResult<IEnumerable<object>>> GetClasses(int? departmentId = null)
        {
            try
            {
                var query = _context.Classes.AsQueryable();

                if (departmentId.HasValue)
                {
                    query = query.Where(c => c.DepartmentID == departmentId.Value);
                }

                var classes = await query
                    .Select(c => new { c.ClassID, c.ClassName, c.ClassCode, c.DepartmentID })
                    .ToListAsync();

                return Ok(classes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: api/dropdowndata/enrollment-years
        [HttpGet("enrollment-years")]
        public ActionResult<IEnumerable<int>> GetEnrollmentYears()
        {
            try
            {
                // Generate a list of enrollment years (current year and previous 10 years)
                var currentYear = DateTime.Now.Year;
                var years = Enumerable.Range(currentYear - 10, 11).OrderByDescending(y => y).ToList();

                return Ok(years);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
    }
} 