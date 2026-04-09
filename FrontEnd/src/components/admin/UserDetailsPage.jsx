import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiArrowLeft,
    FiAlertTriangle,
    FiBriefcase,
    FiCheck,
    FiCheckCircle,
    FiChevronDown,
    FiEdit2,
    FiMail,
    FiShield,
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

async function readJsonSafe(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function normalizeTeamsResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.teams)) return data.teams;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

function getUserId(user) {
    return (
        user?.userId ||
        user?.UserId ||
        user?.id ||
        user?._id ||
        null
    );
}

function getUserName(user) {
    const fullName =
        user?.fullName ||
        user?.FullName ||
        user?.name ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ");

    return fullName?.trim() || user?.email || user?.Email || "Unnamed user";
}

function getUserRole(user) {
    return (
        user?.role?.trim() ||
        user?.Role?.trim() ||
        user?.roleName?.trim() ||
        user?.userRole?.trim() ||
        "Employee"
    );
}

function getUserJobType(user) {
    return (
        user?.jobType?.trim() ||
        user?.JobType?.trim() ||
        user?.jobTitle?.trim() ||
        user?.JobTitle?.trim() ||
        "No job type"
    );
}

function getDirectUserTeam(user) {
    if (typeof user?.team === "string" && user.team.trim()) return user.team;
    if (typeof user?.Team === "string" && user.Team.trim()) return user.Team;
    if (typeof user?.teamName === "string" && user.teamName.trim()) return user.teamName;
    if (typeof user?.TeamName === "string" && user.TeamName.trim()) return user.TeamName;
    if (typeof user?.department === "string" && user.department.trim()) return user.department;
    if (typeof user?.groupName === "string" && user.groupName.trim()) return user.groupName;
    return "";
}

function getTeamLeaderId(team) {
    return String(
        team?.teamLeaderUserId ??
        team?.TeamLeaderUserId ??
        team?.teamLeaderId ??
        team?.TeamLeaderId ??
        ""
    );
}

function getTeamMemberIds(team) {
    const ids =
        team?.memberIds ??
        team?.MemberIds ??
        [];

    if (!Array.isArray(ids)) {
        return [];
    }

    return ids.map((id) => String(id));
}

function getTeamNameValue(team) {
    return (
        team?.teamName ||
        team?.TeamName ||
        team?.name ||
        team?.Name ||
        "Unassigned"
    );
}

function getResolvedUserTeam(user, teams) {
  const userIdRaw =
    user?.userId ||
    user?.UserId ||
    user?.id ||
    user?._id;

  if (!userIdRaw) return "Unassigned";

  const userId = String(userIdRaw);

  if (!Array.isArray(teams) || teams.length === 0) {
    return "Unassigned";
  }

  for (const team of teams) {
    const leaderIdRaw =
      team?.teamLeaderUserId ??
      team?.TeamLeaderUserId ??
      team?.teamLeaderId ??
      team?.TeamLeaderId;

    const leaderId = leaderIdRaw ? String(leaderIdRaw) : null;

    const memberIdsRaw =
      team?.memberIds ??
      team?.MemberIds ??
      [];

    const memberIds = Array.isArray(memberIdsRaw)
      ? memberIdsRaw.map((id) => String(id))
      : [];

    if (leaderId === userId || memberIds.includes(userId)) {
      return (
        team?.teamName ||
        team?.TeamName ||
        team?.name ||
        "Unassigned"
      );
    }
  }

  return "Unassigned";
}

