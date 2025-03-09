using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using WebProject.Authentication.Models;
using WebProject.Authentication.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace WebProject.Authentication.Controllers
{
    // Use only one route attribute to prevent ambiguous matches
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        // Test endpoint to verify routing
        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { message = "AuthController is working correctly" });
        }

        /// <summary>
        /// Register a new student account
        /// </summary>
        /// <param name="model">Registration information</param>
        /// <returns>Registration result</returns>
        [HttpPost("register")]
        [ProducesResponseType(typeof(AuthResponse), 200)]
        [ProducesResponseType(typeof(AuthResponse), 400)]
        public async Task<IActionResult> Register([FromBody] RegisterViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponse { Success = false, Message = "Invalid input data" });
            }

            try
            {
                var result = await _authService.RegisterAsync(model);
                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (DbUpdateException ex)
            {
                // Log the error
                _logger.LogError(ex, "Database error during registration");
                
                // Check for specific error types
                if (ex.InnerException != null && ex.InnerException.Message.Contains("FK_Students_Classes_ClassID"))
                {
                    return BadRequest(new AuthResponse { Success = false, Message = "The selected class does not exist. Please select a valid class." });
                }
                if (ex.InnerException != null && ex.InnerException.Message.Contains("FK_Students_Departments_DepartmentID"))
                {
                    return BadRequest(new AuthResponse { Success = false, Message = "The selected department does not exist. Please select a valid department." });
                }
                
                return BadRequest(new AuthResponse { Success = false, Message = "An error occurred while processing your registration. Please try again." });
            }
            catch (Exception ex)
            {
                // Log the error
                _logger.LogError(ex, "Error during registration");
                return BadRequest(new AuthResponse { Success = false, Message = "An unexpected error occurred. Please try again later." });
            }
        }

        /// <summary>
        /// Login using email and password
        /// </summary>
        /// <param name="model">Login credentials</param>
        /// <returns>Authentication result with token</returns>
        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponse), 200)]
        [ProducesResponseType(typeof(AuthResponse), 400)]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponse { Success = false, Message = "Invalid input data" });
            }

            try
            {
                var result = await _authService.LoginAsync(model);
                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login attempt for email: {Email}", model.Email);
                return BadRequest(new AuthResponse { Success = false, Message = "Login failed. Please try again later." });
            }
        }

        /// <summary>
        /// Login with Google
        /// </summary>
        /// <param name="token">Google authentication token</param>
        /// <returns>Authentication result with JWT token</returns>
        [HttpPost("google-login")]
        [ProducesResponseType(typeof(AuthResponse), 200)]
        [ProducesResponseType(typeof(AuthResponse), 400)]
        public async Task<IActionResult> GoogleLogin([FromBody] string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new AuthResponse { Success = false, Message = "Token is required" });
            }

            var result = await _authService.LoginWithGoogleAsync(token);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Login with Facebook
        /// </summary>
        /// <param name="token">Facebook authentication token</param>
        /// <returns>Authentication result with JWT token</returns>
        [HttpPost("facebook-login")]
        [ProducesResponseType(typeof(AuthResponse), 200)]
        [ProducesResponseType(typeof(AuthResponse), 400)]
        public async Task<IActionResult> FacebookLogin([FromBody] string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new AuthResponse { Success = false, Message = "Token is required" });
            }

            var result = await _authService.LoginWithFacebookAsync(token);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Request password reset
        /// </summary>
        /// <param name="model">Email address</param>
        /// <returns>Result of password reset request</returns>
        [HttpPost("forgot-password")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { Success = false, Message = "Invalid email format" });
            }

            var result = await _authService.ForgotPasswordAsync(model.Email);
            if (!result)
            {
                // Don't reveal that the user does not exist
                return Ok(new { Success = true, Message = "If your email exists in our system, you will receive a password reset link" });
            }

            return Ok(new { Success = true, Message = "Password reset link has been sent to your email" });
        }

        /// <summary>
        /// Reset password using token
        /// </summary>
        /// <param name="model">Reset password information</param>
        /// <returns>Result of password reset</returns>
        [HttpPost("reset-password")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { Success = false, Message = "Invalid input data" });
            }

            var result = await _authService.ResetPasswordAsync(model);
            if (!result)
            {
                return BadRequest(new { Success = false, Message = "Failed to reset password" });
            }

            return Ok(new { Success = true, Message = "Password has been reset successfully" });
        }

        /// <summary>
        /// Confirm email address
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="token">Confirmation token</param>
        /// <returns>Result of email confirmation</returns>
        [HttpGet("confirm-email")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
        public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                return BadRequest(new { Success = false, Message = "Invalid user ID or token" });
            }

            var result = await _authService.ConfirmEmailAsync(userId, token);
            if (!result)
            {
                return BadRequest(new { Success = false, Message = "Failed to confirm email" });
            }

            return Ok(new { Success = true, Message = "Email confirmed successfully" });
        }

        /// <summary>
        /// Register external user (Google/Facebook) with additional information
        /// </summary>
        /// <param name="model">External user information</param>
        /// <param name="provider">Authentication provider (Google/Facebook)</param>
        /// <param name="providerUserId">Provider's user ID</param>
        /// <returns>Authentication result</returns>
        [HttpPost("register-external")]
        [ProducesResponseType(typeof(AuthResponse), 200)]
        [ProducesResponseType(typeof(AuthResponse), 400)]
        public async Task<IActionResult> RegisterExternal([FromBody] ExternalLoginViewModel model, [FromQuery] string provider, [FromQuery] string providerUserId)
        {
            if (!ModelState.IsValid || string.IsNullOrEmpty(provider) || string.IsNullOrEmpty(providerUserId))
            {
                return BadRequest(new AuthResponse { Success = false, Message = "Invalid input data" });
            }

            var result = await _authService.RegisterExternalAsync(model, provider, providerUserId);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Logout the current user
        /// </summary>
        /// <returns>Logout result</returns>
        [Authorize]
        [HttpPost("logout")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> Logout()
        {
            await _authService.LogoutAsync();
            return Ok(new { Success = true, Message = "Logged out successfully" });
        }
    }
} 