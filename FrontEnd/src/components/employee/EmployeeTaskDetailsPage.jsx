import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiFlag,
  FiLayers,
  FiMessageCircle,
  FiMessageSquare,
  FiSend,
  FiTarget,
  FiUser,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import "../../assets/styles/employee/employee-task-details-page.css";

const API_BASE = "http://localhost:5000";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function mapStatusLabel(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "new") return "New";
  if (normalized === "acknowledged") return "Acknowledged";
  if (normalized === "pending") return "Pending";
  if (normalized === "done" || normalized === "completed") return "Done";

  return status || "New";
}

function getNextStatus(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "new") return "Acknowledged";
  if (normalized === "acknowledged") return "Pending";
  if (normalized === "pending") return "Done";

  return "Done";
}

function getStatusActionLabel(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "new") return "Acknowledge";
  if (normalized === "acknowledged") return "Mark as Pending";
  if (normalized === "pending") return "Mark as Done";

  return "Completed";
}

function getPriorityClass(value) {
  const normalized = normalizeStatus(value);

  if (normalized === "low") return "employee-task-details-page__value--low";
  if (normalized === "medium") return "employee-task-details-page__value--medium-priority";
  if (normalized === "high") return "employee-task-details-page__value--high";
  if (normalized === "critical") return "employee-task-details-page__value--critical";

  return "employee-task-details-page__value--default";
}

function getComplexityClass(value) {
  const normalized = normalizeStatus(value);

  if (normalized === "simple") return "employee-task-details-page__value--simple";
  if (normalized === "medium") return "employee-task-details-page__value--medium-complexity";
  if (normalized === "complex") return "employee-task-details-page__value--complex";

  return "employee-task-details-page__value--default";
}

