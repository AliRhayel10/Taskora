import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiFlag,
  FiLayers,
  FiRotateCcw,
  FiTarget,
  FiUser,
  FiX,
} from "react-icons/fi";
import "../../assets/styles/teamleader/tasks-section.css";
import "../../assets/styles/teamleader/task-details-page.css";

const API_BASE = "http://localhost:5000";

const DEFAULT_EDIT_FORM = {
  title: "",
  description: "",
  assignedUserId: "",
  priority: "",
  complexity: "",
  estimatedEffortHours: "",
  startDate: "",
  dueDate: "",
};

const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("loggedInUser");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const normalizeStatus = (value = "") => String(value).trim().toLowerCase();

const getProfileImage = (user = {}) => {
  const rawValue =
    user.profileImageUrl ||
    user.ProfileImageUrl ||
    user.imageUrl ||
    user.ImageUrl ||
    user.assignedUserAvatar ||
    user.avatar ||
    "";

  const value = String(rawValue || "").trim();

  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;

  return `${API_BASE}/${value}`;
};

const getInitials = (value = "") => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const formatDateLabel = (value) => {
  if (!value) return "Not set";

  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw.split("T")[0] : raw;
  const parsed = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toIsoDate = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return "";

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return `${year}-${month}-${day}`;
};

const toDisplayDate = (value = "") => {
  const iso = toIsoDate(value);
  if (!iso) return "";

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const formatDateInputValue = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  const parts = [];

  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));

  return parts.join("/");
};

const getPriorityClass = (priority = "") => {
  const normalized = String(priority).trim().toLowerCase();

  if (normalized === "low") return "task-details-page__value--low";
  if (normalized === "medium") return "task-details-page__value--medium-priority";
  if (normalized === "high") return "task-details-page__value--high";
  if (normalized === "critical") return "task-details-page__value--critical";

  return "task-details-page__value--default";
};

const getComplexityClass = (complexity = "") => {
  const normalized = String(complexity).trim().toLowerCase();

  if (normalized === "simple") return "task-details-page__value--simple";
  if (normalized === "medium") return "task-details-page__value--medium-complexity";
  if (normalized === "complex") return "task-details-page__value--complex";

  return "task-details-page__value--default";
};

const getStatusClass = (status = "") => {
  const normalized = String(status).trim().toLowerCase();

  if (normalized === "new") return "task-details-page__value--new";
  if (normalized === "acknowledged") return "task-details-page__value--acknowledged";
  if (normalized === "pending") return "task-details-page__value--pending";
  if (normalized === "done") return "task-details-page__value--done";
  if (normalized === "approved") return "task-details-page__value--approved";
  if (normalized === "rejected") return "task-details-page__value--rejected";
  if (normalized === "archived") return "task-details-page__value--archived";

  return "task-details-page__value--default";
};

const getResponseData = (payload) => payload?.data ?? payload ?? null;

const getStatusesArrayFromPayload = (payload) => {
  const data = getResponseData(payload);

  if (Array.isArray(data)) return data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.statuses)) return payload.statuses;
  if (Array.isArray(data?.statuses)) return data.statuses;

  return [];
};

const getMembersArrayFromPayload = (payload) => {
  const data = getResponseData(payload);

  if (Array.isArray(data)) return data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.members)) return payload.members;
  if (Array.isArray(data?.members)) return data.members;

  return [];
};

const getTeamsArrayFromPayload = (payload) => {
  const data = getResponseData(payload);

  if (Array.isArray(data)) return data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.teams)) return payload.teams;
  if (Array.isArray(data?.teams)) return data.teams;

  return [];
};

const getBackendStatusName = (status) =>
  status?.statusName || status?.name || status?.taskStatusName || status?.label || "";

const getBackendStatusId = (status) =>
  status?.taskStatusId || status?.statusId || status?.id || status?.TaskStatusId || null;

const buildTaskUpdatePayload = ({ currentTask, editFormState, companyId, teamId }) => ({
  taskId: Number(currentTask.id),
  companyId: Number(companyId),
  teamId: Number(teamId || currentTask.teamId || 0),
  title: editFormState.title.trim(),
  description: editFormState.description.trim(),
  assignedToUserId: Number(editFormState.assignedUserId),
  priority: editFormState.priority,
  complexity: editFormState.complexity,
  estimatedEffortHours: Number(editFormState.estimatedEffortHours),
  weight: Number(currentTask.weight || 0),
  taskStatusId: currentTask.taskStatusId ? Number(currentTask.taskStatusId) : undefined,
  startDate: editFormState.startDate || currentTask.startDate || null,
  dueDate: editFormState.dueDate || currentTask.dueDate || null,
});

