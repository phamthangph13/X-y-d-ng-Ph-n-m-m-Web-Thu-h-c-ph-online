using System.ComponentModel.DataAnnotations;

namespace WebProject.Authentication.Models
{
    public class RegisterViewModel
    {
        [Required(ErrorMessage = "Full name is required")]
        [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Student code is required")]
        [StringLength(20, ErrorMessage = "Student code cannot exceed 20 characters")]
        public string StudentCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required")]
        [Phone(ErrorMessage = "Invalid phone number")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, ErrorMessage = "Password must be at least {2} characters long", MinimumLength = 6)]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "Passwords do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Department is required")]
        public int DepartmentID { get; set; }

        [Required(ErrorMessage = "Class is required")]
        public int ClassID { get; set; }

        [Required(ErrorMessage = "Enrollment year is required")]
        [Range(1900, 2100, ErrorMessage = "Please enter a valid year")]
        public int EnrollmentYear { get; set; }
    }
} 