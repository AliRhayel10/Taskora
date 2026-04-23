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

        [HttpGet("setup-rules/{companyId}")]
        public async Task<IActionResult> GetTaskSetupRules(int companyId)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == companyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var statuses = await _context.TaskStatuses
                .Where(s => s.CompanyId == companyId && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .Select(s => new { s.StatusName, s.IsDefault })
                .ToListAsync();

            var priorityMultipliers = await _context.PriorityMultipliers
                .Where(p => p.CompanyId == companyId)
                .OrderBy(p => p.Id)
                .ToDictionaryAsync(
                    p => p.PriorityName,
                    p => p.Multiplier
                );

            var complexityMultipliers = await _context.ComplexityMultipliers
                .Where(c => c.CompanyId == companyId)
                .OrderBy(c => c.Id)
                .ToDictionaryAsync(
                    c => c.ComplexityName,
                    c => c.Multiplier
                );

            return Ok(new
            {
                success = true,
                data = new TaskSetupRulesResponse
                {
                    Statuses = statuses.Select(s => s.StatusName).ToList(),
                    DefaultStatus = statuses.FirstOrDefault(s => s.IsDefault)?.StatusName ?? string.Empty,
                    PriorityMultipliers = priorityMultipliers,
                    ComplexityMultipliers = complexityMultipliers,
                    EffortFormula = "Task Weight = Base Effort × Priority Multiplier × Complexity Multiplier"
                }
            });
        }

        [HttpPut("setup-rules/{companyId}")]
        public async Task<IActionResult> UpdateTaskSetupRules(int companyId, [FromBody] TaskSetupRulesRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid request."
                    });
                }

                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.CompanyId == companyId);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Company not found."
                    });
                }

                var cleanedStatuses = request.Statuses?
                    .Where(status => !string.IsNullOrWhiteSpace(status))
                    .Select(status => status.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>();

                if (!cleanedStatuses.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "At least one status is required."
                    });
                }

                if (string.IsNullOrWhiteSpace(request.DefaultStatus))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "A default status is required."
                    });
                }

                var normalizedDefaultStatus = request.DefaultStatus.Trim();

                if (!cleanedStatuses.Any(status =>
                        status.Equals(normalizedDefaultStatus, StringComparison.OrdinalIgnoreCase)))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "The default status must exist in the statuses list."
                    });
                }

                if (request.PriorityMultipliers == null || !request.PriorityMultipliers.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "At least one priority multiplier is required."
                    });
                }

                if (request.ComplexityMultipliers == null || !request.ComplexityMultipliers.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "At least one complexity multiplier is required."
                    });
                }

                var existingStatuses = await _context.TaskStatuses
                    .Where(s => s.CompanyId == companyId)
                    .ToListAsync();

                var existingStatusMap = existingStatuses
                    .ToDictionary(s => s.StatusName.Trim(), s => s, StringComparer.OrdinalIgnoreCase);

                for (int i = 0; i < cleanedStatuses.Count; i++)
                {
                    var statusName = cleanedStatuses[i];

                    if (existingStatusMap.TryGetValue(statusName, out var existingStatus))
                    {
                        existingStatus.DisplayOrder = i + 1;
                        existingStatus.IsDefault = statusName.Equals(normalizedDefaultStatus, StringComparison.OrdinalIgnoreCase);
                        existingStatus.IsActive = true;
                    }
                    else
                    {
                        _context.TaskStatuses.Add(new BackEnd.Models.TaskStatus
                        {
                            CompanyId = companyId,
                            StatusName = statusName,
                            DisplayOrder = i + 1,
                            IsDefault = statusName.Equals(normalizedDefaultStatus, StringComparison.OrdinalIgnoreCase),
                            IsActive = true,
                            CreatedAt = DateTime.Now
                        });
                    }
                }

                var statusesToRemove = existingStatuses
                    .Where(existing => !cleanedStatuses.Any(s =>
                        s.Equals(existing.StatusName.Trim(), StringComparison.OrdinalIgnoreCase)))
                    .ToList();

                foreach (var statusToRemove in statusesToRemove)
                {
                    var isUsedByTasks = await _context.Tasks
                        .AnyAsync(t => t.TaskStatusId == statusToRemove.TaskStatusId);

                    if (isUsedByTasks)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = $"The status '{statusToRemove.StatusName}' is already used by tasks and cannot be removed."
                        });
                    }

                    _context.TaskStatuses.Remove(statusToRemove);
                }

                var existingPriorities = await _context.PriorityMultipliers
                    .Where(p => p.CompanyId == companyId)
                    .ToListAsync();

                _context.PriorityMultipliers.RemoveRange(existingPriorities);

                var newPriorities = request.PriorityMultipliers
                    .Where(x => !string.IsNullOrWhiteSpace(x.Key))
                    .Select(x => new PriorityMultiplier
                    {
                        CompanyId = companyId,
                        PriorityName = x.Key.Trim(),
                        Multiplier = x.Value
                    })
                    .ToList();

                await _context.PriorityMultipliers.AddRangeAsync(newPriorities);

                var existingComplexities = await _context.ComplexityMultipliers
                    .Where(c => c.CompanyId == companyId)
                    .ToListAsync();

                _context.ComplexityMultipliers.RemoveRange(existingComplexities);

                var newComplexities = request.ComplexityMultipliers
                    .Where(x => !string.IsNullOrWhiteSpace(x.Key))
                    .Select(x => new ComplexityMultiplier
                    {
                        CompanyId = companyId,
                        ComplexityName = x.Key.Trim(),
                        Multiplier = x.Value
                    })
                    .ToList();

                await _context.ComplexityMultipliers.AddRangeAsync(newComplexities);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Task setup rules updated successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [HttpPut("{taskId:int}/assignee")]
        public async Task<IActionResult> UpdateTaskAssignee(int taskId, [FromBody] UpdateTaskAssigneeRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.TaskId == taskId);

            if (task == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Task not found."
                });
            }

            if (request.AssignedToUserId.HasValue)
            {
                var assignedUser = await _context.Users.FirstOrDefaultAsync(u =>
                    u.UserId == request.AssignedToUserId.Value &&
                    u.CompanyId == task.CompanyId);

                if (assignedUser == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Assigned user not found."
                    });
                }
            }

            task.AssignedToUserId = request.AssignedToUserId;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = request.AssignedToUserId.HasValue
                    ? "Task reassigned successfully."
                    : "Task unassigned successfully."
            });
        }

        [HttpDelete("{taskId:int}")]
        public async Task<IActionResult> DeleteTask(int taskId)
        {
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.TaskId == taskId);

            if (task == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Task not found."
                });
            }

            var historyItems = await _context.TaskStatusHistories
                .Where(h => h.TaskId == taskId)
                .ToListAsync();

            if (historyItems.Any())
            {
                _context.TaskStatusHistories.RemoveRange(historyItems);
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Task deleted successfully."
            });
        }

        [HttpDelete("delete/{taskId:int}")]
        public async Task<IActionResult> DeleteTaskByAlternateRoute(int taskId)
        {
            return await DeleteTask(taskId);
        }

        [HttpPost("statuses/{companyId}")]
        public async Task<IActionResult> AddTaskStatus(int companyId, [FromBody] AddTaskStatusRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.StatusName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Status name is required."
                });
            }

            var normalizedName = request.StatusName.Trim();

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == companyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var exists = await _context.TaskStatuses.AnyAsync(s =>
                s.CompanyId == companyId &&
                s.StatusName == normalizedName);

            if (exists)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Status already exists."
                });
            }

            var lastDisplayOrder = await _context.TaskStatuses
                .Where(s => s.CompanyId == companyId)
                .Select(s => (int?)s.DisplayOrder)
                .MaxAsync() ?? 0;

            var status = new BackEnd.Models.TaskStatus
            {
                CompanyId = companyId,
                StatusName = normalizedName,
                DisplayOrder = lastDisplayOrder + 1,
                IsDefault = false,
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.TaskStatuses.Add(status);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Status added successfully."
            });
        }

        [HttpPut("statuses/{taskStatusId}")]
        public async Task<IActionResult> UpdateTaskStatusItem(int taskStatusId, [FromBody] UpdateTaskStatusItemRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.StatusName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Status name is required."
                });
            }

            var status = await _context.TaskStatuses
                .FirstOrDefaultAsync(s => s.TaskStatusId == taskStatusId);

            if (status == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Status not found."
                });
            }

            var normalizedName = request.StatusName.Trim();

            var exists = await _context.TaskStatuses.AnyAsync(s =>
                s.CompanyId == status.CompanyId &&
                s.TaskStatusId != taskStatusId &&
                s.StatusName == normalizedName);

            if (exists)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Another status with the same name already exists."
                });
            }

            status.StatusName = normalizedName;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Status updated successfully."
            });
        }

        [HttpDelete("statuses/{taskStatusId}")]
        public async Task<IActionResult> DeleteTaskStatusItem(int taskStatusId)
        {
            var status = await _context.TaskStatuses
                .FirstOrDefaultAsync(s => s.TaskStatusId == taskStatusId);

            if (status == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Status not found."
                });
            }

            var isUsedByTasks = await _context.Tasks.AnyAsync(t => t.TaskStatusId == taskStatusId);

            if (isUsedByTasks)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "This status is already used by tasks and cannot be deleted."
                });
            }

            _context.TaskStatuses.Remove(status);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Status deleted successfully."
            });
        }

        [HttpPost("priority-levels/{companyId}")]
        public async Task<IActionResult> AddPriorityLevel(int companyId, [FromBody] AddNamedMultiplierRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name) || request.Multiplier <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Priority name and valid multiplier are required."
                });
            }

            var normalizedName = request.Name.Trim();

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == companyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var exists = await _context.PriorityMultipliers.AnyAsync(p =>
                p.CompanyId == companyId &&
                p.PriorityName == normalizedName);

            if (exists)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Priority already exists."
                });
            }

            var priority = new PriorityMultiplier
            {
                CompanyId = companyId,
                PriorityName = normalizedName,
                Multiplier = request.Multiplier
            };

            _context.PriorityMultipliers.Add(priority);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Priority added successfully."
            });
        }

        [HttpPut("priority-levels/{companyId}/{name}")]
        public async Task<IActionResult> UpdatePriorityLevel(int companyId, string name, [FromBody] UpdateNamedMultiplierRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name) || request.Multiplier <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Priority name and valid multiplier are required."
                });
            }

            var existing = await _context.PriorityMultipliers
                .FirstOrDefaultAsync(p => p.CompanyId == companyId && p.PriorityName == name);

            if (existing == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Priority not found."
                });
            }

            var normalizedName = request.Name.Trim();

            var duplicate = await _context.PriorityMultipliers.AnyAsync(p =>
                p.CompanyId == companyId &&
                p.PriorityName == normalizedName &&
                p.Id != existing.Id);

            if (duplicate)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Another priority with the same name already exists."
                });
            }

            existing.PriorityName = normalizedName;
            existing.Multiplier = request.Multiplier;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Priority updated successfully."
            });
        }

        [HttpDelete("priority-levels/{companyId}/{name}")]
        public async Task<IActionResult> DeletePriorityLevel(int companyId, string name)
        {
            var existing = await _context.PriorityMultipliers
                .FirstOrDefaultAsync(p => p.CompanyId == companyId && p.PriorityName == name);

            if (existing == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Priority not found."
                });
            }

            _context.PriorityMultipliers.Remove(existing);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Priority deleted successfully."
            });
        }

        [HttpPost("complexity-levels/{companyId}")]
        public async Task<IActionResult> AddComplexityLevel(int companyId, [FromBody] AddNamedMultiplierRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name) || request.Multiplier <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Complexity name and valid multiplier are required."
                });
            }

            var normalizedName = request.Name.Trim();

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == companyId);

            if (company == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Company not found."
                });
            }

            var exists = await _context.ComplexityMultipliers.AnyAsync(c =>
                c.CompanyId == companyId &&
                c.ComplexityName == normalizedName);

            if (exists)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Complexity already exists."
                });
            }

            var complexity = new ComplexityMultiplier
            {
                CompanyId = companyId,
                ComplexityName = normalizedName,
                Multiplier = request.Multiplier
            };

            _context.ComplexityMultipliers.Add(complexity);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Complexity added successfully."
            });
        }

        [HttpPut("complexity-levels/{companyId}/{name}")]
        public async Task<IActionResult> UpdateComplexityLevel(int companyId, string name, [FromBody] UpdateNamedMultiplierRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name) || request.Multiplier <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Complexity name and valid multiplier are required."
                });
            }

            var existing = await _context.ComplexityMultipliers
                .FirstOrDefaultAsync(c => c.CompanyId == companyId && c.ComplexityName == name);

            if (existing == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Complexity not found."
                });
            }

            var normalizedName = request.Name.Trim();

            var duplicate = await _context.ComplexityMultipliers.AnyAsync(c =>
                c.CompanyId == companyId &&
                c.ComplexityName == normalizedName &&
                c.Id != existing.Id);

            if (duplicate)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Another complexity with the same name already exists."
                });
            }

            existing.ComplexityName = normalizedName;
            existing.Multiplier = request.Multiplier;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Complexity updated successfully."
            });
        }

        [HttpDelete("complexity-levels/{companyId}/{name}")]
        public async Task<IActionResult> DeleteComplexityLevel(int companyId, string name)
        {
            var existing = await _context.ComplexityMultipliers
                .FirstOrDefaultAsync(c => c.CompanyId == companyId && c.ComplexityName == name);

            if (existing == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Complexity not found."
                });
            }

            _context.ComplexityMultipliers.Remove(existing);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Complexity deleted successfully."
            });
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetTasksByCompany(int companyId)
        {
            var tasks = await _context.Tasks
                .Include(t => t.TaskStatus)
                .Include(t => t.AssignedToUser)
                .Where(t => t.CompanyId == companyId)
                .OrderByDescending(t => t.TaskId)
                .Select(t => new TaskResponse
                {
                    TaskId = t.TaskId,
                    CompanyId = t.CompanyId,
                    TeamId = t.TeamId,
                    Title = t.Title,
                    Description = t.Description,
                    Feedback = t.Feedback,
                    AssignedToUserId = t.AssignedToUserId,
                    CreatedByUserId = t.CreatedByUserId,
                    Priority = t.Priority,
                    Complexity = t.Complexity,
                    EstimatedEffortHours = t.EstimatedEffortHours,
                    Weight = t.Weight,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    TaskStatusId = t.TaskStatusId,
                    TaskStatusName = t.TaskStatus != null ? t.TaskStatus.StatusName : "",
                    AssignedUserName = t.AssignedToUser != null ? t.AssignedToUser.FullName : "",
                    AssignedUserEmail = t.AssignedToUser != null ? t.AssignedToUser.Email : ""
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                tasks
            });
        }

        [HttpGet("by-id/{taskId:int}")]
        public async Task<IActionResult> GetTaskById(int taskId)
        {
            var task = await _context.Tasks
                .Include(t => t.TaskStatus)
                .Include(t => t.AssignedToUser)
                .Where(t => t.TaskId == taskId)
                .Select(t => new TaskResponse
                {
                    TaskId = t.TaskId,
                    CompanyId = t.CompanyId,
                    TeamId = t.TeamId,
                    Title = t.Title,
                    Description = t.Description,
                    Feedback = t.Feedback,
                    AssignedToUserId = t.AssignedToUserId,
                    CreatedByUserId = t.CreatedByUserId,
                    Priority = t.Priority,
                    Complexity = t.Complexity,
                    EstimatedEffortHours = t.EstimatedEffortHours,
                    Weight = t.Weight,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    TaskStatusId = t.TaskStatusId,
                    TaskStatusName = t.TaskStatus != null ? t.TaskStatus.StatusName : "",
                    AssignedUserName = t.AssignedToUser != null ? t.AssignedToUser.FullName : "",
                    AssignedUserEmail = t.AssignedToUser != null ? t.AssignedToUser.Email : ""
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

        [HttpGet("{taskId:int}/history")]
        public async Task<IActionResult> GetTaskHistory(int taskId)
        {
            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.TaskId == taskId);

            if (task == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Task not found."
                });
            }

            var history = await _context.TaskStatusHistories
                .Where(h => h.TaskId == taskId)
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new
                {
                    h.TaskStatusHistoryId,
                    h.TaskId,
                    h.OldTaskStatusId,
                    h.NewTaskStatusId,
                    h.ChangedByUserId,
                    ChangedByName = _context.Users
                        .Where(u => u.UserId == h.ChangedByUserId)
                        .Select(u => u.FullName)
                        .FirstOrDefault(),
                    OldStatusName = _context.TaskStatuses
                        .Where(s => s.TaskStatusId == h.OldTaskStatusId)
                        .Select(s => s.StatusName)
                        .FirstOrDefault(),
                    NewStatusName = _context.TaskStatuses
                        .Where(s => s.TaskStatusId == h.NewTaskStatusId)
                        .Select(s => s.StatusName)
                        .FirstOrDefault(),
                    h.Feedback,
                    h.ChangedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = history
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

            var normalizedPriority = request.Priority?.Trim() ?? "";
            var normalizedComplexity = request.Complexity?.Trim() ?? "";

            var priorityMultiplier = await _context.PriorityMultipliers
                .Where(p => p.CompanyId == request.CompanyId && p.PriorityName == normalizedPriority)
                .Select(p => p.Multiplier)
                .FirstOrDefaultAsync();

            var complexityMultiplier = await _context.ComplexityMultipliers
                .Where(c => c.CompanyId == request.CompanyId && c.ComplexityName == normalizedComplexity)
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
                Priority = normalizedPriority,
                Complexity = normalizedComplexity,
                EstimatedEffortHours = request.EstimatedEffortHours,
                Weight = calculatedWeight,
                StartDate = request.StartDate,
                DueDate = request.DueDate,
                TaskStatusId = taskStatusId,
                IsArchived = false,
                ArchivedAt = null
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

        [HttpPut("update")]
        public async Task<IActionResult> UpdateTask([FromBody] UpdateTaskRequest request)
        {
            if (request == null || request.TaskId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.TaskId == request.TaskId);

            if (task == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Task not found."
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

            if (request.AssignedToUserId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Assigned user is required."
                });
            }

            var assignedUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == request.AssignedToUserId && u.CompanyId == task.CompanyId);

            if (assignedUser == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Assigned user not found."
                });
            }

            var normalizedPriority = request.Priority?.Trim() ?? "";
            var normalizedComplexity = request.Complexity?.Trim() ?? "";

            var priorityMultiplier = await _context.PriorityMultipliers
                .Where(p => p.CompanyId == task.CompanyId && p.PriorityName == normalizedPriority)
                .Select(p => p.Multiplier)
                .FirstOrDefaultAsync();

            var complexityMultiplier = await _context.ComplexityMultipliers
                .Where(c => c.CompanyId == task.CompanyId && c.ComplexityName == normalizedComplexity)
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

            task.Title = request.Title.Trim();
            task.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            task.AssignedToUserId = request.AssignedToUserId;
            task.Priority = normalizedPriority;
            task.Complexity = normalizedComplexity;
            task.EstimatedEffortHours = request.EstimatedEffortHours;
            task.Weight = request.EstimatedEffortHours * priorityMultiplier * complexityMultiplier;

            if (request.TeamId > 0)
            {
                task.TeamId = request.TeamId;
            }

            if (request.StartDate.HasValue)
            {
                task.StartDate = request.StartDate.Value;
            }

            if (request.DueDate.HasValue)
            {
                task.DueDate = request.DueDate.Value;
            }

            if (request.TaskStatusId.HasValue && request.TaskStatusId.Value > 0)
            {
                var selectedStatus = await _context.TaskStatuses
                    .FirstOrDefaultAsync(s =>
                        s.TaskStatusId == request.TaskStatusId.Value &&
                        s.CompanyId == task.CompanyId &&
                        s.IsActive);

                if (selectedStatus == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Selected task status is invalid."
                    });
                }

                task.TaskStatusId = request.TaskStatusId.Value;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Task updated successfully."
            });
        }

        [HttpPut("update/{taskId:int}")]
        public async Task<IActionResult> UpdateTaskByRoute(int taskId, [FromBody] UpdateTaskRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            request.TaskId = taskId;
            return await UpdateTask(request);
        }

        [HttpPut("{taskId:int}")]
        public async Task<IActionResult> UpdateTaskByPlainRoute(int taskId, [FromBody] UpdateTaskRequest request)
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            request.TaskId = taskId;
            return await UpdateTask(request);
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

            bool isSameStatus = task.TaskStatusId == request.NewTaskStatusId;
            bool hasFeedback = !string.IsNullOrWhiteSpace(request.Feedback);

            if (isSameStatus && !hasFeedback)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Task already has this status."
                });
            }

            var oldTaskStatusId = task.TaskStatusId;

            if (!isSameStatus)
            {
                task.TaskStatusId = request.NewTaskStatusId;

                var normalizedStatusName = (newStatus.StatusName ?? "").Trim().ToLowerInvariant();

                if (normalizedStatusName == "archived")
                {
                    task.IsArchived = true;
                    task.ArchivedAt = DateTime.Now;
                }
                else
                {
                    task.IsArchived = false;
                    task.ArchivedAt = null;
                }
            }

            if (hasFeedback)
            {
                task.Feedback = request.Feedback.Trim();
            }

            _context.TaskStatusHistories.Add(new TaskStatusHistory
            {
                CompanyId = task.CompanyId,
                TaskId = task.TaskId,
                OldTaskStatusId = oldTaskStatusId,
                NewTaskStatusId = request.NewTaskStatusId,
                ChangedByUserId = request.ChangedByUserId,
                Feedback = hasFeedback ? request.Feedback.Trim() : null,
                ChangedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = hasFeedback && isSameStatus
                    ? "Feedback submitted successfully."
                    : "Task status updated successfully."
            });
        }

