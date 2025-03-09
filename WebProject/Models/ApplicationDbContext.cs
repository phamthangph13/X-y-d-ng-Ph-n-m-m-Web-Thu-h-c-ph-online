using Microsoft.EntityFrameworkCore;
using WebProject.Models.Entities;

namespace WebProject.Models
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Student> Students { get; set; } = null!;
        public DbSet<Department> Departments { get; set; } = null!;
        public DbSet<Class> Classes { get; set; } = null!;
        public DbSet<Course> Courses { get; set; } = null!;
        public DbSet<Semester> Semesters { get; set; } = null!;
        public DbSet<StudentCourse> StudentCourses { get; set; } = null!;
        public DbSet<FeeCategory> FeeCategories { get; set; } = null!;
        public DbSet<FeeStructure> FeeStructures { get; set; } = null!;
        public DbSet<StudentFee> StudentFees { get; set; } = null!;
        public DbSet<StudentFeeDetail> StudentFeeDetails { get; set; } = null!;
        public DbSet<PaymentMethod> PaymentMethods { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<LoginHistory> LoginHistories { get; set; } = null!;
        public DbSet<ExternalAuthentication> ExternalAuthentications { get; set; } = null!;
        public DbSet<SystemSetting> SystemSettings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.StudentCode)
                .IsUnique();

            modelBuilder.Entity<Department>()
                .HasIndex(d => d.DepartmentCode)
                .IsUnique();

            modelBuilder.Entity<Class>()
                .HasIndex(c => c.ClassCode)
                .IsUnique();

            modelBuilder.Entity<Course>()
                .HasIndex(c => c.CourseCode)
                .IsUnique();

            modelBuilder.Entity<Invoice>()
                .HasIndex(i => i.InvoiceNumber)
                .IsUnique();

            modelBuilder.Entity<SystemSetting>()
                .HasIndex(s => s.SettingName)
                .IsUnique();

            // Configure composite unique constraints
            modelBuilder.Entity<StudentCourse>()
                .HasIndex(sc => new { sc.StudentID, sc.CourseID, sc.SemesterID })
                .IsUnique();

            modelBuilder.Entity<FeeStructure>()
                .HasIndex(fs => new { fs.DepartmentID, fs.SemesterID, fs.FeeCategoryID })
                .IsUnique();

            modelBuilder.Entity<StudentFee>()
                .HasIndex(sf => new { sf.StudentID, sf.SemesterID })
                .IsUnique();

            modelBuilder.Entity<ExternalAuthentication>()
                .HasIndex(ea => new { ea.Provider, ea.ProviderUserID })
                .IsUnique();

            // Configure one-to-one relationships
            modelBuilder.Entity<User>()
                .HasOne(u => u.Student)
                .WithOne(s => s.User)
                .HasForeignKey<Student>(s => s.UserID)
                .OnDelete(DeleteBehavior.Restrict);

            // Fix cascade delete issues
            modelBuilder.Entity<Student>()
                .HasOne(s => s.Department)
                .WithMany(d => d.Students)
                .HasForeignKey(s => s.DepartmentID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Student>()
                .HasOne(s => s.Class)
                .WithMany(c => c.Students)
                .HasForeignKey(s => s.ClassID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentCourse>()
                .HasOne(sc => sc.Student)
                .WithMany(s => s.StudentCourses)
                .HasForeignKey(sc => sc.StudentID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentCourse>()
                .HasOne(sc => sc.Course)
                .WithMany(c => c.StudentCourses)
                .HasForeignKey(sc => sc.CourseID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentCourse>()
                .HasOne(sc => sc.Semester)
                .WithMany(s => s.StudentCourses)
                .HasForeignKey(sc => sc.SemesterID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentFee>()
                .HasOne(sf => sf.Student)
                .WithMany(s => s.StudentFees)
                .HasForeignKey(sf => sf.StudentID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentFee>()
                .HasOne(sf => sf.Semester)
                .WithMany(s => s.StudentFees)
                .HasForeignKey(sf => sf.SemesterID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentFeeDetail>()
                .HasOne(sfd => sfd.StudentFee)
                .WithMany(sf => sf.StudentFeeDetails)
                .HasForeignKey(sfd => sfd.StudentFeeID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentFeeDetail>()
                .HasOne(sfd => sfd.FeeCategory)
                .WithMany(fc => fc.StudentFeeDetails)
                .HasForeignKey(sfd => sfd.FeeCategoryID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.StudentFee)
                .WithMany(sf => sf.Payments)
                .HasForeignKey(p => p.StudentFeeID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.PaymentMethod)
                .WithMany(pm => pm.Payments)
                .HasForeignKey(p => p.PaymentMethodID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Invoice>()
                .HasOne(i => i.Payment)
                .WithMany(p => p.Invoices)
                .HasForeignKey(i => i.PaymentID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FeeStructure>()
                .HasOne(fs => fs.Department)
                .WithMany(d => d.FeeStructures)
                .HasForeignKey(fs => fs.DepartmentID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FeeStructure>()
                .HasOne(fs => fs.Semester)
                .WithMany(s => s.FeeStructures)
                .HasForeignKey(fs => fs.SemesterID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FeeStructure>()
                .HasOne(fs => fs.FeeCategory)
                .WithMany(fc => fc.FeeStructures)
                .HasForeignKey(fs => fs.FeeCategoryID)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
} 