using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Department
    {
        [Key]
        public int DepartmentID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string DepartmentName { get; set; } = null!;
        
        [Required]
        [StringLength(20)]
        public string DepartmentCode { get; set; } = null!;
        
        // Navigation properties
        public virtual ICollection<Student> Students { get; set; } = new List<Student>();
        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
        public virtual ICollection<Course> Courses { get; set; } = new List<Course>();
        public virtual ICollection<FeeStructure> FeeStructures { get; set; } = new List<FeeStructure>();
    }
} 