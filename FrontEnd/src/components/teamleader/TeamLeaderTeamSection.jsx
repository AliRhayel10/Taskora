import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiClock,
  FiEye,
  FiUsers,
} from "react-icons/fi";
import { DayPicker } from "react-day-picker";
import { endOfMonth, format, setMonth, setYear, startOfMonth } from "date-fns";
import "react-day-picker/dist/style.css";
import "../../assets/styles/teamleader/team-leader-team-section.css";

const API_BASE = "http://localhost:5000";
const PAGE_SIZE = 6;
const RANGE_STORAGE_KEY = "teamleader_team_range";
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => format(new Date(2026, index, 1), "MMMM"));

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

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);

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

function formatDateText(date) {
  return format(date, "dd/MM/yyyy");
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
  const taskStart = parseApiDate(task?.startDate ?? task?.StartDate);
  const taskDue = parseApiDate(task?.dueDate ?? task?.DueDate);
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

function loadRangeState() {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);

    if (!saved) {
      const currentMonth = getMonthRange(new Date());
      return {
        selectedPreset: "custom",
        customRange: { from: currentMonth.start, to: currentMonth.end },
      };
    }

    const parsed = JSON.parse(saved);
    return {
      selectedPreset: parsed?.selectedPreset || "custom",
      customRange: {
        from: parsed?.customRange?.from ? new Date(parsed.customRange.from) : null,
        to: parsed?.customRange?.to ? new Date(parsed.customRange.to) : null,
      },
    };
  } catch {
    const currentMonth = getMonthRange(new Date());
    return {
      selectedPreset: "custom",
      customRange: { from: currentMonth.start, to: currentMonth.end },
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
    case "thisWeek":
      return getWeekRange();
    case "custom":
    default: {
      if (
        customRange?.from instanceof Date &&
        !Number.isNaN(customRange.from.getTime()) &&
        customRange?.to instanceof Date &&
        !Number.isNaN(customRange.to.getTime())
      ) {
        const start = startOfDay(customRange.from);
        const end = endOfDay(customRange.to);

        if (start <= end) return { start, end };
      }

      return getMonthRange(new Date());
    }
  }
}

function getRangeLabel(preset, customRange) {
  if (
    preset === "custom" &&
    customRange?.from instanceof Date &&
    customRange?.to instanceof Date
  ) {
    if (isFullMonthRange(customRange)) {
      return formatMonthYearText(customRange.from);
    }

    return `${formatDateText(customRange.from)} - ${formatDateText(customRange.to)}`;
  }

  if (preset === "today") return "Today";
  if (preset === "thisWeek") return "This Week";
  return formatMonthYearText(new Date());
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
  const years = [];

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const start = parseApiDate(task?.startDate ?? task?.StartDate);
    const due = parseApiDate(task?.dueDate ?? task?.DueDate);
    if (start) years.push(start.getFullYear());
    if (due) years.push(due.getFullYear());
  }

  const earliestDataYear = years.length ? Math.min(...years) : currentYear - 5;
  const startYear = Math.min(earliestDataYear, currentYear);
  const endYear = currentYear + 5;

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
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

function getArrayPayload(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getUserId(user) {
  return Number(user?.userId ?? user?.UserId ?? user?.id ?? user?.Id ?? 0);
}

function getTeamId(team) {
  return Number(team?.teamId ?? team?.TeamId ?? team?.id ?? team?.Id ?? 0);
}

function getTeamLeaderId(team) {
  return Number(
    team?.teamLeaderUserId ??
      team?.TeamLeaderUserId ??
      team?.teamLeaderId ??
      team?.TeamLeaderId ??
      0
  );
}

function getMemberId(member) {
  return Number(member?.userId ?? member?.UserId ?? member?.id ?? member?.Id ?? 0);
}

function getMemberTeamIds(member) {
  const teamIds = member?.teamIds ?? member?.TeamIds;
  const teamId = member?.teamId ?? member?.TeamId;

  if (Array.isArray(teamIds)) {
    return teamIds.map(Number).filter(Boolean);
  }

  if (teamId) return [Number(teamId)].filter(Boolean);

  return [];
}

function getTaskTeamId(task) {
  return Number(task?.teamId ?? task?.TeamId ?? 0);
}

function getTaskAssigneeId(task) {
  return Number(task?.assignedToUserId ?? task?.AssignedToUserId ?? 0);
}

function getTaskEffort(task) {
  return Number(task?.estimatedEffortHours ?? task?.EstimatedEffortHours ?? task?.effort ?? task?.Effort ?? 0);
}

function getTaskWeight(task) {
  return Number(task?.weight ?? task?.Weight ?? 0);
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

function getWorkloadStatus(weight) {
  if (weight <= 15) return "Available";
  if (weight <= 25) return "Moderate";
  return "Overloaded";
}

function getWorkloadStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "available") return "team-leader-team-section__badge--available";
  if (normalized === "moderate") return "team-leader-team-section__badge--moderate";
  return "team-leader-team-section__badge--overloaded";
}

