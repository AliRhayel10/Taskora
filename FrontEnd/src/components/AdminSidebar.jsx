import {
  FiGrid,
  FiUsers,
  FiLayers,
  FiCheckSquare,
  FiBarChart2,
  FiUser,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import "./../assets/styles/admin/admin-sidebar.css";

export default function AdminSidebar({
  user,
  activeItem = "Dashboard",
  onSelect,
  onLogout,
}) {
  const navItems = [
    { name: "Dashboard", icon: <FiGrid /> },
    { name: "Users", icon: <FiUsers /> },
    { name: "Teams", icon: <FiLayers /> },
    { name: "Tasks", icon: <FiCheckSquare /> },
    { name: "Profile", icon: <FiUser /> },
    { name: "Settings", icon: <FiSettings /> },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__top">
        <div className="admin-sidebar__brand">
          <BrandLogo subtitle="Admin Panel" dark />
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

      <div className="admin-sidebar__bottom">
        <div className="admin-sidebar__divider"></div>

        <button
          type="button"
          className="admin-sidebar__logout"
          onClick={onLogout}
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}