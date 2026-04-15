namespace BackEnd.DTOs.Tasks
{
    public class TaskSetupRulesResponse
    {
        public List<string> Statuses { get; set; } = new();
        public string DefaultStatus { get; set; } = string.Empty;
        public Dictionary<string, decimal> PriorityMultipliers { get; set; } = new();
        public Dictionary<string, decimal> ComplexityMultipliers { get; set; } = new();
        public string EffortFormula { get; set; } = string.Empty;
    }
}