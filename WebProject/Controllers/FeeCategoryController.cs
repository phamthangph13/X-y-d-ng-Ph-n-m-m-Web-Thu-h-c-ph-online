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
    [Route("api/fee-categories")]
    public class FeeCategoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public FeeCategoryController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FeeCategory>>> GetFeeCategories()
        {
            try
            {
                var categories = await _context.FeeCategories.ToListAsync();
                Console.WriteLine($"Returned {categories.Count} fee categories");
                return categories;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting fee categories: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FeeCategory>> GetFeeCategory(int id)
        {
            var feeCategory = await _context.FeeCategories.FindAsync(id);
            if (feeCategory == null)
                return NotFound();
            return feeCategory;
        }

        [HttpPost]
        public async Task<ActionResult<FeeCategory>> CreateFeeCategory(FeeCategory feeCategory)
        {
            try 
            {
                _context.FeeCategories.Add(feeCategory);
                await _context.SaveChangesAsync();
                
                // Log để kiểm tra
                Console.WriteLine($"Created FeeCategory: ID={feeCategory.FeeCategoryID}, Name={feeCategory.CategoryName}");
                
                return CreatedAtAction(nameof(GetFeeCategory), new { id = feeCategory.FeeCategoryID }, feeCategory);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating FeeCategory: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFeeCategory(int id, FeeCategory feeCategory)
        {
            if (id != feeCategory.FeeCategoryID)
                return BadRequest();

            _context.Entry(feeCategory).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFeeCategory(int id)
        {
            var feeCategory = await _context.FeeCategories.FindAsync(id);
            if (feeCategory == null)
                return NotFound();

            _context.FeeCategories.Remove(feeCategory);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
} 