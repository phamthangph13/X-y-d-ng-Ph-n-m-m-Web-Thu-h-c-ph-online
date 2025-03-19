using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class StudentFeeDetail
    {
        [Key]
        public int StudentFeeDetailID { get; set; }
        
        [Required]
        public int StudentFeeID { get; set; }
        
        [Required]
        public int FeeCategoryID { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        // Navigation properties
        [ForeignKey("StudentFeeID")]
        public virtual StudentFee StudentFee { get; set; } = null!;
        
        [ForeignKey("FeeCategoryID")]
        public virtual FeeCategory FeeCategory { get; set; } = null!;
    }
} 