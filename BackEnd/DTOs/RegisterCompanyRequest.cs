namespace BackEnd.DTOs
{
    public class RegisterCompanyRequest
    {
        public string CompanyName { get; set; } = string.Empty;
        public string CompanyCode { get; set; } = string.Empty;
        public string? EmailDomain { get; set; }
        public string CompanyPhone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;

        public string AdminFullName { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
        public string AdminJobTitle { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}