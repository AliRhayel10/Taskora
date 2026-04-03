namespace BackEnd.DTOs.Tasks
{
    public class CreateTaskRequest
    {
        public int CompanyId { get; set; }
        public int TeamId { get; set; }
        public int AssignedToUserId { get; set; }
        public int CreatedByUserId { get; set; }

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        public string Priority { get; set; } = string.Empty;
        public string Complexity { get; set; } = string.Empty;

        public decimal EstimatedEffortHours { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime DueDate { get; set; }

        public int? TaskStatusId { get; set; }
    }
}