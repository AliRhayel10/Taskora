using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("TaskChangeRequests")]
    public class TaskChangeRequest
    {
        [Key]
        public int TaskChangeRequestId { get; set; }

        public int CompanyId { get; set; }

        public int TaskId { get; set; }

        public int RequestedByUserId { get; set; }

        [Required]
        [StringLength(100)]
        public string ChangeType { get; set; } = string.Empty;

        public int? OldTaskStatusId { get; set; }

        public int? NewTaskStatusId { get; set; }

        [StringLength(500)]
        public string? OldValue { get; set; }

        [StringLength(500)]
        public string? NewValue { get; set; }

        [Required]
        [StringLength(50)]
        public string RequestStatus { get; set; } = "Pending";

        public int? ReviewedByUserId { get; set; }

        [StringLength(1000)]
        public string? Reason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? ReviewedAt { get; set; }
    }
}