import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiUsers } from "react-icons/fi";
import "../../assets/styles/admin/users-section.css";

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

function getUserTeam(user) {
  if (typeof user?.team === "string" && user.team.trim()) {
    return user.team;
  }

  return (
    user?.teamName ||
    user?.team?.teamName ||
    user?.team?.name ||
    "No team assigned"
  );
}

function getUserStatus(user) {
  if (typeof user?.isActive === "boolean") {
    return user.isActive ? "Active" : "Inactive";
  }

  if (typeof user?.active === "boolean") {
    return user.active ? "Active" : "Inactive";
  }

  if (typeof user?.status === "string" && user.status.trim()) {
    return user.status;
  }

  return "Active";
}

function getUserPhone(user) {
  return user?.phoneNumber || user?.phone || "-";
}

function normalizeUsersResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

export default function UsersSection({ onCreateUser }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = useMemo(() => {
    const rawCompanyId = currentUser?.companyId ?? currentUser?.company?.companyId;
    return rawCompanyId == null ? "" : String(rawCompanyId).trim();
  }, [currentUser]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchUsers = async () => {
      if (!companyId) {
        setErrorMessage("Company not found. Please sign in again.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_BASE_URL}/api/users/company/${encodeURIComponent(companyId)}`,
          {
            method: "GET",
            signal: abortController.signal,
          }
        );

        let data = null;

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            data?.message || data?.error || "Failed to load users."
          );
        }

        const normalizedUsers = normalizeUsersResponse(data).filter((user) => {
          const role = String(user?.role || "").toLowerCase().trim();
          return role !== "company admin" && role !== "admin";
        });

        setUsers(normalizedUsers);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch users:", error);
        setErrorMessage(error.message || "Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

    return () => abortController.abort();
  }, [companyId]);

  const filteredUsers = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    if (!value) {
      return users;
    }

    return users.filter((user) => {
      return [
        getUserName(user),
        user?.email || "",
        getUserPhone(user),
        getUserTeam(user),
        getUserStatus(user),
      ].some((field) => String(field).toLowerCase().includes(value));
    });
  }, [searchTerm, users]);

  const handleCreateClick = () => {
    if (typeof onCreateUser === "function") {
      onCreateUser();
    }
  };

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
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="users-section__create-btn"
          onClick={handleCreateClick}
        >
          <FiPlus />
          <span>Create User</span>
        </button>
      </div>

      {isLoading && (
        <div className="users-section__state-card">
          <p>Loading users...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="users-section__state-card users-section__state-card--error">
          <p>{errorMessage}</p>
        </div>
      )}

      {!isLoading && !errorMessage && filteredUsers.length === 0 && (
        <div className="users-section__state-card">
          <div className="users-section__state-icon">
            <FiUsers />
          </div>
          <h3>No users found</h3>
          <p>Users from the backend will appear here once they are available.</p>
        </div>
      )}

      {!isLoading && !errorMessage && filteredUsers.length > 0 && (
        <div className="users-section__table-card">
          <div className="users-section__table-wrap">
            <table className="users-section__table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Team</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const userId =
                    user?.userId ||
                    user?.id ||
                    user?._id ||
                    user?.email ||
                    `user-row-${index}`;

                  const name = getUserName(user);
                  const email = user?.email || "No email";
                  const phone = getUserPhone(user);
                  const team = getUserTeam(user);
                  const status = getUserStatus(user);
                  const statusClass =
                    String(status).toLowerCase() === "active"
                      ? "users-section__status users-section__status--active"
                      : "users-section__status users-section__status--inactive";

                  return (
                    <tr key={String(userId)}>
                      <td>
                        <div className="users-section__user-cell">
                          <div className="users-section__avatar">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="users-section__user-details">
                            <strong>{name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{email}</td>
                      <td>{phone}</td>
                      <td>{team}</td>
                      <td>
                        <span className={statusClass}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}