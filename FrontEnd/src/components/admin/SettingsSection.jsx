import { useEffect, useState } from "react";
import {
  FiBriefcase,
  FiCheckSquare,
  FiBarChart2,
  FiShield,
  FiBell,
  FiLock,
  FiChevronRight,
} from "react-icons/fi";
import WorkspaceSettings from "./settings/WorkspaceSettings";
import "./../../assets/styles/admin/settings-section.css";

export default function SettingsSection({ resetSignal = 0 }) {
  const [activePage, setActivePage] = useState("menu");

  useEffect(() => {
    setActivePage("menu");
  }, [resetSignal]);

  const settingsTabs = [
    {
      key: "workspace",
      title: "Workspace",
      description: "Manage workspace name, domain, address and phone number. ",
      icon: <FiBriefcase />,
    },
    {
      key: "task-settings",
      title: "Task Settings",
      description:
        "Customize task statuses, priorities, categories, and estimation method.",
      icon: <FiCheckSquare />,
    },
    {
      key: "workload-rules",
      title: "Workload Rules",
      description:
        "Define workload limits, capacity rules, and task balancing settings.",
      icon: <FiBarChart2 />,
    },
    {
      key: "permissions",
      title: "Permissions",
      description: "Set roles, permissions, and visibility rules for teams.",
      icon: <FiShield />,
    },
    {
      key: "notifications",
      title: "Notifications",
      description: "Configure notification settings, reminders, and alerts.",
      icon: <FiBell />,
    },
    {
      key: "security",
      title: "Security",
      description: "Manage password policy, 2FA, and login history.",
      icon: <FiLock />,
    },
  ];

  if (activePage === "workspace") {
    return <WorkspaceSettings onBack={() => setActivePage("menu")} />;
  }

  return (
    <section className="settings-page">
      <div className="settings-page__title-row">
        <h2>Settings</h2>
        <div className="settings-page__title-line"></div>
      </div>

      <div className="settings-menu-card">
        {settingsTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className="settings-menu-item"
            onClick={() => setActivePage(tab.key)}
          >
            <span className="settings-menu-item__icon">{tab.icon}</span>

            <span className="settings-menu-item__content">
              <span className="settings-menu-item__title">{tab.title}</span>
              <span className="settings-menu-item__description">
                {tab.description}
              </span>
            </span>

            <span className="settings-menu-item__arrow">
              <FiChevronRight />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}