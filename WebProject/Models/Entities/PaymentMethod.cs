using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class PaymentMethod
    {
        [Key]
        public int PaymentMethodID { get; set; }
        
        [Required]
        [StringLength(50)]
        public string MethodName { get; set; } = null!;
        
        [StringLength(255)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
} 