import { useEffect, useMemo, useState } from "react";
import {
  FiGrid,
  FiUsers,
  FiCheckSquare,
  FiBarChart2,
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
    const saved = localStorage.getItem("teamLeaderSidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("teamLeaderSidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const navItems = useMemo(
    () => [
      { name: "Dashboard", icon: <FiGrid /> },
      { name: "Team", icon: <FiUsers /> },
      { name: "Tasks", icon: <FiCheckSquare /> },
      { name: "Workload", icon: <FiBarChart2 /> },
    ],
    []
  );

  return (
    <aside className={`teamleader-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="teamleader-sidebar__toggle"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
      </button>

      <div className="teamleader-sidebar__top">
        <div className="teamleader-sidebar__header">
          <div className="teamleader-sidebar__brand">
            <BrandLogo
              subtitle="Team Leader Panel"
              dark={theme === "dark"}
              collapsed={collapsed}
            />
          </div>
        </div>

        <div className="teamleader-sidebar__divider"></div>

        <nav className="teamleader-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`teamleader-sidebar__link ${
                activeItem === item.name ? "teamleader-sidebar__link--active" : ""
              }`}
              onClick={() => onSelect?.(item.name)}
              title={collapsed ? item.name : ""}
            >
              <span className="teamleader-sidebar__link-icon">{item.icon}</span>
              <span className="teamleader-sidebar__link-text">{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}