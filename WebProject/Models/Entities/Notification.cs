using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Notification
    {
        [Key]
        public int NotificationID { get; set; }
        
        [Required]
        public int UserID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Title { get; set; } = null!;
        
        [Required]
        [StringLength(500)]
        public string Message { get; set; } = null!;
        
        [StringLength(50)]
        public string? NotificationType { get; set; }
        
        public DateTime SentDate { get; set; } = DateTime.Now;
        
        public bool IsRead { get; set; } = false;
        
        // Navigation properties
        [ForeignKey("UserID")]
        public virtual User User { get; set; } = null!;
    }
} 