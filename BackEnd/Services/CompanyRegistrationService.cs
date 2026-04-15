using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services
{
    public class CompanyRegistrationService : ICompanyRegistrationService
    {
        private readonly AppDbContext _context;

        public CompanyRegistrationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<RegisterCompanyResponse> RegisterCompanyAsync(RegisterCompanyRequest request)
        {
            if (request == null)
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Request data is required."
                };
            }

            if (string.IsNullOrWhiteSpace(request.CompanyName) ||
                string.IsNullOrWhiteSpace(request.CompanyCode) ||
                string.IsNullOrWhiteSpace(request.CompanyPhone) ||
                string.IsNullOrWhiteSpace(request.Address) ||
                string.IsNullOrWhiteSpace(request.AdminFullName) ||
                string.IsNullOrWhiteSpace(request.AdminEmail) ||
                string.IsNullOrWhiteSpace(request.AdminPassword) ||
                string.IsNullOrWhiteSpace(request.ConfirmPassword))
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Please fill in all required fields."
                };
            }

            if (request.AdminPassword != request.ConfirmPassword)
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Passwords do not match."
                };
            }

            var companyName = request.CompanyName.Trim();
            var companyCode = request.CompanyCode.Trim();
            var emailDomain = request.EmailDomain?.Trim() ?? "";
            var companyPhone = request.CompanyPhone.Trim();
            var address = request.Address.Trim();
            var adminFullName = request.AdminFullName.Trim();
            var adminEmail = request.AdminEmail.Trim().ToLower();

            if (await _context.Companies.AnyAsync(c => c.CompanyName == companyName))
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Company name already exists."
                };
            }

            if (await _context.Companies.AnyAsync(c => c.CompanyCode == companyCode))
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Company code already exists."
                };
            }

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == adminEmail))
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Admin email is already used."
                };
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var company = new Company
                {
                    CompanyName = companyName,
                    CompanyCode = companyCode,
                    EmailDomain = emailDomain,
                    CompanyPhone = companyPhone,
                    Address = address,
                    IsActive = true
                };

                _context.Companies.Add(company);
                await _context.SaveChangesAsync();

                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword);

                var adminUser = new User
                {
                    CompanyId = company.CompanyId,
                    FullName = adminFullName,
                    Email = adminEmail,
                    PasswordHash = hashedPassword,
                    JobTitle = "Administrator"
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                var companyAdminRole = await _context.Roles
                    .FirstOrDefaultAsync(r => r.RoleName == "CompanyAdmin");

                if (companyAdminRole == null)
                {
                    await transaction.RollbackAsync();

                    return new RegisterCompanyResponse
                    {
                        Success = false,
                        Message = "CompanyAdmin role was not found in the database."
                    };
                }

                var userRole = new UserRole
                {
                    UserId = adminUser.UserId,
                    RoleId = companyAdminRole.RoleId
                };

                _context.UserRoles.Add(userRole);

                _context.PriorityMultipliers.AddRange(
                    new PriorityMultiplier
                    {
                        CompanyId = company.CompanyId,
                        PriorityName = "Low",
                        Multiplier = 1.00m
                    },
                    new PriorityMultiplier
                    {
                        CompanyId = company.CompanyId,
                        PriorityName = "Medium",
                        Multiplier = 1.50m
                    },
                    new PriorityMultiplier
                    {
                        CompanyId = company.CompanyId,
                        PriorityName = "High",
                        Multiplier = 2.00m
                    }
                );

                _context.ComplexityMultipliers.AddRange(
                    new ComplexityMultiplier
                    {
                        CompanyId = company.CompanyId,
                        ComplexityName = "Simple",
                        Multiplier = 1.00m
                    },
                    new ComplexityMultiplier
                    {
                        CompanyId = company.CompanyId,
                        ComplexityName = "Medium",
                        Multiplier = 1.50m
                    },
                    new ComplexityMultiplier
                    {
                        CompanyId = company.CompanyId,
                        ComplexityName = "Complex",
                        Multiplier = 2.00m
                    }
                );

                _context.TaskStatuses.AddRange(
                    new BackEnd.Models.TaskStatus
                    {
                        CompanyId = company.CompanyId,
                        StatusName = "New",
                        DisplayOrder = 1,
                        IsDefault = true,
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    },
                    new BackEnd.Models.TaskStatus
                    {
                        CompanyId = company.CompanyId,
                        StatusName = "Acknowledged",
                        DisplayOrder = 2,
                        IsDefault = false,
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    },
                    new BackEnd.Models.TaskStatus
                    {
                        CompanyId = company.CompanyId,
                        StatusName = "Pending",
                        DisplayOrder = 3,
                        IsDefault = false,
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    },
                    new BackEnd.Models.TaskStatus
                    {
                        CompanyId = company.CompanyId,
                        StatusName = "Done",
                        DisplayOrder = 4,
                        IsDefault = false,
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    }
                );

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new RegisterCompanyResponse
                {
                    Success = true,
                    Message = "Company registered successfully.",
                    UserId = adminUser.UserId,
                    FullName = adminUser.FullName,
                    Email = adminUser.Email,
                    JobTitle = adminUser.JobTitle,
                    Role = "CompanyAdmin"
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = $"Registration failed: {ex.Message}"
                };
            }
        }
    }
}