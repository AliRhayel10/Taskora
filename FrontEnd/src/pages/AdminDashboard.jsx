import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
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

  return (
    <div className="admin-layout">
      <AdminSidebar
        user={user}
        activeItem={activeSection}
        onSelect={setActiveSection}
        onLogout={handleLogout}
      />

      <main className="admin-main">
        <div className="admin-placeholder-card">
          <h1>{section.title}</h1>
          <p>{section.subtitle}</p>
        </div>
      </main>
    </div>
  );
}