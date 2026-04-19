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
} from "react-icons/fi";
import { DayPicker } from "react-day-picker";
import { endOfMonth, format, setMonth, setYear, startOfMonth } from "date-fns";
import "react-day-picker/dist/style.css";
import "../../assets/styles/teamleader/team-leader-dashboard-section.css";

const PAGE_SIZE = 6;
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
    if (start) candidateYears.push(start.getFullYear())
    if (due) candidateYears.push(due.getFullYear())
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

export default function TeamLeaderDashboardSection({
  user,
  searchValue = "",
}) {
  const initialRangeState = useMemo(() => loadRangeState(), []);

  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaderTeamName, setLeaderTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

        const teamsData = await parseJsonSafely(teamsResponse);
        const membersData = await parseJsonSafely(membersResponse);
        const tasksData = await parseJsonSafely(tasksResponse);

        if (!Array.isArray(teamsData)) {
          throw new Error("Teams response format is invalid.");
        }

        if (!Array.isArray(membersData)) {
          throw new Error("Members response format is invalid.");
        }

        const resolvedTasks = extractTasksArray(tasksData);

        const tasksResponseLooksValid =
          Array.isArray(resolvedTasks) ||
          tasksData?.success === true;

        if (!tasksResponseLooksValid) {
          console.log("Invalid tasks response:", tasksData);
          throw new Error(
            tasksData?.message || "Tasks response format is invalid."
          );
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
          const isEmployee = isEmployeeMember(member);
          const belongsToLeaderTeam = leaderMemberIds.includes(memberId);

          return isEmployee && belongsToLeaderTeam;
        });

        console.log("tasksData raw:", tasksData);
        console.log("resolvedTasks:", resolvedTasks);

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

        setMembers(filteredMembers);
        setTasks(filteredTasks);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setMembers([]);
        setTasks([]);
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
        (sum, task) => sum + Number(task?.estimatedEffortHours || task?.EstimatedEffortHours || 0),
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
      (sum, task) => sum + Number(task?.estimatedEffortHours || task?.EstimatedEffortHours || 0),
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

    if (preset === "custom") {
      setDraftCalendarMonth(getInitialCalendarMonth(selectedPreset, customRange));
    }

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
    const nextRange =
      draftCustomRange?.from instanceof Date &&
      draftCustomRange?.to instanceof Date
        ? {
            from: startOfDay(draftCustomRange.from),
            to: endOfDay(draftCustomRange.to),
          }
        : {
            from: getMonthRange(draftCalendarMonth).start,
            to: getMonthRange(draftCalendarMonth).end,
          };

    setSelectedPreset("custom");
    setCustomRange(nextRange);
    setIsRangeMenuOpen(false);
  };

  return (
    <section className="teamleader-dashboard-section">
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

          <div className="teamleader-dashboard-section__workload-head">
            <h3>{leaderTeamName} Member Workload</h3>
            <span className="teamleader-dashboard-section__workload-line"></span>
          </div>

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

            <div className="teamleader-dashboard-section__pagination">
              <span className="teamleader-dashboard-section__pagination-info">
                {paginationInfo}
              </span>

              <div className="teamleader-dashboard-section__pagination-controls">
                <button
                  type="button"
                  className="teamleader-dashboard-section__page-btn"
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft />
                </button>

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`teamleader-dashboard-section__page-btn teamleader-dashboard-section__page-btn--number ${
                      currentPage === page
                        ? "teamleader-dashboard-section__page-btn--active"
                        : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="teamleader-dashboard-section__page-btn"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={currentPage === totalPages}
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
