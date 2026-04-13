import { useEffect, useMemo, useState } from "react";
import {
  FiGrid,
  FiUsers,
  FiCheckSquare,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiBell,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";
import TeamLeaderDashboard from "../pages/TeamLeaderDashboard";
import "../assets/styles/teamleader/team-leader-sidebar.css";

function SidebarMenu({
  activeItem = "Dashboard",
  onSelect,
  theme = "light",
}) {
  const [collapsed, setCollapsed] = useState(false);

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
              subtitle="Team Leader Panel"
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

function TeamLeaderTopbar({
  title = "Dashboard",
  theme = "light",
  onToggleTheme,
  leaderName = "Sarah Khalil",
  leaderRole = "Team Leader",
}) {
  return (
    <header
      className={`team-leader-topbar ${
        theme === "dark" ? "team-leader-topbar--dark" : ""
      }`}
    >
      <div>
        <div className="team-leader-topbar__eyebrow">Team Leader Workspace</div>
        <h1 className="team-leader-topbar__title">{title}</h1>
      </div>

      <div className="team-leader-topbar__actions">
        <div className="team-leader-topbar__search">
          <FiSearch />
          <input type="text" placeholder="Search tasks, members..." />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="team-leader-topbar__icon-btn"
        >
          <FiBell />
        </button>

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={onToggleTheme}
          className="team-leader-topbar__icon-btn"
        >
          {theme === "dark" ? <FiSun /> : <FiMoon />}
        </button>

        <div className="team-leader-topbar__profile">
          <div className="team-leader-topbar__avatar">
            {leaderName
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </div>

          <div>
            <div className="team-leader-topbar__name">{leaderName}</div>
            <div className="team-leader-topbar__role">{leaderRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function TeamPlaceholder({ title }) {
  return (
    <div className="team-leader-placeholder">
      <h2>{title}</h2>
      <p>{title} content will go here.</p>
    </div>
  );
}

export default function TeamLeaderLayout() {
  const [theme, setTheme] = useState("light");
  const [activeItem, setActiveItem] = useState("Dashboard");

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div
      className={`team-leader-layout ${
        theme === "dark" ? "team-leader-layout--dark" : ""
      }`}
    >
      <SidebarMenu
        activeItem={activeItem}
        onSelect={setActiveItem}
        theme={theme}
      />

      <main className="team-leader-main">
        <TeamLeaderTopbar
          title={activeItem}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        />

        <section className="team-leader-content">
          {activeItem === "Dashboard" && <TeamLeaderDashboard />}
          {activeItem === "Team" && <TeamPlaceholder title="Team" />}
          {activeItem === "Tasks" && <TeamPlaceholder title="Tasks" />}
          {activeItem === "Workload" && <TeamPlaceholder title="Workload" />}
        </section>
      </main>
    </div>
  );
}