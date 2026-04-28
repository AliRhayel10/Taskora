import { useMemo } from "react";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiMail,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import "../../assets/styles/teamleader/team-member-details-page.css";

const API_BASE = "http://localhost:5000";

function getValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return fallback;
}

function getProfileImage(member = {}) {
  const rawValue = getValue(
    member,
    ["profileImageUrl", "ProfileImageUrl", "imageUrl", "ImageUrl", "avatar"],
    ""
  );

  const value = String(rawValue || "").trim();

  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;

  return `${API_BASE}/${value}`;
}

function getInitials(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getStatus(member = {}) {
  const status = getValue(member, ["calculatedStatus", "status", "Status"], "");
  const isActive = member?.isActive ?? member?.IsActive;

  if (String(status || "").trim()) return status;
  return isActive === false ? "Inactive" : "Active";
}

function getStatusClass(status = "") {
  const normalized = String(status).trim().toLowerCase();

  if (normalized === "active") return "team-member-details-page__status-badge--active";
  if (normalized === "away") return "team-member-details-page__status-badge--away";
  return "team-member-details-page__status-badge--inactive";
}

function formatTaskDate(value) {
  if (!value) return "No due date";

  const raw = String(value).trim();
  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw;
  const parsed = new Date(`${dateOnly}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getTaskTitle(task = {}) {
  return getValue(task, ["title", "Title", "name", "Name"], "Untitled Task");
}

function getTaskDueDate(task = {}) {
  return getValue(task, ["dueDate", "DueDate", "deadline", "Deadline"], "");
}

function getTaskStatus(task = {}) {
  return getValue(task, ["effectiveStatus", "status", "Status"], "Pending");
}

function getTaskStatusClass(status = "") {
  const normalized = String(status).trim().toLowerCase();

  if (normalized === "done" || normalized === "completed" || normalized === "approved") {
    return "team-member-details-page__task-status--done";
  }

  if (normalized === "in progress" || normalized === "acknowledged") {
    return "team-member-details-page__task-status--progress";
  }

  if (normalized === "new") {
    return "team-member-details-page__task-status--new";
  }

  if (normalized === "rejected" || normalized === "overdue") {
    return "team-member-details-page__task-status--danger";
  }

  return "team-member-details-page__task-status--pending";
}

function formatTaskStatus(status = "") {
  const normalized = String(status).trim().toLowerCase();

  if (normalized === "acknowledged") return "In Progress";
  if (normalized === "done") return "Completed";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "new") return "New";

  return status || "Pending";
}

export default function TeamMemberDetailsPage({ member, onBack, onViewTask }) {
  const details = useMemo(() => {
    const selectedMember = member || {};

    const name = getValue(selectedMember, ["fullName", "FullName", "name", "Name"], "Team Member");
    const email = getValue(selectedMember, ["email", "Email"], "No email provided");
    const jobTitle = getValue(
      selectedMember,
      ["jobTitle", "JobTitle", "jobType", "JobType", "role", "Role"],
      "Member"
    );
    const status = getStatus(selectedMember);
    const profileImageUrl = getProfileImage(selectedMember);
    const tasksCount = Number(
      getValue(selectedMember, ["calculatedTasks", "tasks", "Tasks", "taskCount", "TaskCount"], 0)
    );
    const effort = Number(
      getValue(selectedMember, ["calculatedEffort", "totalEffort", "TotalEffort"], 0)
    );
    const weight = Number(
      getValue(selectedMember, ["calculatedWeight", "totalWeight", "TotalWeight"], 0)
    );
    const currentTasks = Array.isArray(selectedMember.currentTasks)
      ? selectedMember.currentTasks
      : Array.isArray(selectedMember.CurrentTasks)
        ? selectedMember.CurrentTasks
        : [];

    return {
      name,
      email,
      jobTitle,
      status,
      profileImageUrl,
      tasksCount,
      effort,
      weight,
      currentTasks,
    };
  }, [member]);

  const displayEffort = `${Number(details.effort.toFixed(2)).toLocaleString()}h`;
  const displayWeight = Number(details.weight.toFixed(2)).toLocaleString();

  return (
    <section className="team-member-details-page">
      <div className="team-member-details-page__title-row">
        <button
          type="button"
          className="team-member-details-page__back-btn"
          onClick={onBack}
          aria-label="Back to team"
        >
          <FiArrowLeft />
        </button>

        <h2>Team Member Details</h2>
        <div className="team-member-details-page__title-line" />
      </div>

      <div className="team-member-details-page__content-grid">
        <article className="team-member-details-page__profile-card">
          <div className="team-member-details-page__profile-main">
            <span className="team-member-details-page__avatar">
              {details.profileImageUrl ? (
                <img src={details.profileImageUrl} alt="" />
              ) : (
                getInitials(details.name)
              )}
              <span className="team-member-details-page__online-dot" />
            </span>

            <div className="team-member-details-page__profile-copy">
              <h3>{details.name}</h3>

              <div className="team-member-details-page__email-row">
                <FiMail />
                <span>{details.email}</span>
              </div>
            </div>
          </div>

          <div className="team-member-details-page__profile-divider" />

          <div className="team-member-details-page__info-grid">
            <div className="team-member-details-page__info-item">
              <div className="team-member-details-page__label-row">
                <FiBriefcase />
                <span>Job Title</span>
              </div>
              <strong>{details.jobTitle}</strong>
            </div>

            <div className="team-member-details-page__info-item">
              <div className="team-member-details-page__label-row">
                <FiShield />
                <span>Status</span>
              </div>
              <span className={`team-member-details-page__status-badge ${getStatusClass(details.status)}`}>
                {details.status}
              </span>
            </div>
          </div>
        </article>

        <article className="team-member-details-page__overview-card">
          <h3>Work Overview</h3>

          <div className="team-member-details-page__overview-list">
            <div className="team-member-details-page__overview-item">
              <span className="team-member-details-page__overview-icon team-member-details-page__overview-icon--tasks">
                <FiCheckCircle />
              </span>
              <span>Tasks Assigned</span>
              <strong>{details.tasksCount}</strong>
            </div>

            <div className="team-member-details-page__overview-item">
              <span className="team-member-details-page__overview-icon team-member-details-page__overview-icon--effort">
                <FiClock />
              </span>
              <span>Total Effort</span>
              <strong>{displayEffort}</strong>
            </div>

            <div className="team-member-details-page__overview-item">
              <span className="team-member-details-page__overview-icon team-member-details-page__overview-icon--weight">
                <FiTrendingUp />
              </span>
              <span>Total Weight</span>
              <strong>{displayWeight}</strong>
            </div>
          </div>
        </article>

        <article className="team-member-details-page__tasks-card">
          <div className="team-member-details-page__section-header">
            <h3>Current Tasks</h3>
            <button type="button" className="team-member-details-page__view-all-btn">
              View all
            </button>
          </div>

          <div className="team-member-details-page__tasks-list">
            {details.currentTasks.length ? (
              details.currentTasks.slice(0, 3).map((task, index) => {
                const status = getTaskStatus(task);
                const title = getTaskTitle(task);

                return (
                  <div key={task?.taskId ?? task?.TaskId ?? task?.id ?? index} className="team-member-details-page__task-row">
                    <div className="team-member-details-page__task-icon">
                      <FiCheckCircle />
                    </div>

                    <div className="team-member-details-page__task-copy">
                      <strong>{title}</strong>
                      <span>Due: {formatTaskDate(getTaskDueDate(task))}</span>
                    </div>

                    <span className={`team-member-details-page__task-status ${getTaskStatusClass(status)}`}>
                      {formatTaskStatus(status)}
                    </span>

                    <button
                      type="button"
                      className="team-member-details-page__task-action"
                      onClick={() => onViewTask?.(task)}
                      aria-label={`View ${title}`}
                    >
                      <FiEye />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="team-member-details-page__empty-state">
                No current tasks found for this member.
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="team-member-details-page__activity-card">
        <div className="team-member-details-page__section-header">
          <h3>Recent Activity</h3>
          <button type="button" className="team-member-details-page__view-all-btn">
            View all activity
          </button>
        </div>

        <div className="team-member-details-page__activity-list">
          <div className="team-member-details-page__activity-item">
            <span className="team-member-details-page__activity-icon team-member-details-page__activity-icon--complete">
              <FiCheckCircle />
            </span>
            <div>
              <strong>Completed task “Dashboard UI Design”</strong>
              <span>May 18, 2025 at 4:30 PM</span>
            </div>
          </div>

          <div className="team-member-details-page__activity-item">
            <span className="team-member-details-page__activity-icon team-member-details-page__activity-icon--upload">
              <FiBriefcase />
            </span>
            <div>
              <strong>Updated work details</strong>
              <span>May 16, 2025 at 11:15 AM</span>
            </div>
          </div>

          <div className="team-member-details-page__activity-item">
            <span className="team-member-details-page__activity-icon team-member-details-page__activity-icon--comment">
              <FiClock />
            </span>
            <div>
              <strong>Commented on “Mobile App Redesign”</strong>
              <span>May 15, 2025 at 2:45 PM</span>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}