using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Course
    {
        [Key]
        public int CourseID { get; set; }
        
        [Required]
        [StringLength(20)]
        public string CourseCode { get; set; } = null!;
        
        [Required]
        [StringLength(100)]
        public string CourseName { get; set; } = null!;
        
        [Required]
        public int Credits { get; set; }
        
        [Required]
        public int DepartmentID { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        [ForeignKey("DepartmentID")]
        public virtual Department Department { get; set; } = null!;
        
        public virtual ICollection<StudentCourse> StudentCourses { get; set; } = new List<StudentCourse>();
    }
} 