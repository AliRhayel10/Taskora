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
const STATUS_COLORS = [
  "#7dd3fc",
  "#bae6d4",
  "#f6d365",
  "#c4b5fd",
  "#f9a8d4",
  "#fdba74",
  "#93c5fd",
  "#86efac",
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
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeStatusesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.statuses)) return data.statuses;
  if (Array.isArray(data?.data?.statuses)) return data.data.statuses;
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

function getTaskStatus(task) {
  const rawStatus =
    task?.taskStatusName ||
    task?.TaskStatusName ||
    task?.taskStatus?.statusName ||
    task?.taskStatus?.StatusName ||
    task?.taskStatus ||
    task?.status ||
    task?.Status;

  const cleaned = String(rawStatus || "").trim();
  return cleaned || "Unknown";
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

function getStatusOrder(status, fallbackIndex) {
  const rawOrder = status?.displayOrder ?? status?.DisplayOrder;
  return Number.isFinite(Number(rawOrder)) ? Number(rawOrder) : fallbackIndex;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isCompletedStatus(status) {
  const normalized = normalizeStatus(status);
  return ["done", "completed", "complete", "closed", "finished", "resolved"].includes(
    normalized
  );
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

function buildDonutStyle(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (!total) {
    return {
      background: "conic-gradient(#e2e8f0 0deg 360deg)",
    };
  }

  let currentAngle = 0;
  const stops = segments.map((segment) => {
    const sliceAngle = (segment.value / total) * 360;
    const start = currentAngle;
    const end = currentAngle + sliceAngle;
    currentAngle = end;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  return {
    background: `conic-gradient(${stops.join(", ")})`,
  };
}

function getPluralLabel(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
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
        name: getStatusName(status),
        order: getStatusOrder(status, index),
      }))
      .filter((status) => status.name)
      .sort((a, b) => a.order - b.order);

    const countByNormalizedStatus = tasks.reduce((accumulator, task) => {
      const taskStatus = getTaskStatus(task);
      const key = normalizeStatus(taskStatus);
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const summarySource =
      orderedStatuses.length > 0
        ? orderedStatuses.map((status) => status.name)
        : Array.from(
            new Set(
              tasks
                .map((task) => getTaskStatus(task))
                .filter(Boolean)
            )
          );

    const taskSummary = summarySource.map((statusName, index) => {
      const value = countByNormalizedStatus[normalizeStatus(statusName)] || 0;

      return {
        key: `${normalizeStatus(statusName) || "unknown"}-${index}`,
        label: statusName,
        value,
        percentage: tasks.length > 0 ? Math.round((value / tasks.length) * 100) : 0,
        color: STATUS_COLORS[index % STATUS_COLORS.length],
      };
    });

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
                  <div className="dashboard-section__donut-wrap">
                    <div
                      className="dashboard-section__donut"
                      style={buildDonutStyle(dashboardData.taskSummary)}
                    >
                      <div className="dashboard-section__donut-center">
                        <strong>{dashboardData.stats.tasks}</strong>
                        <span>Total tasks</span>
                      </div>
                    </div>
                  </div>

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
                            <strong>{item.percentage}%</strong>
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
