import { useEffect, useState } from "react";
import {
  FiGrid,
  FiUsers,
  FiLayers,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import "./../assets/styles/admin/admin-sidebar.css";

export default function AdminSidebar({
  activeItem = "Dashboard",
  onSelect,
  theme = "light",
}) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("adminSidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const navItems = [
    { name: "Dashboard", icon: <FiGrid /> },
    { name: "Users", icon: <FiUsers /> },
    { name: "Teams", icon: <FiLayers /> },
  ];

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
              subtitle="Admin Panel"
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