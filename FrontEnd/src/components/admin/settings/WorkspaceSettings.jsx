import { useMemo, useState } from "react";
import {
  FiBriefcase,
  FiGlobe,
  FiPhone,
  FiMapPin,
  FiClock,
  FiCalendar,
  FiArrowLeft,
  FiEdit2,
  FiCheck,
} from "react-icons/fi";
import "./../../../assets/styles/admin/settings/workspace-settings.css";

export default function WorkspaceSettings({ onBack }) {
  const [workspaceData, setWorkspaceData] = useState({
    workspaceName: "Taskora Workspace",
    companyDomain: "taskora.com",
    companyPhone: "+961 70 000 000",
    address: "Beirut, Lebanon",
    timezone: "GMT+02:00",
    workingDays: "Monday - Friday",
  });

  const [draftData, setDraftData] = useState(workspaceData);
  const [isEditing, setIsEditing] = useState(false);

  const handleStartEditing = () => {
    setDraftData(workspaceData);
    setIsEditing(true);
  };

  const handleInputChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const cleanedData = {
      workspaceName: draftData.workspaceName.trim(),
      companyDomain: draftData.companyDomain.trim(),
      companyPhone: draftData.companyPhone.trim(),
      address: draftData.address.trim(),
      timezone: draftData.timezone.trim(),
      workingDays: draftData.workingDays.trim(),
    };

    setWorkspaceData(cleanedData);
    setDraftData(cleanedData);
    setIsEditing(false);
  };

  const workspaceItems = useMemo(
    () => [
      {
        key: "workspaceName",
        label: "Workspace Name",
        icon: <FiBriefcase />,
      },
      {
        key: "companyDomain",
        label: "Company Domain",
        icon: <FiGlobe />,
      },
      {
        key: "companyPhone",
        label: "Company Phone",
        icon: <FiPhone />,
      },
      {
        key: "address",
        label: "Address",
        icon: <FiMapPin />,
      },
      {
        key: "timezone",
        label: "Timezone",
        icon: <FiClock />,
      },
      {
        key: "workingDays",
        label: "Working Days",
        icon: <FiCalendar />,
      },
    ],
    []
  );

  return (
    <section className="workspace-settings-page">
      <div className="workspace-settings-page__title-row">
        <button
          type="button"
          className="workspace-back-btn"
          onClick={onBack}
          aria-label="Back to Settings"
        >
          <FiArrowLeft />
        </button>

        <h2>Workspace</h2>
        <div className="workspace-settings-page__title-line"></div>
      </div>

      <div className="workspace-settings-card">
        <div className="workspace-settings-card__header">
          <div>
            <h3>Workspace Information</h3>
          </div>

          <button
            type="button"
            className={`workspace-settings-edit-btn ${
              isEditing ? "workspace-settings-edit-btn--primary" : ""
            }`}
            onClick={isEditing ? handleSave : handleStartEditing}
          >
            {isEditing ? <FiCheck /> : <FiEdit2 />}
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>

        <div className="workspace-settings-card__divider"></div>

        <div className="workspace-settings-grid">
          {workspaceItems.map((item) => (
            <div className="workspace-settings-item" key={item.key}>
              <span className="workspace-settings-item__label">
                <span className="workspace-settings-item__label-icon">
                  {item.icon}
                </span>
                {item.label}
              </span>

              {isEditing ? (
                <input
                  type="text"
                  className="workspace-settings-input"
                  value={draftData[item.key]}
                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                />
              ) : (
                <strong className="workspace-settings-item__value">
                  {workspaceData[item.key]}
                </strong>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}