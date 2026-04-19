import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckSquare,
  FiChevronDown,
  FiLayers,
  FiMoreHorizontal,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import "../../assets/styles/admin/dashboard-section.css";

const API_BASE_URL = "http://localhost:5000";

const STATUS_COLOR_MAP = {
  new: "#3b82f6",
  pending: "#f59e0b",
  acknowledged: "#8b5cf6",
  done: "#22c55e",
  approved: "#16a34a",
  rejected: "#ef4444",
  blocked: "#64748b",
  "in progress": "#f97316",
  inprogress: "#f97316",
};

const FALLBACK_STATUS_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#22c55e",
  "#14b8a6",
  "#ec4899",
  "#f97316",
  "#6366f1",
];

const CHART_PERIOD_OPTIONS = [
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "all-time", label: "All Time" },
];

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error("Failed to read user from localStorage.", error);
    return null;
  }
}

async function readJsonSafe(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function normalizeUsersResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.members)) return data.members;
  return [];
}

function normalizeTeamsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.teams)) return data.teams;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeTasksResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.tasks?.result)) return data.tasks.result;
  if (Array.isArray(data?.tasks?.items)) return data.tasks.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.tasks)) return data.data.tasks;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeStatusesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.statuses)) return data.statuses;
  if (Array.isArray(data?.statuses?.result)) return data.statuses.result;
  if (Array.isArray(data?.data?.statuses)) return data.data.statuses;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizePrioritiesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.priorities)) return data.priorities;
  if (Array.isArray(data?.priority)) return data.priority;
  if (Array.isArray(data?.data?.priorities)) return data.data.priorities;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getUserStatus(user) {
  if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Inactive";
  if (typeof user?.IsActive === "boolean") return user.IsActive ? "Active" : "Inactive";
  if (typeof user?.active === "boolean") return user.active ? "Active" : "Inactive";

  const rawStatus = String(user?.status || "").trim().toLowerCase();
  if (!rawStatus) return "Active";
  return rawStatus === "active" ? "Active" : "Inactive";
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getTaskStatus(task) {
  const rawStatus =
    task?.taskStatusName ||
    task?.TaskStatusName ||
    task?.taskStatus?.statusName ||
    task?.taskStatus?.StatusName ||
    task?.taskStatus?.name ||
    task?.taskStatus?.Name ||
    task?.status ||
    task?.Status;

  const cleaned = String(rawStatus || "").trim();
  return cleaned || "Unknown";
}

function getTaskStatusId(task) {
  const rawId =
    task?.taskStatusId ??
    task?.TaskStatusId ??
    task?.taskStatus?.taskStatusId ??
    task?.taskStatus?.TaskStatusId ??
    null;

  return rawId === null || rawId === undefined || rawId === "" ? null : String(rawId);
}

function getStatusName(status) {
  return String(
    status?.statusName ||
      status?.StatusName ||
      status?.name ||
      status?.Name ||
      ""
  ).trim();
}

function getStatusId(status) {
  const rawId =
    status?.taskStatusId ??
    status?.TaskStatusId ??
    status?.id ??
    status?.Id ??
    null;

  return rawId === null || rawId === undefined || rawId === "" ? null : String(rawId);
}

function getStatusOrder(status, fallbackIndex) {
  const rawOrder = status?.displayOrder ?? status?.DisplayOrder;
  return Number.isFinite(Number(rawOrder)) ? Number(rawOrder) : fallbackIndex;
}

function getPriorityId(priority) {
  const rawId =
    priority?.priorityId ??
    priority?.PriorityId ??
    priority?.id ??
    priority?.Id ??
    null;

  return rawId === null || rawId === undefined || rawId === "" ? null : String(rawId);
}

function getPriorityName(priority) {
  return String(
    priority?.priorityName ||
      priority?.PriorityName ||
      priority?.name ||
      priority?.Name ||
      priority?.title ||
      priority?.Title ||
      ""
  ).trim();
}

function getPriorityOrder(priority, fallbackIndex) {
  const rawOrder = priority?.displayOrder ?? priority?.DisplayOrder ?? priority?.order ?? priority?.Order;
  return Number.isFinite(Number(rawOrder)) ? Number(rawOrder) : fallbackIndex;
}

function getTaskPriorityId(task) {
  const rawId =
    task?.priorityId ??
    task?.PriorityId ??
    task?.taskPriorityId ??
    task?.TaskPriorityId ??
    task?.priority?.priorityId ??
    task?.priority?.PriorityId ??
    task?.taskPriority?.priorityId ??
    task?.taskPriority?.PriorityId ??
    null;

  return rawId === null || rawId === undefined || rawId === "" ? null : String(rawId);
}

function getTaskPriorityName(task) {
  return String(
    task?.priorityName ||
      task?.PriorityName ||
      task?.priority?.priorityName ||
      task?.priority?.PriorityName ||
      task?.priority?.name ||
      task?.priority?.Name ||
      task?.taskPriority?.priorityName ||
      task?.taskPriority?.PriorityName ||
      task?.taskPriority?.name ||
      task?.taskPriority?.Name ||
      ""
  ).trim();
}

function getTeamId(team) {
  const rawId = team?.teamId ?? team?.TeamId ?? team?.id ?? team?.Id ?? null;
  return rawId === null || rawId === undefined || rawId === "" ? null : String(rawId);
}

function getTeamName(team) {
  return String(
    team?.teamName ||
      team?.TeamName ||
      team?.name ||
      team?.Name ||
      ""
  ).trim();
}

function getTaskTeamId(task) {
  const rawId =
    task?.teamId ??
    task?.TeamId ??
    task?.team?.teamId ??
    task?.team?.TeamId ??
    task?.assignedTeamId ??
    task?.AssignedTeamId ??
    null;

  return rawId === null || rawId === undefined || rawId === "" ? null : String(rawId);
}

function getTaskTeamName(task) {
  return String(
    task?.teamName ||
      task?.TeamName ||
      task?.team?.teamName ||
      task?.team?.TeamName ||
      task?.team?.name ||
      task?.team?.Name ||
      task?.assignedTeamName ||
      task?.AssignedTeamName ||
      ""
  ).trim();
}

function isCompletedStatus(status) {
  const normalized = normalizeStatus(status);
  return [
    "done",
    "completed",
    "complete",
    "closed",
    "finished",
    "resolved",
    "approved",
  ].includes(normalized);
}

function isApprovedStatus(status) {
  return normalizeStatus(status) === "approved";
}

function getStatusColor(statusName, index) {
  const normalized = normalizeStatus(statusName);
  return STATUS_COLOR_MAP[normalized] || FALLBACK_STATUS_COLORS[index % FALLBACK_STATUS_COLORS.length];
}

async function fetchFirstSuccessful(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      const data = await readJsonSafe(response);

      if (response.ok) {
        return { ok: true, data };
      }
    } catch (error) {
      console.error("Dashboard fetch candidate failed:", error);
    }
  }

  return { ok: false, data: [] };
}

