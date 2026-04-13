import { useMemo } from "react";
import {
  FiUsers,
  FiCheckSquare,
  FiBarChart2,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
} from "react-icons/fi";
import "../assets/styles/teamleader/team-leader-dashboard.css";

const stats = [
  {
    title: "Team Members",
    value: "8",
    subtitle: "Active members",
    icon: <FiUsers />,
  },
  {
    title: "Active Tasks",
    value: "24",
    subtitle: "Across all team members",
    icon: <FiCheckSquare />,
  },
  {
    title: "Total Workload",
    value: "82.5",
    subtitle: "Combined task weight",
    icon: <FiBarChart2 />,
  },
  {
    title: "Pending Requests",
    value: "5",
    subtitle: "Awaiting review",
    icon: <FiClock />,
  },
];

const workloadRows = [
  {
    name: "Omar Hadi",
    tasks: 6,
    effort: 21,
    weight: 28.8,
    status: "Overloaded",
  },
  {
    name: "Lina Farah",
    tasks: 4,
    effort: 14,
    weight: 16.2,
    status: "Moderate",
  },
  {
    name: "Noor Adel",
    tasks: 5,
    effort: 12,
    weight: 13.5,
    status: "Available",
  },
  {
    name: "Jad Makki",
    tasks: 3,
    effort: 10,
    weight: 11.2,
    status: "Available",
  },
];

const recentTasks = [
  {
    title: "Build Login API",
    assignee: "Omar Hadi",
    priority: "High",
    status: "In Progress",
    dueDate: "Apr 18, 2026",
  },
  {
    title: "Write Test Cases",
    assignee: "Lina Farah",
    priority: "Medium",
    status: "New",
    dueDate: "Apr 20, 2026",
  },
  {
    title: "Create Tasks Table",
    assignee: "Omar Hadi",
    priority: "Medium",
    status: "Blocked",
    dueDate: "Apr 19, 2026",
  },
  {
    title: "Change Request Screen",
    assignee: "Noor Adel",
    priority: "High",
    status: "New",
    dueDate: "Apr 22, 2026",
  },
];

const requestItems = [
  {
    employee: "Omar Hadi",
    task: "Build Login API",
    type: "Increase Effort",
    change: "8h → 10h",
    state: "Approved",
  },
  {
    employee: "Omar Hadi",
    task: "Create Tasks Table",
    type: "Change Due Date",
    change: "Mar 29 → Mar 31",
    state: "Pending",
  },
  {
    employee: "Noor Adel",
    task: "Design Dashboard UI",
    type: "Increase Effort",
    change: "12h → 14h",
    state: "Approved",
  },
];

function getStatusClass(status) {
  const value = status.toLowerCase().replace(/\s+/g, "-");
  return `team-leader-dashboard__badge team-leader-dashboard__badge--${value}`;
}

export default function TeamLeaderDashboard() {
  const overloadedCount = useMemo(
    () => workloadRows.filter((member) => member.status === "Overloaded").length,
    []
  );

  return (
    <div className="team-leader-dashboard">
      <section className="team-leader-dashboard__hero">
        <div>
          <p className="team-leader-dashboard__eyebrow">Overview</p>
          <h1 className="team-leader-dashboard__title">Team Leader Dashboard</h1>
          <p className="team-leader-dashboard__description">
            Monitor team workload, track task progress, and review change
            requests from one place.
          </p>
        </div>

        <div className="team-leader-dashboard__hero-highlight">
          <div className="team-leader-dashboard__hero-icon">
            <FiTrendingUp />
          </div>
          <div>
            <strong>{overloadedCount} overloaded member(s)</strong>
            <span>Review workload balance for this week.</span>
          </div>
        </div>
      </section>

      <section className="team-leader-dashboard__stats">
        {stats.map((item) => (
          <article key={item.title} className="team-leader-dashboard__stat-card">
            <div className="team-leader-dashboard__stat-icon">{item.icon}</div>
            <div>
              <p className="team-leader-dashboard__stat-title">{item.title}</p>
              <h3 className="team-leader-dashboard__stat-value">{item.value}</h3>
              <span className="team-leader-dashboard__stat-subtitle">
                {item.subtitle}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="team-leader-dashboard__grid">
        <article className="team-leader-dashboard__panel team-leader-dashboard__panel--wide">
          <div className="team-leader-dashboard__panel-head">
            <div>
              <h2>Workload Overview</h2>
              <p>Current task count, effort, and weight per team member</p>
            </div>
            <span className="team-leader-dashboard__panel-tag">This Week</span>
          </div>

          <div className="team-leader-dashboard__table-wrap">
            <table className="team-leader-dashboard__table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Tasks</th>
                  <th>Effort</th>
                  <th>Weight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workloadRows.map((member) => (
                  <tr key={member.name}>
                    <td>{member.name}</td>
                    <td>{member.tasks}</td>
                    <td>{member.effort}h</td>
                    <td>{member.weight}</td>
                    <td>
                      <span className={getStatusClass(member.status)}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="team-leader-dashboard__panel">
          <div className="team-leader-dashboard__panel-head">
            <div>
              <h2>Alerts</h2>
              <p>Items that need quick attention</p>
            </div>
            <FiAlertCircle className="team-leader-dashboard__panel-head-icon" />
          </div>

          <div className="team-leader-dashboard__alert-list">
            <div className="team-leader-dashboard__alert-item">
              <strong>Omar Hadi is overloaded</strong>
              <span>Total weight has reached 28.8 this week.</span>
            </div>
            <div className="team-leader-dashboard__alert-item">
              <strong>5 pending change requests</strong>
              <span>Review employee requests awaiting approval.</span>
            </div>
            <div className="team-leader-dashboard__alert-item">
              <strong>1 blocked task</strong>
              <span>Create Tasks Table is currently blocked.</span>
            </div>
          </div>
        </article>

        <article className="team-leader-dashboard__panel">
          <div className="team-leader-dashboard__panel-head">
            <div>
              <h2>Recent Tasks</h2>
              <p>Latest team task activity</p>
            </div>
          </div>

          <div className="team-leader-dashboard__list">
            {recentTasks.map((task) => (
              <div
                key={`${task.title}-${task.assignee}`}
                className="team-leader-dashboard__list-item"
              >
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.assignee}</span>
                </div>
                <div className="team-leader-dashboard__list-meta">
                  <span>{task.priority}</span>
                  <span>{task.status}</span>
                  <span>{task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="team-leader-dashboard__panel">
          <div className="team-leader-dashboard__panel-head">
            <div>
              <h2>Change Requests</h2>
              <p>Latest submitted employee requests</p>
            </div>
          </div>

          <div className="team-leader-dashboard__request-list">
            {requestItems.map((request, index) => (
              <div
                key={`${request.task}-${index}`}
                className="team-leader-dashboard__request-item"
              >
                <div>
                  <strong>{request.type}</strong>
                  <span>
                    {request.employee} • {request.task}
                  </span>
                </div>
                <div className="team-leader-dashboard__request-meta">
                  <span>{request.change}</span>
                  <span className={getStatusClass(request.state)}>
                    {request.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}