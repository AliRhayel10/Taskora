import {
  FiUsers,
  FiClipboard,
  FiClock,
  FiBarChart2,
  FiChevronDown,
} from "react-icons/fi";
import "../../assets/styles/teamleader/team-leader-dashboard-section.css";

const summaryCards = [
  {
    title: "Team Members",
    value: 5,
    icon: <FiUsers />,
  },
  {
    title: "Tasks",
    value: 18,
    icon: <FiClipboard />,
  },
  {
    title: "Total Effort",
    value: "62h",
    icon: <FiClock />,
  },
  {
    title: "Total Weight",
    value: 84,
    icon: <FiBarChart2 />,
  },
];

const workloadRows = [
  {
    employee: "Omar Ahmed",
    tasks: 3,
    effort: "14h",
    weight: 18,
    status: "Moderate",
  },
  {
    employee: "Lina Hassan",
    tasks: 5,
    effort: "22h",
    weight: 28,
    status: "Overloaded",
  },
  {
    employee: "Karim Mostafa",
    tasks: 2,
    effort: "8h",
    weight: 11,
    status: "Available",
  },
  {
    employee: "Sarah Khaili",
    tasks: 4,
    effort: "10h",
    weight: 15,
    status: "Available",
  },
  {
    employee: "Amina Salim",
    tasks: 4,
    effort: "8h",
    weight: 12,
    status: "Available",
  },
];

function getStatusClass(status) {
  const normalized = status.toLowerCase();
  if (normalized === "available") return "teamleader-dashboard-section__status--available";
  if (normalized === "moderate") return "teamleader-dashboard-section__status--moderate";
  return "teamleader-dashboard-section__status--overloaded";
}

export default function TeamLeaderDashboardSection() {
  return (
    <section className="teamleader-dashboard-section">
      <div className="teamleader-dashboard-section__header">
        <div className="teamleader-dashboard-section__title-wrap">
          <h2 className="teamleader-dashboard-section__title">Dashboard</h2>
          <span className="teamleader-dashboard-section__title-line"></span>
        </div>

        <button
          type="button"
          className="teamleader-dashboard-section__range-btn"
        >
          <span>This Week</span>
          <FiChevronDown />
        </button>
      </div>

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
            {workloadRows.map((row) => (
              <tr key={row.employee}>
                <td className="teamleader-dashboard-section__employee-cell">
                  <div className="teamleader-dashboard-section__avatar">
                    {row.employee
                      .split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")}
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}