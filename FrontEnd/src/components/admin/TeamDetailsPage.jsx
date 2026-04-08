import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiUser,
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

export default function TeamDetailsPage({ team, onBack }) {
  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;

  const [companyMembers, setCompanyMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamState, setTeamState] = useState(team || null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setTeamState(team || null);
  }, [team]);

  useEffect(() => {
    const fetchCompanyMembers = async () => {
      if (!companyId) {
        setCompanyMembers([]);
        setIsLoadingMembers(false);
        return;
      }

      try {
        setIsLoadingMembers(true);

        const response = await fetch(
          `${API_BASE_URL}/api/teams/company/${companyId}/members`
        );

        const data = await parseJsonResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to load company members.");
        }

        setCompanyMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch company members:", error);
        setCompanyMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchCompanyMembers();
  }, [companyId]);

  useEffect(() => {
    const memberIds = Array.isArray(teamState?.memberIds) ? teamState.memberIds : [];
    const leaderId = String(teamState?.teamLeaderId || teamState?.teamLeaderUserId || "");

    const resolvedMembers = memberIds.map((memberId) => {
      const foundMember = companyMembers.find(
        (member) => String(member.userId) === String(memberId)
      );

      return {
        userId: memberId,
        fullName: foundMember?.fullName || "Unknown Member",
        email: foundMember?.email || "No email available",
        jobType:
          foundMember?.jobType ||
          foundMember?.jobTitle ||
          "No job type available",
        role: String(memberId) === leaderId ? "Team Leader" : "Member",
        isActive: true,
      };
    });

    setMembers(resolvedMembers);
  }, [teamState, companyMembers]);

  useEffect(() => {
    if (!feedbackMessage) return;

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage("");
      setFeedbackType("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackMessage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(members.length / MEMBERS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [members.length, currentPage]);

  const title = teamState?.teamName || "Team";

  const closeDeleteModal = () => {
    if (isSaving) return;
    setMemberToDelete(null);
  };

  const openDeleteModal = (member) => {
    setMemberToDelete(member);
  };

  const saveTeamMembersToBackend = async (nextMembers) => {
    if (!teamState?.teamId) {
      throw new Error("Team not found.");
    }

    const currentLeaderId = String(
      teamState?.teamLeaderId || teamState?.teamLeaderUserId || ""
    );

    const memberIds = nextMembers.map((member) => Number(member.userId));
    const nextLeaderStillExists = nextMembers.some(
      (member) => String(member.userId) === currentLeaderId
    );

    const payload = {
      teamName: teamState.teamName || "",
      description: teamState.description || "",
      companyId,
      teamLeaderId:
        nextLeaderStillExists && currentLeaderId ? Number(currentLeaderId) : null,
      memberIds,
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
      teamLeaderId:
        updatedTeam.teamLeaderId ??
        updatedTeam.teamLeaderUserId ??
        (nextLeaderStillExists && currentLeaderId ? Number(currentLeaderId) : null),
      teamLeaderUserId:
        updatedTeam.teamLeaderUserId ??
        updatedTeam.teamLeaderId ??
        (nextLeaderStillExists && currentLeaderId ? Number(currentLeaderId) : null),
      memberIds: Array.isArray(updatedTeam.memberIds)
        ? updatedTeam.memberIds
        : memberIds,
      isActive:
        typeof updatedTeam.isActive === "boolean"
          ? updatedTeam.isActive
          : prev?.isActive,
    }));
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

      await saveTeamMembersToBackend(nextMembers);
      setMembers(nextMembers);
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

      setMembers(nextMembers);
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

  const totalMembers = members.length;
  const totalPages = Math.max(1, Math.ceil(totalMembers / MEMBERS_PER_PAGE));
  const startIndex = totalMembers === 0 ? 0 : (currentPage - 1) * MEMBERS_PER_PAGE;
  const endIndex = Math.min(startIndex + MEMBERS_PER_PAGE, totalMembers);
  const paginatedMembers = members.slice(startIndex, endIndex);

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, currentPage - 2),
    Math.min(totalPages, Math.max(0, currentPage - 2) + 5)
  );

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
              ? "teams-section__feedback teams-section__feedback--error"
              : "teams-section__feedback teams-section__feedback--success"
          }
        >
          {feedbackMessage}
        </div>
      )}

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

        {!isLoadingMembers && totalMembers > 0 && (
          <div className="users-section__pagination">
            <div className="users-section__pagination-info">
              Showing {startIndex + 1} to {endIndex} of {totalMembers} members
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