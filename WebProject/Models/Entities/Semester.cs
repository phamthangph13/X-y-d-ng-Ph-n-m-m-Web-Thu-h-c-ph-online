using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Semester
    {
        [Key]
        public int SemesterID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string SemesterName { get; set; } = null!;
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }
        
        [Required]
        [StringLength(20)]
        public string AcademicYear { get; set; } = null!;
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public virtual ICollection<StudentCourse> StudentCourses { get; set; } = new List<StudentCourse>();
        public virtual ICollection<FeeStructure> FeeStructures { get; set; } = new List<FeeStructure>();
        public virtual ICollection<StudentFee> StudentFees { get; set; } = new List<StudentFee>();
    }
} 