import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../assets/styles/teamleader/tasks-section.css";
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

const API_BASE = "http://localhost:5000";

const DEFAULT_FORM = {
  title: "",
  description: "",
  assignedUserId: "",
  priority: "",
  complexity: "",
  estimatedEffortHours: "",
  startDate: "",
  dueDate: "",
};

const DEFAULT_RANGE = {
  from: undefined,
  to: undefined,
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
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

  return safe || "unknown";
};

const prettifyLabel = (value = "") =>
  String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClass = (status = "") => {
  const normalized = normalizeStatus(status);

  if (normalized === "inprogress") return "tasks-section__status--progress";
  if (normalized === "blocked") return "tasks-section__status--blocked";
  if (normalized === "done") return "tasks-section__status--done";

  return "tasks-section__status--todo";
};

const getPriorityClass = (priority = "") => {
  const safe = String(priority).toLowerCase();

  if (safe === "critical") return "tasks-section__badge--critical";
  if (safe === "high") return "tasks-section__badge--high";
  if (safe === "medium") return "tasks-section__badge--medium";

  return "tasks-section__badge--low";
};

const getResponseData = (payload) => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }

  return payload;
};

const getProfileImage = (user = {}) => {
  const rawValue =
    user.profileImageUrl ||
    user.ProfileImageUrl ||
    user.imageUrl ||
    user.ImageUrl ||
    "";

  const value = String(rawValue || "").trim();

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE}${value}`;
  }

  return `${API_BASE}/${value}`;
};

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
  assignedUserAvatar: task.assignedUserAvatar ?? task.profileImageUrl ?? "",
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
  companyId,
  tasksEndpoint,
  createTaskEndpoint,
  updateTaskStatusEndpoint,
  setupRulesEndpoint,
  statusesEndpoint,
  membersEndpoint,
  pageSize = 5,
}) {
  const storedUser = getStoredUser();

  const resolvedCompanyId = companyId ?? storedUser?.companyId ?? null;
  const resolvedCurrentUserId = storedUser?.userId ?? null;

  const resolvedTasksEndpoint =
    tasksEndpoint ?? `${API_BASE}/api/tasks`;

  const resolvedCreateTaskEndpoint =
    createTaskEndpoint ?? `${API_BASE}/api/tasks`;

  const resolvedUpdateTaskStatusEndpoint =
    updateTaskStatusEndpoint ?? `${API_BASE}/api/tasks/status`;

  const resolvedSetupRulesEndpoint =
    setupRulesEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/tasks/setup-rules/${resolvedCompanyId}`
      : "");

  const resolvedStatusesEndpoint =
    statusesEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/tasks/statuses/${resolvedCompanyId}`
      : "");

  const resolvedMembersEndpoint =
    membersEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/Teams/company/${resolvedCompanyId}/members`
      : "");

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);
  const [priorityMultipliers, setPriorityMultipliers] = useState({});
  const [complexityMultipliers, setComplexityMultipliers] = useState({});
  const [statusTabs, setStatusTabs] = useState([{ key: "all", label: "All" }]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(DEFAULT_RANGE);
  const [draftRange, setDraftRange] = useState(DEFAULT_RANGE);

  const statusMenuRef = useRef(null);
  const datePickerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchJson = async (url) => {
      if (!url) return null;

      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed for ${url}`);
      }

      return response.json();
    };

    const loadData = async () => {
      if (!resolvedCompanyId) {
        setErrorMessage("Company information is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [tasksPayload, setupRulesPayload, statusesPayload, membersPayload] =
          await Promise.all([
            fetchJson(resolvedTasksEndpoint).catch(() => []),
            fetchJson(resolvedSetupRulesEndpoint).catch(() => null),
            fetchJson(resolvedStatusesEndpoint).catch(() => null),
            fetchJson(resolvedMembersEndpoint).catch(() => []),
          ]);

        if (!isMounted) return;

        const tasksData = getResponseData(tasksPayload);
        const setupRulesData = getResponseData(setupRulesPayload);
        const statusesData = getResponseData(statusesPayload);
        const membersData = getResponseData(membersPayload);

        const normalizedTasks = Array.isArray(tasksData)
          ? tasksData.map(mapTaskFromApi)
          : Array.isArray(tasksData?.items)
          ? tasksData.items.map(mapTaskFromApi)
          : [];

        setTasks(normalizedTasks);

        const mappedPriorityMultipliers =
          setupRulesData?.priorityMultipliers &&
          typeof setupRulesData.priorityMultipliers === "object"
            ? setupRulesData.priorityMultipliers
            : {};

        const mappedComplexityMultipliers =
          setupRulesData?.complexityMultipliers &&
          typeof setupRulesData.complexityMultipliers === "object"
            ? setupRulesData.complexityMultipliers
            : {};

        setPriorityMultipliers(mappedPriorityMultipliers);
        setComplexityMultipliers(mappedComplexityMultipliers);
        setPriorityOptions(Object.keys(mappedPriorityMultipliers));
        setComplexityOptions(Object.keys(mappedComplexityMultipliers));

        const members = Array.isArray(membersData)
          ? membersData
          : Array.isArray(membersData?.items)
          ? membersData.items
          : [];

        setUsers(members);

        const backendStatuses = Array.isArray(statusesData?.statuses)
          ? statusesData.statuses
          : Array.isArray(setupRulesData?.statuses)
          ? setupRulesData.statuses
          : [];

        const tabs = backendStatuses
          .map((item) => {
            const raw =
              typeof item === "string"
                ? item
                : item?.statusName ?? item?.name ?? item?.value ?? "";

            if (!raw) return null;

            return {
              key: normalizeStatus(raw),
              label: prettifyLabel(raw),
            };
          })
          .filter(Boolean)
          .filter(
            (tab, index, array) =>
              array.findIndex((entry) => entry.key === tab.key) === index
          );

        setStatusTabs([{ key: "all", label: "All" }, ...tabs]);
      } catch {
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
  }, [
    resolvedCompanyId,
    resolvedTasksEndpoint,
    resolvedSetupRulesEndpoint,
    resolvedStatusesEndpoint,
    resolvedMembersEndpoint,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const syncDraftWithAppliedRange = () => {
    setDraftRange({
      from: selectedRange?.from || undefined,
      to: selectedRange?.to || undefined,
    });
  };

  const openDatePicker = () => {
    syncDraftWithAppliedRange();
    setIsDatePickerOpen(true);
  };

  const closeDatePicker = () => {
    syncDraftWithAppliedRange();
    setIsDatePickerOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target)
      ) {
        setOpenStatusMenuId(null);
      }

      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        closeDatePicker();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedRange]);

  useEffect(() => {
    if (formState.startDate && formState.dueDate) {
      const from = new Date(formState.startDate);
      const to = new Date(formState.dueDate);

      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        setSelectedRange({ from, to });
        return;
      }
    }

    setSelectedRange(DEFAULT_RANGE);
  }, [formState.startDate, formState.dueDate]);

  const assignableUsers = useMemo(() => {
    const filteredByRole = users.filter((user) => {
      const role = String(user.role || "").trim().toLowerCase();
      return role !== "team leader";
    });

    const source = filteredByRole.length ? filteredByRole : users;
    const query = memberSearch.trim().toLowerCase();

    if (!query) return source;

    return source.filter((user) => {
      const fullName = String(user.fullName ?? user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      const role = String(user.role ?? "").toLowerCase();
      const jobTitle = String(user.jobTitle ?? "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        jobTitle.includes(query)
      );
    });
  }, [users, memberSearch]);

  const selectedUser = useMemo(
    () =>
      users.find(
        (user) =>
          String(user.userId ?? user.id) === String(formState.assignedUserId)
      ) || null,
    [users, formState.assignedUserId]
  );

  const taskCounts = useMemo(() => {
    const counts = { all: tasks.length };

    tasks.forEach((task) => {
      const key = normalizeStatus(task.status);
      counts[key] = (counts[key] ?? 0) + 1;
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

  const computedTaskWeight = useMemo(() => {
    const baseEffort = Number(formState.estimatedEffortHours);
    const priorityMultiplier = Number(priorityMultipliers[formState.priority] ?? 0);
    const complexityMultiplier = Number(
      complexityMultipliers[formState.complexity] ?? 0
    );

    if (!baseEffort || !priorityMultiplier || !complexityMultiplier) {
      return "";
    }

    return (baseEffort * priorityMultiplier * complexityMultiplier).toFixed(2);
  }, [
    formState.estimatedEffortHours,
    formState.priority,
    formState.complexity,
    priorityMultipliers,
    complexityMultipliers,
  ]);

  const isStepOneValid =
    formState.title.trim() !== "" && formState.assignedUserId !== "";

  const isCreateDisabled =
    isSubmitting ||
    !isStepOneValid ||
    !formState.priority ||
    !formState.complexity ||
    !formState.estimatedEffortHours ||
    !formState.startDate ||
    !formState.dueDate ||
    !computedTaskWeight;

  const formattedRangeLabel =
    selectedRange?.from && selectedRange?.to
      ? `${format(selectedRange.from, "dd/MM/yyyy")} - ${format(
          selectedRange.to,
          "dd/MM/yyyy"
        )}`
      : "Select date range";

  const openCreateModal = () => {
    setFormState(DEFAULT_FORM);
    setCreateStep(1);
    setMemberSearch("");
    setSelectedRange(DEFAULT_RANGE);
    setDraftRange(DEFAULT_RANGE);
    setIsDatePickerOpen(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateStep(1);
    setMemberSearch("");
    setSelectedRange(DEFAULT_RANGE);
    setDraftRange(DEFAULT_RANGE);
    setIsDatePickerOpen(false);
    setFormState(DEFAULT_FORM);
  };

  const applyDateRange = () => {
    if (!draftRange?.from || !draftRange?.to) return;

    setSelectedRange({
      from: draftRange.from,
      to: draftRange.to,
    });

    setFormState((previous) => ({
      ...previous,
      startDate: format(draftRange.from, "yyyy-MM-dd"),
      dueDate: format(draftRange.to, "yyyy-MM-dd"),
    }));

    setIsDatePickerOpen(false);
  };

  const createTask = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        title: formState.title.trim(),
        description: formState.description.trim(),
        assignedUserId: Number(formState.assignedUserId),
        teamId: selectedUser?.teamId ?? 0,
        createdByUserId: resolvedCurrentUserId ?? 0,
        priority: formState.priority,
        complexity: formState.complexity,
        estimatedEffortHours: Number(formState.estimatedEffortHours),
        weight: Number(computedTaskWeight),
        startDate: formState.startDate,
        dueDate: formState.dueDate,
      };

      const response = await fetch(resolvedCreateTaskEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create task.");
      }

      const createdTaskPayload = await response.json().catch(() => null);
      const createdTaskData = getResponseData(createdTaskPayload);

      if (createdTaskData) {
        setTasks((previous) => [mapTaskFromApi(createdTaskData), ...previous]);
      }

      closeCreateModal();
      setFeedback({
        type: "success",
        message: "Task created successfully.",
      });
    } catch {
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
      const response = await fetch(resolvedUpdateTaskStatusEndpoint, {
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
    } catch {
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

      <div className="tasks-section__toolbar tasks-section__toolbar--tabs-row">
        <div className="tasks-section__tabs">
          {statusTabs.map((tab) => (
            <div key={tab.key} className="tasks-section__tab-wrap">
              <button
                type="button"
                className={`tasks-section__tab ${
                  activeTab === tab.key ? "tasks-section__tab--active" : ""
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tasks-section__tab-text">{tab.label}</span>
              </button>

              <span className="tasks-section__tab-count">
                {taskCounts[tab.key] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="tasks-section__create-btn"
          onClick={openCreateModal}
        >
          <FiPlus />
          Create Task
        </button>
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
                          <span>{prettifyLabel(task.status)}</span>
                          <FiChevronDown />
                        </button>

                        {openStatusMenuId === task.id && (
                          <div className="tasks-section__status-menu">
                            {statusTabs
                              .filter((tab) => tab.key !== "all")
                              .map((tab) => (
                                <button
                                  key={tab.key}
                                  type="button"
                                  className={`tasks-section__status-menu-item ${
                                    normalizeStatus(task.status) === tab.key
                                      ? "tasks-section__status-menu-item--active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    updateTaskStatus(task.id, tab.key)
                                  }
                                >
                                  {tab.label}
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
          onClick={closeCreateModal}
        >
          <div
            className="tasks-section__modal tasks-section__modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Create Task</h3>
                <p>
                  {createStep === 1
                    ? "Add the main task details and choose the assigned employee."
                    : "Complete the remaining task details and review the calculated weight."}
                </p>
              </div>

              <button
                type="button"
                className="tasks-section__modal-close"
                onClick={closeCreateModal}
              >
                <FiX />
              </button>
            </div>

            <div className="tasks-section__stepper">
              <div
                className={`tasks-section__step ${
                  createStep === 1 ? "tasks-section__step--active" : ""
                }`}
              >
                <span className="tasks-section__step-number">1</span>
                <span className="tasks-section__step-label">Task Info</span>
              </div>
              <div className="tasks-section__step-line" />
              <div
                className={`tasks-section__step ${
                  createStep === 2 ? "tasks-section__step--active" : ""
                }`}
              >
                <span className="tasks-section__step-number">2</span>
                <span className="tasks-section__step-label">Details</span>
              </div>
            </div>

            <form className="tasks-section__form" onSubmit={createTask}>
              {createStep === 1 ? (
                <div className="tasks-section__form-grid">
                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label htmlFor="task-title">
                      Name <span className="tasks-section__required">*</span>
                    </label>
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

                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label>
                      Selected user <span className="tasks-section__required">*</span>
                    </label>
                    <p className="tasks-section__field-description">
                      Search and select one employee to assign this task to.
                    </p>

                    <div className="tasks-section__member-picker">
                      <div className="tasks-section__member-search">
                        <FiSearch />
                        <input
                          type="text"
                          placeholder="Search any member in the company..."
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                        />
                      </div>

                      <div className="tasks-section__member-table">
                        {assignableUsers.length === 0 ? (
                          <p className="tasks-section__members-empty">
                            No members found.
                          </p>
                        ) : (
                          assignableUsers.map((user) => {
                            const userId = user.userId ?? user.id;
                            const isSelected =
                              String(formState.assignedUserId) === String(userId);
                            const imageUrl = getProfileImage(user);

                            return (
                              <button
                                key={userId}
                                type="button"
                                className={`tasks-section__member-row ${
                                  isSelected
                                    ? "tasks-section__member-row--selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleFormChange("assignedUserId", String(userId))
                                }
                              >
                                <span
                                  className={`tasks-section__member-check ${
                                    isSelected
                                      ? "tasks-section__member-check--selected"
                                      : ""
                                  }`}
                                >
                                  {isSelected ? "✓" : ""}
                                </span>

                                <span className="tasks-section__member-avatar">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={user.fullName ?? user.name ?? "User"}
                                      className="tasks-section__member-avatar-image"
                                    />
                                  ) : (
                                    <span className="tasks-section__member-avatar-fallback">
                                      {getInitials(user.fullName ?? user.name ?? "")}
                                    </span>
                                  )}
                                </span>

                                <span className="tasks-section__member-copy">
                                  <strong>{user.fullName ?? user.name ?? "Unknown User"}</strong>
                                  <small>{user.email || "—"}</small>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tasks-section__form-grid">
                  <div className="tasks-section__form-group">
                    <label htmlFor="task-priority">
                      Priority <span className="tasks-section__required">*</span>
                    </label>
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
                    <label htmlFor="task-complexity">
                      Complexity <span className="tasks-section__required">*</span>
                    </label>
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
                    <label htmlFor="task-effort">
                      Base effort <span className="tasks-section__required">*</span>
                    </label>
                    <input
                      id="task-effort"
                      type="number"
                      min="1"
                      step="1"
                      value={formState.estimatedEffortHours}
                      onChange={(event) =>
                        handleFormChange("estimatedEffortHours", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="tasks-section__form-group">
                    <label htmlFor="task-weight">Task weight</label>
                    <input
                      id="task-weight"
                      type="text"
                      value={computedTaskWeight}
                      readOnly
                      placeholder="Calculated automatically"
                    />
                  </div>

                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label>
                      Date range <span className="tasks-section__required">*</span>
                    </label>

                    <div className="tasks-section__date-picker-shell" ref={datePickerRef}>
                      <button
                        type="button"
                        className="tasks-section__date-picker-trigger"
                        onClick={() => {
                          if (isDatePickerOpen) {
                            closeDatePicker();
                          } else {
                            openDatePicker();
                          }
                        }}
                      >
                        <span>{formattedRangeLabel}</span>
                        <FiCalendar />
                      </button>

                      {isDatePickerOpen && (
                        <div className="tasks-section__date-picker-popover">
                          <div className="tasks-section__date-picker-calendar">
                            <DayPicker
                              mode="range"
                              selected={draftRange}
                              onSelect={(range) =>
                                setDraftRange({
                                  from: range?.from || undefined,
                                  to: range?.to || undefined,
                                })
                              }
                              showOutsideDays
                              numberOfMonths={1}
                              className="tasks-section__day-picker"
                            />
                          </div>

                          <button
                            type="button"
                            className="tasks-section__apply-btn"
                            onClick={applyDateRange}
                            disabled={!draftRange?.from || !draftRange?.to}
                          >
                            Apply Range
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="tasks-section__form-actions">
                <button
                  type="button"
                  className="tasks-section__secondary-btn"
                  onClick={createStep === 1 ? closeCreateModal : () => setCreateStep(1)}
                  disabled={isSubmitting}
                >
                  {createStep === 1 ? "Cancel" : "Back"}
                </button>

                {createStep === 1 ? (
                  <button
                    type="button"
                    className="tasks-section__submit-btn"
                    onClick={() => setCreateStep(2)}
                    disabled={!isStepOneValid}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="tasks-section__submit-btn"
                    disabled={isCreateDisabled}
                  >
                    {isSubmitting ? "Creating..." : "Create Task"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}