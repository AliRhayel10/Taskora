namespace BackEnd.DTOs.Teams
{
    public class UpdateTeamRequest
    {
        public int CompanyId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? TeamLeaderId { get; set; }
        public int? TeamLeaderUserId { get; set; }
        public List<int>? MemberIds { get; set; }
        public bool? IsActive { get; set; }
        public bool? Status { get; set; }
    }
}
