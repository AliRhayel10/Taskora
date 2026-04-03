using BackEnd.Data;
using BackEnd.DTOs.Tasks;
using BackEnd.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/tasks")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("statuses/{companyId}")]
        public async Task<IActionResult> GetTaskStatuses(int companyId)
        {
            var statuses = await _context.TaskStatuses
                .Where(s => s.CompanyId == companyId && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .Select(s => new
                {
                    s.TaskStatusId,
                    s.StatusName,
                    s.DisplayOrder,
                    s.IsDefault,
                    s.IsActive
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                statuses
            });
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetTasksByCompany(int companyId)
        {
            var tasks = await _context.Tasks
                .Include(t => t.TaskStatus)
                .Where(t => t.CompanyId == companyId)
                .OrderByDescending(t => t.TaskId)
                .Select(t => new TaskResponse
                {
                    TaskId = t.TaskId,
                    CompanyId = t.CompanyId,
                    TeamId = t.TeamId,
                    Title = t.Title,
                    Description = t.Description,
                    AssignedToUserId = t.AssignedToUserId,
                    CreatedByUserId = t.CreatedByUserId,
                    Priority = t.Priority,
                    Complexity = t.Complexity,
                    EstimatedEffortHours = t.EstimatedEffortHours,
                    Weight = t.Weight,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    TaskStatusId = t.TaskStatusId,
                    TaskStatusName = t.TaskStatus != null ? t.TaskStatus.StatusName : ""
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                tasks
            });
        }

        [HttpGet("{taskId}")]
        public async Task<IActionResult> GetTaskById(int taskId)
        {
            var task = await _context.Tasks
                .Include(t => t.TaskStatus)
                .Where(t => t.TaskId == taskId)
                .Select(t => new TaskResponse
                {
                    TaskId = t.TaskId,
                    CompanyId = t.CompanyId,
                    TeamId = t.TeamId,
                    Title = t.Title,
                    Description = t.Description,
                    AssignedToUserId = t.AssignedToUserId,
                    CreatedByUserId = t.CreatedByUserId,
                    Priority = t.Priority,
                    Complexity = t.Complexity,
                    EstimatedEffortHours = t.EstimatedEffortHours,
                    Weight = t.Weight,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    TaskStatusId = t.TaskStatusId,
                    TaskStatusName = t.TaskStatus != null ? t.TaskStatus.StatusName : ""
                })
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Task not found."
                });
            }

            return Ok(new
            {
                success = true,
                task
            });
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Task title is required."
                });
            }

            if (request.DueDate < request.StartDate)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Due date must be after or equal to start date."
                });
            }

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var team = await _context.Teams
                .FirstOrDefaultAsync(t => t.TeamId == request.TeamId && t.CompanyId == request.CompanyId);

            if (team == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Team not found."
                });
            }

            var assignedUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == request.AssignedToUserId && u.CompanyId == request.CompanyId);

            if (assignedUser == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Assigned user not found."
                });
            }

            var createdByUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == request.CreatedByUserId && u.CompanyId == request.CompanyId);

            if (createdByUser == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Creator user not found."
                });
            }

            int taskStatusId;

            if (request.TaskStatusId.HasValue && request.TaskStatusId.Value > 0)
            {
                var selectedStatus = await _context.TaskStatuses
                    .FirstOrDefaultAsync(s =>
                        s.TaskStatusId == request.TaskStatusId.Value &&
                        s.CompanyId == request.CompanyId &&
                        s.IsActive);

                if (selectedStatus == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Selected task status is invalid."
                    });
                }

                taskStatusId = selectedStatus.TaskStatusId;
            }
            else
            {
                var defaultStatus = await _context.TaskStatuses
                    .Where(s => s.CompanyId == request.CompanyId && s.IsDefault && s.IsActive)
                    .OrderBy(s => s.DisplayOrder)
                    .FirstOrDefaultAsync();

                if (defaultStatus == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "No default task status is configured for this company."
                    });
                }

                taskStatusId = defaultStatus.TaskStatusId;
            }

            var priorityMultiplier = await _context.PriorityMultipliers
                .Where(p => p.CompanyId == request.CompanyId && p.PriorityName == request.Priority)
                .Select(p => p.Multiplier)
                .FirstOrDefaultAsync();

            var complexityMultiplier = await _context.ComplexityMultipliers
                .Where(c => c.CompanyId == request.CompanyId && c.ComplexityName == request.Complexity)
                .Select(c => c.Multiplier)
                .FirstOrDefaultAsync();

            if (priorityMultiplier <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Priority multiplier is not configured for the selected priority."
                });
            }

            if (complexityMultiplier <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Complexity multiplier is not configured for the selected complexity."
                });
            }

            var calculatedWeight = request.EstimatedEffortHours * priorityMultiplier * complexityMultiplier;

            var task = new TaskItem
            {
                CompanyId = request.CompanyId,
                TeamId = request.TeamId,
                Title = request.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                AssignedToUserId = request.AssignedToUserId,
                CreatedByUserId = request.CreatedByUserId,
                Priority = request.Priority.Trim(),
                Complexity = request.Complexity.Trim(),
                EstimatedEffortHours = request.EstimatedEffortHours,
                Weight = calculatedWeight,
                StartDate = request.StartDate,
                DueDate = request.DueDate,
                TaskStatusId = taskStatusId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Task created successfully.",
                taskId = task.TaskId
            });
        }

        [HttpPut("update-status")]
        public async Task<IActionResult> UpdateTaskStatus([FromBody] UpdateTaskStatusRequest request)
        {
            if (request == null || request.TaskId <= 0 || request.NewTaskStatusId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.TaskId == request.TaskId);

            if (task == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Task not found."
                });
            }

            var newStatus = await _context.TaskStatuses
                .FirstOrDefaultAsync(s =>
                    s.TaskStatusId == request.NewTaskStatusId &&
                    s.CompanyId == task.CompanyId &&
                    s.IsActive);

            if (newStatus == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "New task status is invalid."
                });
            }

            var changedByUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == request.ChangedByUserId && u.CompanyId == task.CompanyId);

            if (changedByUser == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "ChangedBy user is invalid."
                });
            }

            if (task.TaskStatusId == request.NewTaskStatusId)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Task already has this status."
                });
            }

            var oldTaskStatusId = task.TaskStatusId;
            task.TaskStatusId = request.NewTaskStatusId;

            _context.TaskStatusHistories.Add(new TaskStatusHistory
            {
                CompanyId = task.CompanyId,
                TaskId = task.TaskId,
                OldTaskStatusId = oldTaskStatusId,
                NewTaskStatusId = request.NewTaskStatusId,
                ChangedByUserId = request.ChangedByUserId,
                ChangedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Task status updated successfully."
            });
        }
    }
}