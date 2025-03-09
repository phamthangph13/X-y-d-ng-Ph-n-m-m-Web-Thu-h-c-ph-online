using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class LoginHistory
    {
        [Key]
        public int LoginHistoryID { get; set; }
        
        [Required]
        public int UserID { get; set; }
        
        public DateTime LoginTime { get; set; } = DateTime.Now;
        
        public DateTime? LogoutTime { get; set; }
        
        [StringLength(50)]
        public string? IPAddress { get; set; }
        
        [StringLength(255)]
        public string? DeviceInfo { get; set; }
        
        // Navigation properties
        [ForeignKey("UserID")]
        public virtual User User { get; set; } = null!;
    }
} 