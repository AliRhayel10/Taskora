namespace BackEnd.DTOs.Tasks
{
    public class CreateTaskChangeRequestRequest
    {
        public int TaskId { get; set; }
        public int RequestedByUserId { get; set; }
        public string ChangeType { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}