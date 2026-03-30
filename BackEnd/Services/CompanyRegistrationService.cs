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
            if (request.AdminPassword != request.ConfirmPassword)
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Passwords do not match."
                };
            }

            if (string.IsNullOrWhiteSpace(request.CompanyName) ||
                string.IsNullOrWhiteSpace(request.CompanyCode) ||
                string.IsNullOrWhiteSpace(request.EmailDomain) ||
                string.IsNullOrWhiteSpace(request.CompanyPhone) ||
                string.IsNullOrWhiteSpace(request.Address) ||
                string.IsNullOrWhiteSpace(request.AdminFullName) ||
                string.IsNullOrWhiteSpace(request.AdminEmail) ||
                string.IsNullOrWhiteSpace(request.AdminPassword))
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Please fill in all required fields."
                };
            }

            var companyNameExists = await _context.Companies
                .AnyAsync(c => c.CompanyName == request.CompanyName);

            if (companyNameExists)
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Company name already exists."
                };
            }

            var companyCodeExists = await _context.Companies
                .AnyAsync(c => c.CompanyCode == request.CompanyCode);

            if (companyCodeExists)
            {
                return new RegisterCompanyResponse
                {
                    Success = false,
                    Message = "Company code already exists."
                };
            }

            var adminEmailExists = await _context.Users
                .AnyAsync(u => u.Email == request.AdminEmail);

            if (adminEmailExists)
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
                    CompanyName = request.CompanyName,
                    CompanyCode = request.CompanyCode,
                    EmailDomain = request.EmailDomain,
                    CompanyPhone = request.CompanyPhone,
                    Address = request.Address,
                    IsActive = true
                };

                _context.Companies.Add(company);
                await _context.SaveChangesAsync();

                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword);

                var adminUser = new User
                {
                    CompanyId = company.CompanyId,
                    FullName = request.AdminFullName,
                    Email = request.AdminEmail,
                    PasswordHash = hashedPassword
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

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new RegisterCompanyResponse
                {
                    Success = true,
                    Message = "Company registered successfully."
                };
            }
catch (Exception ex)
{
    await transaction.RollbackAsync();

    var detailedMessage = ex.InnerException != null
        ? ex.InnerException.Message
        : ex.Message;

    return new RegisterCompanyResponse
    {
        Success = false,
        Message = $"Registration failed: {detailedMessage}"
    };
}
        }
    }
}