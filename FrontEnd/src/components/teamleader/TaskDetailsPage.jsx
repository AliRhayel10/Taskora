import React, { useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiArrowLeft,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiFlag,
  FiLayers,
  FiRotateCcw,
  FiTarget,
  FiTrash2,
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

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  deleteTaskEndpoint,
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
  const resolvedDeleteTaskEndpoint = deleteTaskEndpoint ?? `${API_BASE}/api/tasks/delete`;

  const [currentTask, setCurrentTask] = useState(task);
  const [backendStatuses, setBackendStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isReviewMenuOpen, setIsReviewMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reassignFeedback, setReassignFeedback] = useState("");
  const [editFormState, setEditFormState] = useState(DEFAULT_EDIT_FORM);
  const [feedback, setFeedback] = useState(null);
  const [taskFeedbackText, setTaskFeedbackText] = useState("");
  const [isSubmittingTaskFeedback, setIsSubmittingTaskFeedback] = useState(false);

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

  const pendingStatusId = useMemo(() => {
    const pendingStatus = backendStatuses.find(
      (item) => normalizeStatus(getBackendStatusName(item)) === "pending",
    );
    return getBackendStatusId(pendingStatus);
  }, [backendStatuses]);

  const archivedStatusId = useMemo(() => {
    const archivedStatus = backendStatuses.find(
      (item) => normalizeStatus(getBackendStatusName(item)) === "archived",
    );
    return getBackendStatusId(archivedStatus);
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

  const normalizedCurrentStatus = normalizeStatus(status);
  const canEdit =
    normalizedCurrentStatus === "new" ||
    normalizedCurrentStatus === "acknowledged" ||
    normalizedCurrentStatus === "pending";
  const canDelete = canEdit;
  const isDone = normalizedCurrentStatus === "done";
  const isApproved = normalizedCurrentStatus === "approved";

  const hasToolbarActions = isDone || isApproved || canDelete;

  const openEditModal = () => {
    setIsReviewMenuOpen(false);

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
      startDate: toIsoDate(currentTask?.startDate || ""),
      dueDate: toIsoDate(currentTask?.dueDate || ""),
    });

    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditFormState(DEFAULT_EDIT_FORM);
  };

  const closeConfirmModal = () => {
    if (isUpdatingStatus || isDeletingTask) return;
    setConfirmAction(null);
    setReassignFeedback("");
  };

  const openDeleteModal = () => {
    setIsReviewMenuOpen(false);
    setConfirmAction("delete");
  };

  const handleEditFormChange = (field, value) => {
    setEditFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const refreshCurrentTask = (patch = {}) => {
    const nextTask = { ...currentTask, ...patch };
    setCurrentTask(nextTask);
    onTaskUpdated?.(nextTask);
    return nextTask;
  };

  const updateStatus = async (nextStatusId, successMessage, patch, feedbackText = "") => {
    if (!currentTask?.id || !nextStatusId || !resolvedCurrentUserId) {
      throw new Error("Missing required task status data.");
    }

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
          Feedback: feedbackText || "",
        }),
      });

      let payload = null;
      if (response.status !== 204) {
        payload = await parseJsonSafe(response);
      }

      if (!response.ok) {
        throw new Error(payload?.message || payload?.title || "Unable to update task status.");
      }

      refreshCurrentTask(patch);

      if (successMessage) {
        setFeedback({ type: "success", message: successMessage });
      }

      return true;
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Unable to update task status.",
      });
      throw error;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleApprove = () => {
    setIsReviewMenuOpen(false);
    setConfirmAction("approve");
  };

  const handleReassign = () => {
    setIsReviewMenuOpen(false);
    setConfirmAction("reassign");
  };

  const handleArchive = async () => {
    try {
      await updateStatus(
        archivedStatusId,
        "Task archived successfully.",
        {
          status: "Archived",
          effectiveStatus: "Archived",
          taskStatusId: archivedStatusId,
        },
        "",
      );
      window.location.reload();
    } catch {
      // feedback is already handled in updateStatus
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask?.id || isDeletingTask) return;

    setIsDeletingTask(true);
    setFeedback(null);

    try {
      const deletePayload = {
        taskId: Number(currentTask.id),
        TaskId: Number(currentTask.id),
        companyId: resolvedCompanyId ? Number(resolvedCompanyId) : undefined,
        companyID: resolvedCompanyId ? Number(resolvedCompanyId) : undefined,
        companyIdValue: resolvedCompanyId ? Number(resolvedCompanyId) : undefined,
      };

      const candidates = [
        {
          url: `${API_BASE}/api/tasks/${currentTask.id}`,
          options: { method: "DELETE" },
        },
        {
          url: `${API_BASE}/api/tasks/delete/${currentTask.id}`,
          options: { method: "DELETE" },
        },
        {
          url: `${resolvedDeleteTaskEndpoint}/${currentTask.id}`,
          options: { method: "DELETE" },
        },
        {
          url: `${resolvedDeleteTaskEndpoint}`,
          options: {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deletePayload),
          },
        },
      ];

      let success = false;
      let lastMessage = "Unable to delete task.";

      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate.url, candidate.options);
          const payload = response.status === 204 ? null : await parseJsonSafe(response);

          if (response.ok) {
            success = true;
            break;
          }

          lastMessage = payload?.message || payload?.title || lastMessage;
        } catch (error) {
          lastMessage = error?.message || lastMessage;
        }
      }

      if (!success) {
        throw new Error(lastMessage);
      }

      setConfirmAction(null);
      setFeedback({ type: "success", message: "Task deleted successfully." });
      onTaskUpdated?.(null);

      if (typeof onBack === "function") {
        onBack();
      } else {
        window.location.reload();
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Unable to delete task.",
      });
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction === "approve") {
        await updateStatus(approvedStatusId, "Task approved successfully.", {
          status: "Approved",
          taskStatusId: approvedStatusId,
        });
      }

      if (confirmAction === "reassign") {
        await updateStatus(
          pendingStatusId,
          "Task moved back to pending successfully.",
          {
            status: "Pending",
            taskStatusId: pendingStatusId,
          },
          reassignFeedback,
        );
      }

      if (confirmAction === "delete") {
        await handleDeleteTask();
        return;
      }

      setConfirmAction(null);
      setReassignFeedback("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskFeedbackCancel = () => {
    if (isSubmittingTaskFeedback) return;
    setTaskFeedbackText("");
  };

  const handleTaskFeedbackSubmit = async (event) => {
    event.preventDefault();

    if (!taskFeedbackText.trim() || isSubmittingTaskFeedback) return;

    setIsSubmittingTaskFeedback(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTaskFeedbackText("");
      setFeedback({
        type: "success",
        message: "Feedback submitted successfully.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Unable to submit feedback.",
      });
    } finally {
      setIsSubmittingTaskFeedback(false);
    }
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

      <div className="task-details-page__toolbar">
        {hasToolbarActions ? (
          <>
            {isDone ? (
              <div
                className="task-details-page__review-menu"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="task-details-page__review-btn"
                  onClick={() => setIsReviewMenuOpen((previous) => !previous)}
                  disabled={isUpdatingStatus || (!approvedStatusId && !pendingStatusId)}
                  aria-label={isUpdatingStatus ? "Updating task review" : "Review task"}
                  title={isUpdatingStatus ? "Updating task review" : "Review task"}
                >
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
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      className="task-details-page__review-option task-details-page__review-option--reject"
                      onClick={handleReassign}
                      disabled={isUpdatingStatus || !pendingStatusId}
                    >
                      <FiRotateCcw />
                      <span>Re Assign</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isApproved ? (
              <button
                type="button"
                className="task-details-page__archive-btn"
                onClick={handleArchive}
                disabled={isUpdatingStatus || !archivedStatusId}
                aria-label={isUpdatingStatus ? "Archiving task" : "Archive task"}
                title={isUpdatingStatus ? "Archiving task" : "Archive task"}
              >
                <FiArchive />
                <span>Archive</span>
              </button>
            ) : null}

            {canDelete ? (
              <button
                type="button"
                className="task-details-page__trash-btn"
                onClick={openDeleteModal}
                disabled={isDeletingTask}
                aria-label={isDeletingTask ? "Deleting task" : "Delete task"}
                title={isDeletingTask ? "Deleting task" : "Delete task"}
              >
                <FiTrash2 />
              </button>
            ) : null}
          </>
        ) : (
          <div className="task-details-page__toolbar-spacer" aria-hidden="true" />
        )}
      </div>

      {feedback ? (
        <div
          className={`task-details-page__feedback task-details-page__feedback--${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="task-details-page__content-grid">
        <div className="task-details-page__single-card">
          {canEdit ? (
            <button
              type="button"
              className="task-details-page__edit-btn"
              onClick={openEditModal}
              aria-label="Edit task"
              title="Edit task"
            >
              <FiEdit2 />
            </button>
          ) : null}

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

        <div className="task-details-page__feedback-card">
          <div className="task-details-page__feedback-card-header">
            <div className="task-details-page__feedback-card-icon">
              <FiEdit2 />
            </div>

            <div className="task-details-page__feedback-card-copy">
              <h3>Add Feedback</h3>
              <p>Share your feedback, notes, or important updates about this task.</p>
            </div>
          </div>

          <form className="task-details-page__feedback-form" onSubmit={handleTaskFeedbackSubmit}>
            <div className="task-details-page__feedback-form-group">
              <label htmlFor="task-details-feedback">Feedback</label>
              <textarea
                id="task-details-feedback"
                value={taskFeedbackText}
                onChange={(event) => setTaskFeedbackText(event.target.value.slice(0, 500))}
                placeholder="Write your feedback here..."
                rows={8}
                disabled={isSubmittingTaskFeedback}
              />
              <div className="task-details-page__feedback-count">
                {taskFeedbackText.length} / 500
              </div>
            </div>

            <div className="task-details-page__feedback-actions">
              <button
                type="button"
                className="task-details-page__feedback-cancel"
                onClick={handleTaskFeedbackCancel}
                disabled={isSubmittingTaskFeedback || !taskFeedbackText.length}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="task-details-page__feedback-submit"
                disabled={isSubmittingTaskFeedback || !taskFeedbackText.trim()}
              >
                {isSubmittingTaskFeedback ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </form>
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
                    type="date"
                    value={editFormState.startDate}
                    onChange={(event) =>
                      handleEditFormChange("startDate", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="tasks-section__form-group">
                  <label htmlFor="task-details-due-date">
                    Due Date <span className="tasks-section__required">*</span>
                  </label>
                  <input
                    id="task-details-due-date"
                    type="date"
                    value={editFormState.dueDate}
                    onChange={(event) =>
                      handleEditFormChange("dueDate", event.target.value)
                    }
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

      {confirmAction ? (
        <div
          className="tasks-section__modal-overlay"
          onClick={closeConfirmModal}
        >
          <div
            className={
              confirmAction === "delete"
                ? "tasks-section__confirm-modal"
                : "task-details-page__confirm-modal"
            }
            onClick={(event) => event.stopPropagation()}
          >
            {confirmAction === "delete" ? (
              <>
                <div className="tasks-section__confirm-copy">
                  <h3>Delete Task</h3>
                  <p>Are you sure you want to delete this task?</p>
                </div>

                <div className="tasks-section__confirm-actions">
                  <button
                    type="button"
                    className="tasks-section__secondary-btn"
                    onClick={closeConfirmModal}
                    disabled={isDeletingTask}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="tasks-section__danger-btn"
                    onClick={handleConfirmAction}
                    disabled={isDeletingTask}
                  >
                    {isDeletingTask ? "Deleting..." : "Confirm"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="task-details-page__confirm-header">
                  <h3>
                    {confirmAction === "approve" ? "Approve Task" : "Re Assign Task"}
                  </h3>

                  <button
                    type="button"
                    className="task-details-page__confirm-close"
                    onClick={closeConfirmModal}
                    aria-label="Close confirmation"
                    disabled={isUpdatingStatus}
                  >
                    <FiX />
                  </button>
                </div>

                {confirmAction === "approve" ? (
                  <p className="task-details-page__confirm-text">
                    Are you sure you want to approve this task?
                  </p>
                ) : (
                  <>
                    <p className="task-details-page__confirm-text">
                      Add feedback for the assigned user. The task will stay assigned to the same user and will be moved to Pending.
                    </p>

                    <div className="task-details-page__confirm-form-group">
                      <label htmlFor="task-reassign-feedback">Feedback</label>
                      <textarea
                        id="task-reassign-feedback"
                        value={reassignFeedback}
                        onChange={(event) => setReassignFeedback(event.target.value)}
                        placeholder="Write feedback here"
                        rows={5}
                        disabled={isUpdatingStatus}
                      />
                    </div>
                  </>
                )}

                <div className="task-details-page__confirm-actions">
                  <button
                    type="button"
                    className="task-details-page__confirm-cancel"
                    onClick={closeConfirmModal}
                    disabled={isUpdatingStatus}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={`task-details-page__confirm-submit ${
                      confirmAction === "approve"
                        ? "task-details-page__confirm-submit--approve"
                        : "task-details-page__confirm-submit--reject"
                    }`}
                    onClick={handleConfirmAction}
                    disabled={
                      isUpdatingStatus ||
                      (confirmAction === "reassign" && !reassignFeedback.trim())
                    }
                  >
                    {isUpdatingStatus
                      ? "Saving..."
                      : confirmAction === "approve"
                        ? "Approve"
                        : "Re Assign"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
