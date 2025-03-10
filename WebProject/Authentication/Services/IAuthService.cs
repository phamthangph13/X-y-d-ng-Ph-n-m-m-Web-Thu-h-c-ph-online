using System.Security.Claims;
using WebProject.Authentication.Models;
using WebProject.Models.Entities;

namespace WebProject.Authentication.Services
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAsync(RegisterViewModel model);
        Task<AuthResponse> LoginAsync(LoginViewModel model);
        Task<AuthResponse> LoginWithGoogleAsync(string token);
        Task<AuthResponse> LoginWithFacebookAsync(string token);
        Task<bool> ForgotPasswordAsync(string email);
        Task<bool> ResetPasswordAsync(ResetPasswordViewModel model);
        Task<string> GenerateEmailConfirmationTokenAsync(User user);
        Task<bool> ConfirmEmailAsync(string userId, string token);
        Task<AuthResponse> RegisterExternalAsync(ExternalLoginViewModel model, string provider, string providerUserId);
        Task<bool> IsEmailConfirmedAsync(string email);
        Task<User?> FindByEmailAsync(string email);
        Task<string> GeneratePasswordResetTokenAsync(User user);
        Task LogoutAsync();
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
    }
} 