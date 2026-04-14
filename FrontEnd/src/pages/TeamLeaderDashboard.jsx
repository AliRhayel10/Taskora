import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TeamLeaderSidebar from "../components/TeamLeaderSidebar";
import AppTopbar from "../components/AppTopbar";
import TeamLeaderDashboardSection from "../components/teamleader/TeamLeaderDashboardSection";
import TeamLeaderProfileSection from "../components/teamleader/TeamLeaderProfileSection";
import "../assets/styles/teamleader/team-leader-dashboard.css";

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

export default function TeamLeaderDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("tl_theme") || "light";
  });

  const [activeItem, setActiveItem] = useState("Dashboard");
  const [searchValue, setSearchValue] = useState("");

  const user = useMemo(() => {
    const routeUser = location.state?.user;
    const savedUser = localStorage.getItem("user");

    const currentUser = routeUser || (savedUser ? JSON.parse(savedUser) : null);

    if (!currentUser) return null;

    return {
      userId: currentUser.userId,
      companyId: currentUser.companyId,
      companyName: currentUser.companyName || "",
      fullName: currentUser.fullName || "Team Leader",
      email: currentUser.email || "",
      role: currentUser.role || "Team Leader",
      profileImageUrl: currentUser.profileImageUrl || "",
      jobTitle: currentUser.jobTitle || "",
      token: currentUser.token || "",
    };
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem("tl_theme", theme);
    document.body.classList.toggle("dark", theme === "dark");

    return () => {
      document.body.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

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
          searchPlaceholder="Search tasks, team members..."
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
            <TeamLeaderDashboardSection />
          ) : activeItem === "Profile" ? (
            <TeamLeaderProfileSection user={user} />
          ) : (
            <SectionTitle title={activeItem} />
          )}
        </section>
      </main>
    </div>
  );
}