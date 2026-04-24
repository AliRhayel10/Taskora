namespace BackEnd.DTOs.Tasks
{
    public class ReviewTaskChangeRequestRequest
    {
        public int ReviewedByUserId { get; set; }
        public string Decision { get; set; } = string.Empty;
        public string? ReviewNote { get; set; }
        public int? RequestedAssigneeUserId { get; set; }
    }
}