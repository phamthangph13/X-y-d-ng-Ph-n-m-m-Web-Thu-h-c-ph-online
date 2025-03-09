using System.ComponentModel.DataAnnotations;

namespace WebProject.Authentication.Models
{
    public class ExternalLoginViewModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        public string? StudentCode { get; set; }
        
        public string? PhoneNumber { get; set; }
        
        public int? DepartmentID { get; set; }
        
        public int? ClassID { get; set; }
        
        public int? EnrollmentYear { get; set; }
    }
} 