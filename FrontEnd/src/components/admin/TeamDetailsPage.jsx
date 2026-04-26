import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiEdit2,
  FiUser,
  FiUsers,
  FiX,
  FiShield,
  FiActivity,
  FiUserCheck,
} from "react-icons/fi";
import "../../assets/styles/admin/teams-section.css";
import "../../assets/styles/admin/team-details-page.css";
import "../../assets/styles/admin/users-section.css";

const API_BASE_URL = "http://localhost:5000";
const MIN_MEMBERS_PER_PAGE = 1;

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

function getCompanyMemberId(member) {
  return String(member?.userId || member?.id || member?.UserId || "");
}

function compareTextValues(firstValue, secondValue, direction = "asc") {
  const normalizedFirst = String(firstValue || "").trim().toLowerCase();
  const normalizedSecond = String(secondValue || "").trim().toLowerCase();
  const result = normalizedFirst.localeCompare(normalizedSecond);
  return direction === "asc" ? result : -result;
}

function compareRoleValues(firstRole, secondRole, direction = "asc") {
  const rolePriority = {
    employee: 1,
    "team leader": 2,
    teamleader: 2,
  };

  const normalizedFirst = normalizeRole(firstRole);
  const normalizedSecond = normalizeRole(secondRole);

  const firstPriority = rolePriority[normalizedFirst] ?? 99;
  const secondPriority = rolePriority[normalizedSecond] ?? 99;

  if (firstPriority !== secondPriority) {
    return direction === "asc"
      ? firstPriority - secondPriority
      : secondPriority - firstPriority;
  }

  return compareTextValues(normalizedFirst, normalizedSecond, direction);
}

function compareStatusValues(firstStatus, secondStatus, direction = "asc") {
  const statusPriority = {
    active: 1,
    inactive: 2,
  };

  const normalizedFirst = String(firstStatus || "").trim().toLowerCase();
  const normalizedSecond = String(secondStatus || "").trim().toLowerCase();

  const firstPriority = statusPriority[normalizedFirst] ?? 99;
  const secondPriority = statusPriority[normalizedSecond] ?? 99;

  if (firstPriority !== secondPriority) {
    return direction === "asc"
      ? firstPriority - secondPriority
      : secondPriority - firstPriority;
  }

  return compareTextValues(normalizedFirst, normalizedSecond, direction);
}

function normalizeTasksResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getTaskId(task) {
  return task?.taskId ?? task?.TaskId ?? task?.id ?? task?.Id ?? null;
}

function getTaskAssigneeId(task) {
  return String(
    task?.assignedToUserId ??
      task?.AssignedToUserId ??
      task?.assignedUserId ??
      task?.AssignedUserId ??
      task?.assigneeId ??
      task?.AssigneeId ??
      task?.employeeId ??
      task?.EmployeeId ??
      task?.memberId ??
      task?.MemberId ??
      task?.userId ??
      task?.UserId ??
      task?.assignedTo?.userId ??
      task?.assignedUser?.userId ??
      ""
  );
}

