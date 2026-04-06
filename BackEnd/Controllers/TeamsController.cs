using BackEnd.Data;
using BackEnd.DTOs.Teams;
using BackEnd.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeamsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("company/{companyId:int}")]
        public async Task<IActionResult> GetTeamsByCompany(
            int companyId,
            [FromQuery] string? search = null)
        {
            var normalizedSearch = search?.Trim().ToLower();

            var teams = await (
                from team in _context.Teams
                join leader in _context.Users
                    on team.TeamLeaderUserId equals leader.UserId into leaderJoin
                from leader in leaderJoin.DefaultIfEmpty()
                where team.CompanyId == companyId && team.IsActive
                select new
                {
                    teamId = team.TeamId,
                    companyId = team.CompanyId,
                    teamName = team.TeamName,
                    description = team.Description,
                    teamLeaderUserId = team.TeamLeaderUserId,
                    teamLeaderId = team.TeamLeaderUserId,
                    teamLeaderName = leader != null ? leader.FullName : string.Empty,
                    tasksCount = _context.Tasks.Count(task => task.TeamId == team.TeamId),
                    isActive = team.IsActive,
                    memberIds = _context.TeamMembers
                        .Where(teamMember => teamMember.TeamId == team.TeamId && teamMember.IsActive)
                        .Select(teamMember => teamMember.UserId)
                        .ToList()
                })
                .OrderBy(team => team.teamName)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                teams = teams.Where(team =>
                    (team.teamName ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.description ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.teamLeaderName ?? string.Empty).ToLower().Contains(normalizedSearch))
                    .ToList();
            }

            return Ok(teams);
        }

        [HttpGet("company/{companyId:int}/members")]
        public async Task<IActionResult> GetCompanyMembers(
            int companyId,
            [FromQuery] string? search = null,
            [FromQuery] bool teamLeadersOnly = false)
        {
            var normalizedSearch = search?.Trim().ToLower();

            var rawMembers = await (
                from user in _context.Users
                where user.CompanyId == companyId
                join userRole in _context.UserRoles
                    on user.UserId equals userRole.UserId into userRoleJoin
                from userRole in userRoleJoin.DefaultIfEmpty()
                join role in _context.Roles
                    on userRole.RoleId equals role.RoleId into roleJoin
                from role in roleJoin.DefaultIfEmpty()
                select new
                {
                    userId = user.UserId,
                    fullName = user.FullName,
                    email = user.Email,
                    role = role != null ? role.RoleName : "Employee",
                    jobTitle = user.JobTitle
                }
            ).ToListAsync();

            static string NormalizeRole(string? value)
            {
                return (value ?? string.Empty)
                    .Trim()
                    .ToLower()
                    .Replace("_", " ")
                    .Replace("-", " ");
            }

            static bool IsTeamLeader(string? value)
            {
                var normalizedRole = NormalizeRole(value);
                return normalizedRole == "team leader" || normalizedRole == "teamleader";
            }

            static bool IsEmployee(string? value)
            {
                return NormalizeRole(value) == "employee";
            }

            var filteredMembers = rawMembers
                .Where(member => IsEmployee(member.role) || IsTeamLeader(member.role));

            if (teamLeadersOnly)
            {
                filteredMembers = filteredMembers.Where(member => IsTeamLeader(member.role));
            }

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                filteredMembers = filteredMembers.Where(member =>
                    (member.fullName ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (member.email ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (member.role ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (member.jobTitle ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            var result = filteredMembers
                .GroupBy(member => member.userId)
                .Select(group => group.First())
                .Select(member => new
                {
                    userId = member.userId,
                    fullName = member.fullName,
                    email = member.email,
                    role = IsTeamLeader(member.role) ? "Team Leader" : "Employee",
                    jobTitle = member.jobTitle,
                    jobType = member.jobTitle
                })
                .OrderBy(member => member.fullName)
                .ThenBy(member => member.email)
                .ToList();

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            if (request.CompanyId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "CompanyId is required."
                });
            }

            var trimmedTeamName = request.TeamName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedTeamName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Team name is required."
                });
            }

            var companyExists = await _context.Companies.AnyAsync(company => company.CompanyId == request.CompanyId);

            if (!companyExists)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var duplicateTeamExists = await _context.Teams.AnyAsync(team =>
                team.CompanyId == request.CompanyId &&
                team.IsActive &&
                team.TeamName.ToLower() == trimmedTeamName.ToLower());

            if (duplicateTeamExists)
            {
                return Conflict(new
                {
                    success = false,
                    message = "A team with this name already exists."
                });
            }

            if (request.TeamLeaderUserId.HasValue)
            {
                var leaderExists = await _context.Users.AnyAsync(user =>
                    user.UserId == request.TeamLeaderUserId.Value &&
                    user.CompanyId == request.CompanyId);

                if (!leaderExists)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Selected team leader does not belong to this company."
                    });
                }
            }

            var team = new Team
            {
                CompanyId = request.CompanyId,
                TeamName = trimmedTeamName,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                TeamLeaderUserId = request.TeamLeaderUserId,
                IsActive = true
            };

            _context.Teams.Add(team);
            await _context.SaveChangesAsync();

            if (team.TeamLeaderUserId.HasValue)
            {
                var leaderMember = new TeamMember
                {
                    CompanyId = team.CompanyId,
                    TeamId = team.TeamId,
                    UserId = team.TeamLeaderUserId.Value,
                    JoinedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.TeamMembers.Add(leaderMember);
                await _context.SaveChangesAsync();
            }

            var leaderName = string.Empty;

            if (team.TeamLeaderUserId.HasValue)
            {
                leaderName = await _context.Users
                    .Where(user => user.UserId == team.TeamLeaderUserId.Value)
                    .Select(user => user.FullName)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }

            return Ok(new
            {
                success = true,
                message = "Team created successfully.",
                team = new
                {
                    teamId = team.TeamId,
                    companyId = team.CompanyId,
                    teamName = team.TeamName,
                    description = team.Description,
                    teamLeaderUserId = team.TeamLeaderUserId,
                    teamLeaderId = team.TeamLeaderUserId,
                    teamLeaderName = leaderName,
                    tasksCount = 0,
                    isActive = team.IsActive,
                    memberIds = team.TeamLeaderUserId.HasValue
                        ? new List<int> { team.TeamLeaderUserId.Value }
                        : new List<int>()
                }
            });
        }

        [HttpPut("{teamId:int}")]
        public async Task<IActionResult> UpdateTeam(int teamId, [FromBody] UpdateTeamRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            var team = await _context.Teams.FirstOrDefaultAsync(t => t.TeamId == teamId);

            if (team == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Team not found."
                });
            }

            if (request.CompanyId > 0 && request.CompanyId != team.CompanyId)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "CompanyId does not match this team."
                });
            }

            var trimmedTeamName = request.TeamName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedTeamName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Team name is required."
                });
            }

            var duplicateTeamExists = await _context.Teams.AnyAsync(existingTeam =>
                existingTeam.TeamId != teamId &&
                existingTeam.CompanyId == team.CompanyId &&
                existingTeam.IsActive &&
                existingTeam.TeamName.ToLower() == trimmedTeamName.ToLower());

            if (duplicateTeamExists)
            {
                return Conflict(new
                {
                    success = false,
                    message = "A team with this name already exists."
                });
            }

            var requestedLeaderId = request.TeamLeaderId ?? request.TeamLeaderUserId;

            if (requestedLeaderId.HasValue)
            {
                var leaderExists = await _context.Users.AnyAsync(user =>
                    user.UserId == requestedLeaderId.Value &&
                    user.CompanyId == team.CompanyId);

                if (!leaderExists)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Selected team leader does not belong to this company."
                    });
                }
            }

            var requestedMemberIds = (request.MemberIds ?? new List<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (requestedLeaderId.HasValue && !requestedMemberIds.Contains(requestedLeaderId.Value))
            {
                requestedMemberIds.Add(requestedLeaderId.Value);
            }

            if (requestedMemberIds.Count > 0)
            {
                var validMemberIds = await _context.Users
                    .Where(user => user.CompanyId == team.CompanyId && requestedMemberIds.Contains(user.UserId))
                    .Select(user => user.UserId)
                    .ToListAsync();

                var invalidMemberIds = requestedMemberIds.Except(validMemberIds).ToList();

                if (invalidMemberIds.Count > 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "One or more selected members do not belong to this company."
                    });
                }
            }

            team.TeamName = trimmedTeamName;
            team.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            team.TeamLeaderUserId = requestedLeaderId;

            if (request.IsActive.HasValue)
            {
                team.IsActive = request.IsActive.Value;
            }
            else if (request.Status.HasValue)
            {
                team.IsActive = request.Status.Value;
            }

            var existingMembers = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == team.TeamId && teamMember.IsActive)
                .ToListAsync();

            foreach (var member in existingMembers)
            {
                member.IsActive = false;
            }

            if (requestedMemberIds.Count > 0)
            {
                var newMembers = requestedMemberIds
                    .Distinct()
                    .Select(memberId => new TeamMember
                    {
                        CompanyId = team.CompanyId,
                        TeamId = team.TeamId,
                        UserId = memberId,
                        JoinedAt = DateTime.UtcNow,
                        IsActive = true
                    });

                await _context.TeamMembers.AddRangeAsync(newMembers);
            }

            await _context.SaveChangesAsync();

            var leaderName = string.Empty;

            if (team.TeamLeaderUserId.HasValue)
            {
                leaderName = await _context.Users
                    .Where(user => user.UserId == team.TeamLeaderUserId.Value)
                    .Select(user => user.FullName)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }

            return Ok(new
            {
                success = true,
                message = "Team updated successfully.",
                team = new
                {
                    teamId = team.TeamId,
                    companyId = team.CompanyId,
                    teamName = team.TeamName,
                    description = team.Description,
                    teamLeaderUserId = team.TeamLeaderUserId,
                    teamLeaderId = team.TeamLeaderUserId,
                    teamLeaderName = leaderName,
                    tasksCount = await _context.Tasks.CountAsync(task => task.TeamId == team.TeamId),
                    isActive = team.IsActive,
                    memberIds = requestedMemberIds
                }
            });
        }

        [HttpDelete("{teamId:int}")]
        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            var team = await _context.Teams.FirstOrDefaultAsync(t => t.TeamId == teamId);

            if (team == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Team not found."
                });
            }

            team.IsActive = false;

            var existingMembers = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == team.TeamId && teamMember.IsActive)
                .ToListAsync();

            foreach (var member in existingMembers)
            {
                member.IsActive = false;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Team deleted successfully."
            });
        }
    }
}