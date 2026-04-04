namespace BackEnd.DTOs.Teams
{
    public class CreateTeamRequest
    {
        public int CompanyId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? TeamLeaderUserId { get; set; }
    }
}
