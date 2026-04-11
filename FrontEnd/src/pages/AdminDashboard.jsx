import { useEffect, useMemo, useState } from "react";
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
import TasksSection from "../components/admin/TasksSection";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [settingsResetSignal, setSettingsResetSignal] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [topbarSearch, setTopbarSearch] = useState("");

  const storedUser = useMemo(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  }, []);

  useEffect(() => {
    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    const role = (storedUser.role || "").toLowerCase().trim();

    if (
      role !== "admin" &&
      role !== "company admin" &&
      role !== "companyadmin"
    ) {
      window.location.href = "/login";
      return;
    }

    const fetchFreshProfile = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/auth/profile/${storedUser.userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch latest profile.");
        }

        setUser(data);

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            ...data,
          })
        );
      } catch (error) {
        console.error("Failed to fetch fresh profile:", error);
        setUser(storedUser);
      } finally {
        setLoading(false);
      }
    };

    fetchFreshProfile();
  }, [storedUser]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
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

  const shouldShowSearch = () => {
    return ["Users", "Teams", "TeamDetails"].includes(activeSection);
  };

  const getSearchPlaceholder = () => {
    switch (activeSection) {
      case "Users":
        return "Search users...";
      case "Teams":
        return "Search teams...";
      case "TeamDetails":
        return "Search team members...";
      case "Tasks":
        return "Search tasks...";
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

      case "Tasks":
        return <TasksSection />;

      case "Dashboard":
        return <DashboardSection />;

      default:
        return <DashboardSection />;
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
          notificationCount={0}
          onOpenProfile={() => handleSectionSelect("Profile")}
          onOpenSettings={() => handleSectionSelect("Settings")}
          onLogout={handleLogout}
        />

        <div className="admin-main__content">
          {renderSectionContent()}
        </div>
      </main>
    </div>
  );
}