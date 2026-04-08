import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProfileSection from "../components/admin/ProfileSection";
import SettingsSection from "../components/admin/SettingsSection";
import TeamsSection from "../components/admin/TeamsSection";
import TeamDetailsPage from "../components/admin/TeamDetailsPage";
import UsersSection from "../components/admin/UsersSection";
import "./../assets/styles/admin/admin-dashboard.css";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [settingsResetSignal, setSettingsResetSignal] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

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

    setActiveSection(section);
  };

  const handleOpenTeamDetails = (team) => {
    setSelectedTeam(team);
    setActiveSection("TeamDetails");
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setActiveSection("Teams");
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Users":
        return <UsersSection />;

      case "Profile":
        return <ProfileSection user={user} />;

      case "Settings":
        return <SettingsSection resetSignal={settingsResetSignal} />;

      case "Teams":
        return <TeamsSection onOpenTeam={handleOpenTeamDetails} />;

      case "TeamDetails":
        return (
          <TeamDetailsPage
            team={selectedTeam}
            onBack={handleBackToTeams}
          />
        );

      case "Dashboard":
      default:
        return null;
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
        activeItem={activeSection === "TeamDetails" ? "Teams" : activeSection}
        onSelect={handleSectionSelect}
        onLogout={handleLogout}
      />

      <main className="admin-main">{renderSectionContent()}</main>
    </div>
  );
}