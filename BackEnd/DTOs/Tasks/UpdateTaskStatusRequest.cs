namespace BackEnd.DTOs.Tasks
{
    public class UpdateTaskStatusRequest
    {
        public int TaskId { get; set; }
        public int NewTaskStatusId { get; set; }
        public int ChangedByUserId { get; set; }
        public string? Feedback { get; set; }
    }
}