function getUserStatus(user) {
    if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Unactive";
    if (typeof user?.IsActive === "boolean") return user.IsActive ? "Active" : "Unactive";
    if (typeof user?.active === "boolean") return user.active ? "Active" : "Unactive";

    if (typeof user?.status === "string" && user.status.trim()) {
        const normalizedStatus = user.status.trim().toLowerCase();
        return normalizedStatus === "active" ? "Active" : "Unactive";
    }

    if (typeof user?.Status === "string" && user.Status.trim()) {
        const normalizedStatus = user.Status.trim().toLowerCase();
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

function normalizeRoleValue(role) {
    return String(role || "").trim().toLowerCase();
}

function normalizeStatusToBoolean(status) {
    const normalized = String(status || "").trim().toLowerCase();
    return normalized === "active";
}

function isTeamLeaderRole(role) {
    const normalizedRole = String(role || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    return normalizedRole === "team leader" || normalizedRole === "teamleader";
}

function findAssignedTeamForUser(userValue, teams) {
    const targetUserId = String(getUserId(userValue) || "");

    if (!targetUserId || !Array.isArray(teams)) {
        return null;
    }

    return (
        teams.find((team) => {
            const leaderId = getTeamLeaderId(team);
            const memberIds = getTeamMemberIds(team);
            return leaderId === targetUserId || memberIds.includes(targetUserId);
        }) || null
    );
}

export default function UserDetailsPage({ user, onBack, onUserUpdated }) {
    const currentUser = useMemo(() => getStoredUser(), []);
    const companyId = currentUser?.companyId || currentUser?.CompanyId || 0;
    const infoCardRef = useRef(null);

    const [userState, setUserState] = useState(user || null);
    const [teams, setTeams] = useState([]);
    const [draftData, setDraftData] = useState({
        role: getUserRole(user),
        jobType: getUserJobType(user),
        isActive: normalizeStatusToBoolean(getUserStatus(user)),
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [feedbackType, setFeedbackType] = useState("");
    const [isRoleChangeConfirmOpen, setIsRoleChangeConfirmOpen] = useState(false);

    const userId = getUserId(userState || user);
    const normalizedCurrentRole = getUserRole(userState);
    const normalizedCurrentJobType = getUserJobType(userState);
    const normalizedCurrentStatus = normalizeStatusToBoolean(getUserStatus(userState));
    const assignedTeam = useMemo(() => findAssignedTeamForUser(userState || user, teams), [userState, user, teams]);

    useEffect(() => {
        setUserState(user || null);
        setDraftData({
            role: getUserRole(user),
            jobType: getUserJobType(user),
            isActive: normalizeStatusToBoolean(getUserStatus(user)),
        });
        setIsEditing(false);
        setIsRoleChangeConfirmOpen(false);
    }, [user]);

    useEffect(() => {
        if (!userId || !companyId) {
            return;
        }

        const abortController = new AbortController();

        const fetchLatestData = async () => {
            try {
                setIsLoading(true);

                const [profileResponse, teamsResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/auth/profile/${userId}`, {
                        method: "GET",
                        signal: abortController.signal,
                    }),
                    fetch(`${API_BASE_URL}/api/teams/company/${encodeURIComponent(companyId)}`, {
                        method: "GET",
                        signal: abortController.signal,
                    }),
                ]);

                const profileData = await readJsonSafe(profileResponse);
                const teamsData = await readJsonSafe(teamsResponse);

                if (profileResponse.ok) {
                    const normalizedProfile =
                        profileData?.user ||
                        profileData?.data ||
                        profileData ||
                        null;

                    if (normalizedProfile) {
                        setUserState((prev) => ({
                            ...prev,
                            ...normalizedProfile,
                        }));
                    }
                }

                if (teamsResponse.ok) {
                    setTeams(normalizeTeamsResponse(teamsData));
                } else {
                    setTeams([]);
                }
            } catch (error) {
                if (error.name === "AbortError") {
                    return;
                }
                console.error("Failed to fetch latest user details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLatestData();

        return () => abortController.abort();
    }, [userId, companyId]);

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

    const name = getUserName(userState);
    const email = userState?.email || userState?.Email || "No email";
    const role = normalizedCurrentRole;
    const jobType = normalizedCurrentJobType;
    const teamName = getResolvedUserTeam(userState, teams);
    const status = getUserStatus(userState);
    const initials = getInitials(name);

    const isAdminUser = normalizeRoleValue(role) === "admin";
    const canEdit = !isAdminUser;

    const hasChanges =
        draftData.role !== normalizedCurrentRole ||
        draftData.jobType.trim() !== normalizedCurrentJobType.trim() ||
        draftData.isActive !== normalizedCurrentStatus;

    const hasRoleChanged = normalizeRoleValue(draftData.role) !== normalizeRoleValue(normalizedCurrentRole);
    const currentRoleIsLeader = isTeamLeaderRole(normalizedCurrentRole);
    const nextRoleIsLeader = isTeamLeaderRole(draftData.role);

    const getRoleChangeVerificationMessage = () => {
        if (!hasRoleChanged) {
            return "";
        }

        const teamDisplayName = assignedTeam ? getTeamNameValue(assignedTeam) : "this team";
        const isAssignedLeader = assignedTeam && getTeamLeaderId(assignedTeam) === String(userId || "");

        if (currentRoleIsLeader && !nextRoleIsLeader) {
            if (isAssignedLeader) {
                return `${name} is currently the leader of ${teamDisplayName}. After saving, this team will appear without a valid leader until another team leader is assigned.`;
            }

            if (assignedTeam) {
                return `${name} is assigned to ${teamDisplayName}. After saving, this user will no longer be treated as a team leader in the teams pages.`;
            }

            return `${name} will no longer be treated as a team leader in the teams pages after saving.`;
        }

        if (!currentRoleIsLeader && nextRoleIsLeader) {
            if (assignedTeam) {
                return `${name} is assigned to ${teamDisplayName}. After saving, this user will become eligible to be selected as a team leader, but will not be assigned automatically.`;
            }

            return `${name} will become eligible to be selected as a team leader after saving.`;
        }

        return `You changed ${name}'s role. Please confirm that you want to apply this update.`;
    };

    const handleRoleChangeVerificationConfirm = async () => {
        setIsRoleChangeConfirmOpen(false);
        await performSave();
    };

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
        setIsRoleChangeConfirmOpen(false);
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
        setIsRoleChangeConfirmOpen(false);
    };

    const handleDraftChange = (field, value) => {
        setDraftData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const performSave = async () => {
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
                ...(resolvedData?.user || resolvedData?.data || {}),
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

            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("taskora:user-updated", {
                        detail: {
                            userId: Number(userId),
                            role: draftData.role,
                            previousRole: normalizedCurrentRole,
                            jobType: draftData.jobType.trim(),
                            isActive: draftData.isActive,
                            hasRoleChanged,
                        },
                    })
                );
            }
        } catch (error) {
            console.error("Failed to update user information:", error);
            setFeedbackType("error");
            setFeedbackMessage(error.message || "Failed to update user information.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (hasRoleChanged) {
            setIsRoleChangeConfirmOpen(true);
            return;
        }

        await performSave();
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
            value: (
                <span className="profile-info-item__value">
                    {isLoading ? "Loading..." : teamName}
                </span>
            ),
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
                    <span
                        className={`user-details-page__status-badge ${draftData.isActive
                                ? "user-details-page__status-badge--active"
                                : "user-details-page__status-badge--inactive"
                            }`}
                    >
                        {draftData.isActive ? "Active" : "Inactive"}
                    </span>
                </div>
            ) : (
                <span
                    className={`user-details-page__status-badge ${normalizeStatusToBoolean(status)
                            ? "user-details-page__status-badge--active"
                            : "user-details-page__status-badge--inactive"
                        }`}
                >
                    {normalizeStatusToBoolean(status) ? "Active" : "Inactive"}
                </span>
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
            {isRoleChangeConfirmOpen && (
                <div className="users-section__modal-overlay" role="presentation">
                    <div className="users-section__modal users-section__modal--role-confirm" role="dialog" aria-modal="true" aria-labelledby="role-change-confirm-title">
                        <div className="users-section__modal-header users-section__modal-header--lined">
                            <div>
                                <h3 id="role-change-confirm-title">Confirm role change</h3>
                                <p>{getRoleChangeVerificationMessage()}</p>
                            </div>
                            <button
                                type="button"
                                className="users-section__modal-close"
                                onClick={() => setIsRoleChangeConfirmOpen(false)}
                                disabled={isSaving}
                                aria-label="Close confirmation"
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="users-section__role-confirm-body">
                            <div className="users-section__role-confirm-icon">
                                <FiAlertTriangle />
                            </div>
                            <div className="users-section__role-confirm-summary">
                                <span className="users-section__role-confirm-pill">Current: {normalizedCurrentRole}</span>
                                <span className="users-section__role-confirm-arrow">→</span>
                                <span className="users-section__role-confirm-pill users-section__role-confirm-pill--next">New: {draftData.role}</span>
                            </div>
                        </div>

                        <div className="users-section__form-actions users-section__form-actions--confirm">
                            <button
                                type="button"
                                className="users-section__secondary-btn"
                                onClick={() => setIsRoleChangeConfirmOpen(false)}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="users-section__submit-btn"
                                onClick={handleRoleChangeVerificationConfirm}
                                disabled={isSaving}
                            >
                                Confirm change
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}