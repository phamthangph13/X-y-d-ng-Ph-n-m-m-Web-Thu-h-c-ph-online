using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Student
    {
        [Key]
        public int StudentID { get; set; }
        
        [Required]
        public int UserID { get; set; }
        
        [Required]
        [StringLength(20)]
        public string StudentCode { get; set; } = null!;
        
        [Required]
        public int DepartmentID { get; set; }
        
        [Required]
        public int ClassID { get; set; }
        
        [Required]
        public int EnrollmentYear { get; set; }
        
        public int? CurrentSemester { get; set; }
        
        // Navigation properties
        [ForeignKey("UserID")]
        public virtual User User { get; set; } = null!;
        
        [ForeignKey("DepartmentID")]
        public virtual Department Department { get; set; } = null!;
        
        [ForeignKey("ClassID")]
        public virtual Class Class { get; set; } = null!;
        
        public virtual ICollection<StudentCourse> StudentCourses { get; set; } = new List<StudentCourse>();
        public virtual ICollection<StudentFee> StudentFees { get; set; } = new List<StudentFee>();
    }
} 