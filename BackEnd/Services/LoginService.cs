using BackEnd.Data;
using BackEnd.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services
{
    public class LoginService : ILoginService
    {
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;

        public LoginService(AppDbContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        private async Task ClearExpiredPasswordResetTokensAsync()
        {
            var expiredUsers = await _context.Users
                .Where(user =>
                    user.PasswordResetTokenExpiresAt != null &&
                    user.PasswordResetTokenExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            if (!expiredUsers.Any())
            {
                return;
            }

            foreach (var expiredUser in expiredUsers)
            {
                expiredUser.PasswordResetToken = null;
                expiredUser.PasswordResetTokenExpiresAt = null;
            }

            await _context.SaveChangesAsync();
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return new LoginResponse
                {
                    Success = false,
                    Message = "Email and password are required."
                };
            }

            var email = request.Email.Trim().ToLower();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
            {
                return new LoginResponse
                {
                    Success = false,
                    Message = "Invalid email or password."
                };
            }

            var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

            if (!passwordValid)
            {
                return new LoginResponse
                {
                    Success = false,
                    Message = "Invalid email or password."
                };
            }

            var roleName = await _context.UserRoles
                .Where(ur => ur.UserId == user.UserId)
                .Join(
                    _context.Roles,
                    ur => ur.RoleId,
                    r => r.RoleId,
                    (ur, r) => r.RoleName
                )
                .FirstOrDefaultAsync();

            var companyName = await _context.Companies
                .Where(c => c.CompanyId == user.CompanyId)
                .Select(c => c.CompanyName)
                .FirstOrDefaultAsync();

return new LoginResponse
{
    Success = true,
    Message = "Login successful.",
    UserId = user.UserId,
    CompanyId = user.CompanyId,
    CompanyName = companyName ?? string.Empty,
    FullName = user.FullName,
    Email = user.Email,
    Role = roleName ?? "User",
    ProfileImageUrl = user.ProfileImageUrl,
    JobTitle = user.JobTitle,
    Token = string.Empty
};
        }

        public async Task<string?> GeneratePasswordResetTokenAsync(string email)
        {
            await ClearExpiredPasswordResetTokensAsync();

            if (string.IsNullOrWhiteSpace(email))
                return null;

            email = email.Trim().ToLower();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
                return null;

            var otp = new Random().Next(100000, 999999).ToString();

            user.PasswordResetToken = otp;
            user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);

            await _context.SaveChangesAsync();

            await _emailService.SendOtpAsync(user.Email, otp);

            return otp;
        }

        public async Task<bool> ResetPasswordAsync(string token, string newPassword, string confirmPassword)
        {
            await ClearExpiredPasswordResetTokensAsync();

            if (string.IsNullOrWhiteSpace(token))
                return false;

            if (string.IsNullOrWhiteSpace(newPassword) ||
                string.IsNullOrWhiteSpace(confirmPassword))
                return false;

            if (newPassword != confirmPassword)
                return false;

            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.PasswordResetToken == token &&
                    u.PasswordResetTokenExpiresAt != null &&
                    u.PasswordResetTokenExpiresAt > DateTime.UtcNow);

            if (user == null)
                return false;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiresAt = null;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> VerifyResetOtpAsync(string email, string otp)
        {
            await ClearExpiredPasswordResetTokensAsync();

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(otp))
                return false;

            email = email.Trim().ToLower();

            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email.ToLower() == email &&
                u.PasswordResetToken == otp &&
                u.PasswordResetTokenExpiresAt != null &&
                u.PasswordResetTokenExpiresAt > DateTime.UtcNow);

            if (user == null)
                return false;

            return true;
        }
    }
}