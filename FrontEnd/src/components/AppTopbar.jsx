import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronDown,
  FiLogOut,
  FiMoon,
  FiSearch,
  FiSettings,
  FiSun,
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

function parseStoredUser(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getUserDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.user?.fullName ||
    user?.user?.name ||
    "User"
  );
}

function getUserFirstName(user) {
  const fullName = getUserDisplayName(user).trim();
  return fullName.split(/\s+/)[0] || "User";
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

  if (!rawValue) return "";

  const normalizedValue = String(rawValue).trim();
  const baseUrl =
    normalizedValue.startsWith("http://") || normalizedValue.startsWith("https://")
      ? normalizedValue
      : `http://localhost:5000${normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`}`;

  const cacheKey =
    user?.profileImageUpdatedAt ||
    user?.profileImageVersion ||
    user?.user?.profileImageUpdatedAt ||
    user?.user?.profileImageVersion ||
    "";

  if (!cacheKey) return baseUrl;

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}v=${encodeURIComponent(cacheKey)}`;
}

export default function AppTopbar({
  user,
  searchValue = "",
  onSearchChange,
  showSearch = true,
  searchPlaceholder = "Search...",
  onOpenProfile,
  onOpenSettings,
  onLogout,
  theme = "light",
  onToggleTheme,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [storedUserRevision, setStoredUserRevision] = useState(0);

  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);

  const effectiveUser = useMemo(() => {
    const authUser = parseStoredUser("authUser");
    const storedUser = parseStoredUser("user");

    return user || authUser || storedUser || null;
  }, [storedUserRevision, user]);

  const displayName = getUserDisplayName(effectiveUser);
  const firstName = getUserFirstName(effectiveUser);
  const email = getUserEmail(effectiveUser);
  const profileImage = getUserImage(effectiveUser);
  const initials = getInitials(displayName);
  const [profileImageFailed, setProfileImageFailed] = useState(false);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [profileImage]);

  const canOpenSettings = typeof onOpenSettings === "function";

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


  useEffect(() => {
    const refreshStoredUser = () => {
      setStoredUserRevision((prev) => prev + 1);
    };

    window.addEventListener("taskora-user-updated", refreshStoredUser);
    window.addEventListener("storage", refreshStoredUser);

    return () => {
      window.removeEventListener("taskora-user-updated", refreshStoredUser);
      window.removeEventListener("storage", refreshStoredUser);
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
          className="admin-topbar__theme-toggle"
          onClick={onToggleTheme}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
          title={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
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
              {profileImage && !profileImageFailed ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  onError={() => setProfileImageFailed(true)}
                />
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

              {canOpenSettings && (
                <button
                  type="button"
                  className="admin-topbar__dropdown-item"
                  onClick={() => handleMenuAction(onOpenSettings)}
                >
                  <FiSettings />
                  <span>Settings</span>
                </button>
              )}

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