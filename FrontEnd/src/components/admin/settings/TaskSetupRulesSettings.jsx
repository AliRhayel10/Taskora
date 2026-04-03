import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiEdit2,
  FiCheck,
  FiList,
  FiFlag,
  FiLayers,
  FiSliders,
} from "react-icons/fi";
import "./../../../assets/styles/admin/settings/task-setup-rules-settings.css";

export default function TaskSetupRulesSettings({ onBack }) {
  const [taskData, setTaskData] = useState({
    statuses: "To Do, In Progress, Done",
    priorities: "Low, Medium, High",
    complexityLevels: "Low, Medium, High",
    priorityMultipliers: "Low = 1.0, Medium = 1.2, High = 1.5",
    complexityMultipliers: "Low = 1.0, Medium = 1.3, High = 1.6",
    effortFormula:
      "Task Weight = Base Effort × Priority Multiplier × Complexity Multiplier",
  });

  const [draftData, setDraftData] = useState(taskData);
  const [isEditing, setIsEditing] = useState(false);

  const handleStartEditing = () => {
    setDraftData(taskData);
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
      statuses: draftData.statuses.trim(),
      priorities: draftData.priorities.trim(),
      complexityLevels: draftData.complexityLevels.trim(),
      priorityMultipliers: draftData.priorityMultipliers.trim(),
      complexityMultipliers: draftData.complexityMultipliers.trim(),
      effortFormula: draftData.effortFormula.trim(),
    };

    setTaskData(cleanedData);
    setDraftData(cleanedData);
    setIsEditing(false);
  };

  const taskItems = useMemo(
    () => [
      {
        key: "statuses",
        label: "Task Statuses",
        icon: <FiList />,
      },
      {
        key: "priorities",
        label: "Priority Levels",
        icon: <FiFlag />,
      },
      {
        key: "complexityLevels",
        label: "Complexity Levels",
        icon: <FiLayers />,
      },
      {
        key: "priorityMultipliers",
        label: "Priority Multipliers",
        icon: <FiSliders />,
      },
      {
        key: "complexityMultipliers",
        label: "Complexity Multipliers",
        icon: <FiSliders />,
      },
      {
        key: "effortFormula",
        label: "Effort Calculation Rule",
        icon: <FiSliders />,
      },
    ],
    []
  );

  return (
    <section className="task-setup-rules-page">
      <div className="task-setup-rules-page__title-row">
        <button
          type="button"
          className="task-setup-rules-back-btn"
          onClick={onBack}
          aria-label="Back to Settings"
        >
          <FiArrowLeft />
        </button>

        <h2>Task Setup & Rules</h2>
        <div className="task-setup-rules-page__title-line"></div>
      </div>

      <div className="task-setup-rules-card">
        <div className="task-setup-rules-card__header">
          <div>
            <h3>Task Configuration</h3>
          </div>

          <button
            type="button"
            className={`task-setup-rules-edit-btn ${
              isEditing ? "task-setup-rules-edit-btn--primary" : ""
            }`}
            onClick={isEditing ? handleSave : handleStartEditing}
          >
            {isEditing ? <FiCheck /> : <FiEdit2 />}
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>

        <div className="task-setup-rules-card__divider"></div>

        <div className="task-setup-rules-grid">
          {taskItems.map((item) => (
            <div className="task-setup-rules-item" key={item.key}>
              <span className="task-setup-rules-item__label">
                <span className="task-setup-rules-item__label-icon">
                  {item.icon}
                </span>
                {item.label}
              </span>

              {isEditing ? (
                <input
                  type="text"
                  className="task-setup-rules-input"
                  value={draftData[item.key]}
                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                />
              ) : (
                <strong className="task-setup-rules-item__value">
                  {taskData[item.key]}
                </strong>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}