import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TeamLeaderSidebar from "../components/TeamLeaderSidebar";
import AppTopbar from "../components/AppTopbar";
import TeamLeaderDashboardSection from "../components/teamleader/TeamLeaderDashboardSection";
import TeamLeaderProfileSection from "../components/teamleader/TeamLeaderProfileSection";
import TasksSection from "../components/teamleader/TasksSection";
import "../assets/styles/teamleader/team-leader-dashboard.css";
import "../assets/styles/teamleader/tasks-section.css";

function SectionTitle({ title }) {
  return (
    <div className="users-section">
      <div className="users-section__title-row">
        <h2>{title}</h2>
        <div className="users-section__title-line"></div>
      </div>
    </div>
  );
}

function parseStoredJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(`[TeamLeaderDashboard] Failed to parse "${key}"`, error);
    return null;
  }
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isTeamLeader(user) {
  const role =
    user?.role ||
    user?.Role ||
    user?.user?.role ||
    user?.user?.Role ||
    "";

  return normalizeRole(role) === "teamleader";
}

export default function TeamLeaderDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("tl_theme") || "light";
  });

  const [activeItem, setActiveItem] = useState("Dashboard");
  const [searchValue, setSearchValue] = useState("");

  const [user, setUser] = useState(() => {
    const routeUser = location.state?.user || null;
    const authUser = parseStoredJson("authUser");
    const legacyUser = parseStoredJson("user");

    console.group("[TeamLeaderDashboard Init]");
    console.log("location.state?.user:", routeUser);
    console.log('localStorage "authUser":', authUser);
    console.log('localStorage "user":', legacyUser);
    console.groupEnd();

    const currentUser = isTeamLeader(routeUser)
      ? routeUser
      : isTeamLeader(authUser)
        ? authUser
        : isTeamLeader(legacyUser)
          ? legacyUser
          : null;

    console.log("[TeamLeaderDashboard] selected currentUser:", currentUser);

    if (!currentUser) return null;

    return {
      userId: currentUser.userId,
      companyId: currentUser.companyId,
      companyName: currentUser.companyName || "",
      fullName: currentUser.fullName || currentUser.name || "Team Leader",
      email: currentUser.email || "",
      role: currentUser.role || "Team Leader",
      profileImageUrl: currentUser.profileImageUrl || "",
      jobTitle: currentUser.jobTitle || "",
      token: currentUser.token || "",
    };
  });

  useEffect(() => {
    localStorage.setItem("tl_theme", theme);
    document.body.classList.toggle("dark", theme === "dark");

    return () => {
      document.body.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    if (!user) {
      console.warn("[TeamLeaderDashboard] No valid team leader user found. Redirecting to login.");
      navigate("/login", { replace: true });
      return;
    }

    console.log("[TeamLeaderDashboard] Persisting authUser:", user);
    localStorage.setItem("authUser", JSON.stringify(user));
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const searchPlaceholder =
    activeItem === "Dashboard"
      ? "Search"
      : activeItem === "Tasks"
        ? "Search tasks"
        : "Search";

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <TeamLeaderSidebar
        activeItem={activeItem}
        onSelect={setActiveItem}
        theme={theme}
      />

      <main className="admin-main">
        <AppTopbar
          user={user}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          notificationCount={0}
          showSearch={true}
          searchPlaceholder={searchPlaceholder}
          onOpenProfile={() => setActiveItem("Profile")}
          onOpenSettings={() => {}}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        />

        <section className="admin-main__content">
          {activeItem === "Dashboard" ? (
            <>
              <SectionTitle title="Dashboard" />
              <TeamLeaderDashboardSection
                user={user}
                searchValue={searchValue}
              />
            </>
          ) : activeItem === "Tasks" ? (
            <TasksSection
              searchValue={searchValue}
              user={user}
            />
          ) : activeItem === "Profile" ? (
            <TeamLeaderProfileSection user={user} setUser={setUser} />
          ) : (
            <SectionTitle title={activeItem} />
          )}
        </section>
      </main>
    </div>
  );
}