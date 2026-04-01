namespace BackEnd.Models
{
    public class User
    {
        public int UserId { get; set; }
        public int CompanyId { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiresAt { get; set; }

        public Company Company { get; set; } = null!;
    }
}