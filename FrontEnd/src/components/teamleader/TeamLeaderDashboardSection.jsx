import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiUsers,
  FiClipboard,
  FiClock,
  FiBarChart2,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiEdit3,
  FiUser,
  FiInfo,
  FiX,
  FiArrowRight,
  FiSearch,
} from "react-icons/fi";
import { DayPicker } from "react-day-picker";
import { endOfMonth, format, setMonth, setYear, startOfMonth } from "date-fns";
import "react-day-picker/dist/style.css";
import "../../assets/styles/teamleader/team-leader-dashboard-section.css";

const PAGE_SIZE = 5;
const RANGE_STORAGE_KEY = "teamleader_dashboard_range";
const API_BASE = "http://localhost:5000";

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getTodayRange() {
  const today = new Date();
  return {
    start: startOfDay(today),
    end: endOfDay(today),
  };
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);

  const weekStart = startOfDay(start);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return {
    start: weekStart,
    end: endOfDay(weekEnd),
  };
}

function getMonthRange(monthDate) {
  const base = startOfMonth(monthDate || new Date());
  return {
    start: startOfDay(base),
    end: endOfDay(endOfMonth(base)),
  };
}

function isFullMonthRange(range) {
  if (!(range?.from instanceof Date) || !(range?.to instanceof Date)) return false;

  const monthStart = startOfMonth(range.from);
  const monthEnd = endOfMonth(range.from);

  return (
    startOfDay(range.from).getTime() === startOfDay(monthStart).getTime() &&
    endOfDay(range.to).getTime() === endOfDay(monthEnd).getTime() &&
    range.from.getMonth() === range.to.getMonth() &&
    range.from.getFullYear() === range.to.getFullYear()
  );
}

function formatMonthYearText(date) {
  return format(date, "MMMM yyyy");
}

function getInitialCalendarMonth(selectedPreset, customRange) {
  if (
    selectedPreset === "custom" &&
    customRange?.from instanceof Date &&
    !Number.isNaN(customRange.from.getTime())
  ) {
    return startOfMonth(customRange.from);
  }

  return startOfMonth(new Date());
}

function buildYearOptions(tasks) {
  const currentYear = new Date().getFullYear();
  const candidateYears = [];

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const start = parseApiDate(task?.startDate);
    const due = parseApiDate(task?.dueDate);
    if (start) candidateYears.push(start.getFullYear());
    if (due) candidateYears.push(due.getFullYear());
  }

  const earliestDataYear = candidateYears.length ? Math.min(...candidateYears) : currentYear - 5;
  const startYear = Math.min(earliestDataYear, currentYear);
  const endYear = currentYear + 5;
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}

function loadRangeState() {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);

    if (!saved) {
      return {
        selectedPreset: "thisWeek",
        customRange: { from: null, to: null },
      };
    }

    const parsed = JSON.parse(saved);

    const selectedPreset =
      parsed?.selectedPreset === "nextWeek"
        ? "thisWeek"
        : parsed?.selectedPreset || "thisWeek";

    return {
      selectedPreset,
      customRange: {
        from: parsed?.customRange?.from ? new Date(parsed.customRange.from) : null,
        to: parsed?.customRange?.to ? new Date(parsed.customRange.to) : null,
      },
    };
  } catch {
    return {
      selectedPreset: "thisWeek",
      customRange: { from: null, to: null },
    };
  }
}

function saveRangeState(selectedPreset, customRange) {
  localStorage.setItem(
    RANGE_STORAGE_KEY,
    JSON.stringify({
      selectedPreset,
      customRange: {
        from: customRange?.from ? customRange.from.toISOString() : null,
        to: customRange?.to ? customRange.to.toISOString() : null,
      },
    })
  );
}

function getPresetRange(preset, customRange) {
  switch (preset) {
    case "today":
      return getTodayRange();
    case "custom": {
      if (
        customRange?.from instanceof Date &&
        !Number.isNaN(customRange.from.getTime()) &&
        customRange?.to instanceof Date &&
        !Number.isNaN(customRange.to.getTime())
      ) {
        const start = startOfDay(customRange.from);
        const end = endOfDay(customRange.to);

        if (start <= end) {
          return { start, end };
        }
      }

      return getWeekRange(0);
    }
    case "thisWeek":
    default:
      return getWeekRange(0);
  }
}

function getRangeLabel(preset) {
  switch (preset) {
    case "today":
      return "Today";
    case "custom":
      return "Custom";
    case "thisWeek":
    default:
      return "This Week";
  }
}

function parseApiDate(dateValue) {
  if (!dateValue) return null;

  const raw = String(dateValue).trim();
  if (!raw) return null;

  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw;
  const parsed = new Date(`${dateOnly}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function doesTaskOverlapRange(task, start, end) {
  const taskStart = parseApiDate(task?.startDate);
  const taskDue = parseApiDate(task?.dueDate);
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);

  if (!taskStart && !taskDue) return true;

  if (taskStart && taskDue) {
    return startOfDay(taskStart) <= rangeEnd && endOfDay(taskDue) >= rangeStart;
  }

  if (taskStart) {
    const value = startOfDay(taskStart);
    return value >= rangeStart && value <= rangeEnd;
  }

  if (taskDue) {
    const value = startOfDay(taskDue);
    return value >= rangeStart && value <= rangeEnd;
  }

  return true;
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "available") {
    return "teamleader-dashboard-section__status--available";
  }

  if (normalized === "moderate") {
    return "teamleader-dashboard-section__status--moderate";
  }

  return "teamleader-dashboard-section__status--overloaded";
}

function getStatusIcon(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "available") {
    return <FiCheckCircle />;
  }

  if (normalized === "moderate") {
    return <FiClock />;
  }

  return <FiAlertTriangle />;
}

function getWorkloadStatus(weight) {
  if (weight <= 15) return "Available";
  if (weight <= 25) return "Moderate";
  return "Overloaded";
}

function getInitials(fullName) {
  return String(fullName || "")
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function parseJsonSafely(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ");
}

function buildPageNumbers(totalPages, currentPage) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }

  if (currentPage >= totalPages - 2) {
    return [
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ];
}

function formatDateText(date) {
  return format(date, "dd/MM/yyyy");
}

function getMemberId(member) {
  return Number(member?.userId ?? 0);
}

function getTaskAssigneeId(task) {
  return Number(
    task?.assignedToUserId ??
      task?.assignedUserId ??
      task?.AssignedToUserId ??
      task?.AssignedUserId ??
      0
  );
}

function getTeamId(team) {
  return Number(team?.teamId ?? 0);
}

function getTeamName(team) {
  return String(team?.teamName || "").trim();
}

function isEmployeeMember(member) {
  return normalizeRole(member?.role) === "employee";
}

function resolveLeaderTeams(teamsData, user) {
  const userId = Number(user?.userId ?? 0);
  const userEmail = String(user?.email || "").trim().toLowerCase();
  const userName = String(
    user?.fullName || user?.name || user?.userName || ""
  )
    .trim()
    .toLowerCase();

  let matched = teamsData.filter(
    (team) =>
      Number(team?.teamLeaderUserId) === userId ||
      Number(team?.teamLeaderId) === userId
  );

  if (matched.length > 0) return matched;

  if (userName) {
    matched = teamsData.filter(
      (team) => String(team?.teamLeaderName || "").trim().toLowerCase() === userName
    );
    if (matched.length > 0) return matched;
  }

  if (userEmail) {
    matched = teamsData.filter(
      (team) => String(team?.teamLeaderEmail || "").trim().toLowerCase() === userEmail
    );
    if (matched.length > 0) return matched;
  }

  if (teamsData.length === 1) {
    return teamsData;
  }

  return [];
}

function extractTasksArray(tasksData) {
  if (Array.isArray(tasksData)) return tasksData;

  if (!tasksData || typeof tasksData !== "object") return [];

  const candidates = [
    tasksData.tasks,
    tasksData.data,
    tasksData.result,
    tasksData.items,
    tasksData.data?.tasks,
    tasksData.data?.result,
    tasksData.data?.items,
    tasksData.tasks?.result,
    tasksData.tasks?.items,
    tasksData.tasks?.data,
    tasksData.result?.tasks,
    tasksData.result?.items,
    tasksData.result?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getProfileImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE}${raw}`;
  }

  return `${API_BASE}/${raw}`;
}

