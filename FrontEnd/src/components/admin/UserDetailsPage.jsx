import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBriefcase,
  FiMail,
  FiShield,
  FiUsers,
  FiUser,
  FiCheckCircle,
} from "react-icons/fi";
import "../../assets/styles/admin/users-section.css";
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

export default function UserDetailsPage({ user, onBack, onUserUpdated }) {
  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;

  const [userState, setUserState] = useState(user || null);
  const [selectedRole, setSelectedRole] = useState(getUserRole(user));
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  useEffect(() => {
    setUserState(user || null);
    setSelectedRole(getUserRole(user));
    setIsEditingRole(false);
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
  const canEditRole = !isAdminUser;

  const handleStartEditRole = () => {
    if (!canEditRole) {
      return;
    }

    setSelectedRole(role);
    setIsEditingRole(true);
    setFeedbackMessage("");
    setFeedbackType("");
  };

  const handleCancelEditRole = () => {
    setSelectedRole(role);
    setIsEditingRole(false);
    setFeedbackMessage("");
    setFeedbackType("");
  };

  const handleRoleUpdate = async () => {
    if (!userId) {
      setFeedbackType("error");
      setFeedbackMessage("User not found.");
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      const payload = {
        userId: Number(userId),
        companyId: Number(companyId),
        role: selectedRole,
      };

      const candidateRequests = [
        {
          url: `${API_BASE_URL}/api/auth/update-user-role`,
          method: "PUT",
          body: payload,
        },
        {
          url: `${API_BASE_URL}/api/users/${userId}/role`,
          method: "PUT",
          body: payload,
        },
        {
          url: `${API_BASE_URL}/api/user/${userId}/role`,
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
          console.error("Role update request failed:", error);
        }
      }

      if (!updated) {
        throw new Error("Failed to update user role.");
      }

      const nextUser = {
        ...userState,
        ...(resolvedData?.user || {}),
        role: selectedRole,
      };

      setUserState(nextUser);
      setIsEditingRole(false);

      if (typeof onUserUpdated === "function") {
        onUserUpdated(nextUser);
      }

      setFeedbackType("success");
      setFeedbackMessage("User role updated successfully.");
    } catch (error) {
      console.error("Failed to update user role:", error);
      setFeedbackType("error");
      setFeedbackMessage(error.message || "Failed to update user role.");
    } finally {
      setIsSaving(false);
    }
  };

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
          <p>{role}</p>
          <span>{email}</span>
        </div>
      </div>

      <div className="user-info-card">
        <div className="user-info-card__header">
          <h3>User Information</h3>

          {canEditRole && !isEditingRole && (
            <button
              type="button"
              className="profile-edit-btn"
              onClick={handleStartEditRole}
            >
              Edit Role
            </button>
          )}
        </div>

        <div className="user-info-card__divider"></div>

        {feedbackMessage && (
          <p
            className={`profile-form-message ${
              feedbackType === "error"
                ? "profile-form-message--error"
                : "profile-form-message--success"
            }`}
          >
            {feedbackMessage}
          </p>
        )}

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="profile-info-item__label">
              <span className="profile-info-item__label-icon">
                <FiMail />
              </span>
              Email
            </span>
            <span className="profile-info-item__value">{email}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">
              <span className="profile-info-item__label-icon">
                <FiBriefcase />
              </span>
              Job Type
            </span>
            <span className="profile-info-item__value">{jobType}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">
              <span className="profile-info-item__label-icon">
                <FiUsers />
              </span>
              Team
            </span>
            <span className="profile-info-item__value">{teamName}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">
              <span className="profile-info-item__label-icon">
                <FiCheckCircle />
              </span>
              Status
            </span>
            <span className="profile-info-item__value">{status}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">
              <span className="profile-info-item__label-icon">
                <FiShield />
              </span>
              Role
            </span>

            {canEditRole && isEditingRole ? (
              <>
                <select
                  className="profile-info-input user-details-page__role-select"
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  disabled={isSaving}
                >
                  <option value="Employee">Employee</option>
                  <option value="Team Leader">Team Leader</option>
                </select>

                <div className="profile-info-card__actions user-details-page__actions">
                  <button
                    type="button"
                    className="profile-edit-btn"
                    onClick={handleCancelEditRole}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="profile-edit-btn profile-edit-btn--primary"
                    onClick={handleRoleUpdate}
                    disabled={isSaving || selectedRole === role}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <span className="profile-info-item__value">{role}</span>
            )}
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">
              <span className="profile-info-item__label-icon">
                <FiUser />
              </span>
              User ID
            </span>
            <span className="profile-info-item__value">
              {userId ?? "Unavailable"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}