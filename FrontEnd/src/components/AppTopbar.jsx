import { useEffect, useRef, useState } from "react";
import { FiBell, FiSearch, FiX } from "react-icons/fi";
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

function getUserFirstName(user) {
  const fullName = getUserDisplayName(user).trim();
  return fullName.split(/\s+/)[0] || "Admin";
}

function getUserEmail(user) {
  return user?.email || user?.user?.email || "No email";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const displayName = getUserDisplayName(user);
  const firstName = getUserFirstName(user);
  const email = getUserEmail(user);
  const profileImage = getUserImage(user);
  const initials = getInitials(displayName);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleToggleSearch = () => {
    if (!showSearch) return;
    setIsSearchOpen((prev) => !prev);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    if (typeof onSearchChange === "function") {
      onSearchChange("");
    }
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__welcome">
        <strong>
          Welcome back, <span className="admin-topbar__welcome-name">{firstName}!</span>
        </strong>
      </div>

      <div className="admin-topbar__right">
        {showSearch && (
          <div
            className={`admin-topbar__search-shell ${
              isSearchOpen ? "admin-topbar__search-shell--open" : ""
            }`}
          >
            <button
              type="button"
              className="admin-topbar__search-toggle"
              onClick={handleToggleSearch}
              aria-label={isSearchOpen ? "Close search" : "Open search"}
            >
              {isSearchOpen ? <FiX /> : <FiSearch />}
            </button>

            <div
              className={`admin-topbar__search ${
                isSearchOpen ? "admin-topbar__search--open" : ""
              }`}
            >
              <FiSearch className="admin-topbar__search-icon" />
              <input
                ref={searchInputRef}
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
            {profileImage ? <img src={profileImage} alt={displayName} /> : initials}
          </span>

          <span className="admin-topbar__profile-copy">
            <strong>{displayName}</strong>
            <small>{email}</small>
          </span>
        </button>
      </div>
    </header>
  );
}