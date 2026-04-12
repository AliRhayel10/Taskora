import {
  FiGrid,
  FiUsers,
  FiLayers,
  FiCheckSquare,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import "./../assets/styles/admin/admin-sidebar.css";

export default function AdminSidebar({
  activeItem = "Dashboard",
  onSelect,
  theme = "light",
}) {
  const navItems = [
    { name: "Dashboard", icon: <FiGrid /> },
    { name: "Users", icon: <FiUsers /> },
    { name: "Teams", icon: <FiLayers /> },
    { name: "Tasks", icon: <FiCheckSquare /> },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__top">
        <div className="admin-sidebar__brand">
          <BrandLogo
            subtitle="Admin Panel"
            dark={theme === "dark"}
          />
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
              onClick={() => onSelect(item.name)}
            >
              <span className="admin-sidebar__link-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}