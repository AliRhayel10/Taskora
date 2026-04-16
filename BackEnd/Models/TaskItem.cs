using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Tasks")]
    public class TaskItem
    {
        [Key]
        public int TaskId { get; set; }

        public int CompanyId { get; set; }

        public int TeamId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int? AssignedToUserId { get; set; }

        public int CreatedByUserId { get; set; }

        [Required]
        [StringLength(20)]
        public string Priority { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Complexity { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal EstimatedEffortHours { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal Weight { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }

        public int TaskStatusId { get; set; }

        [ForeignKey(nameof(TaskStatusId))]
        public TaskStatus? TaskStatus { get; set; }

        [ForeignKey(nameof(AssignedToUserId))]
        public User? AssignedToUser { get; set; }

        [ForeignKey(nameof(CreatedByUserId))]
        public User? CreatedByUser { get; set; }
    }
}