using BackEnd.DTOs;
using BackEnd.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ICompanyRegistrationService _companyRegistrationService;
        private readonly ILoginService _loginService;

        public AuthController(
            ICompanyRegistrationService companyRegistrationService,
            ILoginService loginService)
        {
            _companyRegistrationService = companyRegistrationService;
            _loginService = loginService;
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new
            {
                success = true,
                message = "API is working"
            });
        }

        [HttpPost("register-company")]
        public async Task<IActionResult> RegisterCompany([FromBody] RegisterCompanyRequest request)
        {
            if (request == null)
            {
                return BadRequest(new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Request body is required"
                });
            }

            var result = await _companyRegistrationService.RegisterCompanyAsync(request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null)
            {
                return BadRequest(new LoginResponse
                {
                    Success = false,
                    Message = "Request body is required"
                });
            }

            var result = await _loginService.LoginAsync(request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}