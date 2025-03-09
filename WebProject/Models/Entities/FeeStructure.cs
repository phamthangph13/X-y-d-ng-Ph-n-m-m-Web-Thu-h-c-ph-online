using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class FeeStructure
    {
        [Key]
        public int FeeStructureID { get; set; }
        
        [Required]
        public int DepartmentID { get; set; }
        
        [Required]
        public int SemesterID { get; set; }
        
        [Required]
        public int FeeCategoryID { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal Amount { get; set; }
        
        public bool PerCredit { get; set; } = false;
        
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        
        public DateTime? LastUpdated { get; set; }
        
        // Navigation properties
        [ForeignKey("DepartmentID")]
        public virtual Department Department { get; set; } = null!;
        
        [ForeignKey("SemesterID")]
        public virtual Semester Semester { get; set; } = null!;
        
        [ForeignKey("FeeCategoryID")]
        public virtual FeeCategory FeeCategory { get; set; } = null!;
    }
} 