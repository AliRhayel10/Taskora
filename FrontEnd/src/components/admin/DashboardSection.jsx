import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiLayers,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import "../../assets/styles/admin/dashboard-section.css";

const API_BASE_URL = "http://localhost:5000";

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

function getUserName(user) {
  const fullName =
    user?.fullName ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return fullName?.trim() || user?.email || "Unnamed user";
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getUserStatus(user) {
  if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Inactive";
  if (typeof user?.IsActive === "boolean") return user.IsActive ? "Active" : "Inactive";
  if (typeof user?.active === "boolean") return user.active ? "Active" : "Inactive";

  const rawStatus = String(user?.status || "").trim().toLowerCase();
  if (!rawStatus) return "Active";
  return rawStatus === "active" ? "Active" : "Inactive";
}

function getTeamName(team) {
  return team?.teamName || team?.name || "Unnamed team";
}

function getTeamId(team) {
  return team?.teamId || team?.TeamId || team?.id || null;
}

function getTeamMembersCount(team) {
  if (typeof team?.memberCount === "number") return team.memberCount;
  if (Array.isArray(team?.memberIds)) return team.memberIds.length;
  return 0;
}

function getTeamLeaderName(team) {
  return (
    team?.teamLeaderName ||
    team?.leaderName ||
    team?.teamLeader?.fullName ||
    "No leader assigned"
  );
}

function getTaskStatus(task) {
  return task?.taskStatusName || task?.taskStatus || task?.status || "Unknown";
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
  return ["done", "completed", "complete", "closed", "finished"].includes(normalized);
}

function isInProgressStatus(status) {
  const normalized = normalizeStatus(status);
  return ["in progress", "progress", "ongoing", "active", "working on it"].includes(normalized);
}

function isTodoStatus(status) {
  const normalized = normalizeStatus(status);
  return ["todo", "to do", "pending", "open", "backlog", "new", "not started"].includes(normalized);
}

function getTaskPriority(task) {
  return String(task?.priority || "Normal");
}

function getPriorityWeight(priority) {
  const normalized = String(priority || "").trim().toLowerCase();
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  return 1;
}

function getTaskDate(task) {
  const raw = task?.dueDate || task?.DueDate || task?.startDate || task?.StartDate;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(dateValue) {
  if (!dateValue) return "No date";
  return dateValue.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getTaskId(task, index) {
  return task?.taskId || task?.id || `task-${index}`;
}

function getTaskTeamId(task) {
  return task?.teamId || task?.TeamId || task?.team?.teamId || null;
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

export default function DashboardSection({ searchValue = "" }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
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

        const [usersResult, teamsResult, tasksResult] = await Promise.all([
          fetchFirstSuccessful([
            `${API_BASE_URL}/api/teams/company/${encodeURIComponent(companyId)}/members`,
            `${API_BASE_URL}/api/auth/company-users/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
            `${API_BASE_URL}/api/users/company/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
            `${API_BASE_URL}/api/user/company/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
            `${API_BASE_URL}/api/employees/company/${encodeURIComponent(companyId)}?${usersParams.toString()}`,
          ]),
          fetchFirstSuccessful([
            `${API_BASE_URL}/api/teams/company/${encodeURIComponent(companyId)}`,
          ]),
          fetchFirstSuccessful([
            `${API_BASE_URL}/api/tasks/company/${encodeURIComponent(companyId)}`,
          ]),
        ]);

        setUsers(normalizeUsersResponse(usersResult.data));
        setTeams(normalizeTeamsResponse(teamsResult.data));
        setTasks(normalizeTasksResponse(tasksResult.data));
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        setUsers([]);
        setTeams([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [companyId]);

  const dashboardData = useMemo(() => {
    const activeUsers = users.filter((user) => getUserStatus(user) === "Active");
    const completedTasks = tasks.filter((task) => isCompletedStatus(getTaskStatus(task)));
    const inProgressTasks = tasks.filter((task) => isInProgressStatus(getTaskStatus(task)));
    const todoTasks = tasks.filter((task) => isTodoStatus(getTaskStatus(task)));
    const overdueTasks = tasks.filter((task) => {
      const dueDate = getTaskDate(task);
      return dueDate && dueDate < new Date() && !isCompletedStatus(getTaskStatus(task));
    });

    const completionRate =
      tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

    const teamLoad = teams
      .map((team) => {
        const teamId = getTeamId(team);
        const teamTasks = tasks.filter(
          (task) => String(getTaskTeamId(task)) === String(teamId)
        );

        const workloadScore = teamTasks.reduce(
          (sum, task) => sum + getPriorityWeight(getTaskPriority(task)),
          0
        );

        return {
          id: teamId || getTeamName(team),
          name: getTeamName(team),
          leaderName: getTeamLeaderName(team),
          membersCount: getTeamMembersCount(team),
          tasksCount: teamTasks.length,
          completionRate:
            teamTasks.length > 0
              ? Math.round(
                  (teamTasks.filter((task) => isCompletedStatus(getTaskStatus(task))).length /
                    teamTasks.length) *
                    100
                )
              : 0,
          workloadScore,
        };
      })
      .sort((a, b) => b.workloadScore - a.workloadScore)
      .slice(0, 4);

    const recentTasks = [...tasks]
      .sort((a, b) => {
        const aDate = getTaskDate(a);
        const bDate = getTaskDate(b);
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      })
      .slice(0, 6)
      .map((task, index) => {
        const taskTeam = teams.find(
          (team) => String(getTeamId(team)) === String(getTaskTeamId(task))
        );

        return {
          id: getTaskId(task, index),
          title: task?.title || "Untitled task",
          status: getTaskStatus(task),
          date: getTaskDate(task),
          teamName: taskTeam ? getTeamName(taskTeam) : "Unassigned team",
        };
      });

    const visibleUsers = users.slice(0, 5).map((user, index) => ({
      id: user?.userId || user?.UserId || user?.id || `user-${index}`,
      name: getUserName(user),
      role: user?.role || "Employee",
      status: getUserStatus(user),
    }));

    const hasAnyData = users.length > 0 || teams.length > 0 || tasks.length > 0;

    const searchMatches =
      !normalizedSearch ||
      [
        ...teamLoad.map((team) => `${team.name} ${team.leaderName}`),
        ...recentTasks.map((task) => `${task.title} ${task.status} ${task.teamName}`),
        ...visibleUsers.map((user) => `${user.name} ${user.role}`),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

    return {
      hasAnyData,
      searchMatches,
      stats: {
        users: users.length,
        activeUsers: activeUsers.length,
        teams: teams.length,
        tasks: tasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        todoTasks: todoTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate,
      },
      teamLoad: normalizedSearch
        ? teamLoad.filter((team) =>
            `${team.name} ${team.leaderName}`.toLowerCase().includes(normalizedSearch)
          )
        : teamLoad,
      recentTasks: normalizedSearch
        ? recentTasks.filter((task) =>
            `${task.title} ${task.status} ${task.teamName}`.toLowerCase().includes(normalizedSearch)
          )
        : recentTasks,
      visibleUsers: normalizedSearch
        ? visibleUsers.filter((user) =>
            `${user.name} ${user.role}`.toLowerCase().includes(normalizedSearch)
          )
        : visibleUsers,
    };
  }, [users, teams, tasks, normalizedSearch]);

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
      key: "overdue",
      label: "Overdue",
      value: dashboardData.stats.overdueTasks,
      meta: `${dashboardData.stats.inProgressTasks} in progress`,
      icon: <FiAlertCircle />,
      tone: "red",
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
              <FiBarChart2 />
            </div>
            <h3>Loading dashboard...</h3>
            <p>Please wait while we fetch your workspace overview.</p>
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
            <p>Try a different search term to find teams, users, or recent tasks.</p>
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
              <article className="dashboard-section__panel">
                <div className="dashboard-section__panel-header">
                  <div>
                    <h3>Workspace health</h3>
                    <p>Quick view of progress and delivery pressure</p>
                  </div>
                  <span className="dashboard-section__panel-pill">
                    <FiTrendingUp />
                    Overview
                  </span>
                </div>

                <div className="dashboard-section__progress-list">
                  <div className="dashboard-section__progress-item">
                    <div className="dashboard-section__progress-copy">
                      <span>Completion</span>
                      <strong>{dashboardData.stats.completionRate}%</strong>
                    </div>
                    <div className="dashboard-section__progress-track">
                      <div
                        className="dashboard-section__progress-bar dashboard-section__progress-bar--blue"
                        style={{ width: `${dashboardData.stats.completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="dashboard-section__progress-item">
                    <div className="dashboard-section__progress-copy">
                      <span>To do</span>
                      <strong>{dashboardData.stats.todoTasks}</strong>
                    </div>
                    <div className="dashboard-section__progress-track">
                      <div
                        className="dashboard-section__progress-bar dashboard-section__progress-bar--slate"
                        style={{
                          width: `${
                            dashboardData.stats.tasks > 0
                              ? Math.round(
                                  (dashboardData.stats.todoTasks / dashboardData.stats.tasks) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="dashboard-section__progress-item">
                    <div className="dashboard-section__progress-copy">
                      <span>Overdue</span>
                      <strong>{dashboardData.stats.overdueTasks}</strong>
                    </div>
                    <div className="dashboard-section__progress-track">
                      <div
                        className="dashboard-section__progress-bar dashboard-section__progress-bar--red"
                        style={{
                          width: `${
                            dashboardData.stats.tasks > 0
                              ? Math.round(
                                  (dashboardData.stats.overdueTasks / dashboardData.stats.tasks) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="dashboard-section__chip-row">
                  <span className="dashboard-section__chip">
                    <FiCheckCircle />
                    {dashboardData.stats.completedTasks} completed
                  </span>
                  <span className="dashboard-section__chip">
                    <FiClock />
                    {dashboardData.stats.inProgressTasks} in progress
                  </span>
                  <span className="dashboard-section__chip">
                    <FiUsers />
                    {dashboardData.stats.activeUsers} active users
                  </span>
                </div>
              </article>

              <article className="dashboard-section__panel">
                <div className="dashboard-section__panel-header">
                  <div>
                    <h3>Top team workload</h3>
                    <p>Teams with the highest active load</p>
                  </div>
                  <span className="dashboard-section__panel-pill">
                    <FiBriefcase />
                    Teams
                  </span>
                </div>

                {dashboardData.teamLoad.length === 0 ? (
                  <div className="dashboard-section__empty">
                    <FiLayers />
                    <span>No teams to show yet.</span>
                  </div>
                ) : (
                  <div className="dashboard-section__list">
                    {dashboardData.teamLoad.map((team) => (
                      <div key={team.id} className="dashboard-section__list-item">
                        <div className="dashboard-section__list-main">
                          <div className="dashboard-section__list-copy">
                            <strong>{team.name}</strong>
                            <small>{team.leaderName}</small>
                          </div>
                          <span className="dashboard-section__score-pill">
                            {team.workloadScore} pts
                          </span>
                        </div>

                        <div className="dashboard-section__meta-row">
                          <span>{team.membersCount} members</span>
                          <span>{team.tasksCount} tasks</span>
                          <span>{team.completionRate}% complete</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>

            <div className="dashboard-section__content-grid">
              <article className="dashboard-section__panel">
                <div className="dashboard-section__panel-header">
                  <div>
                    <h3>Recent tasks</h3>
                    <p>Latest tasks across the workspace</p>
                  </div>
                </div>

                {dashboardData.recentTasks.length === 0 ? (
                  <div className="dashboard-section__empty">
                    <FiCheckSquare />
                    <span>No tasks to show yet.</span>
                  </div>
                ) : (
                  <div className="dashboard-section__list">
                    {dashboardData.recentTasks.map((task) => (
                      <div key={task.id} className="dashboard-section__task-item">
                        <div className="dashboard-section__task-copy">
                          <strong>{task.title}</strong>
                          <small>{task.teamName}</small>
                        </div>

                        <div className="dashboard-section__task-side">
                          <span className="dashboard-section__status-pill">
                            {task.status}
                          </span>
                          <span className="dashboard-section__task-date">
                            {formatShortDate(task.date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="dashboard-section__panel">
                <div className="dashboard-section__panel-header">
                  <div>
                    <h3>People snapshot</h3>
                    <p>Quick look at current workspace users</p>
                  </div>
                </div>

                {dashboardData.visibleUsers.length === 0 ? (
                  <div className="dashboard-section__empty">
                    <FiUsers />
                    <span>No users to show yet.</span>
                  </div>
                ) : (
                  <div className="dashboard-section__people-grid">
                    {dashboardData.visibleUsers.map((user) => (
                      <div key={user.id} className="dashboard-section__person-card">
                        <div className="dashboard-section__person-avatar">
                          {getInitials(user.name)}
                        </div>

                        <div className="dashboard-section__person-copy">
                          <strong>{user.name}</strong>
                          <small>{user.role}</small>
                        </div>

                        <span
                          className={`dashboard-section__person-status dashboard-section__person-status--${user.status.toLowerCase()}`}
                        >
                          {user.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  );
}