using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BackEnd.DTOs.Admin;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ICompanyRegistrationService _companyRegistrationService;
        private readonly ILoginService _loginService;
        private readonly AppDbContext _context;

        public AuthController(
            ICompanyRegistrationService companyRegistrationService,
            ILoginService loginService,
            AppDbContext context)
        {
            _companyRegistrationService = companyRegistrationService;
            _loginService = loginService;
            _context = context;
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

        [HttpGet("profile/{userId}")]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "User not found."
                });
            }

            var roleName = await _context.UserRoles
                .Where(ur => ur.UserId == user.UserId)
                .Join(
                    _context.Roles,
                    ur => ur.RoleId,
                    r => r.RoleId,
                    (ur, r) => r.RoleName
                )
                .FirstOrDefaultAsync();

            var companyName = await _context.Companies
                .Where(c => c.CompanyId == user.CompanyId)
                .Select(c => c.CompanyName)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                success = true,
                userId = user.UserId,
                fullName = user.FullName,
                email = user.Email,
                role = roleName ?? "User",
                companyName = companyName ?? "",
                profileImageUrl = user.ProfileImageUrl ?? "",
                jobTitle = user.JobTitle
            });
        }

[HttpPut("update-profile")]
public async Task<IActionResult> UpdateProfile([FromBody] AdminUpdateProfileRequest request)
{
    var firstName = request.FirstName?.Trim() ?? "";
    var lastName = request.LastName?.Trim() ?? "";

    if (
        string.IsNullOrWhiteSpace(firstName) ||
        string.IsNullOrWhiteSpace(lastName) ||
        string.IsNullOrWhiteSpace(request.JobTitle) ||
        string.IsNullOrWhiteSpace(request.CompanyName)
    )
    {
        return BadRequest(new
        {
            success = false,
            message = "First name, last name, job title, and company name are required."
        });
    }

    var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == request.UserId);

    if (user == null)
    {
        return NotFound(new
        {
            success = false,
            message = "User not found."
        });
    }

    var company = await _context.Companies.FirstOrDefaultAsync(c => c.CompanyId == user.CompanyId);

    if (company == null)
    {
        return NotFound(new
        {
            success = false,
            message = "Company not found."
        });
    }

    user.FullName = $"{firstName} {lastName}".Trim();
    user.JobTitle = request.JobTitle.Trim();
    company.CompanyName = request.CompanyName.Trim();

    await _context.SaveChangesAsync();

    return Ok(new
    {
        success = true,
        message = "Profile updated successfully.",
        fullName = user.FullName,
        jobTitle = user.JobTitle,
        companyName = company.CompanyName
    });
}

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var token = await _loginService.GeneratePasswordResetTokenAsync(request.Email);

            return Ok(new
            {
                success = true,
                message = "If email exists, reset link sent.",
                token = token
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var result = await _loginService.ResetPasswordAsync(
                request.Token,
                request.NewPassword,
                request.ConfirmPassword
            );

            if (!result)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid token or passwords."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Password reset successful."
            });
        }

        [HttpPost("verify-reset-otp")]
        public async Task<IActionResult> VerifyResetOtp([FromBody] VerifyResetOtpRequest request)
        {
            var result = await _loginService.VerifyResetOtpAsync(request.Email, request.Otp);

            if (!result)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or expired code."
                });
            }

            return Ok(new
            {
                success = true,
                message = "OTP verified successfully."
            });
        }

        [HttpPost("upload-profile-image")]
        public async Task<IActionResult> UploadProfileImage(IFormFile file, [FromForm] int userId)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "No file uploaded."
                });
            }

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "User not found."
                });
            }

            var uploadsFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "uploads",
                "profile-images"
            );

            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var safeFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, safeFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var imageUrl = $"/uploads/profile-images/{safeFileName}";
            user.ProfileImageUrl = imageUrl;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Profile image uploaded successfully.",
                imageUrl = imageUrl
            });
        }

        [HttpGet("workspace/{userId}")]
        public async Task<IActionResult> GetWorkspace(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "User not found."
                });
            }

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == user.CompanyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            return Ok(new
            {
                success = true,
                companyId = company.CompanyId,
                companyName = company.CompanyName,
                emailDomain = company.EmailDomain ?? "",
                companyPhone = company.CompanyPhone,
                address = company.Address
            });
        }

        [HttpPut("update-workspace")]
        public async Task<IActionResult> UpdateWorkspace([FromBody] AdminUpdateWorkspaceRequest request)
        {
            if (request == null || request.UserId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            var companyName = request.CompanyName?.Trim() ?? "";
            var emailDomain = request.EmailDomain?.Trim() ?? "";
            var companyPhone = request.CompanyPhone?.Trim() ?? "";
            var address = request.Address?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(companyName) ||
                string.IsNullOrWhiteSpace(companyPhone) ||
                string.IsNullOrWhiteSpace(address))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Company name, company phone, and address are required."
                });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == request.UserId);

            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "User not found."
                });
            }

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == user.CompanyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var existingCompanyWithSameName = await _context.Companies
                .FirstOrDefaultAsync(c =>
                    c.CompanyId != company.CompanyId &&
                    c.CompanyName.ToLower() == companyName.ToLower());

            if (existingCompanyWithSameName != null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Company name is already in use."
                });
            }

            company.CompanyName = companyName;
            company.EmailDomain = emailDomain;
            company.CompanyPhone = companyPhone;
            company.Address = address;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Workspace updated successfully.",
                companyName = company.CompanyName,
                emailDomain = company.EmailDomain,
                companyPhone = company.CompanyPhone,
                address = company.Address
            });
        }
    }
}