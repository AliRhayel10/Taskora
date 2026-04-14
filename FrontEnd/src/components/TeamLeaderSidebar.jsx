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
    return localStorage.getItem("tl_sidebar") === "true";
  });

  useEffect(() => {
    localStorage.setItem("tl_sidebar", collapsed);
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
        className="teamleader-sidebar__toggle"
        onClick={() => setCollapsed((prev) => !prev)}
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

        <div className="teamleader-sidebar__divider" />

        <nav className="teamleader-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`teamleader-sidebar__link ${
                activeItem === item.name
                  ? "teamleader-sidebar__link--active"
                  : ""
              }`}
              onClick={() => onSelect?.(item.name)}
            >
              <span className="teamleader-sidebar__link-icon">
                {item.icon}
              </span>
              <span className="teamleader-sidebar__link-text">
                {item.name}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}