import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFileText,
  FiMessageCircle,
  FiCheckSquare,
} from "react-icons/fi";
import "../../assets/styles/employee/employee-dashboard-section.css";
import cloudBg from "../../assets/images/cloud.png";

const API_BASE = "http://localhost:5000";

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

  if (normalized === "simple") {
    return "employee-dashboard-section__badge--simple";
  }

  if (normalized === "medium") {
    return "employee-dashboard-section__badge--medium-complexity";
  }

  if (normalized === "complex") {
    return "employee-dashboard-section__badge--complex";
  }

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
  if (status === "acknowledged") return <FiCheckSquare />;
  if (status === "pending") return <FiClock />;
  if (status === "done") return <FiCheckCircle />;
  return <FiFileText />;
}

function getActionLabel(status) {
  if (status === "new") return "Acknowledge";
  if (status === "acknowledged") return "Mark as Pending";
  if (status === "pending") return "Mark as Done";
  return "Completed";
}

function getActionVariant(status) {
  if (status === "new") return "employee-dashboard-section__task-action--primary";
  if (status === "acknowledged") return "employee-dashboard-section__task-action--warning";
  if (status === "pending") return "employee-dashboard-section__task-action--success";
  return "employee-dashboard-section__task-action--muted";
}

function getNextStatus(status) {
  if (status === "new") return "acknowledged";
  if (status === "acknowledged") return "pending";
  if (status === "pending") return "done";
  return "done";
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

export default function EmployeeDashboardSection({ user, searchValue = "" }) {
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      if (!user?.companyId || !user?.userId) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_BASE}/api/tasks/company/${user.companyId}`
        );

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

        if (isMounted) {
          setTasks(onlyLoggedInUserTasks);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load tasks.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [user]);

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

  const handleProgressAction = (taskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.taskId === taskId
          ? { ...task, status: getNextStatus(task.status) }
          : task
      )
    );
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
              👋 Good to see you,{" "}
              <span>{user?.fullName?.split(" ")[0] || "there"}!</span>
            </h3>
            <p className="employee-dashboard-section__hero-count">
              You have <strong>{todayTasksCount}</strong> tasks for today.
            </p>
            <p className="employee-dashboard-section__hero-copy">
              Stay focused and keep up the great work.
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
              <span>Pending Acknowledgements</span>
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
          <button
            key={tab.key}
            type="button"
            className={`employee-dashboard-section__tab ${
              activeTab === tab.key
                ? "employee-dashboard-section__tab--active"
                : ""
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
            <span className="employee-dashboard-section__tab-count">
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="employee-dashboard-section__table-card">
        {isLoading ? (
          <div className="employee-dashboard-section__state-card">
            <div className="employee-dashboard-section__state-icon">
              <FiClock />
            </div>
            <h3>Loading tasks...</h3>
            <p>Please wait while we load your assigned tasks.</p>
          </div>
        ) : errorMessage ? (
          <div className="employee-dashboard-section__state-card employee-dashboard-section__state-card--error">
            <div className="employee-dashboard-section__state-icon employee-dashboard-section__state-icon--error">
              <FiAlertCircle />
            </div>
            <h3>Could not load tasks</h3>
            <p>{errorMessage}</p>
          </div>
        ) : visibleTasks.length === 0 ? (
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
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Priority</th>
                    <th>Complexity</th>
                    <th>Effort (hrs)</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleTasks.map((task, index) => (
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
                        {task.effort}
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
                        <span
                          className={`employee-dashboard-section__due-date ${
                            isDueSoon(task.dueDate) && task.status !== "done"
                              ? "employee-dashboard-section__due-date--soon"
                              : ""
                          }`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </td>

                      <td>
                        <div className="employee-dashboard-section__actions">
                          <button
                            type="button"
                            className="employee-dashboard-section__icon-btn"
                            title="View task"
                          >
                            <FiEye />
                          </button>

                          <button
                            type="button"
                            className={`employee-dashboard-section__task-action ${getActionVariant(
                              task.status
                            )}`}
                            onClick={() => handleProgressAction(task.taskId)}
                            disabled={task.status === "done"}
                          >
                            {getActionLabel(task.status)}
                          </button>

                          <button
                            type="button"
                            className="employee-dashboard-section__task-action employee-dashboard-section__task-action--secondary"
                            title="Request change"
                          >
                            <FiMessageCircle />
                            <span>Request Change</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="employee-dashboard-section__footer">
              Showing 1 to {visibleTasks.length} of {visibleTasks.length} tasks
            </div>
          </>
        )}
      </div>
    </div>
  );
}