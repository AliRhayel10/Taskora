using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("TeamMembers")]
    public class TeamMember
    {
        [Key]
        public int TeamMemberId { get; set; }

        public int CompanyId { get; set; }

        public int TeamId { get; set; }

        public int UserId { get; set; }

        public DateTime? JoinedAt { get; set; }

        public bool IsActive { get; set; } = true;
    }
}