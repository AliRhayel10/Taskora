import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProfileSection from "../components/admin/ProfileSection";
import "./../assets/styles/admin-dashboard.css";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");

  const user = useMemo(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const role = (user.role || "").toLowerCase().trim();

    if (
      role !== "admin" &&
      role !== "company admin" &&
      role !== "companyadmin"
    ) {
      window.location.href = "/login";
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const getSectionText = () => {
    switch (activeSection) {
      case "Users":
        return {
          title: "Users",
          subtitle: "Manage user accounts, roles, and access.",
        };
      case "Teams":
        return {
          title: "Teams",
          subtitle: "Create teams and organize members.",
        };
      case "Tasks":
        return {
          title: "Tasks",
          subtitle: "Track assignments and task progress.",
        };
      case "Reports":
        return {
          title: "Reports",
          subtitle: "Review activity and performance insights.",
        };
      case "Profile":
        return {
          title: "Profile",
          subtitle: "View your account information and role details.",
        };
      case "Settings":
        return {
          title: "Settings",
          subtitle: "Update company and admin preferences.",
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Welcome to your admin workspace.",
        };
    }
  };

  const section = getSectionText();

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Profile":
        return <ProfileSection user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar
        user={user}
        activeItem={activeSection}
        onSelect={setActiveSection}
        onLogout={handleLogout}
      />

      <main className="admin-main">
        <div className="admin-page-header">
          <h1>{section.title}</h1>
          <p>{section.subtitle}</p>
        </div>

        {renderSectionContent()}
      </main>
    </div>
  );
}