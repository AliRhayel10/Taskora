import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiEdit2,
  FiMail,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "../../assets/styles/admin/users-section.css";
import "../../assets/styles/admin/profile-section.css";
import "../../assets/styles/admin/user-details-page.css";

const API_BASE_URL = "http://localhost:5000";

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error("Failed to read user from localStorage.", error);
    return null;
  }
}

function getUserName(user) {
  const fullName =
    user?.fullName ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return fullName?.trim() || user?.email || "Unnamed user";
}

function getUserRole(user) {
  return (
    user?.role?.trim() ||
    user?.roleName?.trim() ||
    user?.userRole?.trim() ||
    "Employee"
  );
}

function getUserJobType(user) {
  return user?.jobType?.trim() || user?.jobTitle?.trim() || "No job type";
}

function getUserTeam(user) {
  if (typeof user?.team === "string" && user.team.trim()) return user.team;
  if (typeof user?.teamName === "string" && user.teamName.trim()) return user.teamName;
  if (typeof user?.department === "string" && user.department.trim()) return user.department;
  if (typeof user?.groupName === "string" && user.groupName.trim()) return user.groupName;
  return "Unassigned";
}

function getUserStatus(user) {
  if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Unactive";
  if (typeof user?.active === "boolean") return user.active ? "Active" : "Unactive";

  if (typeof user?.status === "string" && user.status.trim()) {
    const normalizedStatus = user.status.trim().toLowerCase();
    return normalizedStatus === "active" ? "Active" : "Unactive";
  }

  return "Active";
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeRoleValue(role) {
  return String(role || "").trim().toLowerCase();
}

function normalizeStatusToBoolean(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "active";
}

export default function UserDetailsPage({ user, onBack, onUserUpdated }) {
  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;
  const infoCardRef = useRef(null);

  const [userState, setUserState] = useState(user || null);
  const [draftData, setDraftData] = useState({
    role: getUserRole(user),
    jobType: getUserJobType(user),
    isActive: normalizeStatusToBoolean(getUserStatus(user)),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  useEffect(() => {
    setUserState(user || null);
    setDraftData({
      role: getUserRole(user),
      jobType: getUserJobType(user),
      isActive: normalizeStatusToBoolean(getUserStatus(user)),
    });
    setIsEditing(false);
  }, [user]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage("");
      setFeedbackType("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackMessage]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const handlePointerDownOutside = (event) => {
      if (infoCardRef.current && !infoCardRef.current.contains(event.target)) {
        handleCancelEdit();
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isEditing, draftData, userState]);

  const userId =
    userState?.userId ||
    userState?.id ||
    userState?._id ||
    null;

  const name = getUserName(userState);
  const email = userState?.email || "No email";
  const role = getUserRole(userState);
  const jobType = getUserJobType(userState);
  const teamName = getUserTeam(userState);
  const status = getUserStatus(userState);
  const initials = getInitials(name);

  const isAdminUser = normalizeRoleValue(role) === "admin";
  const canEdit = !isAdminUser;

  const hasChanges =
    draftData.role !== role ||
    draftData.jobType.trim() !== jobType.trim() ||
    draftData.isActive !== normalizeStatusToBoolean(status);

  const handleStartEdit = () => {
    if (!canEdit) {
      return;
    }

    setDraftData({
      role,
      jobType,
      isActive: normalizeStatusToBoolean(status),
    });
    setIsEditing(true);
    setFeedbackMessage("");
    setFeedbackType("");
  };

  const handleCancelEdit = () => {
    setDraftData({
      role,
      jobType,
      isActive: normalizeStatusToBoolean(status),
    });
    setIsEditing(false);
    setFeedbackMessage("");
    setFeedbackType("");
  };

  const handleDraftChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!userId) {
      setFeedbackType("error");
      setFeedbackMessage("User not found.");
      return;
    }

    if (!hasChanges) {
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      const payload = {
        userId: Number(userId),
        companyId: Number(companyId),
        role: draftData.role,
        jobTitle: draftData.jobType.trim(),
        jobType: draftData.jobType.trim(),
        isActive: draftData.isActive,
        active: draftData.isActive,
        status: draftData.isActive ? "Active" : "Unactive",
      };

      const candidateRequests = [
        {
          url: `${API_BASE_URL}/api/auth/update-user`,
          method: "PUT",
          body: payload,
        },
        {
          url: `${API_BASE_URL}/api/auth/update-user-role`,
          method: "PUT",
          body: payload,
        },
        {
          url: `${API_BASE_URL}/api/users/${userId}`,
          method: "PUT",
          body: payload,
        },
        {
          url: `${API_BASE_URL}/api/user/${userId}`,
          method: "PUT",
          body: payload,
        },
      ];

      let resolvedData = null;
      let updated = false;

      for (const requestConfig of candidateRequests) {
        try {
          const response = await fetch(requestConfig.url, {
            method: requestConfig.method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestConfig.body),
          });

          const data = await readJsonSafe(response);

          if (!response.ok) {
            continue;
          }

          resolvedData = data;
          updated = true;
          break;
        } catch (error) {
          console.error("User update request failed:", error);
        }
      }

      if (!updated) {
        throw new Error("Failed to update user information.");
      }

      const nextUser = {
        ...userState,
        ...(resolvedData?.user || {}),
        role: draftData.role,
        roleName: draftData.role,
        userRole: draftData.role,
        jobType: draftData.jobType.trim(),
        jobTitle: draftData.jobType.trim(),
        isActive: draftData.isActive,
        active: draftData.isActive,
        status: draftData.isActive ? "Active" : "Unactive",
      };

      setUserState(nextUser);
      setIsEditing(false);

      if (typeof onUserUpdated === "function") {
        onUserUpdated(nextUser);
      }

      setFeedbackType("success");
      setFeedbackMessage("User information updated successfully.");
    } catch (error) {
      console.error("Failed to update user information:", error);
      setFeedbackType("error");
      setFeedbackMessage(error.message || "Failed to update user information.");
    } finally {
      setIsSaving(false);
    }
  };

  const infoItems = [
    {
      key: "email",
      label: "Email",
      icon: <FiMail />,
      value: <span className="profile-info-item__value">{email}</span>,
    },
    {
      key: "jobType",
      label: "Job Title",
      icon: <FiBriefcase />,
      value: isEditing ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftData.jobType}
          onChange={(event) => handleDraftChange("jobType", event.target.value)}
          placeholder="Enter job title"
        />
      ) : (
        <span className="profile-info-item__value">{jobType}</span>
      ),
    },
    {
      key: "team",
      label: "Team",
      icon: <FiUsers />,
      value: <span className="profile-info-item__value">{teamName}</span>,
    },
    {
      key: "status",
      label: "Activity",
      icon: <FiCheckCircle />,
      value: isEditing ? (
        <div className="user-details-page__status-edit">
          <button
            type="button"
            className={`users-section__switch ${draftData.isActive ? "users-section__switch--active" : ""}`}
            onClick={() => handleDraftChange("isActive", !draftData.isActive)}
            aria-pressed={draftData.isActive}
            disabled={isSaving}
          >
            <span className="users-section__switch-thumb"></span>
          </button>
          <span className="user-details-page__status-edit-text">
            {draftData.isActive ? "Active" : "Unactive"}
          </span>
        </div>
      ) : (
        <span className="profile-info-item__value">{status}</span>
      ),
    },
    {
      key: "role",
      label: "Role",
      icon: <FiShield />,
      value: isEditing ? (
        <div className="user-details-page__select-wrap">
          <select
            className="profile-info-input user-details-page__role-select"
            value={draftData.role}
            onChange={(event) => handleDraftChange("role", event.target.value)}
            disabled={isSaving}
          >
            <option value="Employee">Employee</option>
            <option value="Team Leader">Team Leader</option>
          </select>
          <FiChevronDown className="user-details-page__select-icon" />
        </div>
      ) : (
        <span className="profile-info-item__value">{role}</span>
      ),
    },
    {
      key: "userId",
      label: "User ID",
      icon: <FiUser />,
      value: <span className="profile-info-item__value">{userId ?? "Unavailable"}</span>,
    },
  ];

  return (
    <section className="user-details-page">
      <div className="user-details-page__title-row">
        {typeof onBack === "function" && (
          <button
            type="button"
            className="user-details-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <FiArrowLeft />
          </button>
        )}

        <h2>{name}</h2>
        <div className="user-details-page__title-line"></div>
      </div>

      <div className="user-hero-card">
        <div className="user-hero-card__avatar-wrapper">
          <div className="user-hero-card__avatar-fallback">{initials}</div>
        </div>

        <div className="user-hero-card__content">
          <h3>{name}</h3>
          <p>{jobType || role}</p>
          <span>{email}</span>
        </div>
      </div>

      <div className="user-info-card" ref={infoCardRef}>
        <div className="user-info-card__header">
          <h3>User Information</h3>

          {canEdit && (
            <div className="profile-info-card__actions">
              {isEditing && (
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <FiX />
                  Cancel
                </button>
              )}

              <button
                type="button"
                className={`profile-edit-btn ${isEditing ? "profile-edit-btn--primary" : ""}`.trim()}
                onClick={isEditing ? handleSave : handleStartEdit}
                disabled={isSaving || (isEditing && !hasChanges)}
              >
                {isEditing ? <FiCheck /> : <FiEdit2 />}
                {isSaving ? "Saving..." : isEditing ? "Save" : "Edit"}
              </button>
            </div>
          )}
        </div>

        <div className="user-info-card__divider"></div>

        {feedbackMessage ? (
          <div
            className={`profile-form-message profile-form-message--${feedbackType}`.trim()}
          >
            {feedbackMessage}
          </div>
        ) : null}

        <div className="profile-info-grid">
          {infoItems.map((item) => (
            <div key={item.key} className="profile-info-item">
              <span className="profile-info-item__label">
                <span className="profile-info-item__label-icon">{item.icon}</span>
                {item.label}
              </span>
              {item.value}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
