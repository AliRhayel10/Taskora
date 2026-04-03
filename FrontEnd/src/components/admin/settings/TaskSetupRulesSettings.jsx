import { useEffect, useMemo, useState } from "react";
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

const DEFAULT_FORMULA =
  "Task Weight = Base Effort × Priority Multiplier × Complexity Multiplier";

function parseCommaSeparated(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMultiplierString(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [rawKey, rawValue] = pair.split("=").map((part) => part.trim());

      if (!rawKey || !rawValue) {
        return acc;
      }

      const parsedValue = Number(rawValue);

      if (!Number.isNaN(parsedValue) && parsedValue > 0) {
        acc[rawKey] = parsedValue;
      }

      return acc;
    }, {});
}

function formatMultiplierObject(obj = {}) {
  return Object.entries(obj)
    .map(([key, value]) => `${key} = ${value}`)
    .join(", ");
}

function mapApiDataToForm(data) {
  return {
    statuses: Array.isArray(data?.statuses) ? data.statuses.join(", ") : "",
    priorities: data?.priorityMultipliers
      ? Object.keys(data.priorityMultipliers).join(", ")
      : "",
    complexityLevels: data?.complexityMultipliers
      ? Object.keys(data.complexityMultipliers).join(", ")
      : "",
    priorityMultipliers: formatMultiplierObject(data?.priorityMultipliers || {}),
    complexityMultipliers: formatMultiplierObject(
      data?.complexityMultipliers || {}
    ),
    effortFormula: data?.effortFormula || DEFAULT_FORMULA,
  };
}

export default function TaskSetupRulesSettings({
  onBack,
  companyId,
  apiBaseUrl = "http://localhost:5000/api/tasks",
}) {
  const [taskData, setTaskData] = useState({
    statuses: "",
    priorities: "",
    complexityLevels: "",
    priorityMultipliers: "",
    complexityMultipliers: "",
    effortFormula: DEFAULT_FORMULA,
  });

  const [draftData, setDraftData] = useState({
    statuses: "",
    priorities: "",
    complexityLevels: "",
    priorityMultipliers: "",
    complexityMultipliers: "",
    effortFormula: DEFAULT_FORMULA,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  useEffect(() => {
    let ignore = false;

    const fetchTaskSetupRules = async () => {
      if (!companyId) {
        setErrorMessage("Company ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const response = await fetch(`${apiBaseUrl}/setup-rules/${companyId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to load task setup rules.");
        }

        const mappedData = mapApiDataToForm(result.data);

        if (!ignore) {
          setTaskData(mappedData);
          setDraftData(mappedData);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error.message || "Something went wrong while loading the settings."
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchTaskSetupRules();

    return () => {
      ignore = true;
    };
  }, [apiBaseUrl, companyId]);

  const handleStartEditing = () => {
    setDraftData(taskData);
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(true);
  };

  const handleInputChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!companyId) {
      setErrorMessage("Company ID is missing.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const cleanedData = {
      statuses: draftData.statuses.trim(),
      priorities: draftData.priorities.trim(),
      complexityLevels: draftData.complexityLevels.trim(),
      priorityMultipliers: draftData.priorityMultipliers.trim(),
      complexityMultipliers: draftData.complexityMultipliers.trim(),
      effortFormula: draftData.effortFormula.trim() || DEFAULT_FORMULA,
    };

    const payload = {
      statuses: parseCommaSeparated(cleanedData.statuses),
      priorityMultipliers: parseMultiplierString(
        cleanedData.priorityMultipliers
      ),
      complexityMultipliers: parseMultiplierString(
        cleanedData.complexityMultipliers
      ),
      effortFormula: cleanedData.effortFormula,
    };

    if (!payload.statuses.length) {
      setErrorMessage("Please enter at least one task status.");
      setIsSaving(false);
      return;
    }

    if (!Object.keys(payload.priorityMultipliers).length) {
      setErrorMessage("Please enter at least one valid priority multiplier.");
      setIsSaving(false);
      return;
    }

    if (!Object.keys(payload.complexityMultipliers).length) {
      setErrorMessage("Please enter at least one valid complexity multiplier.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/setup-rules/${companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to save task setup rules.");
      }

      const normalizedData = {
        ...cleanedData,
        priorities: Object.keys(payload.priorityMultipliers).join(", "),
        complexityLevels: Object.keys(payload.complexityMultipliers).join(", "),
        priorityMultipliers: formatMultiplierObject(payload.priorityMultipliers),
        complexityMultipliers: formatMultiplierObject(
          payload.complexityMultipliers
        ),
      };

      setTaskData(normalizedData);
      setDraftData(normalizedData);
      setIsEditing(false);
      setSuccessMessage(result?.message || "Task setup rules updated.");
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong while saving the settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

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

          {!isLoading && !errorMessage && (
            <button
              type="button"
              className={`task-setup-rules-edit-btn ${
                isEditing ? "task-setup-rules-edit-btn--primary" : ""
              }`}
              onClick={isEditing ? handleSave : handleStartEditing}
              disabled={isSaving}
            >
              {isEditing ? <FiCheck /> : <FiEdit2 />}
              {isSaving ? "Saving..." : isEditing ? "Save" : "Edit"}
            </button>
          )}
        </div>

        <div className="task-setup-rules-card__divider"></div>

        {isLoading && (
          <div className="task-setup-rules-item">
            <strong className="task-setup-rules-item__value">Loading...</strong>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="task-setup-rules-item">
            <strong className="task-setup-rules-item__value">
              {errorMessage}
            </strong>
          </div>
        )}

        {!isLoading && successMessage && (
          <div className="task-setup-rules-item">
            <strong className="task-setup-rules-item__value">
              {successMessage}
            </strong>
          </div>
        )}

        {!isLoading && !errorMessage && (
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
                    value={draftData[item.key] || ""}
                    onChange={(e) =>
                      handleInputChange(item.key, e.target.value)
                    }
                  />
                ) : (
                  <strong className="task-setup-rules-item__value">
                    {taskData[item.key] || "-"}
                  </strong>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}