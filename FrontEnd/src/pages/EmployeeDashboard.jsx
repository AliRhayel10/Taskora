import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar";
import AppTopbar from "../components/AppTopbar";
import EmployeeDashboardSection from "../components/employee/EmployeeDashboardSection";
import EmployeeProfileSection from "../components/employee/EmployeeProfileSection";
import EmployeeTaskDetailsPage from "../components/employee/EmployeeTaskDetailsPage";
import "../assets/styles/employee/employee-dashboard.css";

function SectionTitle({ title }) {
  return (
    <div className="users-section users-section--title-only employee-dashboard__title-section">
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
  const { taskId } = useParams();

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
      profileImageUpdatedAt:
        currentUser.profileImageUpdatedAt || currentUser.profileImageVersion || "",
      jobTitle: currentUser.jobTitle || "",
      token: currentUser.token || "",
    };
  });

  const handleUserUpdate = useCallback((updatedUser) => {
    if (!updatedUser) return;

    setUser((prev) => {
      const nextUser = {
        ...(prev || {}),
        ...updatedUser,
        role: updatedUser.role || prev?.role || "Employee",
      };

      localStorage.setItem("authUser", JSON.stringify(nextUser));
      localStorage.setItem("user", JSON.stringify(nextUser));

      return nextUser;
    });
  }, []);

  useEffect(() => {
    const handleStoredUserUpdate = (event) => {
      const updatedUser = event?.detail;
      if (!updatedUser) return;

      const updatedUserId = updatedUser.userId || updatedUser.id || updatedUser.user?.userId || 0;
      if (updatedUserId && user?.userId && Number(updatedUserId) !== Number(user.userId)) return;

      handleUserUpdate(updatedUser);
    };

    window.addEventListener("taskora-user-updated", handleStoredUserUpdate);

    return () => {
      window.removeEventListener("taskora-user-updated", handleStoredUserUpdate);
    };
  }, [handleUserUpdate, user?.userId]);

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
    localStorage.setItem("user", JSON.stringify(user));
  }, [user, navigate]);

  useEffect(() => {
    if (taskId) {
      setActiveItem("Dashboard");
    }
  }, [taskId]);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleSidebarSelect = (item) => {
    setActiveItem(item);

    if (item === "Dashboard") {
      navigate("/employee");
      return;
    }

    if (taskId) {
      navigate("/employee");
    }
  };

  const searchPlaceholder = "Search";

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <EmployeeSidebar
        user={user}
        activeItem={activeItem}
        onSelect={handleSidebarSelect}
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
          onOpenProfile={() => {
            setActiveItem("Profile");
            if (taskId) {
              navigate("/employee");
            }
          }}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        />

        <section className="admin-main__content">
          {taskId ? (
            <EmployeeTaskDetailsPage />
          ) : activeItem === "Dashboard" ? (
            <>
              <SectionTitle title="Dashboard" />
              <EmployeeDashboardSection
                user={user}
                searchValue={searchValue}
              />
            </>
          ) : activeItem === "Profile" ? (
            <EmployeeProfileSection
              user={user}
              setUser={setUser}
              onProfileUpdated={handleUserUpdate}
            />
          ) : (
            <SectionTitle title={activeItem} />
          )}
        </section>
      </main>
    </div>
  );
}