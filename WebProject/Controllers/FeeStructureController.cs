using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using WebProject.Models.Entities;
using WebProject.Models;
using System.ComponentModel.DataAnnotations;

namespace WebProject.Controllers
{
    [ApiController]
    [Route("api/fee-structure")]
    public class FeeStructureController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public FeeStructureController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FeeStructureDto>>> GetFeeStructures()
        {
            var feeStructures = await _context.FeeStructures
                .Include(f => f.Department)
                .Include(f => f.Semester)
                .Include(f => f.FeeCategory)
                .Select(f => new FeeStructureDto
                {
                    FeeStructureID = f.FeeStructureID,
                    DepartmentID = f.DepartmentID,
                    DepartmentName = f.Department.DepartmentName,
                    SemesterID = f.SemesterID,
                    SemesterName = f.Semester.SemesterName,
                    FeeCategoryID = f.FeeCategoryID,
                    CategoryName = f.FeeCategory.CategoryName,
                    Amount = f.Amount,
                    PerCredit = f.PerCredit
                })
                .ToListAsync();

            return feeStructures;
        }

        [HttpGet("filter")]
        public async Task<ActionResult<IEnumerable<FeeStructureDto>>> FilterFeeStructures([FromQuery] int? departmentId, [FromQuery] int? semesterId)
        {
            var query = _context.FeeStructures
                .Include(f => f.Department)
                .Include(f => f.Semester)
                .Include(f => f.FeeCategory)
                .AsQueryable();

            if (departmentId.HasValue)
                query = query.Where(f => f.DepartmentID == departmentId.Value);

            if (semesterId.HasValue)
                query = query.Where(f => f.SemesterID == semesterId.Value);

            var feeStructures = await query
                .Select(f => new FeeStructureDto
                {
                    FeeStructureID = f.FeeStructureID,
                    DepartmentID = f.DepartmentID,
                    DepartmentName = f.Department.DepartmentName,
                    SemesterID = f.SemesterID,
                    SemesterName = f.Semester.SemesterName,
                    FeeCategoryID = f.FeeCategoryID,
                    CategoryName = f.FeeCategory.CategoryName,
                    Amount = f.Amount,
                    PerCredit = f.PerCredit
                })
                .ToListAsync();

            return feeStructures;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FeeStructureDto>> GetFeeStructure(int id)
        {
            var feeStructure = await _context.FeeStructures
                .Include(f => f.Department)
                .Include(f => f.Semester)
                .Include(f => f.FeeCategory)
                .Where(f => f.FeeStructureID == id)
                .Select(f => new FeeStructureDto
                {
                    FeeStructureID = f.FeeStructureID,
                    DepartmentID = f.DepartmentID,
                    DepartmentName = f.Department.DepartmentName,
                    SemesterID = f.SemesterID,
                    SemesterName = f.Semester.SemesterName,
                    FeeCategoryID = f.FeeCategoryID,
                    CategoryName = f.FeeCategory.CategoryName,
                    Amount = f.Amount,
                    PerCredit = f.PerCredit
                })
                .FirstOrDefaultAsync();

            if (feeStructure == null)
                return NotFound();

            return feeStructure;
        }

        [HttpPost]
        public async Task<ActionResult<FeeStructure>> CreateFeeStructure([FromBody] FeeStructureInputModel model)
        {
            try 
            {
                Console.WriteLine($"Received model: DeptID={model.DepartmentID}, SemID={model.SemesterID}, CatID={model.FeeCategoryID}, Amount={model.Amount}");
                
                // Tạo entity mới từ input model
                var feeStructure = new FeeStructure
                {
                    DepartmentID = model.DepartmentID,
                    SemesterID = model.SemesterID,
                    FeeCategoryID = model.FeeCategoryID,
                    Amount = model.Amount,
                    PerCredit = model.PerCredit
                };
                
                _context.FeeStructures.Add(feeStructure);
                await _context.SaveChangesAsync();
                
                // Log để kiểm tra
                Console.WriteLine($"Created FeeStructure: ID={feeStructure.FeeStructureID}, DeptID={feeStructure.DepartmentID}, SemID={feeStructure.SemesterID}, CategoryID={feeStructure.FeeCategoryID}");
                
                // Trả về dữ liệu đầy đủ
                var createdStructure = await _context.FeeStructures
                    .Include(f => f.Department)
                    .Include(f => f.Semester)
                    .Include(f => f.FeeCategory)
                    .FirstOrDefaultAsync(f => f.FeeStructureID == feeStructure.FeeStructureID);
                    
                return CreatedAtAction(nameof(GetFeeStructure), new { id = feeStructure.FeeStructureID }, createdStructure);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating FeeStructure: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFeeStructure(int id, [FromBody] FeeStructureInputModel model)
        {
            try
            {
                Console.WriteLine($"Updating FeeStructure ID={id}, DeptID={model.DepartmentID}, SemID={model.SemesterID}, CatID={model.FeeCategoryID}");
                
                var feeStructure = await _context.FeeStructures.FindAsync(id);
                if (feeStructure == null)
                    return NotFound(new { message = "Cấu trúc học phí không tồn tại" });

                // Cập nhật thông tin
                feeStructure.DepartmentID = model.DepartmentID;
                feeStructure.SemesterID = model.SemesterID;
                feeStructure.FeeCategoryID = model.FeeCategoryID;
                feeStructure.Amount = model.Amount;
                feeStructure.PerCredit = model.PerCredit;

                _context.Entry(feeStructure).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"Updated FeeStructure ID={id}");
                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating FeeStructure: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFeeStructure(int id)
        {
            var feeStructure = await _context.FeeStructures.FindAsync(id);
            if (feeStructure == null)
                return NotFound();

            _context.FeeStructures.Remove(feeStructure);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class FeeStructureDto
    {
        public int FeeStructureID { get; set; }
        public int DepartmentID { get; set; }
        public string DepartmentName { get; set; }
        public int SemesterID { get; set; }
        public string SemesterName { get; set; }
        public int FeeCategoryID { get; set; }
        public string CategoryName { get; set; }
        public decimal Amount { get; set; }
        public bool PerCredit { get; set; }
    }

    // Input model để tránh validation error với navigation properties
    public class FeeStructureInputModel
    {
        [Required]
        public int DepartmentID { get; set; }
        
        [Required]
        public int SemesterID { get; set; }
        
        [Required]
        public int FeeCategoryID { get; set; }
        
        [Required]
        public decimal Amount { get; set; }
        
        public bool PerCredit { get; set; }
    }
} 