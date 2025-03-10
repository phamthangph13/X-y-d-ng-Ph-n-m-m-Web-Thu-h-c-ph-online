using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;
using System.Security.Claims;
using WebProject.Authentication.Services;

namespace WebProject.Authentication.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuthService _authService;

        public UserController(ApplicationDbContext context, IAuthService authService)
        {
            _context = context;
            _authService = authService;
        }

        /// <summary>
        /// Get the current user's profile information
        /// </summary>
        /// <returns>User profile information</returns>
        [HttpGet("profile")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
            {
                return Unauthorized();
            }

            var user = await _context.Users
                .Include(u => u.Student)
                    .ThenInclude(s => s.Department)
                .Include(u => u.Student)
                    .ThenInclude(s => s.Class)
                .FirstOrDefaultAsync(u => u.UserID == userIdInt);

            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // TODO: Get two-factor authentication status from appropriate table
            bool isTwoFactorEnabled = false; // Placeholder

            return Ok(new
            {
                success = true,
                userId = user.UserID,
                email = user.Email,
                fullName = user.FullName,
                phoneNumber = user.PhoneNumber,
                userType = user.UserType,
                isTwoFactorEnabled = isTwoFactorEnabled,
                studentCode = user.Student?.StudentCode,
                enrollmentYear = user.Student?.EnrollmentYear,
                department = user.Student?.Department == null ? null : new
                {
                    departmentId = user.Student.Department.DepartmentID,
                    departmentName = user.Student.Department.DepartmentName,
                    departmentCode = user.Student.Department.DepartmentCode
                },
                class_ = user.Student?.Class == null ? null : new
                {
                    classId = user.Student.Class.ClassID,
                    className = user.Student.Class.ClassName,
                    classCode = user.Student.Class.ClassCode
                }
            });
        }

        /// <summary>
        /// Update the current user's profile information
        /// </summary>
        /// <param name="model">Updated profile information</param>
        /// <returns>Result of profile update</returns>
        [HttpPut("profile")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid input data" });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userIdInt);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // Update user information
            user.FullName = model.FullName ?? user.FullName;
            user.PhoneNumber = model.PhoneNumber ?? user.PhoneNumber;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Profile updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Failed to update profile: {ex.Message}" });
            }
        }

        /// <summary>
        /// Change the current user's password
        /// </summary>
        /// <param name="model">Password change information</param>
        /// <returns>Result of password change</returns>
        [HttpPost("change-password")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid input data" });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userIdInt);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // Verify current password (using AuthService to match password hashing logic)
            if (!_authService.VerifyPassword(model.CurrentPassword, user.Password))
            {
                return BadRequest(new { success = false, message = "Current password is incorrect" });
            }

            // Check if new password matches confirmation
            if (model.NewPassword != model.ConfirmPassword)
            {
                return BadRequest(new { success = false, message = "New password and confirmation do not match" });
            }

            // Update password
            user.Password = _authService.HashPassword(model.NewPassword);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Password changed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Failed to change password: {ex.Message}" });
            }
        }

        /// <summary>
        /// Enable or disable two-factor authentication for the current user
        /// </summary>
        /// <param name="model">Two-factor authentication settings</param>
        /// <returns>Result of two-factor authentication update</returns>
        [HttpPost("two-factor")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateTwoFactorAuth([FromBody] TwoFactorAuthModel model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userIdInt);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // TODO: Implement two-factor authentication settings update
            // This is a placeholder implementation
            
            return Ok(new { success = true, message = $"Two-factor authentication has been {(model.IsEnabled ? "enabled" : "disabled")}" });
        }
    }

    // View models for UserController
    public class UpdateProfileModel
    {
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
    }

    public class ChangePasswordModel
    {
        public string CurrentPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
        public string ConfirmPassword { get; set; } = null!;
    }

    public class TwoFactorAuthModel
    {
        public bool IsEnabled { get; set; }
    }
} 