using BackEnd.DTOs;

namespace BackEnd.Services
{
    public interface ICompanyRegistrationService
    {
        Task<RegisterCompanyResponse> RegisterCompanyAsync(RegisterCompanyRequest request);
    }
}