import {
  FiGrid,
  FiUsers,
  FiLayers,
  FiCheckSquare,
  FiBarChart2,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import "./../assets/styles/admin-sidebar.css";

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
    { name: "Reports", icon: <FiBarChart2 /> },
    { name: "Settings", icon: <FiSettings /> },
  ];

  const initials =
    user?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

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

        <div className="admin-sidebar__profile">
          <div className="admin-sidebar__avatar">{initials}</div>
          <div className="admin-sidebar__profile-info">
            <h3>{user?.fullName || "Admin User"}</h3>
            <p>{user?.role || "Company Admin"}</p>
          </div>
        </div>

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