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
    month: "2-digit",
    year: "numeric",
  });
};

const getPriorityClass = (priority = "") => {
  const normalized = String(priority).trim().toLowerCase();

  if (normalized === "low") return "task-details-page__value--low";
  if (normalized === "medium") return "task-details-page__value--medium-priority";
  if (normalized === "high") return "task-details-page__value--high";
  if (normalized === "critical") return "task-details-page__value--critical";

  return "task-details-page__value--default";
};

const getComplexityClass = (complexity = "") => {
  const normalized = String(complexity).trim().toLowerCase();

  if (normalized === "simple") return "task-details-page__value--simple";
  if (normalized === "medium") return "task-details-page__value--medium-complexity";
  if (normalized === "complex") return "task-details-page__value--complex";

  return "task-details-page__value--default";
};

const getStatusClass = (status = "") => {
  const normalized = String(status).trim().toLowerCase();

  if (normalized === "new") return "task-details-page__value--new";
  if (normalized === "acknowledged") return "task-details-page__value--acknowledged";
  if (normalized === "pending") return "task-details-page__value--pending";
  if (normalized === "done") return "task-details-page__value--done";
  if (normalized === "approved") return "task-details-page__value--approved";
  if (normalized === "rejected") return "task-details-page__value--rejected";
  if (normalized === "archived") return "task-details-page__value--archived";

  return "task-details-page__value--default";
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

  const title = task?.title?.trim() || "Untitled Task";
  const description =
    task?.description?.trim() || "No task description was added.";
  const priority = task?.priority || "Low";
  const complexity = task?.complexity || "Simple";
  const effort = Number(task?.estimatedEffortHours || 0);
  const weight = Number(task?.weight || 0);
  const status = task?.status || "Not set";
  const startDateLabel = formatDateLabel(task?.startDate);
  const dueDateLabel = formatDateLabel(task?.dueDate);

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

      <div className="task-details-page__single-card">
        <div className="task-details-page__top-block">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="task-details-page__divider" />

        <div className="task-details-page__assigned-section">
          <h4>Assigned To</h4>

          <div className="task-details-page__assignee-row">
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

        <div className="task-details-page__divider" />

        <div className="task-details-page__details-grid">
          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiFlag />
              <span>Priority</span>
            </div>
            <strong className={getPriorityClass(priority)}>{priority}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiLayers />
              <span>Complexity</span>
            </div>
            <strong className={getComplexityClass(complexity)}>
              {complexity}
            </strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiClock />
              <span>Estimated Effort</span>
            </div>
            <strong>{effort > 0 ? `${effort} h` : "Not set"}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiTarget />
              <span>Weight</span>
            </div>
            <strong>{weight > 0 ? weight.toFixed(2) : "Not set"}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiCalendar />
              <span>Due Date</span>
            </div>
            <strong>{dueDateLabel}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiCalendar />
              <span>Start Date</span>
            </div>
            <strong>{startDateLabel}</strong>
          </div>

          <div className="task-details-page__detail-item">
            <div className="task-details-page__label-row">
              <FiUser />
              <span>Status</span>
            </div>
            <strong className={getStatusClass(status)}>{status}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}