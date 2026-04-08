import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiSlash,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import "../../assets/styles/admin/teams-section.css";
import "../../assets/styles/admin/team-details-page.css";

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

  const title = teamState?.teamName || "Team";
  const teamStatus =
    typeof teamState?.isActive === "boolean" ? teamState.isActive : true;

  const teamLeaderName = useMemo(() => {
    const leaderId = String(
      teamState?.teamLeaderId || teamState?.teamLeaderUserId || ""
    );
    const foundLeader = companyMembers.find(
      (member) => String(member.userId) === leaderId
    );

    return (
      foundLeader?.fullName ||
      teamState?.teamLeaderName ||
      "No team leader assigned"
    );
  }, [companyMembers, teamState]);

  const membersCount = members.length;

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
      teamLeaderId: nextLeaderStillExists && currentLeaderId ? Number(currentLeaderId) : null,
      memberIds,
      isActive: teamStatus,
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

  const handleDeleteMember = async (memberId) => {
    const memberToDelete = members.find(
      (member) => String(member.userId) === String(memberId)
    );

    if (!memberToDelete) {
      return;
    }

    const isConfirmed = window.confirm(
      `Are you sure you want to remove ${memberToDelete.fullName} from this team?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      const nextMembers = members.filter(
        (member) => String(member.userId) !== String(memberId)
      );

      await saveTeamMembersToBackend(nextMembers);
      setMembers(nextMembers);
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

      <div className="team-details-page__meta-row">
        <div className="team-details-page__meta-chip">
          {teamStatus ? (
            <span className="teams-section__status-badge teams-section__status-badge--active">
              <FiCheckCircle />
            </span>
          ) : (
            <span className="teams-section__status-badge teams-section__status-badge--inactive">
              <FiSlash />
            </span>
          )}
          <span>{teamStatus ? "Active" : "Inactive"}</span>
        </div>

        <div className="team-details-page__meta-chip">
          <span className="teams-section__leader-avatar">
            {getInitials(teamLeaderName)}
          </span>
          <span>{teamLeaderName}</span>
        </div>

        <div className="team-details-page__meta-chip">
          <FiUser />
          <span>
            {membersCount} {membersCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>

      <div className="users-section__table-card team-details-page__table-card">

        <div className="users-section__table-wrap team-details-page__table-wrap">
          <table className="users-section__table team-details-page__table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th className="team-details-page__actions-col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoadingMembers ? (
                <tr>
                  <td colSpan="4">
                    <div className="team-details-page__empty">
                      <span>Loading members...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="team-details-page__empty">
                      <FiUser />
                      <span>No members found for this team.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
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
                          onClick={() => handleDeleteMember(member.userId)}
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
      </div>
    </section>
  );
}