import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar";
import AppTopbar from "../components/AppTopbar";
import EmployeeDashboardSection from "../components/employee/EmployeeDashboardSection";
import EmployeeProfileSection from "../components/employee/EmployeeProfileSection";
import "../assets/styles/employee/employee-dashboard.css";

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
    console.error(`[EmployeeDashboard] Failed to parse "${key}"`, error);
    return null;
  }
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isEmployee(user) {
  const role =
    user?.role ||
    user?.Role ||
    user?.user?.role ||
    user?.user?.Role ||
    "";

  return normalizeRole(role) === "employee";
}

export default function EmployeeDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("employee_theme") || "light";
  });

  const [activeItem, setActiveItem] = useState("Dashboard");
  const [searchValue, setSearchValue] = useState("");

  const [user, setUser] = useState(() => {
    const routeUser = location.state?.user || null;
    const authUser = parseStoredJson("authUser");
    const legacyUser = parseStoredJson("user");

    const currentUser = isEmployee(routeUser)
      ? routeUser
      : isEmployee(authUser)
        ? authUser
        : isEmployee(legacyUser)
          ? legacyUser
          : null;

    if (!currentUser) return null;

    return {
      userId: currentUser.userId,
      companyId: currentUser.companyId,
      companyName: currentUser.companyName || "",
      fullName: currentUser.fullName || currentUser.name || "Employee",
      email: currentUser.email || "",
      role: currentUser.role || "Employee",
      profileImageUrl: currentUser.profileImageUrl || "",
      jobTitle: currentUser.jobTitle || "",
      token: currentUser.token || "",
    };
  });

  useEffect(() => {
    localStorage.setItem("employee_theme", theme);
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

    localStorage.setItem("authUser", JSON.stringify(user));
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const searchPlaceholder = "Search";

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <EmployeeSidebar
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
              <EmployeeDashboardSection
                user={user}
                searchValue={searchValue}
              />
            </>
          ) : activeItem === "Profile" ? (
            <EmployeeProfileSection user={user} />
          ) : (
            <SectionTitle title={activeItem} />
          )}
        </section>
      </main>
    </div>
  );
}