[HttpPost("{taskId:int}/change-requests")]
public async Task<IActionResult> CreateTaskChangeRequest(int taskId, [FromBody] CreateTaskChangeRequestRequest request)
{
    try
    {
        if (request == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid request."
            });
        }

        if (taskId <= 0 || request.TaskId <= 0 || taskId != request.TaskId)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid task id."
            });
        }

        if (request.RequestedByUserId <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "RequestedBy user is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.ChangeType))
        {
            return BadRequest(new
            {
                success = false,
                message = "Change type is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new
            {
                success = false,
                message = "Reason is required."
            });
        }

        var task = await _context.Tasks
            .FirstOrDefaultAsync(t => t.TaskId == taskId);

        if (task == null)
        {
            return NotFound(new
            {
                success = false,
                message = "Task not found."
            });
        }

        var requestedByUser = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.UserId == request.RequestedByUserId &&
                u.CompanyId == task.CompanyId);

        if (requestedByUser == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "RequestedBy user is invalid."
            });
        }

        var normalizedChangeType = request.ChangeType.Trim();

        var allowedTypes = new[]
        {
            "dueDateChange",
            "estimatedEffortChange",
            "assigneeChange",
            "other"
        };

        if (!allowedTypes.Contains(normalizedChangeType))
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid change type."
            });
        }

        if (normalizedChangeType == "dueDateChange" && string.IsNullOrWhiteSpace(request.NewValue))
        {
            return BadRequest(new
            {
                success = false,
                message = "New due date is required."
            });
        }

        if (normalizedChangeType == "estimatedEffortChange" && string.IsNullOrWhiteSpace(request.NewValue))
        {
            return BadRequest(new
            {
                success = false,
                message = "New estimated effort is required."
            });
        }

        var changeRequest = new TaskChangeRequest
        {
            CompanyId = task.CompanyId,
            TaskId = task.TaskId,
            RequestedByUserId = request.RequestedByUserId,
            ChangeType = normalizedChangeType,
            OldTaskStatusId = task.TaskStatusId,
            NewTaskStatusId = task.TaskStatusId,
            OldValue = string.IsNullOrWhiteSpace(request.OldValue) ? null : request.OldValue.Trim(),
            NewValue = string.IsNullOrWhiteSpace(request.NewValue) ? null : request.NewValue.Trim(),
            Reason = request.Reason.Trim(),
            RequestStatus = "Pending",
            ReviewedByUserId = null,
            CreatedAt = DateTime.Now,
            ReviewedAt = null
        };

        _context.TaskChangeRequests.Add(changeRequest);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Request change submitted successfully.",
            data = new
            {
                changeRequest.TaskChangeRequestId,
                changeRequest.TaskId,
                changeRequest.ChangeType,
                changeRequest.OldValue,
                changeRequest.NewValue,
                changeRequest.Reason,
                changeRequest.RequestStatus,
                changeRequest.CreatedAt
            }
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new
        {
            success = false,
            message = "Failed to create task change request.",
            error = ex.Message,
            innerError = ex.InnerException?.Message
        });
    }
}

[HttpGet("{taskId:int}/change-requests")]
public async Task<IActionResult> GetTaskChangeRequests(int taskId)
{
    var task = await _context.Tasks
        .FirstOrDefaultAsync(t => t.TaskId == taskId);

    if (task == null)
    {
        return NotFound(new
        {
            success = false,
            message = "Task not found."
        });
    }

    var requests = await _context.TaskChangeRequests
        .Where(r => r.TaskId == taskId)
        .OrderByDescending(r => r.CreatedAt)
        .Select(r => new
        {
            r.TaskChangeRequestId,
            r.TaskId,
            r.ChangeType,
            r.OldValue,
            r.NewValue,
            r.Reason,
            r.RequestStatus,
            r.RequestedByUserId,
            RequestedByName = _context.Users
                .Where(u => u.UserId == r.RequestedByUserId)
                .Select(u => u.FullName)
                .FirstOrDefault(),
            r.ReviewedByUserId,
            ReviewedByName = _context.Users
                .Where(u => u.UserId == r.ReviewedByUserId)
                .Select(u => u.FullName)
                .FirstOrDefault(),
            r.CreatedAt,
            r.ReviewedAt
        })
        .ToListAsync();

    return Ok(new
    {
        success = true,
        data = requests
    });
}
    }
}