import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProfileSection from "../components/admin/ProfileSection";
import "./../assets/styles/admin/admin-dashboard.css";

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
        {renderSectionContent()}
      </main>
    </div>
  );
}