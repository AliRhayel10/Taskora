import { useState } from "react";
import {
  FiGrid,
  FiUsers,
  FiLayers,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import "./../assets/styles/admin/admin-sidebar.css";

export default function AdminSidebar({
  activeItem = "Dashboard",
  onSelect,
  theme = "light",
}) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: "Dashboard", icon: <FiGrid /> },
    { name: "Users", icon: <FiUsers /> },
    { name: "Teams", icon: <FiLayers /> },
    { name: "Tasks", icon: <FiCheckSquare /> },
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
            {collapsed ? (
              <span className="admin-sidebar__brand-icon admin-sidebar__brand-icon--collapsed">
                <FiCheck />
              </span>
            ) : (
              <BrandLogo subtitle="Admin Panel" dark={theme === "dark"} />
            )}
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