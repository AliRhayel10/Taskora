import { useEffect, useMemo, useState } from "react";
import {
  FiUsers,
  FiClipboard,
  FiClock,
  FiBarChart2,
  FiChevronDown,
} from "react-icons/fi";
import "../../assets/styles/teamleader/team-leader-dashboard-section.css";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function doesTaskOverlapRange(task, start, end) {
  const taskStart = task.startDate ? new Date(task.startDate) : null;
  const taskDue = task.dueDate ? new Date(task.dueDate) : null;

  if (!taskStart && !taskDue) return true;
  if (taskStart && taskDue) return taskStart <= end && taskDue >= start;
  if (taskDue) return taskDue >= start && taskDue <= end;
  if (taskStart) return taskStart >= start && taskStart <= end;

  return true;
}

function getStatusClass(status) {
  const normalized = status.toLowerCase();

  if (normalized === "available") {
    return "teamleader-dashboard-section__status--available";
  }

  if (normalized === "moderate") {
    return "teamleader-dashboard-section__status--moderate";
  }

  return "teamleader-dashboard-section__status--overloaded";
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

export default function TeamLeaderDashboardSection({
  user,
  searchValue = "",
}) {
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const { start, end } = useMemo(() => getWeekRange(), []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const companyId = parseInt(user?.companyId, 10);
      const userId = parseInt(user?.userId, 10);

      if (!companyId || !userId) {
        setErrorMessage("Missing user information.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const teamsUrl = `http://localhost:5000/api/Teams/company/${encodeURIComponent(
          companyId
        )}`;
        const membersUrl = `http://localhost:5000/api/Teams/company/${encodeURIComponent(
          companyId
        )}/members`;
        const tasksUrl = `http://localhost:5000/api/tasks/company/${encodeURIComponent(
          companyId
        )}`;

        const [teamsResponse, membersResponse, tasksResponse] =
          await Promise.all([
            fetch(teamsUrl),
            fetch(membersUrl),
            fetch(tasksUrl),
          ]);

        if (!teamsResponse.ok) {
          const rawError = await teamsResponse.text();
          console.error("Teams endpoint raw error:", rawError);
          throw new Error(`Failed to load teams. (${teamsResponse.status})`);
        }

        if (!membersResponse.ok) {
          const rawError = await membersResponse.text();
          console.error("Members endpoint raw error:", rawError);
          throw new Error(`Failed to load members. (${membersResponse.status})`);
        }

        if (!tasksResponse.ok) {
          const rawError = await tasksResponse.text();
          console.error("Tasks endpoint raw error:", rawError);
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

        if (!tasksData || typeof tasksData !== "object" || !tasksData.success) {
          throw new Error(
            tasksData?.message || "Tasks response format is invalid."
          );
        }

        const leaderTeams = teamsData.filter(
          (team) => Number(team.teamLeaderUserId) === userId
        );

        const leaderTeamIds = leaderTeams.map((team) => Number(team.teamId));

        const leaderMemberIds = [
          ...new Set(
            leaderTeams.flatMap((team) =>
              Array.isArray(team.memberIds)
                ? team.memberIds.map((id) => Number(id))
                : []
            )
          ),
        ];

        const filteredMembers = membersData.filter((member) =>
          leaderMemberIds.includes(Number(member.userId))
        );

        const filteredTasks = (tasksData.tasks || []).filter((task) => {
          const belongsToLeaderTeam = leaderTeamIds.includes(Number(task.teamId));
          const isInRange = doesTaskOverlapRange(task, start, end);
          return belongsToLeaderTeam && isInRange;
        });

        setMembers(filteredMembers);
        setTasks(filteredTasks);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setErrorMessage(error.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, start, end]);

  const workloadRows = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    const rows = members.map((member) => {
      const memberTasks = tasks.filter(
        (task) => Number(task.assignedToUserId) === Number(member.userId)
      );

      const totalTasks = memberTasks.length;
      const totalEffort = memberTasks.reduce(
        (sum, task) => sum + Number(task.estimatedEffortHours || 0),
        0
      );
      const totalWeight = memberTasks.reduce(
        (sum, task) => sum + Number(task.weight || 0),
        0
      );

      return {
        userId: member.userId,
        employee: member.fullName,
        tasks: totalTasks,
        effort: `${totalEffort}h`,
        weight: Number(totalWeight.toFixed(2)),
        status: getWorkloadStatus(totalWeight),
      };
    });

    if (!search) return rows;

    return rows.filter((row) =>
      String(row.employee || "").toLowerCase().includes(search)
    );
  }, [members, tasks, searchValue]);

  const summaryCards = useMemo(() => {
    const totalTasks = tasks.length;
    const totalEffort = tasks.reduce(
      (sum, task) => sum + Number(task.estimatedEffortHours || 0),
      0
    );
    const totalWeight = tasks.reduce(
      (sum, task) => sum + Number(task.weight || 0),
      0
    );

    return [
      {
        title: "Team Members",
        value: members.length,
        icon: <FiUsers />,
      },
      {
        title: "Tasks",
        value: totalTasks,
        icon: <FiClipboard />,
      },
      {
        title: "Total Effort",
        value: `${totalEffort}h`,
        icon: <FiClock />,
      },
      {
        title: "Total Weight",
        value: Number(totalWeight.toFixed(2)),
        icon: <FiBarChart2 />,
      },
    ];
  }, [members.length, tasks]);

  return (
    <section className="teamleader-dashboard-section">
      <div className="teamleader-dashboard-section__toolbar">
        <button
          type="button"
          className="teamleader-dashboard-section__range-btn"
        >
          <span>This Week</span>
          <FiChevronDown />
        </button>
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
                <div className="teamleader-dashboard-section__card-icon">
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
            <h3>Team Member Workload</h3>
            <span className="teamleader-dashboard-section__workload-line"></span>
          </div>

          <div className="teamleader-dashboard-section__table-wrap">
            <table className="teamleader-dashboard-section__table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Tasks</th>
                  <th>Effort</th>
                  <th>Weight</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {workloadRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="teamleader-dashboard-section__empty-cell"
                    >
                      No workload data found for this week.
                    </td>
                  </tr>
                ) : (
                  workloadRows.map((row) => (
                    <tr key={row.userId}>
                      <td className="teamleader-dashboard-section__employee-cell">
                        <div className="teamleader-dashboard-section__avatar">
                          {getInitials(row.employee)}
                        </div>
                        <span>{row.employee}</span>
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
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}