export default function TaskDetailsPage({
  task,
  onBack,
  onTaskUpdated,
  companyId,
  statusesEndpoint,
  membersEndpoint,
  updateTaskStatusEndpoint,
  updateTaskEndpoint,
  setupRulesEndpoint,
}) {
  const storedUser = useMemo(() => getStoredUser(), []);
  const resolvedCompanyId =
    companyId ?? storedUser?.companyId ?? storedUser?.CompanyId ?? null;
  const resolvedCurrentUserId =
    storedUser?.userId ?? storedUser?.UserId ?? storedUser?.id ?? storedUser?.Id ?? null;

  const resolvedStatusesEndpoint =
    statusesEndpoint ??
    (resolvedCompanyId ? `${API_BASE}/api/tasks/statuses/${resolvedCompanyId}` : "");
  const resolvedMembersEndpoint =
    membersEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/Teams/company/${resolvedCompanyId}/members`
      : "");
  const resolvedTeamsEndpoint = resolvedCompanyId
    ? `${API_BASE}/api/Teams/company/${resolvedCompanyId}`
    : "";
  const resolvedSetupRulesEndpoint =
    setupRulesEndpoint ??
    (resolvedCompanyId ? `${API_BASE}/api/tasks/setup-rules/${resolvedCompanyId}` : "");
  const resolvedUpdateTaskStatusEndpoint =
    updateTaskStatusEndpoint ?? `${API_BASE}/api/tasks/update-status`;
  const resolvedUpdateTaskEndpoint = updateTaskEndpoint ?? `${API_BASE}/api/tasks/update`;

  const [currentTask, setCurrentTask] = useState(task);
  const [backendStatuses, setBackendStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isReviewMenuOpen, setIsReviewMenuOpen] = useState(false);
  const [editFormState, setEditFormState] = useState(DEFAULT_EDIT_FORM);
  const [startDateInput, setStartDateInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  useEffect(() => {
    let ignore = false;

    const loadMeta = async () => {
      try {
        const [statusesResponse, membersResponse, teamsResponse, setupRulesResponse] =
          await Promise.all([
            resolvedStatusesEndpoint ? fetch(resolvedStatusesEndpoint) : null,
            resolvedMembersEndpoint ? fetch(resolvedMembersEndpoint) : null,
            resolvedTeamsEndpoint ? fetch(resolvedTeamsEndpoint) : null,
            resolvedSetupRulesEndpoint ? fetch(resolvedSetupRulesEndpoint) : null,
          ]);

        const [statusesPayload, membersPayload, teamsPayload, setupRulesPayload] =
          await Promise.all([
            statusesResponse?.ok ? parseJsonSafe(statusesResponse) : null,
            membersResponse?.ok ? parseJsonSafe(membersResponse) : null,
            teamsResponse?.ok ? parseJsonSafe(teamsResponse) : null,
            setupRulesResponse?.ok ? parseJsonSafe(setupRulesResponse) : null,
          ]);

        if (ignore) return;

        setBackendStatuses(getStatusesArrayFromPayload(statusesPayload));
        setUsers(getMembersArrayFromPayload(membersPayload));
        setTeams(getTeamsArrayFromPayload(teamsPayload));

        const setupRules = getResponseData(setupRulesPayload) || {};
        const priorities = Object.keys(setupRules?.priorityMultipliers || {});
        const complexities = Object.keys(setupRules?.complexityMultipliers || {});

        setPriorityOptions(
          priorities.length ? priorities : ["Low", "Medium", "High", "Critical"],
        );
        setComplexityOptions(
          complexities.length ? complexities : ["Simple", "Medium", "Complex"],
        );
      } catch {
        if (ignore) return;
        setPriorityOptions(["Low", "Medium", "High", "Critical"]);
        setComplexityOptions(["Simple", "Medium", "Complex"]);
      }
    };

    loadMeta();

    return () => {
      ignore = true;
    };
  }, [
    resolvedMembersEndpoint,
    resolvedSetupRulesEndpoint,
    resolvedStatusesEndpoint,
    resolvedTeamsEndpoint,
  ]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!isReviewMenuOpen) return undefined;

    const handleWindowClick = () => setIsReviewMenuOpen(false);

    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, [isReviewMenuOpen]);

  const approvedStatusId = useMemo(() => {
    const approvedStatus = backendStatuses.find(
      (item) => normalizeStatus(getBackendStatusName(item)) === "approved",
    );
    return getBackendStatusId(approvedStatus);
  }, [backendStatuses]);

  const newStatusId = useMemo(() => {
    const newStatus = backendStatuses.find(
      (item) => normalizeStatus(getBackendStatusName(item)) === "new",
    );
    return getBackendStatusId(newStatus);
  }, [backendStatuses]);

  const resolveTeamIdForUser = (userId) => {
    const numericUserId = Number(userId);
    if (!numericUserId) return Number(currentTask?.teamId || 0);

    const matchedTeam = teams.find((team) => {
      const memberIds = Array.isArray(team?.memberIds) ? team.memberIds : [];
      const hasMember = memberIds.some((id) => Number(id) === numericUserId);
      const isLeader =
        Number(team?.teamLeaderUserId ?? team?.teamLeaderId) === numericUserId;

      return hasMember || isLeader;
    });

    return Number(matchedTeam?.teamId || currentTask?.teamId || 0);
  };

  const assignee = useMemo(
    () => ({
      fullName: currentTask?.assignedUserName || "Unassigned",
      email: currentTask?.assignedUserEmail || "No email available",
      assignedUserAvatar: currentTask?.assignedUserAvatar || "",
    }),
    [currentTask],
  );

  const profileImage = getProfileImage(assignee);
  const title = currentTask?.title?.trim() || "Untitled Task";
  const description = currentTask?.description?.trim() || "No task description was added.";
  const priority = currentTask?.priority || "Low";
  const complexity = currentTask?.complexity || "Simple";
  const effort = Number(currentTask?.estimatedEffortHours || 0);
  const weight = Number(currentTask?.weight || 0);
  const status = currentTask?.status || "Not set";
  const startDateLabel = formatDateLabel(currentTask?.startDate);
  const dueDateLabel = formatDateLabel(currentTask?.dueDate);
  const isDoneTask = normalizeStatus(status) === "done";

  const openEditModal = () => {
    setIsReviewMenuOpen(false);
    const nextStartDate = toIsoDate(currentTask?.startDate || "");
    const nextDueDate = toIsoDate(currentTask?.dueDate || "");

    setEditFormState({
      title: currentTask?.title || "",
      description: currentTask?.description || "",
      assignedUserId: String(currentTask?.assignedUserId ?? ""),
      priority: currentTask?.priority || priorityOptions[0] || "Low",
      complexity: currentTask?.complexity || complexityOptions[0] || "Simple",
      estimatedEffortHours:
        currentTask?.estimatedEffortHours === null ||
        currentTask?.estimatedEffortHours === undefined
          ? ""
          : String(currentTask.estimatedEffortHours),
      startDate: nextStartDate,
      dueDate: nextDueDate,
    });
    setStartDateInput(toDisplayDate(nextStartDate));
    setDueDateInput(toDisplayDate(nextDueDate));
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditFormState(DEFAULT_EDIT_FORM);
    setStartDateInput("");
    setDueDateInput("");
  };

  const handleEditFormChange = (field, value) => {
    setEditFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleDateInputChange = (field, rawValue) => {
    const formattedValue = formatDateInputValue(rawValue);
    const isoValue = toIsoDate(formattedValue);

    if (field === "startDate") {
      setStartDateInput(formattedValue);
    }

    if (field === "dueDate") {
      setDueDateInput(formattedValue);
    }

    handleEditFormChange(field, isoValue);
  };

  const refreshCurrentTask = (patch = {}) => {
    const nextTask = { ...currentTask, ...patch };
    setCurrentTask(nextTask);
    onTaskUpdated?.(nextTask);
    return nextTask;
  };

  const updateStatus = async (nextStatusId, successMessage, patch) => {
    if (!currentTask?.id || !nextStatusId || !resolvedCurrentUserId) return;

    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const response = await fetch(resolvedUpdateTaskStatusEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskId: Number(currentTask.id),
          NewTaskStatusId: Number(nextStatusId),
          ChangedByUserId: Number(resolvedCurrentUserId),
        }),
      });

      const payload = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(payload?.message || payload?.title || "Unable to update task status.");
      }

      refreshCurrentTask(patch);
      setFeedback({ type: "success", message: successMessage });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Unable to update task status.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleApprove = async () => {
    setIsReviewMenuOpen(false);
    await updateStatus(approvedStatusId, "Task approved successfully.", {
      status: "Approved",
      effectiveStatus: "Approved",
      taskStatusId: approvedStatusId,
    });
  };

  const handleReject = async () => {
    setIsReviewMenuOpen(false);
    await updateStatus(newStatusId, "Task rejected and returned as new.", {
      status: "New",
      effectiveStatus: "New",
      taskStatusId: newStatusId,
    });
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!currentTask?.id || !resolvedCompanyId) return;

    setIsSavingEdit(true);
    setFeedback(null);

    try {
      const payload = buildTaskUpdatePayload({
        currentTask,
        editFormState,
        companyId: resolvedCompanyId,
        teamId: resolveTeamIdForUser(editFormState.assignedUserId),
      });

      const candidates = [
        `${resolvedUpdateTaskEndpoint}`,
        `${resolvedUpdateTaskEndpoint}/${currentTask.id}`,
        `${API_BASE}/api/tasks/${currentTask.id}`,
        `${API_BASE}/api/tasks/update/${currentTask.id}`,
      ];

      let success = false;
      let lastMessage = "Unable to update task.";

      for (const url of candidates) {
        try {
          const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const responsePayload = await parseJsonSafe(response);

          if (response.ok) {
            success = true;
            break;
          }

          lastMessage =
            responsePayload?.message || responsePayload?.title || lastMessage;
        } catch (error) {
          lastMessage = error?.message || lastMessage;
        }
      }

      if (!success) {
        throw new Error(lastMessage);
      }

      const selectedUser = users.find(
        (user) =>
          String(
            user?.userId ?? user?.UserId ?? user?.id ?? user?.Id ?? "",
          ) === String(editFormState.assignedUserId),
      );

      refreshCurrentTask({
        ...currentTask,
        title: editFormState.title.trim(),
        description: editFormState.description.trim(),
        assignedUserId: Number(editFormState.assignedUserId),
        assignedUserName:
          selectedUser?.fullName ||
          selectedUser?.name ||
          selectedUser?.full_name ||
          currentTask?.assignedUserName,
        assignedUserEmail:
          selectedUser?.email || selectedUser?.Email || currentTask?.assignedUserEmail,
        assignedUserAvatar:
          selectedUser?.profileImageUrl ||
          selectedUser?.ProfileImageUrl ||
          selectedUser?.imageUrl ||
          currentTask?.assignedUserAvatar,
        priority: editFormState.priority,
        complexity: editFormState.complexity,
        estimatedEffortHours: Number(editFormState.estimatedEffortHours || 0),
        startDate: editFormState.startDate,
        dueDate: editFormState.dueDate,
      });

      closeEditModal();
      setFeedback({ type: "success", message: "Task updated successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Unable to update task.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <section className="task-details-page">
      <div className="task-details-page__title-row">
        {typeof onBack === "function" && (
          <button
            type="button"
            className="team-details-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <FiArrowLeft />
          </button>
        )}

        <h2>Task Details</h2>
        <div className="task-details-page__title-line"></div>
      </div>

      {isDoneTask ? (
        <div className="task-details-page__toolbar">
          <div
            className="task-details-page__review-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="task-details-page__review-btn"
              onClick={() => setIsReviewMenuOpen((previous) => !previous)}
              disabled={isUpdatingStatus || (!approvedStatusId && !newStatusId)}
              aria-label={isUpdatingStatus ? "Updating task review" : "Review task"}
              title={isUpdatingStatus ? "Updating task review" : "Review task"}
            >
              <FiCheck />
              <span>Review Task</span>
              <FiChevronDown />
            </button>

            {isReviewMenuOpen ? (
              <div className="task-details-page__review-dropdown">
                <button
                  type="button"
                  className="task-details-page__review-option task-details-page__review-option--approve"
                  onClick={handleApprove}
                  disabled={isUpdatingStatus || !approvedStatusId}
                >
                  <FiCheck />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  className="task-details-page__review-option task-details-page__review-option--reject"
                  onClick={handleReject}
                  disabled={isUpdatingStatus || !newStatusId}
                >
                  <FiRotateCcw />
                  <span>Reject</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`task-details-page__feedback task-details-page__feedback--${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="task-details-page__single-card">
        <button
          type="button"
          className="task-details-page__edit-btn"
          onClick={openEditModal}
          aria-label="Edit task"
          title="Edit task"
        >
          <FiEdit2 />
        </button>

        <div className="task-details-page__top-block">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="task-details-page__divider" />

        <div className="task-details-page__assigned-section">
          <h4>Assigned To</h4>

          <div className="task-details-page__assignee-row">
            <div className="task-details-page__assignee-avatar">
              {profileImage ? (
                <img src={profileImage} alt={assignee.fullName} />
              ) : (
                <span>{getInitials(assignee.fullName)}</span>
              )}
            </div>

            <div className="task-details-page__assignee-copy">
              <strong>{assignee.fullName}</strong>
              <small>{assignee.email}</small>
            </div>
          </div>
        </div>

        <div className="task-details-page__divider" />

        <div className="task-details-page__details-grid">
          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiFlag />
              <span>Priority</span>
            </div>
            <strong className={getPriorityClass(priority)}>{priority}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiLayers />
              <span>Complexity</span>
            </div>
            <strong className={getComplexityClass(complexity)}>{complexity}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiClock />
              <span>Estimated Effort</span>
            </div>
            <strong>{effort > 0 ? `${effort} h` : "Not set"}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiTarget />
              <span>Weight</span>
            </div>
            <strong>{weight > 0 ? weight.toFixed(2) : "Not set"}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiCalendar />
              <span>Due Date</span>
            </div>
            <strong>{dueDateLabel}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiCalendar />
              <span>Start Date</span>
            </div>
            <strong>{startDateLabel}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiUser />
              <span>Status</span>
            </div>
            <strong className={getStatusClass(status)}>{status}</strong>
          </div>
        </div>
      </div>

      {isEditOpen ? (
        <div className="tasks-section__modal-overlay" onClick={closeEditModal}>
          <div
            className="tasks-section__modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Edit Task</h3>
                <p>Update all task fields except weight and status.</p>
              </div>

              <button
                type="button"
                className="tasks-section__modal-close"
                onClick={closeEditModal}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <form className="tasks-section__form" onSubmit={handleSaveEdit}>
              <div className="tasks-section__form-grid">
                <div className="tasks-section__form-group tasks-section__form-group--full">
                  <label htmlFor="task-details-title">
                    Title <span className="tasks-section__required">*</span>
                  </label>
                  <input
                    id="task-details-title"
                    type="text"
                    value={editFormState.title}
                    onChange={(event) =>
                      handleEditFormChange("title", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group tasks-section__form-group--full">
                  <label htmlFor="task-details-description">
                    Description <span className="tasks-section__required">*</span>
                  </label>
                  <textarea
                    id="task-details-description"
                    value={editFormState.description}
                    onChange={(event) =>
                      handleEditFormChange("description", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-assignee">
                    Assigned To <span className="tasks-section__required">*</span>
                  </label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-details-assignee"
                      value={editFormState.assignedUserId}
                      onChange={(event) =>
                        handleEditFormChange("assignedUserId", event.target.value)
                      }
                      required
                    >
                      <option value="">Select member</option>
                      {users.map((user) => {
                        const userId =
                          user?.userId ?? user?.UserId ?? user?.id ?? user?.Id;
                        const userName =
                          user?.fullName || user?.name || user?.full_name || `User ${userId}`;

                        return (
                          <option key={userId} value={String(userId)}>
                            {userName}
                          </option>
                        );
                      })}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-priority">
                    Priority <span className="tasks-section__required">*</span>
                  </label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-details-priority"
                      value={editFormState.priority}
                      onChange={(event) =>
                        handleEditFormChange("priority", event.target.value)
                      }
                      required
                    >
                      {priorityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-complexity">
                    Complexity <span className="tasks-section__required">*</span>
                  </label>
                  <div className="tasks-section__select-wrapper">
                    <select
                      id="task-details-complexity"
                      value={editFormState.complexity}
                      onChange={(event) =>
                        handleEditFormChange("complexity", event.target.value)
                      }
                      required
                    >
                      {complexityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-effort">
                    Estimated Effort (hours) <span className="tasks-section__required">*</span>
                  </label>
                  <input
                    id="task-details-effort"
                    type="number"
                    min="0"
                    step="0.25"
                    value={editFormState.estimatedEffortHours}
                    onChange={(event) =>
                      handleEditFormChange(
                        "estimatedEffortHours",
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-start-date">
                    Start Date <span className="tasks-section__required">*</span>
                  </label>
                  <input
                    id="task-details-start-date"
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    className="task-details-page__date-input"
                    value={startDateInput}
                    onChange={(event) =>
                      handleDateInputChange("startDate", event.target.value)
                    }
                    maxLength={10}
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-due-date">
                    Due Date <span className="tasks-section__required">*</span>
                  </label>
                  <input
                    id="task-details-due-date"
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    className="task-details-page__date-input"
                    value={dueDateInput}
                    onChange={(event) =>
                      handleDateInputChange("dueDate", event.target.value)
                    }
                    maxLength={10}
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-weight">Weight</label>
                  <input
                    id="task-details-weight"
                    type="text"
                    className="tasks-section__task-weight-input"
                    value={weight > 0 ? weight.toFixed(2) : "Not set"}
                    disabled
                    readOnly
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-status">Status</label>
                  <input
                    id="task-details-status"
                    type="text"
                    className="tasks-section__task-weight-input"
                    value={status}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="tasks-section__form-actions">
                <button
                  type="button"
                  className="tasks-section__secondary-btn"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tasks-section__submit-btn"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
