import { useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiUsers,
  FiX,
  FiChevronDown,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import "../../assets/styles/admin/users-section.css";

const API_BASE_URL = "http://localhost:5000";

const initialCreateForm = {
  fullName: "",
  jobType: "",
  role: "",
  email: "",
  password: "",
  sendInvitation: true,
  isActive: true,
};

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

function getUserPhone(user) {
  return user?.phoneNumber || user?.phone || "-";
}

function getUserStatus(user) {
  if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Inactive";
  if (typeof user?.active === "boolean") return user.active ? "Active" : "Inactive";
  if (typeof user?.status === "string" && user.status.trim()) return user.status;
  return "Active";
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

export default function UsersSection() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [showPassword, setShowPassword] = useState(false);

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

  const fetchUsers = async (abortSignal) => {
    if (!companyId) {
      setUsers([]);
      setErrorMessage("");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const candidateUrls = [
        `${API_BASE_URL}/api/users/company/${encodeURIComponent(companyId)}`,
        `${API_BASE_URL}/api/user/company/${encodeURIComponent(companyId)}`,
        `${API_BASE_URL}/api/employees/company/${encodeURIComponent(companyId)}`,
        `${API_BASE_URL}/api/employees/${encodeURIComponent(companyId)}`,
      ];

      let resolvedUsers = null;

      for (const url of candidateUrls) {
        try {
          const response = await fetch(url, {
            method: "GET",
            signal: abortSignal,
          });

          const data = await readJsonSafe(response);
          if (!response.ok) continue;

          const normalized = normalizeUsersResponse(data);
          if (Array.isArray(normalized)) {
            resolvedUsers = normalized;
            break;
          }
        } catch (error) {
          if (error.name === "AbortError") throw error;
        }
      }

      setUsers(Array.isArray(resolvedUsers) ? resolvedUsers : []);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setErrorMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchUsers(abortController.signal);
    return () => abortController.abort();
  }, [companyId]);

  const filteredUsers = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    if (!value) return users;

    return users.filter((user) =>
      [
        getUserName(user),
        user?.email || "",
        getUserPhone(user),
        getUserTeam(user),
        getUserStatus(user),
        user?.jobTitle || "",
        user?.role || "",
      ].some((field) => String(field).toLowerCase().includes(value))
    );
  }, [searchTerm, users]);

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
    setCreateForm((prev) => ({ ...prev, [field]: value }));
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

      await fetchUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      setCreateError(error.message || "Failed to create user.");
    } finally {
      setIsSubmittingCreate(false);
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
          <p>Please wait while the employee list is being loaded.</p>
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

      {!isLoading && !errorMessage && filteredUsers.length === 0 && (
        <div className="users-section__state-card">
          <div className="users-section__state-icon">
            <FiUsers />
          </div>
          <h3>No users found</h3>
          <p>There are no employees to display yet. Once users are added, they will appear here.</p>
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

      {isCreateModalOpen && (
        <div className="users-section__modal-overlay" onClick={closeCreateModal}>
          <div
            className="users-section__modal"
            onClick={(event) => event.stopPropagation()}
          >
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
                  onChange={(event) =>
                    handleCreateFormChange("fullName", event.target.value)
                  }
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
                  onChange={(event) =>
                    handleCreateFormChange("jobType", event.target.value)
                  }
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
                    onChange={(event) =>
                      handleCreateFormChange("role", event.target.value)
                    }
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
                    className={
                      emailTouched
                        ? emailIsValid
                          ? "input-success"
                          : "input-error"
                        : ""
                    }
                    value={createForm.email}
                    onChange={(event) =>
                      handleCreateFormChange("email", event.target.value)
                    }
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
                      passwordTouched
                        ? passwordIsStrong
                          ? "input-success"
                          : "input-error"
                        : ""
                    }
                    value={createForm.password}
                    onChange={(event) =>
                      handleCreateFormChange("password", event.target.value)
                    }
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
                  className={`users-section__switch ${
                    createForm.isActive ? "users-section__switch--active" : ""
                  }`}
                  onClick={() =>
                    handleCreateFormChange("isActive", !createForm.isActive)
                  }
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