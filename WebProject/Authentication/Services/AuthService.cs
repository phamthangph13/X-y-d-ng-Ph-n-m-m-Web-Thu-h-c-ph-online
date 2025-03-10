using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims; 
using System.Security.Cryptography;
using System.Text;
using WebProject.Authentication.Models;
using WebProject.Models;
using WebProject.Models.Entities;

namespace WebProject.Authentication.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthService(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterViewModel model)
        {
            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return new AuthResponse { Success = false, Message = "Email already exists." };
            }

            // Check if student code already exists
            if (await _context.Students.AnyAsync(s => s.StudentCode == model.StudentCode))
            {
                return new AuthResponse { Success = false, Message = "Student code already exists." };
            }

            // Check if department exists
            if (!await _context.Departments.AnyAsync(d => d.DepartmentID == model.DepartmentID))
            {
                return new AuthResponse { Success = false, Message = "Selected department does not exist." };
            }

            // Check if class exists
            if (!await _context.Classes.AnyAsync(c => c.ClassID == model.ClassID))
            {
                return new AuthResponse { Success = false, Message = "Selected class does not exist." };
            }

            // Create user
            var user = new User
            {
                Email = model.Email,
                Password = HashPassword(model.Password),
                FullName = model.FullName,
                PhoneNumber = model.PhoneNumber,
                UserType = "Student",
                IsActive = false, // Inactive until email is confirmed
                RegistrationDate = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Create student
            var student = new Student
            {
                UserID = user.UserID,
                StudentCode = model.StudentCode,
                DepartmentID = model.DepartmentID,
                ClassID = model.ClassID,
                EnrollmentYear = model.EnrollmentYear
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            // Generate email confirmation token
            var token = await GenerateEmailConfirmationTokenAsync(user);

            // Send confirmation email
            string appUrl = _configuration["AppUrl"] ?? _configuration["AppSettings:BaseUrl"] ?? "http://havarduniversity.runasp.net";
            var confirmationLink = $"{appUrl}/api/auth/confirm-email?userId={user.UserID}&token={token}";
            await _emailService.SendEmailAsync(user.Email, "Confirm your email",
                $"Please confirm your account by clicking this link: <a href='{confirmationLink}'>Click here</a>");

            return new AuthResponse { Success = true, Message = "Registration successful. Please check your email to confirm your account." };
        }

        public async Task<AuthResponse> LoginAsync(LoginViewModel model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null || !VerifyPassword(model.Password, user.Password))
            {
                return new AuthResponse { Success = false, Message = "Invalid email or password" };
            }

            if (!user.IsActive)
            {
                return new AuthResponse { Success = false, Message = "Account is not active. Please confirm your email." };
            }

            // Update last login
            user.LastLogin = DateTime.Now;
            await _context.SaveChangesAsync();

            // Add login history
            _context.LoginHistories.Add(new LoginHistory
            {
                UserID = user.UserID,
                LoginTime = DateTime.Now,
                IPAddress = "0.0.0.0", // This should be updated with the actual IP
                DeviceInfo = "Web Browser" // This should be updated with the actual device info
            });
            await _context.SaveChangesAsync();

            // Generate JWT token
            return await GenerateAuthResponseAsync(user);
        }

        public async Task<AuthResponse> LoginWithGoogleAsync(string token)
        {
            // In a real implementation, validate the Google token and extract user info
            // For this example, we'll assume token validation is successful and contains necessary info
            
            // This is a placeholder - actual implementation would validate the token with Google
            var email = "demo@gmail.com"; // Example - extracted from Google token
            var name = "Google User"; // Example - extracted from Google token
            var googleId = "google123"; // Example - extracted from Google token

            // Check if user exists
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                // Create new user with Google authentication
                user = new User
                {
                    Email = email,
                    FullName = name,
                    Password = HashPassword(Guid.NewGuid().ToString()), // Random password
                    UserType = "Student",
                    IsActive = true, // Google users are active by default
                    RegistrationDate = DateTime.Now
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Add external authentication
                _context.ExternalAuthentications.Add(new ExternalAuthentication
                {
                    UserID = user.UserID,
                    Provider = "Google",
                    ProviderUserID = googleId
                });
                await _context.SaveChangesAsync();

                // Note: In real implementation, prompt for student details if they don't exist
            }
            else
            {
                // Check if Google authentication record exists
                var externalAuth = await _context.ExternalAuthentications
                    .FirstOrDefaultAsync(ea => ea.UserID == user.UserID && ea.Provider == "Google");
                
                if (externalAuth == null)
                {
                    // Link Google account
                    _context.ExternalAuthentications.Add(new ExternalAuthentication
                    {
                        UserID = user.UserID,
                        Provider = "Google",
                        ProviderUserID = googleId
                    });
                    await _context.SaveChangesAsync();
                }
            }

            // Update last login
            user.LastLogin = DateTime.Now;
            await _context.SaveChangesAsync();

            // Generate JWT token
            return await GenerateAuthResponseAsync(user);
        }

        public async Task<AuthResponse> LoginWithFacebookAsync(string token)
        {
            // Similar to Google login, but with Facebook API validation
            // This is a placeholder implementation
            
            var email = "demo@facebook.com"; // Example - extracted from Facebook token
            var name = "Facebook User"; // Example - extracted from Facebook token
            var facebookId = "facebook123"; // Example - extracted from Facebook token

            // Check if user exists
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                // Create new user with Facebook authentication
                user = new User
                {
                    Email = email,
                    FullName = name,
                    Password = HashPassword(Guid.NewGuid().ToString()), // Random password
                    UserType = "Student",
                    IsActive = true, // Facebook users are active by default
                    RegistrationDate = DateTime.Now
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Add external authentication
                _context.ExternalAuthentications.Add(new ExternalAuthentication
                {
                    UserID = user.UserID,
                    Provider = "Facebook",
                    ProviderUserID = facebookId
                });
                await _context.SaveChangesAsync();

                // Note: In real implementation, prompt for student details if they don't exist
            }
            else
            {
                // Check if Facebook authentication record exists
                var externalAuth = await _context.ExternalAuthentications
                    .FirstOrDefaultAsync(ea => ea.UserID == user.UserID && ea.Provider == "Facebook");
                
                if (externalAuth == null)
                {
                    // Link Facebook account
                    _context.ExternalAuthentications.Add(new ExternalAuthentication
                    {
                        UserID = user.UserID,
                        Provider = "Facebook",
                        ProviderUserID = facebookId
                    });
                    await _context.SaveChangesAsync();
                }
            }

            // Update last login
            user.LastLogin = DateTime.Now;
            await _context.SaveChangesAsync();

            // Generate JWT token
            return await GenerateAuthResponseAsync(user);
        }

        public async Task<bool> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                return false;
            }

            var token = await GeneratePasswordResetTokenAsync(user);
            string appUrl = _configuration["AppUrl"] ?? _configuration["AppSettings:BaseUrl"] ?? "http://havarduniversity.runasp.net";
            var resetLink = $"{appUrl}/auth/reset-password?email={email}&token={token}";
            
            await _emailService.SendEmailAsync(email, "Reset Password",
                $"Please reset your password by clicking this link: <a href='{resetLink}'>Click here</a>");

            return true;
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordViewModel model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
            {
                return false;
            }

            // Validate token (placeholder - in real implementation, validate against stored token)
            // For simplicity, we're not implementing token validation

            // Update password
            user.Password = HashPassword(model.Password);
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return true;
        }

        public Task<string> GenerateEmailConfirmationTokenAsync(User user)
        {
            // Generate a token (simplified for example)
            var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
            return Task.FromResult(token);
        }

        public async Task<bool> ConfirmEmailAsync(string userId, string token)
        {
            if (!int.TryParse(userId, out int id))
            {
                return false;
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return false;
            }

            // Validate token (simplified implementation)
            // Since this is a demo/simplified version, we'll just accept any token
            // In a real implementation, you would validate against stored tokens

            user.IsActive = true;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<AuthResponse> RegisterExternalAsync(ExternalLoginViewModel model, string provider, string providerUserId)
        {
            // This would be called after external login if the user doesn't exist and needs to provide additional info

            // Check if user with email already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return new AuthResponse { Success = false, Message = "Email already exists" };
            }

            if (!string.IsNullOrEmpty(model.StudentCode) && 
                await _context.Students.AnyAsync(s => s.StudentCode == model.StudentCode))
            {
                return new AuthResponse { Success = false, Message = "Student code already exists" };
            }

            // Create user
            var user = new User
            {
                Email = model.Email,
                FullName = model.Name,
                Password = HashPassword(Guid.NewGuid().ToString()), // Random password since they're using external auth
                PhoneNumber = model.PhoneNumber,
                UserType = "Student",
                IsActive = true, // External users are active by default
                RegistrationDate = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Create external authentication record
            _context.ExternalAuthentications.Add(new ExternalAuthentication
            {
                UserID = user.UserID,
                Provider = provider,
                ProviderUserID = providerUserId
            });
            await _context.SaveChangesAsync();

            // Create student record if student code is provided
            if (!string.IsNullOrEmpty(model.StudentCode) && 
                model.DepartmentID.HasValue && 
                model.ClassID.HasValue && 
                model.EnrollmentYear.HasValue)
            {
                _context.Students.Add(new Student
                {
                    UserID = user.UserID,
                    StudentCode = model.StudentCode,
                    DepartmentID = model.DepartmentID.Value,
                    ClassID = model.ClassID.Value,
                    EnrollmentYear = model.EnrollmentYear.Value
                });
                await _context.SaveChangesAsync();
            }

            // Generate JWT token
            return await GenerateAuthResponseAsync(user);
        }

        public async Task<bool> IsEmailConfirmedAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user != null && user.IsActive;
        }

        public async Task<User?> FindByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        public Task<string> GeneratePasswordResetTokenAsync(User user)
        {
            // Generate a token (simplified for example)
            var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
            return Task.FromResult(token);
        }

        public async Task LogoutAsync()
        {
            // In a real application, you might need to invalidate the JWT token
            // or remove refresh tokens from the database
            await Task.CompletedTask;
        }

        private Task<AuthResponse> GenerateAuthResponseAsync(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "defaultSecretKeyForDevelopment12345678901234");
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Name, user.FullName),
                    new Claim(ClaimTypes.Role, user.UserType)
                }),
                Expires = DateTime.UtcNow.AddHours(24),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwtToken = tokenHandler.WriteToken(token);

            var response = new AuthResponse
            {
                Success = true,
                Message = "Login successful",
                Token = jwtToken,
                Expiration = tokenDescriptor.Expires,
                UserId = user.UserID,
                UserType = user.UserType,
                Email = user.Email,
                FullName = user.FullName
            };
            
            return Task.FromResult(response);
        }

        public string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            var hashedInput = HashPassword(password);
            return hashedInput == hashedPassword;
        }
    }
} 