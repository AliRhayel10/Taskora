import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckSquare,
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

export default function DashboardSection({ searchValue = "" }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
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

        const [usersResult, teamsResult, tasksResult, statusesResult] = await Promise.all([
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
        ]);

        setUsers(normalizeUsersResponse(usersResult.data));
        setTeams(normalizeTeamsResponse(teamsResult.data));
        setTasks(normalizeTasksResponse(tasksResult.data));
        setTaskStatuses(normalizeStatusesResponse(statusesResult.data));
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        setUsers([]);
        setTeams([]);
        setTasks([]);
        setTaskStatuses([]);
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

    const searchableContent = [
      "dashboard",
      "task summary",
      "users",
      "teams",
      "tasks",
      "completion",
      ...taskSummary.flatMap((item) => [item.label, String(item.value), `${item.percentage}%`]),
      String(users.length),
      String(teams.length),
      String(tasks.length),
      String(activeUsers.length),
      String(completedTasks.length),
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
    };
  }, [users, teams, tasks, taskStatuses, normalizedSearch]);

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

            <div className="dashboard-section__content-grid dashboard-section__content-grid--single">
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
            </div>
          </>
        )}
      </div>
    </section>
  );
}
