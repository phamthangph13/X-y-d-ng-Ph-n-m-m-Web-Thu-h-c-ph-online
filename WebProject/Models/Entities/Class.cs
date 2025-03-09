using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Class
    {
        [Key]
        public int ClassID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string ClassName { get; set; } = null!;
        
        [Required]
        [StringLength(20)]
        public string ClassCode { get; set; } = null!;
        
        [Required]
        public int DepartmentID { get; set; }
        
        // Navigation properties
        [ForeignKey("DepartmentID")]
        public virtual Department Department { get; set; } = null!;
        
        public virtual ICollection<Student> Students { get; set; } = new List<Student>();
    }
} 