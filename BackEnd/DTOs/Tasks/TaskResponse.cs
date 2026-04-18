namespace BackEnd.DTOs.Tasks
{
    public class TaskResponse
    {
        public int TaskId { get; set; }
        public int CompanyId { get; set; }
        public int TeamId { get; set; }

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Feedback { get; set; }

        public int? AssignedToUserId { get; set; }
        public int CreatedByUserId { get; set; }

        public string AssignedUserName { get; set; } = string.Empty;
        public string AssignedUserEmail { get; set; } = string.Empty;

        public string Priority { get; set; } = string.Empty;
        public string Complexity { get; set; } = string.Empty;

        public decimal EstimatedEffortHours { get; set; }
        public decimal Weight { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }

        public int TaskStatusId { get; set; }
        public string TaskStatusName { get; set; } = string.Empty;
    }
}