function getTaskId(task) {
  return Number(task?.taskId ?? task?.TaskId ?? 0);
}

function getTaskTitle(task) {
  return String(task?.title ?? task?.Title ?? "Untitled task").trim();
}

function getChangeTypeLabel(changeType) {
  const normalized = String(changeType || "").trim();
  const normalizedLower = normalized.toLowerCase();

  if (normalized === "dueDateChange") return "Due Date Change";
  if (normalized === "estimatedEffortChange") return "Effort Change";
  if (normalized === "assigneeChange") return "Assignee Change";
  if (normalizedLower === "other" || normalizedLower === "others") return "Other Request";

  return "Other Request";
}

function formatRequestTime(dateValue) {
  if (!dateValue) return "";

  const createdAt = new Date(dateValue);

  if (Number.isNaN(createdAt.getTime())) return "";

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) return `${diffDays}d ago`;

  return format(createdAt, "dd/MM/yyyy");
}


function getChangeTypeKey(changeType) {
  return String(changeType || "").trim();
}

function getRequestTypeIcon(changeType) {
  const normalized = getChangeTypeKey(changeType);

  if (normalized === "dueDateChange") return <FiCalendar />;
  if (normalized === "estimatedEffortChange") return <FiClock />;
  if (normalized === "assigneeChange") return <FiUser />;

  return <FiEdit3 />;
}

function getRequestValueLabels(changeType) {
  const normalized = getChangeTypeKey(changeType);

  if (normalized === "dueDateChange") {
    return {
      current: "Current Due Date",
      requested: "Requested Due Date",
    };
  }

  if (normalized === "estimatedEffortChange") {
    return {
      current: "Current Effort",
      requested: "Requested Effort",
    };
  }

  if (normalized === "assigneeChange") {
    return {
      current: "Current Assignee",
      requested: "Requested Assignee",
    };
  }

  return {
    current: "Current Value",
    requested: "Requested Value",
  };
}

function formatRequestValue(value, changeType) {
  const raw = String(value ?? "").trim();

  if (!raw) return "Not set";

  if (getChangeTypeKey(changeType) === "dueDateChange") {
    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, "MMM d, yyyy");
    }
  }

  if (getChangeTypeKey(changeType) === "estimatedEffortChange") {
    const numeric = Number(raw);

    if (!Number.isNaN(numeric)) {
      return `${Number(numeric.toFixed(2))}h`;
    }
  }

  return raw;
}

function formatRequestDateTime(dateValue) {
  if (!dateValue) return "";

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) return "";

  return format(parsed, "MMM d, yyyy • h:mm a");
}

function getRequestId(request) {
  return request?.taskChangeRequestId ?? request?.TaskChangeRequestId ?? "";
}

function getRequestOldValue(request) {
  return request?.oldValue ?? request?.OldValue ?? "";
}

function getRequestNewValue(request) {
  return request?.newValue ?? request?.NewValue ?? "";
}

function getRequestReason(request) {
  return request?.reason ?? request?.Reason ?? "No reason provided.";
}

function getRequestTaskId(request) {
  return Number(request?.taskId ?? request?.TaskId ?? 0);
}

function getReviewDecisionLabel(decision) {
  return decision === "Approved" ? "approve" : "reject";
}

function getBackendMessage(data, fallback) {
  if (data && typeof data === "object" && data.message) return data.message;
  if (typeof data === "string" && data.trim()) return data.trim();
  return fallback;
}

function getUpdatedTaskFromResponse(data) {
  return (
    data?.data?.updatedTask ??
    data?.data?.UpdatedTask ??
    data?.updatedTask ??
    data?.UpdatedTask ??
    null
  );
}

function normalizeAssigneeName(value, request, fallbackName) {
  const normalized = String(value ?? "").trim();

  if (!normalized) return fallbackName || "Not set";

  return (
    request?.requestedAssigneeName ??
    request?.RequestedAssigneeName ??
    request?.newAssigneeName ??
    request?.NewAssigneeName ??
    fallbackName ??
    normalized
  );
}

function formatReviewValue(request, value, changeType, valueSide) {
  if (getChangeTypeKey(changeType) === "assigneeChange") {
    if (valueSide === "current") {
      return (
        request?.requestedByName ??
        request?.RequestedByName ??
        request?.currentAssigneeName ??
        request?.CurrentAssigneeName ??
        "Not set"
      );
    }

    return normalizeAssigneeName(value, request, "Requested assignee");
  }

  return formatRequestValue(value, changeType);
}

function normalizeTaskRequestsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

