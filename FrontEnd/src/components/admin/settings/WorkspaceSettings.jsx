import {
  FiBriefcase,
  FiGlobe,
  FiPhone,
  FiMapPin,
  FiClock,
  FiCalendar,
  FiArrowLeft,
} from "react-icons/fi";
import "./../../../assets/styles/admin/settings/workspace-settings.css";

export default function WorkspaceSettings({ onBack }) {
  const workspaceItems = [
    {
      label: "Workspace Name",
      value: "Taskora Workspace",
      icon: <FiBriefcase />,
    },
    {
      label: "Company Domain",
      value: "taskora.com",
      icon: <FiGlobe />,
    },
    {
      label: "Company Phone",
      value: "+961 70 000 000",
      icon: <FiPhone />,
    },
    {
      label: "Address",
      value: "Beirut, Lebanon",
      icon: <FiMapPin />,
    },
    {
      label: "Timezone",
      value: "GMT+02:00",
      icon: <FiClock />,
    },
    {
      label: "Working Days",
      value: "Monday - Friday",
      icon: <FiCalendar />,
    },
  ];

  return (
    <section className="workspace-settings-page">
      <div className="workspace-settings-page__title-row">
        <button type="button" className="workspace-back-btn" onClick={onBack}>
          <FiArrowLeft />
          Back to Settings
        </button>
      </div>

      <div className="workspace-settings-card">
        <div className="workspace-settings-card__header">
          <div>
            <h3>Workspace Information</h3>
            <p>Manage your workspace identity, schedule, and company details.</p>
          </div>

          <button type="button" className="workspace-settings-edit-btn">
            Edit
          </button>
        </div>

        <div className="workspace-settings-card__divider"></div>

        <div className="workspace-settings-grid">
          {workspaceItems.map((item) => (
            <div className="workspace-settings-item" key={item.label}>
              <span className="workspace-settings-item__label">
                <span className="workspace-settings-item__label-icon">{item.icon}</span>
                {item.label}
              </span>

              <strong className="workspace-settings-item__value">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
