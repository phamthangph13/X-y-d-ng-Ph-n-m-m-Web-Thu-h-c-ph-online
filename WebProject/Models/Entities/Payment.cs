using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Payment
    {
        [Key]
        public int PaymentID { get; set; }
        
        [Required]
        public int StudentFeeID { get; set; }
        
        [Required]
        public int PaymentMethodID { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal Amount { get; set; }
        
        [StringLength(100)]
        public string? TransactionID { get; set; }
        
        public DateTime PaymentDate { get; set; } = DateTime.Now;
        
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = null!;
        
        [StringLength(255)]
        public string? PaymentReference { get; set; }
        
        // Navigation properties
        [ForeignKey("StudentFeeID")]
        public virtual StudentFee StudentFee { get; set; } = null!;
        
        [ForeignKey("PaymentMethodID")]
        public virtual PaymentMethod PaymentMethod { get; set; } = null!;
        
        public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
} 