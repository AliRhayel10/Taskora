import { useEffect, useRef, useState } from "react";
import {
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiSearch,
  FiSettings,
  FiUser,
  FiX,
} from "react-icons/fi";
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
  onOpenProfile,
  onOpenSettings,
  onLogout,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);

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

  useEffect(() => {
    if (!showSearch) {
      setIsSearchOpen(false);
      return;
    }

    if (String(searchValue || "").trim()) {
      setIsSearchOpen(true);
    }
  }, [searchValue, showSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const handleToggleProfileMenu = () => {
    setIsProfileMenuOpen((prev) => !prev);
  };

  const handleMenuAction = (callback) => {
    setIsProfileMenuOpen(false);
    if (typeof callback === "function") {
      callback();
    }
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__welcome">
        <strong>
          Welcome back,{" "}
          <span className="admin-topbar__welcome-name">{firstName}!</span>
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
              onClick={isSearchOpen ? handleCloseSearch : handleToggleSearch}
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

        <div className="admin-topbar__profile-menu-wrap" ref={profileMenuRef}>
          <button
            type="button"
            className="admin-topbar__profile"
            onClick={handleToggleProfileMenu}
            aria-expanded={isProfileMenuOpen}
            aria-label="Open profile menu"
          >
            <span className="admin-topbar__profile-avatar">
              {profileImage ? (
                <img src={profileImage} alt={displayName} />
              ) : (
                initials
              )}
            </span>

            <span className="admin-topbar__profile-copy">
              <strong>{displayName}</strong>
              <small>{email}</small>
            </span>

            <FiChevronDown
              className={`admin-topbar__profile-chevron ${
                isProfileMenuOpen ? "admin-topbar__profile-chevron--open" : ""
              }`}
            />
          </button>

          {isProfileMenuOpen && (
            <div className="admin-topbar__dropdown">
              <button
                type="button"
                className="admin-topbar__dropdown-item"
                onClick={() => handleMenuAction(onOpenProfile)}
              >
                <FiUser />
                <span>Profile</span>
              </button>

              <button
                type="button"
                className="admin-topbar__dropdown-item"
                onClick={() => handleMenuAction(onOpenSettings)}
              >
                <FiSettings />
                <span>Settings</span>
              </button>

              <div className="admin-topbar__dropdown-divider"></div>

              <button
                type="button"
                className="admin-topbar__dropdown-item admin-topbar__dropdown-item--danger"
                onClick={() => handleMenuAction(onLogout)}
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}