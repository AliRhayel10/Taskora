import { FiBell, FiChevronDown, FiSearch } from "react-icons/fi";
import "../assets/styles/app-topbar.css";

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function getUserDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.user?.fullName ||
    user?.user?.name ||
    "Admin User"
  );
}

function getUserRole(user) {
  return user?.role || user?.user?.role || "Admin";
}

function getUserImage(user) {
  const rawValue =
    user?.profileImageUrl ||
    user?.profileImage ||
    user?.avatar ||
    user?.image ||
    user?.user?.profileImageUrl ||
    user?.user?.profileImage ||
    "";

  if (!rawValue) {
    return "";
  }

  if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
    return rawValue;
  }

  return `http://localhost:5000${rawValue}`;
}

export default function AppTopbar({
  user,
  searchValue = "",
  onSearchChange,
  notificationCount = 0,
  showSearch = true,
  searchPlaceholder = "Search...",
}) {
  const displayName = getUserDisplayName(user);
  const displayRole = getUserRole(user);
  const profileImage = getUserImage(user);
  const initials = getInitials(displayName);

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__spacer"></div>

      <div className="admin-topbar__right">
        {showSearch && (
          <div className="admin-topbar__search">
            <FiSearch />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => {
                if (typeof onSearchChange === "function") {
                  onSearchChange(event.target.value);
                }
              }}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        <button
          type="button"
          className="admin-topbar__alerts"
          aria-label="Notifications"
        >
          <FiBell />
          {notificationCount > 0 && (
            <span className="admin-topbar__alerts-badge">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        <button type="button" className="admin-topbar__profile">
          <span className="admin-topbar__profile-avatar">
            {profileImage ? (
              <img src={profileImage} alt={displayName} />
            ) : (
              initials
            )}
          </span>

          <span className="admin-topbar__profile-copy">
            <strong>{displayName}</strong>
            <small>{displayRole}</small>
          </span>

          <FiChevronDown className="admin-topbar__profile-chevron" />
        </button>
      </div>
    </header>
  );
}