export default function TeamLeaderDashboardSection({
  user,
  searchValue = "",
}) {
  const initialRangeState = useMemo(() => loadRangeState(), []);

  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [showAllTaskRequests, setShowAllTaskRequests] = useState(false);
  const [leaderTeamName, setLeaderTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [pendingReviewDecision, setPendingReviewDecision] = useState(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);
  const [assigneeSearchValue, setAssigneeSearchValue] = useState("");
  const [selectedReviewAssigneeId, setSelectedReviewAssigneeId] = useState(null);
  const [draftReviewAssigneeId, setDraftReviewAssigneeId] = useState(null);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(
    initialRangeState.selectedPreset
  );
  const [customRange, setCustomRange] = useState(initialRangeState.customRange);

  const [draftPreset, setDraftPreset] = useState(initialRangeState.selectedPreset);
  const [draftCustomRange, setDraftCustomRange] = useState({
    from: null,
    to: null,
  });
  const [draftCalendarMonth, setDraftCalendarMonth] = useState(
    getInitialCalendarMonth(
      initialRangeState.selectedPreset,
      initialRangeState.customRange
    )
  );

  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  const rangeMenuRef = useRef(null);

  useEffect(() => {
    saveRangeState(selectedPreset, customRange);
  }, [selectedPreset, customRange]);

  const syncDraftWithAppliedState = () => {
    setDraftPreset(selectedPreset);

    if (selectedPreset === "custom") {
      setDraftCustomRange({
        from: customRange?.from || null,
        to: customRange?.to || null,
      });
      setDraftCalendarMonth(
        getInitialCalendarMonth(selectedPreset, customRange)
      );
    } else {
      setDraftCustomRange({
        from: null,
        to: null,
      });
      setDraftCalendarMonth(startOfMonth(new Date()));
    }
  };

  const openRangeMenu = () => {
    syncDraftWithAppliedState();
    setIsRangeMenuOpen(true);
  };

  const closeRangeMenu = () => {
    syncDraftWithAppliedState();
    setIsRangeMenuOpen(false);
  };

  useEffect(() => {
    if (!reviewMessage) return;

    const reviewMessageTimer = window.setTimeout(() => {
      setReviewMessage(null);
    }, 3500);

    return () => window.clearTimeout(reviewMessageTimer);
  }, [reviewMessage]);

  useEffect(() => {
    if (!isRangeMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        rangeMenuRef.current &&
        !rangeMenuRef.current.contains(event.target)
      ) {
        closeRangeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isRangeMenuOpen, selectedPreset, customRange]);

  const activeRange = useMemo(
    () => getPresetRange(selectedPreset, customRange),
    [selectedPreset, customRange]
  );

  const rangeLabel = useMemo(() => {
    if (
      selectedPreset === "custom" &&
      customRange?.from instanceof Date &&
      customRange?.to instanceof Date
    ) {
      if (isFullMonthRange(customRange)) {
        return formatMonthYearText(customRange.from);
      }

      return `${formatDateText(customRange.from)} - ${formatDateText(
        customRange.to
      )}`;
    }

    return getRangeLabel(selectedPreset);
  }, [selectedPreset, customRange]);

  const draftRangePreview = useMemo(() => {
    if (
      draftCustomRange?.from instanceof Date &&
      draftCustomRange?.to instanceof Date
    ) {
      if (isFullMonthRange(draftCustomRange)) {
        return formatMonthYearText(draftCustomRange.from);
      }

      return `${formatDateText(draftCustomRange.from)} - ${formatDateText(
        draftCustomRange.to
      )}`;
    }

    return formatMonthYearText(draftCalendarMonth);
  }, [draftCalendarMonth, draftCustomRange]);

  const yearOptions = useMemo(() => buildYearOptions(tasks), [tasks]);

  const selectedMonthIndex = draftCalendarMonth.getMonth();
  const selectedYearValue = draftCalendarMonth.getFullYear();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const companyId = parseInt(user?.companyId, 10);

      if (!companyId) {
        setErrorMessage("Missing user information.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const teamsUrl = `${API_BASE}/api/Teams/company/${encodeURIComponent(companyId)}`;
        const membersUrl = `${API_BASE}/api/Teams/company/${encodeURIComponent(companyId)}/members`;
        const tasksUrl = `${API_BASE}/api/tasks/company/${encodeURIComponent(companyId)}`;

        const [teamsResponse, membersResponse, tasksResponse] = await Promise.all([
          fetch(teamsUrl),
          fetch(membersUrl),
          fetch(tasksUrl),
        ]);

        if (!teamsResponse.ok) {
          throw new Error(`Failed to load teams. (${teamsResponse.status})`);
        }

        if (!membersResponse.ok) {
          throw new Error(`Failed to load members. (${membersResponse.status})`);
        }

        if (!tasksResponse.ok) {
          throw new Error(`Failed to load tasks. (${tasksResponse.status})`);
        }

        const [teamsData, membersData, tasksData] = await Promise.all([
          parseJsonSafely(teamsResponse),
          parseJsonSafely(membersResponse),
          parseJsonSafely(tasksResponse),
        ]);

        if (!Array.isArray(teamsData)) {
          throw new Error("Teams response format is invalid.");
        }

        if (!Array.isArray(membersData)) {
          throw new Error("Members response format is invalid.");
        }

        const resolvedTasks = extractTasksArray(tasksData);

        if (!Array.isArray(resolvedTasks) && tasksData?.success !== true) {
          throw new Error(tasksData?.message || "Tasks response format is invalid.");
        }

        const leaderTeams = resolveLeaderTeams(teamsData, user);

        if (leaderTeams.length === 0) {
          throw new Error("No team found for this team leader.");
        }

        const leaderTeamIds = leaderTeams
          .map((team) => getTeamId(team))
          .filter((id) => id > 0);

        const teamName =
          leaderTeams.map((team) => getTeamName(team)).filter(Boolean).join(", ") ||
          "Team";

        setLeaderTeamName(teamName);

        const leaderMemberIds = [
          ...new Set(
            leaderTeams.flatMap((team) =>
              Array.isArray(team?.memberIds)
                ? team.memberIds.map((id) => Number(id)).filter((id) => id > 0)
                : []
            )
          ),
        ];

        const filteredMembers = membersData.filter((member) => {
          const memberId = getMemberId(member);
          return isEmployeeMember(member) && leaderMemberIds.includes(memberId);
        });

        const filteredTasks = resolvedTasks.filter((task) => {
          const belongsToLeaderTeam = leaderTeamIds.includes(
            Number(task?.teamId ?? task?.TeamId ?? 0)
          );
          const isInRange = doesTaskOverlapRange(
            task,
            activeRange.start,
            activeRange.end
          );

          return belongsToLeaderTeam && isInRange;
        });

        const requestsByTask = await Promise.all(
          filteredTasks.map(async (task) => {
            const taskId = getTaskId(task);

            if (!taskId) return [];

            try {
              const requestResponse = await fetch(
                `${API_BASE}/api/tasks/${encodeURIComponent(taskId)}/change-requests`
              );

              if (!requestResponse.ok) return [];

              const requestData = await parseJsonSafely(requestResponse);
              const taskRequestsList = normalizeTaskRequestsResponse(requestData);

              return taskRequestsList.map((request) => {
                const newAssigneeId = Number(request?.newValue ?? request?.NewValue ?? 0);
                const requestedAssignee = membersData.find(
                  (member) => Number(member?.userId ?? member?.UserId ?? 0) === newAssigneeId
                );

                return {
                  ...request,
                  taskTitle: getTaskTitle(task),
                  taskId,
                  currentAssigneeName:
                    request?.requestedByName ??
                    request?.RequestedByName ??
                    task?.assignedUserName ??
                    task?.AssignedUserName ??
                    "Not set",
                  currentAssigneeEmail:
                    request?.requestedByEmail ??
                    request?.RequestedByEmail ??
                    task?.assignedUserEmail ??
                    task?.AssignedUserEmail ??
                    "",
                  requestedAssigneeName:
                    requestedAssignee?.fullName ??
                    requestedAssignee?.name ??
                    requestedAssignee?.FullName ??
                    request?.newValue ??
                    request?.NewValue ??
                    "Not set",
                };
              });
            } catch {
              return [];
            }
          })
        );

        const pendingRequests = requestsByTask
          .flat()
          .filter(
            (request) =>
              String(request?.requestStatus ?? request?.RequestStatus ?? "")
                .trim()
                .toLowerCase() === "pending"
          )
          .sort((a, b) => {
            const firstDate = new Date(a?.createdAt ?? a?.CreatedAt ?? 0).getTime();
            const secondDate = new Date(b?.createdAt ?? b?.CreatedAt ?? 0).getTime();

            return secondDate - firstDate;
          });

        setMembers(filteredMembers);
        setTasks(filteredTasks);
        setTaskRequests(pendingRequests);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setMembers([]);
        setTasks([]);
        setTaskRequests([]);
        setLeaderTeamName("");
        setErrorMessage(error.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, activeRange.start, activeRange.end]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  };

  const workloadRows = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    let rows = members.map((member) => {
      const memberId = getMemberId(member);

      const memberTasks = tasks.filter(
        (task) => getTaskAssigneeId(task) === memberId
      );

      const totalTasks = memberTasks.length;
      const totalEffort = memberTasks.reduce(
        (sum, task) =>
          sum + Number(task?.estimatedEffortHours || task?.EstimatedEffortHours || 0),
        0
      );
      const totalWeight = memberTasks.reduce(
        (sum, task) => sum + Number(task?.weight || task?.Weight || 0),
        0
      );

      return {
        userId: member.userId,
        employee: member.fullName || member.name || "Unknown Employee",
        email: member.email || "",
        tasks: totalTasks,
        effort: `${Number(totalEffort.toFixed(2))}h`,
        effortValue: totalEffort,
        weight: Number(totalWeight.toFixed(2)),
        status: getWorkloadStatus(totalWeight),
        profileImageUrl: member.profileImageUrl || member.ProfileImageUrl || "",
      };
    });

    if (search) {
      rows = rows.filter(
        (row) =>
          String(row.employee || "").toLowerCase().includes(search) ||
          String(row.email || "").toLowerCase().includes(search)
      );
    }

    if (sortConfig.key) {
      rows = [...rows].sort((a, b) => {
        let firstValue;
        let secondValue;

        switch (sortConfig.key) {
          case "employee":
            firstValue = String(a.employee || "").toLowerCase();
            secondValue = String(b.employee || "").toLowerCase();
            break;
          case "tasks":
            firstValue = Number(a.tasks || 0);
            secondValue = Number(b.tasks || 0);
            break;
          case "effort":
            firstValue = Number(a.effortValue || 0);
            secondValue = Number(b.effortValue || 0);
            break;
          case "weight":
            firstValue = Number(a.weight || 0);
            secondValue = Number(b.weight || 0);
            break;
          case "status":
            firstValue = String(a.status || "").toLowerCase();
            secondValue = String(b.status || "").toLowerCase();
            break;
          default:
            firstValue = "";
            secondValue = "";
        }

        if (firstValue < secondValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }

        if (firstValue > secondValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }

        return 0;
      });
    } else {
      rows = [...rows].sort((a, b) => a.employee.localeCompare(b.employee));
    }

    return rows;
  }, [members, tasks, searchValue, sortConfig]);

  const summaryCards = useMemo(() => {
    const totalTasks = tasks.length;
    const totalEffort = tasks.reduce(
      (sum, task) =>
        sum + Number(task?.estimatedEffortHours || task?.EstimatedEffortHours || 0),
      0
    );
    const totalWeight = tasks.reduce(
      (sum, task) => sum + Number(task?.weight || task?.Weight || 0),
      0
    );

    return [
      {
        title: "Team Members",
        value: members.length,
        icon: <FiUsers />,
        iconClass: "teamleader-dashboard-section__card-icon--members",
      },
      {
        title: "Tasks",
        value: totalTasks,
        icon: <FiClipboard />,
        iconClass: "teamleader-dashboard-section__card-icon--tasks",
      },
      {
        title: "Total Effort",
        value: `${Number(totalEffort.toFixed(2))}h`,
        icon: <FiClock />,
        iconClass: "teamleader-dashboard-section__card-icon--effort",
      },
      {
        title: "Total Weight",
        value: Number(totalWeight.toFixed(2)),
        icon: <FiBarChart2 />,
        iconClass: "teamleader-dashboard-section__card-icon--weight",
      },
    ];
  }, [members.length, tasks]);

  const visibleTaskRequests = useMemo(
    () => (showAllTaskRequests ? taskRequests : taskRequests.slice(0, 4)),
    [showAllTaskRequests, taskRequests]
  );

  useEffect(() => {
    if (taskRequests.length <= 4 && showAllTaskRequests) {
      setShowAllTaskRequests(false);
    }
  }, [showAllTaskRequests, taskRequests.length]);

  const totalPages = Math.max(1, Math.ceil(workloadRows.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, members.length, tasks.length, selectedPreset, customRange, sortConfig]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return workloadRows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [workloadRows, currentPage]);

  const paginationInfo = useMemo(() => {
    if (workloadRows.length === 0) {
      return "Showing 0 of 0 employees";
    }

    const startIndex = (currentPage - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(currentPage * PAGE_SIZE, workloadRows.length);

    return `Showing ${startIndex}-${endIndex} of ${workloadRows.length} employees`;
  }, [workloadRows.length, currentPage]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(totalPages, currentPage),
    [totalPages, currentPage]
  );

  const handleSelectPreset = (preset) => {
    if (preset === "custom") {
      setDraftPreset("custom");
      setDraftCustomRange({
        from: null,
        to: null,
      });
      setDraftCalendarMonth(getInitialCalendarMonth(selectedPreset, customRange));
      return;
    }

    let nextRange = customRange;

    if (preset === "today") {
      nextRange = getTodayRange();
    } else if (preset === "thisWeek") {
      nextRange = getWeekRange(0);
    }

    setDraftPreset(preset);
    setDraftCustomRange({
      from: null,
      to: null,
    });

    setSelectedPreset(preset);
    setCustomRange({
      from: nextRange.start,
      to: nextRange.end,
    });
    setIsRangeMenuOpen(false);
  };

  const handleCustomRangeSelect = (range) => {
    setDraftPreset("custom");
    setDraftCustomRange({
      from: range?.from || null,
      to: range?.to || null,
    });

    if (range?.from instanceof Date) {
      setDraftCalendarMonth(startOfMonth(range.from));
    }
  };

  const handleDraftMonthChange = (monthIndex) => {
    const nextMonth = startOfMonth(
      setMonth(new Date(draftCalendarMonth), Number(monthIndex))
    );
    setDraftCalendarMonth(nextMonth);
    setDraftPreset("custom");
    setDraftCustomRange({ from: null, to: null });
  };

  const handleDraftYearChange = (yearValue) => {
    const nextMonth = startOfMonth(
      setYear(new Date(draftCalendarMonth), Number(yearValue))
    );
    setDraftCalendarMonth(nextMonth);
    setDraftPreset("custom");
    setDraftCustomRange({ from: null, to: null });
  };

  const handleApplyCustomRange = () => {
    const monthRange = getMonthRange(draftCalendarMonth);

    const nextRange =
      draftCustomRange?.from instanceof Date &&
      draftCustomRange?.to instanceof Date
        ? {
            from: startOfDay(draftCustomRange.from),
            to: endOfDay(draftCustomRange.to),
          }
        : {
            from: monthRange.start,
            to: monthRange.end,
          };

    setSelectedPreset("custom");
    setCustomRange(nextRange);
    setIsRangeMenuOpen(false);
  };

  const openReviewForm = (request) => {
    setReviewRequest(request);
    setReviewNote("");
    setAssigneeSearchValue("");
    setSelectedReviewAssigneeId(null);
    setDraftReviewAssigneeId(null);
    setIsAssigneePickerOpen(false);
  };

  const closeReviewForm = () => {
    if (isReviewSubmitting) return;

    setReviewRequest(null);
    setReviewNote("");
    setAssigneeSearchValue("");
    setSelectedReviewAssigneeId(null);
    setDraftReviewAssigneeId(null);
    setPendingReviewDecision(null);
    setIsAssigneePickerOpen(false);
  };

  const openAssigneePicker = () => {
    if (!isAssigneeReview || isReviewSubmitting) return;
    setAssigneeSearchValue("");
    setDraftReviewAssigneeId(selectedReviewAssigneeId);
    setIsAssigneePickerOpen(true);
  };

  const closeAssigneePicker = () => {
    if (isReviewSubmitting) return;
    setDraftReviewAssigneeId(selectedReviewAssigneeId);
    setIsAssigneePickerOpen(false);
  };

  const handleSelectReviewAssignee = (userId) => {
    setDraftReviewAssigneeId(Number(userId));
  };

  const confirmAssigneePicker = () => {
    if (!draftReviewAssigneeId) return;
    setSelectedReviewAssigneeId(Number(draftReviewAssigneeId));
    setIsAssigneePickerOpen(false);
  };

  const handleReviewDecision = (decision) => {
    if (!reviewRequest || isReviewSubmitting) return;
    setPendingReviewDecision(decision);
  };

  const closeReviewConfirmation = () => {
    if (isReviewSubmitting) return;
    setPendingReviewDecision(null);
  };

  const applyUpdatedTaskToState = (updatedTask) => {
    if (!updatedTask) return;

    const updatedTaskId = Number(updatedTask.taskId ?? updatedTask.TaskId ?? 0);
    if (!updatedTaskId) return;

    setTasks((previousTasks) =>
      previousTasks.map((task) => {
        if (getTaskId(task) !== updatedTaskId) return task;

        return {
          ...task,
          assignedToUserId:
            updatedTask.assignedToUserId ??
            updatedTask.AssignedToUserId ??
            task.assignedToUserId ??
            task.AssignedToUserId,
          estimatedEffortHours:
            updatedTask.estimatedEffortHours ??
            updatedTask.EstimatedEffortHours ??
            task.estimatedEffortHours ??
            task.EstimatedEffortHours,
          weight:
            updatedTask.weight ??
            updatedTask.Weight ??
            task.weight ??
            task.Weight,
          dueDate:
            updatedTask.dueDate ??
            updatedTask.DueDate ??
            task.dueDate ??
            task.DueDate,
        };
      })
    );
  };

  const confirmReviewDecision = async () => {
    if (!reviewRequest || !pendingReviewDecision || isReviewSubmitting) return;

    const reviewedRequestId = Number(getRequestId(reviewRequest));
    const reviewedTaskId = getRequestTaskId(reviewRequest);
    const reviewerUserId = Number(user?.userId ?? user?.UserId ?? 0);

    if (!reviewedRequestId || !reviewedTaskId || !reviewerUserId) {
      setReviewMessage({
        type: "error",
        text: "Missing request or reviewer information.",
      });
      return;
    }

    const isApprovingAssigneeChange =
      pendingReviewDecision === "Approved" &&
      getChangeTypeKey(reviewRequest?.changeType ?? reviewRequest?.ChangeType) === "assigneeChange";

    if (isApprovingAssigneeChange && !selectedReviewAssigneeId) {
      setReviewMessage({
        type: "error",
        text: "Please select a new assignee before approving this request.",
      });
      return;
    }

    try {
      setIsReviewSubmitting(true);

      const reviewPayload = {
        reviewedByUserId: reviewerUserId,
        decision: pendingReviewDecision,
        reviewNote: reviewNote.trim(),
      };

      if (isApprovingAssigneeChange) {
        reviewPayload.requestedAssigneeUserId = selectedReviewAssigneeId;
      }

      const response = await fetch(
        API_BASE + "/api/tasks/" + encodeURIComponent(reviewedTaskId) + "/change-requests/" + encodeURIComponent(reviewedRequestId) + "/review",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reviewPayload),
        }
      );

      const responseData = await parseJsonSafely(response);

      if (!response.ok || responseData?.success === false) {
        throw new Error(
          getBackendMessage(
            responseData,
            "Failed to " + getReviewDecisionLabel(pendingReviewDecision) + " request."
          )
        );
      }

      setTaskRequests((previousRequests) =>
        previousRequests.filter((request) => Number(getRequestId(request)) !== reviewedRequestId)
      );

      applyUpdatedTaskToState(getUpdatedTaskFromResponse(responseData));

      setReviewMessage({
        type: "success",
        text: getBackendMessage(
          responseData,
          pendingReviewDecision === "Approved"
            ? "Change request approved successfully."
            : "Change request rejected successfully."
        ),
      });

      setReviewRequest(null);
      setReviewNote("");
      setAssigneeSearchValue("");
      setSelectedReviewAssigneeId(null);
      setDraftReviewAssigneeId(null);
      setPendingReviewDecision(null);
    } catch (error) {
      setReviewMessage({
        type: "error",
        text: error.message || "Failed to review request.",
      });
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const reviewChangeType = reviewRequest?.changeType ?? reviewRequest?.ChangeType;
  const reviewRequestedByName =
    reviewRequest?.requestedByName ??
    reviewRequest?.RequestedByName ??
    "Unknown user";
  const reviewRequestedByEmail =
    reviewRequest?.requestedByEmail ??
    reviewRequest?.RequestedByEmail ??
    "";
  const reviewCreatedAt = reviewRequest?.createdAt ?? reviewRequest?.CreatedAt;
  const reviewValueLabels = getRequestValueLabels(reviewChangeType);
  const reviewChangeTypeKey = getChangeTypeKey(reviewChangeType);
  const isAssigneeReview = reviewChangeTypeKey === "assigneeChange";
  const isOtherReview = ["other", "others"].includes(reviewChangeTypeKey.toLowerCase());
  const isApproveDisabled = isReviewSubmitting || (isAssigneeReview && !selectedReviewAssigneeId);

  const selectedReviewAssignee = useMemo(
    () =>
      workloadRows.find(
        (row) => Number(row.userId) === Number(selectedReviewAssigneeId)
      ) || null,
    [workloadRows, selectedReviewAssigneeId]
  );

  const filteredReviewAssigneeRows = useMemo(() => {
    const search = assigneeSearchValue.trim().toLowerCase();
    const requestedByUserId = Number(
      reviewRequest?.requestedByUserId ?? reviewRequest?.RequestedByUserId ?? 0
    );

    const rowsWithoutRequester = workloadRows.filter(
      (row) => Number(row.userId) !== requestedByUserId
    );

    if (!search) return rowsWithoutRequester;

    return rowsWithoutRequester.filter(
      (row) =>
        String(row.employee || "").toLowerCase().includes(search) ||
        String(row.email || "").toLowerCase().includes(search)
    );
  }, [workloadRows, assigneeSearchValue, reviewRequest]);

  return (
    <section className="teamleader-dashboard-section">
      <div className="teamleader-dashboard-section__title-row">
        <h2>Dashboard</h2>
        <span className="teamleader-dashboard-section__title-line"></span>
      </div>

      {reviewMessage && (
        <div
          className={`teamleader-dashboard-section__review-toast teamleader-dashboard-section__review-toast--${reviewMessage.type}`}
          role="status"
        >
          {reviewMessage.type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
          <span>{reviewMessage.text}</span>
        </div>
      )}
      <div className="teamleader-dashboard-section__toolbar">
        <div
          className="teamleader-dashboard-section__range-menu"
          ref={rangeMenuRef}
        >
          <button
            type="button"
            className="teamleader-dashboard-section__range-btn"
            onClick={openRangeMenu}
          >
            <span>{rangeLabel}</span>
            <FiChevronDown />
          </button>

          {isRangeMenuOpen && (
            <div className="teamleader-dashboard-section__range-dropdown">
              <div
                className="teamleader-dashboard-section__range-tabs"
                role="tablist"
                aria-label="Date range presets"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === "today"}
                  className={`teamleader-dashboard-section__range-option ${
                    draftPreset === "today"
                      ? "teamleader-dashboard-section__range-option--active"
                      : ""
                  }`}
                  onClick={() => handleSelectPreset("today")}
                >
                  Today
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === "thisWeek"}
                  className={`teamleader-dashboard-section__range-option ${
                    draftPreset === "thisWeek"
                      ? "teamleader-dashboard-section__range-option--active"
                      : ""
                  }`}
                  onClick={() => handleSelectPreset("thisWeek")}
                >
                  This Week
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === "custom"}
                  className={`teamleader-dashboard-section__range-option ${
                    draftPreset === "custom"
                      ? "teamleader-dashboard-section__range-option--active"
                      : ""
                  }`}
                  onClick={() => handleSelectPreset("custom")}
                >
                  Custom
                </button>
              </div>

              {draftPreset === "custom" && (
                <>
                  <div className="teamleader-dashboard-section__range-divider"></div>

                  <div className="teamleader-dashboard-section__custom-range">
                    <div className="teamleader-dashboard-section__custom-range-header">
                      <FiCalendar />
                      <span>Pick a custom range</span>
                    </div>

                    <div className="teamleader-dashboard-section__custom-range-preview">
                      {draftRangePreview}
                    </div>

                    <div className="teamleader-dashboard-section__month-picker-row">
                      <div className="teamleader-dashboard-section__month-picker-field">
                        <label htmlFor="teamleader-dashboard-month-select">Month</label>
                        <div className="teamleader-dashboard-section__month-picker-select-wrap">
                          <select
                            id="teamleader-dashboard-month-select"
                            className="teamleader-dashboard-section__month-picker-select"
                            value={selectedMonthIndex}
                            onChange={(event) => handleDraftMonthChange(event.target.value)}
                          >
                            {Array.from({ length: 12 }, (_, index) => (
                              <option key={index} value={index}>
                                {format(new Date(2026, index, 1), "MMMM")}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown />
                        </div>
                      </div>

                      <div className="teamleader-dashboard-section__month-picker-field">
                        <label htmlFor="teamleader-dashboard-year-select">Year</label>
                        <div className="teamleader-dashboard-section__month-picker-select-wrap">
                          <select
                            id="teamleader-dashboard-year-select"
                            className="teamleader-dashboard-section__month-picker-select"
                            value={selectedYearValue}
                            onChange={(event) => handleDraftYearChange(event.target.value)}
                          >
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown />
                        </div>
                      </div>
                    </div>

                    <div className="teamleader-dashboard-section__calendar-shell">
                      <DayPicker
                        mode="range"
                        month={draftCalendarMonth}
                        onMonthChange={(month) => setDraftCalendarMonth(startOfMonth(month))}
                        selected={draftCustomRange}
                        onSelect={handleCustomRangeSelect}
                        showOutsideDays={false}
                        numberOfMonths={1}
                        className="teamleader-dashboard-section__day-picker"
                        modifiers={{
                          past: (date) => startOfDay(date) < startOfDay(new Date()),
                        }}
                        modifiersClassNames={{
                          past: "teamleader-dashboard-section__day--past",
                        }}
                      />
                    </div>

                    <div className="teamleader-dashboard-section__apply-btn-wrap">
                      <button
                        type="button"
                        className="teamleader-dashboard-section__apply-btn"
                        onClick={handleApplyCustomRange}
                      >
                        Apply Range
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="teamleader-dashboard-section__state-card">
          Loading dashboard...
        </div>
      ) : errorMessage ? (
        <div className="teamleader-dashboard-section__state-card teamleader-dashboard-section__state-card--error">
          {errorMessage}
        </div>
      ) : (
        <>
          <div className="teamleader-dashboard-section__cards">
            {summaryCards.map((card) => (
              <article
                key={card.title}
                className="teamleader-dashboard-section__card"
              >
                <div className={`teamleader-dashboard-section__card-icon ${card.iconClass || ""}`}>
                  {card.icon}
                </div>

                <div className="teamleader-dashboard-section__card-content">
                  <span className="teamleader-dashboard-section__card-label">
                    {card.title}
                  </span>
                  <strong className="teamleader-dashboard-section__card-value">
                    {card.value}
                  </strong>
                </div>
              </article>
            ))}
          </div>

          <div className="teamleader-dashboard-section__content-grid">
            <div className="teamleader-dashboard-section__table-card">
              <div className="teamleader-dashboard-section__table-wrap">
                <table className="teamleader-dashboard-section__table">
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="teamleader-dashboard-section__sort-btn"
                          onClick={() => handleSort("employee")}
                        >
                          <span>Employee</span>
                          <FiChevronDown
                            className={`teamleader-dashboard-section__sort-icon ${
                              sortConfig.key === "employee"
                                ? "teamleader-dashboard-section__sort-icon--active"
                                : ""
                            }`}
                            style={{
                              transform:
                                sortConfig.key === "employee" &&
                                sortConfig.direction === "desc"
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          className="teamleader-dashboard-section__sort-btn"
                          onClick={() => handleSort("tasks")}
                        >
                          <span>Tasks</span>
                          <FiChevronDown
                            className={`teamleader-dashboard-section__sort-icon ${
                              sortConfig.key === "tasks"
                                ? "teamleader-dashboard-section__sort-icon--active"
                                : ""
                            }`}
                            style={{
                              transform:
                                sortConfig.key === "tasks" &&
                                sortConfig.direction === "desc"
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          className="teamleader-dashboard-section__sort-btn"
                          onClick={() => handleSort("effort")}
                        >
                          <span>Effort</span>
                          <FiChevronDown
                            className={`teamleader-dashboard-section__sort-icon ${
                              sortConfig.key === "effort"
                                ? "teamleader-dashboard-section__sort-icon--active"
                                : ""
                            }`}
                            style={{
                              transform:
                                sortConfig.key === "effort" &&
                                sortConfig.direction === "desc"
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          className="teamleader-dashboard-section__sort-btn"
                          onClick={() => handleSort("weight")}
                        >
                          <span>Weight</span>
                          <FiChevronDown
                            className={`teamleader-dashboard-section__sort-icon ${
                              sortConfig.key === "weight"
                                ? "teamleader-dashboard-section__sort-icon--active"
                                : ""
                            }`}
                            style={{
                              transform:
                                sortConfig.key === "weight" &&
                                sortConfig.direction === "desc"
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          className="teamleader-dashboard-section__sort-btn"
                          onClick={() => handleSort("status")}
                        >
                          <span>Workload Status</span>
                          <FiChevronDown
                            className={`teamleader-dashboard-section__sort-icon ${
                              sortConfig.key === "status"
                                ? "teamleader-dashboard-section__sort-icon--active"
                                : ""
                            }`}
                            style={{
                              transform:
                                sortConfig.key === "status" &&
                                sortConfig.direction === "desc"
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="teamleader-dashboard-section__empty-cell"
                        >
                          No workload data found for the selected range.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, index) => (
                        <tr
                          key={row.userId}
                          className={
                            index % 2 === 0
                              ? "teamleader-dashboard-section__row--odd"
                              : "teamleader-dashboard-section__row--even"
                          }
                        >
                          <td>
                            <div className="teamleader-dashboard-section__employee-cell">
                              <div className="teamleader-dashboard-section__avatar">
                                {row.profileImageUrl ? (
                                  <img
                                    src={getProfileImageUrl(row.profileImageUrl)}
                                    alt={row.employee}
                                    className="teamleader-dashboard-section__avatar-image"
                                  />
                                ) : (
                                  getInitials(row.employee)
                                )}
                              </div>

                              <div className="teamleader-dashboard-section__employee-details">
                                <strong>{row.employee}</strong>
                                <small>{row.email || "No email"}</small>
                              </div>
                            </div>
                          </td>
                          <td>{row.tasks}</td>
                          <td>{row.effort}</td>
                          <td>{row.weight}</td>
                          <td>
                            <span
                              className={`teamleader-dashboard-section__status ${getStatusClass(
                                row.status
                              )}`}
                            >
                              <span className="teamleader-dashboard-section__status-icon">
                                {getStatusIcon(row.status)}
                              </span>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="users-section__pagination teamleader-dashboard-section__pagination">
                  <div className="users-section__pagination-info teamleader-dashboard-section__pagination-info">
                    {paginationInfo}
                  </div>

                  <div className="users-section__pagination-controls teamleader-dashboard-section__pagination-controls">
                    <button
                      type="button"
                      className="users-section__page-btn teamleader-dashboard-section__page-btn"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <FiChevronLeft />
                    </button>

                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`users-section__page-btn users-section__page-btn--number teamleader-dashboard-section__page-btn teamleader-dashboard-section__page-btn--number ${
                          currentPage === page
                            ? "users-section__page-btn--active teamleader-dashboard-section__page-btn--active"
                            : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="users-section__page-btn teamleader-dashboard-section__page-btn"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside className="teamleader-dashboard-section__requests-card">
<div className="teamleader-dashboard-section__requests-header">
  <div className="teamleader-dashboard-section__requests-title-wrap">
    <h3 className="teamleader-dashboard-section__requests-title">
      Requests
    </h3>

    <span className="teamleader-dashboard-section__requests-count">
      {taskRequests.length}
    </span>
  </div>

  {taskRequests.length > 4 && (
    <button
      type="button"
      className="teamleader-dashboard-section__requests-view-all"
      onClick={() => setShowAllRequests((previous) => !previous)}
    >
      {showAllRequests ? "Show less" : "View all"}
    </button>
  )}
</div>

              <div className="teamleader-dashboard-section__requests-list">
                {visibleTaskRequests.length === 0 ? (
                  <div className="teamleader-dashboard-section__requests-empty">
                    No pending requests found.
                  </div>
                ) : (
                  visibleTaskRequests.map((request) => {
                    const requestId =
                      request?.taskChangeRequestId ?? request?.TaskChangeRequestId;
                    const changeType = request?.changeType ?? request?.ChangeType;
                    const requestedByName =
                      request?.requestedByName ??
                      request?.RequestedByName ??
                      "Unknown user";
                    const createdAt = request?.createdAt ?? request?.CreatedAt;

                    return (
                      <article
                        key={requestId}
                        className="teamleader-dashboard-section__request-row"
                      >
                        <div className="teamleader-dashboard-section__request-accent"></div>

                        <div className="teamleader-dashboard-section__request-icon">
                          {getRequestTypeIcon(changeType)}
                        </div>

                        <div className="teamleader-dashboard-section__request-main">
                          <div className="teamleader-dashboard-section__request-top">
                            <span className="teamleader-dashboard-section__request-badge">
                              {getChangeTypeLabel(changeType)}
                            </span>

                            <span className="teamleader-dashboard-section__request-time">
                              {formatRequestTime(createdAt)}
                            </span>
                          </div>

                          <h4 className="teamleader-dashboard-section__request-title">
                            {getChangeTypeLabel(changeType)} for task “{request.taskTitle}”
                          </h4>

                          <div className="teamleader-dashboard-section__request-footer">
                            <span className="teamleader-dashboard-section__request-label">
                              Requested by
                            </span>

                            <span className="teamleader-dashboard-section__request-avatar">
                              {getInitials(requestedByName)}
                            </span>

                            <strong className="teamleader-dashboard-section__request-name">
                              {requestedByName}
                            </strong>
                          </div>
                        </div>

                        <div className="teamleader-dashboard-section__request-actions">
                          <button
                            type="button"
                            className="teamleader-dashboard-section__request-btn teamleader-dashboard-section__request-btn--review"
                            aria-label="Review request"
                            title="Review request"
                            onClick={() => openReviewForm(request)}
                          >
                            <FiEdit3 />
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {reviewRequest && (
        <div
          className="teamleader-dashboard-section__review-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teamleader-review-title"
        >
          <div className="teamleader-dashboard-section__review-modal">
            <div className="teamleader-dashboard-section__review-header">
              <div className="teamleader-dashboard-section__review-heading">
                <div className="teamleader-dashboard-section__review-heading-icon">
                  <FiEdit3 />
                </div>

                <div>
                  <h2 id="teamleader-review-title">Review Request</h2>
                  <p>Please review the request details carefully before making a decision.</p>
                </div>
              </div>

              <button
                type="button"
                className="teamleader-dashboard-section__review-close"
                aria-label="Close review form"
                onClick={closeReviewForm}
              >
                <FiX />
              </button>
            </div>

            <div className="teamleader-dashboard-section__review-body">
              <aside className="teamleader-dashboard-section__review-sidebar">
                <div className="teamleader-dashboard-section__review-meta-item">
                  <span className="teamleader-dashboard-section__review-meta-icon">
                    {getRequestTypeIcon(reviewChangeType)}
                  </span>
                  <div>
                    <span className="teamleader-dashboard-section__review-meta-label">
                      Request Type
                    </span>
                    <strong className="teamleader-dashboard-section__review-type-pill">
                      {getChangeTypeLabel(reviewChangeType)}
                    </strong>
                  </div>
                </div>

                <div className="teamleader-dashboard-section__review-meta-item">
                  <span className="teamleader-dashboard-section__review-meta-icon">
                    <FiClipboard />
                  </span>
                  <div>
                    <span className="teamleader-dashboard-section__review-meta-label">
                      Task
                    </span>
                    <strong className="teamleader-dashboard-section__review-meta-value">
                      {reviewRequest.taskTitle || "Untitled task"}
                    </strong>
                  </div>
                </div>

                <div className="teamleader-dashboard-section__review-meta-item">
                  <span className="teamleader-dashboard-section__review-meta-icon">
                    <FiUser />
                  </span>
                  <div className="teamleader-dashboard-section__review-requester">
                    <span className="teamleader-dashboard-section__review-meta-label">
                      Requested By
                    </span>
                    <div className="teamleader-dashboard-section__review-requester-row">
                      <div>
                        <strong>{reviewRequestedByName}</strong>
                        {reviewRequestedByEmail && <small>{reviewRequestedByEmail}</small>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="teamleader-dashboard-section__review-meta-item">
                  <span className="teamleader-dashboard-section__review-meta-icon">
                    <FiClock />
                  </span>
                  <div>
                    <span className="teamleader-dashboard-section__review-meta-label">
                      Requested At
                    </span>
                    <strong className="teamleader-dashboard-section__review-meta-value">
                      {formatRequestTime(reviewCreatedAt)}
                    </strong>
                    <small className="teamleader-dashboard-section__review-meta-subvalue">
                      {formatRequestDateTime(reviewCreatedAt)}
                    </small>
                  </div>
                </div>
              </aside>

              <main className="teamleader-dashboard-section__review-content">
                <div className="teamleader-dashboard-section__review-alert">
                  <FiInfo />
                  <div>
                    <strong>Please review the requested change details carefully.</strong>
                    <span>You can approve the change or reject it with a comment.</span>
                  </div>
                </div>

                <div className="teamleader-dashboard-section__review-details-card">
                  {!isOtherReview && (
                    <>
                      <div className="teamleader-dashboard-section__review-change-row">
                        <div className="teamleader-dashboard-section__review-change-block">
                          <span>{reviewValueLabels.current}</span>
                          <div>
                            <i className="teamleader-dashboard-section__review-value-icon teamleader-dashboard-section__review-value-icon--current">
                              {getRequestTypeIcon(reviewChangeType)}
                            </i>
                            <strong>{formatReviewValue(reviewRequest, getRequestOldValue(reviewRequest), reviewChangeType, "current")}</strong>
                          </div>
                        </div>

                        <div className="teamleader-dashboard-section__review-arrow">
                          <FiArrowRight />
                        </div>

                        <div className="teamleader-dashboard-section__review-change-block">
                          <span>{reviewValueLabels.requested}</span>
                          {isAssigneeReview ? (
                            <button
                              type="button"
                              className={
                                selectedReviewAssignee
                                  ? "teamleader-dashboard-section__review-change-value teamleader-dashboard-section__review-change-value--button"
                                  : "teamleader-dashboard-section__review-change-value teamleader-dashboard-section__review-change-value--button teamleader-dashboard-section__review-change-value--empty"
                              }
                              onClick={openAssigneePicker}
                            >
                              {selectedReviewAssignee ? (
                                <>
                                  <span className="teamleader-dashboard-section__review-assignee-selected-avatar">
                                    {getInitials(selectedReviewAssignee.employee)}
                                  </span>
                                  <span className="teamleader-dashboard-section__review-assignee-selected-info">
                                    <strong>{selectedReviewAssignee.employee}</strong>
                                    <small>{selectedReviewAssignee.email || "No email"}</small>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <i className="teamleader-dashboard-section__review-value-icon teamleader-dashboard-section__review-value-icon--requested">
                                    {getRequestTypeIcon(reviewChangeType)}
                                  </i>
                                  <strong>Select new assignee</strong>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="teamleader-dashboard-section__review-change-value">
                              <i className="teamleader-dashboard-section__review-value-icon teamleader-dashboard-section__review-value-icon--requested">
                                {getRequestTypeIcon(reviewChangeType)}
                              </i>
                              <strong>{formatReviewValue(reviewRequest, getRequestNewValue(reviewRequest), reviewChangeType, "requested")}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="teamleader-dashboard-section__review-divider"></div>
                    </>
                  )}

                  <div className="teamleader-dashboard-section__review-field">
                    <label>Reason for Change</label>
                    <div className="teamleader-dashboard-section__review-reason">
                      {getRequestReason(reviewRequest)}
                    </div>
                  </div>



                  <div className="teamleader-dashboard-section__review-field">
                    <label htmlFor="teamleader-review-note">Additional Notes (Optional)</label>
                    <div className="teamleader-dashboard-section__review-note-wrap">
                      <textarea
                        id="teamleader-review-note"
                        className="teamleader-dashboard-section__review-note"
                        value={reviewNote}
                        maxLength={250}
                        placeholder="Add a note or comment (optional)..."
                        onChange={(event) => setReviewNote(event.target.value)}
                      />
                      <span>{reviewNote.length} / 250</span>
                    </div>
                  </div>
                </div>
              </main>
            </div>

            <div className="teamleader-dashboard-section__review-actions">
              <button
                type="button"
                className="teamleader-dashboard-section__review-decision-btn teamleader-dashboard-section__review-decision-btn--reject"
                disabled={isReviewSubmitting}
                onClick={() => handleReviewDecision("Rejected")}
              >
                <FiX />
                <span>Reject</span>
              </button>

              <button
                type="button"
                className="teamleader-dashboard-section__review-decision-btn teamleader-dashboard-section__review-decision-btn--approve"
                disabled={isApproveDisabled}
                onClick={() => handleReviewDecision("Approved")}
              >
                <FiCheckCircle />
                <span>Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {isAssigneePickerOpen && reviewRequest && (
        <div
          className="teamleader-dashboard-section__assignee-picker-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teamleader-assignee-picker-title"
        >
          <div className="teamleader-dashboard-section__assignee-picker-card">
            <div className="teamleader-dashboard-section__assignee-picker-header">
              <div>
                <h3 id="teamleader-assignee-picker-title">Select New Assignee <span aria-hidden="true">*</span></h3>
                <p>Choose a team member based on their current workload.</p>
              </div>

              <button
                type="button"
                className="teamleader-dashboard-section__assignee-picker-close"
                aria-label="Close assignee picker"
                onClick={closeAssigneePicker}
              >
                <FiX />
              </button>
            </div>

            <div className="teamleader-dashboard-section__assignee-search">
              <input
                type="search"
                value={assigneeSearchValue}
                placeholder="Search team members..."
                onChange={(event) => setAssigneeSearchValue(event.target.value)}
              />
              <FiSearch />
            </div>

            <div className="teamleader-dashboard-section__assignee-table" role="radiogroup" aria-label="Select new assignee">
              <div className="teamleader-dashboard-section__assignee-table-head">
                <span>Team Member</span>
                <span>Tasks</span>
                <span>Effort</span>
                <span>Weight</span>
                <span>Workload</span>
                <span></span>
              </div>

              {filteredReviewAssigneeRows.length === 0 ? (
                <div className="teamleader-dashboard-section__assignee-empty">
                  No team members found.
                </div>
              ) : (
                filteredReviewAssigneeRows.map((row) => {
                  const isSelected = Number(draftReviewAssigneeId) === Number(row.userId);

                  return (
                    <button
                      key={row.userId}
                      type="button"
                      className={
                        isSelected
                          ? "teamleader-dashboard-section__assignee-row teamleader-dashboard-section__assignee-row--selected"
                          : "teamleader-dashboard-section__assignee-row"
                      }
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectReviewAssignee(row.userId)}
                    >
                      <span className="teamleader-dashboard-section__assignee-member">
                        <span className="teamleader-dashboard-section__assignee-avatar">
                          {row.profileImageUrl ? (
                            <img
                              src={getProfileImageUrl(row.profileImageUrl)}
                              alt={row.employee}
                              className="teamleader-dashboard-section__assignee-avatar-image"
                            />
                          ) : (
                            getInitials(row.employee)
                          )}
                        </span>
                        <span className="teamleader-dashboard-section__assignee-member-text">
                          <strong>{row.employee}</strong>
                          <small>{row.email || "No email"}</small>
                        </span>
                      </span>
                      <span>{row.tasks}</span>
                      <span>{row.effort}</span>
                      <span>{row.weight}</span>
                      <span>
                        <span className={`teamleader-dashboard-section__status ${getStatusClass(row.status)}`}>
                          <span className="teamleader-dashboard-section__status-icon">
                            {getStatusIcon(row.status)}
                          </span>
                          {row.status}
                        </span>
                      </span>
                      <span className="teamleader-dashboard-section__assignee-radio">
                        <i></i>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="teamleader-dashboard-section__assignee-picker-actions">
              <button
                type="button"
                className="teamleader-dashboard-section__assignee-picker-btn teamleader-dashboard-section__assignee-picker-btn--cancel"
                onClick={closeAssigneePicker}
              >
                Cancel
              </button>
              <button
                type="button"
                className="teamleader-dashboard-section__assignee-picker-btn teamleader-dashboard-section__assignee-picker-btn--confirm"
                disabled={!draftReviewAssigneeId}
                onClick={confirmAssigneePicker}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}


      {pendingReviewDecision && reviewRequest && (
        <div className="teamleader-dashboard-section__confirm-overlay" role="dialog" aria-modal="true">
          <div className="teamleader-dashboard-section__confirm-card">
            <div className="teamleader-dashboard-section__confirm-icon">
              {pendingReviewDecision === "Approved" ? <FiCheckCircle /> : <FiX />}
            </div>
            <h3>
              {pendingReviewDecision === "Approved" ? "Approve request?" : "Reject request?"}
            </h3>
            <p>
              {pendingReviewDecision === "Approved"
                ? "This will apply the requested change to the task in the backend."
                : "This will reject the request and keep the task unchanged."}
            </p>
            <div className="teamleader-dashboard-section__confirm-actions">
              <button
                type="button"
                className="teamleader-dashboard-section__confirm-btn teamleader-dashboard-section__confirm-btn--cancel"
                disabled={isReviewSubmitting}
                onClick={closeReviewConfirmation}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`teamleader-dashboard-section__confirm-btn ${
                  pendingReviewDecision === "Approved"
                    ? "teamleader-dashboard-section__confirm-btn--approve"
                    : "teamleader-dashboard-section__confirm-btn--reject"
                }`}
                disabled={isReviewSubmitting}
                onClick={confirmReviewDecision}
              >
                {isReviewSubmitting
                  ? "Saving..."
                  : pendingReviewDecision === "Approved"
                    ? "Yes, approve"
                    : "Yes, reject"}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
