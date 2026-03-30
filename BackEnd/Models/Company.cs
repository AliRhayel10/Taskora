public class Company
{
    public int CompanyId { get; set; }
    public string CompanyName { get; set; }
    public string CompanyCode { get; set; }
    public string EmailDomain { get; set; }
    public string CompanyPhone { get; set; }
    public string Address { get; set; }
    public bool IsActive { get; set; } = true;
}