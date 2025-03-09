using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class User
    {
        [Key]
        public int UserID { get; set; }
        
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = null!;
        
        [Required]
        [StringLength(255)]
        public string Password { get; set; } = null!;
        
        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = null!;
        
        [StringLength(20)]
        public string? PhoneNumber { get; set; }
        
        [Required]
        [StringLength(20)]
        public string UserType { get; set; } = null!;
        
        public bool IsActive { get; set; } = true;
        
        public DateTime RegistrationDate { get; set; } = DateTime.Now;
        
        public DateTime? LastLogin { get; set; }
        
        // Navigation properties
        public virtual Student? Student { get; set; }
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public virtual ICollection<LoginHistory> LoginHistories { get; set; } = new List<LoginHistory>();
        public virtual ICollection<ExternalAuthentication> ExternalAuthentications { get; set; } = new List<ExternalAuthentication>();
    }
} 