import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiUsers,
  FiClipboard,
  FiClock,
  FiBarChart2,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import "../../assets/styles/teamleader/team-leader-dashboard-section.css";

const PAGE_SIZE = 6;

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function getPresetRange(preset, customRange) {
  switch (preset) {
    case "today":
      return getTodayRange();
    case "nextWeek":
      return getWeekRange(1);
    case "custom": {
      const start = parseInputDate(customRange.startDate);
      const end = parseInputDate(customRange.endDate, true);

      if (start && end && start <= end) {
        return { start, end };
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
    case "nextWeek":
      return "Next Week";
    case "custom":
      return "Custom Range";
    case "thisWeek":
    default:
      return "This Week";
  }
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

export default function TeamLeaderDashboardSection({
  user,
  searchValue = "",
}) {
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedPreset, setSelectedPreset] = useState("thisWeek");
  const [customRange, setCustomRange] = useState(() => {
    const currentWeek = getWeekRange(0);
    return {
      startDate: formatInputDate(currentWeek.start),
      endDate: formatInputDate(currentWeek.end),
    };
  });
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);

  const rangeMenuRef = useRef(null);

  useEffect(() => {
    if (!isRangeMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        rangeMenuRef.current &&
        !rangeMenuRef.current.contains(event.target)
      ) {
        setIsRangeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isRangeMenuOpen]);

  const activeRange = useMemo(
    () => getPresetRange(selectedPreset, customRange),
    [selectedPreset, customRange]
  );

  const rangeLabel = useMemo(
    () => getRangeLabel(selectedPreset),
    [selectedPreset]
  );

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

        const filteredMembers = membersData.filter((member) => {
          const memberId = Number(member.userId);
          const role = normalizeRole(member.role);
          const isEmployee = role === "employee";

          return leaderMemberIds.includes(memberId) && isEmployee;
        });

        const filteredTasks = (tasksData.tasks || []).filter((task) => {
          const belongsToLeaderTeam = leaderTeamIds.includes(Number(task.teamId));
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
        setErrorMessage(error.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, activeRange.start, activeRange.end]);

  const workloadRows = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    const rows = members
      .map((member) => {
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
          email: member.email || "",
          tasks: totalTasks,
          effort: `${totalEffort}h`,
          weight: Number(totalWeight.toFixed(2)),
          status: getWorkloadStatus(totalWeight),
          profileImageUrl: member.profileImageUrl || "",
        };
      })
      .sort((a, b) => a.employee.localeCompare(b.employee));

    if (!search) return rows;

    return rows.filter(
      (row) =>
        String(row.employee || "").toLowerCase().includes(search) ||
        String(row.email || "").toLowerCase().includes(search)
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

  const totalPages = Math.max(1, Math.ceil(workloadRows.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, members.length, tasks.length, selectedPreset, customRange]);

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
    setSelectedPreset(preset);
    setIsRangeMenuOpen(false);
  };

  const handleCustomDateChange = (field, value) => {
    setCustomRange((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSelectedPreset("custom");
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
            onClick={() => setIsRangeMenuOpen((prev) => !prev)}
          >
            <span>{rangeLabel}</span>
            <FiChevronDown />
          </button>

          {isRangeMenuOpen && (
            <div className="teamleader-dashboard-section__range-dropdown">
              <button
                type="button"
                className={`teamleader-dashboard-section__range-option ${
                  selectedPreset === "today"
                    ? "teamleader-dashboard-section__range-option--active"
                    : ""
                }`}
                onClick={() => handleSelectPreset("today")}
              >
                Today
              </button>

              <button
                type="button"
                className={`teamleader-dashboard-section__range-option ${
                  selectedPreset === "thisWeek"
                    ? "teamleader-dashboard-section__range-option--active"
                    : ""
                }`}
                onClick={() => handleSelectPreset("thisWeek")}
              >
                This Week
              </button>

              <button
                type="button"
                className={`teamleader-dashboard-section__range-option ${
                  selectedPreset === "nextWeek"
                    ? "teamleader-dashboard-section__range-option--active"
                    : ""
                }`}
                onClick={() => handleSelectPreset("nextWeek")}
              >
                Next Week
              </button>

              <div className="teamleader-dashboard-section__range-divider"></div>

              <div className="teamleader-dashboard-section__custom-range">
                <label>
                  <span>Start</span>
                  <input
                    type="date"
                    value={customRange.startDate}
                    onChange={(event) =>
                      handleCustomDateChange("startDate", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>End</span>
                  <input
                    type="date"
                    value={customRange.endDate}
                    onChange={(event) =>
                      handleCustomDateChange("endDate", event.target.value)
                    }
                  />
                </label>
              </div>
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

          <div className="teamleader-dashboard-section__table-card">
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
                                  src={
                                    row.profileImageUrl.startsWith("http")
                                      ? row.profileImageUrl
                                      : `http://localhost:5000${row.profileImageUrl}`
                                  }
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