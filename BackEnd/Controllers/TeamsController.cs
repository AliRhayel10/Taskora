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

            var teamsQuery =
                from team in _context.Teams
                join leader in _context.Users
                    on team.TeamLeaderUserId equals leader.UserId into leaderJoin
                from leader in leaderJoin.DefaultIfEmpty()
                where team.CompanyId == companyId
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
                        .Where(teamMember => teamMember.TeamId == team.TeamId &&
                                             teamMember.IsActive &&
                                             (!team.TeamLeaderUserId.HasValue || teamMember.UserId != team.TeamLeaderUserId.Value))
                        .Select(teamMember => teamMember.UserId)
                        .ToList()
                };

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                teamsQuery = teamsQuery.Where(team =>
                    (team.teamName ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.description ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (team.teamLeaderName ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            var teams = await teamsQuery
                .OrderBy(team => team.teamName)
                .ToListAsync();

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

            var filteredMembers = rawMembers
                .Where(member => IsEmployeeRole(member.role) || IsTeamLeaderRole(member.role));

            if (teamLeadersOnly)
            {
                filteredMembers = filteredMembers.Where(member => IsTeamLeaderRole(member.role));
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
                    role = IsTeamLeaderRole(member.role) ? "Team Leader" : "Employee",
                    jobTitle = member.jobTitle,
                    jobType = member.jobTitle
                })
                .OrderBy(member => member.fullName)
                .ThenBy(member => member.email)
                .ToList();

            return Ok(result);
        }

        private static string NormalizeRole(string? value)
        {
            return (value ?? string.Empty)
                .Trim()
                .ToLower()
                .Replace("_", " ")
                .Replace("-", " ");
        }

        private static bool IsTeamLeaderRole(string? value)
        {
            var normalizedRole = NormalizeRole(value);
            return normalizedRole == "team leader" || normalizedRole == "teamleader";
        }

        private static bool IsEmployeeRole(string? value)
        {
            return NormalizeRole(value) == "employee";
        }

        private async Task<List<int>> GetActiveAssignedUserIdsInOtherTeamsAsync(Team team)
        {
            return await (
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
        }

        private async Task SetTeamMembersActiveStateAsync(int teamId, bool isActive)
        {
            var teamMembers = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == teamId)
                .ToListAsync();

            foreach (var teamMember in teamMembers)
            {
                teamMember.IsActive = isActive;
            }
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
                await SyncTeamMembersAsync(team, Array.Empty<int>(), team.TeamLeaderUserId, true);
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
            var nextIsActive = request.IsActive ?? request.Status ?? team.IsActive;
            var wasActive = team.IsActive;
            var isReactivating = !wasActive && nextIsActive;
            var requestedMemberIds = request.MemberIds?.ToList();

            if (requestedMemberIds == null)
            {
                requestedMemberIds = await _context.TeamMembers
                    .Where(teamMember => teamMember.TeamId == team.TeamId)
                    .Select(teamMember => teamMember.UserId)
                    .ToListAsync();
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
            }

            var activeAssignmentsInOtherTeams = await GetActiveAssignedUserIdsInOtherTeamsAsync(team);
            var busyUserIds = activeAssignmentsInOtherTeams.ToHashSet();

            if (nextIsActive)
            {
                if (requestedLeaderId.HasValue && busyUserIds.Contains(requestedLeaderId.Value))
                {
                    if (!isReactivating)
                    {
                        return Conflict(new
                        {
                            success = false,
                            message = "This team leader is already assigned to another active team."
                        });
                    }

                    requestedLeaderId = null;
                }

                requestedMemberIds = requestedMemberIds
                    .Where(userId => userId > 0 && !busyUserIds.Contains(userId))
                    .Distinct()
                    .ToList();
            }
            else
            {
                requestedMemberIds = requestedMemberIds
                    .Where(userId => userId > 0)
                    .Distinct()
                    .ToList();
            }

            team.TeamName = trimmedTeamName;
            team.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            team.IsActive = nextIsActive;
            team.TeamLeaderUserId = requestedLeaderId;

            await SyncTeamMembersAsync(team, requestedMemberIds, requestedLeaderId, nextIsActive);
            await SetTeamMembersActiveStateAsync(team.TeamId, nextIsActive);

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
                .Where(teamMember => teamMember.TeamId == team.TeamId && (team.IsActive ? teamMember.IsActive : true))
                .Select(teamMember => teamMember.UserId)
                .ToListAsync();

            if (team.TeamLeaderUserId.HasValue)
            {
                updatedMemberIds = updatedMemberIds
                    .Where(userId => userId != team.TeamLeaderUserId.Value)
                    .ToList();
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

        private async Task SyncTeamMembersAsync(Team team, IEnumerable<int> requestedMemberIds, int? requestedLeaderId, bool shouldActivateMembers)
        {
            var nextMemberIds = requestedMemberIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (requestedLeaderId.HasValue)
            {
                nextMemberIds.Remove(requestedLeaderId.Value);
            }

            var validationUserIds = nextMemberIds.ToList();

            if (requestedLeaderId.HasValue)
            {
                validationUserIds.Add(requestedLeaderId.Value);
            }

            validationUserIds = validationUserIds
                .Where(userId => userId > 0)
                .Distinct()
                .ToList();

            if (validationUserIds.Count > 0)
            {
                var validUserIds = await _context.Users
                    .Where(user => user.CompanyId == team.CompanyId && validationUserIds.Contains(user.UserId))
                    .Select(user => user.UserId)
                    .ToListAsync();

                if (validUserIds.Count != validationUserIds.Count)
                {
                    throw new InvalidOperationException("One or more selected members do not belong to this company.");
                }
            }

            if (shouldActivateMembers && validationUserIds.Count > 0)
            {
                var activeRowsInOtherTeams = await (
                    from otherTeam in _context.Teams
                    join teamMember in _context.TeamMembers
                        on otherTeam.TeamId equals teamMember.TeamId
                    where teamMember.CompanyId == team.CompanyId &&
                          teamMember.TeamId != team.TeamId &&
                          validationUserIds.Contains(teamMember.UserId) &&
                          otherTeam.IsActive &&
                          teamMember.IsActive
                    select teamMember
                ).ToListAsync();

                if (activeRowsInOtherTeams.Count > 0)
                {
                    throw new InvalidOperationException("One or more selected users are already assigned to another active team.");
                }
            }

            var rowsInInactiveTeams = await (
                from otherTeam in _context.Teams
                join teamMember in _context.TeamMembers
                    on otherTeam.TeamId equals teamMember.TeamId
                where teamMember.CompanyId == team.CompanyId &&
                      teamMember.TeamId != team.TeamId &&
                      validationUserIds.Contains(teamMember.UserId) &&
                      !otherTeam.IsActive &&
                      teamMember.IsActive
                select teamMember
            ).ToListAsync();

            foreach (var row in rowsInInactiveTeams)
            {
                row.IsActive = false;
            }

            var currentRows = await _context.TeamMembers
                .Where(teamMember => teamMember.TeamId == team.TeamId)
                .ToListAsync();

            var targetUserIds = validationUserIds.ToHashSet();

            foreach (var currentRow in currentRows)
            {
                if (targetUserIds.Contains(currentRow.UserId))
                {
                    currentRow.IsActive = shouldActivateMembers;
                }
                else
                {
                    currentRow.IsActive = false;
                }
            }

            var currentUserIds = currentRows
                .Select(teamMember => teamMember.UserId)
                .ToHashSet();

            var rowsToAdd = targetUserIds
                .Where(userId => !currentUserIds.Contains(userId))
                .Select(userId => new TeamMember
                {
                    CompanyId = team.CompanyId,
                    TeamId = team.TeamId,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow,
                    IsActive = shouldActivateMembers
                })
                .ToList();

            if (rowsToAdd.Count > 0)
            {
                _context.TeamMembers.AddRange(rowsToAdd);
            }
        }
    }
}
