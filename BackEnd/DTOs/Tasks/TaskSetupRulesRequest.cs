namespace BackEnd.DTOs.Tasks
{
    public class TaskSetupRulesRequest
    {
        public List<string> Statuses { get; set; } = new();
        public string DefaultStatus { get; set; } = string.Empty;
        public Dictionary<string, decimal> PriorityMultipliers { get; set; } = new();
        public Dictionary<string, decimal> ComplexityMultipliers { get; set; } = new();
        public string EffortFormula { get; set; } = string.Empty;
    }

    public class AddTaskStatusRequest
    {
        public string StatusName { get; set; } = string.Empty;
    }

    public class UpdateTaskStatusItemRequest
    {
        public string StatusName { get; set; } = string.Empty;
    }

    public class AddNamedMultiplierRequest
    {
        public string Name { get; set; } = string.Empty;
        public decimal Multiplier { get; set; }
    }

    public class UpdateNamedMultiplierRequest
    {
        public string Name { get; set; } = string.Empty;
        public decimal Multiplier { get; set; }
    }
}