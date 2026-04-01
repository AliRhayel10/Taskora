using BackEnd.Data;
using BackEnd.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services
{
    public class LoginService : ILoginService
    {
        private readonly AppDbContext _context;

        public LoginService(AppDbContext context)
        {
            _context = context;
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

            return new LoginResponse
            {
                Success = true,
                Message = "Login successful.",
                UserId = user.UserId,
                CompanyId = user.CompanyId,
                FullName = user.FullName,
                Email = user.Email,
                Role = roleName ?? "User",
                Token = string.Empty
            };
        }

        public async Task<string?> GeneratePasswordResetTokenAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;

            email = email.Trim().ToLower();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
                return null;

            var token = Guid.NewGuid().ToString();

            user.PasswordResetToken = token;
            user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(15);

            await _context.SaveChangesAsync();

            return token;
        }

        public async Task<bool> ResetPasswordAsync(string token, string newPassword, string confirmPassword)
        {
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
    }
}