public class User
{
    public int UserId { get; set; }
    public int CompanyId { get; set; }

    public string FullName { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }

    public Company Company { get; set; }
}