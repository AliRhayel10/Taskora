namespace BackEnd.DTOs.Teams
{
    public class TeamResponse
    {
        public int TeamId { get; set; }
        public int CompanyId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? TeamLeaderUserId { get; set; }
        public string TeamLeaderName { get; set; } = string.Empty;
        public int TasksCount { get; set; }
        public bool IsActive { get; set; }
        public List<int> MemberIds { get; set; } = new();
    }
}
