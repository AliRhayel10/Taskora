import { useEffect, useMemo, useState } from "react";
import {
    FiChevronLeft,
    FiChevronRight,
    FiPlus,
    FiSearch,
    FiTrash2,
    FiUsers,
    FiAlertTriangle,
    FiX,
    FiChevronDown,
    FiEyeOff,
    FiEye,
} from "react-icons/fi";
import "../../assets/styles/admin/users-section.css";

const API_BASE_URL = "http://localhost:5000";
const PAGE_SIZE = 6;
const SEARCH_FETCH_SIZE = 1000;

const initialCreateForm = {
    fullName: "",
    jobType: "",
    role: "",
    email: "",
    password: "",
    sendInvitation: true,
    isActive: true,
};

function capitalizeWords(value) {
    return value
        .split(" ")
        .map((word) =>
            word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
        )
        .join(" ");
}

function getStoredUser() {
    try {
        const rawUser = localStorage.getItem("user");
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
        console.error("Failed to read user from localStorage.", error);
        return null;
    }
}

function normalizeUsersResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.employees)) return data.employees;
    return [];
}

function normalizeTeamsResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.teams)) return data.teams;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

function getUserId(user) {
    return user?.userId || user?.id || user?._id || null;
}

function getUserName(user) {
    const fullName =
        user?.fullName ||
        user?.name ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ");

    return fullName?.trim() || user?.email || "Unnamed user";
}

function getUserRole(user) {
    return user?.role?.trim() || user?.roleName?.trim() || "Employee";
}

function getUserJobType(user) {
    return user?.jobType?.trim() || user?.jobTitle?.trim() || "No job type";
}

function normalizeRole(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

function isAdminRole(value) {
    const role = normalizeRole(value);
    return role === "admin" || role === "company admin" || role === "companyadmin";
}

function getUserTeam(user) {
    if (typeof user?.team === "string" && user.team.trim()) return user.team;
    if (typeof user?.teamName === "string" && user.teamName.trim()) return user.teamName;
    if (typeof user?.department === "string" && user.department.trim()) return user.department;
    if (typeof user?.groupName === "string" && user.groupName.trim()) return user.groupName;
    return "Unassigned";
}

function getResolvedUserTeam(user, teams) {
    const directTeam = getUserTeam(user);

    if (directTeam !== "Unassigned") {
        return directTeam;
    }

    const userId = String(getUserId(user) || "");

    if (!userId || !Array.isArray(teams) || teams.length === 0) {
        return "Unassigned";
    }

    const matchedTeam = teams.find((team) => {
        const leaderId = String(team?.teamLeaderId || team?.teamLeaderUserId || "");
        const memberIds = Array.isArray(team?.memberIds)
            ? team.memberIds.map((id) => String(id))
            : [];

        return leaderId === userId || memberIds.includes(userId);
    });

    if (!matchedTeam) {
        return "Unassigned";
    }

    return matchedTeam?.teamName || matchedTeam?.name || "Unassigned";
}

function getUserStatus(user) {
    if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Inactive";
    if (typeof user?.active === "boolean") return user.active ? "Active" : "Inactive";

    if (typeof user?.status === "string" && user.status.trim()) {
        const normalizedStatus = user.status.trim().toLowerCase();
        return normalizedStatus === "active" ? "Active" : "Inactive";
    }

    return "Active";
}

function getInitials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isStrongPassword(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
    );
}