function getStatusClass(value) {
  const normalized = normalizeStatus(value);

  if (normalized === "new") return "employee-task-details-page__value--new";
  if (normalized === "acknowledged") return "employee-task-details-page__value--acknowledged";
  if (normalized === "pending") return "employee-task-details-page__value--pending";
  if (normalized === "done" || normalized === "completed") {
    return "employee-task-details-page__value--done";
  }

  return "employee-task-details-page__value--default";
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No updates yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsFromName(name) {
  const clean = String(name || "").trim();
  if (!clean) return "NA";

  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getStoredEmployee() {
  try {
    const authUser = localStorage.getItem("authUser");
    const user = localStorage.getItem("user");
    return authUser ? JSON.parse(authUser) : user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export default function EmployeeTaskDetailsPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [requestChangeText, setRequestChangeText] = useState("");
  const [showRequestMenu, setShowRequestMenu] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTask() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        let rawTask = null;

        const directResponse = await fetch(`${API_BASE}/api/tasks/${taskId}`);
        const directText = await directResponse.text();
        let directData = {};

        try {
          directData = directText ? JSON.parse(directText) : {};
        } catch {
          directData = {};
        }

        if (directResponse.ok && directData.success !== false) {
          rawTask = directData.task || directData.data || directData;
        }

        if (!rawTask) {
          const storedUser = getStoredEmployee();

          if (!storedUser?.companyId) {
            throw new Error("Failed to load task details.");
          }

          const companyResponse = await fetch(
            `${API_BASE}/api/tasks/company/${storedUser.companyId}`
          );
          const companyText = await companyResponse.text();
          let companyData = {};

          try {
            companyData = companyText ? JSON.parse(companyText) : {};
          } catch {
            companyData = {};
          }

          if (!companyResponse.ok || companyData.success === false) {
            throw new Error(companyData.message || "Failed to load task details.");
          }

          const taskList = Array.isArray(companyData.tasks)
            ? companyData.tasks
            : Array.isArray(companyData.data)
              ? companyData.data
              : Array.isArray(companyData)
                ? companyData
                : [];

          rawTask =
            taskList.find((item) => String(item.taskId) === String(taskId)) || null;
        }

        if (!rawTask) {
          throw new Error("Failed to load task details.");
        }

        const mappedTask = {
          taskId: rawTask.taskId,
          title: rawTask.title || "Untitled Task",
          description: rawTask.description || "",
          priority: rawTask.priority || "-",
          complexity: rawTask.complexity || "-",
          effort:
            rawTask.effort ??
            rawTask.estimatedEffortHours ??
            rawTask.estimatedEffort ??
            0,
          weight: rawTask.weight ?? rawTask.taskWeight ?? 0,
          dueDate: rawTask.dueDate || rawTask.endDate || rawTask.deadline || "",
          startDate: rawTask.startDate || rawTask.createdAt || "",
          status: rawTask.status || "New",
          assignedToName:
            rawTask.assignedToName ||
            rawTask.assignedUserName ||
            rawTask.employeeName ||
            "Assigned user",
          assignedToEmail:
            rawTask.assignedToEmail ||
            rawTask.assignedUserEmail ||
            rawTask.employeeEmail ||
            "",
          feedback: Array.isArray(rawTask.feedback) ? rawTask.feedback : [],
          requestChanges: Array.isArray(rawTask.requestChanges)
            ? rawTask.requestChanges
            : [],
          updatedAt: rawTask.updatedAt || rawTask.lastUpdated || rawTask.createdAt || "",
        };

        if (isMounted) {
          setTask(mappedTask);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load task details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTask();

    return () => {
      isMounted = false;
    };
  }, [taskId]);

  const timelineItems = useMemo(() => {
    if (!task) return [];

    const statusEvents = [
      {
        id: `status-${task.taskId}`,
        type: "status",
        title: `Task status is ${mapStatusLabel(task.status)}`,
        createdAt: task.updatedAt || task.startDate,
      },
    ];

    const feedbackEvents = (task.feedback || []).map((item, index) => ({
      id: `feedback-${index}`,
      type: "feedback",
      title: item.message || item.text || "Feedback added",
      createdAt: item.createdAt || item.date || "",
    }));

    const requestEvents = (task.requestChanges || []).map((item, index) => ({
      id: `request-${index}`,
      type: "request",
      title: item.message || item.text || "Change requested",
      createdAt: item.createdAt || item.date || "",
    }));

    return [...feedbackEvents, ...requestEvents, ...statusEvents].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [task]);

  const latestUpdateText = useMemo(() => {
    if (!task) return "No updates yet";

    const dates = [
      task.updatedAt,
      ...(task.feedback || []).map((item) => item.createdAt || item.date),
      ...(task.requestChanges || []).map((item) => item.createdAt || item.date),
    ].filter(Boolean);

    if (dates.length === 0) return "No updates yet";

    const latest = dates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )[0];

    return formatDateTime(latest);
  }, [task]);

  async function handleStatusUpdate() {
    if (!task) return;

    const nextStatus = getNextStatus(task.status);
    const previousStatus = task.status;
    const nextUpdatedAt = new Date().toISOString();

    try {
      setIsUpdatingStatus(true);
      setErrorMessage("");

      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
              updatedAt: nextUpdatedAt,
            }
          : prev
      );

      const response = await fetch(`${API_BASE}/api/tasks/${task.taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to update task status.");
      }
    } catch (error) {
      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: previousStatus,
            }
          : prev
      );
      setErrorMessage(error.message || "Failed to update task status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleSubmitFeedback(event) {
    event.preventDefault();
    if (!task || !feedbackText.trim()) return;

    const newItem = {
      message: feedbackText.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextFeedback = [newItem, ...(task.feedback || [])];

    try {
      setIsSubmittingFeedback(true);
      setErrorMessage("");

      setTask((prev) =>
        prev
          ? {
              ...prev,
              feedback: nextFeedback,
              updatedAt: newItem.createdAt,
            }
          : prev
      );

      const response = await fetch(`${API_BASE}/api/tasks/${task.taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback: nextFeedback,
        }),
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to submit feedback.");
      }

      setFeedbackText("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  async function handleRequestChange() {
    if (!task || !requestChangeText.trim()) return;

    const newItem = {
      message: requestChangeText.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextRequests = [newItem, ...(task.requestChanges || [])];

    try {
      setIsSubmittingRequest(true);
      setErrorMessage("");

      setTask((prev) =>
        prev
          ? {
              ...prev,
              requestChanges: nextRequests,
              updatedAt: newItem.createdAt,
            }
          : prev
      );

      const response = await fetch(`${API_BASE}/api/tasks/${task.taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestChanges: nextRequests,
        }),
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to request change.");
      }

      setRequestChangeText("");
      setShowRequestMenu(false);
    } catch (error) {
      setErrorMessage(error.message || "Failed to request change.");
    } finally {
      setIsSubmittingRequest(false);
    }
  }

  if (isLoading) {
    return (
      <div className="employee-task-details-page">
        <div className="employee-task-details-page__title-row">
          <button
            type="button"
            className="employee-task-details-page__back-btn"
            onClick={() => navigate("/employee")}
          >
            ←
          </button>
          <h2>Task Details</h2>
          <div className="employee-task-details-page__title-line" />
        </div>

        <div className="employee-task-details-page__empty-state-card">
          Loading task details...
        </div>
      </div>
    );
  }

  if (errorMessage && !task) {
    return (
      <div className="employee-task-details-page">
        <div className="employee-task-details-page__title-row">
          <button
            type="button"
            className="employee-task-details-page__back-btn"
            onClick={() => navigate("/employee")}
          >
            ←
          </button>
          <h2>Task Details</h2>
          <div className="employee-task-details-page__title-line" />
        </div>

        <div className="employee-task-details-page__empty-state-card">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="employee-task-details-page">
      <div className="employee-task-details-page__title-row">
        <button
          type="button"
          className="employee-task-details-page__back-btn"
          onClick={() => navigate("/employee")}
        >
          ←
        </button>
        <h2>Task Details</h2>
        <div className="employee-task-details-page__title-line" />
      </div>

      {errorMessage ? (
        <div className="employee-task-details-page__top-error">{errorMessage}</div>
      ) : null}

      <div className="employee-task-details-page__toolbar">
        <button
          type="button"
          className="employee-task-details-page__status-btn"
          onClick={handleStatusUpdate}
          disabled={isUpdatingStatus || normalizeStatus(task.status) === "done"}
        >
          <FiCheckCircle />
          <span>
            {isUpdatingStatus ? "Updating..." : getStatusActionLabel(task.status)}
          </span>
        </button>

        <div className="employee-task-details-page__request-wrap">
          <button
            type="button"
            className="employee-task-details-page__request-btn"
            onClick={() => setShowRequestMenu((prev) => !prev)}
          >
            <FiMessageCircle />
            <span>Request Change</span>
            <FiChevronDown />
          </button>

          {showRequestMenu ? (
            <div className="employee-task-details-page__request-dropdown">
              <textarea
                value={requestChangeText}
                onChange={(event) =>
                  setRequestChangeText(event.target.value.slice(0, 300))
                }
                placeholder="Write the requested change..."
              />
              <button
                type="button"
                className="employee-task-details-page__request-submit"
                onClick={handleRequestChange}
                disabled={isSubmittingRequest || !requestChangeText.trim()}
              >
                {isSubmittingRequest ? "Sending..." : "Send Request"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="employee-task-details-page__content-grid">
        <div className="employee-task-details-page__single-card">
          <div className="employee-task-details-page__top-block">
            <h3>{task.title}</h3>
            <p>{task.description || "No description available."}</p>
          </div>

          <div className="employee-task-details-page__divider" />

          <div className="employee-task-details-page__assigned-section">
            <h4>Assigned To</h4>

            <div className="employee-task-details-page__assignee-row">
              <div className="employee-task-details-page__assignee-avatar">
                {initialsFromName(task.assignedToName)}
              </div>

              <div className="employee-task-details-page__assignee-copy">
                <strong>{task.assignedToName}</strong>
                <small>{task.assignedToEmail || "No email available"}</small>
              </div>
            </div>
          </div>

          <div className="employee-task-details-page__divider" />

          <div className="employee-task-details-page__details-grid">
            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiFlag />
                <span>Priority</span>
              </div>
              <strong className={getPriorityClass(task.priority)}>{task.priority}</strong>
            </div>

            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiLayers />
                <span>Complexity</span>
              </div>
              <strong className={getComplexityClass(task.complexity)}>
                {task.complexity}
              </strong>
            </div>

            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiClock />
                <span>Estimated Effort</span>
              </div>
              <strong>{task.effort} h</strong>
            </div>

            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiTarget />
                <span>Weight</span>
              </div>
              <strong>{Number(task.weight || 0).toFixed(2)}</strong>
            </div>

            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiCalendar />
                <span>Due Date</span>
              </div>
              <strong>{formatDate(task.dueDate)}</strong>
            </div>

            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiCalendar />
                <span>Start Date</span>
              </div>
              <strong>{formatDate(task.startDate)}</strong>
            </div>

            <div className="employee-task-details-page__detail-item">
              <div className="employee-task-details-page__label-row">
                <FiUser />
                <span>Status</span>
              </div>
              <strong className={getStatusClass(task.status)}>
                {mapStatusLabel(task.status)}
              </strong>
            </div>
          </div>
        </div>

        <div className="employee-task-details-page__right-column">
          <div className="employee-task-details-page__top-panels">
            <div className="employee-task-details-page__timeline-card">
              <div className="employee-task-details-page__section-header">
                <div className="employee-task-details-page__section-title-wrap">
                  <div className="employee-task-details-page__section-icon">
                    <FiClock />
                  </div>
                  <h3>Activity Timeline</h3>
                </div>
              </div>

              <div className="employee-task-details-page__card-scroll-area">
                {timelineItems.length === 0 ? (
                  <div className="employee-task-details-page__empty-state">
                    No activity has been recorded yet.
                  </div>
                ) : (
                  <div className="employee-task-details-page__timeline-list">
                    {timelineItems.map((item) => (
                      <div
                        key={item.id}
                        className="employee-task-details-page__timeline-item"
                      >
                        <div
                          className={`employee-task-details-page__timeline-marker ${
                            item.type === "feedback"
                              ? "employee-task-details-page__timeline-marker--feedback"
                              : "employee-task-details-page__timeline-marker--status"
                          }`}
                        />

                        <div className="employee-task-details-page__timeline-content">
                          <div className="employee-task-details-page__timeline-heading">
                            {item.title}
                          </div>
                          <div className="employee-task-details-page__timeline-meta">
                            {formatDateTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="employee-task-details-page__history-card">
              <div className="employee-task-details-page__section-header employee-task-details-page__section-header--feedback">
                <div className="employee-task-details-page__section-title-wrap">
                  <div className="employee-task-details-page__section-icon">
                    <FiMessageSquare />
                  </div>
                  <h3>Feedback Summary</h3>
                </div>
              </div>

              <div className="employee-task-details-page__card-scroll-area">
                <div className="employee-task-details-page__summary-card">
                  <div className="employee-task-details-page__summary-stats">
                    <div className="employee-task-details-page__summary-stat">
                      <span>Total Feedback</span>
                      <strong>{task.feedback?.length || 0}</strong>
                    </div>

                    <div className="employee-task-details-page__summary-stat">
                      <span>Latest Update</span>
                      <strong>{latestUpdateText}</strong>
                    </div>
                  </div>

                  {task.feedback?.length ? (
                    <div className="employee-task-details-page__feedback-list">
                      {task.feedback.slice(0, 5).map((item, index) => (
                        <div
                          key={`${item.createdAt}-${index}`}
                          className="employee-task-details-page__feedback-item"
                        >
                          <p>{item.message || item.text}</p>
                          <small>{formatDateTime(item.createdAt || item.date)}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="employee-task-details-page__empty-state">
                      No feedback has been added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="employee-task-details-page__feedback-inline-card">
            <form
              className="employee-task-details-page__feedback-inline-form"
              onSubmit={handleSubmitFeedback}
            >
              <div className="employee-task-details-page__feedback-inline-main">
                <div className="employee-task-details-page__feedback-inline-input-wrap">
                  <input
                    type="text"
                    placeholder="Add feedback and send it..."
                    value={feedbackText}
                    onChange={(event) => setFeedbackText(event.target.value.slice(0, 500))}
                  />
                  <span className="employee-task-details-page__feedback-inline-count">
                    {feedbackText.length}/500
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="employee-task-details-page__feedback-inline-submit"
                disabled={isSubmittingFeedback || !feedbackText.trim()}
              >
                <FiSend />
                <span>{isSubmittingFeedback ? "Sending..." : "Send"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}