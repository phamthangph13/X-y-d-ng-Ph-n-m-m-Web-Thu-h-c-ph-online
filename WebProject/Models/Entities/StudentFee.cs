using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class StudentFee
    {
        [Key]
        public int StudentFeeID { get; set; }
        
        [Required]
        public int StudentID { get; set; }
        
        [Required]
        public int SemesterID { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        
        [Required]
        public DateTime DueDate { get; set; }
        
        [Required]
        [StringLength(20)]
        public string Status { get; set; } // Unpaid, Partial, Paid
        
        [Required]
        public DateTime CreatedDate { get; set; }
        
        public DateTime? LastUpdated { get; set; }
        
        // Navigation properties
        [ForeignKey("StudentID")]
        public virtual Student Student { get; set; } = null!;
        
        [ForeignKey("SemesterID")]
        public virtual Semester Semester { get; set; } = null!;
        
        public virtual ICollection<StudentFeeDetail> StudentFeeDetails { get; set; } = new List<StudentFeeDetail>();
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
} 