async function readJsonSafe(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function buildPageNumbers(currentPage, totalPages) {
    if (totalPages <= 1) return [1];

    const pages = new Set([1, totalPages, currentPage]);
    if (currentPage - 1 > 1) pages.add(currentPage - 1);
    if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
    if (currentPage - 2 > 1) pages.add(currentPage - 2);
    if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

    return Array.from(pages).sort((a, b) => a - b);
}

function matchesNameSearch(user, search) {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return getUserName(user).toLowerCase().includes(term);
}

function compareTextValues(firstValue, secondValue, direction = "asc") {
    const normalizedFirst = String(firstValue || "").toLowerCase();
    const normalizedSecond = String(secondValue || "").toLowerCase();
    const result = normalizedFirst.localeCompare(normalizedSecond);
    return direction === "asc" ? result : -result;
}

function compareRoleValues(firstRole, secondRole, direction = "asc") {
    const rolePriority = {
        employee: 1,
        "team leader": 2,
    };

    const normalizedFirst = String(firstRole || "").trim().toLowerCase();
    const normalizedSecond = String(secondRole || "").trim().toLowerCase();

    const firstPriority = rolePriority[normalizedFirst] ?? 99;
    const secondPriority = rolePriority[normalizedSecond] ?? 99;

    if (firstPriority !== secondPriority) {
        return direction === "asc" ? firstPriority - secondPriority : secondPriority - firstPriority;
    }

    return compareTextValues(normalizedFirst, normalizedSecond, direction);
}

function compareStatusValues(firstStatus, secondStatus, direction = "asc") {
    const statusPriority = {
        active: 1,
        unactive: 2,
        inactive: 2,
    };

    const normalizedFirst = String(firstStatus || "").trim().toLowerCase();
    const normalizedSecond = String(secondStatus || "").trim().toLowerCase();

    const firstPriority = statusPriority[normalizedFirst] ?? 99;
    const secondPriority = statusPriority[normalizedSecond] ?? 99;

    if (firstPriority !== secondPriority) {
        return direction === "asc" ? firstPriority - secondPriority : secondPriority - firstPriority;
    }

    return compareTextValues(normalizedFirst, normalizedSecond, direction);
}

export default function UsersSection({ onOpenUser }) {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [sortConfig, setSortConfig] = useState({
        key: "",
        direction: "asc",
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");
    const [createForm, setCreateForm] = useState(initialCreateForm);
    const [showPassword, setShowPassword] = useState(false);
    const [userPendingDelete, setUserPendingDelete] = useState(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    const currentUser = useMemo(() => getStoredUser(), []);
    const companyId = useMemo(() => {
        const rawCompanyId =
            currentUser?.companyId ||
            currentUser?.company?.companyId ||
            currentUser?.company?.id ||
            currentUser?.companyID;

        return rawCompanyId == null ? "" : String(rawCompanyId).trim();
    }, [currentUser]);

    const emailTouched = createForm.email.trim().length > 0;
    const passwordTouched = createForm.password.length > 0;
    const emailIsValid = isValidEmail(createForm.email);
    const passwordIsStrong = isStrongPassword(createForm.password);

    const isCreateFormValid =
        createForm.fullName.trim() &&
        createForm.jobType.trim() &&
        createForm.role.trim() &&
        emailIsValid &&
        passwordIsStrong;

    const fetchTeams = async (abortSignal) => {
        if (!companyId) {
            setTeams([]);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/teams/company/${encodeURIComponent(companyId)}`,
                {
                    method: "GET",
                    signal: abortSignal,
                }
            );

            const data = await readJsonSafe(response);

            if (!response.ok) {
                setTeams([]);
                return;
            }

            setTeams(normalizeTeamsResponse(data));
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Failed to fetch teams:", error);
            setTeams([]);
        }
    };

    const fetchUsers = async (page = 1, search = "", abortSignal) => {
        if (!companyId) {
            setUsers([]);
            setTotalUsers(0);
            setTotalPages(1);
            setErrorMessage("");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setErrorMessage("");

            const isSearching = search.trim().length > 0;

            const params = new URLSearchParams({
                page: String(isSearching ? 1 : page),
                pageSize: String(isSearching ? SEARCH_FETCH_SIZE : PAGE_SIZE),
            });

            if (isSearching) {
                params.set("search", search.trim());
            }

            const candidateUrls = [
                `${API_BASE_URL}/api/auth/company-users/${encodeURIComponent(companyId)}?${params.toString()}`,
                `${API_BASE_URL}/api/users/company/${encodeURIComponent(companyId)}?${params.toString()}`,
                `${API_BASE_URL}/api/user/company/${encodeURIComponent(companyId)}?${params.toString()}`,
                `${API_BASE_URL}/api/employees/company/${encodeURIComponent(companyId)}?${params.toString()}`,
            ];

            let resolvedPayload = null;

            for (const url of candidateUrls) {
                try {
                    const response = await fetch(url, {
                        method: "GET",
                        signal: abortSignal,
                    });

                    const data = await readJsonSafe(response);

                    if (!response.ok) continue;

                    resolvedPayload = data;
                    break;
                } catch (error) {
                    if (error.name === "AbortError") throw error;
                }
            }

            if (!resolvedPayload) {
                setUsers([]);
                setTotalUsers(0);
                setTotalPages(1);
                setErrorMessage("Failed to load users.");
                return;
            }

            const normalizedUsers = normalizeUsersResponse(resolvedPayload);
            const safeUsers = Array.isArray(normalizedUsers) ? normalizedUsers : [];
            const visibleUsers = safeUsers.filter((user) => !isAdminRole(getUserRole(user)));

            if (isSearching) {
                const locallyFilteredUsers = visibleUsers.filter((user) =>
                    matchesNameSearch(user, search)
                );
                const calculatedPages = Math.max(1, Math.ceil(locallyFilteredUsers.length / PAGE_SIZE));
                const paginatedUsers = locallyFilteredUsers.slice(
                    (page - 1) * PAGE_SIZE,
                    page * PAGE_SIZE
                );

                setUsers(paginatedUsers);
                setTotalUsers(locallyFilteredUsers.length);
                setTotalPages(calculatedPages);
                setCurrentPage(Math.min(page, calculatedPages));
                return;
            }

            const pagination = resolvedPayload?.pagination || {};
            const backendPage = Number(pagination?.page ?? resolvedPayload?.page ?? page) || page;
            const filteredTotal = visibleUsers.length;
            const calculatedTotalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

            setUsers(visibleUsers);
            setCurrentPage(Math.min(backendPage, calculatedTotalPages));
            setTotalUsers(filteredTotal);
            setTotalPages(calculatedTotalPages);
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Failed to fetch users:", error);
            setUsers([]);
            setTotalUsers(0);
            setTotalPages(1);
            setErrorMessage("Failed to load users.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 300);

        return () => clearTimeout(delay);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    useEffect(() => {
        const abortController = new AbortController();
        fetchTeams(abortController.signal);
        return () => abortController.abort();
    }, [companyId]);

    useEffect(() => {
        const abortController = new AbortController();
        fetchUsers(currentPage, debouncedSearchTerm, abortController.signal);
        return () => abortController.abort();
    }, [companyId, currentPage, debouncedSearchTerm]);

    const pageNumbers = useMemo(
        () => buildPageNumbers(currentPage, totalPages),
        [currentPage, totalPages]
    );

    const usersWithOriginalOrder = useMemo(
        () => users.map((user, index) => ({ user, originalIndex: index })),
        [users]
    );

    const sortedUsers = useMemo(() => {
        if (!sortConfig.key) return usersWithOriginalOrder.map(({ user }) => user);

        const sortableUsers = [...usersWithOriginalOrder];

        sortableUsers.sort((firstEntry, secondEntry) => {
            const firstUser = firstEntry.user;
            const secondUser = secondEntry.user;
            let result = 0;

            switch (sortConfig.key) {
                case "name":
                    result = compareTextValues(
                        getUserName(firstUser),
                        getUserName(secondUser),
                        sortConfig.direction
                    );
                    break;
                case "email":
                    result = compareTextValues(
                        firstUser?.email || "",
                        secondUser?.email || "",
                        sortConfig.direction
                    );
                    break;
                case "role":
                    result = compareRoleValues(
                        getUserRole(firstUser),
                        getUserRole(secondUser),
                        sortConfig.direction
                    );
                    break;
                case "jobType":
                    result = compareTextValues(
                        getUserJobType(firstUser),
                        getUserJobType(secondUser),
                        sortConfig.direction
                    );
                    break;
                case "team":
                    result = compareTextValues(
                        getResolvedUserTeam(firstUser, teams),
                        getResolvedUserTeam(secondUser, teams),
                        sortConfig.direction
                    );
                    break;
                case "status":
                    result = compareStatusValues(
                        getUserStatus(firstUser),
                        getUserStatus(secondUser),
                        sortConfig.direction
                    );
                    break;
                default:
                    result = 0;
            }

            if (result !== 0) return result;
            return firstEntry.originalIndex - secondEntry.originalIndex;
        });

        return sortableUsers.map(({ user }) => user);
    }, [usersWithOriginalOrder, sortConfig, teams]);

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
    };

    const openCreateModal = () => {
        setCreateForm(initialCreateForm);
        setCreateError("");
        setCreateSuccess("");
        setShowPassword(false);
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (isSubmittingCreate) return;
        setIsCreateModalOpen(false);
        setCreateError("");
        setCreateForm(initialCreateForm);
        setShowPassword(false);
    };

    const handleCreateFormChange = (field, value) => {
        if (field === "fullName" || field === "jobType") {
            value = capitalizeWords(value);
        }

        setCreateForm((prev) => ({ ...prev, [field]: value }));
    };


    const openDeleteModal = (user) => {
        setCreateError("");
        setCreateSuccess("");
        setUserPendingDelete(user);
    };

    const closeDeleteModal = () => {
        if (isDeletingUser) return;
        setUserPendingDelete(null);
    };

    const handleDeleteUser = async () => {
        const targetUserId = getUserId(userPendingDelete);

        if (!targetUserId) {
            setCreateError("User id is missing.");
            closeDeleteModal();
            return;
        }

        try {
            setIsDeletingUser(true);
            setCreateError("");
            setCreateSuccess("");

            const candidateRequests = [
                {
                    url: `${API_BASE_URL}/api/auth/delete-user/${encodeURIComponent(targetUserId)}`,
                    method: "DELETE",
                },
                {
                    url: `${API_BASE_URL}/api/users/${encodeURIComponent(targetUserId)}`,
                    method: "DELETE",
                },
                {
                    url: `${API_BASE_URL}/api/user/${encodeURIComponent(targetUserId)}`,
                    method: "DELETE",
                },
            ];

            let deleted = false;
            let resolvedData = null;

            for (const requestConfig of candidateRequests) {
                try {
                    const response = await fetch(requestConfig.url, {
                        method: requestConfig.method,
                    });

                    const data = await readJsonSafe(response);

                    if (!response.ok) {
                        continue;
                    }

                    resolvedData = data;
                    deleted = true;
                    break;
                } catch (error) {
                    console.error("Delete user request failed:", error);
                }
            }

            if (!deleted) {
                throw new Error("Failed to delete user.");
            }

            setUserPendingDelete(null);
            setCreateSuccess(resolvedData?.message || "User deleted successfully.");

            const remainingUsersOnPage = Math.max(0, users.length - 1);
            const nextPage =
                remainingUsersOnPage === 0 && currentPage > 1 ? currentPage - 1 : currentPage;

            setCurrentPage(nextPage);
            await fetchUsers(nextPage, debouncedSearchTerm);
            await fetchTeams();
        } catch (error) {
            console.error("Failed to delete user:", error);
            setCreateError(error.message || "Failed to delete user.");
        } finally {
            setIsDeletingUser(false);
        }
    };

    const handleCreateUser = async (event) => {
        event.preventDefault();

        if (!isCreateFormValid || !companyId) return;

        try {
            setIsSubmittingCreate(true);
            setCreateError("");
            setCreateSuccess("");

            const response = await fetch(`${API_BASE_URL}/api/auth/create-user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    companyId: Number(companyId),
                    fullName: createForm.fullName.trim(),
                    jobTitle: createForm.jobType.trim(),
                    jobType: createForm.jobType.trim(),
                    email: createForm.email.trim(),
                    password: createForm.password.trim(),
                    role: createForm.role.trim(),
                    sendInvitation: createForm.sendInvitation,
                }),
            });

            const data = await readJsonSafe(response);

            if (!response.ok || data?.success === false) {
                throw new Error(data?.message || data?.error || "Failed to create user.");
            }

            setCreateSuccess(
                createForm.sendInvitation
                    ? "User created and invitation email sent."
                    : "User created successfully."
            );

            setIsCreateModalOpen(false);
            setCreateForm(initialCreateForm);
            setShowPassword(false);
            setCurrentPage(1);
            await fetchUsers(1, debouncedSearchTerm);
            await fetchTeams();
        } catch (error) {
            console.error("Failed to create user:", error);
            setCreateError(error.message || "Failed to create user.");
        } finally {
            setIsSubmittingCreate(false);
        }
    };

const handleUserUpdated = (updatedUser) => {
    if (!updatedUser) {
        return;
    }

    setUsers((prevUsers) =>
        prevUsers.map((user) => {
            const existingUserId = getUserId(user);
            const updatedUserId = getUserId(updatedUser);

            if (String(existingUserId) !== String(updatedUserId)) {
                return user;
            }

            const resolvedRole =
                updatedUser.role ||
                updatedUser.roleName ||
                updatedUser.userRole ||
                getUserRole(user);

            const resolvedJobType =
                updatedUser.jobType ||
                updatedUser.jobTitle ||
                getUserJobType(user);

            const resolvedIsActive =
                typeof updatedUser.isActive === "boolean"
                    ? updatedUser.isActive
                    : typeof updatedUser.active === "boolean"
                        ? updatedUser.active
                        : String(updatedUser.status || "").trim().toLowerCase() === "active";

            return {
                ...user,
                ...updatedUser,
                role: resolvedRole,
                roleName: resolvedRole,
                userRole: resolvedRole,
                jobType: resolvedJobType,
                jobTitle: resolvedJobType,
                isActive: resolvedIsActive,
                active: resolvedIsActive,
                status: resolvedIsActive ? "Active" : "Inactive",
            };
        })
    );
};

useEffect(() => {
    const handleExternalUserUpdate = (event) => {
        const updatedUser = event?.detail;

        if (!updatedUser || !getUserId(updatedUser)) {
            return;
        }

        handleUserUpdated(updatedUser);

        const abortController = new AbortController();
        fetchUsers(currentPage, debouncedSearchTerm, abortController.signal);
        fetchTeams(abortController.signal);
    };

    window.addEventListener("taskora:user-updated", handleExternalUserUpdate);

    return () => {
        window.removeEventListener("taskora:user-updated", handleExternalUserUpdate);
    };
}, [currentPage, debouncedSearchTerm, companyId]);

    return (
        <section className="users-section">
            <div className="users-section__title-row">
                <h2>Users</h2>
                <div className="users-section__title-line" />
            </div>

            <div className="users-section__toolbar">
                <div className="users-section__search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search users by name..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>

                <button
                    type="button"
                    className="users-section__create-btn"
                    onClick={openCreateModal}
                >
                    <FiPlus />
                    <span>Create User</span>
                </button>
            </div>

            {createSuccess && (
                <div className="users-section__feedback users-section__feedback--success">
                    {createSuccess}
                </div>
            )}

            {isLoading && (
                <div className="users-section__state-card">
                    <div className="users-section__state-icon">
                        <FiUsers />
                    </div>
                    <h3>Loading users</h3>
                    <p>Please wait while the user list is being loaded.</p>
                </div>
            )}

            {!isLoading && errorMessage && (
                <div className="users-section__state-card users-section__state-card--error">
                    <div className="users-section__state-icon">
                        <FiUsers />
                    </div>
                    <h3>Unable to load users</h3>
                    <p>{errorMessage}</p>
                </div>
            )}

            {!isLoading && !errorMessage && users.length === 0 && (
                <div className="users-section__state-card">
                    <div className="users-section__state-icon">
                        <FiUsers />
                    </div>
                    <h3>No users found</h3>
                    <p>There are no users to display yet. Once users are added, they will appear here.</p>
                </div>
            )}

            {!isLoading && !errorMessage && users.length > 0 && (
                <div className="users-section__table-card">
                    <div className="users-section__table-wrap">
                        <table className="users-section__table">
                            <thead>
                                <tr>
                                    <th>
                                        <button type="button" className="users-section__sort-btn" onClick={() => toggleSort("name")}>
                                            <span>Name</span>
                                            <FiChevronDown className={sortConfig.key === "name" ? "users-section__sort-icon users-section__sort-icon--active" : "users-section__sort-icon"} />
                                        </button>
                                    </th>
                                    <th>
                                        <button type="button" className="users-section__sort-btn" onClick={() => toggleSort("email")}>
                                            <span>Email</span>
                                            <FiChevronDown className={sortConfig.key === "email" ? "users-section__sort-icon users-section__sort-icon--active" : "users-section__sort-icon"} />
                                        </button>
                                    </th>
                                    <th>
                                        <button type="button" className="users-section__sort-btn" onClick={() => toggleSort("role")}>
                                            <span>Role</span>
                                            <FiChevronDown className={sortConfig.key === "role" ? "users-section__sort-icon users-section__sort-icon--active" : "users-section__sort-icon"} />
                                        </button>
                                    </th>
                                    <th>
                                        <button type="button" className="users-section__sort-btn" onClick={() => toggleSort("jobType")}>
                                            <span>Job Type</span>
                                            <FiChevronDown className={sortConfig.key === "jobType" ? "users-section__sort-icon users-section__sort-icon--active" : "users-section__sort-icon"} />
                                        </button>
                                    </th>
                                    <th>
                                        <button type="button" className="users-section__sort-btn" onClick={() => toggleSort("team")}>
                                            <span>Team</span>
                                            <FiChevronDown className={sortConfig.key === "team" ? "users-section__sort-icon users-section__sort-icon--active" : "users-section__sort-icon"} />
                                        </button>
                                    </th>
                                    <th className="users-section__col-status">
                                        <button type="button" className="users-section__sort-btn" onClick={() => toggleSort("status")}>
                                            <span>Status</span>
                                            <FiChevronDown className={sortConfig.key === "status" ? "users-section__sort-icon users-section__sort-icon--active" : "users-section__sort-icon"} />
                                        </button>
                                    </th>
                                    <th className="users-section__col-actions">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sortedUsers.map((user, index) => {
                                    const userId = getUserId(user) || user?.email || `user-row-${index}`;
                                    const name = getUserName(user);
                                    const email = user?.email || "No email";
                                    const role = getUserRole(user);
                                    const jobType = getUserJobType(user);
                                    const team = getResolvedUserTeam(user, teams);
                                    const status = getUserStatus(user);
                                    const rowClass = index % 2 === 0
                                        ? "users-section__row--odd"
                                        : "users-section__row--even";
                                    const statusClass =
                                        String(status).toLowerCase() === "active"
                                            ? "users-section__status users-section__status--active"
                                            : "users-section__status users-section__status--inactive";

                                    return (
                                        <tr key={String(userId)} className={rowClass}>
                                            <td>
                                                <div className="users-section__user-cell">
                                                    <div className="users-section__avatar">{getInitials(name)}</div>
                                                    <div className="users-section__user-details">
                                                        <strong>{name}</strong>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{email}</td>
                                            <td>{role}</td>
                                            <td>{jobType}</td>
                                            <td>{team}</td>
                                            <td className="users-section__cell-status">
                                                <span className={statusClass}>{status}</span>
                                            </td>
                                            <td className="users-section__cell-actions">
                                                <div className="users-section__actions">
                                                    <button
                                                        type="button"
                                                        className="users-section__action-btn users-section__action-btn--edit"
                                                        title="View user details"
                                                        onClick={() => {
                                                            if (typeof onOpenUser === "function") {
                                                                onOpenUser(user);
                                                            }
                                                        }}
                                                    >
                                                        <FiEye />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="users-section__action-btn users-section__action-btn--danger"
                                                        title="Delete"
                                                        onClick={() => openDeleteModal(user)}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="users-section__pagination">
                        <div className="users-section__pagination-info">
                            {totalUsers === 0
                                ? "0 users"
                                : `${(currentPage - 1) * PAGE_SIZE + 1} - ${Math.min(
                                    currentPage * PAGE_SIZE,
                                    totalUsers
                                )} of ${totalUsers} users`}
                        </div>

                        <div className="users-section__pagination-controls">
                            <button
                                type="button"
                                className="users-section__page-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            >
                                <FiChevronLeft />
                                <span>Previous</span>
                            </button>

                            {pageNumbers.map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    className={`users-section__page-btn users-section__page-btn--number ${
                                        currentPage === pageNumber ? "users-section__page-btn--active" : ""
                                    }`}
                                    onClick={() => setCurrentPage(pageNumber)}
                                >
                                    {pageNumber}
                                </button>
                            ))}

                            <button
                                type="button"
                                className="users-section__page-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                <span>Next</span>
                                <FiChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {userPendingDelete && (
                <div className="users-section__modal-overlay" role="dialog" aria-modal="true">
                    <div className="users-section__modal users-section__modal--confirm">
                        <div className="users-section__confirm-top">
                            <div className="users-section__confirm-icon">
                                <FiAlertTriangle />
                            </div>

                            <button
                                type="button"
                                className="users-section__modal-close users-section__modal-close--confirm"
                                onClick={closeDeleteModal}
                                disabled={isDeletingUser}
                                aria-label="Close delete confirmation"
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="users-section__confirm-copy">
                            <h3>Delete user</h3>
                            <p>
                                Delete <strong>{getUserName(userPendingDelete)}</strong>? This will permanently remove the user from the backend and from any assigned team.
                            </p>
                        </div>

                        <div className="users-section__form-actions users-section__form-actions--confirm">
                            <button
                                type="button"
                                className="users-section__secondary-btn users-section__secondary-btn--confirm"
                                onClick={closeDeleteModal}
                                disabled={isDeletingUser}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="users-section__submit-btn users-section__submit-btn--danger"
                                onClick={handleDeleteUser}
                                disabled={isDeletingUser}
                            >
                                {isDeletingUser ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="users-section__modal-overlay" onClick={closeCreateModal}>
                    <div className="users-section__modal" onClick={(event) => event.stopPropagation()}>
                        <div className="users-section__modal-header users-section__modal-header--lined">
                            <div>
                                <h3>Create User</h3>
                                <p>Add a new user and set their access details.</p>
                            </div>

                            <button
                                type="button"
                                className="users-section__modal-close"
                                onClick={closeCreateModal}
                                aria-label="Close form"
                            >
                                <FiX />
                            </button>
                        </div>

                        {createError && (
                            <div className="users-section__feedback users-section__feedback--error">
                                {createError}
                            </div>
                        )}

                        <form className="users-section__form" onSubmit={handleCreateUser}>
                            <div className="users-section__form-group">
                                <label>
                                    Full Name <span className="users-section__required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.fullName}
                                    onChange={(event) => handleCreateFormChange("fullName", event.target.value)}
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div className="users-section__form-group">
                                <label>
                                    Job Type <span className="users-section__required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.jobType}
                                    onChange={(event) => handleCreateFormChange("jobType", event.target.value)}
                                    placeholder="Enter job type"
                                />
                            </div>

                            <div className="users-section__form-group">
                                <label>
                                    Role <span className="users-section__required">*</span>
                                </label>
                                <div className="users-section__select-wrapper">
                                    <select
                                        value={createForm.role}
                                        onChange={(event) => handleCreateFormChange("role", event.target.value)}
                                    >
                                        <option value="">Select role</option>
                                        <option value="Employee">Employee</option>
                                        <option value="Team Leader">Team Leader</option>
                                    </select>
                                    <FiChevronDown />
                                </div>
                            </div>

                            <div className="users-section__form-group">
                                <label>
                                    Email <span className="users-section__required">*</span>
                                </label>
                                <div className="users-section__input-wrap">
                                    <input
                                        type="email"
                                        className={emailTouched ? (emailIsValid ? "input-success" : "input-error") : ""}
                                        value={createForm.email}
                                        onChange={(event) => handleCreateFormChange("email", event.target.value)}
                                        placeholder="Enter email address"
                                    />
                                    {emailTouched && (
                                        <span
                                            className={`users-section__input-badge ${
                                                emailIsValid
                                                    ? "users-section__input-badge--success"
                                                    : "users-section__input-badge--error"
                                            }`}
                                        >
                                            {emailIsValid ? "Valid" : "Invalid"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="users-section__form-group">
                                <label>
                                    Password <span className="users-section__required">*</span>
                                </label>
                                <div className="users-section__password-field">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className={
                                            passwordTouched ? (passwordIsStrong ? "input-success" : "input-error") : ""
                                        }
                                        value={createForm.password}
                                        onChange={(event) => handleCreateFormChange("password", event.target.value)}
                                        placeholder="Enter password"
                                    />
                                    {passwordTouched && (
                                        <span
                                            className={`users-section__input-badge users-section__input-badge--password ${
                                                passwordIsStrong
                                                    ? "users-section__input-badge--success"
                                                    : "users-section__input-badge--error"
                                            }`}
                                        >
                                            {passwordIsStrong ? "Strong" : "Weak"}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="users-section__password-toggle"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <FiEye /> : <FiEyeOff />}
                                    </button>
                                </div>
                            </div>

                            <div className="users-section__checkbox-row">
                                <input
                                    id="sendInvitation"
                                    type="checkbox"
                                    checked={createForm.sendInvitation}
                                    onChange={(event) =>
                                        handleCreateFormChange("sendInvitation", event.target.checked)
                                    }
                                />
                                <span>Send user an email invitation with login instructions</span>
                            </div>

                            <div className="users-section__status-row">
                                <label>Status</label>
                                <button
                                    type="button"
                                    className={`users-section__switch ${createForm.isActive ? "users-section__switch--active" : ""}`}
                                    onClick={() => handleCreateFormChange("isActive", !createForm.isActive)}
                                    aria-label="Toggle status"
                                >
                                    <span className="users-section__switch-thumb" />
                                </button>
                                <span className="users-section__status-text">
                                    {createForm.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>

                            <div className="users-section__form-actions">
                                <button
                                    type="button"
                                    className="users-section__secondary-btn"
                                    onClick={closeCreateModal}
                                    disabled={isSubmittingCreate}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="users-section__submit-btn"
                                    disabled={!isCreateFormValid || isSubmittingCreate}
                                >
                                    {isSubmittingCreate ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
