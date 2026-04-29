import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiArrowLeft,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiFlag,
  FiLayers,
  FiMessageSquare,
  FiRotateCcw,
  FiSearch,
  FiSend,
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

const REQUEST_CHANGE_OPTIONS = [
  { value: "dueDateChange", label: "Due Date Change" },
  { value: "estimatedEffortChange", label: "Estimated Effort Change" },
  { value: "assigneeChange", label: "Assignee Change" },
  { value: "other", label: "Other" },
];

const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("authUser") ||
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

const isClosedTaskStatus = (status) => {
  const normalized = normalizeStatus(status);

  return (
    normalized === "done" ||
    normalized === "approved" ||
    normalized === "archived"
  );
};

const isTaskMissingAssignee = (task) => {
  const assignedId = String(task?.assignedUserId ?? task?.assignedToUserId ?? "").trim();
  const assignedName = String(task?.assignedUserName ?? task?.assignedToUserName ?? "")
    .trim()
    .toLowerCase();

  return !assignedId || !assignedName || assignedName === "unknown user";
};

const getFormerAssigneeName = (task) =>
  String(
    task?.formerAssignedUserName ||
    task?.FormerAssignedUserName ||
    task?.deletedAssigneeNameSnapshot ||
    task?.DeletedAssigneeNameSnapshot ||
    task?.assignedUserName ||
    ""
  ).trim();

const getFormerAssigneeEmail = (task) =>
  String(
    task?.formerAssignedUserEmail ||
    task?.FormerAssignedUserEmail ||
    task?.deletedAssigneeEmailSnapshot ||
    task?.DeletedAssigneeEmailSnapshot ||
    task?.assignedUserEmail ||
    ""
  ).trim();

const isHistoricalUnassignedTask = (task) => {
  return (
    isTaskMissingAssignee(task) &&
    isClosedTaskStatus(task?.effectiveStatus || task?.status) &&
    Boolean(getFormerAssigneeName(task))
  );
};

const mapStatusLabel = (status = "") => {
  const normalized = normalizeStatus(status).replace(/\s+/g, "");

  if (normalized === "new") return "New";
  if (normalized === "acknowledged") return "Acknowledged";
  if (normalized === "pending") return "Pending";
  if (normalized === "done" || normalized === "completed") return "Done";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "archived") return "Archived";

  return status || "Pending";
};

const getRequestChangeTypeLabel = (value = "") => {
  const normalized = String(value || "").trim();
  return REQUEST_CHANGE_OPTIONS.find((option) => option.value === normalized)?.label || "Other";
};

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