async function updateTaskAssignmentOnBackend(task, nextAssigneeId) {
  const taskId = getTaskId(task);

  if (!taskId) {
    throw new Error("Failed to identify one of the assigned tasks.");
  }

  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/assignee`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assignedToUserId: nextAssigneeId,
    }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || data?.success === false) {
    throw new Error(data.message || "Failed to update member tasks.");
  }

  return data;
}

async function deleteTaskOnBackend(task) {
  const taskId = getTaskId(task);

  if (!taskId) {
    throw new Error("Failed to identify one of the assigned tasks.");
  }

  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || data?.success === false) {
    throw new Error(data.message || "Failed to delete assigned tasks.");
  }

  return data;
}

export default function TeamDetailsPage({
  team,
  onBack,
  searchValue,
  onSearchChange,
}) {
  const { teamId } = useParams();

  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;

  const [companyMembers, setCompanyMembers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [companyTasks, setCompanyTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamState, setTeamState] = useState(team || null);
  const [notFound, setNotFound] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleteTaskAction, setDeleteTaskAction] = useState("unassign");
  const [isDeleteConfirmationStep, setIsDeleteConfirmationStep] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberImageErrors, setMemberImageErrors] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "desc",
  });
  const [membersPerPage, setMembersPerPage] = useState(5);
  const [tableMaxHeight, setTableMaxHeight] = useState(0);

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberManagementMode, setMemberManagementMode] = useState("members");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [editForm, setEditForm] = useState({
    teamLeaderId: "",
    memberIds: [],
  });

  const tableCardRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);

  const isTopbarSearchControlled = typeof searchValue === "string";
  const effectiveSearchTerm = isTopbarSearchControlled ? searchValue : searchTerm;

  const handleMemberImageError = (memberId) => {
    setMemberImageErrors((prev) => ({
      ...prev,
      [memberId]: true,
    }));
  };

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return {
          key,
          direction: "desc",
        };
      }

      return {
        key,
        direction: prev.direction === "desc" ? "asc" : "desc",
      };
    });

    setCurrentPage(1);
  };

  useEffect(() => {
    setTeamState(team || null);
    setCurrentPage(1);
  }, [team]);

  useEffect(() => {
    if (!companyId || allTeams.length === 0) {
      return;
    }

    const routeTeamId = String(teamId || "");
    if (!routeTeamId) {
      setNotFound(false);
      return;
    }

    const matchedTeam = allTeams.find(
      (item) => String(item?.teamId || item?.id || "") === routeTeamId
    );

    if (!matchedTeam) {
      setNotFound(true);
      setTeamState(null);
      setMembers([]);
      return;
    }

    setNotFound(false);
    setTeamState((prev) => ({
      ...prev,
      ...matchedTeam,
      memberIds: Array.isArray(matchedTeam.memberIds) ? matchedTeam.memberIds : [],
      teamLeaderId:
        matchedTeam.teamLeaderId ?? matchedTeam.teamLeaderUserId ?? null,
      teamLeaderUserId:
        matchedTeam.teamLeaderUserId ?? matchedTeam.teamLeaderId ?? null,
    }));
  }, [teamId, allTeams, companyId]);

  useEffect(() => {
    const currentTeamId = String(teamState?.teamId || team?.teamId || "");

    if (!currentTeamId || !Array.isArray(allTeams) || allTeams.length === 0) {
      return;
    }

    const latestTeam = allTeams.find(
      (item) => String(item?.teamId || item?.id || "") === currentTeamId
    );

    if (!latestTeam) {
      return;
    }

    setTeamState((prev) => {
      const nextMemberIds = Array.isArray(latestTeam.memberIds)
        ? latestTeam.memberIds
        : [];
      const prevMemberIds = Array.isArray(prev?.memberIds) ? prev.memberIds : [];
      const sameLeader =
        String(prev?.teamLeaderId || prev?.teamLeaderUserId || "") ===
        String(latestTeam.teamLeaderId || latestTeam.teamLeaderUserId || "");
      const sameMembers =
        JSON.stringify(prevMemberIds.map(String)) ===
        JSON.stringify(nextMemberIds.map(String));
      const sameName = (prev?.teamName || "") === (latestTeam.teamName || "");

      if (sameLeader && sameMembers && sameName) {
        return prev;
      }

      return {
        ...prev,
        ...latestTeam,
        memberIds: nextMemberIds,
        teamLeaderId:
          latestTeam.teamLeaderId ?? latestTeam.teamLeaderUserId ?? null,
        teamLeaderUserId:
          latestTeam.teamLeaderUserId ?? latestTeam.teamLeaderId ?? null,
      };
    });
  }, [allTeams, team, teamState?.teamId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) {
        setCompanyMembers([]);
        setAllTeams([]);
        setCompanyTasks([]);
        setIsLoadingMembers(false);
        return;
      }

      try {
        setIsLoadingMembers(true);

        const [membersResponse, teamsResponse, tasksResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/teams/company/${companyId}/members`),
          fetch(`${API_BASE_URL}/api/teams/company/${companyId}`),
          fetch(`${API_BASE_URL}/api/tasks/company/${companyId}`),
        ]);

        const [membersData, teamsData, tasksData] = await Promise.all([
          parseJsonResponse(membersResponse),
          parseJsonResponse(teamsResponse),
          parseJsonResponse(tasksResponse),
        ]);

        if (!membersResponse.ok) {
          throw new Error(membersData.message || "Failed to load company members.");
        }

        if (!teamsResponse.ok) {
          throw new Error(teamsData.message || "Failed to load teams.");
        }

        setCompanyMembers(Array.isArray(membersData) ? membersData : []);
        setAllTeams(Array.isArray(teamsData) ? teamsData : []);
        setCompanyTasks(tasksResponse.ok ? normalizeTasksResponse(tasksData) : []);
      } catch (error) {
        console.error("Failed to fetch team details data:", error);
        setCompanyMembers([]);
        setAllTeams([]);
        setCompanyTasks([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchData();
  }, [companyId]);

  useEffect(() => {
    const handleUserUpdated = async () => {
      if (!companyId) {
        return;
      }

      try {
        const [membersResponse, teamsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/teams/company/${companyId}/members`),
          fetch(`${API_BASE_URL}/api/teams/company/${companyId}`),
        ]);

        const [membersData, teamsData] = await Promise.all([
          parseJsonResponse(membersResponse),
          parseJsonResponse(teamsResponse),
        ]);

        if (membersResponse.ok) {
          setCompanyMembers(Array.isArray(membersData) ? membersData : []);
        }

        if (teamsResponse.ok) {
          setAllTeams(Array.isArray(teamsData) ? teamsData : []);
        }
      } catch (error) {
        console.error("Failed to refresh team details after user update:", error);
      }
    };

    const handleUserDeleted = (event) => {
      const deletedUserId = String(event?.detail?.userId || "");

      if (!deletedUserId) {
        return;
      }

      setMembers((prevMembers) => {
        const nextMembers = prevMembers.filter(
          (member) => String(member.userId) !== deletedUserId
        );

        writeCachedTeamMembers(teamState?.teamId, nextMembers);
        return nextMembers;
      });

      setTeamState((prevTeam) => {
        if (!prevTeam) {
          return prevTeam;
        }

        const nextMemberIds = Array.isArray(prevTeam.memberIds)
          ? prevTeam.memberIds.filter((id) => String(id) !== deletedUserId)
          : [];

        const deletedUserWasLeader =
          String(prevTeam.teamLeaderId || prevTeam.teamLeaderUserId || "") ===
          deletedUserId;

        return {
          ...prevTeam,
          memberIds: nextMemberIds,
          memberCount: nextMemberIds.length,
          activeMemberCount:
            typeof prevTeam.activeMemberCount === "number"
              ? Math.max(0, prevTeam.activeMemberCount - 1)
              : nextMemberIds.length,
          teamLeaderId: deletedUserWasLeader ? null : prevTeam.teamLeaderId,
          teamLeaderUserId: deletedUserWasLeader
            ? null
            : prevTeam.teamLeaderUserId,
          teamLeaderName: deletedUserWasLeader ? "" : prevTeam.teamLeaderName,
        };
      });
    };

    window.addEventListener("taskora:user-updated", handleUserUpdated);
    window.addEventListener("taskora:user-deleted", handleUserDeleted);

    return () => {
      window.removeEventListener("taskora:user-updated", handleUserUpdated);
      window.removeEventListener("taskora:user-deleted", handleUserDeleted);
    };
  }, [companyId, teamState?.teamId]);

  useEffect(() => {
    const teamIdValue = teamState?.teamId;
    const activeMemberIds = Array.isArray(teamState?.memberIds)
      ? teamState.memberIds
      : [];
    const assignedLeaderId = String(
      teamState?.teamLeaderId || teamState?.teamLeaderUserId || ""
    );
    const cachedMembers = readCachedTeamMembers(teamIdValue);
    const availableMembers = Array.isArray(companyMembers)
      ? companyMembers.filter(
          (member) => (member?.userId ?? member?.UserId ?? member?.id) != null
        )
      : [];

    const availableMembersMap = new Map(
      availableMembers.map((member) => [
        String(member.userId ?? member.UserId ?? member.id),
        member,
      ])
    );
    const assignedLeader = assignedLeaderId
      ? availableMembersMap.get(assignedLeaderId)
      : null;

    let leaderId =
      assignedLeader && isTeamLeaderRole(assignedLeader.role)
        ? assignedLeaderId
        : "";

    if (!leaderId) {
      const eligibleLeaderIds = activeMemberIds
        .map((id) => String(id))
        .filter((id) => {
          const member = availableMembersMap.get(id);
          return member && isTeamLeaderRole(member.role);
        });

      if (eligibleLeaderIds.length === 1) {
        leaderId = eligibleLeaderIds[0];
      }
    }

    const cachedMembersMap = new Map(
      cachedMembers
        .filter((member) => member?.userId != null)
        .map((member) => [String(member.userId), member])
    );

    const orderedIds = [
      ...activeMemberIds.map((id) => String(id)),
      leaderId,
    ]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .filter((memberId) => availableMembersMap.has(String(memberId)));

    const resolvedMembers = orderedIds.map((memberId) => {
      const numericMemberId = Number(memberId);
      const foundMember = availableMembersMap.get(String(memberId));
      const cachedMember = cachedMembersMap.get(String(memberId));

      const resolvedIsActive =
        typeof foundMember?.isActive === "boolean"
          ? foundMember.isActive
          : typeof foundMember?.IsActive === "boolean"
            ? foundMember.IsActive
            : typeof foundMember?.active === "boolean"
              ? foundMember.active
              : typeof cachedMember?.isActive === "boolean"
                ? cachedMember.isActive
                : typeof cachedMember?.IsActive === "boolean"
                  ? cachedMember.IsActive
                  : typeof cachedMember?.active === "boolean"
                    ? cachedMember.active
                    : true;

      const resolvedUserRole =
        foundMember?.role ||
        foundMember?.Role ||
        cachedMember?.userRole ||
        cachedMember?.role ||
        "Employee";

      return {
        userId: numericMemberId,
        fullName:
          foundMember?.fullName ||
          foundMember?.FullName ||
          cachedMember?.fullName ||
          "Unknown Member",
        email:
          foundMember?.email ||
          foundMember?.Email ||
          cachedMember?.email ||
          "No email available",
        jobType:
          foundMember?.jobType ||
          foundMember?.JobType ||
          foundMember?.jobTitle ||
          foundMember?.JobTitle ||
          cachedMember?.jobType ||
          "No job type available",
        role: resolvedUserRole,
        teamPosition: String(memberId) === leaderId ? "Team Leader" : "Member",
        userRole: resolvedUserRole,
        isActive: resolvedIsActive,
        profileImageUrl:
          foundMember?.profileImageUrl ||
          foundMember?.ProfileImageUrl ||
          foundMember?.imageUrl ||
          foundMember?.ImageUrl ||
          foundMember?.avatar ||
          foundMember?.Avatar ||
          foundMember?.profileImage ||
          foundMember?.ProfileImage ||
          cachedMember?.profileImageUrl ||
          cachedMember?.ProfileImageUrl ||
          cachedMember?.imageUrl ||
          cachedMember?.ImageUrl ||
          cachedMember?.avatar ||
          cachedMember?.Avatar ||
          cachedMember?.profileImage ||
          cachedMember?.ProfileImage ||
          "",
      };
    });

    setMembers(resolvedMembers);
    writeCachedTeamMembers(teamIdValue, resolvedMembers);
  }, [teamState, companyMembers]);

  useEffect(() => {
    const persistedLeaderId = String(
      teamState?.teamLeaderId || teamState?.teamLeaderUserId || ""
    );

    const activeMemberIds = Array.isArray(teamState?.memberIds)
      ? teamState.memberIds.map((id) => String(id))
      : [];

    if (!teamState?.teamId || !companyId || !activeMemberIds.length) {
      return;
    }

    const assignedLeader = persistedLeaderId
      ? companyMembers.find(
          (member) =>
            String(member.userId) === persistedLeaderId &&
            isTeamLeaderRole(member.role)
        )
      : null;

    if (assignedLeader) {
      return;
    }

    const eligibleLeaders = companyMembers.filter(
      (member) =>
        activeMemberIds.includes(String(member.userId)) &&
        isTeamLeaderRole(member.role)
    );

    if (eligibleLeaders.length !== 1) {
      return;
    }

    const autoLeader = eligibleLeaders[0];
    const autoLeaderId = Number(autoLeader.userId);

    const persistAutoLeader = async () => {
      try {
        const payload = {
          teamName: teamState.teamName || "",
          description: teamState.description || "",
          companyId,
          teamLeaderUserId: autoLeaderId,
          teamLeaderId: autoLeaderId,
          memberIds: activeMemberIds.map((id) => Number(id)),
          isActive:
            typeof teamState?.isActive === "boolean" ? teamState.isActive : true,
        };

        const response = await fetch(
          `${API_BASE_URL}/api/teams/${teamState.teamId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await parseJsonResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to sync team leader.");
        }

        const updatedTeam = data.team || data;

        setTeamState((prev) => ({
          ...prev,
          ...updatedTeam,
          teamLeaderId:
            updatedTeam?.teamLeaderId ??
            updatedTeam?.teamLeaderUserId ??
            autoLeaderId,
          teamLeaderUserId:
            updatedTeam?.teamLeaderUserId ??
            updatedTeam?.teamLeaderId ??
            autoLeaderId,
          memberIds: Array.isArray(updatedTeam?.memberIds)
            ? updatedTeam.memberIds
            : activeMemberIds.map((id) => Number(id)),
        }));
      } catch (error) {
        console.error("Failed to auto-sync team leader:", error);
      }
    };

    persistAutoLeader();
  }, [teamState, companyMembers, companyId]);

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
    const normalizedSearch = effectiveSearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return members;
    }

    return members.filter((member) => {
      return (
        member.fullName.toLowerCase().includes(normalizedSearch) ||
        member.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [members, effectiveSearchTerm]);

  const filteredMembersWithOriginalOrder = useMemo(() => {
    return filteredMembers.map((member, index) => ({
      member,
      originalIndex: index,
    }));
  }, [filteredMembers]);

  const sortedMembers = useMemo(() => {
    if (!sortConfig.key) {
      return filteredMembersWithOriginalOrder.map(({ member }) => member);
    }

    const sortableMembers = [...filteredMembersWithOriginalOrder];

    sortableMembers.sort((firstEntry, secondEntry) => {
      const firstMember = firstEntry.member;
      const secondMember = secondEntry.member;
      let result = 0;

      switch (sortConfig.key) {
        case "member":
          result = compareTextValues(
            firstMember.fullName,
            secondMember.fullName,
            sortConfig.direction
          );
          break;
        case "jobType":
          result = compareTextValues(
            firstMember.jobType,
            secondMember.jobType,
            sortConfig.direction
          );
          break;
        case "role":
          result = compareRoleValues(
            firstMember.role,
            secondMember.role,
            sortConfig.direction
          );
          break;
        case "status":
          result = compareStatusValues(
            firstMember.isActive ? "Active" : "Inactive",
            secondMember.isActive ? "Active" : "Inactive",
            sortConfig.direction
          );
          break;
        default:
          result = 0;
      }

      if (result !== 0) {
        return result;
      }

      return firstEntry.originalIndex - secondEntry.originalIndex;
    });

    return sortableMembers.map(({ member }) => member);
  }, [filteredMembersWithOriginalOrder, sortConfig]);

  const calculateMembersPerPage = useCallback(() => {
    if (!tableCardRef.current || !tableHeadRef.current) {
      return;
    }

    const cardElement = tableCardRef.current;
    const cardRect = cardElement.getBoundingClientRect();
    const headRect = tableHeadRef.current.getBoundingClientRect();
    const paginationHeight = paginationRef.current
      ? paginationRef.current.getBoundingClientRect().height
      : 58;

    const firstBodyRow = cardElement.querySelector("tbody tr");
    const rowHeight = firstBodyRow
      ? firstBodyRow.getBoundingClientRect().height
      : 84;

    const cardStyle = window.getComputedStyle(cardElement);
    const borderTop = parseFloat(cardStyle.borderTopWidth || "0");
    const borderBottom = parseFloat(cardStyle.borderBottomWidth || "0");

    const viewportHeight = window.innerHeight;
    const bottomSpacing = 24;
    const availableCardHeight = Math.max(
      320,
      Math.floor(viewportHeight - cardRect.top - bottomSpacing)
    );

    setTableMaxHeight(availableCardHeight);

    const availableRowsHeight =
      availableCardHeight -
      headRect.height -
      paginationHeight -
      borderTop -
      borderBottom;

    const fittedRows = Math.max(
      MIN_MEMBERS_PER_PAGE,
      Math.floor((availableRowsHeight + rowHeight * 0.35) / rowHeight)
    );

    setMembersPerPage(fittedRows);
  }, []);

  useLayoutEffect(() => {
    let frameId = 0;

    const runCalculation = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        calculateMembersPerPage();
      });
    };

    runCalculation();

    const handleResize = () => {
      runCalculation();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [calculateMembersPerPage, sortedMembers.length, isLoadingMembers]);

  useEffect(() => {
    const totalPagesCount = Math.max(
      1,
      Math.ceil(sortedMembers.length / membersPerPage)
    );

    if (currentPage > totalPagesCount) {
      setCurrentPage(totalPagesCount);
    }
  }, [currentPage, sortedMembers.length, membersPerPage]);

  const title = teamState?.teamName || "Team";

  const assignedTeamLeaderId = String(
    teamState?.teamLeaderId || teamState?.teamLeaderUserId || ""
  );
  const assignedLeaderMember = companyMembers.find(
    (member) => getCompanyMemberId(member) === assignedTeamLeaderId
  );

  let teamLeaderId =
    assignedLeaderMember && isTeamLeaderRole(assignedLeaderMember.role)
      ? assignedTeamLeaderId
      : "";

  if (!teamLeaderId) {
    const eligibleLeaderIds = members
      .filter((member) => member.isActive && isTeamLeaderRole(member.role))
      .map((member) => String(member.userId));

    if (eligibleLeaderIds.length === 1) {
      teamLeaderId = eligibleLeaderIds[0];
    }
  }

  const teamLeader = members.find(
    (member) => String(member.userId) === teamLeaderId
  );

  const totalMembers = members.length;
  const activeMembersCount = members.filter((member) => member.isActive).length;
  const inactiveMembersCount = members.filter((member) => !member.isActive).length;

  const totalFilteredMembers = sortedMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredMembers / membersPerPage));
  const startIndex =
    totalFilteredMembers === 0 ? 0 : (currentPage - 1) * membersPerPage;
  const endIndex = Math.min(startIndex + membersPerPage, totalFilteredMembers);
  const paginatedMembers = sortedMembers.slice(startIndex, endIndex);

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, currentPage - 2),
    Math.min(totalPages, Math.max(0, currentPage - 2) + 5)
  );

  const memberAssignedTasks = useMemo(() => {
    if (!memberToDelete) {
      return [];
    }

    return companyTasks.filter(
      (task) => String(getTaskAssigneeId(task)) === String(memberToDelete.userId)
    );
  }, [companyTasks, memberToDelete]);

  const closeDeleteModal = () => {
    if (isSaving) {
      return;
    }
    setMemberToDelete(null);
    setDeleteTaskAction("unassign");
    setIsDeleteConfirmationStep(false);
  };

  const openDeleteModal = (member) => {
    setMemberToDelete(member);
    setDeleteTaskAction("unassign");
    setIsDeleteConfirmationStep(false);
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
    const activeLeader = activeMembers.find(
      (member) =>
        member.teamPosition === "Team Leader" ||
        (member.role === "Team Leader" &&
          isTeamLeaderRole(member.userRole || member.role))
    );

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

    const persistedMembers = nextMembers.map((member) => {
      const companyMember = companyMembers.find(
        (item) => String(item.userId) === String(member.userId)
      );

      const resolvedUserRole =
        companyMember?.role ||
        member.userRole ||
        member.role ||
        "Employee";

      return {
        ...member,
        role: resolvedUserRole,
        userRole: resolvedUserRole,
        teamPosition:
          activeLeader && String(member.userId) === String(activeLeader.userId)
            ? "Team Leader"
            : "Member",
        profileImageUrl:
          companyMember?.profileImageUrl ||
          companyMember?.ProfileImageUrl ||
          companyMember?.imageUrl ||
          companyMember?.ImageUrl ||
          companyMember?.avatar ||
          companyMember?.Avatar ||
          companyMember?.profileImage ||
          companyMember?.ProfileImage ||
          member?.profileImageUrl ||
          member?.ProfileImageUrl ||
          member?.imageUrl ||
          member?.ImageUrl ||
          member?.avatar ||
          member?.Avatar ||
          member?.profileImage ||
          member?.ProfileImage ||
          "",
      };
    });

    writeCachedTeamMembers(teamState?.teamId, persistedMembers);

    return persistedMembers;
  };

  const updateUserActivityOnBackend = async (member, nextIsActive) => {
    const targetUserId = Number(member?.userId);

    if (!targetUserId) {
      throw new Error("User not found.");
    }

    const payload = {
      userId: targetUserId,
      role: member?.userRole || member?.role || "Employee",
      jobTitle: member?.jobType || "",
      jobType: member?.jobType || "",
      isActive: nextIsActive,
      IsActive: nextIsActive,
      active: nextIsActive,
      status: nextIsActive ? "Active" : "Inactive",
    };

    const response = await fetch(`${API_BASE_URL}/api/auth/update-user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonResponse(response);

    if (!response.ok || data?.success === false) {
      throw new Error(data.message || "Failed to update member status.");
    }

    const returnedUser = data?.user || data?.data || {};

    return {
      ...member,
      ...returnedUser,
      role:
        returnedUser?.role ||
        returnedUser?.roleName ||
        returnedUser?.userRole ||
        member?.userRole ||
        member?.role ||
        "Employee",
      userRole:
        returnedUser?.role ||
        returnedUser?.roleName ||
        returnedUser?.userRole ||
        member?.userRole ||
        member?.role ||
        "Employee",
      jobType:
        returnedUser?.jobType ||
        returnedUser?.jobTitle ||
        member?.jobType ||
        "No job type available",
      isActive:
        typeof returnedUser?.isActive === "boolean"
          ? returnedUser.isActive
          : typeof returnedUser?.IsActive === "boolean"
            ? returnedUser.IsActive
            : typeof returnedUser?.active === "boolean"
              ? returnedUser.active
              : nextIsActive,
      status: returnedUser?.status || (nextIsActive ? "Active" : "Inactive"),
    };
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) {
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMessage("");
      setFeedbackType("");

      if (memberAssignedTasks.length > 0) {
        if (deleteTaskAction === "unassign") {
          await Promise.all(
            memberAssignedTasks.map((task) =>
              updateTaskAssignmentOnBackend(task, null)
            )
          );

          setCompanyTasks((prev) =>
            prev.map((task) =>
              String(getTaskAssigneeId(task)) === String(memberToDelete.userId)
                ? {
                    ...task,
                    assignedToUserId: null,
                    AssignedToUserId: null,
                    assignedUserId: null,
                    AssignedUserId: null,
                    assigneeId: null,
                    AssigneeId: null,
                    employeeId: null,
                    EmployeeId: null,
                    memberId: null,
                    MemberId: null,
                    userId: null,
                    UserId: null,
                  }
                : task
            )
          );
        } else if (deleteTaskAction === "delete") {
          await Promise.all(
            memberAssignedTasks.map((task) => deleteTaskOnBackend(task))
          );

          const taskIdsToDelete = new Set(
            memberAssignedTasks.map((task) => String(getTaskId(task)))
          );

          setCompanyTasks((prev) =>
            prev.filter((task) => !taskIdsToDelete.has(String(getTaskId(task))))
          );
        }
      }

      const nextMembers = members.filter(
        (member) => String(member.userId) !== String(memberToDelete.userId)
      );

      const persistedMembers = await saveTeamMembersToBackend(nextMembers);
      setMembers(persistedMembers);
      setMemberToDelete(null);
      setDeleteTaskAction("unassign");
      setIsDeleteConfirmationStep(false);

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

      const existingMember = members.find(
        (member) => String(member.userId) === String(memberId)
      );

      if (!existingMember) {
        throw new Error("Member not found.");
      }

      const nextIsActive = !existingMember.isActive;
      const updatedMember = await updateUserActivityOnBackend(
        existingMember,
        nextIsActive
      );

      const nextMembers = members.map((member) =>
        String(member.userId) === String(memberId)
          ? {
              ...member,
              ...updatedMember,
              isActive: updatedMember.isActive,
              status: updatedMember.isActive ? "Active" : "Inactive",
            }
          : member
      );

      setMembers(nextMembers);
      writeCachedTeamMembers(teamState?.teamId, nextMembers);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("taskora:user-updated", {
            detail: {
              userId: updatedMember.userId,
              role: updatedMember.userRole || updatedMember.role,
              jobType: updatedMember.jobType,
              jobTitle: updatedMember.jobType,
              isActive: updatedMember.isActive,
              active: updatedMember.isActive,
              status: updatedMember.isActive ? "Active" : "Inactive",
              fullName: updatedMember.fullName,
              email: updatedMember.email,
              profileImageUrl: updatedMember.profileImageUrl || "",
            },
          })
        );
      }

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
        const itemLeaderId = String(
          item.teamLeaderId || item.teamLeaderUserId || ""
        );

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
      const jobTitle = (
        employee.jobTitle ||
        employee.jobType ||
        ""
      ).toLowerCase();

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

    const currentTeamMemberIds = new Set(
      (Array.isArray(teamState?.memberIds) ? teamState.memberIds : []).map((id) =>
        String(id)
      )
    );

    const employees = companyMembers.filter((employee) => {
      const employeeId = String(
        employee.userId || employee.UserId || employee.id || ""
      );
      const role = employee.role || employee.Role || "";
      const isActiveUser =
        employee.isActive !== false &&
        employee.IsActive !== false &&
        employee.active !== false;

      if (!employeeId) {
        return false;
      }

      if (!isEmployeeRole(role)) {
        return false;
      }

      if (!isActiveUser) {
        return false;
      }

      if (employeeId === selectedLeaderId) {
        return false;
      }

      if (currentTeamMemberIds.has(employeeId)) {
        return false;
      }

      const isAssignedToAnotherActiveTeam = allTeams.some((item) => {
        if (!item || item.isActive === false) {
          return false;
        }

        const itemTeamId = String(item.teamId || "");
        const itemLeaderId = String(
          item.teamLeaderId || item.teamLeaderUserId || ""
        );
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
      const fullName = String(employee.fullName || employee.FullName || "").toLowerCase();
      const email = String(employee.email || employee.Email || "").toLowerCase();
      const role = String(employee.role || employee.Role || "").toLowerCase();
      const jobTitle = String(
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
      const nextLeaderId =
        currentLeaderId === normalizedLeaderId ? "" : normalizedLeaderId;

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
        (Array.isArray(teamState?.memberIds) ? teamState.memberIds : []).map((id) =>
          String(id)
        )
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

        const resolvedUserRole =
          existingMember?.role || existingMember?.userRole || "Employee";

        return {
          userId: Number(id),
          fullName: existingMember?.fullName || "Unknown Member",
          email: existingMember?.email || "No email available",
          jobType:
            existingMember?.jobType ||
            existingMember?.jobTitle ||
            "No job type available",
          role: resolvedUserRole,
          teamPosition: String(id) === selectedLeaderId ? "Team Leader" : "Member",
          userRole: resolvedUserRole,
          isActive: true,
          profileImageUrl:
            existingMember?.profileImageUrl ||
            existingMember?.ProfileImageUrl ||
            existingMember?.imageUrl ||
            existingMember?.ImageUrl ||
            existingMember?.avatar ||
            existingMember?.Avatar ||
            existingMember?.profileImage ||
            existingMember?.ProfileImage ||
            "",
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
    memberManagementMode === "members" ? "Add Members" : "Manage Leader";

  const membersModalDescription =
    memberManagementMode === "members"
      ? "Search and add members to this team."
      : "Choose the team leader for this team.";

  if (notFound) {
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
          <h2>Team not found</h2>
          <div className="team-details-page__title-line"></div>
        </div>

        <div className="team-details-page__empty" style={{ marginTop: "32px" }}>
          <FiUser />
          <span>This team does not exist.</span>
        </div>
      </section>
    );
  }

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

      <div className="team-details-page__summary-card">
        <div className="team-details-page__mini-stats">
          <div className="team-details-page__mini-stat team-details-page__mini-stat--members">
            <span className="team-details-page__mini-stat-icon">
              <FiUsers />
            </span>
            <div className="team-details-page__mini-stat-copy">
              <small>Total Members</small>
              <strong>{totalMembers}</strong>
            </div>
          </div>

          <div className="team-details-page__mini-stat team-details-page__mini-stat--active">
            <span className="team-details-page__mini-stat-icon">
              <FiActivity />
            </span>
            <div className="team-details-page__mini-stat-copy">
              <small>Active</small>
              <strong>{activeMembersCount}</strong>
            </div>
          </div>

          <div className="team-details-page__mini-stat team-details-page__mini-stat--inactive">
            <span className="team-details-page__mini-stat-icon">
              <FiActivity />
            </span>
            <div className="team-details-page__mini-stat-copy">
              <small>Inactive</small>
              <strong>{inactiveMembersCount}</strong>
            </div>
          </div>
        </div>

        <div className="team-details-page__summary-divider"></div>

        <div className="team-details-page__leader-card">
          <div className="team-details-page__leader-card-badge">
            <FiShield />
          </div>

          <div className="team-details-page__leader-card-content">
            <span className="team-details-page__leader-card-label">
              Team Leader
            </span>

            <div className="team-details-page__leader-card-user">
              <span className="users-section__avatar">
                {teamLeader &&
                getUserProfileImage(teamLeader) &&
                !memberImageErrors[`leader-${teamLeader.userId}`] ? (
                  <img
                    src={getUserProfileImage(teamLeader)}
                    alt={teamLeader.fullName || "Team Leader"}
                    className="users-section__avatar-image"
                    onError={() =>
                      handleMemberImageError(`leader-${teamLeader.userId}`)
                    }
                  />
                ) : (
                  getInitials(teamLeader?.fullName || "TL")
                )}
              </span>

              <div className="team-details-page__leader-card-copy">
                <strong>{teamLeader?.fullName || "No team leader assigned"}</strong>
                <small>{teamLeader?.email || "Leader unavailable"}</small>
              </div>
            </div>
          </div>

          <div className="team-details-page__leader-card-status">
            <FiUserCheck />
          </div>
        </div>

        <div className="team-details-page__summary-actions">
          <button
            type="button"
            className="teams-section__members-btn team-details-page__summary-btn"
            onClick={() => openMembersModal("members")}
          >
            <FiPlus />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div
        ref={tableCardRef}
        className="users-section__table-card team-details-page__table-card"
        style={{
          maxHeight: tableMaxHeight ? `${tableMaxHeight}px` : undefined,
          height: tableMaxHeight ? `${tableMaxHeight}px` : undefined,
        }}
      >
        <div className="users-section__table-wrap team-details-page__table-wrap">
          <table className="users-section__table team-details-page__table">
            <thead ref={tableHeadRef}>
              <tr>
                <th>
                  <button
                    type="button"
                    className="users-section__sort-btn"
                    onClick={() => toggleSort("member")}
                  >
                    <span>Member</span>
                    <FiChevronDown
                      className={`users-section__sort-icon ${
                        sortConfig.key === "member"
                          ? "users-section__sort-icon--active"
                          : ""
                      } ${
                        sortConfig.key === "member" &&
                        sortConfig.direction === "asc"
                          ? "users-section__sort-icon--asc"
                          : ""
                      }`}
                    />
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="users-section__sort-btn"
                    onClick={() => toggleSort("jobType")}
                  >
                    <span>Job Type</span>
                    <FiChevronDown
                      className={`users-section__sort-icon ${
                        sortConfig.key === "jobType"
                          ? "users-section__sort-icon--active"
                          : ""
                      } ${
                        sortConfig.key === "jobType" &&
                        sortConfig.direction === "asc"
                          ? "users-section__sort-icon--asc"
                          : ""
                      }`}
                    />
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="users-section__sort-btn"
                    onClick={() => toggleSort("role")}
                  >
                    <span>Role</span>
                    <FiChevronDown
                      className={`users-section__sort-icon ${
                        sortConfig.key === "role"
                          ? "users-section__sort-icon--active"
                          : ""
                      } ${
                        sortConfig.key === "role" &&
                        sortConfig.direction === "asc"
                          ? "users-section__sort-icon--asc"
                          : ""
                      }`}
                    />
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="users-section__sort-btn"
                    onClick={() => toggleSort("status")}
                  >
                    <span>Status</span>
                    <FiChevronDown
                      className={`users-section__sort-icon ${
                        sortConfig.key === "status"
                          ? "users-section__sort-icon--active"
                          : ""
                      } ${
                        sortConfig.key === "status" &&
                        sortConfig.direction === "asc"
                          ? "users-section__sort-icon--asc"
                          : ""
                      }`}
                    />
                  </button>
                </th>

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
                paginatedMembers.map((member) => {
                  const isCurrentTeamLeader =
                    String(member.userId) === String(teamLeaderId || "");

                  return (
                    <tr key={member.userId}>
                      <td>
                        <div className="users-section__user-cell">
                          <span className="users-section__avatar">
                            {getUserProfileImage(member) &&
                            !memberImageErrors[member.userId] ? (
                              <img
                                src={getUserProfileImage(member)}
                                alt={member.fullName || member.email}
                                className="users-section__avatar-image"
                                onError={() => handleMemberImageError(member.userId)}
                              />
                            ) : (
                              getInitials(member.fullName || member.email)
                            )}
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
                            isTeamLeaderRole(member.role)
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
                            className={`team-details-page__delete-btn ${
                              isCurrentTeamLeader
                                ? "team-details-page__delete-btn--leader-action"
                                : ""
                            }`}
                            onClick={() =>
                              isCurrentTeamLeader
                                ? openMembersModal("leader")
                                : openDeleteModal(member)
                            }
                            title={
                              isCurrentTeamLeader ? "Edit leader" : "Delete member"
                            }
                            aria-label={
                              isCurrentTeamLeader ? "Edit leader" : "Delete member"
                            }
                            disabled={isSaving}
                          >
                            {isCurrentTeamLeader ? <FiEdit2 /> : <FiTrash2 />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoadingMembers && totalFilteredMembers > 0 && (
          <div ref={paginationRef} className="users-section__pagination">
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
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
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
                        const isChecked =
                          String(editForm.teamLeaderId || "") === employeeId;

                        return (
                          <label
                            key={`leader-${employee.userId}`}
                            className="teams-section__member-row"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                handleToggleLeaderInsideMembers(employeeId)
                              }
                            />

                            <span className="teams-section__member-avatar">
                              {getUserProfileImage(employee) &&
                              !memberImageErrors[`modal-leader-${employeeId}`] ? (
                                <img
                                  src={getUserProfileImage(employee)}
                                  alt={employee.fullName || employee.email}
                                  className="teams-section__member-avatar-image"
                                  onError={() =>
                                    handleMemberImageError(
                                      `modal-leader-${employeeId}`
                                    )
                                  }
                                />
                              ) : (
                                <span className="teams-section__member-avatar-fallback">
                                  {getInitials(employee.fullName || employee.email)}
                                </span>
                              )}
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
                              {getUserProfileImage(employee) &&
                              !memberImageErrors[`modal-member-${employeeId}`] ? (
                                <img
                                  src={getUserProfileImage(employee)}
                                  alt={employee.fullName || employee.email}
                                  className="teams-section__member-avatar-image"
                                  onError={() =>
                                    handleMemberImageError(
                                      `modal-member-${employeeId}`
                                    )
                                  }
                                />
                              ) : (
                                <span className="teams-section__member-avatar-fallback">
                                  {getInitials(employee.fullName || employee.email)}
                                </span>
                              )}
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
            className="teams-section__modal teams-section__modal--small team-details-page__delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teams-section__modal-header team-details-page__delete-modal-header">
              <div>
                <h3>
                  {memberAssignedTasks.length > 0
                    ? isDeleteConfirmationStep
                      ? deleteTaskAction === "delete"
                        ? "Confirm Delete Tasks"
                        : "Confirm Unassign Tasks"
                      : "Delete Member"
                    : "Delete Member"}
                </h3>

                {!isDeleteConfirmationStep ? (
                  <p>
                    This action will remove <strong>{memberToDelete.fullName}</strong> from
                    this team.
                  </p>
                ) : (
                  <p>
                    {deleteTaskAction === "delete" ? (
                      <>
                        Are you sure you want to remove{" "}
                        <strong>{memberToDelete.fullName}</strong> from this team and
                        permanently delete all their assigned tasks?
                      </>
                    ) : (
                      <>
                        Are you sure you want to remove{" "}
                        <strong>{memberToDelete.fullName}</strong> from this team and set
                        all their assigned tasks as unassigned?
                      </>
                    )}
                  </p>
                )}
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

            <div className="team-details-page__delete-dialog">
              {memberAssignedTasks.length > 0 && !isDeleteConfirmationStep && (
                <>
                  <p className="team-details-page__delete-task-count">
                    {memberAssignedTasks.length}{" "}
                    {memberAssignedTasks.length === 1 ? "assigned task" : "assigned tasks"}
                  </p>

                  <div className="team-details-page__delete-task-options">
                    <label
                      className={`team-details-page__delete-option ${
                        deleteTaskAction === "unassign"
                          ? "team-details-page__delete-option--selected"
                          : ""
                      }`}
                    >
                      <span className="team-details-page__delete-option-row">
                        <input
                          type="radio"
                          name="member-delete-task-action"
                          checked={deleteTaskAction === "unassign"}
                          onChange={() => setDeleteTaskAction("unassign")}
                        />
                        <span className="team-details-page__delete-option-copy">
                          <span className="team-details-page__delete-option-label">
                            Set tasks as unassigned
                          </span>
                          <span className="team-details-page__delete-option-help">
                            Tasks will remain in the system without an assignee.
                          </span>
                        </span>
                      </span>
                    </label>

                    <label
                      className={`team-details-page__delete-option team-details-page__delete-option--danger ${
                        deleteTaskAction === "delete"
                          ? "team-details-page__delete-option--selected-danger"
                          : ""
                      }`}
                    >
                      <span className="team-details-page__delete-option-row">
                        <input
                          type="radio"
                          name="member-delete-task-action"
                          checked={deleteTaskAction === "delete"}
                          onChange={() => setDeleteTaskAction("delete")}
                        />
                        <span className="team-details-page__delete-option-copy">
                          <span className="team-details-page__delete-option-label">
                            Delete tasks <span aria-hidden="true">⚠️</span>
                          </span>
                          <span className="team-details-page__delete-option-help">
                            All tasks assigned to this member will be removed permanently.
                          </span>
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              )}

              <div className="teams-section__form-actions">
                {!isDeleteConfirmationStep ? (
                  <>
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
                      onClick={() => {
                        if (memberAssignedTasks.length > 0) {
                          setIsDeleteConfirmationStep(true);
                        } else {
                          handleConfirmDeleteMember();
                        }
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? "Deleting..." : memberAssignedTasks.length > 0 ? "Continue" : "Delete Member"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="teams-section__secondary-btn"
                      onClick={() => setIsDeleteConfirmationStep(false)}
                      disabled={isSaving}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="teams-section__delete-btn"
                      onClick={handleConfirmDeleteMember}
                      disabled={isSaving}
                    >
                      {isSaving ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}