function getPluralLabel(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

function buildDonutSegments(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (!total) return [];

  let currentAngle = 0;

  return segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const sweepAngle = (segment.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle;
      const midAngle = startAngle + sweepAngle / 2;

      currentAngle = endAngle;

      return {
        ...segment,
        sweepAngle,
        startAngle,
        endAngle,
        midAngle,
      };
    });
}

function getTaskRelevantDate(task) {
  const rawDate =
    task?.approvedAt ||
    task?.ApprovedAt ||
    task?.completedAt ||
    task?.CompletedAt ||
    task?.doneAt ||
    task?.DoneAt ||
    task?.closedAt ||
    task?.ClosedAt ||
    task?.updatedAt ||
    task?.UpdatedAt ||
    task?.modifiedAt ||
    task?.ModifiedAt ||
    task?.createdAt ||
    task?.CreatedAt ||
    task?.date ||
    task?.Date ||
    null;

  const parsed = rawDate ? new Date(rawDate) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, amount) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function getDateRange(period, tasksWithDates) {
  const today = startOfDay(new Date());

  if (period === "this-week") {
    const day = today.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = addDays(today, -diffToMonday);
    return { start, end: today, pointsLimit: 7 };
  }

  if (period === "this-month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start, end: today, pointsLimit: 31 };
  }

  if (period === "last-30-days") {
    const start = addDays(today, -29);
    return { start, end: today, pointsLimit: 30 };
  }

  const datedTasks = tasksWithDates.filter((item) => item.date instanceof Date);
  if (datedTasks.length === 0) {
    return { start: addDays(today, -6), end: today, pointsLimit: 7 };
  }

  const sortedDates = datedTasks.map((item) => item.date).sort((a, b) => a - b);
  return {
    start: startOfDay(sortedDates[0]),
    end: startOfDay(sortedDates[sortedDates.length - 1]),
    pointsLimit: Math.max(7, Math.min(60, sortedDates.length)),
  };
}

