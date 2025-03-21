using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;
using WebProject.Authentication.Services;

namespace WebProject.Controllers
{
    [Route("api/user-management")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UserManagementController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuthService _authService;

        public UserManagementController(ApplicationDbContext context, IAuthService authService)
        {
            _context = context;
            _authService = authService;
        }

        /// <summary>
        /// Get a paginated list of student users
        /// </summary>
        [HttpGet("students")]
        [ProducesResponseType(typeof(PagedResult<StudentListViewModel>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetStudents(
            [FromQuery] string? studentId = null,
            [FromQuery] string? name = null, 
            [FromQuery] string? className = null,
            [FromQuery] int? departmentId = null,
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10)
        {
            IQueryable<Student> query = _context.Students
                .Include(s => s.User)
                .Include(s => s.Department)
                .Include(s => s.Class);

            // Apply filters
            if (!string.IsNullOrEmpty(studentId))
            {
                query = query.Where(s => s.StudentCode.Contains(studentId));
            }

            if (!string.IsNullOrEmpty(name))
            {
                query = query.Where(s => s.User.FullName.Contains(name));
            }

            if (!string.IsNullOrEmpty(className))
            {
                query = query.Where(s => s.Class.ClassName.Contains(className) || s.Class.ClassCode.Contains(className));
            }

            if (departmentId.HasValue)
            {
                query = query.Where(s => s.DepartmentID == departmentId.Value);
            }

            // Get total count
            int totalCount = await query.CountAsync();

            // Apply pagination
            var students = await query
                .OrderBy(s => s.StudentCode)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentListViewModel
                {
                    StudentID = s.StudentID,
                    UserID = s.UserID,
                    StudentCode = s.StudentCode,
                    FullName = s.User.FullName,
                    Email = s.User.Email,
                    PhoneNumber = s.User.PhoneNumber,
                    DepartmentID = s.DepartmentID,
                    DepartmentName = s.Department.DepartmentName,
                    DepartmentCode = s.Department.DepartmentCode,
                    ClassID = s.ClassID,
                    ClassName = s.Class.ClassName,
                    ClassCode = s.Class.ClassCode,
                    EnrollmentYear = s.EnrollmentYear,
                    CurrentSemester = s.CurrentSemester,
                    IsActive = s.User.IsActive
                })
                .ToListAsync();

            var result = new PagedResult<StudentListViewModel>
            {
                Items = students,
                TotalCount = totalCount,
                PageSize = pageSize,
                CurrentPage = page
            };

            return Ok(result);
        }

        /// <summary>
        /// Get a student by ID
        /// </summary>
        [HttpGet("students/{id}")]
        [ProducesResponseType(typeof(StudentListViewModel), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetStudent(int id)
        {
            var student = await _context.Students
                .Include(s => s.User)
                .Include(s => s.Department)
                .Include(s => s.Class)
                .Where(s => s.StudentID == id)
                .Select(s => new StudentListViewModel
                {
                    StudentID = s.StudentID,
                    UserID = s.UserID,
                    StudentCode = s.StudentCode,
                    FullName = s.User.FullName,
                    Email = s.User.Email,
                    PhoneNumber = s.User.PhoneNumber,
                    DepartmentID = s.DepartmentID,
                    DepartmentName = s.Department.DepartmentName,
                    DepartmentCode = s.Department.DepartmentCode,
                    ClassID = s.ClassID,
                    ClassName = s.Class.ClassName,
                    ClassCode = s.Class.ClassCode,
                    EnrollmentYear = s.EnrollmentYear,
                    CurrentSemester = s.CurrentSemester,
                    IsActive = s.User.IsActive
                })
                .FirstOrDefaultAsync();

            if (student == null)
            {
                return NotFound(new { success = false, message = "Student not found" });
            }

            return Ok(student);
        }

        /// <summary>
        /// Get a paginated list of accountant users
        /// </summary>
        [HttpGet("accountants")]
        [ProducesResponseType(typeof(PagedResult<AccountantListViewModel>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetAccountants(
            [FromQuery] string? employeeId = null,
            [FromQuery] string? name = null, 
            [FromQuery] string? department = null,
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10)
        {
            // Since there's no explicit accountant model, we'll filter users with type "Accountant"
            IQueryable<User> query = _context.Users
                .Where(u => u.UserType == "Accountant");

            // Apply filters
            if (!string.IsNullOrEmpty(employeeId))
            {
                // Assuming accountants have an employee ID stored in some custom way
                // This might need modification based on how you identify accountants
                query = query.Where(u => u.Email.Contains(employeeId));
            }

            if (!string.IsNullOrEmpty(name))
            {
                query = query.Where(u => u.FullName.Contains(name));
            }

            // For department filter, you might need a custom solution since there's no accountant-department relationship
            // This is a placeholder that won't filter anything

            // Get total count
            int totalCount = await query.CountAsync();

            // Apply pagination
            var accountants = await query
                .OrderBy(u => u.Email)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new AccountantListViewModel
                {
                    UserID = u.UserID,
                    Email = u.Email,
                    FullName = u.FullName,
                    PhoneNumber = u.PhoneNumber,
                    IsActive = u.IsActive,
                    RegistrationDate = u.RegistrationDate,
                    LastLogin = u.LastLogin
                    // Department and position information would go here if available
                })
                .ToListAsync();

            var result = new PagedResult<AccountantListViewModel>
            {
                Items = accountants,
                TotalCount = totalCount,
                PageSize = pageSize,
                CurrentPage = page
            };

            return Ok(result);
        }

        /// <summary>
        /// Get an accountant by ID
        /// </summary>
        [HttpGet("accountants/{id}")]
        [ProducesResponseType(typeof(AccountantListViewModel), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetAccountant(int id)
        {
            var accountant = await _context.Users
                .Where(u => u.UserID == id && u.UserType == "Accountant")
                .Select(u => new AccountantListViewModel
                {
                    UserID = u.UserID,
                    Email = u.Email,
                    FullName = u.FullName,
                    PhoneNumber = u.PhoneNumber,
                    IsActive = u.IsActive,
                    RegistrationDate = u.RegistrationDate,
                    LastLogin = u.LastLogin
                    // Department and position information would go here if available
                })
                .FirstOrDefaultAsync();

            if (accountant == null)
            {
                return NotFound(new { success = false, message = "Accountant not found" });
            }

            return Ok(accountant);
        }

        /// <summary>
        /// Add a new student
        /// </summary>
        [HttpPost("students")]
        [ProducesResponseType(typeof(object), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> AddStudent([FromBody] AddStudentViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid input data" });
            }

            // Check if student code already exists
            if (await _context.Students.AnyAsync(s => s.StudentCode == model.StudentCode))
            {
                return BadRequest(new { success = false, message = "Student code already exists" });
            }

            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest(new { success = false, message = "Email already exists" });
            }

            // Create a new user
            var user = new User
            {
                Email = model.Email,
                Password = _authService.HashPassword(model.Password ?? "12345678"), // Default password if not provided
                FullName = model.FullName,
                PhoneNumber = model.PhoneNumber,
                UserType = "Student",
                IsActive = model.IsActive ?? true,
                RegistrationDate = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Create a new student linked to the user
            var student = new Student
            {
                UserID = user.UserID,
                StudentCode = model.StudentCode,
                DepartmentID = model.DepartmentID,
                ClassID = model.ClassID,
                EnrollmentYear = model.EnrollmentYear,
                CurrentSemester = model.CurrentSemester
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            return Created($"/api/user-management/students/{student.StudentID}", new { 
                success = true, 
                message = "Student added successfully",
                studentId = student.StudentID
            });
        }

        /// <summary>
        /// Update an existing student
        /// </summary>
        [HttpPut("students/{id}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] UpdateStudentViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid input data" });
            }

            var student = await _context.Students
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.StudentID == id);

            if (student == null)
            {
                return NotFound(new { success = false, message = "Student not found" });
            }

            // Check if student code already exists (if being updated)
            if (!string.IsNullOrEmpty(model.StudentCode) && 
                model.StudentCode != student.StudentCode && 
                await _context.Students.AnyAsync(s => s.StudentCode == model.StudentCode))
            {
                return BadRequest(new { success = false, message = "Student code already exists" });
            }

            // Check if email already exists (if being updated)
            if (!string.IsNullOrEmpty(model.Email) && 
                model.Email != student.User.Email && 
                await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest(new { success = false, message = "Email already exists" });
            }

            // Update student properties
            if (!string.IsNullOrEmpty(model.StudentCode))
                student.StudentCode = model.StudentCode;
            
            if (model.DepartmentID.HasValue)
                student.DepartmentID = model.DepartmentID.Value;
            
            if (model.ClassID.HasValue)
                student.ClassID = model.ClassID.Value;
            
            if (model.EnrollmentYear.HasValue)
                student.EnrollmentYear = model.EnrollmentYear.Value;
            
            if (model.CurrentSemester.HasValue)
                student.CurrentSemester = model.CurrentSemester;

            // Update user properties
            if (!string.IsNullOrEmpty(model.Email))
                student.User.Email = model.Email;
            
            if (!string.IsNullOrEmpty(model.FullName))
                student.User.FullName = model.FullName;
            
            if (!string.IsNullOrEmpty(model.PhoneNumber))
                student.User.PhoneNumber = model.PhoneNumber;
            
            if (model.IsActive.HasValue)
                student.User.IsActive = model.IsActive.Value;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Student updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Failed to update student: {ex.Message}" });
            }
        }

        /// <summary>
        /// Delete a student
        /// </summary>
        [HttpDelete("students/{id}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteStudent(int id)
        {
            var student = await _context.Students
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.StudentID == id);

            if (student == null)
            {
                return NotFound(new { success = false, message = "Student not found" });
            }

            try
            {
                // Determine if we should delete the user or just set as inactive
                // In a real application, you might want to just set the user as inactive
                // instead of deleting them to preserve history
                
                // Option 1: Set user as inactive instead of deleting
                student.User.IsActive = false;
                await _context.SaveChangesAsync();
                
                // Option 2: Delete student and user records
                // _context.Students.Remove(student);
                // _context.Users.Remove(student.User);
                // await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Student deactivated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Failed to delete student: {ex.Message}" });
            }
        }

        /// <summary>
        /// Add a new accountant
        /// </summary>
        [HttpPost("accountants")]
        [ProducesResponseType(typeof(object), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> AddAccountant([FromBody] AddAccountantViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid input data" });
            }

            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest(new { success = false, message = "Email already exists" });
            }

            // Create a new user as accountant
            var user = new User
            {
                Email = model.Email,
                Password = _authService.HashPassword(model.Password ?? "12345678"), // Default password if not provided
                FullName = model.FullName,
                PhoneNumber = model.PhoneNumber,
                UserType = "Accountant",
                IsActive = model.IsActive ?? true,
                RegistrationDate = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Note: If there was an Accountant entity, we would create and link it here
            // For now, we're just creating a User with UserType="Accountant"

            return Created($"/api/user-management/accountants/{user.UserID}", new { 
                success = true, 
                message = "Accountant added successfully",
                userId = user.UserID
            });
        }

        /// <summary>
        /// Update an existing accountant
        /// </summary>
        [HttpPut("accountants/{id}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateAccountant(int id, [FromBody] UpdateAccountantViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid input data" });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id && u.UserType == "Accountant");

            if (user == null)
            {
                return NotFound(new { success = false, message = "Accountant not found" });
            }

            // Check if email already exists (if being updated)
            if (!string.IsNullOrEmpty(model.Email) && 
                model.Email != user.Email && 
                await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest(new { success = false, message = "Email already exists" });
            }

            // Update user properties
            if (!string.IsNullOrEmpty(model.Email))
                user.Email = model.Email;
            
            if (!string.IsNullOrEmpty(model.FullName))
                user.FullName = model.FullName;
            
            if (!string.IsNullOrEmpty(model.PhoneNumber))
                user.PhoneNumber = model.PhoneNumber;
            
            if (model.IsActive.HasValue)
                user.IsActive = model.IsActive.Value;

            // Note: For Department and Position, you would update them in the Accountant entity if it existed
            // For now, these values can't be stored/updated since there's no dedicated Accountant table

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Accountant updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Failed to update accountant: {ex.Message}" });
            }
        }

        /// <summary>
        /// Delete an accountant
        /// </summary>
        [HttpDelete("accountants/{id}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteAccountant(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id && u.UserType == "Accountant");

            if (user == null)
            {
                return NotFound(new { success = false, message = "Accountant not found" });
            }

            try
            {
                // Option 1: Set user as inactive instead of deleting
                user.IsActive = false;
                await _context.SaveChangesAsync();
                
                // Option 2: Delete user record
                // _context.Users.Remove(user);
                // await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Accountant deactivated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Failed to delete accountant: {ex.Message}" });
            }
        }
    }

    // View Models
    public class StudentListViewModel
    {
        public int StudentID { get; set; }
        public int UserID { get; set; }
        public string StudentCode { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public int DepartmentID { get; set; }
        public string DepartmentName { get; set; } = null!;
        public string DepartmentCode { get; set; } = null!;
        public int ClassID { get; set; }
        public string ClassName { get; set; } = null!;
        public string ClassCode { get; set; } = null!;
        public int EnrollmentYear { get; set; }
        public int? CurrentSemester { get; set; }
        public bool IsActive { get; set; }
    }

    public class AccountantListViewModel
    {
        public int UserID { get; set; }
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public bool IsActive { get; set; }
        public DateTime RegistrationDate { get; set; }
        public DateTime? LastLogin { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
    }

    public class AddStudentViewModel
    {
        public string StudentCode { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? Password { get; set; }
        public string FullName { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public int DepartmentID { get; set; }
        public int ClassID { get; set; }
        public int EnrollmentYear { get; set; }
        public int? CurrentSemester { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateStudentViewModel
    {
        public string? StudentCode { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public int? DepartmentID { get; set; }
        public int? ClassID { get; set; }
        public int? EnrollmentYear { get; set; }
        public int? CurrentSemester { get; set; }
        public bool? IsActive { get; set; }
    }

    public class AddAccountantViewModel
    {
        public string Email { get; set; } = null!;
        public string? Password { get; set; }
        public string FullName { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateAccountantViewModel
    {
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public bool? IsActive { get; set; }
    }
} 