using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Teams")]
    public class Team
    {
        [Key]
        public int TeamId { get; set; }

        public int CompanyId { get; set; }

        [Required]
        [StringLength(100)]
        public string TeamName { get; set; } = string.Empty;

        [StringLength(255)]
        public string? Description { get; set; }

        public int? TeamLeaderUserId { get; set; }

        public bool IsActive { get; set; } = true;
    }
}