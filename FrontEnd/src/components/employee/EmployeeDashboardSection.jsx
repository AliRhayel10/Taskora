import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEye,
  FiFileText,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { endOfMonth, format, setMonth, setYear, startOfMonth } from "date-fns";
import "react-day-picker/dist/style.css";
import "../../assets/styles/employee/employee-dashboard-section.css";
import "../../assets/styles/admin/users-section.css";
import cloudBg from "../../assets/images/cloud.png";

const API_BASE = "http://localhost:5000";
const MIN_TASKS_PER_PAGE = 1;
const UNASSIGNED_TASK_MESSAGE_KEY = "employee_dashboard_unassigned_task_message";
const RANGE_STORAGE_KEY = "employee_dashboard_range";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "pending", label: "Pending" },
  { key: "done", label: "Done" },
];


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

function formatDateText(date) {
  return format(date, "dd/MM/yyyy");
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

function loadRangeState() {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);

    if (!saved) {
      return {
        selectedPreset: "today",
        customRange: getTodayRangeForStorage(),
      };
    }

    const parsed = JSON.parse(saved);

    const selectedPreset =
      parsed?.selectedPreset === "today" ||
      parsed?.selectedPreset === "thisWeek" ||
      parsed?.selectedPreset === "custom"
        ? parsed.selectedPreset
        : "today";

    return {
      selectedPreset,
      customRange: {
        from: parsed?.customRange?.from ? new Date(parsed.customRange.from) : null,
        to: parsed?.customRange?.to ? new Date(parsed.customRange.to) : null,
      },
    };
  } catch {
    return {
      selectedPreset: "today",
      customRange: getTodayRangeForStorage(),
    };
  }
}

function getTodayRangeForStorage() {
  const todayRange = getTodayRange();
  return {
    from: todayRange.start,
    to: todayRange.end,
  };
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

      return getTodayRange();
    }
    case "thisWeek":
      return getWeekRange(0);
    case "today":
    default:
      return getTodayRange();
  }
}

function getRangeLabel(preset) {
  switch (preset) {
    case "thisWeek":
      return "This Week";
    case "custom":
      return "Custom";
    case "today":
    default:
      return "Today";
  }
}

