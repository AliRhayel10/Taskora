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
                where team.CompanyId == companyId
                select new
                {
                    team.TeamId,
                    team.CompanyId,
                    team.TeamName,
                    team.Description,
                    team.TeamLeaderUserId,
                    TeamLeaderName = leader != null ? leader.FullName : string.Empty,
                    team.IsActive
                }
            )
            .OrderBy(team => team.TeamName)
            .ToListAsync();

            var teamIds = teams.Select(team => team.TeamId).ToList();

            var memberIdsByTeam = await _context.TeamMembers
                .Where(teamMember => teamIds.Contains(teamMember.TeamId))
                .GroupBy(teamMember => teamMember.TeamId)
                .ToDictionaryAsync(
                    group => group.Key,
                    group => group.Select(teamMember => teamMember.UserId).Distinct().ToList()
                );

            var activeMemberIdsByTeam = await _context.TeamMembers
                .Where(teamMember => teamIds.Contains(teamMember.TeamId) && teamMember.IsActive)
                .GroupBy(teamMember => teamMember.TeamId)
                .ToDictionaryAsync(
                    group => group.Key,
                    group => group.Select(teamMember => teamMember.UserId).Distinct().ToList()
                );

            var tasksCountByTeam = await _context.Tasks
                .AsNoTracking()
                .Where(task => teamIds.Contains(task.TeamId))
                .Select(task => new
                {
                    task.TeamId
                })
                .GroupBy(task => task.TeamId)
                .Select(group => new
                {
                    TeamId = group.Key,
                    Count = group.Count()
                })
                .ToDictionaryAsync(x => x.TeamId, x => x.Count);

            var result = teams
                .Select(team =>
                {
                    var memberIds = memberIdsByTeam.TryGetValue(team.TeamId, out var allMemberIds)
                        ? allMemberIds
                        : new List<int>();

                    var activeMemberIds = team.IsActive && activeMemberIdsByTeam.TryGetValue(team.TeamId, out var resolvedActiveMemberIds)
                        ? resolvedActiveMemberIds
                        : new List<int>();

                    var tasksCount = tasksCountByTeam.TryGetValue(team.TeamId, out var count)
                        ? count
                        : 0;

                    return new
                    {
                        teamId = team.TeamId,
                        companyId = team.CompanyId,
                        teamName = team.TeamName,
                        description = team.Description,
                        teamLeaderUserId = team.TeamLeaderUserId,
                        teamLeaderId = team.TeamLeaderUserId,
                        teamLeaderName = team.TeamLeaderName,
                        tasksCount,
                        isActive = team.IsActive,
                        memberIds = memberIds,
                        memberCount = memberIds.Count,
                        activeMemberCount = activeMemberIds.Count
                    };
                });

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                result = result.Where(team =>
                    (team.teamName ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.description ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.teamLeaderName ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            return Ok(result.ToList());
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
                    jobTitle = user.JobTitle,
                    isActive = user.IsActive,
                    status = user.IsActive ? "Active" : "Inactive",
                    profileImageUrl = user.ProfileImageUrl
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
                    jobType = member.jobTitle,
                    isActive = member.isActive,
                    status = member.status,
                    profileImageUrl = member.profileImageUrl
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
                team.TeamName.ToLower() == trimmedTeamName.ToLower());

            if (duplicateTeamExists)
            {
                return Conflict(new { success = false, message = "A team with this name already exists." });
            }

            int? requestedCreateLeaderId = request.TeamLeaderUserId > 0
                ? request.TeamLeaderUserId
                : null;

            if (requestedCreateLeaderId.HasValue)
            {
                var leaderExists = await _context.Users.AnyAsync(user =>
                    user.UserId == requestedCreateLeaderId.Value &&
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
                    team.TeamLeaderUserId == requestedCreateLeaderId.Value);

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
                TeamLeaderUserId = requestedCreateLeaderId,
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

            if (team.TeamLeaderUserId.HasValue)
            {
                leaderName = await _context.Users
                    .Where(user => user.UserId == team.TeamLeaderUserId.Value)
                    .Select(user => user.FullName)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }

            var activeMemberIds = team.TeamLeaderUserId.HasValue
                ? new List<int> { team.TeamLeaderUserId.Value }
                : new List<int>();

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
                    memberIds = activeMemberIds,
                    memberCount = activeMemberIds.Count
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
                existingTeam.TeamName.ToLower() == trimmedTeamName.ToLower());

            if (duplicateTeamExists)
            {
                return Conflict(new { success = false, message = "A team with this name already exists." });
            }

            var requestedLeaderId = request.TeamLeaderId ?? request.TeamLeaderUserId;
            var nextIsActive = request.IsActive ?? team.IsActive;
            var isReactivating = !team.IsActive && nextIsActive;

            if (nextIsActive && !requestedLeaderId.HasValue)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "No team leader available. Assign a team leader before activating this team."
                });
            }

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

                if (leaderAlreadyAssigned)
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

            var requestedMemberIds = request.MemberIds?.ToList() ?? new List<int>();

            if (isReactivating)
            {
                var activeAssignmentsInOtherTeams = await (
                    from otherTeam in _context.Teams
                    join teamMember in _context.TeamMembers
                        on otherTeam.TeamId equals teamMember.TeamId
                    where otherTeam.CompanyId == team.CompanyId &&
                          otherTeam.TeamId != team.TeamId &&
                          otherTeam.IsActive &&
                          teamMember.IsActive
                    select teamMember.UserId
                )
                .Distinct()
                .ToListAsync();

                var busyUserIds = activeAssignmentsInOtherTeams.ToHashSet();

                requestedMemberIds = requestedMemberIds
                    .Where(userId => userId > 0 && !busyUserIds.Contains(userId))
                    .Distinct()
                    .ToList();

                if (requestedLeaderId.HasValue && busyUserIds.Contains(requestedLeaderId.Value))
                {
                    return Conflict(new
                    {
                        success = false,
                        message = "This team leader is already assigned to another active team."
                    });
                }
            }

            team.TeamLeaderUserId = requestedLeaderId;

            await SyncTeamMembersAsync(team, requestedMemberIds, requestedLeaderId);
            await _context.SaveChangesAsync();

            var leaderName = string.Empty;

            if (team.TeamLeaderUserId.HasValue)
            {
                leaderName = await _context.Users
                    .Where(user => user.UserId == team.TeamLeaderUserId.Value)
                    .Select(user => user.FullName)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }

            var updatedMemberIds = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == team.TeamId)
                .Select(teamMember => teamMember.UserId)
                .ToListAsync();

            var updatedActiveMemberIds = team.IsActive
                ? await _context.TeamMembers
                    .Where(teamMember => teamMember.TeamId == team.TeamId && teamMember.IsActive)
                    .Select(teamMember => teamMember.UserId)
                    .ToListAsync()
                : new List<int>();

            var updatedTasksCount = await _context.Tasks
                .AsNoTracking()
                .Where(task => task.TeamId == team.TeamId)
                .Select(task => task.TaskId)
                .CountAsync();

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
                    tasksCount = updatedTasksCount,
                    isActive = team.IsActive,
                    memberIds = updatedMemberIds,
                    memberCount = updatedMemberIds.Count,
                    activeMemberCount = updatedActiveMemberIds.Count
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
                .AsNoTracking()
                .Where(task => task.TeamId == teamId)
                .Select(task => task.TaskId)
                .ToListAsync();

            if (taskIds.Count > 0)
            {
                await _context.TaskStatusHistories
                    .Where(history => taskIds.Contains(history.TaskId))
                    .ExecuteDeleteAsync();

                await _context.Tasks
                    .Where(task => task.TeamId == teamId)
                    .ExecuteDeleteAsync();
            }

            await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == teamId)
                .ExecuteDeleteAsync();

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

            var currentRows = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == team.TeamId)
                .ToListAsync();

            var rowsToRemove = currentRows
                .Where(row => !nextMemberIds.Contains(row.UserId))
                .ToList();

if (rowsToRemove.Count > 0)
{
    _context.TeamMembers.RemoveRange(rowsToRemove);
}

            var remainingRows = currentRows
                .Where(row => nextMemberIds.Contains(row.UserId))
                .ToList();

            var remainingRowsByUserId = remainingRows.ToDictionary(row => row.UserId, row => row);

            foreach (var row in remainingRows)
            {
                row.IsActive = team.IsActive;
            }

            var missingUserIds = nextMemberIds
                .Where(userId => !remainingRowsByUserId.ContainsKey(userId))
                .ToList();

            if (missingUserIds.Count > 0)
            {
                var rowsToAdd = missingUserIds
                    .Select(userId => new TeamMember
                    {
                        CompanyId = team.CompanyId,
                        TeamId = team.TeamId,
                        UserId = userId,
                        JoinedAt = DateTime.UtcNow,
                        IsActive = team.IsActive
                    })
                    .ToList();

                _context.TeamMembers.AddRange(rowsToAdd);
            }
        }
    }
}