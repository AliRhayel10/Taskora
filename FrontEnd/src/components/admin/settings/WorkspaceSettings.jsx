import { useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiGlobe,
  FiPhone,
  FiMapPin,
  FiArrowLeft,
  FiEdit2,
  FiCheck,
} from "react-icons/fi";
import "./../../../assets/styles/admin/settings/workspace-settings.css";

export default function WorkspaceSettings({ onBack }) {
  const storedUser = useMemo(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  }, []);

  const [workspaceData, setWorkspaceData] = useState({
    companyName: "",
    companyDomain: "",
    companyPhone: "",
    address: "",
  });

  const [draftData, setDraftData] = useState({
    companyName: "",
    companyDomain: "",
    companyPhone: "",
    address: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!storedUser?.userId) {
      setIsLoading(false);
      return;
    }

const fetchWorkspace = async () => {
  try {
    const userId = storedUser?.userId;

    if (!userId) {
      throw new Error("Missing userId.");
    }

    const url = `http://localhost:5000/api/auth/workspace/${userId}`;
    console.log("Fetching workspace from:", url);

    const response = await fetch(url);

    const rawText = await response.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(rawText || "Server did not return valid JSON.");
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch workspace.");
    }

    const nextData = {
      companyName: data.companyName || "",
      companyDomain: data.emailDomain || "",
      companyPhone: data.companyPhone || "",
      address: data.address || "",
    };

    setWorkspaceData(nextData);
    setDraftData(nextData);
  } catch (error) {
    console.error("Failed to fetch workspace:", error);
    alert(error.message || "Failed to load workspace information.");
  } finally {
    setIsLoading(false);
  }
};

    fetchWorkspace();
  }, [storedUser]);

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

  const handleSave = async () => {
    if (!storedUser?.userId || isSaving) return;

    const cleanedData = {
      companyName: draftData.companyName.trim(),
      companyDomain: draftData.companyDomain.trim(),
      companyPhone: draftData.companyPhone.trim(),
      address: draftData.address.trim(),
    };

    if (
      !cleanedData.companyName ||
      !cleanedData.companyPhone ||
      !cleanedData.address
    ) {
      alert("Company name, company phone, and address are required.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/update-workspace",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: storedUser.userId,
            companyName: cleanedData.companyName,
            emailDomain: cleanedData.companyDomain,
            companyPhone: cleanedData.companyPhone,
            address: cleanedData.address,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update workspace.");
      }

      const nextData = {
        companyName: data.companyName || cleanedData.companyName,
        companyDomain: data.emailDomain || cleanedData.companyDomain,
        companyPhone: data.companyPhone || cleanedData.companyPhone,
        address: data.address || cleanedData.address,
      };

      setWorkspaceData(nextData);
      setDraftData(nextData);
      setIsEditing(false);

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          companyName: nextData.companyName,
        })
      );
    } catch (error) {
      console.error("Failed to update workspace:", error);
      alert(error.message || "Saving workspace failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const workspaceItems = [
    {
      key: "companyName",
      label: "Company Name",
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
  ];

  if (isLoading) {
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

        <div className="workspace-settings-card">Loading...</div>
      </section>
    );
  }

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
            disabled={isSaving}
          >
            {isEditing ? <FiCheck /> : <FiEdit2 />}
            {isSaving ? "Saving..." : isEditing ? "Save" : "Edit"}
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
                  {workspaceData[item.key] || "Not available"}
                </strong>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}