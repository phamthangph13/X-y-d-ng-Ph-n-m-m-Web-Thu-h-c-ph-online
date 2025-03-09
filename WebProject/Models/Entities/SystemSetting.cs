using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class SystemSetting
    {
        [Key]
        public int SettingID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string SettingName { get; set; } = null!;
        
        public string? SettingValue { get; set; }
        
        [StringLength(255)]
        public string? Description { get; set; }
        
        public DateTime LastUpdated { get; set; } = DateTime.Now;
    }
} 