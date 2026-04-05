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
  return (
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unnamed user"
  );
}

function getUserTeam(user) {
  return user.teamName || user.team?.teamName || user.team || "No team assigned";
}

function getUserStatus(user) {
  if (typeof user.isActive === "boolean") {
    return user.isActive ? "Active" : "Inactive";
  }

  if (typeof user.active === "boolean") {
    return user.active ? "Active" : "Inactive";
  }

  return user.status || "Active";
}

export default function UsersSection({ onCreateUser }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const currentUser = useMemo(() => getStoredUser(), []);
  const companyId = currentUser?.companyId || 0;

  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId) {
        setErrorMessage("Company not found. Please sign in again.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/api/users/company/${companyId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load users.");
        }

        const normalizedUsers = Array.isArray(data)
          ? data.filter((user) => {
              const role = String(user.role || "").toLowerCase();
              return role !== "company admin" && role !== "admin";
            })
          : [];

        setUsers(normalizedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        setErrorMessage(error.message || "Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [companyId]);

  const filteredUsers = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    if (!value) {
      return users;
    }

    return users.filter((user) => {
      return [
        getUserName(user),
        user.email || "",
        user.phoneNumber || user.phone || "",
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
        <div className="users-section__title-line"></div>
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
                {filteredUsers.map((user) => {
                  const userId = user.userId || user.id || user.email;
                  const name = getUserName(user);
                  const email = user.email || "No email";
                  const phone = user.phoneNumber || user.phone || "-";
                  const team = getUserTeam(user);
                  const status = getUserStatus(user);
                  const statusClass = String(status).toLowerCase() === "active"
                    ? "users-section__status users-section__status--active"
                    : "users-section__status users-section__status--inactive";

                  return (
                    <tr key={userId}>
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
