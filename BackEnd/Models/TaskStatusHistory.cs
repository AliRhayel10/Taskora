using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("TaskStatusHistory")]
    public class TaskStatusHistory
    {
        [Key]
        public int TaskStatusHistoryId { get; set; }

        public int CompanyId { get; set; }

        public int TaskId { get; set; }

        public int? OldTaskStatusId { get; set; }

        public int NewTaskStatusId { get; set; }

        public int ChangedByUserId { get; set; }

        public DateTime ChangedAt { get; set; }
    }
}