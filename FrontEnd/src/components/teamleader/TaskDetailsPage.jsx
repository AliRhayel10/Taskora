import React, { useMemo } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiFlag,
  FiLayers,
  FiTarget,
  FiUser,
} from "react-icons/fi";
import "../../assets/styles/teamleader/task-details-page.css";

const API_BASE = "http://localhost:5000";

const getProfileImage = (user = {}) => {
  const rawValue =
    user.profileImageUrl ||
    user.ProfileImageUrl ||
    user.imageUrl ||
    user.ImageUrl ||
    user.assignedUserAvatar ||
    user.avatar ||
    "";

  const value = String(rawValue || "").trim();

  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;

  return `${API_BASE}/${value}`;
};

const getInitials = (value = "") => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const formatDateLabel = (value) => {
  if (!value) return "Not set";

  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw.split("T")[0] : raw;
  const parsed = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDurationLabel = (startDate, dueDate) => {
  if (!startDate || !dueDate) return "Not set";

  const start = new Date(`${String(startDate).split("T")[0]}T00:00:00`);
  const end = new Date(`${String(dueDate).split("T")[0]}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Not set";
  }

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Invalid dates";
  if (diffDays === 0) return "1 day";

  return `${diffDays + 1} days`;
};

const getPriorityClass = (priority = "") => {
  const normalized = String(priority).trim().toLowerCase();

  if (normalized === "critical") return "task-details-page__tag--danger";
  if (normalized === "high") return "task-details-page__tag--warning";
  if (normalized === "medium") return "task-details-page__tag--warning";

  return "task-details-page__tag--primary";
};

const getComplexityClass = (complexity = "") => {
  const normalized = String(complexity).trim().toLowerCase();

  if (normalized === "complex") return "task-details-page__tag--danger";
  if (normalized === "medium") return "task-details-page__tag--warning";

  return "task-details-page__tag--primary";
};

export default function TaskDetailsPage({ task, onBack }) {
  const assignee = useMemo(
    () => ({
      fullName: task?.assignedUserName || "Unassigned",
      email: task?.assignedUserEmail || "No email available",
      assignedUserAvatar: task?.assignedUserAvatar || "",
    }),
    [task],
  );

  const profileImage = getProfileImage(assignee);
  const title = task?.title?.trim() || "Task details";
  const description = task?.description?.trim() || "No task description was added.";
  const priority = task?.priority || "Low";
  const complexity = task?.complexity || "Simple";
  const effort = Number(task?.estimatedEffortHours || 0);
  const weight = Number(task?.weight || 0);
  const startDateLabel = formatDateLabel(task?.startDate);
  const dueDateLabel = formatDateLabel(task?.dueDate);
  const durationLabel = getDurationLabel(task?.startDate, task?.dueDate);
  const feedback = String(task?.feedback || "").trim();

  return (
    <section className="task-details-page">
      <div className="task-details-page__title-row">
        {typeof onBack === "function" && (
          <button
            type="button"
            className="team-details-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <FiArrowLeft />
          </button>
        )}

        <h2>Task Details</h2>
        <div className="task-details-page__title-line"></div>
      </div>

      <div className="task-details-page__header">
        <div className="task-details-page__header-main">
          <span className="task-details-page__eyebrow">Task Overview</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="task-details-page__header-tags">
          <span className={`task-details-page__tag ${getPriorityClass(priority)}`}>
            {priority} Priority
          </span>
          <span className={`task-details-page__tag ${getComplexityClass(complexity)}`}>
            {complexity} Complexity
          </span>
        </div>
      </div>

      <div className="task-details-page__layout">
        <div className="task-details-page__main">
          <section className="task-details-page__section">
            <div className="task-details-page__section-head">
              <h4>Assignment</h4>
            </div>

            <div className="task-details-page__assignee-row">
              <div className="task-details-page__assignee-card">
                <div className="task-details-page__assignee-avatar">
                  {profileImage ? (
                    <img src={profileImage} alt={assignee.fullName} />
                  ) : (
                    <span>{getInitials(assignee.fullName)}</span>
                  )}
                </div>

                <div className="task-details-page__assignee-copy">
                  <strong>{assignee.fullName}</strong>
                  <small>{assignee.email}</small>
                </div>
              </div>
            </div>
          </section>

          <section className="task-details-page__section">
            <div className="task-details-page__section-head">
              <h4>Schedule</h4>
            </div>

            <div className="task-details-page__timeline-grid">
              <div className="task-details-page__timeline-item">
                <span className="task-details-page__timeline-icon">
                  <FiCalendar />
                </span>
                <div>
                  <small>Start Date</small>
                  <strong>{startDateLabel}</strong>
                </div>
              </div>

              <div className="task-details-page__timeline-item">
                <span className="task-details-page__timeline-icon">
                  <FiCalendar />
                </span>
                <div>
                  <small>Due Date</small>
                  <strong>{dueDateLabel}</strong>
                </div>
              </div>

              <div className="task-details-page__timeline-item">
                <span className="task-details-page__timeline-icon">
                  <FiClock />
                </span>
                <div>
                  <small>Duration</small>
                  <strong>{durationLabel}</strong>
                </div>
              </div>
            </div>
          </section>

          {feedback ? (
            <section className="task-details-page__section">
              <div className="task-details-page__section-head">
                <h4>Feedback</h4>
              </div>
              <div className="task-details-page__text-block">
                <p>{feedback}</p>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="task-details-page__sidebar">
          <section className="task-details-page__section task-details-page__section--compact">
            <div className="task-details-page__section-head">
              <h4>Task Summary</h4>
            </div>

            <div className="task-details-page__summary-list">
              <div className="task-details-page__summary-row">
                <span className="task-details-page__summary-icon task-details-page__summary-icon--effort">
                  <FiClock />
                </span>
                <div>
                  <small>Estimated Effort</small>
                  <strong>{effort > 0 ? `${effort} h` : "Not set"}</strong>
                </div>
              </div>

              <div className="task-details-page__summary-row">
                <span className="task-details-page__summary-icon task-details-page__summary-icon--weight">
                  <FiTarget />
                </span>
                <div>
                  <small>Task Weight</small>
                  <strong>{weight > 0 ? weight.toFixed(2) : "Not set"}</strong>
                </div>
              </div>

              <div className="task-details-page__summary-row">
                <span className="task-details-page__summary-icon task-details-page__summary-icon--priority">
                  <FiFlag />
                </span>
                <div>
                  <small>Priority</small>
                  <strong>{priority}</strong>
                </div>
              </div>

              <div className="task-details-page__summary-row">
                <span className="task-details-page__summary-icon task-details-page__summary-icon--complexity">
                  <FiLayers />
                </span>
                <div>
                  <small>Complexity</small>
                  <strong>{complexity}</strong>
                </div>
              </div>

              <div className="task-details-page__summary-row">
                <span className="task-details-page__summary-icon task-details-page__summary-icon--assignee">
                  <FiUser />
                </span>
                <div>
                  <small>Assignment</small>
                  <strong>{task?.assignedUserId ? "Assigned" : "Unassigned"}</strong>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