function buildSmoothedLinePath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildAreaPath(points, baseY) {
  if (!points.length) return "";
  return `${buildSmoothedLinePath(points)} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
}

function TaskSummaryDonut({ segments, totalTasks }) {
  const size = 230;
  const center = size / 2;
  const radius = 83;
  const strokeWidth = 44;
  const labelRadius = 83;
  const donutSegments = buildDonutSegments(segments);

  return (
    <div className="dashboard-section__donut-wrap">
      <div className="dashboard-section__donut" role="img" aria-label="Task status distribution chart">
        <svg
          className="dashboard-section__donut-svg"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <circle
            className="dashboard-section__donut-track"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {donutSegments.map((segment) => (
            <path
              key={segment.key}
              d={describeArc(center, center, radius, segment.startAngle, segment.endAngle)}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
          ))}

          {donutSegments.map((segment) => {
            if (segment.sweepAngle < 18) {
              return null;
            }

            const labelPosition = polarToCartesian(center, center, labelRadius, segment.midAngle);

            return (
              <text
                key={`${segment.key}-label`}
                x={labelPosition.x}
                y={labelPosition.y}
                className="dashboard-section__donut-segment-label"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {segment.percentage}%
              </text>
            );
          })}
        </svg>

        <div className="dashboard-section__donut-center">
          <strong>{totalTasks}</strong>
          <span>Total tasks</span>
        </div>
      </div>
    </div>
  );
}

function TasksCompletedChart({ dataPoints }) {
  const width = 920;
  const height = 380;
  const margin = { top: 16, right: 20, bottom: 58, left: 20 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const baseY = margin.top + chartHeight;
  const maxValue = Math.max(...dataPoints.map((point) => point.value), 0);
  const normalizedMax = maxValue > 0 ? maxValue : 1;
  const gridRows = 4;

  const points = dataPoints.map((point, index) => {
    const x =
      margin.left +
      (dataPoints.length === 1 ? chartWidth / 2 : (index / (dataPoints.length - 1)) * chartWidth);
    const y = margin.top + chartHeight - (point.value / normalizedMax) * (chartHeight * 0.82);

    return {
      ...point,
      x,
      y,
    };
  });

  const linePath = buildSmoothedLinePath(points);
  const areaPath = buildAreaPath(points, baseY);

  return (
    <div className="dashboard-section__tasks-chart-wrap">
      <svg
        className="dashboard-section__tasks-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Approved tasks chart"
      >
        <defs>
          <linearGradient id="dashboardApprovedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#84cc16" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#84cc16" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridRows + 1 }).map((_, index) => {
          const y = margin.top + (chartHeight / gridRows) * index;
          return (
            <line
              key={`row-${index}`}
              x1={margin.left}
              y1={y}
              x2={margin.left + chartWidth}
              y2={y}
              className="dashboard-section__tasks-chart-grid"
            />
          );
        })}

        {points.map((point) => (
          <line
            key={`col-${point.key}`}
            x1={point.x}
            y1={margin.top}
            x2={point.x}
            y2={baseY}
            className="dashboard-section__tasks-chart-grid dashboard-section__tasks-chart-grid--vertical"
          />
        ))}

        {areaPath ? (
          <path d={areaPath} className="dashboard-section__tasks-chart-area" fill="url(#dashboardApprovedGradient)" />
        ) : null}

        {linePath ? <path d={linePath} className="dashboard-section__tasks-chart-line" /> : null}

        {points.map((point) => (
          <g key={point.key}>
            <circle className="dashboard-section__tasks-chart-point-ring" cx={point.x} cy={point.y} r="9.5" />
            <circle className="dashboard-section__tasks-chart-point" cx={point.x} cy={point.y} r="6" />
            <text
              x={point.x}
              y={height - 18}
              textAnchor="middle"
              className="dashboard-section__tasks-chart-label"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function DashboardSection({ searchValue = "" }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("this-week");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || currentUser?.CompanyId;
  const normalizedSearch = String(searchValue || "").trim().toLowerCase();

  useEffect(() => {
    const loadDashboard = async () => {
      if (!companyId) {
        setUsers([]);
        setTeams([]);
        setTasks([]);
        setTaskStatuses([]);
        setPriorities([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const usersParams = new URLSearchParams({
          page: "1",
          pageSize: "1000",
          pageNumber: "1",
        });

        const [usersResult, teamsResult, tasksResult, statusesResult, prioritiesResult] = await Promise.all([
          fetchFirstSuccessful([
            `${API_BASE_URL}/api/teams/company/${encodeURIComponent(companyId)}/members`,
            `${API_BASE_URL}/api/auth/company-users/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
            `${API_BASE_URL}/api/users/company/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
            `${API_BASE_URL}/api/user/company/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
            `${API_BASE_URL}/api/employees/company/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
          ]),
          fetchFirstSuccessful([`${API_BASE_URL}/api/teams/company/${encodeURIComponent(companyId)}`]),
          fetchFirstSuccessful([`${API_BASE_URL}/api/tasks/company/${encodeURIComponent(companyId)}`]),
          fetchFirstSuccessful([`${API_BASE_URL}/api/tasks/statuses/${encodeURIComponent(companyId)}`]),
          fetchFirstSuccessful([
            `${API_BASE_URL}/api/tasks/priorities/${encodeURIComponent(companyId)}`,
            `${API_BASE_URL}/api/priorities/company/${encodeURIComponent(companyId)}`,
            `${API_BASE_URL}/api/task-priorities/company/${encodeURIComponent(companyId)}`,
            `${API_BASE_URL}/api/taskpriorities/company/${encodeURIComponent(companyId)}`,
            `${API_BASE_URL}/api/tasks/company/${encodeURIComponent(companyId)}/priorities`,
          ]),
        ]);

        setUsers(normalizeUsersResponse(usersResult.data));
        setTeams(normalizeTeamsResponse(teamsResult.data));
        setTasks(normalizeTasksResponse(tasksResult.data));
        setTaskStatuses(normalizeStatusesResponse(statusesResult.data));
        setPriorities(normalizePrioritiesResponse(prioritiesResult.data));
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        setUsers([]);
        setTeams([]);
        setTasks([]);
        setTaskStatuses([]);
        setPriorities([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [companyId]);

  const dashboardData = useMemo(() => {
    const activeUsers = users.filter((user) => getUserStatus(user) === "Active");
    const completedTasks = tasks.filter((task) => isCompletedStatus(getTaskStatus(task)));

    const orderedStatuses = taskStatuses
      .map((status, index) => ({
        id: getStatusId(status),
        name: getStatusName(status),
        order: getStatusOrder(status, index),
      }))
      .filter((status) => status.name)
      .sort((a, b) => a.order - b.order);

    const countByStatusId = tasks.reduce((accumulator, task) => {
      const taskStatusId = getTaskStatusId(task);
      if (!taskStatusId) return accumulator;
      accumulator[taskStatusId] = (accumulator[taskStatusId] || 0) + 1;
      return accumulator;
    }, {});

    const statusNameToId = orderedStatuses.reduce((accumulator, status) => {
      accumulator[normalizeStatus(status.name)] = status.id;
      return accumulator;
    }, {});

    const fallbackNameCounts = tasks.reduce((accumulator, task) => {
      const normalizedName = normalizeStatus(getTaskStatus(task));
      if (!normalizedName) return accumulator;
      accumulator[normalizedName] = (accumulator[normalizedName] || 0) + 1;
      return accumulator;
    }, {});

    const taskSummary = orderedStatuses.length > 0
      ? orderedStatuses.map((status, index) => {
          const normalizedName = normalizeStatus(status.name);
          const valueFromId = status.id ? countByStatusId[status.id] || 0 : 0;
          const valueFromName = fallbackNameCounts[normalizedName] || 0;
          const value = Math.max(valueFromId, valueFromName);

          return {
            key: `${status.id || normalizedName || "unknown"}-${index}`,
            label: status.name,
            value,
            percentage: tasks.length > 0 ? Math.round((value / tasks.length) * 100) : 0,
            color: getStatusColor(status.name, index),
          };
        })
      : Array.from(new Set(tasks.map((task) => getTaskStatus(task)).filter(Boolean))).map(
          (statusName, index) => {
            const normalizedName = normalizeStatus(statusName);
            const linkedStatusId = statusNameToId[normalizedName];
            const value = linkedStatusId
              ? countByStatusId[linkedStatusId] || 0
              : fallbackNameCounts[normalizedName] || 0;

            return {
              key: `${normalizedName || "unknown"}-${index}`,
              label: statusName,
              value,
              percentage: tasks.length > 0 ? Math.round((value / tasks.length) * 100) : 0,
              color: getStatusColor(statusName, index),
            };
          }
        );

    const orderedPriorityOptions = priorities
      .map((priority, index) => ({
        id: getPriorityId(priority),
        label: getPriorityName(priority),
        order: getPriorityOrder(priority, index),
      }))
      .filter((priority) => priority.label)
      .sort((a, b) => a.order - b.order);

    const fallbackPriorityMap = new Map();
    tasks.forEach((task) => {
      const taskPriorityName = getTaskPriorityName(task);
      if (!taskPriorityName) return;
      const normalized = normalizeStatus(taskPriorityName);
      if (!fallbackPriorityMap.has(normalized)) {
        fallbackPriorityMap.set(normalized, {
          id: getTaskPriorityId(task) || normalized,
          label: taskPriorityName,
        });
      }
    });

    const priorityOptions = orderedPriorityOptions.length > 0
      ? orderedPriorityOptions
      : Array.from(fallbackPriorityMap.values()).map((priority, index) => ({
          ...priority,
          order: index,
        }));

    const orderedTeamOptions = teams
      .map((team, index) => ({
        id: getTeamId(team),
        label: getTeamName(team),
        order: index,
      }))
      .filter((team) => team.label);

    const fallbackTeamMap = new Map();
    tasks.forEach((task) => {
      const taskTeamName = getTaskTeamName(task);
      if (!taskTeamName) return;
      const id = getTaskTeamId(task) || normalizeStatus(taskTeamName);
      if (!fallbackTeamMap.has(id)) {
        fallbackTeamMap.set(id, { id, label: taskTeamName });
      }
    });

    const teamOptions = orderedTeamOptions.length > 0
      ? orderedTeamOptions
      : Array.from(fallbackTeamMap.values()).map((team, index) => ({
          ...team,
          order: index,
        }));

    const approvedTasks = tasks
      .filter((task) => isApprovedStatus(getTaskStatus(task)))
      .map((task) => ({
        task,
        date: getTaskRelevantDate(task),
        priorityId: getTaskPriorityId(task),
        priorityName: getTaskPriorityName(task),
        teamId: getTaskTeamId(task),
        teamName: getTaskTeamName(task),
      }));

    const priorityFilteredApprovedTasks = approvedTasks.filter((item) => {
      if (selectedPriority === "all") return true;

      const normalizedTaskPriority = normalizeStatus(item.priorityName);
      return item.priorityId === selectedPriority || normalizedTaskPriority === selectedPriority;
    });

    const teamFilteredApprovedTasks = priorityFilteredApprovedTasks.filter((item) => {
      if (selectedTeam === "all") return true;
      return item.teamId === selectedTeam || normalizeStatus(item.teamName) === selectedTeam;
    });

    const range = getDateRange(selectedPeriod, teamFilteredApprovedTasks);
    const startTime = startOfDay(range.start).getTime();
    const endTime = startOfDay(range.end).getTime();
    const bucketMap = new Map();

    for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
      const bucketDate = new Date(time);
      bucketMap.set(toDateKey(bucketDate), {
        key: toDateKey(bucketDate),
        date: bucketDate,
        label: formatShortDate(bucketDate),
        value: 0,
      });
    }

    teamFilteredApprovedTasks.forEach((item) => {
      if (!item.date) return;
      const bucketKey = toDateKey(startOfDay(item.date));
      if (!bucketMap.has(bucketKey)) return;
      bucketMap.get(bucketKey).value += 1;
    });

    let tasksCompletedSeries = Array.from(bucketMap.values());

    if (selectedPeriod === "all-time" && tasksCompletedSeries.length > 12) {
      const chunkSize = Math.ceil(tasksCompletedSeries.length / 12);
      const compressed = [];

      for (let index = 0; index < tasksCompletedSeries.length; index += chunkSize) {
        const chunk = tasksCompletedSeries.slice(index, index + chunkSize);
        const lastPoint = chunk[chunk.length - 1];
        compressed.push({
          key: `${chunk[0].key}-${lastPoint.key}`,
          date: lastPoint.date,
          label: formatShortDate(lastPoint.date),
          value: chunk.reduce((sum, entry) => sum + entry.value, 0),
        });
      }

      tasksCompletedSeries = compressed;
    }

    const approvedTaskCount = teamFilteredApprovedTasks.filter((item) => {
      if (!item.date) return selectedPeriod === "all-time";
      const itemTime = startOfDay(item.date).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    }).length;

    const searchableContent = [
      "dashboard",
      "task summary",
      "tasks completed",
      "approved tasks",
      "users",
      "teams",
      "tasks",
      "completion",
      ...taskSummary.flatMap((item) => [item.label, String(item.value), `${item.percentage}%`]),
      ...priorityOptions.map((priority) => priority.label),
      ...teamOptions.map((team) => team.label),
      String(users.length),
      String(teams.length),
      String(tasks.length),
      String(activeUsers.length),
      String(completedTasks.length),
      String(approvedTaskCount),
    ]
      .join(" ")
      .toLowerCase();

    return {
      hasAnyData: users.length > 0 || teams.length > 0 || tasks.length > 0,
      searchMatches: !normalizedSearch || searchableContent.includes(normalizedSearch),
      stats: {
        users: users.length,
        activeUsers: activeUsers.length,
        teams: teams.length,
        tasks: tasks.length,
        completedTasks: completedTasks.length,
        completionRate:
          tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      },
      taskSummary,
      priorityOptions,
      teamOptions,
      tasksCompletedSeries,
      approvedTaskCount,
    };
  }, [users, teams, tasks, taskStatuses, priorities, selectedPriority, selectedPeriod, selectedTeam, normalizedSearch]);

  const statCards = [
    {
      key: "users",
      label: "Users",
      value: dashboardData.stats.users,
      meta: `${dashboardData.stats.activeUsers} active`,
      icon: <FiUsers />,
      tone: "blue",
    },
    {
      key: "teams",
      label: "Teams",
      value: dashboardData.stats.teams,
      meta: "Workspace teams",
      icon: <FiLayers />,
      tone: "violet",
    },
    {
      key: "tasks",
      label: "Tasks",
      value: dashboardData.stats.tasks,
      meta: `${dashboardData.stats.completedTasks} completed`,
      icon: <FiCheckSquare />,
      tone: "green",
    },
    {
      key: "completion",
      label: "Completion",
      value: `${dashboardData.stats.completionRate}%`,
      meta: `${Math.max(
        dashboardData.stats.tasks - dashboardData.stats.completedTasks,
        0
      )} active`,
      icon: <FiTrendingUp />,
      tone: "amber",
    },
  ];

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__title-row">
        <h2>Dashboard</h2>
        <div className="dashboard-section__title-line"></div>
      </div>

      <div className="dashboard-section__scroll">
        {loading ? (
          <div className="dashboard-section__state-card">
            <div className="dashboard-section__state-icon">
              <FiTrendingUp />
            </div>
            <h3>Loading dashboard...</h3>
            <p>Please wait while we fetch your company overview.</p>
          </div>
        ) : !dashboardData.hasAnyData ? (
          <div className="dashboard-section__state-card">
            <div className="dashboard-section__state-icon">
              <FiActivity />
            </div>
            <h3>No dashboard data yet</h3>
            <p>Create teams, users, and tasks to start viewing your dashboard insights.</p>
          </div>
        ) : !dashboardData.searchMatches ? (
          <div className="dashboard-section__state-card">
            <div className="dashboard-section__state-icon">
              <FiAlertCircle />
            </div>
            <h3>No dashboard matches</h3>
            <p>Try a different search term to find matching company dashboard data.</p>
          </div>
        ) : (
          <>
            <div className="dashboard-section__stats-grid">
              {statCards.map((card) => (
                <article
                  key={card.key}
                  className={`dashboard-section__stat-card dashboard-section__stat-card--${card.tone}`}
                >
                  <div className="dashboard-section__stat-icon">{card.icon}</div>
                  <div className="dashboard-section__stat-copy">
                    <small>{card.label}</small>
                    <strong>{card.value}</strong>
                    <span>{card.meta}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="dashboard-section__content-grid">
              <article className="dashboard-section__panel dashboard-section__task-summary-panel">
                <div className="dashboard-section__panel-header">
                  <div>
                    <h3>Task Summary</h3>
                    <p>Live distribution of this company&apos;s backend task statuses</p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-section__summary-menu"
                    aria-label="Task summary options"
                  >
                    <FiMoreHorizontal />
                  </button>
                </div>

                <div className="dashboard-section__task-summary-body">
                  <TaskSummaryDonut
                    segments={dashboardData.taskSummary}
                    totalTasks={dashboardData.stats.tasks}
                  />

                  {dashboardData.taskSummary.length === 0 ? (
                    <div className="dashboard-section__empty dashboard-section__empty--compact">
                      <span>No task statuses available yet.</span>
                    </div>
                  ) : (
                    <div className="dashboard-section__summary-grid">
                      {dashboardData.taskSummary.map((item) => (
                        <div key={item.key} className="dashboard-section__summary-item">
                          <span
                            className="dashboard-section__summary-dot"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <div className="dashboard-section__summary-copy">
                            <span>{item.label}</span>
                            <small>
                              {item.value} {getPluralLabel(item.value, "task")}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>

              <article className="dashboard-section__panel dashboard-section__tasks-completed-panel">
                <div className="dashboard-section__panel-header dashboard-section__panel-header--stacked">
                  <div>
                    <h3>Tasks Completed</h3>
                    <p>Approved tasks from the backend, grouped over time</p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-section__summary-menu"
                    aria-label="Tasks completed options"
                  >
                    <FiMoreHorizontal />
                  </button>
                </div>

                <div className="dashboard-section__tasks-completed-toolbar">
                  <div className="dashboard-section__tasks-completed-label">
                    Tasks by:
                    <span>{dashboardData.priorityOptions.find((option) => option.id === selectedPriority || normalizeStatus(option.label) === selectedPriority)?.label || "priority"}</span>
                  </div>

                  <div className="dashboard-section__tasks-completed-filters">
                    <label className="dashboard-section__filter-select">
                      <select
                        value={selectedPriority}
                        onChange={(event) => setSelectedPriority(event.target.value)}
                        aria-label="Filter approved tasks by priority"
                      >
                        <option value="all">Priority: All</option>
                        {dashboardData.priorityOptions.map((priority) => (
                          <option key={priority.id || priority.label} value={priority.id || normalizeStatus(priority.label)}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown />
                    </label>

                    <label className="dashboard-section__filter-select">
                      <select
                        value={selectedPeriod}
                        onChange={(event) => setSelectedPeriod(event.target.value)}
                        aria-label="Filter approved tasks by period"
                      >
                        {CHART_PERIOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown />
                    </label>

                    <label className="dashboard-section__filter-select">
                      <select
                        value={selectedTeam}
                        onChange={(event) => setSelectedTeam(event.target.value)}
                        aria-label="Filter approved tasks by team"
                      >
                        <option value="all">Team: All</option>
                        {dashboardData.teamOptions.map((team) => (
                          <option key={team.id || team.label} value={team.id || normalizeStatus(team.label)}>
                            Team: {team.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown />
                    </label>
                  </div>
                </div>

                {dashboardData.tasksCompletedSeries.length === 0 ? (
                  <div className="dashboard-section__empty">
                    <span>No approved task data available for the selected filters.</span>
                  </div>
                ) : (
                  <>
                    <TasksCompletedChart dataPoints={dashboardData.tasksCompletedSeries} />
                    <div className="dashboard-section__tasks-completed-footnote">
                      Showing <strong>{dashboardData.approvedTaskCount}</strong> approved {getPluralLabel(dashboardData.approvedTaskCount, "task")} for the selected filters.
                    </div>
                  </>
                )}
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
