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
        public async Task<ActionResult<IEnumerable<TeamResponse>>> GetTeamsByCompany(
            int companyId,
            [FromQuery] string? search = null)
        {
            var normalizedSearch = search?.Trim().ToLower();

            var teamsQuery =
                from team in _context.Teams
                join leader in _context.Users
                    on team.TeamLeaderUserId equals leader.UserId into leaderJoin
                from leader in leaderJoin.DefaultIfEmpty()
                where team.CompanyId == companyId && team.IsActive
                select new TeamResponse
                {
                    TeamId = team.TeamId,
                    CompanyId = team.CompanyId,
                    TeamName = team.TeamName,
                    Description = team.Description,
                    TeamLeaderUserId = team.TeamLeaderUserId,
                    TeamLeaderName = leader != null ? leader.FullName : string.Empty,
                    TasksCount = _context.Tasks.Count(task => task.TeamId == team.TeamId),
                    IsActive = team.IsActive
                };

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                teamsQuery = teamsQuery.Where(team =>
                    team.TeamName.ToLower().Contains(normalizedSearch) ||
                    (team.Description ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    team.TeamLeaderName.ToLower().Contains(normalizedSearch));
            }

            var teams = await teamsQuery
                .OrderBy(team => team.TeamName)
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

            var membersQuery =
                from user in _context.Users
                join userRole in _context.UserRoles
                    on user.UserId equals userRole.UserId into userRoleJoin
                from userRole in userRoleJoin.DefaultIfEmpty()
                join role in _context.Roles
                    on userRole.RoleId equals role.RoleId into roleJoin
                from role in roleJoin.DefaultIfEmpty()
                where user.CompanyId == companyId
                let roleName = role != null ? role.RoleName : "Employee"
                where roleName == "Employee" || roleName == "Team Leader"
                select new
                {
                    userId = user.UserId,
                    fullName = user.FullName,
                    email = user.Email,
                    role = roleName,
                    jobTitle = user.JobTitle
                };

            if (teamLeadersOnly)
            {
                membersQuery = membersQuery.Where(member => member.role == "Team Leader");
            }

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                membersQuery = membersQuery.Where(member =>
                    (member.fullName ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (member.email ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (member.role ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (member.jobTitle ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            var members = await membersQuery
                .OrderBy(member => member.fullName)
                .ThenBy(member => member.email)
                .ToListAsync();

            return Ok(members);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
        {
            if (request.CompanyId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "CompanyId is required."
                });
            }

            if (string.IsNullOrWhiteSpace(request.TeamName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Team name is required."
                });
            }

            var companyExists = await _context.Companies
                .AnyAsync(company => company.CompanyId == request.CompanyId);

            if (!companyExists)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var trimmedTeamName = request.TeamName.Trim();

            var duplicateTeamExists = await _context.Teams.AnyAsync(team =>
                team.CompanyId == request.CompanyId &&
                team.TeamName == trimmedTeamName);

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
                Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim(),
                TeamLeaderUserId = request.TeamLeaderUserId,
                IsActive = true
            };

            _context.Teams.Add(team);
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
                message = "Team created successfully.",
                team = new TeamResponse
                {
                    TeamId = team.TeamId,
                    CompanyId = team.CompanyId,
                    TeamName = team.TeamName,
                    Description = team.Description,
                    TeamLeaderUserId = team.TeamLeaderUserId,
                    TeamLeaderName = leaderName,
                    TasksCount = 0,
                    IsActive = team.IsActive
                }
            });
        }
    }
}
