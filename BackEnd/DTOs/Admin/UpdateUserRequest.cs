namespace BackEnd.DTOs.Admin
{
    public class UpdateUserRequest
    {
        public int UserId { get; set; }
        public string Role { get; set; } = "";
        public string JobTitle { get; set; } = "";
        public bool IsActive { get; set; }
    }
}