function parseTaskDate(dateValue) {
  if (!dateValue) return null;

  const raw = String(dateValue).trim();
  if (!raw) return null;

  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw;
  const parsed = new Date(`${dateOnly}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function doesTaskOverlapRange(task, start, end) {
  const taskStart = parseTaskDate(task?.startDate);
  const taskDue = parseTaskDate(task?.dueDate);
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);

  if (!taskStart && !taskDue) return true;

  if (taskStart && taskDue) {
    return startOfDay(taskStart) <= rangeEnd && endOfDay(taskDue) >= rangeStart;
  }

  const singleDate = taskDue || taskStart;
  const singleDateStart = startOfDay(singleDate);

  return singleDateStart >= rangeStart && singleDateStart <= rangeEnd;
}

function buildYearOptions(tasks) {
  const currentYear = new Date().getFullYear();
  const candidateYears = [];

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const start = parseTaskDate(task?.startDate);
    const due = parseTaskDate(task?.dueDate);
    if (start) candidateYears.push(start.getFullYear());
    if (due) candidateYears.push(due.getFullYear());
  }

  const earliestDataYear = candidateYears.length ? Math.min(...candidateYears) : currentYear - 5;
  const startYear = Math.min(earliestDataYear, currentYear);
  const endYear = currentYear + 5;

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function getTaskStatusValue(task = {}) {
  return (
    task.taskStatusName ||
    task.TaskStatusName ||
    task.statusName ||
    task.StatusName ||
    task.taskStatus?.statusName ||
    task.taskStatus?.StatusName ||
    task.status ||
    task.Status ||
    ""
  );
}

function isHiddenEmployeeTaskStatus(value) {
  const normalized = normalizeStatus(value);

  return normalized === "approved" || normalized === "archived";
}

function toEmployeeStatus(value) {
  const normalized = normalizeStatus(value);

  if (normalized === "new") return "new";
  if (normalized === "acknowledged") return "acknowledged";
  if (normalized === "pending" || normalized === "inprogress") return "pending";
  if (normalized === "done" || normalized === "completed") return "done";
  if (normalized === "approved") return "approved";
  if (normalized === "archived") return "archived";

  return "new";
}

function resolveTaskStatus(task) {
  return toEmployeeStatus(getTaskStatusValue(task));
}

function getPriorityClass(priority) {
  const normalized = String(priority || "").trim().toLowerCase();

  if (normalized === "low") return "employee-dashboard-section__badge--low";
  if (normalized === "medium") return "employee-dashboard-section__badge--medium";
  if (normalized === "high") return "employee-dashboard-section__badge--high";
  if (normalized === "critical") return "employee-dashboard-section__badge--critical";

  return "employee-dashboard-section__badge--default";
}

function getComplexityClass(complexity) {
  const normalized = String(complexity || "").trim().toLowerCase();

  if (normalized === "simple") return "employee-dashboard-section__badge--simple";
  if (normalized === "medium") {
    return "employee-dashboard-section__badge--medium-complexity";
  }
  if (normalized === "complex") return "employee-dashboard-section__badge--complex";

  return "employee-dashboard-section__badge--default";
}

function getStatusClass(status) {
  if (status === "new") return "employee-dashboard-section__status--new";
  if (status === "acknowledged") return "employee-dashboard-section__status--acknowledged";
  if (status === "pending") return "employee-dashboard-section__status--pending";
  if (status === "done") return "employee-dashboard-section__status--done";
  if (status === "approved") return "employee-dashboard-section__status--done";
  if (status === "archived") return "employee-dashboard-section__status--done";
  return "employee-dashboard-section__status--new";
}

function getStatusLabel(status) {
  if (status === "new") return "New";
  if (status === "acknowledged") return "Acknowledged";
  if (status === "pending") return "Pending";
  if (status === "done") return "Done";
  if (status === "approved") return "Approved";
  if (status === "archived") return "Archived";
  return "New";
}

function getStatusIcon(status) {
  if (status === "new") return <FiFileText />;
  if (status === "acknowledged") return <FiCheckCircle />;
  if (status === "pending") return <FiClock />;
  if (status === "done") return <FiCheckCircle />;
  if (status === "approved") return <FiCheckCircle />;
  if (status === "archived") return <FiCheckCircle />;
  return <FiFileText />;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isDueToday(value) {
  if (!value) return false;

  const due = new Date(value);
  const today = new Date();

  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function isDueSoon(value) {
  if (!value) return false;

  const due = new Date(value);
  const today = new Date();

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= 7;
}

function compareValues(a, b, direction = "asc") {
  if (a == null && b == null) return 0;
  if (a == null) return direction === "asc" ? -1 : 1;
  if (b == null) return direction === "asc" ? 1 : -1;

  const multiplier = direction === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * multiplier;
  }

  return (
    String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * multiplier
  );
}

export default function EmployeeDashboardSection({
  user,
  searchValue = "",
}) {
  const navigate = useNavigate();
  const initialRangeState = useMemo(() => loadRangeState(), []);

  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(5);
  const [tableMaxHeight, setTableMaxHeight] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "dueDate",
    direction: "asc",
  });
  const [unassignedTaskMessage, setUnassignedTaskMessage] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(initialRangeState.selectedPreset);
  const [customRange, setCustomRange] = useState(initialRangeState.customRange);
  const [draftPreset, setDraftPreset] = useState(initialRangeState.selectedPreset);
  const [draftCustomRange, setDraftCustomRange] = useState(initialRangeState.customRange);
  const [draftCalendarMonth, setDraftCalendarMonth] = useState(
    getInitialCalendarMonth(initialRangeState.selectedPreset, initialRangeState.customRange)
  );
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);

  const tableCardRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);
  const rangeMenuRef = useRef(null);

  const loadTasks = useCallback(async () => {
    if (!user?.companyId || !user?.userId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_BASE}/api/tasks/company/${user.companyId}`, {
        cache: "no-store",
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error("Invalid server response.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load tasks.");
      }

      const rawTasks = Array.isArray(data.tasks)
        ? data.tasks
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      const onlyLoggedInUserTasks = rawTasks
        .filter((task) => {
          const assignedUserId =
            task.assignedToUserId ??
            task.AssignedToUserId ??
            task.assignedUserId ??
            task.AssignedUserId ??
            task.userId ??
            task.UserId;

          if (Number(assignedUserId) !== Number(user.userId)) {
            return false;
          }

          return !isHiddenEmployeeTaskStatus(getTaskStatusValue(task));
        })
        .map((task) => ({
          taskId: task.taskId || task.TaskId,
          title: task.title || task.Title || "Untitled Task",
          description: task.description || task.Description || "",
          priority: task.priority || task.Priority || "-",
          complexity: task.complexity || task.Complexity || "-",
          effort:
            task.effort ??
            task.Effort ??
            task.estimatedEffortHours ??
            task.estimatedEffort ??
            0,
          dueDate:
            task.dueDate ||
            task.DueDate ||
            task.endDate ||
            task.EndDate ||
            task.deadline ||
            "",
          startDate:
            task.startDate ||
            task.StartDate ||
            task.createdAt ||
            task.CreatedAt ||
            "",
          status: resolveTaskStatus(task),
          updatedAt:
            task.updatedAt ||
            task.UpdatedAt ||
            task.lastUpdated ||
            task.LastUpdated ||
            "",
        }));

      setTasks(onlyLoggedInUserTasks);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    saveRangeState(selectedPreset, customRange);
  }, [selectedPreset, customRange]);

  const syncDraftWithAppliedState = useCallback(() => {
    setDraftPreset(selectedPreset);

    if (selectedPreset === "custom") {
      setDraftCustomRange({
        from: customRange?.from || null,
        to: customRange?.to || null,
      });
      setDraftCalendarMonth(getInitialCalendarMonth(selectedPreset, customRange));
    } else {
      const appliedRange = getPresetRange(selectedPreset, customRange);
      setDraftCustomRange({
        from: appliedRange.start,
        to: appliedRange.end,
      });
      setDraftCalendarMonth(startOfMonth(appliedRange.start));
    }
  }, [selectedPreset, customRange]);

  const openRangeMenu = useCallback(() => {
    syncDraftWithAppliedState();
    setIsRangeMenuOpen(true);
  }, [syncDraftWithAppliedState]);

  const closeRangeMenu = useCallback(() => {
    syncDraftWithAppliedState();
    setIsRangeMenuOpen(false);
  }, [syncDraftWithAppliedState]);

  useEffect(() => {
    if (!isRangeMenuOpen) return;

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
  }, [closeRangeMenu, isRangeMenuOpen]);

  useEffect(() => {
    try {
      const rawMessage = sessionStorage.getItem(UNASSIGNED_TASK_MESSAGE_KEY);

      if (!rawMessage) return;

      const parsedMessage = JSON.parse(rawMessage);

      if (!parsedMessage?.taskId && !parsedMessage?.title) {
        sessionStorage.removeItem(UNASSIGNED_TASK_MESSAGE_KEY);
        return;
      }

      setUnassignedTaskMessage({
        title: parsedMessage?.title || "Task update",
        message:
          parsedMessage?.message ||
          "This task is no longer assigned to you, so it was removed from your dashboard.",
      });
      sessionStorage.removeItem(UNASSIGNED_TASK_MESSAGE_KEY);
    } catch {
      setUnassignedTaskMessage({
        title: "Task update",
        message: "This task is no longer assigned to you, so it was removed from your dashboard.",
      });
      sessionStorage.removeItem(UNASSIGNED_TASK_MESSAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const handleWindowFocus = () => {
      loadTasks();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadTasks();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadTasks]);

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

      return `${formatDateText(customRange.from)} - ${formatDateText(customRange.to)}`;
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

      return `${formatDateText(draftCustomRange.from)} - ${formatDateText(draftCustomRange.to)}`;
    }

    return formatMonthYearText(draftCalendarMonth);
  }, [draftCalendarMonth, draftCustomRange]);

  const yearOptions = useMemo(() => buildYearOptions(tasks), [tasks]);
  const selectedMonthIndex = draftCalendarMonth.getMonth();
  const selectedYearValue = draftCalendarMonth.getFullYear();

  const rangeFilteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      doesTaskOverlapRange(task, activeRange.start, activeRange.end)
    );
  }, [tasks, activeRange.start, activeRange.end]);

  const filteredBySearch = useMemo(() => {
    const query = String(searchValue || "").trim().toLowerCase();

    if (!query) return rangeFilteredTasks;

    return rangeFilteredTasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        String(task.priority).toLowerCase().includes(query) ||
        String(task.complexity).toLowerCase().includes(query) ||
        getStatusLabel(task.status).toLowerCase().includes(query)
      );
    });
  }, [rangeFilteredTasks, searchValue]);

  const tabCounts = useMemo(() => {
    return {
      all: filteredBySearch.length,
      new: filteredBySearch.filter((task) => task.status === "new").length,
      acknowledged: filteredBySearch.filter((task) => task.status === "acknowledged").length,
      pending: filteredBySearch.filter((task) => task.status === "pending").length,
      done: filteredBySearch.filter((task) => task.status === "done").length,
    };
  }, [filteredBySearch]);

  const visibleTasks = useMemo(() => {
    if (activeTab === "all") return filteredBySearch;
    return filteredBySearch.filter((task) => task.status === activeTab);
  }, [activeTab, filteredBySearch]);

  const sortedTasks = useMemo(() => {
    const items = [...visibleTasks];

    items.sort((a, b) => {
      switch (sortConfig.key) {
        case "title":
          return compareValues(a.title, b.title, sortConfig.direction);
        case "priority":
          return compareValues(a.priority, b.priority, sortConfig.direction);
        case "complexity":
          return compareValues(a.complexity, b.complexity, sortConfig.direction);
        case "effort":
          return compareValues(
            Number(a.effort || 0),
            Number(b.effort || 0),
            sortConfig.direction
          );
        case "status":
          return compareValues(
            getStatusLabel(a.status),
            getStatusLabel(b.status),
            sortConfig.direction
          );
        case "startDate": {
          const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
          return compareValues(aTime, bTime, sortConfig.direction);
        }
        case "dueDate": {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return compareValues(aTime, bTime, sortConfig.direction);
        }
        default:
          return 0;
      }
    });

    return items;
  }, [visibleTasks, sortConfig]);

  const todayTasksCount = useMemo(() => {
    return tasks.filter((task) => isDueToday(task.dueDate)).length;
  }, [tasks]);

  const summaryStats = useMemo(() => {
    return {
      myTasks: rangeFilteredTasks.length,
      dueSoon: rangeFilteredTasks.filter((task) => isDueSoon(task.dueDate) && task.status !== "done").length,
      completed: rangeFilteredTasks.filter((task) => task.status === "done").length,
    };
  }, [rangeFilteredTasks]);

  const calculateTasksPerPage = useCallback(() => {
    if (!tableCardRef.current || !tableHeadRef.current) return;

    const cardElement = tableCardRef.current;
    const cardRect = cardElement.getBoundingClientRect();
    const headRect = tableHeadRef.current.getBoundingClientRect();
    const paginationHeight = paginationRef.current
      ? paginationRef.current.getBoundingClientRect().height
      : 58;

    const firstBodyRow = cardElement.querySelector("tbody tr");
    const rowHeight = firstBodyRow
      ? firstBodyRow.getBoundingClientRect().height
      : 72;

    const cardStyle = window.getComputedStyle(cardElement);
    const borderTop = parseFloat(cardStyle.borderTopWidth || "0");
    const borderBottom = parseFloat(cardStyle.borderBottomWidth || "0");

    const viewportHeight = window.innerHeight;
    const bottomSpacing = 24;
    const availableCardHeight = Math.max(
      360,
      Math.floor(viewportHeight - cardRect.top - bottomSpacing)
    );

    setTableMaxHeight(availableCardHeight);

    const availableRowsHeight =
      availableCardHeight -
      headRect.height -
      paginationHeight -
      borderTop -
      borderBottom;

    const fittedRows = Math.max(
      MIN_TASKS_PER_PAGE,
      Math.floor((availableRowsHeight + rowHeight * 0.25) / rowHeight)
    );

    setTasksPerPage(fittedRows);
  }, []);

  useLayoutEffect(() => {
    let frameId = 0;

    const runCalculation = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        calculateTasksPerPage();
      });
    };

    runCalculation();

    const handleResize = () => runCalculation();

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [calculateTasksPerPage, visibleTasks.length, isLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchValue, sortConfig, selectedPreset, customRange]);

  useEffect(() => {
    const totalPagesCount = Math.max(1, Math.ceil(sortedTasks.length / tasksPerPage));

    if (currentPage > totalPagesCount) {
      setCurrentPage(totalPagesCount);
    }
  }, [currentPage, sortedTasks.length, tasksPerPage]);

  const toggleSort = useCallback((key) => {
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
  }, []);

  const getSortIconClass = useCallback(
    (key) => {
      const classes = ["employee-dashboard-section__sort-icon"];

      if (sortConfig.key === key) {
        classes.push("employee-dashboard-section__sort-icon--active");
        if (sortConfig.direction === "desc") {
          classes.push("employee-dashboard-section__sort-icon--desc");
        }
      }

      return classes.join(" ");
    },
    [sortConfig]
  );

  const totalVisibleTasks = sortedTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalVisibleTasks / tasksPerPage));
  const startIndex = totalVisibleTasks === 0 ? 0 : (currentPage - 1) * tasksPerPage;
  const endIndex = Math.min(startIndex + tasksPerPage, totalVisibleTasks);
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, currentPage - 2),
    Math.min(totalPages, Math.max(0, currentPage - 2) + 5)
  );


  const handleSelectPreset = (preset) => {
    if (preset === "custom") {
      setDraftPreset("custom");
      setDraftCustomRange({ from: null, to: null });
      setDraftCalendarMonth(getInitialCalendarMonth(selectedPreset, customRange));
      return;
    }

    const nextRange = preset === "thisWeek" ? getWeekRange(0) : getTodayRange();

    setDraftPreset(preset);
    setDraftCustomRange({ from: nextRange.start, to: nextRange.end });
    setDraftCalendarMonth(startOfMonth(nextRange.start));
    setSelectedPreset(preset);
    setCustomRange({ from: nextRange.start, to: nextRange.end });
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

  return (
    <div className="employee-dashboard-section">
      <div className="employee-dashboard-section__top-layout">
        <div
          className="employee-dashboard-section__hero"
          style={{ backgroundImage: `url(${cloudBg})` }}
        >
          <div className="employee-dashboard-section__hero-overlay" />
          <div className="employee-dashboard-section__hero-content">
            <h3>
              👋 Good to see you, <span>{user?.fullName?.split(" ")[0] || "there"}!</span>
            </h3>

            <p className="employee-dashboard-section__hero-count">
              You have <strong>{summaryStats.myTasks}</strong> assigned tasks.
            </p>

            <p className="employee-dashboard-section__hero-copy">
              {todayTasksCount > 0
                ? `${todayTasksCount} task ${todayTasksCount > 1 ? "s are" : "is"} due today.`
                : "No tasks are due today. Stay focused and keep up the great work."}
            </p>
          </div>
        </div>

        <div className="employee-dashboard-section__summary-grid">
          <div className="employee-dashboard-section__summary-card">
            <div className="employee-dashboard-section__summary-icon employee-dashboard-section__summary-icon--blue">
              <FiFileText />
            </div>
            <div>
              <span>My Tasks</span>
              <strong>{summaryStats.myTasks}</strong>
              <small>Total assigned tasks</small>
            </div>
          </div>

          <div className="employee-dashboard-section__range-card">
            <div className="employee-dashboard-section__range-menu" ref={rangeMenuRef}>
              <button
                type="button"
                className="employee-dashboard-section__range-btn"
                onClick={openRangeMenu}
              >
                <span>{rangeLabel}</span>
                <FiChevronDown />
              </button>
              {isRangeMenuOpen && (
                <div className="employee-dashboard-section__range-dropdown">
                  <div
                    className="employee-dashboard-section__range-tabs"
                    role="tablist"
                    aria-label="Date range presets"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={draftPreset === "today"}
                      className={`employee-dashboard-section__range-option ${
                        draftPreset === "today"
                          ? "employee-dashboard-section__range-option--active"
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
                      className={`employee-dashboard-section__range-option ${
                        draftPreset === "thisWeek"
                          ? "employee-dashboard-section__range-option--active"
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
                      className={`employee-dashboard-section__range-option ${
                        draftPreset === "custom"
                          ? "employee-dashboard-section__range-option--active"
                          : ""
                      }`}
                      onClick={() => handleSelectPreset("custom")}
                    >
                      Custom
                    </button>
                  </div>

                  {draftPreset === "custom" && (
                    <>
                      <div className="employee-dashboard-section__range-divider"></div>

                      <div className="employee-dashboard-section__custom-range">
                        <div className="employee-dashboard-section__custom-range-header">
                          <FiCalendar />
                          <span>Pick a custom range</span>
                        </div>

                        <div className="employee-dashboard-section__custom-range-preview">
                          {draftRangePreview}
                        </div>

                        <div className="employee-dashboard-section__month-picker-row">
                          <div className="employee-dashboard-section__month-picker-field">
                            <label htmlFor="employee-dashboard-month-select">Month</label>
                            <div className="employee-dashboard-section__month-picker-select-wrap">
                              <select
                                id="employee-dashboard-month-select"
                                className="employee-dashboard-section__month-picker-select"
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

                          <div className="employee-dashboard-section__month-picker-field">
                            <label htmlFor="employee-dashboard-year-select">Year</label>
                            <div className="employee-dashboard-section__month-picker-select-wrap">
                              <select
                                id="employee-dashboard-year-select"
                                className="employee-dashboard-section__month-picker-select"
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

                        <div className="employee-dashboard-section__calendar-shell">
                          <DayPicker
                            mode="range"
                            month={draftCalendarMonth}
                            onMonthChange={(month) => setDraftCalendarMonth(startOfMonth(month))}
                            selected={draftCustomRange}
                            onSelect={handleCustomRangeSelect}
                            showOutsideDays={false}
                            numberOfMonths={1}
                            className="employee-dashboard-section__day-picker"
                            modifiers={{
                              past: (date) => startOfDay(date) < startOfDay(new Date()),
                            }}
                            modifiersClassNames={{
                              past: "employee-dashboard-section__day--past",
                            }}
                          />
                        </div>

                        <div className="employee-dashboard-section__apply-btn-wrap">
                          <button
                            type="button"
                            className="employee-dashboard-section__apply-btn"
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

          <div className="employee-dashboard-section__summary-card">
            <div className="employee-dashboard-section__summary-icon employee-dashboard-section__summary-icon--green">
              <FiClock />
            </div>
            <div>
              <span>Due Soon</span>
              <strong>{summaryStats.dueSoon}</strong>
              <small>Tasks due in the next 7 days</small>
            </div>
          </div>

          <div className="employee-dashboard-section__summary-card">
            <div className="employee-dashboard-section__summary-icon employee-dashboard-section__summary-icon--purple">
              <FiCheckCircle />
            </div>
            <div>
              <span>Completed</span>
              <strong>{summaryStats.completed}</strong>
              <small>Tasks you have completed</small>
            </div>
          </div>
        </div>
      </div>


      {unassignedTaskMessage ? (
        <div className="employee-dashboard-section__unassigned-message" role="status">
          <span className="employee-dashboard-section__unassigned-icon">
            <FiAlertCircle />
          </span>

          <div className="employee-dashboard-section__unassigned-copy">
            <strong>{unassignedTaskMessage.title}</strong>
            <p>{unassignedTaskMessage.message}</p>
          </div>

          <button
            type="button"
            className="employee-dashboard-section__unassigned-dismiss"
            aria-label="Dismiss task update"
            onClick={() => setUnassignedTaskMessage(null)}
          >
            <FiX />
          </button>
        </div>
      ) : null}

      <div className="employee-dashboard-section__tabs">
        {STATUS_TABS.map((tab) => (
          <div key={tab.key} className="employee-dashboard-section__tab-group">
            <button
              type="button"
              className={`employee-dashboard-section__tab ${
                activeTab === tab.key ? "employee-dashboard-section__tab--active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span
                className={`employee-dashboard-section__tab-label ${
                  activeTab === tab.key
                    ? "employee-dashboard-section__tab-label--active"
                    : ""
                }`}
              >
                {tab.label}
              </span>
            </button>

            <span className="employee-dashboard-section__tab-count">
              {tabCounts[tab.key]}
            </span>
          </div>
        ))}
      </div>

      <div
        ref={tableCardRef}
        className="employee-dashboard-section__table-card"
        style={{
          maxHeight: tableMaxHeight ? `${tableMaxHeight}px` : undefined,
          height: tableMaxHeight ? `${tableMaxHeight}px` : undefined,
        }}
      >
        {isLoading ? (
          <div className="employee-dashboard-section__state-card">
            <div className="employee-dashboard-section__state-icon">
              <FiClock />
            </div>
            <h3>Loading tasks...</h3>
            <p>Please wait while we load your assigned tasks.</p>
          </div>
        ) : errorMessage && tasks.length === 0 ? (
          <div className="employee-dashboard-section__state-card employee-dashboard-section__state-card--error">
            <div className="employee-dashboard-section__state-icon employee-dashboard-section__state-icon--error">
              <FiAlertCircle />
            </div>
            <h3>Could not load tasks</h3>
            <p>{errorMessage}</p>
          </div>
        ) : totalVisibleTasks === 0 ? (
          <div className="employee-dashboard-section__state-card">
            <div className="employee-dashboard-section__state-icon">
              <FiFileText />
            </div>
            <h3>No tasks found</h3>
            <p>There are no tasks matching the selected tab right now.</p>
          </div>
        ) : (
          <>
            <div className="employee-dashboard-section__table-wrap">
              <table className="employee-dashboard-section__table">
                <thead ref={tableHeadRef}>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("title")}
                      >
                        <span>Task Name</span>
                        <FiChevronDown className={getSortIconClass("title")} />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("priority")}
                      >
                        <span>Priority</span>
                        <FiChevronDown className={getSortIconClass("priority")} />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("complexity")}
                      >
                        <span>Complexity</span>
                        <FiChevronDown className={getSortIconClass("complexity")} />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("effort")}
                      >
                        <span>Effort</span>
                        <FiChevronDown className={getSortIconClass("effort")} />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("status")}
                      >
                        <span>Status</span>
                        <FiChevronDown className={getSortIconClass("status")} />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("startDate")}
                      >
                        <span>Start Date</span>
                        <FiChevronDown className={getSortIconClass("startDate")} />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="employee-dashboard-section__sort-btn"
                        onClick={() => toggleSort("dueDate")}
                      >
                        <span>Due Date</span>
                        <FiChevronDown className={getSortIconClass("dueDate")} />
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTasks.map((task, index) => (
                    <tr
                      key={`${task.taskId}-${task.status}-${task.updatedAt || ""}`}
                      className={
                        index % 2 === 0
                          ? "employee-dashboard-section__row--odd"
                          : "employee-dashboard-section__row--even"
                      }
                    >
                      <td>
                        <div className="employee-dashboard-section__task-cell">
                          <strong>{task.title}</strong>
                          <small>{task.description || "Task assigned to you"}</small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`employee-dashboard-section__badge ${getPriorityClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`employee-dashboard-section__badge ${getComplexityClass(
                            task.complexity
                          )}`}
                        >
                          {task.complexity}
                        </span>
                      </td>

                      <td className="employee-dashboard-section__cell-center">
                        {task.effort}h
                      </td>

                      <td>
                        <span
                          className={`employee-dashboard-section__status-inline ${getStatusClass(
                            task.status
                          )}`}
                        >
                          <span className="employee-dashboard-section__status-inline-icon">
                            {getStatusIcon(task.status)}
                          </span>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>

                      <td className="employee-dashboard-section__cell-center">
                        <span className="employee-dashboard-section__due-date">
                          {formatDate(task.startDate)}
                        </span>
                      </td>

                      <td className="employee-dashboard-section__cell-center">
                        <span className="employee-dashboard-section__due-date">
                          {formatDate(task.dueDate)}
                        </span>
                      </td>

                      <td>
                        <div className="employee-dashboard-section__actions employee-dashboard-section__actions--single">
                          <button
                            type="button"
                            className="employee-dashboard-section__icon-btn"
                            title="View task"
                            onClick={() => navigate(`/employee/tasks/${task.taskId}`)}
                          >
                            <FiEye />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div ref={paginationRef} className="users-section__pagination">
              <div className="users-section__pagination-info">
                {startIndex + 1} - {endIndex} of {totalVisibleTasks} tasks
              </div>

              <div className="users-section__pagination-controls">
                <button
                  type="button"
                  className="users-section__page-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft />
                </button>

                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`users-section__page-btn users-section__page-btn--number ${
                      currentPage === page ? "users-section__page-btn--active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="users-section__page-btn"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>

            {errorMessage ? (
              <div className="employee-dashboard-section__inline-error">
                {errorMessage}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}