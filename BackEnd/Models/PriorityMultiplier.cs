namespace BackEnd.Models
{
    public class PriorityMultiplier
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string PriorityName { get; set; } = string.Empty;
        public decimal Multiplier { get; set; }
    }
}