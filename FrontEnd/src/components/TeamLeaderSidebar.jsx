import { useEffect, useMemo, useState } from "react";
import {
  FiGrid,
  FiCheckSquare,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import "../assets/styles/teamleader/team-leader-sidebar.css";

export default function TeamLeaderSidebar({
  activeItem = "Dashboard",
  onSelect,
  theme = "light",
}) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("teamLeaderSidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("teamLeaderSidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const navItems = useMemo(
    () => [
      { name: "Dashboard", icon: <FiGrid /> },
      { name: "Team", icon: <FiUsers /> },
      { name: "Tasks", icon: <FiCheckSquare /> },
    ],
    []
  );

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="admin-sidebar__toggle"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
      </button>

      <div className="admin-sidebar__top">
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand">
            <BrandLogo
              subtitle="Team Leader"
              dark={theme === "dark"}
              collapsed={collapsed}
            />
          </div>
        </div>

        <div className="admin-sidebar__divider"></div>

        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`admin-sidebar__link ${
                activeItem === item.name ? "admin-sidebar__link--active" : ""
              }`}
              onClick={() => onSelect?.(item.name)}
              title={collapsed ? item.name : ""}
            >
              <span className="admin-sidebar__link-icon">{item.icon}</span>
              <span className="admin-sidebar__link-text">{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}