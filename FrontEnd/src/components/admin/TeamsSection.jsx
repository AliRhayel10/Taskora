import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiSearch,
  FiPlus,
  FiMoreHorizontal,
  FiTrash2,
  FiBriefcase,
  FiX,
  FiEdit2,
  FiUser,
  FiCheckCircle,
  FiSlash,
} from "react-icons/fi";
import "../../assets/styles/admin/teams-section.css";

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

function getInitials(value) {
  const source = (value || "").trim();

  if (!source) {
    return "?";
  }

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function capitalizeWords(value) {
  return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isTeamLeaderRole(value) {
  const role = normalizeRole(value);
  return role === "team leader" || role === "teamleader";
}

function getUserProfileImage(user) {
  const rawValue =
    user?.profileImageUrl ||
    user?.ProfileImageUrl ||
    user?.imageUrl ||
    user?.ImageUrl ||
    user?.avatar ||
    user?.Avatar ||
    user?.profileImage ||
    user?.ProfileImage ||
    "";

  const value = String(rawValue || "").trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
}

function getResolvedTeamLeader(team, companyMembers) {
  if (!team || !Array.isArray(companyMembers) || companyMembers.length === 0) {
    if (team?.teamLeaderName) {
      return {
        userId: team.teamLeaderId || team.teamLeaderUserId || null,
        fullName: team.teamLeaderName,
        role: "Team Leader",
        profileImageUrl: team.teamLeaderProfileImage || "",
      };
    }

    return null;
  }

  const leaderId = String(team.teamLeaderId || team.teamLeaderUserId || "").trim();
  const memberIds = Array.isArray(team.memberIds)
    ? team.memberIds.map((id) => String(id))
    : [];

  if (leaderId) {
    const assignedLeader = companyMembers.find(
      (member) =>
        String(member.userId || member.UserId || member.id || member._id || "") === leaderId
    );

    if (assignedLeader) {
      return assignedLeader;
    }
  }

  const eligibleLeaders = companyMembers.filter((member) => {
    const memberId = String(member.userId || member.UserId || member.id || member._id || "");
    return memberIds.includes(memberId) && isTeamLeaderRole(member.role);
  });

  if (eligibleLeaders.length === 1) {
    return eligibleLeaders[0];
  }

  if (team?.teamLeaderName) {
    return {
      userId: team.teamLeaderId || team.teamLeaderUserId || null,
      fullName: team.teamLeaderName,
      role: "Team Leader",
      profileImageUrl: team.teamLeaderProfileImage || "",
    };
  }

  return null;
}

function getTotalTeamMembersCount(team) {
  if (typeof team?.memberCount === "number") {
    return team.memberCount;
  }

  if (Array.isArray(team?.memberIds)) {
    return team.memberIds.length;
  }

  return 0;
}

export default function TeamsSection({
  onOpenTeam,
  searchValue,
  onSearchChange,
}) {
  const [teams, setTeams] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [createLeaderSearchTerm, setCreateLeaderSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuTeamId, setActiveMenuTeamId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isStatusActive, setIsStatusActive] = useState(true);
  const [leaderImageErrors, setLeaderImageErrors] = useState({});
  const [createLeaderImageErrors, setCreateLeaderImageErrors] = useState({});

  const [teamForm, setTeamForm] = useState({
    teamName: "",
    description: "",
    teamLeaderId: "",
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    teamName: "",
    description: "",
    teamLeaderId: "",
    memberIds: [],
  });

  const isTopbarSearchControlled = typeof searchValue === "string";
  const effectiveSearchTerm = isTopbarSearchControlled ? searchValue : searchTerm;

  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;
  const menuRef = useRef(null);

  const handleLeaderImageError = (teamId) => {
    setLeaderImageErrors((prev) => ({
      ...prev,
      [teamId]: true,
    }));
  };

  const handleCreateLeaderImageError = (leaderId) => {
    setCreateLeaderImageErrors((prev) => ({
      ...prev,
      [leaderId]: true,
    }));
  };

  const fetchTeams = async () => {
    if (!companyId) {
      setErrorMessage("Company not found. Please sign in again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_BASE_URL}/api/teams/company/${companyId}`);
      const rawText = await response.text();

      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { message: rawText || "Server returned an invalid response." };
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to load teams.");
      }

      setTeams(
        Array.isArray(data)
          ? data.map((team) => ({
              ...team,
              memberIds: Array.isArray(team.memberIds) ? team.memberIds : [],
              memberCount:
                typeof team.memberCount === "number"
                  ? team.memberCount
                  : Array.isArray(team.memberIds)
                    ? team.memberIds.length
                    : 0,
            }))
          : []
      );
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      setErrorMessage(error.message || "Failed to load teams.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyMembers = async () => {
    if (!companyId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/teams/company/${companyId}/members`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load company members.");
      }

      setCompanyMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch company members:", error);
    }
  };

  const fetchTeamLeaders = async () => {
    if (!companyId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/teams/company/${companyId}/members?teamLeadersOnly=true`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load team leaders.");
      }

      const allMembers = Array.isArray(data) ? data : [];
      setTeamLeaders(allMembers.filter((member) => isTeamLeaderRole(member.role)));
    } catch (error) {
      console.error("Failed to fetch team leaders:", error);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchCompanyMembers();
    fetchTeamLeaders();
  }, [companyId]);

  useEffect(() => {
    const handleExternalUserUpdate = () => {
      fetchTeams();
      fetchCompanyMembers();
      fetchTeamLeaders();
    };

    window.addEventListener("taskora:user-updated", handleExternalUserUpdate);

    return () => {
      window.removeEventListener("taskora:user-updated", handleExternalUserUpdate);
    };
  }, [companyId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuTeamId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage, errorMessage]);

  const filteredTeams = useMemo(() => {
    const value = effectiveSearchTerm.trim().toLowerCase();

    if (!value) {
      return teams;
    }

    return teams.filter((team) => {
      return (
        (team.teamName || "").toLowerCase().includes(value) ||
        (team.description || "").toLowerCase().includes(value) ||
        (team.teamLeaderName || "").toLowerCase().includes(value)
      );
    });
  }, [effectiveSearchTerm, teams]);

  const resolvedTeams = useMemo(() => {
    return filteredTeams.map((team) => {
      const resolvedLeader = getResolvedTeamLeader(team, companyMembers);
      const resolvedLeaderName =
        resolvedLeader?.fullName ||
        resolvedLeader?.FullName ||
        resolvedLeader?.name ||
        team.teamLeaderName ||
        "";

      return {
        ...team,
        resolvedTeamLeader: resolvedLeader,
        resolvedTeamLeaderName: resolvedLeaderName,
        resolvedTeamLeaderImage: getUserProfileImage(resolvedLeader),
        totalMembersCount: getTotalTeamMembersCount(team),
      };
    });
  }, [filteredTeams, companyMembers]);

  const assignedActiveLeaderIds = useMemo(() => {
    return new Set(
      teams
        .filter((team) => team && team.isActive !== false)
        .map((team) => String(team.teamLeaderId || team.teamLeaderUserId || ""))
        .filter(Boolean)
    );
  }, [teams]);

  const assignedActiveMemberIds = useMemo(() => {
    return new Set(
      teams
        .filter((team) => team && team.isActive !== false)
        .flatMap((team) =>
          Array.isArray(team.memberIds)
            ? team.memberIds.map((id) => String(id))
            : []
        )
        .filter(Boolean)
    );
  }, [teams]);

  const filteredCreateTeamLeaders = useMemo(() => {
    const value = createLeaderSearchTerm.trim().toLowerCase();
    const selectedCreateLeaderId = String(teamForm.teamLeaderId || "");

    const leaders = companyMembers.filter((employee) => {
      const employeeId = String(employee.userId || employee.UserId || employee.id || "");

      if (!isTeamLeaderRole(employee.role)) {
        return false;
      }

      if (employeeId === selectedCreateLeaderId) {
        return true;
      }

      return (
        !assignedActiveLeaderIds.has(employeeId) &&
        !assignedActiveMemberIds.has(employeeId)
      );
    });

    if (!value) {
      return leaders;
    }

    return leaders.filter((employee) => {
      const fullName = (employee.fullName || employee.FullName || "").toLowerCase();
      const email = (employee.email || employee.Email || "").toLowerCase();
      const role = (employee.role || employee.Role || "").toLowerCase();
      const jobTitle = (
        employee.jobTitle ||
        employee.JobTitle ||
        employee.jobType ||
        employee.JobType ||
        ""
      ).toLowerCase();

      return (
        fullName.includes(value) ||
        email.includes(value) ||
        role.includes(value) ||
        jobTitle.includes(value)
      );
    });
  }, [
    companyMembers,
    createLeaderSearchTerm,
    assignedActiveLeaderIds,
    assignedActiveMemberIds,
    teamForm.teamLeaderId,
  ]);

  const isEditFormValid = editForm.teamName.trim() && editForm.description.trim();

  const openCreateModal = () => {
    setSuccessMessage("");
    setErrorMessage("");
    setTeamForm({ teamName: "", description: "", teamLeaderId: "", isActive: true });
    setCreateLeaderSearchTerm("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isSubmitting) return;
    setIsCreateModalOpen(false);
    setCreateLeaderSearchTerm("");
  };

  const openEditPanel = (team) => {
    setSelectedTeam(team);
    setSuccessMessage("");
    setErrorMessage("");
    setActiveMenuTeamId(null);

    setEditForm({
      teamName: team.teamName || "",
      description: team.description || "",
      teamLeaderId: team.teamLeaderId ? String(team.teamLeaderId) : "",
      memberIds: Array.isArray(team.memberIds)
        ? team.memberIds.map((id) => String(id))
        : [],
    });

    setIsStatusActive(
      typeof team.isActive === "boolean"
        ? team.isActive
        : typeof team.status === "boolean"
          ? team.status
          : true
    );
  };

  const closeEditPanel = () => {
    if (isSubmitting) return;
    setSelectedTeam(null);
    setEditForm({
      teamName: "",
      description: "",
      teamLeaderId: "",
      memberIds: [],
    });
  };

  const openDeleteModal = (team) => {
    setSelectedTeam(team);
    setSuccessMessage("");
    setErrorMessage("");
    setActiveMenuTeamId(null);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isSubmitting) return;
    setIsDeleteModalOpen(false);
    setSelectedTeam(null);
  };

  const handleFormChange = (field, value) => {
    setTeamForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleCreateLeader = (leaderId) => {
    const normalizedLeaderId = String(leaderId);

    setTeamForm((prev) => ({
      ...prev,
      teamLeaderId:
        String(prev.teamLeaderId || "") === normalizedLeaderId ? "" : normalizedLeaderId,
    }));
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();

    const cleanedForm = {
      teamName: teamForm.teamName.trim(),
      description: teamForm.description.trim(),
      teamLeaderId: String(teamForm.teamLeaderId || "").trim(),
      isActive: typeof teamForm.isActive === "boolean" ? teamForm.isActive : true,
    };

    if (!cleanedForm.teamName || !cleanedForm.description || !cleanedForm.teamLeaderId) {
      setErrorMessage("Team name, team description, and team leader are required.");
      return;
    }

    if (!companyId) {
      setErrorMessage("Company not found. Please sign in again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(`${API_BASE_URL}/api/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamName: cleanedForm.teamName,
          description: cleanedForm.description,
          companyId,
          teamLeaderUserId: Number(cleanedForm.teamLeaderId),
          isActive: cleanedForm.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create team.");
      }

      setSuccessMessage("Team created successfully.");
      setIsCreateModalOpen(false);
      setTeamForm({ teamName: "", description: "", teamLeaderId: "", isActive: true });
      await fetchTeams();
    } catch (error) {
      console.error("Failed to create team:", error);
      setErrorMessage(error.message || "Failed to create team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTeam = async (event) => {
    event.preventDefault();

    const cleanedForm = {
      teamName: editForm.teamName.trim(),
      description: editForm.description.trim(),
      teamLeaderId: String(editForm.teamLeaderId || "").trim(),
      memberIds: editForm.memberIds.map((id) => String(id)),
    };

    if (!selectedTeam?.teamId) {
      setErrorMessage("Team not found.");
      return;
    }

    if (!cleanedForm.teamName || !cleanedForm.description) {
      setErrorMessage("Team name and description are required.");
      return;
    }

    if (isStatusActive && !cleanedForm.teamLeaderId) {
      closeEditPanel();
      setErrorMessage("No team leader available. Assign a team leader before activating this team.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        teamName: cleanedForm.teamName,
        description: cleanedForm.description,
        companyId,
        teamLeaderId: cleanedForm.teamLeaderId ? Number(cleanedForm.teamLeaderId) : null,
        memberIds: cleanedForm.memberIds.map((id) => Number(id)),
        isActive: isStatusActive,
      };

      const response = await fetch(`${API_BASE_URL}/api/teams/${selectedTeam.teamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update team.");
      }

      setSuccessMessage("Team updated successfully.");
      await fetchTeams();
      closeEditPanel();
    } catch (error) {
      console.error("Failed to update team:", error);
      setErrorMessage(error.message || "Failed to update team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam?.teamId) {
      setErrorMessage("Team not found.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(`${API_BASE_URL}/api/teams/${selectedTeam.teamId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete team.");
      }

      setSuccessMessage("Team deleted successfully.");
      setIsDeleteModalOpen(false);
      setSelectedTeam(null);
      await fetchTeams();
    } catch (error) {
      console.error("Failed to delete team:", error);
      setErrorMessage(error.message || "Failed to delete team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInPortal = (content) => {
    if (typeof document === "undefined") {
      return null;
    }

    return createPortal(content, document.body);
  };

  return (
    <section className="teams-section">
      <div className="teams-section__title-row">
        <h2>Teams</h2>
        <div className="teams-section__title-line"></div>
      </div>

      <div className="teams-section__scroll">
        <div className="teams-section__toolbar teams-section__toolbar--align-end">
          <button
            type="button"
            className="teams-section__create-btn"
            onClick={openCreateModal}
          >
            <FiPlus />
            <span>Create Team</span>
          </button>
        </div>

        {successMessage && (
          <div className="teams-section__feedback teams-section__feedback--success teams-section__feedback--floating">
            <FiCheckCircle />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && !isCreateModalOpen && !isDeleteModalOpen && !selectedTeam && (
          <div className="teams-section__feedback teams-section__feedback--floating teams-section__feedback--floating-error">
            <FiSlash />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading && (
          <div className="teams-section__state-card">
            <p>Loading teams...</p>
          </div>
        )}

        {!isLoading && !errorMessage && filteredTeams.length === 0 && (
          <div className="teams-section__state-card">
            <div className="teams-section__state-icon">
              <FiBriefcase />
            </div>
            <h3>No teams yet</h3>
            <p>Created teams will appear here after they are saved in the backend.</p>
          </div>
        )}

        {!isLoading && resolvedTeams.length > 0 && (
          <div className="teams-section__grid">
            {resolvedTeams.map((team) => (
              <article key={team.teamId} className="teams-section__card teams-section__card--compact">
                <div className="teams-section__card-top">
                  <div className="teams-section__card-heading">
                    <div className="teams-section__card-title-row">
                      <button
                        type="button"
                        className="teams-section__title-link"
                        onClick={() => {
                          if (typeof onOpenTeam === "function") {
                            onOpenTeam(team);
                          }
                        }}
                      >
                        {team.teamName}
                      </button>
                    </div>
                    <p>{team.description || "No description added yet."}</p>
                  </div>

                  <div
                    className="teams-section__menu"
                    ref={activeMenuTeamId === team.teamId ? menuRef : null}
                  >
                    <div className="teams-section__menu-top">
                      <button
                        type="button"
                        className="teams-section__icon-btn"
                        aria-label={`More actions for ${team.teamName}`}
                        onClick={() =>
                          setActiveMenuTeamId((prev) =>
                            prev === team.teamId ? null : team.teamId
                          )
                        }
                      >
                        <FiMoreHorizontal />
                      </button>
                    </div>

                    <span
                      className={`teams-section__status-badge ${team.isActive ? "teams-section__status-badge--active" : "teams-section__status-badge--inactive"}`}
                      aria-label={team.isActive ? "Active" : "Inactive"}
                      title={team.isActive ? "Active" : "Inactive"}
                    >
                      {team.isActive ? <FiCheckCircle /> : <FiSlash />}
                    </span>

                    {activeMenuTeamId === team.teamId && (
                      <div className="teams-section__menu-dropdown">
                        <button
                          type="button"
                          className="teams-section__menu-item"
                          onClick={() => openEditPanel(team)}
                        >
                          <FiEdit2 />
                          <span>Edit Team</span>
                        </button>

                        <button
                          type="button"
                          className="teams-section__menu-item teams-section__menu-item--danger"
                          onClick={() => openDeleteModal(team)}
                        >
                          <FiTrash2 />
                          <span>Delete Team</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="teams-section__card-bottom">
                  <div className="teams-section__card-middle">
                    <div className="teams-section__meta">
                      {!team.isActive ? (
                        <div className="teams-section__leader-unavailable">
                          <span className="teams-section__leader-unavailable-icon">
                            <FiSlash />
                          </span>

                          <span className="teams-section__leader-unavailable-copy">
                            <strong>Unavailable</strong>
                            <small>Due to inactivity</small>
                          </span>
                        </div>
                      ) : team.resolvedTeamLeaderName ? (
                        <div className="teams-section__leader-summary">
                          <span className="teams-section__leader-avatar">
                            {team.resolvedTeamLeaderImage && !leaderImageErrors[team.teamId] ? (
                              <img
                                src={team.resolvedTeamLeaderImage}
                                alt={team.resolvedTeamLeaderName}
                                className="teams-section__leader-avatar-image"
                                onError={() => handleLeaderImageError(team.teamId)}
                              />
                            ) : (
                              <span className="teams-section__leader-avatar-fallback">
                                {getInitials(team.resolvedTeamLeaderName)}
                              </span>
                            )}
                          </span>

                          <span className="teams-section__leader-copy">
                            <strong>{team.resolvedTeamLeaderName}</strong>
                            <small>Team Leader</small>
                          </span>
                        </div>
                      ) : (
                        <span className="teams-section__badge">
                          No team leader assigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="teams-section__card-actions">
                    <div className="teams-section__members-actions">
                      <div className="teams-section__members-count">
                        <FiUser />
                        <span>
                          {team.totalMembersCount}{" "}
                          {team.totalMembersCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedTeam && !isDeleteModalOpen && renderInPortal(
        <div className="teams-section__modal-overlay" onClick={closeEditPanel}>
          <div
            className="teams-section__modal teams-section__modal--large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teams-section__modal-header teams-section__modal-header--lined">
              <div>
                <h3>Edit Team</h3>
                <p>Update team details and save them directly to the backend.</p>
              </div>

              <button
                type="button"
                className="teams-section__modal-close"
                onClick={closeEditPanel}
                aria-label="Close team edit form"
              >
                <FiX />
              </button>
            </div>

            {errorMessage && (
              <div className="teams-section__feedback teams-section__feedback--error">
                {errorMessage}
              </div>
            )}

            <form className="teams-section__page-form" onSubmit={handleUpdateTeam}>
              <div className="teams-section__form-group">
                <label htmlFor="editTeamName">
                  Team Name <span className="teams-section__required">*</span>
                </label>
                <input
                  id="editTeamName"
                  type="text"
                  value={editForm.teamName}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      teamName: capitalizeWords(event.target.value),
                    }))
                  }
                  placeholder="Team Name"
                  maxLength={100}
                />
              </div>

              <div className="teams-section__form-group">
                <label htmlFor="editTeamDescription">
                  Description <span className="teams-section__required">*</span>
                </label>
                <textarea
                  id="editTeamDescription"
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: capitalizeWords(event.target.value),
                    }))
                  }
                  placeholder="Enter a description for this team..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="teams-section__status-row">
                <label>Status</label>
                <button
                  type="button"
                  className={`teams-section__switch ${isStatusActive ? "teams-section__switch--active" : ""}`}
                  onClick={() => setIsStatusActive((prev) => !prev)}
                  aria-pressed={isStatusActive}
                >
                  <span className="teams-section__switch-thumb"></span>
                </button>
                <span className="teams-section__status-text">
                  {isStatusActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="teams-section__form-actions">
                <button
                  type="button"
                  className="teams-section__secondary-btn teams-section__secondary-btn--neutral"
                  onClick={closeEditPanel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="teams-section__submit-btn"
                  disabled={isSubmitting || !isEditFormValid}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateModalOpen && renderInPortal(
        <div className="teams-section__modal-overlay" onClick={closeCreateModal}>
          <div className="teams-section__modal" onClick={(event) => event.stopPropagation()}>
            <div className="teams-section__modal-header">
              <div>
                <h3>Create Team</h3>
                <p>Add a team name and short description.</p>
              </div>

              <button
                type="button"
                className="teams-section__modal-close"
                onClick={closeCreateModal}
                aria-label="Close create team form"
              >
                <FiX />
              </button>
            </div>

            {errorMessage && (
              <div className="teams-section__feedback teams-section__feedback--error">
                {errorMessage}
              </div>
            )}

            <form className="teams-section__form" onSubmit={handleCreateTeam}>
              <div className="teams-section__form-group">
                <label htmlFor="teamName">
                  Team Name <span className="teams-section__required">*</span>
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={teamForm.teamName}
                  onChange={(event) =>
                    handleFormChange("teamName", capitalizeWords(event.target.value))
                  }
                  placeholder="Enter team name"
                  maxLength={100}
                />
              </div>

              <div className="teams-section__form-group">
                <label htmlFor="teamDescription">
                  Team Description <span className="teams-section__required">*</span>
                </label>
                <textarea
                  id="teamDescription"
                  value={teamForm.description}
                  onChange={(event) =>
                    handleFormChange("description", capitalizeWords(event.target.value))
                  }
                  placeholder="Enter team description"
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="teams-section__form-group">
                <label>
                  Team Leader <span className="teams-section__required">*</span>
                </label>

                <div className="teams-section__member-picker">
                  <div className="teams-section__member-search">
                    <FiSearch />
                    <input
                      type="text"
                      value={createLeaderSearchTerm}
                      onChange={(event) => setCreateLeaderSearchTerm(event.target.value)}
                      placeholder="Search for a team leader..."
                    />
                  </div>

                  <div className="teams-section__member-table">
                    {filteredCreateTeamLeaders.length === 0 && (
                      <p className="teams-section__members-empty">
                        No team leaders found.
                      </p>
                    )}

                    {filteredCreateTeamLeaders.map((employee) => {
                      const employeeId = String(employee.userId || employee.UserId || employee.id || "");
                      const isChecked = String(teamForm.teamLeaderId || "") === employeeId;
                      const employeeImage = getUserProfileImage(employee);

                      return (
                        <label
                          key={`create-leader-${employeeId}`}
                          className="teams-section__member-row"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCreateLeader(employeeId)}
                          />

                          <span className="teams-section__member-avatar">
                            {employeeImage && !createLeaderImageErrors[employeeId] ? (
                              <img
                                src={employeeImage}
                                alt={employee.fullName || employee.FullName || employee.email}
                                className="teams-section__member-avatar-image"
                                onError={() => handleCreateLeaderImageError(employeeId)}
                              />
                            ) : (
                              <span className="teams-section__member-avatar-fallback">
                                {getInitials(employee.fullName || employee.FullName || employee.email)}
                              </span>
                            )}
                          </span>

                          <span className="teams-section__member-copy">
                            <strong>{employee.fullName || employee.FullName || employee.email}</strong>
                            <small>{employee.email}</small>
                          </span>

                          <span className="teams-section__member-tag">
                            Team Leader
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="teams-section__status-row">
                <label>Status</label>
                <button
                  type="button"
                  className={`teams-section__switch ${teamForm.isActive ? "teams-section__switch--active" : ""}`}
                  onClick={() =>
                    setTeamForm((prev) => ({
                      ...prev,
                      isActive: !prev.isActive,
                    }))
                  }
                  aria-pressed={teamForm.isActive}
                >
                  <span className="teams-section__switch-thumb"></span>
                </button>
                <span className="teams-section__status-text">
                  {teamForm.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="teams-section__form-actions">
                <button
                  type="button"
                  className="teams-section__secondary-btn teams-section__secondary-btn--neutral"
                  onClick={closeCreateModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="teams-section__submit-btn"
                  disabled={
                    isSubmitting ||
                    !teamForm.teamName.trim() ||
                    !teamForm.description.trim() ||
                    !String(teamForm.teamLeaderId || "").trim()
                  }
                >
                  {isSubmitting ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedTeam && renderInPortal(
        <div className="teams-section__modal-overlay" onClick={closeDeleteModal}>
          <div
            className="teams-section__modal teams-section__modal--small"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teams-section__modal-header">
              <div>
                <h3>Delete Team</h3>
                <p>
                  This action will remove <strong>{selectedTeam.teamName}</strong> and
                  remove all members assigned to this team.
                </p>
              </div>

              <button
                type="button"
                className="teams-section__modal-close"
                onClick={closeDeleteModal}
                aria-label="Close delete team dialog"
              >
                <FiX />
              </button>
            </div>

            {errorMessage && (
              <div className="teams-section__feedback teams-section__feedback--error">
                {errorMessage}
              </div>
            )}

            <div className="teams-section__form-actions">
              <button
                type="button"
                className="teams-section__secondary-btn"
                onClick={closeDeleteModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="teams-section__delete-btn"
                onClick={handleDeleteTeam}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}