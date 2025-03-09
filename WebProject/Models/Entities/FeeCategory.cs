using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class FeeCategory
    {
        [Key]
        public int FeeCategoryID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string CategoryName { get; set; } = null!;
        
        [StringLength(255)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public virtual ICollection<FeeStructure> FeeStructures { get; set; } = new List<FeeStructure>();
        public virtual ICollection<StudentFeeDetail> StudentFeeDetails { get; set; } = new List<StudentFeeDetail>();
    }
} 