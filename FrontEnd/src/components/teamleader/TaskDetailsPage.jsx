import React, { useMemo } from "react";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheckSquare,
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

const normalizeStatus = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, " ");

const getStatusClass = (status = "") => {
  const normalized = normalizeStatus(status);

  if (normalized === "approved") return "task-details-page__pill--approved";
  if (normalized === "done") return "task-details-page__pill--done";
  if (normalized === "rejected" || normalized === "blocked") {
    return "task-details-page__pill--danger";
  }
  if (normalized === "pending") return "task-details-page__pill--pending";
  if (normalized === "acknowledged" || normalized === "in progress") {
    return "task-details-page__pill--info";
  }
  if (normalized === "archived") return "task-details-page__pill--neutral";

  return "task-details-page__pill--primary";
};

const getPriorityClass = (priority = "") => {
  const normalized = String(priority).trim().toLowerCase();

  if (normalized === "critical") return "task-details-page__pill--danger";
  if (normalized === "high") return "task-details-page__pill--high";
  if (normalized === "medium") return "task-details-page__pill--pending";

  return "task-details-page__pill--primary";
};

const getComplexityClass = (complexity = "") => {
  const normalized = String(complexity).trim().toLowerCase();

  if (normalized === "complex") return "task-details-page__pill--danger";
  if (normalized === "medium") return "task-details-page__pill--pending";

  return "task-details-page__pill--primary";
};

const getDurationLabel = (startDate, dueDate) => {
  if (!startDate || !dueDate) return "Not enough date data";

  const start = new Date(`${String(startDate).split("T")[0]}T00:00:00`);
  const end = new Date(`${String(dueDate).split("T")[0]}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Not enough date data";
  }

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Due date before start date";
  if (diffDays === 0) return "1 day";

  return `${diffDays + 1} days`;
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
  const effort = Number(task?.estimatedEffortHours || 0);
  const weight = Number(task?.weight || 0);
  const status = task?.status || "New";
  const priority = task?.priority || "Low";
  const complexity = task?.complexity || "Simple";
  const durationLabel = getDurationLabel(task?.startDate, task?.dueDate);

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

      <div className="task-details-page__hero-card">
        <div className="task-details-page__hero-copy">
          <span className="task-details-page__eyebrow">Task overview</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="task-details-page__hero-pills">
          <span className={`task-details-page__pill ${getStatusClass(status)}`}>
            {status}
          </span>
          <span className={`task-details-page__pill ${getPriorityClass(priority)}`}>
            {priority} Priority
          </span>
          <span
            className={`task-details-page__pill ${getComplexityClass(complexity)}`}
          >
            {complexity} Complexity
          </span>
        </div>
      </div>

      <div className="task-details-page__stats-grid">
        <article className="task-details-page__stat-card">
          <span className="task-details-page__stat-icon task-details-page__stat-icon--effort">
            <FiClock />
          </span>
          <div className="task-details-page__stat-copy">
            <small>Estimated Effort</small>
            <strong>{effort > 0 ? `${effort} h` : "Not set"}</strong>
          </div>
        </article>

        <article className="task-details-page__stat-card">
          <span className="task-details-page__stat-icon task-details-page__stat-icon--weight">
            <FiTarget />
          </span>
          <div className="task-details-page__stat-copy">
            <small>Task Weight</small>
            <strong>{weight > 0 ? weight.toFixed(2) : "Not set"}</strong>
          </div>
        </article>

        <article className="task-details-page__stat-card">
          <span className="task-details-page__stat-icon task-details-page__stat-icon--duration">
            <FiCalendar />
          </span>
          <div className="task-details-page__stat-copy">
            <small>Timeline</small>
            <strong>{durationLabel}</strong>
          </div>
        </article>

        <article className="task-details-page__stat-card">
          <span className="task-details-page__stat-icon task-details-page__stat-icon--status">
            <FiCheckSquare />
          </span>
          <div className="task-details-page__stat-copy">
            <small>Current Status</small>
            <strong>{status}</strong>
          </div>
        </article>
      </div>

      <div className="task-details-page__content-grid">
        <div className="task-details-page__main-column">
          <article className="task-details-page__panel">
            <div className="task-details-page__panel-head">
              <h4>Description</h4>
            </div>
            <div className="task-details-page__description-box">
              <p>{description}</p>
            </div>
          </article>

          <article className="task-details-page__panel">
            <div className="task-details-page__panel-head">
              <h4>Schedule</h4>
            </div>

            <div className="task-details-page__details-grid">
              <div className="task-details-page__detail-item">
                <span className="task-details-page__detail-label">Start Date</span>
                <strong>{formatDateLabel(task?.startDate)}</strong>
              </div>
              <div className="task-details-page__detail-item">
                <span className="task-details-page__detail-label">Due Date</span>
                <strong>{formatDateLabel(task?.dueDate)}</strong>
              </div>
              <div className="task-details-page__detail-item">
                <span className="task-details-page__detail-label">Duration</span>
                <strong>{durationLabel}</strong>
              </div>
              <div className="task-details-page__detail-item">
                <span className="task-details-page__detail-label">Task ID</span>
                <strong>{task?.id || "Not available"}</strong>
              </div>
            </div>
          </article>
        </div>

        <aside className="task-details-page__side-column">
          <article className="task-details-page__panel">
            <div className="task-details-page__panel-head">
              <h4>Assigned Member</h4>
            </div>

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
          </article>

          <article className="task-details-page__panel">
            <div className="task-details-page__panel-head">
              <h4>Task Info</h4>
            </div>

            <div className="task-details-page__meta-list">
              <div className="task-details-page__meta-row">
                <span className="task-details-page__meta-icon">
                  <FiFlag />
                </span>
                <div>
                  <small>Priority</small>
                  <strong>{priority}</strong>
                </div>
              </div>

              <div className="task-details-page__meta-row">
                <span className="task-details-page__meta-icon">
                  <FiLayers />
                </span>
                <div>
                  <small>Complexity</small>
                  <strong>{complexity}</strong>
                </div>
              </div>

              <div className="task-details-page__meta-row">
                <span className="task-details-page__meta-icon">
                  <FiUser />
                </span>
                <div>
                  <small>Assignment</small>
                  <strong>{task?.assignedUserId ? "Assigned" : "Unassigned"}</strong>
                </div>
              </div>

              <div className="task-details-page__meta-row">
                <span className="task-details-page__meta-icon">
                  <FiAlertCircle />
                </span>
                <div>
                  <small>Feedback</small>
                  <strong>{task?.feedback?.trim() || "No feedback yet"}</strong>
                </div>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
