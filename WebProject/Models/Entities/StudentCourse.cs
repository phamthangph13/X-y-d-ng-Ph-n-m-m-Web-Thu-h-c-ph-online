using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class StudentCourse
    {
        [Key]
        public int StudentCourseID { get; set; }
        
        [Required]
        public int StudentID { get; set; }
        
        [Required]
        public int CourseID { get; set; }
        
        [Required]
        public int SemesterID { get; set; }
        
        public DateTime RegistrationDate { get; set; } = DateTime.Now;
        
        // Navigation properties
        [ForeignKey("StudentID")]
        public virtual Student Student { get; set; } = null!;
        
        [ForeignKey("CourseID")]
        public virtual Course Course { get; set; } = null!;
        
        [ForeignKey("SemesterID")]
        public virtual Semester Semester { get; set; } = null!;
    }
} 