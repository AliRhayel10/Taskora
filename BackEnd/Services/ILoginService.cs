using BackEnd.DTOs;

namespace BackEnd.Services
{
    public interface ILoginService
    {
        Task<LoginResponse> LoginAsync(LoginRequest request);
        Task<string?> GeneratePasswordResetTokenAsync(string email);
        Task<bool> ResetPasswordAsync(string token, string newPassword, string confirmPassword);
        Task<bool> VerifyResetOtpAsync(string email, string otp);
    }
}