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

            var teams = await _context.Teams
                .Where(team => team.CompanyId == companyId)
                .OrderBy(team => team.TeamName)
                .ToListAsync();

            var leaderIds = teams
                .Where(team => team.TeamLeaderUserId.HasValue)
                .Select(team => team.TeamLeaderUserId!.Value)
                .Distinct()
                .ToList();

            var leadersById = leaderIds.Count == 0
                ? new Dictionary<int, string>()
                : await _context.Users
                    .Where(user => leaderIds.Contains(user.UserId))
                    .ToDictionaryAsync(user => user.UserId, user => user.FullName ?? string.Empty);

            var teamIds = teams.Select(team => team.TeamId).ToList();

            var memberRows = teamIds.Count == 0
                ? new List<TeamMember>()
                : await _context.TeamMembers
                    .Where(teamMember => teamIds.Contains(teamMember.TeamId))
                    .ToListAsync();

            var memberIdsByTeamId = memberRows
                .GroupBy(teamMember => teamMember.TeamId)
                .ToDictionary(
                    group => group.Key,
                    group => group
                        .Where(teamMember => teamMember.IsActive)
                        .Select(teamMember => teamMember.UserId)
                        .Distinct()
                        .ToList()
                );

            var taskCountsByTeamId = teamIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.Tasks
                    .Where(task => teamIds.Contains(task.TeamId))
                    .GroupBy(task => task.TeamId)
                    .Select(group => new { TeamId = group.Key, Count = group.Count() })
                    .ToDictionaryAsync(item => item.TeamId, item => item.Count);

            var result = teams
                .Select(team =>
                {
                    var leaderId = team.TeamLeaderUserId;
                    var leaderName = string.Empty;

                    if (team.IsActive &&
                        leaderId.HasValue &&
                        leadersById.TryGetValue(leaderId.Value, out var resolvedLeaderName))
                    {
                        leaderName = resolvedLeaderName;
                    }

                    var memberIds = memberIdsByTeamId.TryGetValue(team.TeamId, out var resolvedMemberIds)
                        ? resolvedMemberIds
                        : new List<int>();

                    if (leaderId.HasValue)
                    {
                        memberIds = memberIds
                            .Where(userId => userId != leaderId.Value)
                            .ToList();
                    }

                    return new
                    {
                        teamId = team.TeamId,
                        companyId = team.CompanyId,
                        teamName = team.TeamName,
                        description = team.Description,
                        teamLeaderUserId = leaderId,
                        teamLeaderId = leaderId,
                        teamLeaderName = leaderName,
                        tasksCount = taskCountsByTeamId.TryGetValue(team.TeamId, out var count) ? count : 0,
                        isActive = team.IsActive,
                        memberIds
                    };
                })
                .Where(team =>
                    string.IsNullOrWhiteSpace(normalizedSearch) ||
                    (team.teamName ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.description ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.teamLeaderName ?? string.Empty).ToLower().Contains(normalizedSearch))
                .ToList();

            return Ok(result);
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

            var filteredMembers = rawMembers.Where(member =>
                teamLeadersOnly
                    ? IsTeamLeader(member.role)
                    : IsEmployee(member.role));

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
                return BadRequest(new { success = false, message = "Request body is required." });
            }

            if (request.CompanyId <= 0)
            {
                return BadRequest(new { success = false, message = "CompanyId is required." });
            }

            var trimmedTeamName = request.TeamName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedTeamName))
            {
                return BadRequest(new { success = false, message = "Team name is required." });
            }

            var companyExists = await _context.Companies.AnyAsync(company => company.CompanyId == request.CompanyId);

            if (!companyExists)
            {
                return NotFound(new { success = false, message = "Company not found." });
            }

            var duplicateTeamExists = await _context.Teams.AnyAsync(team =>
                team.CompanyId == request.CompanyId &&
                team.IsActive &&
                team.TeamName.ToLower() == trimmedTeamName.ToLower());

            if (duplicateTeamExists)
            {
                return Conflict(new { success = false, message = "A team with this name already exists." });
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

                var leaderAlreadyAssigned = await _context.Teams.AnyAsync(team =>
                    team.CompanyId == request.CompanyId &&
                    team.IsActive &&
                    team.TeamLeaderUserId == request.TeamLeaderUserId.Value);

                if (leaderAlreadyAssigned)
                {
                    return Conflict(new
                    {
                        success = false,
                        message = "This team leader is already assigned to another active team."
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
                _context.TeamMembers.Add(new TeamMember
                {
                    CompanyId = team.CompanyId,
                    TeamId = team.TeamId,
                    UserId = team.TeamLeaderUserId.Value,
                    JoinedAt = DateTime.UtcNow,
                    IsActive = true
                });

                await _context.SaveChangesAsync();
            }

            var leaderName = string.Empty;

            if (team.IsActive && team.TeamLeaderUserId.HasValue)
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
                    memberIds = new List<int>()
                }
            });
        }

        [HttpPut("{teamId:int}")]
        public async Task<IActionResult> UpdateTeam(int teamId, [FromBody] UpdateTeamRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Request body is required." });
            }

            var team = await _context.Teams.FirstOrDefaultAsync(t => t.TeamId == teamId);

            if (team == null)
            {
                return NotFound(new { success = false, message = "Team not found." });
            }

            if (request.CompanyId > 0 && request.CompanyId != team.CompanyId)
            {
                return BadRequest(new { success = false, message = "CompanyId does not match this team." });
            }

            var trimmedTeamName = request.TeamName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedTeamName))
            {
                return BadRequest(new { success = false, message = "Team name is required." });
            }

            var duplicateTeamExists = await _context.Teams.AnyAsync(existingTeam =>
                existingTeam.TeamId != teamId &&
                existingTeam.CompanyId == team.CompanyId &&
                existingTeam.IsActive &&
                existingTeam.TeamName.ToLower() == trimmedTeamName.ToLower());

            if (duplicateTeamExists)
            {
                return Conflict(new { success = false, message = "A team with this name already exists." });
            }

            var requestedLeaderId = request.TeamLeaderId ?? request.TeamLeaderUserId;
            var nextIsActive = request.IsActive ?? team.IsActive;
            var isReactivating = !team.IsActive && nextIsActive;

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

                var leaderAlreadyAssigned = await _context.Teams.AnyAsync(existingTeam =>
                    existingTeam.TeamId != teamId &&
                    existingTeam.CompanyId == team.CompanyId &&
                    existingTeam.IsActive &&
                    existingTeam.TeamLeaderUserId == requestedLeaderId.Value);

                if (leaderAlreadyAssigned && !isReactivating)
                {
                    return Conflict(new
                    {
                        success = false,
                        message = "This team leader is already assigned to another active team."
                    });
                }
            }

            team.TeamName = trimmedTeamName;
            team.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            team.IsActive = nextIsActive;

            var requestedMemberIds = request.MemberIds?.ToList();

            if (isReactivating)
            {
                if (requestedMemberIds == null)
                {
                    requestedMemberIds = await _context.TeamMembers
                        .Where(teamMember => teamMember.TeamId == team.TeamId)
                        .Select(teamMember => teamMember.UserId)
                        .ToListAsync();
                }

                var activeAssignmentsInOtherTeams = await (
                    from otherTeam in _context.Teams
                    join teamMember in _context.TeamMembers
                        on otherTeam.TeamId equals teamMember.TeamId
                    where otherTeam.CompanyId == team.CompanyId &&
                          otherTeam.TeamId != team.TeamId &&
                          otherTeam.IsActive
                    select teamMember.UserId
                )
                .Distinct()
                .ToListAsync();

                var busyUserIds = activeAssignmentsInOtherTeams.ToHashSet();

                if (requestedLeaderId.HasValue && busyUserIds.Contains(requestedLeaderId.Value))
                {
                    requestedLeaderId = null;
                }

                requestedMemberIds = requestedMemberIds
                    .Where(userId => userId > 0 && !busyUserIds.Contains(userId))
                    .Distinct()
                    .ToList();
            }

            team.TeamLeaderUserId = requestedLeaderId;

            if (requestedMemberIds != null)
            {
                await SyncTeamMembersAsync(team, requestedMemberIds, requestedLeaderId);
            }

            await _context.SaveChangesAsync();

            var leaderName = string.Empty;

            if (team.IsActive && team.TeamLeaderUserId.HasValue)
            {
                leaderName = await _context.Users
                    .Where(user => user.UserId == team.TeamLeaderUserId.Value)
                    .Select(user => user.FullName)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }

            var updatedMemberIds = await _context.TeamMembers
                .Where(teamMember =>
                    teamMember.TeamId == team.TeamId &&
                    teamMember.IsActive &&
                    (!team.TeamLeaderUserId.HasValue || teamMember.UserId != team.TeamLeaderUserId.Value))
                .Select(teamMember => teamMember.UserId)
                .ToListAsync();

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
                    memberIds = updatedMemberIds
                }
            });
        }

        [HttpDelete("{teamId:int}")]
        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            var team = await _context.Teams.FirstOrDefaultAsync(t => t.TeamId == teamId);

            if (team == null)
            {
                return NotFound(new { success = false, message = "Team not found." });
            }

            var taskIds = await _context.Tasks
                .Where(task => task.TeamId == teamId)
                .Select(task => task.TaskId)
                .ToListAsync();

            if (taskIds.Count > 0)
            {
                var taskHistories = await _context.TaskStatusHistories
                    .Where(history => taskIds.Contains(history.TaskId))
                    .ToListAsync();

                if (taskHistories.Count > 0)
                {
                    _context.TaskStatusHistories.RemoveRange(taskHistories);
                }

                var tasks = await _context.Tasks
                    .Where(task => task.TeamId == teamId)
                    .ToListAsync();

                if (tasks.Count > 0)
                {
                    _context.Tasks.RemoveRange(tasks);
                }
            }

            var existingRows = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == teamId)
                .ToListAsync();

            if (existingRows.Count > 0)
            {
                _context.TeamMembers.RemoveRange(existingRows);
            }

            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Team deleted successfully."
            });
        }

        private async Task SyncTeamMembersAsync(Team team, IEnumerable<int> requestedMemberIds, int? requestedLeaderId)
        {
            var nextMemberIds = requestedMemberIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (requestedLeaderId.HasValue && !nextMemberIds.Contains(requestedLeaderId.Value))
            {
                nextMemberIds.Add(requestedLeaderId.Value);
            }

            if (nextMemberIds.Count > 0)
            {
                var validUserIds = await _context.Users
                    .Where(user => user.CompanyId == team.CompanyId && nextMemberIds.Contains(user.UserId))
                    .Select(user => user.UserId)
                    .ToListAsync();

                if (validUserIds.Count != nextMemberIds.Count)
                {
                    throw new InvalidOperationException("One or more selected members do not belong to this company.");
                }
            }

            if (nextMemberIds.Count > 0)
            {
                var rowsInOtherTeams = await _context.TeamMembers
                    .Where(teamMember =>
                        teamMember.CompanyId == team.CompanyId &&
                        teamMember.TeamId != team.TeamId &&
                        nextMemberIds.Contains(teamMember.UserId))
                    .ToListAsync();

                if (rowsInOtherTeams.Count > 0)
                {
                    _context.TeamMembers.RemoveRange(rowsInOtherTeams);
                }
            }

            var currentRows = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == team.TeamId)
                .ToListAsync();

            var rowsToDelete = currentRows
                .Where(teamMember => !nextMemberIds.Contains(teamMember.UserId))
                .ToList();

            if (rowsToDelete.Count > 0)
            {
                _context.TeamMembers.RemoveRange(rowsToDelete);
            }

            var currentUserIds = currentRows
                .Select(teamMember => teamMember.UserId)
                .ToHashSet();

            var rowsToAdd = nextMemberIds
                .Where(userId => !currentUserIds.Contains(userId))
                .Select(userId => new TeamMember
                {
                    CompanyId = team.CompanyId,
                    TeamId = team.TeamId,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow,
                    IsActive = true
                })
                .ToList();

            if (rowsToAdd.Count > 0)
            {
                _context.TeamMembers.AddRange(rowsToAdd);
            }
        }
    }
}