function getWorkloadStatusIcon(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "available") return <FiCheckCircle />;
  if (normalized === "moderate") return <FiClock />;
  return <FiAlertTriangle />;
}

function getMemberStatus(member) {
  const isActive = member?.isActive ?? member?.IsActive;
  const status = member?.status ?? member?.Status;

  if (typeof status === "string" && status.trim()) return status;
  return isActive === false ? "Inactive" : "Active";
}

function getMemberStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "active") return "team-leader-team-section__member-status--active";
  if (normalized === "away") return "team-leader-team-section__member-status--away";
  return "team-leader-team-section__member-status--inactive";
}

function buildPageNumbers(totalPages, currentPage) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) return [1, 2, 3, 4, 5];

  if (currentPage >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

export default function TeamLeaderTeamSection({ user, searchValue = "", onViewMember }) {
  const initialRangeState = useMemo(() => loadRangeState(), []);

  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedPreset, setSelectedPreset] = useState(initialRangeState.selectedPreset);
  const [customRange, setCustomRange] = useState(initialRangeState.customRange);
  const [draftPreset, setDraftPreset] = useState(initialRangeState.selectedPreset);
  const [draftCustomRange, setDraftCustomRange] = useState(initialRangeState.customRange);
  const [draftCalendarMonth, setDraftCalendarMonth] = useState(
    getInitialCalendarMonth(initialRangeState.selectedPreset, initialRangeState.customRange)
  );
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "member", direction: "asc" });

  const rangeMenuRef = useRef(null);

  useEffect(() => {
    saveRangeState(selectedPreset, customRange);
  }, [selectedPreset, customRange]);

  const syncDraftWithAppliedState = () => {
    setDraftPreset(selectedPreset);
    setDraftCustomRange({
      from: customRange?.from || null,
      to: customRange?.to || null,
    });
    setDraftCalendarMonth(getInitialCalendarMonth(selectedPreset, customRange));
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
    if (!isRangeMenuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (rangeMenuRef.current && !rangeMenuRef.current.contains(event.target)) {
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

  const rangeLabel = useMemo(
    () => getRangeLabel(selectedPreset, customRange),
    [selectedPreset, customRange]
  );

  const draftRangePreview = useMemo(() => {
    if (
      draftCustomRange?.from instanceof Date &&
      draftCustomRange?.to instanceof Date
    ) {
      if (isFullMonthRange(draftCustomRange)) {
        return formatMonthYearText(draftCustomRange.from);
      }

      return `${formatDateText(draftCustomRange.from)} - ${formatDateText(draftCustomRange.to)}`;
    }

    return formatMonthYearText(draftCalendarMonth);
  }, [draftCalendarMonth, draftCustomRange]);

  const yearOptions = useMemo(() => buildYearOptions(tasks), [tasks]);
  const selectedMonthIndex = draftCalendarMonth.getMonth();
  const selectedYearValue = draftCalendarMonth.getFullYear();

  useEffect(() => {
    const fetchTeamData = async () => {
      const companyId = Number(user?.companyId ?? user?.CompanyId ?? 0);

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

        if (!teamsResponse.ok) throw new Error(`Failed to load teams. (${teamsResponse.status})`);
        if (!membersResponse.ok) throw new Error(`Failed to load members. (${membersResponse.status})`);
        if (!tasksResponse.ok) throw new Error(`Failed to load tasks. (${tasksResponse.status})`);

        const [teamsPayload, membersPayload, tasksPayload] = await Promise.all([
          parseJsonSafely(teamsResponse),
          parseJsonSafely(membersResponse),
          parseJsonSafely(tasksResponse),
        ]);

        setTeams(getArrayPayload(teamsPayload, "teams"));
        setMembers(getArrayPayload(membersPayload, "members"));
        setTasks(getArrayPayload(tasksPayload, "tasks"));
      } catch (error) {
        setErrorMessage(error?.message || "Failed to load team data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [user?.companyId, user?.CompanyId]);

  const leaderTeamIds = useMemo(() => {
    const leaderId = getUserId(user);
    const ids = teams
      .filter((team) => getTeamLeaderId(team) === leaderId)
      .map(getTeamId)
      .filter(Boolean);

    if (ids.length) return ids;

    return teams.map(getTeamId).filter(Boolean);
  }, [teams, user]);

  const filteredRangeTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskTeamId = getTaskTeamId(task);
      if (leaderTeamIds.length && !leaderTeamIds.includes(taskTeamId)) return false;
      return doesTaskOverlapRange(task, activeRange.start, activeRange.end);
    });
  }, [tasks, leaderTeamIds, activeRange]);

  const teamMembers = useMemo(() => {
    const memberIdsFromTeams = new Set();

    for (const team of teams) {
      const teamId = getTeamId(team);
      if (!leaderTeamIds.includes(teamId)) continue;

      const memberIds = team?.memberIds ?? team?.MemberIds;
      if (Array.isArray(memberIds)) {
        memberIds.map(Number).filter(Boolean).forEach((memberId) => memberIdsFromTeams.add(memberId));
      }

      const leaderId = getTeamLeaderId(team);
      if (leaderId) memberIdsFromTeams.add(leaderId);
    }

    return members.filter((member) => {
      const memberId = getMemberId(member);
      const explicitTeamIds = getMemberTeamIds(member);

      if (memberIdsFromTeams.size > 0) return memberIdsFromTeams.has(memberId);
      if (explicitTeamIds.length > 0) return explicitTeamIds.some((teamId) => leaderTeamIds.includes(teamId));

      return true;
    });
  }, [members, teams, leaderTeamIds]);

  const rows = useMemo(() => {
    const search = normalizeSearch(searchValue);

    const builtRows = teamMembers.map((member) => {
      const memberId = getMemberId(member);
      const memberTasks = filteredRangeTasks.filter((task) => getTaskAssigneeId(task) === memberId);
      const effortValue = memberTasks.reduce((sum, task) => sum + getTaskEffort(task), 0);
      const weightValue = memberTasks.reduce((sum, task) => sum + getTaskWeight(task), 0);
      const workloadStatus = getWorkloadStatus(weightValue);
      const memberStatus = getMemberStatus(member);

      return {
        id: memberId,
        member: member?.fullName ?? member?.FullName ?? "Unnamed Member",
        email: member?.email ?? member?.Email ?? "",
        jobTitle: member?.jobTitle ?? member?.JobTitle ?? member?.jobType ?? member?.JobType ?? "Member",
        profileImageUrl: member?.profileImageUrl ?? member?.ProfileImageUrl ?? "",
        tasks: memberTasks.length,
        effortValue,
        effort: `${Number(effortValue.toFixed(2)).toLocaleString()}h`,
        weightValue,
        weight: Number(weightValue.toFixed(2)).toLocaleString(),
        workloadStatus,
        memberStatus,
        rawMember: member,
        currentTasks: memberTasks,
      };
    });

    const searchedRows = search
      ? builtRows.filter((row) =>
          [row.member, row.email, row.jobTitle, row.workloadStatus, row.memberStatus]
            .join(" ")
            .toLowerCase()
            .includes(search)
        )
      : builtRows;

    const sortedRows = [...searchedRows].sort((a, b) => {
      let firstValue;
      let secondValue;

      switch (sortConfig.key) {
        case "jobTitle":
          firstValue = String(a.jobTitle || "").toLowerCase();
          secondValue = String(b.jobTitle || "").toLowerCase();
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
          firstValue = Number(a.weightValue || 0);
          secondValue = Number(b.weightValue || 0);
          break;
        case "workloadStatus":
          firstValue = String(a.workloadStatus || "").toLowerCase();
          secondValue = String(b.workloadStatus || "").toLowerCase();
          break;
        case "status":
          firstValue = String(a.memberStatus || "").toLowerCase();
          secondValue = String(b.memberStatus || "").toLowerCase();
          break;
        case "member":
        default:
          firstValue = String(a.member || "").toLowerCase();
          secondValue = String(b.member || "").toLowerCase();
      }

      if (firstValue < secondValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (firstValue > secondValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sortedRows;
  }, [teamMembers, filteredRangeTasks, searchValue, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, selectedPreset, customRange, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = buildPageNumbers(totalPages, safeCurrentPage);

  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return rows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [rows, safeCurrentPage]);

  const paginationText = useMemo(() => {
    if (!rows.length) return "Showing 0 of 0 members";

    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(safeCurrentPage * PAGE_SIZE, rows.length);
    return `Showing ${startIndex}-${endIndex} of ${rows.length} members`;
  }, [rows.length, safeCurrentPage]);

  const summaryCards = useMemo(() => {
    const totalTasks = filteredRangeTasks.length;
    const totalEffort = filteredRangeTasks.reduce((sum, task) => sum + getTaskEffort(task), 0);
    const totalWeight = filteredRangeTasks.reduce((sum, task) => sum + getTaskWeight(task), 0);
    const averageWorkload = teamMembers.length ? Math.round(totalWeight / teamMembers.length) : 0;

    return [
      {
        title: "Total Members",
        value: teamMembers.length.toLocaleString(),
        icon: <FiUsers />,
        iconClass: "team-leader-team-section__card-icon--members",
        valueClass: "team-leader-team-section__card-value--blue",
      },
      {
        title: "Tasks",
        value: totalTasks.toLocaleString(),
        icon: <FiClipboard />,
        iconClass: "team-leader-team-section__card-icon--tasks",
        valueClass: "team-leader-team-section__card-value--purple",
      },
      {
        title: "Total Effort",
        value: `${Number(totalEffort.toFixed(2)).toLocaleString()}h`,
        icon: <FiClock />,
        iconClass: "team-leader-team-section__card-icon--effort",
        valueClass: "team-leader-team-section__card-value--green",
      },
      {
        title: "Average Workload",
        value: `${averageWorkload}%`,
        icon: <FiBarChart2 />,
        iconClass: "team-leader-team-section__card-icon--workload",
        valueClass: "team-leader-team-section__card-value--orange",
      },
    ];
  }, [filteredRangeTasks, teamMembers.length]);

  const handleSelectPreset = (preset) => {
    if (preset === "custom") {
      const nextMonth = startOfMonth(new Date());

      setDraftPreset("custom");
      setDraftCustomRange({ from: null, to: null });
      setDraftCalendarMonth(nextMonth);
      return;
    }

    const range = preset === "today" ? getTodayRange() : getWeekRange();

    setDraftPreset(preset);
    setDraftCustomRange({ from: null, to: null });
    setSelectedPreset(preset);
    setCustomRange({ from: range.start, to: range.end });
    setDraftCalendarMonth(startOfMonth(range.start));
    setIsRangeMenuOpen(false);
  };

  const handleDraftMonthChange = (monthIndex) => {
    const nextMonth = startOfMonth(setMonth(draftCalendarMonth, Number(monthIndex)));
    const range = getMonthRange(nextMonth);

    setDraftCalendarMonth(nextMonth);
    setDraftPreset("custom");
    setDraftCustomRange({ from: range.start, to: range.end });
  };

  const handleDraftYearChange = (yearValue) => {
    const nextMonth = startOfMonth(setYear(draftCalendarMonth, Number(yearValue)));
    const range = getMonthRange(nextMonth);

    setDraftCalendarMonth(nextMonth);
    setDraftPreset("custom");
    setDraftCustomRange({ from: range.start, to: range.end });
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

  const getVisibleMonthRange = () => {
    const visibleMonthStart = startOfMonth(draftCalendarMonth);
    const visibleMonthEnd = endOfMonth(draftCalendarMonth);

    return {
      from: startOfDay(visibleMonthStart),
      to: endOfDay(visibleMonthEnd),
    };
  };

  const handleApplyCustomRange = () => {
    const nextRange =
      draftCustomRange?.from instanceof Date && draftCustomRange?.to instanceof Date
        ? {
            from: startOfDay(draftCustomRange.from),
            to: endOfDay(draftCustomRange.to),
          }
        : getVisibleMonthRange();

    setSelectedPreset("custom");
    setCustomRange(nextRange);
    setIsRangeMenuOpen(false);
    setDraftCustomRange({ from: null, to: null });
  };

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  const handleViewMember = (row) => {
    if (typeof onViewMember === "function") {
      onViewMember({
        ...row.rawMember,
        calculatedTasks: row.tasks,
        calculatedEffort: row.effortValue,
        calculatedWeight: row.weightValue,
        calculatedStatus: row.memberStatus,
        currentTasks: row.currentTasks,
      });
      return;
    }

    const event = new CustomEvent("team-member-view", {
      detail: {
        member: {
          ...row.rawMember,
          calculatedTasks: row.tasks,
          calculatedEffort: row.effortValue,
          calculatedWeight: row.weightValue,
          calculatedStatus: row.memberStatus,
          currentTasks: row.currentTasks,
        },
      },
    });

    window.dispatchEvent(event);
  };

  const renderSortButton = (label, key) => (
    <button
      type="button"
      className="team-leader-team-section__sort-btn"
      onClick={() => handleSort(key)}
    >
      <span>{label}</span>
      <FiChevronDown
        className={`team-leader-team-section__sort-icon ${
          sortConfig.key === key ? "team-leader-team-section__sort-icon--active" : ""
        }`}
        style={{
          transform:
            sortConfig.key === key && sortConfig.direction === "desc"
              ? "rotate(180deg)"
              : "rotate(0deg)",
        }}
      />
    </button>
  );

  return (
    <section className="team-leader-team-section">
      <div className="users-section__title-row team-leader-team-section__title-row">
        <h2>Team</h2>
        <div className="users-section__title-line team-leader-team-section__title-line" />
      </div>

      <div className="team-leader-team-section__toolbar">
        <div className="team-leader-team-section__range-menu" ref={rangeMenuRef}>
          <button
            type="button"
            className="team-leader-team-section__range-btn"
            onClick={openRangeMenu}
          >
            <span>{rangeLabel}</span>
            <FiChevronDown />
          </button>

          {isRangeMenuOpen && (
            <div className="team-leader-team-section__range-dropdown">
              <div
                className="team-leader-team-section__range-tabs"
                role="tablist"
                aria-label="Date range presets"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === "today"}
                  className={`team-leader-team-section__range-option ${
                    draftPreset === "today" ? "team-leader-team-section__range-option--active" : ""
                  }`}
                  onClick={() => handleSelectPreset("today")}
                >
                  Today
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === "thisWeek"}
                  className={`team-leader-team-section__range-option ${
                    draftPreset === "thisWeek" ? "team-leader-team-section__range-option--active" : ""
                  }`}
                  onClick={() => handleSelectPreset("thisWeek")}
                >
                  This Week
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === "custom"}
                  className={`team-leader-team-section__range-option ${
                    draftPreset === "custom" ? "team-leader-team-section__range-option--active" : ""
                  }`}
                  onClick={() => handleSelectPreset("custom")}
                >
                  Custom
                </button>
              </div>

              {draftPreset === "custom" && (
                <>
                  <div className="team-leader-team-section__range-divider" />

                  <div className="team-leader-team-section__custom-range">
                    <div className="team-leader-team-section__custom-range-header">
                      <FiCalendar />
                      <span>Pick a custom range</span>
                    </div>

                    <div className="team-leader-team-section__custom-range-preview">
                      {draftRangePreview}
                    </div>

                    <div className="team-leader-team-section__month-picker-row">
                      <div className="team-leader-team-section__month-picker-field">
                        <label htmlFor="team-leader-team-month-select">Month</label>
                        <div className="team-leader-team-section__month-picker-select-wrap">
                          <select
                            id="team-leader-team-month-select"
                            className="team-leader-team-section__month-picker-select"
                            value={selectedMonthIndex}
                            onChange={(event) => handleDraftMonthChange(event.target.value)}
                          >
                            {MONTH_OPTIONS.map((monthLabel, monthIndex) => (
                              <option key={monthLabel} value={monthIndex}>
                                {monthLabel}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown />
                        </div>
                      </div>

                      <div className="team-leader-team-section__month-picker-field">
                        <label htmlFor="team-leader-team-year-select">Year</label>
                        <div className="team-leader-team-section__month-picker-select-wrap">
                          <select
                            id="team-leader-team-year-select"
                            className="team-leader-team-section__month-picker-select"
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

                    <div className="team-leader-team-section__calendar-shell">
                      <DayPicker
                        mode="range"
                        month={draftCalendarMonth}
                        onMonthChange={(month) => setDraftCalendarMonth(startOfMonth(month))}
                        selected={draftCustomRange}
                        onSelect={handleCustomRangeSelect}
                        showOutsideDays={false}
                        numberOfMonths={1}
                        className="team-leader-team-section__day-picker"
                      />
                    </div>

                    <div className="team-leader-team-section__apply-btn-wrap">
                      <button
                        type="button"
                        className="team-leader-team-section__apply-btn"
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
        <div className="team-leader-team-section__state-card">Loading team...</div>
      ) : errorMessage ? (
        <div className="team-leader-team-section__state-card team-leader-team-section__state-card--error">
          {errorMessage}
        </div>
      ) : (
        <>
          <div className="team-leader-team-section__cards">
            {summaryCards.map((card) => (
              <article key={card.title} className="team-leader-team-section__card">
                <div className={`team-leader-team-section__card-icon ${card.iconClass}`}>
                  {card.icon}
                </div>

                <div className="team-leader-team-section__card-content">
                  <span className="team-leader-team-section__card-label">{card.title}</span>
                  <strong className={`team-leader-team-section__card-value ${card.valueClass}`}>
                    {card.value}
                  </strong>
                </div>
              </article>
            ))}
          </div>

          <div className="team-leader-team-section__table-card">
            <div className="team-leader-team-section__table-wrap">
              <table className="team-leader-team-section__table">
                <thead>
                  <tr>
                    <th>{renderSortButton("Member", "member")}</th>
                    <th>{renderSortButton("Job Title", "jobTitle")}</th>
                    <th>{renderSortButton("Tasks", "tasks")}</th>
                    <th>{renderSortButton("Effort", "effort")}</th>
                    <th>{renderSortButton("Weight", "weight")}</th>
                    <th>{renderSortButton("Workload Status", "workloadStatus")}</th>
                    <th>{renderSortButton("Status", "status")}</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.length ? (
                    paginatedRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="team-leader-team-section__member-cell">
                            <span className="team-leader-team-section__avatar">
                              {row.profileImageUrl ? (
                                <img src={row.profileImageUrl} alt="" />
                              ) : (
                                getInitials(row.member) || "?"
                              )}
                            </span>
                            <span className="team-leader-team-section__member-copy">
                              <strong>{row.member}</strong>
                              <small>{row.email}</small>
                            </span>
                          </div>
                        </td>
                        <td>{row.jobTitle}</td>
                        <td>{row.tasks}</td>
                        <td>{row.effort}</td>
                        <td>{row.weight}</td>
                        <td>
                          <span
                            className={`team-leader-team-section__badge ${getWorkloadStatusClass(
                              row.workloadStatus
                            )}`}
                          >
                            {getWorkloadStatusIcon(row.workloadStatus)}
                            {row.workloadStatus}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`team-leader-team-section__member-status ${getMemberStatusClass(
                              row.memberStatus
                            )}`}
                          >
                            <span />
                            {row.memberStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="team-leader-team-section__action-btn"
                            onClick={() => handleViewMember(row)}
                            aria-label={`View ${row.member}`}
                          >
                            <FiEye />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="team-leader-team-section__empty-cell">
                        No members found for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="team-leader-team-section__pagination">
              <span className="team-leader-team-section__pagination-info">{paginationText}</span>

              <div className="team-leader-team-section__pagination-controls">
                <button
                  type="button"
                  className="team-leader-team-section__page-btn"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  aria-label="Previous page"
                >
                  <FiChevronLeft />
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`team-leader-team-section__page-btn team-leader-team-section__page-btn--number ${
                      pageNumber === safeCurrentPage
                        ? "team-leader-team-section__page-btn--active"
                        : ""
                    }`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="team-leader-team-section__page-btn"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  aria-label="Next page"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}