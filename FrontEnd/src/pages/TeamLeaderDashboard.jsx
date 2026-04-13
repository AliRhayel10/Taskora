import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TeamLeaderSidebar from "../components/TeamLeaderSidebar";
import AppTopbar from "../components/AppTopbar";
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

  const [theme, setTheme] = useState("light");
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [searchValue, setSearchValue] = useState("");

  const user = useMemo(() => {
    const routeUser = location.state?.user;

    if (!routeUser) return null;

    return {
      userId: routeUser.userId,
      companyId: routeUser.companyId,
      companyName: routeUser.companyName || "",
      fullName: routeUser.fullName || "Team Leader",
      email: routeUser.email || "",
      role: routeUser.role || "Team Leader",
      profileImageUrl: routeUser.profileImageUrl || "",
      jobTitle: routeUser.jobTitle || "",
      token: routeUser.token || "",
    };
  }, [location.state]);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    return () => {
      document.body.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
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
          onOpenProfile={() => {}}
          onOpenSettings={() => {}}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        />

        <section className="admin-main__content">
          <SectionTitle title={activeItem} />
        </section>
      </main>
    </div>
  );
}