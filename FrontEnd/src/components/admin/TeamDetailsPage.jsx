import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "../../assets/styles/admin/teams-section.css";
import "../../assets/styles/admin/team-details-page.css";
import "../../assets/styles/admin/users-section.css";

const API_BASE_URL = "http://localhost:5000";
const MEMBERS_PER_PAGE = 5;

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error("Failed to read user from localStorage.", error);
    return null;
  }
}

function getTeamMembersCacheKey(teamId) {
  return `team-details-members-${teamId}`;
}

function readCachedTeamMembers(teamId) {
  if (!teamId) {
    return [];
  }

  try {
    const rawValue = localStorage.getItem(getTeamMembersCacheKey(teamId));
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.error("Failed to read cached team members.", error);
    return [];
  }
}

function writeCachedTeamMembers(teamId, members) {
  if (!teamId) {
    return;
  }

  try {
    localStorage.setItem(
      getTeamMembersCacheKey(teamId),
      JSON.stringify(Array.isArray(members) ? members : [])
    );
  } catch (error) {
    console.error("Failed to write cached team members.", error);
  }
}

async function parseJsonResponse(response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { message: rawText || "Server returned an invalid response." };
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

function isEmployeeRole(value) {
  return normalizeRole(value) === "employee";
}

function isSelectableMemberRole(value) {
  return isEmployeeRole(value) || isTeamLeaderRole(value);
}

export default function TeamDetailsPage({ team, onBack }) {
  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;

  const [companyMembers, setCompanyMembers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamState, setTeamState] = useState(team || null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberManagementMode, setMemberManagementMode] = useState("members");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [editForm, setEditForm] = useState({
    teamLeaderId: "",
    memberIds: [],
  });

  useEffect(() => {
    setTeamState(team || null);
    setCurrentPage(1);
  }, [team]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) {
        setCompanyMembers([]);
        setAllTeams([]);
        setIsLoadingMembers(false);
        return;
      }

      try {
        setIsLoadingMembers(true);

        const [membersResponse, teamsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/teams/company/${companyId}/members`),
          fetch(`${API_BASE_URL}/api/teams/company/${companyId}`),
        ]);

        const [membersData, teamsData] = await Promise.all([
          parseJsonResponse(membersResponse),
          parseJsonResponse(teamsResponse),
        ]);

        if (!membersResponse.ok) {
          throw new Error(membersData.message || "Failed to load company members.");
        }

        if (!teamsResponse.ok) {
          throw new Error(teamsData.message || "Failed to load teams.");
        }

        setCompanyMembers(Array.isArray(membersData) ? membersData : []);
        setAllTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch (error) {
        console.error("Failed to fetch team details data:", error);
        setCompanyMembers([]);
        setAllTeams([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchData();
  }, [companyId]);

  useEffect(() => {
    const teamId = teamState?.teamId;
    const activeMemberIds = Array.isArray(teamState?.memberIds) ? teamState.memberIds : [];
    const leaderId = String(teamState?.teamLeaderId || teamState?.teamLeaderUserId || "");
    const cachedMembers = readCachedTeamMembers(teamId);

    const cachedMembersMap = new Map(
      cachedMembers.map((member) => [String(member.userId), member])
    );

    const orderedIds = [
      ...cachedMembers.map((member) => String(member.userId)),
      ...activeMemberIds.map((id) => String(id)),
    ].filter((value, index, array) => array.indexOf(value) === index);

    const resolvedMembers = orderedIds.map((memberId) => {
      const numericMemberId = Number(memberId);
      const foundMember = companyMembers.find(
        (member) => String(member.userId) === String(memberId)
      );
      const cachedMember = cachedMembersMap.get(String(memberId));
      const isActive = activeMemberIds.some((id) => String(id) === String(memberId))
        ? true
        : typeof cachedMember?.isActive === "boolean"
          ? cachedMember.isActive
          : false;

      return {
        userId: numericMemberId,
        fullName:
          foundMember?.fullName ||
          cachedMember?.fullName ||
          "Unknown Member",
        email:
          foundMember?.email ||
          cachedMember?.email ||
          "No email available",
        jobType:
          foundMember?.jobType ||
          foundMember?.jobTitle ||
          cachedMember?.jobType ||
          "No job type available",
        role: String(memberId) === leaderId ? "Team Leader" : "Member",
        isActive,
      };
    });

    setMembers(resolvedMembers);
    writeCachedTeamMembers(teamId, resolvedMembers);
  }, [teamState, companyMembers]);

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

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return members;
    }

    return members.filter((member) => {
      return (
        member.fullName.toLowerCase().includes(normalizedSearch) ||
        member.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [members, searchTerm]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredMembers.length]);

  const title = teamState?.teamName || "Team";

  const teamLeaderId = String(
    teamState?.teamLeaderId || teamState?.teamLeaderUserId || ""
  );

  const teamLeader = members.find(
    (member) => String(member.userId) === teamLeaderId
  );

  const totalMembers = members.length;
  const activeMembersCount = members.filter((member) => member.isActive).length;
  const inactiveMembersCount = members.filter((member) => !member.isActive).length;

  const totalFilteredMembers = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredMembers / MEMBERS_PER_PAGE));
  const startIndex =
    totalFilteredMembers === 0 ? 0 : (currentPage - 1) * MEMBERS_PER_PAGE;
  const endIndex = Math.min(startIndex + MEMBERS_PER_PAGE, totalFilteredMembers);
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, currentPage - 2),
    Math.min(totalPages, Math.max(0, currentPage - 2) + 5)
  );

  const closeDeleteModal = () => {
    if (isSaving) {
      return;
    }
    setMemberToDelete(null);
  };

  const openDeleteModal = (member) => {
    setMemberToDelete(member);
  };

  const openMembersModal = (mode = "members") => {
    const activeMemberIds = Array.isArray(teamState?.memberIds)
      ? teamState.memberIds.map((id) => String(id))
      : [];

    const currentLeaderId = teamLeaderId || "";

    const mergedMemberIds = currentLeaderId
      ? Array.from(new Set([...activeMemberIds, currentLeaderId]))
      : activeMemberIds;

    setEditForm({
      teamLeaderId: currentLeaderId,
      memberIds: mergedMemberIds,
    });
    setMemberManagementMode(mode);
    setMemberSearchTerm("");
    setLeaderSearchTerm("");
    setIsMembersModalOpen(true);
  };

  const closeMembersModal = () => {
    if (isSaving) {
      return;
    }
    setIsMembersModalOpen(false);
    setMemberManagementMode("members");
    setMemberSearchTerm("");
    setLeaderSearchTerm("");
  };

  const saveTeamMembersToBackend = async (nextMembers) => {
    if (!teamState?.teamId) {
      throw new Error("Team not found.");
    }

    const activeMembers = nextMembers.filter((member) => member.isActive);
    const activeLeader = activeMembers.find((member) => member.role === "Team Leader");

    if (teamState?.isActive !== false && !activeLeader) {
      throw new Error(
        "No team leader available. Assign a team leader before activating this team."
      );
    }

    const payload = {
      teamName: teamState.teamName || "",
      description: teamState.description || "",
      companyId,
      teamLeaderId: activeLeader ? Number(activeLeader.userId) : null,
      memberIds: activeMembers.map((member) => Number(member.userId)),
      isActive:
        typeof teamState?.isActive === "boolean" ? teamState.isActive : true,
    };

    const response = await fetch(`${API_BASE_URL}/api/teams/${teamState.teamId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to update team members.");
    }

    const updatedTeam = data.team || data;

    setTeamState((prev) => ({
      ...prev,
      ...updatedTeam,
      teamLeaderId: activeLeader ? Number(activeLeader.userId) : null,
      teamLeaderUserId: activeLeader ? Number(activeLeader.userId) : null,
      memberIds: activeMembers.map((member) => Number(member.userId)),
    }));

    const persistedMembers = nextMembers.map((member) => ({
      ...member,
      role:
        activeLeader && String(member.userId) === String(activeLeader.userId)
          ? "Team Leader"
          : "Member",
    }));

    writeCachedTeamMembers(teamState?.teamId, persistedMembers);

    return persistedMembers;
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) {
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      const nextMembers = members.filter(
        (member) => String(member.userId) !== String(memberToDelete.userId)
      );

      const persistedMembers = await saveTeamMembersToBackend(nextMembers);
      setMembers(persistedMembers);
      setMemberToDelete(null);

      setFeedbackType("success");
      setFeedbackMessage("Member removed from team successfully.");
    } catch (error) {
      console.error("Failed to delete member from team:", error);
      setFeedbackType("error");
      setFeedbackMessage(error.message || "Failed to remove member from team.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMemberStatus = async (memberId) => {
    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      const nextMembers = members.map((member) =>
        String(member.userId) === String(memberId)
          ? { ...member, isActive: !member.isActive }
          : member
      );

      const persistedMembers = await saveTeamMembersToBackend(nextMembers);
      setMembers(persistedMembers);

      setFeedbackType("success");
      setFeedbackMessage("Member status updated.");
    } catch (error) {
      console.error("Failed to update member status:", error);
      setFeedbackType("error");
      setFeedbackMessage(error.message || "Failed to update member status.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTeamLeaders = useMemo(() => {
    const value = leaderSearchTerm.trim().toLowerCase();
    const currentTeamId = String(teamState?.teamId || "");
    const selectedEditLeaderId = String(editForm.teamLeaderId || "");

    const leaders = companyMembers.filter((employee) => {
      const employeeId = String(employee.userId || "");

      if (!isTeamLeaderRole(employee.role)) {
        return false;
      }

      if (employeeId === selectedEditLeaderId) {
        return true;
      }

      const isAssignedToAnotherActiveTeam = allTeams.some((item) => {
        if (!item || item.isActive === false) {
          return false;
        }

        const itemTeamId = String(item.teamId || "");
        const itemLeaderId = String(item.teamLeaderId || item.teamLeaderUserId || "");

        return itemTeamId !== currentTeamId && itemLeaderId === employeeId;
      });

      return !isAssignedToAnotherActiveTeam;
    });

    if (!value) {
      return leaders;
    }

    return leaders.filter((employee) => {
      const fullName = (employee.fullName || "").toLowerCase();
      const email = (employee.email || "").toLowerCase();
      const role = (employee.role || "").toLowerCase();
      const jobTitle = (employee.jobTitle || employee.jobType || "").toLowerCase();

      return (
        fullName.includes(value) ||
        email.includes(value) ||
        role.includes(value) ||
        jobTitle.includes(value)
      );
    });
  }, [companyMembers, leaderSearchTerm, allTeams, teamState, editForm.teamLeaderId]);

  const filteredEmployees = useMemo(() => {
    const value = memberSearchTerm.trim().toLowerCase();
    const currentTeamId = String(teamState?.teamId || "");
    const selectedLeaderId = String(editForm.teamLeaderId || "");

    const employees = companyMembers.filter((employee) => {
      const employeeId = String(employee.userId || "");

      if (!isSelectableMemberRole(employee.role) || isTeamLeaderRole(employee.role)) {
        return false;
      }

      if (employeeId === selectedLeaderId) {
        return false;
      }

      const isAssignedToAnotherActiveTeam = allTeams.some((item) => {
        if (!item || item.isActive === false) {
          return false;
        }

        const itemTeamId = String(item.teamId || "");
        const itemLeaderId = String(item.teamLeaderId || item.teamLeaderUserId || "");
        const itemMemberIds = Array.isArray(item.memberIds)
          ? item.memberIds.map((id) => String(id))
          : [];

        return (
          itemTeamId !== currentTeamId &&
          (itemLeaderId === employeeId || itemMemberIds.includes(employeeId))
        );
      });

      return !isAssignedToAnotherActiveTeam;
    });

    if (!value) {
      return employees;
    }

    return employees.filter((employee) => {
      const fullName = (employee.fullName || "").toLowerCase();
      const email = (employee.email || "").toLowerCase();
      const role = (employee.role || "").toLowerCase();
      const jobTitle = (employee.jobTitle || employee.jobType || "").toLowerCase();

      return (
        fullName.includes(value) ||
        email.includes(value) ||
        role.includes(value) ||
        jobTitle.includes(value)
      );
    });
  }, [companyMembers, memberSearchTerm, allTeams, teamState, editForm.teamLeaderId]);

  const handleToggleMember = (memberId) => {
    const normalizedMemberId = String(memberId);

    setEditForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(normalizedMemberId)
        ? prev.memberIds.filter((id) => id !== normalizedMemberId)
        : [...prev.memberIds, normalizedMemberId],
    }));
  };

  const handleToggleLeaderInsideMembers = (leaderId) => {
    const normalizedLeaderId = String(leaderId);

    setEditForm((prev) => {
      const currentLeaderId = String(prev.teamLeaderId || "");
      const nextLeaderId = currentLeaderId === normalizedLeaderId ? "" : normalizedLeaderId;

      const leaderIds = new Set(
        filteredTeamLeaders.map((leader) => String(leader.userId))
      );

      const memberIdsWithoutLeaderRows = prev.memberIds.filter(
        (id) => !leaderIds.has(String(id))
      );

      return {
        ...prev,
        teamLeaderId: nextLeaderId,
        memberIds: nextLeaderId
          ? Array.from(new Set([...memberIdsWithoutLeaderRows, nextLeaderId]))
          : memberIdsWithoutLeaderRows,
      };
    });
  };

  const handleSaveMembers = async () => {
    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      const selectedIds = editForm.memberIds.map((id) => String(id));
      const selectedLeaderId = String(editForm.teamLeaderId || "");
      const currentActiveIds = new Set(
        (Array.isArray(teamState?.memberIds) ? teamState.memberIds : []).map((id) => String(id))
      );

      const preservedInactiveMembers = members.filter(
        (member) =>
          !currentActiveIds.has(String(member.userId)) &&
          !selectedIds.includes(String(member.userId))
      );

      const selectedMembers = selectedIds.map((id) => {
        const existingMember =
          members.find((member) => String(member.userId) === String(id)) ||
          companyMembers.find((member) => String(member.userId) === String(id));

        return {
          userId: Number(id),
          fullName: existingMember?.fullName || "Unknown Member",
          email: existingMember?.email || "No email available",
          jobType:
            existingMember?.jobType ||
            existingMember?.jobTitle ||
            "No job type available",
          role: String(id) === selectedLeaderId ? "Team Leader" : "Member",
          isActive: true,
        };
      });

      const nextMembers = [...selectedMembers, ...preservedInactiveMembers];
      const persistedMembers = await saveTeamMembersToBackend(nextMembers);
      setMembers(persistedMembers);
      setIsMembersModalOpen(false);
      setMemberManagementMode("members");

      setFeedbackType("success");
      setFeedbackMessage("Members updated successfully.");
    } catch (error) {
      console.error("Failed to update team members:", error);
      setFeedbackType("error");
      setFeedbackMessage(error.message || "Failed to update team members.");
    } finally {
      setIsSaving(false);
    }
  };

  const membersModalTitle =
    memberManagementMode === "members"
      ? "Add Members"
      : "Manage Leader";

  const membersModalDescription =
    memberManagementMode === "members"
      ? "Search and add members to this team."
      : "Choose the team leader for this team.";

  return (
    <section className="team-details-page">
      <div className="team-details-page__title-row">
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

        <h2>{title}</h2>
        <div className="team-details-page__title-line"></div>
      </div>

      {feedbackMessage && (
        <div
          className={
            feedbackType === "error"
              ? "teams-section__feedback teams-section__feedback--floating teams-section__feedback--floating-error"
              : "teams-section__feedback teams-section__feedback--success teams-section__feedback--floating"
          }
        >
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="team-details-page__summary-grid">
        <div className="team-details-page__summary-card">
          <span className="team-details-page__summary-label">Total Members</span>
          <div className="team-details-page__summary-value">
            <FiUsers />
            <strong>{totalMembers}</strong>
          </div>
        </div>

        <div className="team-details-page__summary-card">
          <span className="team-details-page__summary-label">Active Members</span>
          <div className="team-details-page__summary-value">
            <span className="team-details-page__summary-dot team-details-page__summary-dot--active"></span>
            <strong>{activeMembersCount}</strong>
          </div>
        </div>

        <div className="team-details-page__summary-card">
          <span className="team-details-page__summary-label">Inactive Members</span>
          <div className="team-details-page__summary-value">
            <span className="team-details-page__summary-dot team-details-page__summary-dot--inactive"></span>
            <strong>{inactiveMembersCount}</strong>
          </div>
        </div>

        <div className="team-details-page__summary-card team-details-page__summary-card--leader">
          <span className="team-details-page__summary-label">Current Team Leader</span>
          <div className="team-details-page__leader-highlight">
            <span className="users-section__avatar">
              {getInitials(teamLeader?.fullName || "TL")}
            </span>

            <div className="team-details-page__leader-highlight-copy">
              <strong>{teamLeader?.fullName || "No team leader assigned"}</strong>
              <small>{teamLeader?.email || "Leader unavailable"}</small>
            </div>
          </div>
        </div>
      </div>

      <div className="team-details-page__toolbar">
        <div className="users-section__search team-details-page__search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="team-details-page__toolbar-actions">
          <button
            type="button"
            className="teams-section__members-btn"
            onClick={() => openMembersModal("members")}
          >
            <FiPlus />
            <span>Add Member</span>
          </button>

          <button
            type="button"
            className="teams-section__members-btn"
            onClick={() => openMembersModal("leader")}
          >
            <FiUser />
            <span>Manage Leader</span>
          </button>
        </div>
      </div>

      <div className="users-section__table-card team-details-page__table-card">
        <div className="users-section__table-wrap team-details-page__table-wrap">
          <table className="users-section__table team-details-page__table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Job Type</th>
                <th>Role</th>
                <th>Status</th>
                <th className="team-details-page__actions-col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoadingMembers ? (
                <tr>
                  <td colSpan="5">
                    <div className="team-details-page__empty">
                      <span>Loading members...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="team-details-page__empty">
                      <FiUser />
                      <span>No members found for this team.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <div className="users-section__user-cell">
                        <span className="users-section__avatar">
                          {getInitials(member.fullName || member.email)}
                        </span>

                        <span className="users-section__user-details">
                          <strong>{member.fullName}</strong>
                          <small>{member.email}</small>
                        </span>
                      </div>
                    </td>

                    <td>{member.jobType}</td>

                    <td>
                      <span
                        className={`team-details-page__role-badge ${
                          member.role === "Team Leader"
                            ? "team-details-page__role-badge--leader"
                            : "team-details-page__role-badge--member"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`team-details-page__status-pill ${
                          member.isActive
                            ? "team-details-page__status-pill--active"
                            : "team-details-page__status-pill--inactive"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="team-details-page__row-actions">
                        <button
                          type="button"
                          className={`teams-section__switch ${
                            member.isActive ? "teams-section__switch--active" : ""
                          }`}
                          onClick={() => handleToggleMemberStatus(member.userId)}
                          aria-pressed={member.isActive}
                          title={member.isActive ? "Set inactive" : "Set active"}
                          disabled={isSaving}
                        >
                          <span className="teams-section__switch-thumb"></span>
                        </button>

                        <button
                          type="button"
                          className="team-details-page__delete-btn"
                          onClick={() => openDeleteModal(member)}
                          title="Delete member"
                          disabled={isSaving}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoadingMembers && totalFilteredMembers > 0 && (
          <div className="users-section__pagination">
            <div className="users-section__pagination-info">
              {startIndex + 1} - {endIndex} of {totalFilteredMembers} members
            </div>

            <div className="users-section__pagination-controls">
              <button
                type="button"
                className="users-section__page-btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft />
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`users-section__page-btn users-section__page-btn--number ${
                    currentPage === page ? "users-section__page-btn--active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="users-section__page-btn"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {isMembersModalOpen && (
        <div className="teams-section__modal-overlay" onClick={closeMembersModal}>
          <div
            className="teams-section__modal teams-section__modal--large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teams-section__modal-header teams-section__modal-header--lined">
              <div>
                <h3>{membersModalTitle}</h3>
                <p>{membersModalDescription}</p>
              </div>

              <button
                type="button"
                className="teams-section__modal-close"
                onClick={closeMembersModal}
                aria-label="Close members modal"
              >
                <FiX />
              </button>
            </div>

            <div className="teams-section__form">
              {memberManagementMode === "leader" && (
                <div className="teams-section__form-group">
                  <label>
                    Team Leader <span className="teams-section__required">*</span>
                  </label>
                  <p className="teams-section__field-description">
                    Select one leader to manage this team.
                  </p>

                  <div className="teams-section__member-picker">
                    <div className="teams-section__member-search">
                      <FiSearch />
                      <input
                        type="text"
                        value={leaderSearchTerm}
                        onChange={(event) => setLeaderSearchTerm(event.target.value)}
                        placeholder="Search for a team leader..."
                      />
                    </div>

                    <div className="teams-section__member-table">
                      {filteredTeamLeaders.length === 0 && (
                        <p className="teams-section__members-empty">
                          No matching team leaders found.
                        </p>
                      )}

                      {filteredTeamLeaders.map((employee) => {
                        const employeeId = String(employee.userId);
                        const isChecked = String(editForm.teamLeaderId || "") === employeeId;

                        return (
                          <label
                            key={`leader-${employee.userId}`}
                            className="teams-section__member-row"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleLeaderInsideMembers(employeeId)}
                            />

                            <span className="teams-section__member-avatar">
                              {getInitials(employee.fullName || employee.email)}
                            </span>

                            <span className="teams-section__member-copy">
                              <strong>{employee.fullName || employee.email}</strong>
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
              )}

              {memberManagementMode === "members" && (
                <div className="teams-section__form-group">
                  <label>
                    Members <span className="teams-section__required">*</span>
                  </label>
                  <p className="teams-section__field-description">
                    Select one or more members to add to this team.
                  </p>

                  <div className="teams-section__member-picker">
                    <div className="teams-section__member-search">
                      <FiSearch />
                      <input
                        type="text"
                        value={memberSearchTerm}
                        onChange={(event) => setMemberSearchTerm(event.target.value)}
                        placeholder="Search any member in the company..."
                      />
                    </div>

                    <div className="teams-section__member-table">
                      {filteredEmployees.length === 0 && (
                        <p className="teams-section__members-empty">
                          No matching members found.
                        </p>
                      )}

                      {filteredEmployees.map((employee) => {
                        const employeeId = String(employee.userId);
                        const isChecked = editForm.memberIds.includes(employeeId);
                        const modalLeaderId = String(editForm.teamLeaderId || "");
                        const isLeader = employeeId === modalLeaderId;

                        return (
                          <label
                            key={employee.userId}
                            className="teams-section__member-row"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                handleToggleMember(employeeId);
                                if (String(editForm.teamLeaderId || "") === employeeId) {
                                  setEditForm((prev) => ({
                                    ...prev,
                                    teamLeaderId: "",
                                  }));
                                }
                              }}
                            />

                            <span className="teams-section__member-avatar">
                              {getInitials(employee.fullName || employee.email)}
                            </span>

                            <span className="teams-section__member-copy">
                              <strong>{employee.fullName || employee.email}</strong>
                              <small>{employee.email}</small>
                            </span>

                            {isLeader && (
                              <span className="teams-section__member-tag">
                                Team Leader
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="teams-section__form-actions">
                <button
                  type="button"
                  className="teams-section__secondary-btn teams-section__secondary-btn--neutral"
                  onClick={closeMembersModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="teams-section__submit-btn"
                  onClick={handleSaveMembers}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {memberToDelete && (
        <div className="teams-section__modal-overlay" onClick={closeDeleteModal}>
          <div
            className="teams-section__modal teams-section__modal--small"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teams-section__modal-header">
              <div>
                <h3>Delete Member</h3>
                <p>
                  This action will remove <strong>{memberToDelete.fullName}</strong> from
                  this team.
                </p>
              </div>

              <button
                type="button"
                className="teams-section__modal-close"
                onClick={closeDeleteModal}
                aria-label="Close delete member dialog"
              >
                <FiX />
              </button>
            </div>

            <div className="teams-section__form-actions">
              <button
                type="button"
                className="teams-section__secondary-btn"
                onClick={closeDeleteModal}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="teams-section__delete-btn"
                onClick={handleConfirmDeleteMember}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}