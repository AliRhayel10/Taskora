import { useMemo, useState } from "react";
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
import TaskDetailsPage from "./TaskDetailsPage";
import "../../assets/styles/teamleader/team-member-details-page.css";

const API_BASE = "http://localhost:5000";
const PREVIEW_TASK_LIMIT = 5;

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

function parseTaskDate(value) {
  if (!value) return null;

  const raw = String(value).trim();
  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw;
  const parsed = new Date(`${dateOnly}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTaskDate(value) {
  if (!value) return "No due date";

  const parsed = parseTaskDate(value);
  if (!parsed) return String(value);

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
  const directStatus = getValue(
    task,
    [
      "effectiveStatus",
      "EffectiveStatus",
      "status",
      "Status",
      "statusName",
      "StatusName",
      "taskStatus",
      "TaskStatus",
      "taskStatusName",
      "TaskStatusName",
      "state",
      "State",
    ],
    ""
  );

  if (typeof directStatus === "string" && directStatus.trim()) {
    return directStatus;
  }

  if (directStatus && typeof directStatus === "object") {
    const nestedStatus = getValue(
      directStatus,
      ["statusName", "StatusName", "name", "Name", "taskStatusName", "TaskStatusName", "label", "Label"],
      ""
    );

    if (String(nestedStatus || "").trim()) return nestedStatus;
  }

  const nestedObjects = [
    task?.taskStatus,
    task?.TaskStatus,
    task?.statusInfo,
    task?.StatusInfo,
    task?.statusNavigation,
    task?.StatusNavigation,
  ];

  for (const nested of nestedObjects) {
    if (!nested || typeof nested !== "object") continue;

    const nestedStatus = getValue(
      nested,
      ["statusName", "StatusName", "name", "Name", "taskStatusName", "TaskStatusName", "label", "Label"],
      ""
    );

    if (String(nestedStatus || "").trim()) return nestedStatus;
  }

  return "Not set";
}

function getTaskId(task = {}) {
  return task?.taskId ?? task?.TaskId ?? task?.id ?? task?.Id ?? "";
}

function getTaskEffort(task = {}) {
  return Number(
    task?.estimatedEffortHours ??
      task?.EstimatedEffortHours ??
      task?.effort ??
      task?.Effort ??
      0
  );
}

function getTaskWeight(task = {}) {
  return Number(task?.weight ?? task?.Weight ?? 0);
}

function normalizeTaskStatus(status = "") {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function getTaskStatusClass(status = "") {
  const normalized = normalizeTaskStatus(status);

  if (normalized === "new") return "team-member-details-page__task-status--new";
  if (normalized === "acknowledged" || normalized === "in-progress") {
    return "team-member-details-page__task-status--acknowledged";
  }
  if (normalized === "pending") return "team-member-details-page__task-status--pending";
  if (normalized === "done" || normalized === "completed") return "team-member-details-page__task-status--done";
  if (normalized === "approved") return "team-member-details-page__task-status--approved";
  if (normalized === "rejected") return "team-member-details-page__task-status--rejected";
  if (normalized === "archived") return "team-member-details-page__task-status--archived";

  return "team-member-details-page__task-status--pending";
}

function formatTaskStatus(status = "") {
  const rawStatus = String(status || "").trim();
  const normalized = normalizeTaskStatus(rawStatus);

  if (normalized === "in-progress") return "Acknowledged";
  if (normalized === "done" || normalized === "completed") return "Done";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "new") return "New";
  if (normalized === "acknowledged") return "Acknowledged";
  if (normalized === "pending") return "Pending";
  if (normalized === "archived") return "Archived";

  return rawStatus || "Pending";
}


function isActiveWorkloadTask(task = {}) {
  const normalizedStatus = normalizeTaskStatus(getTaskStatus(task));
  return normalizedStatus !== "approved" && normalizedStatus !== "archived";
}

function buildTaskForDetails(task = {}) {
  const status = getTaskStatus(task);

  return {
    ...task,
    status,
    Status: status,
    effectiveStatus: status,
    EffectiveStatus: status,
    statusName: status,
    StatusName: status,
    taskStatusName: status,
    TaskStatusName: status,
  };
}

function sortTasksByDueDate(tasks) {
  return [...tasks].sort((firstTask, secondTask) => {
    const firstDate = parseTaskDate(getTaskDueDate(firstTask));
    const secondDate = parseTaskDate(getTaskDueDate(secondTask));

    if (!firstDate && !secondDate) return 0;
    if (!firstDate) return 1;
    if (!secondDate) return -1;

    return firstDate.getTime() - secondDate.getTime();
  });
}

export default function TeamMemberDetailsPage({
  member,
  onBack,
  onViewTask,
  onTaskUpdated,
  companyId,
}) {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

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
    const currentTasks = Array.isArray(selectedMember.currentTasks)
      ? selectedMember.currentTasks
      : Array.isArray(selectedMember.CurrentTasks)
        ? selectedMember.CurrentTasks
        : [];

    const activeTasks = currentTasks.filter(isActiveWorkloadTask);
    const sortedTasks = sortTasksByDueDate(activeTasks);
    const tasksCount = sortedTasks.length;
    const effort = sortedTasks.reduce((sum, task) => sum + getTaskEffort(task), 0);
    const weight = sortedTasks.reduce((sum, task) => sum + getTaskWeight(task), 0);

    return {
      name,
      email,
      jobTitle,
      status,
      profileImageUrl,
      tasksCount,
      effort,
      weight,
      currentTasks: sortedTasks,
    };
  }, [member]);

  const displayedTasks = showAllTasks
    ? details.currentTasks
    : details.currentTasks.slice(0, PREVIEW_TASK_LIMIT);

  const displayEffort = `${Number(details.effort.toFixed(2)).toLocaleString()}h`;
  const displayWeight = Number(details.weight.toFixed(2)).toLocaleString();

  const handleViewTask = (task) => {
    const taskForDetails = buildTaskForDetails(task);

    if (typeof onViewTask === "function") {
      onViewTask(taskForDetails);
      return;
    }

    setSelectedTask(taskForDetails);
  };

  if (selectedTask) {
    return (
      <TaskDetailsPage
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onTaskUpdated={onTaskUpdated}
        companyId={companyId}
      />
    );
  }

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
              <strong className="team-member-details-page__job-title-value">{details.jobTitle}</strong>
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
              <span>Active Tasks</span>
              <strong>{details.tasksCount}</strong>
            </div>

            <div className="team-member-details-page__overview-item">
              <span className="team-member-details-page__overview-icon team-member-details-page__overview-icon--effort">
                <FiClock />
              </span>
              <span>Active Effort</span>
              <strong>{displayEffort}</strong>
            </div>

            <div className="team-member-details-page__overview-item">
              <span className="team-member-details-page__overview-icon team-member-details-page__overview-icon--weight">
                <FiTrendingUp />
              </span>
              <span>Active Weight</span>
              <strong>{displayWeight}</strong>
            </div>
          </div>
        </article>

        <article className="team-member-details-page__tasks-card">
          <div className="team-member-details-page__section-header">
            <h3>Active Tasks</h3>
            {details.currentTasks.length > PREVIEW_TASK_LIMIT && (
              <button
                type="button"
                className="team-member-details-page__view-all-btn"
                onClick={() => setShowAllTasks((current) => !current)}
              >
                {showAllTasks ? "Show less" : "View all"}
              </button>
            )}
          </div>

          <div className={`team-member-details-page__tasks-list ${showAllTasks ? "team-member-details-page__tasks-list--all" : ""}`}>
            {displayedTasks.length ? (
              displayedTasks.map((task, index) => {
                const status = getTaskStatus(task);
                const title = getTaskTitle(task);

                return (
                  <div key={getTaskId(task) || index} className="team-member-details-page__task-row">
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
                      onClick={() => handleViewTask(task)}
                      aria-label={`View ${title}`}
                    >
                      <FiEye />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="team-member-details-page__empty-state">
                No tasks found for this member in the selected date range.
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
          {details.currentTasks.slice(0, 3).map((task, index) => (
            <div key={getTaskId(task) || index} className="team-member-details-page__activity-item">
              <span className="team-member-details-page__activity-icon team-member-details-page__activity-icon--complete">
                <FiCheckCircle />
              </span>
              <div>
                <strong>{formatTaskStatus(getTaskStatus(task))}: {getTaskTitle(task)}</strong>
                <span>Due: {formatTaskDate(getTaskDueDate(task))}</span>
              </div>
            </div>
          ))}

          {!details.currentTasks.length && (
            <div className="team-member-details-page__empty-state">
              No recent activity available for the selected date range.
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
