using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebProject.Models.Entities
{
    public class Invoice
    {
        [Key]
        public int InvoiceID { get; set; }
        
        [Required]
        public int PaymentID { get; set; }
        
        [Required]
        [StringLength(50)]
        public string InvoiceNumber { get; set; } = null!;
        
        public DateTime InvoiceDate { get; set; } = DateTime.Now;
        
        [StringLength(255)]
        public string? InvoicePath { get; set; }
        
        public bool SentToEmail { get; set; } = false;
        
        // Navigation properties
        [ForeignKey("PaymentID")]
        public virtual Payment Payment { get; set; } = null!;
    }
} 