const getTaskStatusValue = (task = {}) => {
  const directStatus =
    task?.status ??
    task?.Status ??
    task?.effectiveStatus ??
    task?.EffectiveStatus ??
    task?.statusName ??
    task?.StatusName ??
    task?.taskStatusName ??
    task?.TaskStatusName ??
    task?.state ??
    task?.State ??
    "";

  if (typeof directStatus === "string" && directStatus.trim()) return directStatus;

  if (directStatus && typeof directStatus === "object") {
    const nestedStatus =
      directStatus?.statusName ||
      directStatus?.StatusName ||
      directStatus?.name ||
      directStatus?.Name ||
      directStatus?.taskStatusName ||
      directStatus?.TaskStatusName ||
      directStatus?.label ||
      directStatus?.Label ||
      "";

    if (String(nestedStatus || "").trim()) return nestedStatus;
  }

  const nestedSources = [
    task?.taskStatus,
    task?.TaskStatus,
    task?.statusInfo,
    task?.StatusInfo,
    task?.statusNavigation,
    task?.StatusNavigation,
  ];

  for (const nested of nestedSources) {
    if (!nested || typeof nested !== "object") continue;

    const nestedStatus =
      nested?.statusName ||
      nested?.StatusName ||
      nested?.name ||
      nested?.Name ||
      nested?.taskStatusName ||
      nested?.TaskStatusName ||
      nested?.label ||
      nested?.Label ||
      "";

    if (String(nestedStatus || "").trim()) return nestedStatus;
  }

  return "Not set";
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
    storedUser?.userId ??
    storedUser?.UserId ??
    storedUser?.id ??
    storedUser?.Id ??
    storedUser?.employeeId ??
    storedUser?.EmployeeId ??
    null;

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
  const currentTaskId = currentTask?.id || currentTask?.taskId || currentTask?.TaskId || "";
  const resolvedHistoryEndpoint = currentTaskId
    ? `${API_BASE}/api/tasks/${currentTaskId}/history`
    : "";
  const resolvedChangeRequestsEndpoint = currentTaskId
    ? `${API_BASE}/api/tasks/${currentTaskId}/change-requests`
    : "";
  const [backendStatuses, setBackendStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMemberSearch, setEditMemberSearch] = useState("");
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
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskChangeRequests, setTaskChangeRequests] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showAllFeedbackHistory, setShowAllFeedbackHistory] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  const loadTaskHistory = useCallback(async () => {
    if (!resolvedHistoryEndpoint) {
      setTaskHistory([]);
      setTaskChangeRequests([]);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const [historyResponse, changeRequestsResponse] = await Promise.all([
        fetch(resolvedHistoryEndpoint),
        resolvedChangeRequestsEndpoint ? fetch(resolvedChangeRequestsEndpoint) : Promise.resolve(null),
      ]);

      const historyPayload = historyResponse.status === 204 ? null : await parseJsonSafe(historyResponse);
      const changeRequestsPayload =
        changeRequestsResponse && changeRequestsResponse.status !== 204
          ? await parseJsonSafe(changeRequestsResponse)
          : null;

      if (!historyResponse.ok) {
        throw new Error(historyPayload?.message || historyPayload?.title || "Unable to load task history.");
      }

      const historyItems = Array.isArray(historyPayload?.data)
        ? historyPayload.data
        : Array.isArray(historyPayload?.history)
          ? historyPayload.history
          : [];

      const requestItems =
        changeRequestsResponse?.ok && changeRequestsPayload?.success !== false
          ? Array.isArray(changeRequestsPayload?.data)
            ? changeRequestsPayload.data
            : Array.isArray(changeRequestsPayload?.requests)
              ? changeRequestsPayload.requests
              : Array.isArray(changeRequestsPayload)
                ? changeRequestsPayload
                : []
          : [];

      setTaskHistory(historyItems);
      setTaskChangeRequests(requestItems);
    } catch (error) {
      setTaskHistory([]);
      setTaskChangeRequests([]);
      setFeedback((previous) => previous ?? {
        type: "error",
        message: error?.message || "Unable to load task history.",
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [resolvedChangeRequestsEndpoint, resolvedHistoryEndpoint]);

  useEffect(() => {
    loadTaskHistory();
  }, [loadTaskHistory]);

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

  const status = getTaskStatusValue(currentTask);
  const startDateLabel = formatDateLabel(currentTask?.startDate);
  const dueDateLabel = formatDateLabel(currentTask?.dueDate);
  const normalizedCurrentStatus = normalizeStatus(status);
  const formatDateTimeLabel = (value) => {
    if (!value) return "Unknown time";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);

    const now = new Date();
    const isSameDay = parsed.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = parsed.toDateString() === yesterday.toDateString();
    const timeLabel = parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isSameDay) return `Today, ${timeLabel}`;
    if (isYesterday) return `Yesterday, ${timeLabel}`;

    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentStatusId = useMemo(() => {
    const directStatusId = Number(
      currentTask?.taskStatusId ?? currentTask?.statusId ?? currentTask?.TaskStatusId ?? 0,
    );

    if (directStatusId) return directStatusId;

    const matchedStatus = backendStatuses.find(
      (item) => normalizeStatus(getBackendStatusName(item)) === normalizedCurrentStatus,
    );

    return Number(getBackendStatusId(matchedStatus) || 0);
  }, [backendStatuses, currentTask, normalizedCurrentStatus]);

  const historyEntries = useMemo(() => {
    return taskHistory.map((item, index) => {
      const changedByName =
        item?.changedByName || item?.ChangedByName || `User ${item?.changedByUserId || item?.ChangedByUserId || ""}`;
      const oldStatusName = item?.oldStatusName || item?.OldStatusName || "";
      const newStatusName = item?.newStatusName || item?.NewStatusName || "";
      const feedbackText = String(item?.feedback || item?.Feedback || "").trim();
      const changedAt = item?.changedAt || item?.ChangedAt || "";
      const oldNormalized = normalizeStatus(oldStatusName);
      const newNormalized = normalizeStatus(newStatusName);
      const hasStatusChanged = !!newStatusName && oldNormalized !== newNormalized;
      const isRejectedReassignmentToPending =
        feedbackText &&
        (oldNormalized === "done" || oldNormalized === "completed") &&
        newNormalized === "pending";

      return {
        id: item?.taskStatusHistoryId || item?.TaskStatusHistoryId || `${changedAt}-${index}`,
        type: hasStatusChanged ? "status" : "feedback",
        changedByName,
        oldStatusName,
        newStatusName,
        feedbackText,
        changedAt,
        changedAtLabel: formatDateTimeLabel(changedAt),
        hasStatusChanged,
        isRejectedReassignmentToPending,
        timelineTitle: isRejectedReassignmentToPending
          ? "Task rejected and reassigned to Pending."
          : hasStatusChanged
            ? `Status changed to ${mapStatusLabel(newStatusName)}`
            : feedbackText
              ? "Feedback added"
              : `Status updated to ${mapStatusLabel(newStatusName || "Unknown")}`,
      };
    });
  }, [taskHistory]);

  const requestTimelineEntries = useMemo(() => {
    return taskChangeRequests.map((item, index) => {
      const requestStatus = item?.requestStatus || item?.RequestStatus || "Pending";
      const normalizedRequestStatus = normalizeStatus(requestStatus).replace(/\s+/g, "");
      const reviewedAt = item?.reviewedAt || item?.ReviewedAt || "";
      const createdAt = item?.createdAt || item?.CreatedAt || item?.changedAt || item?.ChangedAt || "";
      const timelineDate = reviewedAt || createdAt;
      const requestTypeLabel = getRequestChangeTypeLabel(item?.changeType || item?.ChangeType || "other");
      const changedByName =
        normalizedRequestStatus === "approved" || normalizedRequestStatus === "rejected"
          ? item?.reviewedByName || item?.ReviewedByName || "Team leader"
          : item?.requestedByName || item?.RequestedByName || item?.changedByName || item?.ChangedByName || "Requester";

      return {
        id: item?.taskChangeRequestId || item?.TaskChangeRequestId || `timeline-request-${index}`,
        type: "request",
        hasStatusChanged: false,
        isRequestChange: true,
        title:
          normalizedRequestStatus === "approved"
            ? "Change request approved"
            : normalizedRequestStatus === "rejected"
              ? "Change request rejected"
              : "Change request made",
        changedAt: timelineDate,
        changedAtLabel: formatDateTimeLabel(timelineDate),
        changedByName,
        requestTypeLabel,
        requestStatus,
        normalizedRequestStatus: normalizedRequestStatus || "pending",
        reviewNote: item?.reviewNote || item?.ReviewNote || "",
        reason: item?.reason || item?.Reason || "",
      };
    });
  }, [taskChangeRequests]);

  const timelineEntries = useMemo(() => {
    return [...historyEntries, ...requestTimelineEntries].sort(
      (a, b) => new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime(),
    );
  }, [historyEntries, requestTimelineEntries]);

  const feedbackHistoryEntries = useMemo(
    () => historyEntries.filter((item) => item.feedbackText),
    [historyEntries],
  );

  const visibleFeedbackHistoryEntries = useMemo(
    () => (showAllFeedbackHistory ? feedbackHistoryEntries : feedbackHistoryEntries.slice(0, 3)),
    [feedbackHistoryEntries, showAllFeedbackHistory],
  );

  const visibleTimelineEntries = useMemo(
    () => (showAllTimeline ? timelineEntries : timelineEntries.slice(0, 5)),
    [showAllTimeline, timelineEntries],
  );

  const currentTeamId = useMemo(() => {
    const taskTeamId = Number(currentTask?.teamId ?? currentTask?.TeamId ?? 0);

    if (taskTeamId) return taskTeamId;

    const assignedUserId = Number(
      currentTask?.assignedUserId ??
        currentTask?.assignedToUserId ??
        currentTask?.AssignedToUserId ??
        0,
    );

    if (!assignedUserId) return 0;

    const matchedTeam = teams.find((team) => {
      const memberIds = Array.isArray(team?.memberIds)
        ? team.memberIds
        : Array.isArray(team?.MemberIds)
          ? team.MemberIds
          : [];
      const leaderId = Number(
        team?.teamLeaderUserId ??
          team?.teamLeaderId ??
          team?.TeamLeaderUserId ??
          team?.TeamLeaderId ??
          0,
      );

      return (
        memberIds.some((id) => Number(id) === assignedUserId) ||
        leaderId === assignedUserId
      );
    });

    return Number(matchedTeam?.teamId ?? matchedTeam?.TeamId ?? 0);
  }, [currentTask, teams]);

  const currentTeamMemberIds = useMemo(() => {
    if (!currentTeamId) return [];

    const currentTeam = teams.find(
      (team) => Number(team?.teamId ?? team?.TeamId ?? 0) === Number(currentTeamId),
    );

    const idsFromTeam = Array.isArray(currentTeam?.memberIds)
      ? currentTeam.memberIds
      : Array.isArray(currentTeam?.MemberIds)
        ? currentTeam.MemberIds
        : [];

    const idsFromUsers = users
      .filter((user) => {
        const directTeamId = Number(
          user?.teamId ??
            user?.TeamId ??
            user?.team?.teamId ??
            user?.team?.TeamId ??
            0,
        );
        const teamIds = user?.teamIds ?? user?.TeamIds;

        return (
          directTeamId === Number(currentTeamId) ||
          (Array.isArray(teamIds) &&
            teamIds.some((id) => Number(id) === Number(currentTeamId)))
        );
      })
      .map((user) =>
        Number(user?.userId ?? user?.UserId ?? user?.id ?? user?.Id ?? 0),
      );

    return Array.from(
      new Set([...idsFromTeam, ...idsFromUsers].map((id) => Number(id)).filter(Boolean)),
    );
  }, [teams, users, currentTeamId]);

  const currentTeamMemberIdSet = useMemo(
    () => new Set(currentTeamMemberIds.map((id) => Number(id))),
    [currentTeamMemberIds],
  );

  const editAssignableUsers = useMemo(() => {
    const query = editMemberSearch.trim().toLowerCase();

    const teamMembers = users.filter((user) => {
      const role = String(user?.role ?? user?.Role ?? "").trim().toLowerCase();
      if (role === "team leader") return false;

      const userId = Number(user?.userId ?? user?.UserId ?? user?.id ?? user?.Id ?? 0);

      if (currentTeamMemberIdSet.size > 0) {
        return currentTeamMemberIdSet.has(userId);
      }

      const directTeamId = Number(
        user?.teamId ?? user?.TeamId ?? user?.team?.teamId ?? user?.team?.TeamId ?? 0,
      );
      const teamIds = user?.teamIds ?? user?.TeamIds;

      return (
        Boolean(currentTeamId) &&
        (directTeamId === Number(currentTeamId) ||
          (Array.isArray(teamIds) &&
            teamIds.some((id) => Number(id) === Number(currentTeamId))))
      );
    });

    if (!query) return teamMembers;

    return teamMembers.filter((user) => {
      const fullName = String(user?.fullName ?? user?.name ?? user?.FullName ?? "").toLowerCase();
      const email = String(user?.email ?? user?.Email ?? "").toLowerCase();
      const role = String(user?.role ?? user?.Role ?? "").toLowerCase();
      const jobTitle = String(user?.jobTitle ?? user?.JobTitle ?? "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        jobTitle.includes(query)
      );
    });
  }, [users, editMemberSearch, currentTeamMemberIdSet, currentTeamId]);

  const editSelectedUser = useMemo(
    () =>
      users.find(
        (user) =>
          String(user?.userId ?? user?.UserId ?? user?.id ?? user?.Id ?? "") ===
          String(editFormState.assignedUserId || ""),
      ) || null,
    [users, editFormState.assignedUserId],
  );

  const canContinueEdit = Boolean(
    editFormState.title.trim() &&
      editFormState.description.trim() &&
      editFormState.assignedUserId,
  );

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

  const isHistoricalUnassigned = isHistoricalUnassignedTask(currentTask);
  const formerAssigneeName = getFormerAssigneeName(currentTask);
  const formerAssigneeEmail = getFormerAssigneeEmail(currentTask);

  const assignee = useMemo(
    () => ({
      fullName: isHistoricalUnassigned
        ? `${formerAssigneeName} (deleted user)`
        : currentTask?.assignedUserName || "Unassigned",
      email: isHistoricalUnassigned
        ? formerAssigneeEmail || "Original user was deleted"
        : currentTask?.assignedUserEmail || "No email available",
      assignedUserAvatar: isHistoricalUnassigned ? "" : currentTask?.assignedUserAvatar || "",
    }),
    [currentTask, isHistoricalUnassigned, formerAssigneeName, formerAssigneeEmail],
  );

  const profileImage = getProfileImage(assignee);
  const title = currentTask?.title?.trim() || "Untitled Task";
  const description = currentTask?.description?.trim() || "No task description was added.";
  const priority = currentTask?.priority || "Low";
  const complexity = currentTask?.complexity || "Simple";
  const effort = Number(currentTask?.estimatedEffortHours || 0);
  const weight = Number(currentTask?.weight || 0);
  const canEdit =
    normalizedCurrentStatus === "new" ||
    normalizedCurrentStatus === "acknowledged" ||
    normalizedCurrentStatus === "pending";
  const canDelete = canEdit;
  const isDone = normalizedCurrentStatus === "done";
  const isApproved = normalizedCurrentStatus === "approved";
  const canReviewDoneTask = isDone;
  const canReassignDoneTask = isDone && !isHistoricalUnassigned;

  const hasToolbarActions = canReviewDoneTask || isApproved || canDelete;

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

    setEditMemberSearch("");
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditMemberSearch("");
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
      await loadTaskHistory();

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

      setIsReviewMenuOpen(false);
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

    const trimmedFeedback = taskFeedbackText.trim();

    if (!trimmedFeedback || isSubmittingTaskFeedback) return;
    if (!currentTask?.id || !resolvedCurrentUserId || !currentStatusId) {
      setFeedback({
        type: "error",
        message: "Unable to submit feedback right now.",
      });
      return;
    }

    setIsSubmittingTaskFeedback(true);
    setFeedback(null);

    try {
      const response = await fetch(resolvedUpdateTaskStatusEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskId: Number(currentTask.id),
          NewTaskStatusId: Number(currentStatusId),
          ChangedByUserId: Number(resolvedCurrentUserId),
          Feedback: trimmedFeedback,
        }),
      });

      let payload = null;
      if (response.status !== 204) {
        payload = await parseJsonSafe(response);
      }

      if (!response.ok) {
        throw new Error(payload?.message || payload?.title || "Unable to submit feedback.");
      }

      refreshCurrentTask({
        feedback: trimmedFeedback,
        lastFeedback: trimmedFeedback,
      });
      await loadTaskHistory();
      setTaskFeedbackText("");
      setFeedback({
        type: "success",
        message: "Feedback submitted successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Unable to submit feedback.",
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
            {canReviewDoneTask ? (
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
                  <span>{isHistoricalUnassigned ? "Review Historical Task" : "Review Task"}</span>
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
                      <span>{isHistoricalUnassigned ? "Approve Historical Completion" : "Approve"}</span>
                    </button>

                    {canReassignDoneTask ? (
                      <button
                        type="button"
                        className="task-details-page__review-option task-details-page__review-option--reject"
                        onClick={handleReassign}
                        disabled={isUpdatingStatus || !pendingStatusId}
                      >
                        <FiRotateCcw />
                        <span>Re Assign</span>
                      </button>
                    ) : null}
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

        <div className="task-details-page__right-column">
          <div className="task-details-page__top-panels">
            <div className="task-details-page__timeline-card">
              <div className="task-details-page__section-header">
                <div className="task-details-page__section-title-wrap">
                  <span className="task-details-page__section-icon">
                    <FiClock />
                  </span>
                  <h3>Activity Timeline</h3>
                </div>

                {timelineEntries.length > 4 ? (
                  <button
                    type="button"
                    className="task-details-page__view-all-btn"
                    onClick={() => setShowAllTimeline((previous) => !previous)}
                  >
                    {showAllTimeline ? "Show less" : "View all"}
                  </button>
                ) : null}
              </div>

              <div className="task-details-page__card-scroll-area">
                {isHistoryLoading ? (
                  <div className="task-details-page__empty-state">Loading timeline...</div>
                ) : visibleTimelineEntries.length ? (
                  <div className="task-details-page__timeline-list">
                    {visibleTimelineEntries.map((item) => (
                      <div key={item.id} className="task-details-page__timeline-item">
                        <div
                          className={`task-details-page__timeline-marker ${item.type === "status"
                              ? "task-details-page__timeline-marker--status"
                              : item.type === "request"
                                ? "task-details-page__timeline-marker--request"
                                : "task-details-page__timeline-marker--feedback"
                            }`}
                        />
                        <div className="task-details-page__timeline-content">
                          <div className="task-details-page__timeline-heading">
                            {item.type === "status" ? (
                              item.isRejectedReassignmentToPending ? (
                                <>
<span>Task rejected and reassigned to </span>
<span className={getStatusClass(item.newStatusName)}>
  {mapStatusLabel(item.newStatusName)}
</span>
                                </>
                              ) : (
                                <>
                                  <span>Status changed to </span>
                                  <span className={getStatusClass(item.newStatusName)}>
                                    {mapStatusLabel(item.newStatusName)}
                                  </span>
                                </>
                              )
                            ) : item.type === "request" ? (
                              item.title || "Change request made"
                            ) : (
                              item.timelineTitle
                            )}
                          </div>
                          <div className="task-details-page__timeline-meta">
                            {item.changedByName ? `By ${item.changedByName} • ` : ""}
                            {item.changedAtLabel}
                          </div>
                          {item.type === "request" ? (
                            <div className="task-details-page__timeline-request-note">
                              <div>
                                <strong>Type:</strong> {item.requestTypeLabel}
                              </div>
                              {item.reviewNote ? (
                                <div>
                                  <strong>Review note:</strong> {item.reviewNote}
                                </div>
                              ) : null}
                            </div>
                          ) : item.feedbackText ? (
                            <div className="task-details-page__timeline-note">“{item.feedbackText}”</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="task-details-page__empty-state">No activity has been recorded yet.</div>
                )}
              </div>
            </div>

            <div className="task-details-page__history-card task-details-page__summary-card">
              <div className="task-details-page__section-header">
                <div className="task-details-page__section-title-wrap">
                  <span className="task-details-page__section-icon">
                    <FiMessageSquare />
                  </span>
                  <h3>Feedback Summary</h3>
                </div>

                {feedbackHistoryEntries.length > 2 ? (
                  <button
                    type="button"
                    className="task-details-page__view-all-btn"
                    onClick={() => setShowAllFeedbackHistory((previous) => !previous)}
                  >
                    {showAllFeedbackHistory ? "Show less" : "View all"}
                  </button>
                ) : null}
              </div>

              <div className="task-details-page__summary-stats">
                <div className="task-details-page__summary-stat">
                  <span>Total Feedback</span>
                  <strong>{feedbackHistoryEntries.length}</strong>
                </div>
                <div className="task-details-page__summary-stat">
                  <span>Latest Update</span>
                  <strong>
                    {feedbackHistoryEntries.length
                      ? feedbackHistoryEntries[0].changedAtLabel
                      : "No updates yet"}
                  </strong>
                </div>
              </div>

              <div className="task-details-page__card-scroll-area">
                {isHistoryLoading ? (
                  <div className="task-details-page__empty-state">Loading feedback...</div>
                ) : visibleFeedbackHistoryEntries.length ? (
                  <div className="task-details-page__history-list">
                    {visibleFeedbackHistoryEntries.map((item, index) => (
                      <div key={item.id} className="task-details-page__history-item">
                        <div className="task-details-page__history-dot" />
                        <div className="task-details-page__history-avatar">
                          {getInitials(item.changedByName)}
                        </div>
                        <div className="task-details-page__history-content">
                          <div className="task-details-page__history-meta">
                            <strong>{item.changedByName}</strong>
                            <span>{item.changedAtLabel}</span>
                            {index === 0 ? (
                              <span className="task-details-page__history-badge">Latest</span>
                            ) : null}
                          </div>
                          <p>{item.feedbackText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="task-details-page__empty-state">No feedback has been added yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="task-details-page__feedback-inline-card">
            <form className="task-details-page__feedback-inline-form" onSubmit={handleTaskFeedbackSubmit}>
              <div className="task-details-page__feedback-inline-main">
                <div className="task-details-page__feedback-inline-input-wrap">
                  <input
                    id="task-details-feedback"
                    type="text"
                    value={taskFeedbackText}
                    onChange={(event) => setTaskFeedbackText(event.target.value.slice(0, 500))}
                    placeholder="Add feedback and send it..."
                    disabled={isSubmittingTaskFeedback}
                    maxLength={500}
                  />
                  <div className="task-details-page__feedback-inline-count">
                    {taskFeedbackText.length}/500
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="task-details-page__feedback-inline-submit"
                disabled={isSubmittingTaskFeedback || !taskFeedbackText.trim()}
                aria-label="Send feedback"
              >
                <FiSend />
                <span>{isSubmittingTaskFeedback ? "Sending..." : "Send"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {isEditOpen ? (
        <div className="tasks-section__modal-overlay" onClick={closeEditModal}>
          <div
            className="tasks-section__modal tasks-section__modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Edit Task</h3>
                <p>Update the task fields and assignment.</p>
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

            <form className="tasks-section__form task-details-page__edit-form" onSubmit={handleSaveEdit}>
              <div className="task-details-page__edit-form-grid">
                <div className="task-details-page__edit-form-column task-details-page__edit-form-column--main">
                  <div className="tasks-section__form-group">
                    <label htmlFor="task-details-title">
                      Name <span className="tasks-section__required">*</span>
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

                  <div className="tasks-section__form-group">
                    <label htmlFor="task-details-description">
                      Description <span className="tasks-section__required">*</span>
                    </label>
                    <textarea
                      id="task-details-description"
                      value={editFormState.description}
                      onChange={(event) =>
                        handleEditFormChange("description", event.target.value)
                      }
                      rows={3}
                      required
                    />
                  </div>

                  <div className="tasks-section__form-group task-details-page__edit-assignee-group">
                    <label>
                      Assigned To <span className="tasks-section__required">*</span>
                    </label>
                    <p className="tasks-section__field-description">
                      Search and select one employee from this team.
                    </p>

                    <div className="tasks-section__member-picker task-details-page__edit-member-picker">
                      <div className="tasks-section__member-search">
                        <FiSearch />
                        <input
                          type="text"
                          placeholder="Search a member in this team..."
                          value={editMemberSearch}
                          onChange={(event) => setEditMemberSearch(event.target.value)}
                        />
                      </div>

                      <div className="tasks-section__member-table task-details-page__edit-member-table">
                        {editAssignableUsers.length === 0 ? (
                          <p className="tasks-section__members-empty">
                            No members found.
                          </p>
                        ) : (
                          editAssignableUsers.map((user) => {
                            const userId = user?.userId ?? user?.UserId ?? user?.id ?? user?.Id;
                            const userName =
                              user?.fullName ??
                              user?.FullName ??
                              user?.name ??
                              user?.Name ??
                              "Unknown User";
                            const userEmail = user?.email ?? user?.Email ?? "—";
                            const isSelected =
                              String(editFormState.assignedUserId) === String(userId);
                            const imageUrl = getProfileImage(user);

                            return (
                              <button
                                key={userId}
                                type="button"
                                className={`tasks-section__member-row ${isSelected
                                    ? "tasks-section__member-row--selected"
                                    : ""
                                  }`}
                                onClick={() =>
                                  handleEditFormChange("assignedUserId", String(userId))
                                }
                              >
                                <span
                                  className={`tasks-section__member-check ${isSelected
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
                                      alt={userName}
                                      className="tasks-section__member-avatar-image"
                                    />
                                  ) : (
                                    <span className="tasks-section__member-avatar-fallback">
                                      {getInitials(userName)}
                                    </span>
                                  )}
                                </span>

                                <span className="tasks-section__member-copy">
                                  <strong>{userName}</strong>
                                  <small>{userEmail}</small>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="task-details-page__edit-form-column task-details-page__edit-form-column--details">
                  <div className="task-details-page__edit-compact-grid">
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

                    <div className="tasks-section__form-group">
                      <label htmlFor="task-details-assignee-preview">Selected Employee</label>
                      <input
                        id="task-details-assignee-preview"
                        type="text"
                        className="tasks-section__task-weight-input"
                        value={
                          editSelectedUser
                            ? editSelectedUser?.fullName ??
                              editSelectedUser?.FullName ??
                              editSelectedUser?.name ??
                              editSelectedUser?.Name ??
                              "Selected employee"
                            : "Not selected"
                        }
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="tasks-section__form-actions task-details-page__edit-form-actions">
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
                  disabled={isSavingEdit || !canContinueEdit}
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
                    {confirmAction === "approve"
                      ? isHistoricalUnassigned
                        ? "Approve Historical Completion"
                        : "Approve Task"
                      : "Re Assign Task"}
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
                    {isHistoricalUnassigned
                      ? "Approve this task as a historical completion. The original assignee was deleted, so no reassignment is needed."
                      : "Are you sure you want to approve this task?"}
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
                    className={`task-details-page__confirm-submit ${confirmAction === "approve"
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
                        ? isHistoricalUnassigned
                          ? "Approve Historical"
                          : "Approve"
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
