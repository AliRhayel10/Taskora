import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../assets/styles/teamleader/tasks-section.css";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "todo", label: "To Do" },
  { key: "inprogress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "inprogress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  teamId: "",
  assignedUserId: "",
  priority: "",
  complexity: "",
  estimatedEffortHours: "",
  startDate: "",
  dueDate: "",
};

const getInitials = (fullName = "") => {
  const parts = fullName.trim().split(" ").filter(Boolean);

  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB");
};

const formatHours = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}h`;
};

const normalizeStatus = (status = "") => {
  const safe = String(status).trim().toLowerCase();

  if (["new", "todo", "to do"].includes(safe)) return "todo";
  if (["inprogress", "in progress"].includes(safe)) return "inprogress";
  if (safe === "blocked") return "blocked";
  if (safe === "done") return "done";

  return "todo";
};

const getStatusLabel = (status = "") => {
  const normalized = normalizeStatus(status);
  return (
    STATUS_OPTIONS.find((option) => option.value === normalized)?.label || "To Do"
  );
};

const getPriorityClass = (priority = "") => {
  const safe = String(priority).toLowerCase();

  if (safe === "critical") return "tasks-section__badge--critical";
  if (safe === "high") return "tasks-section__badge--high";
  if (safe === "medium") return "tasks-section__badge--medium";

  return "tasks-section__badge--low";
};

const getStatusClass = (status = "") => {
  const normalized = normalizeStatus(status);

  if (normalized === "inprogress") return "tasks-section__status--progress";
  if (normalized === "blocked") return "tasks-section__status--blocked";
  if (normalized === "done") return "tasks-section__status--done";

  return "tasks-section__status--todo";
};

const buildTaskPayload = (formState) => ({
  title: formState.title.trim(),
  description: formState.description.trim(),
  teamId: Number(formState.teamId),
  assignedUserId: Number(formState.assignedUserId),
  priority: formState.priority,
  complexity: formState.complexity,
  estimatedEffortHours: Number(formState.estimatedEffortHours),
  startDate: formState.startDate,
  dueDate: formState.dueDate,
});

const mapTaskFromApi = (task) => ({
  id: task.id ?? task.taskId ?? crypto.randomUUID(),
  title: task.title ?? "",
  description: task.description ?? "",
  assignedUserId: task.assignedUserId ?? task.assignedToUserId ?? "",
  assignedUserName:
    task.assignedUserName ??
    task.assignedToUserName ??
    task.assignedEmployeeName ??
    "Unknown User",
  assignedUserEmail:
    task.assignedUserEmail ??
    task.assignedToUserEmail ??
    task.assignedEmployeeEmail ??
    "",
  assignedUserAvatar: task.assignedUserAvatar ?? "",
  priority: task.priority ?? "Low",
  complexity: task.complexity ?? "Simple",
  estimatedEffortHours:
    task.estimatedEffortHours ?? task.effort ?? task.effortHours ?? 0,
  weight: task.weight ?? 0,
  status: task.status ?? "New",
  startDate: task.startDate ?? "",
  dueDate: task.dueDate ?? "",
  teamId: task.teamId ?? "",
});

export default function TasksSection({
  tasksEndpoint = "/api/tasks",
  createTaskEndpoint = "/api/tasks",
  updateTaskStatusEndpoint = "/api/tasks/status",
  setupRulesEndpoint = "/api/tasks/setup-rules",
  teamsEndpoint = "/api/teams",
  usersEndpoint = "/api/users",
  pageSize = 5,
}) {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);

  const statusMenuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchJson = async (url) => {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed for ${url}`);
      }

      return response.json();
    };

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [tasksData, setupRulesData, teamsData, usersData] =
          await Promise.all([
            fetchJson(tasksEndpoint).catch(() => []),
            fetchJson(setupRulesEndpoint).catch(() => ({})),
            fetchJson(teamsEndpoint).catch(() => []),
            fetchJson(usersEndpoint).catch(() => []),
          ]);

        if (!isMounted) return;

        const normalizedTasks = Array.isArray(tasksData)
          ? tasksData.map(mapTaskFromApi)
          : Array.isArray(tasksData?.items)
          ? tasksData.items.map(mapTaskFromApi)
          : [];

        setTasks(normalizedTasks);

        setPriorityOptions(
          Array.isArray(setupRulesData?.priorities)
            ? setupRulesData.priorities.map((item) =>
                typeof item === "string"
                  ? item
                  : item.priorityName ?? item.name ?? item.value
              )
            : ["Low", "Medium", "High", "Critical"]
        );

        setComplexityOptions(
          Array.isArray(setupRulesData?.complexities)
            ? setupRulesData.complexities.map((item) =>
                typeof item === "string"
                  ? item
                  : item.complexityName ?? item.name ?? item.value
              )
            : ["Simple", "Medium", "Complex"]
        );

        setTeams(
          Array.isArray(teamsData)
            ? teamsData
            : Array.isArray(teamsData?.items)
            ? teamsData.items
            : []
        );

        setUsers(
          Array.isArray(usersData)
            ? usersData
            : Array.isArray(usersData?.items)
            ? usersData.items
            : []
        );
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage("Unable to load tasks right now.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [tasksEndpoint, setupRulesEndpoint, teamsEndpoint, usersEndpoint]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target)
      ) {
        setOpenStatusMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!formState.teamId) return users;

    return users.filter((user) => {
      if (user.teamId && String(user.teamId) === String(formState.teamId)) {
        return true;
      }

      if (Array.isArray(user.teamIds)) {
        return user.teamIds.map(String).includes(String(formState.teamId));
      }

      return false;
    });
  }, [users, formState.teamId]);

  const taskCounts = useMemo(() => {
    const counts = {
      all: tasks.length,
      todo: 0,
      inprogress: 0,
      blocked: 0,
      done: 0,
    };

    tasks.forEach((task) => {
      const key = normalizeStatus(task.status);
      counts[key] += 1;
    });

    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusKey = normalizeStatus(task.status);
      return activeTab === "all" ? true : statusKey === activeTab;
    });
  }, [tasks, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  const createTask = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = buildTaskPayload(formState);

      const response = await fetch(createTaskEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create task.");
      }

      const createdTask = await response.json().catch(() => null);

      if (createdTask) {
        setTasks((previous) => [mapTaskFromApi(createdTask), ...previous]);
      }

      setFormState(DEFAULT_FORM);
      setIsCreateOpen(false);
      setFeedback({
        type: "success",
        message: "Task created successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Unable to create task.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const previousTasks = [...tasks];

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    setOpenStatusMenuId(null);

    try {
      const response = await fetch(updateTaskStatusEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status.");
      }
    } catch (error) {
      setTasks(previousTasks);
      setFeedback({
        type: "error",
        message: "Unable to update task status.",
      });
    }
  };

  const handleDeleteTask = (taskId) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setFeedback({
      type: "success",
      message: "Task removed from the list.",
    });
  };

  const handleFormChange = (field, value) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const startIndex = filteredTasks.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredTasks.length);

  return (
    <section className="tasks-section">
      <div className="tasks-section__title-row">
        <h2>Tasks</h2>
        <div className="tasks-section__title-line" />
      </div>

      {feedback && (
        <div
          className={`tasks-section__feedback ${
            feedback.type === "success"
              ? "tasks-section__feedback--success"
              : "tasks-section__feedback--error"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="tasks-section__toolbar tasks-section__toolbar--align-end">
        <button
          type="button"
          className="tasks-section__create-btn"
          onClick={() => setIsCreateOpen(true)}
        >
          <FiPlus />
          Create Task
        </button>
      </div>

      <div className="tasks-section__tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tasks-section__tab ${
              activeTab === tab.key ? "tasks-section__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tasks-section__tab-text">{tab.label}</span>
            <span className="tasks-section__tab-count">
              {taskCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="tasks-section__state-card">
          <h3>Loading tasks</h3>
          <p>Please wait while the task list is being prepared.</p>
        </div>
      ) : errorMessage ? (
        <div className="tasks-section__state-card tasks-section__state-card--error">
          <h3>Something went wrong</h3>
          <p>{errorMessage}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="tasks-section__state-card">
          <h3>No tasks found</h3>
          <p>Try changing the selected tab or create a new task to get started.</p>
        </div>
      ) : (
        <div className="tasks-section__table-card">
          <div className="tasks-section__table-wrap">
            <table className="tasks-section__table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Complexity</th>
                  <th>Effort</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th className="tasks-section__col-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedTasks.map((task, index) => (
                  <tr
                    key={task.id}
                    className={
                      index % 2 === 0
                        ? "tasks-section__row--odd"
                        : "tasks-section__row--even"
                    }
                  >
                    <td>
                      <div className="tasks-section__task-cell">
                        <strong>{task.title}</strong>
                        <small>{task.description || "No description"}</small>
                      </div>
                    </td>

                    <td>
                      <div className="tasks-section__user-cell">
                        <div className="tasks-section__avatar">
                          {task.assignedUserAvatar ? (
                            <img
                              src={task.assignedUserAvatar}
                              alt={task.assignedUserName}
                              className="tasks-section__avatar-image"
                            />
                          ) : (
                            getInitials(task.assignedUserName)
                          )}
                        </div>

                        <div className="tasks-section__user-details">
                          <strong>{task.assignedUserName}</strong>
                          <small>{task.assignedUserEmail || "—"}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`tasks-section__badge ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    <td>{task.complexity}</td>
                    <td>{formatHours(task.estimatedEffortHours)}</td>
                    <td>{task.weight}</td>

                    <td className="tasks-section__cell-status">
                      <div
                        className="tasks-section__status-menu-wrap"
                        ref={openStatusMenuId === task.id ? statusMenuRef : null}
                      >
                        <button
                          type="button"
                          className={`tasks-section__status-button ${getStatusClass(
                            task.status
                          )}`}
                          onClick={() =>
                            setOpenStatusMenuId((current) =>
                              current === task.id ? null : task.id
                            )
                          }
                        >
                          <span>{getStatusLabel(task.status)}</span>
                          <FiChevronDown />
                        </button>

                        {openStatusMenuId === task.id && (
                          <div className="tasks-section__status-menu">
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`tasks-section__status-menu-item ${
                                  normalizeStatus(task.status) === option.value
                                    ? "tasks-section__status-menu-item--active"
                                    : ""
                                }`}
                                onClick={() =>
                                  updateTaskStatus(task.id, option.value)
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>{formatDate(task.dueDate)}</td>

                    <td className="tasks-section__cell-actions">
                      <div className="tasks-section__actions">
                        <button
                          type="button"
                          className="tasks-section__action-btn tasks-section__action-btn--edit"
                          title="Edit task"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          type="button"
                          className="tasks-section__action-btn tasks-section__action-btn--danger"
                          title="Delete task"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tasks-section__pagination">
            <div className="tasks-section__pagination-info">
              Showing {startIndex}-{endIndex} of {filteredTasks.length} tasks
            </div>

            <div className="tasks-section__pagination-controls">
              <button
                type="button"
                className="tasks-section__page-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft />
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`tasks-section__page-btn tasks-section__page-btn--number ${
                    currentPage === pageNumber
                      ? "tasks-section__page-btn--active"
                      : ""
                  }`}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="tasks-section__page-btn"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div
          className="tasks-section__modal-overlay"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="tasks-section__modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Create Task</h3>
                <p>Fill in the task details and assign it to a team member.</p>
              </div>

              <button
                type="button"
                className="tasks-section__modal-close"
                onClick={() => setIsCreateOpen(false)}
              >
                <FiX />
              </button>
            </div>

            <form className="tasks-section__form" onSubmit={createTask}>
              <div className="tasks-section__form-grid">
                <div className="tasks-section__form-group tasks-section__form-group--full">
                  <label htmlFor="task-title">Title</label>
                  <input
                    id="task-title"
                    type="text"
                    value={formState.title}
                    onChange={(event) =>
                      handleFormChange("title", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group tasks-section__form-group--full">
                  <label htmlFor="task-description">Description</label>
                  <textarea
                    id="task-description"
                    value={formState.description}
                    onChange={(event) =>
                      handleFormChange("description", event.target.value)
                    }
                    rows={4}
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-team">Team</label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-team"
                      value={formState.teamId}
                      onChange={(event) => {
                        handleFormChange("teamId", event.target.value);
                        handleFormChange("assignedUserId", "");
                      }}
                      required
                    >
                      <option value="">Select team</option>
                      {teams.map((team) => (
                        <option
                          key={team.id ?? team.teamId}
                          value={team.id ?? team.teamId}
                        >
                          {team.name ?? team.teamName}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-user">Assigned employee</label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-user"
                      value={formState.assignedUserId}
                      onChange={(event) =>
                        handleFormChange("assignedUserId", event.target.value)
                      }
                      required
                    >
                      <option value="">Select employee</option>
                      {filteredUsers.map((user) => (
                        <option
                          key={user.id ?? user.userId}
                          value={user.id ?? user.userId}
                        >
                          {user.fullName ?? user.name}
                          {user.email ? ` (${user.email})` : ""}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-priority">Priority</label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-priority"
                      value={formState.priority}
                      onChange={(event) =>
                        handleFormChange("priority", event.target.value)
                      }
                      required
                    >
                      <option value="">Select priority</option>
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-complexity">Complexity</label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-complexity"
                      value={formState.complexity}
                      onChange={(event) =>
                        handleFormChange("complexity", event.target.value)
                      }
                      required
                    >
                      <option value="">Select complexity</option>
                      {complexityOptions.map((complexity) => (
                        <option key={complexity} value={complexity}>
                          {complexity}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-effort">Estimated effort (hours)</label>
                  <input
                    id="task-effort"
                    type="number"
                    min="1"
                    step="1"
                    value={formState.estimatedEffortHours}
                    onChange={(event) =>
                      handleFormChange(
                        "estimatedEffortHours",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-start">Start date</label>
                  <input
                    id="task-start"
                    type="date"
                    value={formState.startDate}
                    onChange={(event) =>
                      handleFormChange("startDate", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-due">Due date</label>
                  <input
                    id="task-due"
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) =>
                      handleFormChange("dueDate", event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="tasks-section__form-actions">
                <button
                  type="button"
                  className="tasks-section__secondary-btn"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tasks-section__submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
