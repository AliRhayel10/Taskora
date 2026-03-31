using BackEnd.DTOs;

namespace BackEnd.Services
{
    public interface ILoginService
    {
        Task<LoginResponse> LoginAsync(LoginRequest request);
    }
}