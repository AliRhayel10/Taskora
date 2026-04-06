using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BackEnd.DTOs.Admin;
using BackEnd.Models;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ICompanyRegistrationService _companyRegistrationService;
        private readonly ILoginService _loginService;
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;

        public AuthController(
            ICompanyRegistrationService companyRegistrationService,
            ILoginService loginService,
            AppDbContext context,
            EmailService emailService)
        {
            _companyRegistrationService = companyRegistrationService;
            _loginService = loginService;
            _context = context;
            _emailService = emailService;
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

        [HttpPost("create-user")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            var fullName = request.FullName?.Trim() ?? "";
            var jobTitle = request.JobTitle?.Trim() ?? "";
            var email = request.Email?.Trim().ToLower() ?? "";
            var password = request.Password ?? "";
            var roleName = request.Role?.Trim() ?? "";

            if (
                request.CompanyId <= 0 ||
                string.IsNullOrWhiteSpace(fullName) ||
                string.IsNullOrWhiteSpace(jobTitle) ||
                string.IsNullOrWhiteSpace(email) ||
                string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(roleName)
            )
            {
                return BadRequest(new
                {
                    success = false,
                    message = "CompanyId, full name, job title, email, password, and role are required."
                });
            }

            var companyExists = await _context.Companies.AnyAsync(c => c.CompanyId == request.CompanyId);

            if (!companyExists)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (existingUser != null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A user with this email already exists."
                });
            }

            var normalizedRole = roleName.ToLower() switch
            {
                "team leader" => "Team Leader",
                "employee" => "Employee",
                _ => ""
            };

            if (string.IsNullOrWhiteSpace(normalizedRole))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid role. Allowed values are Team Leader or Employee."
                });
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == normalizedRole);

            if (role == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Role '{normalizedRole}' was not found in the database."
                });
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);

            var user = new User
            {
                CompanyId = request.CompanyId,
                FullName = fullName,
                Email = email,
                PasswordHash = hashedPassword,
                JobTitle = jobTitle
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var userRole = new UserRole
            {
                UserId = user.UserId,
                RoleId = role.RoleId
            };

            _context.UserRoles.Add(userRole);
            await _context.SaveChangesAsync();

            if (request.SendInvitation)
            {
                try
                {
                    await _emailService.SendUserInvitationAsync(
                        user.Email,
                        fullName,
                        password,
                        normalizedRole
                    );
                }
                catch
                {
                }
            }

            return Ok(new
            {
                success = true,
                message = "User created successfully.",
                userId = user.UserId
            });
        }

        [HttpGet("company-users/{companyId}")]
        public async Task<IActionResult> GetUsersByCompany(
            int companyId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 6,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 6;

            var query = _context.Users
                .Where(u => u.CompanyId == companyId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLower();

                query = query.Where(u =>
                    u.FullName != null &&
                    u.FullName.ToLower().Contains(normalizedSearch));
            }

            var totalUsers = await query.CountAsync();

            var users = await query
                .OrderBy(u => u.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    userId = u.UserId,
                    fullName = u.FullName,
                    email = u.Email,
                    role = _context.UserRoles
                        .Where(ur => ur.UserId == u.UserId)
                        .Join(
                            _context.Roles,
                            ur => ur.RoleId,
                            r => r.RoleId,
                            (ur, r) => r.RoleName
                        )
                        .FirstOrDefault() ?? "Employee",
                    jobType = u.JobTitle,
                    team = "Unassigned",
                    isActive = true
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling(totalUsers / (double)pageSize);

            return Ok(new
            {
                success = true,
                users,
                pagination = new
                {
                    page,
                    pageSize,
                    totalUsers,
                    totalPages
                }
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
            if (request == null || request.UserId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            var firstName = request.FirstName?.Trim() ?? "";
            var lastName = request.LastName?.Trim() ?? "";
            var jobTitle = request.JobTitle?.Trim() ?? "";
            var companyName = request.CompanyName?.Trim() ?? "";
            var email = request.Email?.Trim() ?? "";
            var currentPassword = request.CurrentPassword?.Trim() ?? "";

            if (
                string.IsNullOrWhiteSpace(firstName) ||
                string.IsNullOrWhiteSpace(lastName) ||
                string.IsNullOrWhiteSpace(jobTitle) ||
                string.IsNullOrWhiteSpace(companyName) ||
                string.IsNullOrWhiteSpace(email)
            )
            {
                return BadRequest(new
                {
                    success = false,
                    message = "First name, last name, job title, company name, and email are required."
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

            var emailChanged = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);

            user.FullName = $"{firstName} {lastName}".Trim();
            user.JobTitle = jobTitle;
            company.CompanyName = companyName;

            if (emailChanged)
            {
                if (string.IsNullOrWhiteSpace(currentPassword))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid email or password."
                    });
                }

                var isPasswordValid = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);

                if (!isPasswordValid)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid email or password."
                    });
                }

                var existingUserWithSameEmail = await _context.Users
                    .FirstOrDefaultAsync(u =>
                        u.UserId != user.UserId &&
                        u.Email.ToLower() == email.ToLower());

                if (existingUserWithSameEmail != null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid email or password."
                    });
                }

                var otp = Random.Shared.Next(100000, 999999).ToString();

                user.PendingEmail = email;
                user.EmailChangeOtp = otp;
                user.EmailChangeOtpExpiresAt = DateTime.UtcNow.AddMinutes(10);

                await _context.SaveChangesAsync();
                await _emailService.SendEmailChangeOtpAsync(email, otp);

                return Ok(new
                {
                    success = true,
                    requiresOtp = true,
                    message = "OTP sent to your new email."
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Profile updated successfully.",
                fullName = user.FullName,
                email = user.Email,
                jobTitle = user.JobTitle,
                companyName = company.CompanyName
            });
        }

        [HttpPost("verify-email-change-otp")]
        public async Task<IActionResult> VerifyEmailChangeOtp([FromBody] VerifyEmailChangeOtpRequest request)
        {
            if (request == null || request.UserId <= 0 || string.IsNullOrWhiteSpace(request.Otp))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or expired code."
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

            if (
                string.IsNullOrWhiteSpace(user.PendingEmail) ||
                string.IsNullOrWhiteSpace(user.EmailChangeOtp) ||
                user.EmailChangeOtpExpiresAt == null ||
                user.EmailChangeOtpExpiresAt <= DateTime.UtcNow ||
                user.EmailChangeOtp != request.Otp.Trim()
            )
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or expired code."
                });
            }

            var existingUserWithSameEmail = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.UserId != user.UserId &&
                    u.Email.ToLower() == user.PendingEmail.ToLower());

            if (existingUserWithSameEmail != null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or expired code."
                });
            }

            user.Email = user.PendingEmail;
            user.PendingEmail = null;
            user.EmailChangeOtp = null;
            user.EmailChangeOtpExpiresAt = null;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Email updated successfully."
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
