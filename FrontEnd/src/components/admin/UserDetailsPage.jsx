import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiUser } from "react-icons/fi";
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

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function UserDetailsPage({ user, onBack, onUserUpdated }) {
  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;

  const [userState, setUserState] = useState(user || null);
  const [selectedRole, setSelectedRole] = useState(getUserRole(user));
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  useEffect(() => {
    setUserState(user || null);
    setSelectedRole(getUserRole(user));
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

  const title = getUserName(userState);
  const email = userState?.email || "No email";
  const role = getUserRole(userState);
  const jobType = getUserJobType(userState);
  const team = getUserTeam(userState);
  const status = getUserStatus(userState);

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

        <h2>{title}</h2>
        <div className="user-details-page__title-line"></div>
      </div>

      {feedbackMessage && (
        <div
          className={
            feedbackType === "error"
              ? "users-section__feedback users-section__feedback--error"
              : "users-section__feedback users-section__feedback--success"
          }
        >
          {feedbackMessage}
        </div>
      )}

      <div className="user-details-page__grid">
        <div className="user-details-page__card">
          <div className="user-details-page__profile">
            <div className="user-details-page__avatar">
              <FiUser />
            </div>

            <div className="user-details-page__profile-copy">
              <strong>{title}</strong>
              <span>{email}</span>
            </div>
          </div>

          <div className="user-details-page__info-list">
            <div className="user-details-page__info-item">
              <label>Email</label>
              <span>{email}</span>
            </div>

            <div className="user-details-page__info-item">
              <label>Current Role</label>
              <span>{role}</span>
            </div>

            <div className="user-details-page__info-item">
              <label>Job Type</label>
              <span>{jobType}</span>
            </div>

            <div className="user-details-page__info-item">
              <label>Team</label>
              <span>{team}</span>
            </div>

            <div className="user-details-page__info-item">
              <label>Status</label>
              <span>{status}</span>
            </div>
          </div>
        </div>

        <div className="user-details-page__card">
          <div className="user-details-page__section-header">
            <h3>Change Role</h3>
            <p>Update this user role in the backend so the system reflects it everywhere.</p>
          </div>

          <div className="users-section__form">
            <div className="users-section__form-group">
              <label>
                Role <span className="users-section__required">*</span>
              </label>

              <div className="users-section__select-wrapper">
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  disabled={isSaving}
                >
                  <option value="Employee">Employee</option>
                  <option value="Team Leader">Team Leader</option>
                </select>
              </div>
            </div>

            <div className="users-section__form-actions user-details-page__actions">
              <button
                type="button"
                className="users-section__submit-btn"
                onClick={handleRoleUpdate}
                disabled={isSaving || selectedRole === role}
              >
                {isSaving ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}