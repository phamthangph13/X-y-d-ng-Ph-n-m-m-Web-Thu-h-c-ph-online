using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class ExternalAuthentication
    {
        [Key]
        public int ExternalAuthID { get; set; }
        
        [Required]
        public int UserID { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Provider { get; set; } = null!;
        
        [Required]
        [StringLength(100)]
        public string ProviderUserID { get; set; } = null!;
        
        // Navigation properties
        [ForeignKey("UserID")]
        public virtual User User { get; set; } = null!;
    }
} 