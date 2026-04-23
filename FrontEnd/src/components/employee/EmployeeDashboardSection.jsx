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
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEye,
  FiFileText,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "../../assets/styles/employee/employee-dashboard-section.css";
import "../../assets/styles/admin/users-section.css";
import cloudBg from "../../assets/images/cloud.png";

const API_BASE = "http://localhost:5000";
const MIN_TASKS_PER_PAGE = 1;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "pending", label: "Pending" },
  { key: "done", label: "Done" },
];

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function toEmployeeStatus(value) {
  const normalized = normalizeStatus(value);

  if (normalized === "new") return "new";
  if (normalized === "acknowledged") return "acknowledged";
  if (normalized === "pending" || normalized === "inprogress") return "pending";
  if (normalized === "done" || normalized === "completed") return "done";

  return "new";
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
  return "employee-dashboard-section__status--new";
}

function getStatusLabel(status) {
  if (status === "new") return "New";
  if (status === "acknowledged") return "Acknowledged";
  if (status === "pending") return "Pending";
  if (status === "done") return "Done";
  return "New";
}

function getStatusIcon(status) {
  if (status === "new") return <FiFileText />;
  if (status === "acknowledged") return <FiCheckCircle />;
  if (status === "pending") return <FiClock />;
  if (status === "done") return <FiCheckCircle />;
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

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * multiplier;
}

export default function EmployeeDashboardSection({
  user,
  searchValue = "",
}) {
  const navigate = useNavigate();

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

  const tableCardRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);

  const loadTasks = useCallback(async () => {
    if (!user?.companyId || !user?.userId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_BASE}/api/tasks/company/${user.companyId}`);
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
        .filter((task) => Number(task.assignedToUserId) === Number(user.userId))
        .map((task) => ({
          taskId: task.taskId,
          title: task.title || "Untitled Task",
          description: task.description || "",
          priority: task.priority || "-",
          complexity: task.complexity || "-",
          effort: task.effort ?? task.estimatedEffortHours ?? 0,
          dueDate: task.dueDate || task.endDate || task.deadline || "",
          status: toEmployeeStatus(task.status),
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

  const filteredBySearch = useMemo(() => {
    const query = String(searchValue || "").trim().toLowerCase();

    if (!query) return tasks;

    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        String(task.priority).toLowerCase().includes(query) ||
        String(task.complexity).toLowerCase().includes(query) ||
        getStatusLabel(task.status).toLowerCase().includes(query)
      );
    });
  }, [tasks, searchValue]);

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
          return compareValues(Number(a.effort || 0), Number(b.effort || 0), sortConfig.direction);
        case "status":
          return compareValues(getStatusLabel(a.status), getStatusLabel(b.status), sortConfig.direction);
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
      myTasks: tasks.length,
      pendingAcknowledgements: tasks.filter((task) => task.status === "new").length,
      dueSoon: tasks.filter((task) => isDueSoon(task.dueDate) && task.status !== "done").length,
      completed: tasks.filter((task) => task.status === "done").length,
    };
  }, [tasks]);

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
  }, [activeTab, searchValue, sortConfig]);

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
                ? `${todayTasksCount} task${todayTasksCount > 1 ? "s are" : "is"} due today.`
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

          <div className="employee-dashboard-section__summary-card">
            <div className="employee-dashboard-section__summary-icon employee-dashboard-section__summary-icon--amber">
              <FiAlertCircle />
            </div>
            <div>
              <span>Acknowledgements</span>
              <strong>{summaryStats.pendingAcknowledgements}</strong>
              <small>Waiting for your acknowledgement</small>
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
                      key={task.taskId}
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