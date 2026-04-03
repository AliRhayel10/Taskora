using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("TaskStatuses")]
    public class TaskStatus
    {
        [Key]
        public int TaskStatusId { get; set; }

        public int CompanyId { get; set; }

        [Required]
        [StringLength(100)]
        public string StatusName { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }

        public bool IsDefault { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}