import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AppTopbar from "../components/AppTopbar";
import DashboardSection from "../components/admin/DashboardSection";
import ProfileSection from "../components/admin/ProfileSection";
import SettingsSection from "../components/admin/SettingsSection";
import TeamsSection from "../components/admin/TeamsSection";
import TeamDetailsPage from "../components/admin/TeamDetailsPage";
import UserDetailsPage from "../components/admin/UserDetailsPage";
import UsersSection from "../components/admin/UsersSection";
import "./../assets/styles/admin/admin-dashboard.css";

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("Dashboard");
  const [settingsResetSignal, setSettingsResetSignal] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [topbarSearch, setTopbarSearch] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("admin-theme") || "light"
  );

  const resolvedUser = useMemo(() => {
    const routeUser = location.state?.user;

    if (routeUser) {
      localStorage.setItem("user", JSON.stringify(routeUser));
      return routeUser;
    }

    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  }, [location.state]);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("admin-theme", theme);

    return () => {
      document.body.classList.remove("light", "dark");
    };
  }, [theme]);

  useEffect(() => {
    if (!resolvedUser) {
      navigate("/login", { replace: true });
      return;
    }

    const role = String(resolvedUser.role || "")
      .toLowerCase()
      .trim();

    if (
      role !== "admin" &&
      role !== "company admin" &&
      role !== "companyadmin"
    ) {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      return;
    }

    const fetchFreshProfile = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/auth/profile/${resolvedUser.userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch latest profile.");
        }

        const mergedUser = {
          ...resolvedUser,
          ...data,
        };

        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
      } catch (error) {
        console.error("Failed to fetch fresh profile:", error);
        setUser(resolvedUser);
      } finally {
        setLoading(false);
      }
    };

    fetchFreshProfile();
  }, [resolvedUser, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleSectionSelect = (section) => {
    if (section === "Settings") {
      setSettingsResetSignal((prev) => prev + 1);
    }

    if (section !== "TeamDetails") {
      setSelectedTeam(null);
    }

    if (section !== "UserDetails") {
      setSelectedUser(null);
    }

    if (section === "Tasks") {
      setTopbarSearch("");
      setActiveSection("Dashboard");
      return;
    }

    setTopbarSearch("");
    setActiveSection(section);
  };

  const handleOpenTeamDetails = (team) => {
    setSelectedUser(null);
    setSelectedTeam(team);
    setTopbarSearch("");
    setActiveSection("TeamDetails");
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setTopbarSearch("");
    setActiveSection("Teams");
  };

  const handleOpenUserDetails = (selectedUserData) => {
    setSelectedTeam(null);
    setSelectedUser(selectedUserData);
    setTopbarSearch("");
    setActiveSection("UserDetails");
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setTopbarSearch("");
    setActiveSection("Users");
  };

  const handleUserUpdated = (updatedUser) => {
    setSelectedUser(updatedUser);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const shouldShowSearch = () => {
    return ["Dashboard", "Users", "Teams", "TeamDetails"].includes(
      activeSection
    );
  };

  const getSearchPlaceholder = () => {
    switch (activeSection) {
      case "Users":
        return "Search users...";
      case "Teams":
        return "Search teams...";
      case "TeamDetails":
        return "Search team members...";
      case "Dashboard":
        return "Search...";
      default:
        return "Search...";
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Users":
        return (
          <UsersSection
            onOpenUser={handleOpenUserDetails}
            searchValue={topbarSearch}
            onSearchChange={setTopbarSearch}
          />
        );

      case "UserDetails":
        if (!selectedUser) {
          return (
            <UsersSection
              onOpenUser={handleOpenUserDetails}
              searchValue={topbarSearch}
              onSearchChange={setTopbarSearch}
            />
          );
        }

        return (
          <UserDetailsPage
            user={selectedUser}
            onBack={handleBackToUsers}
            onUserUpdated={handleUserUpdated}
          />
        );

      case "Profile":
        return <ProfileSection user={user} />;

      case "Settings":
        return <SettingsSection resetSignal={settingsResetSignal} />;

      case "Teams":
        return (
          <TeamsSection
            onOpenTeam={handleOpenTeamDetails}
            searchValue={topbarSearch}
            onSearchChange={setTopbarSearch}
          />
        );

      case "TeamDetails":
        if (!selectedTeam) {
          return (
            <TeamsSection
              onOpenTeam={handleOpenTeamDetails}
              searchValue={topbarSearch}
              onSearchChange={setTopbarSearch}
            />
          );
        }

        return (
          <TeamDetailsPage
            team={selectedTeam}
            onBack={handleBackToTeams}
            searchValue={topbarSearch}
            onSearchChange={setTopbarSearch}
          />
        );

      case "Dashboard":
        return <DashboardSection searchValue={topbarSearch} />;

      default:
        return <DashboardSection searchValue={topbarSearch} />;
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <main className="admin-main">Loading...</main>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar
        user={user}
        theme={theme}
        activeItem={
          activeSection === "TeamDetails"
            ? "Teams"
            : activeSection === "UserDetails"
            ? "Users"
            : activeSection
        }
        onSelect={handleSectionSelect}
      />

      <main className="admin-main">
        <AppTopbar
          user={user}
          showSearch={shouldShowSearch()}
          searchValue={topbarSearch}
          onSearchChange={setTopbarSearch}
          searchPlaceholder={getSearchPlaceholder()}
          onOpenProfile={() => handleSectionSelect("Profile")}
          onOpenSettings={() => handleSectionSelect("Settings")}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <div className="admin-main__content">{renderSectionContent()}</div>
      </main>
    </div>
  );
}