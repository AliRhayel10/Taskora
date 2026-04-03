namespace BackEnd.DTOs.Admin
{
    public class AdminUpdateWorkspaceRequest
    {
        public int UserId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string EmailDomain { get; set; } = string.Empty;
        public string CompanyPhone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }
}