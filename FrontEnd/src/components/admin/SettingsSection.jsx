import { useEffect, useState } from "react";
import {
  FiBriefcase,
  FiCheckSquare,
  FiShield,
  FiBell,
  FiChevronRight,
} from "react-icons/fi";
import WorkspaceSettings from "./settings/WorkspaceSettings";
import "./../../assets/styles/admin/settings-section.css";
import TaskSetupRulesSettings from "./settings/TaskSetupRulesSettings";

export default function SettingsSection({ resetSignal = 0 }) {
  const [activePage, setActivePage] = useState("menu");

  useEffect(() => {
    setActivePage("menu");
  }, [resetSignal]);

  const settingsTabs = [
    {
      key: "workspace",
      title: "Workspace",
      description: "Manage workspace name, domain, address and phone number.",
      icon: <FiBriefcase />,
    },
    {
      key: "task-settings",
      title: "Task Setup & Rules",
      description:
        "Configure task statuses, priorities, complexity levels, effort calculation, and workload rules.",
      icon: <FiCheckSquare />,
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
  ];

  if (activePage === "workspace") {
    return <WorkspaceSettings onBack={() => setActivePage("menu")} />;
  }
  if (activePage === "task-settings") {
    return <TaskSetupRulesSettings onBack={() => setActivePage("menu")} />;
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