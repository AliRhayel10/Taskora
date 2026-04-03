namespace BackEnd.DTOs.Tasks
{
    public class TaskSetupRulesRequest
    {
        public List<string> Statuses { get; set; } = new();
        public Dictionary<string, decimal> PriorityMultipliers { get; set; } = new();
        public Dictionary<string, decimal> ComplexityMultipliers { get; set; } = new();
        public string? EffortFormula { get; set; }
    }
}