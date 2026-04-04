import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiList,
  FiFlag,
  FiLayers,
  FiSliders,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiCheck,
  FiX,
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

      if (!rawKey || !rawValue) return acc;

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

function getMultiplierRows(levelsValue = "", multipliersValue = "") {
  const levels = parseCommaSeparated(levelsValue);
  const multipliers = parseMultiplierString(multipliersValue);

  return levels.map((level) => ({
    name: level,
    multiplier: multipliers[level] ?? "",
  }));
}

export default function TaskSetupRulesSettings({
  onBack,
  companyId,
  apiBaseUrl = "http://localhost:5000/api/tasks",
}) {
  const resolvedCompanyId = useMemo(() => {
    if (companyId) return companyId;

    const savedUser = localStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;

    return parsedUser?.companyId || null;
  }, [companyId]);

  const [activeTab, setActiveTab] = useState("statuses");
  const [taskData, setTaskData] = useState({
    statuses: "",
    priorities: "",
    complexityLevels: "",
    priorityMultipliers: "",
    complexityMultipliers: "",
    effortFormula: DEFAULT_FORMULA,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingMultiplier, setEditingMultiplier] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const statusList = useMemo(
    () => parseCommaSeparated(taskData.statuses),
    [taskData.statuses]
  );

  const priorityNames = useMemo(
    () => parseCommaSeparated(taskData.priorities),
    [taskData.priorities]
  );

  const complexityNames = useMemo(
    () => parseCommaSeparated(taskData.complexityLevels),
    [taskData.complexityLevels]
  );

  const priorityRows = useMemo(
    () => getMultiplierRows(taskData.priorities, taskData.priorityMultipliers),
    [taskData.priorities, taskData.priorityMultipliers]
  );

  const complexityRows = useMemo(
    () =>
      getMultiplierRows(
        taskData.complexityLevels,
        taskData.complexityMultipliers
      ),
    [taskData.complexityLevels, taskData.complexityMultipliers]
  );

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => {
      setSuccessMessage("");
    }, 2500);
  };

  const resetInlineEdit = () => {
    setEditingMultiplier(null);
    setEditingValue("");
  };

  const loadTaskSetupRules = async () => {
    if (!resolvedCompanyId) {
      setErrorMessage("Company ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/setup-rules/${resolvedCompanyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load task setup rules.");
      }

      const mappedData = mapApiDataToForm(result.data || result);
      setTaskData(mappedData);
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong while loading the settings."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTaskSetupRules();
  }, [apiBaseUrl, resolvedCompanyId]);

  const getStatusByName = async (statusName) => {
    const response = await fetch(`${apiBaseUrl}/statuses/${resolvedCompanyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Failed to load statuses.");
    }

    const matchedStatus = (result.statuses || []).find(
      (item) => item.statusName === statusName
    );

    if (!matchedStatus) {
      throw new Error("Status not found.");
    }

    return matchedStatus;
  };

  const handleAddStatus = async () => {
    clearMessages();

    const statusName = window.prompt("Enter new task status name:");
    if (!statusName?.trim()) return;

    try {
      setIsMutating(true);

      const response = await fetch(`${apiBaseUrl}/statuses/${resolvedCompanyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusName: statusName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to add status.");
      }

      await loadTaskSetupRules();
      showSuccess(result.message || "Status added successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to add status.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditStatus = async (statusName) => {
    clearMessages();

    const newStatusName = window.prompt("Edit status name:", statusName);
    if (!newStatusName?.trim() || newStatusName.trim() === statusName) return;

    try {
      setIsMutating(true);

      const status = await getStatusByName(statusName);

      const response = await fetch(
        `${apiBaseUrl}/statuses/${status.taskStatusId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            statusName: newStatusName.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to update status.");
      }

      await loadTaskSetupRules();
      showSuccess(result.message || "Status updated successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update status.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteStatus = async (statusName) => {
    clearMessages();

    const confirmed = window.confirm(`Delete "${statusName}"?`);
    if (!confirmed) return;

    try {
      setIsMutating(true);

      const status = await getStatusByName(statusName);

      const response = await fetch(
        `${apiBaseUrl}/statuses/${status.taskStatusId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to delete status.");
      }

      await loadTaskSetupRules();
      showSuccess(result.message || "Status deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete status.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddNamedItem = async (type) => {
    clearMessages();

    const itemLabel = type === "priority" ? "priority" : "complexity";
    const endpoint =
      type === "priority" ? "priority-levels" : "complexity-levels";

    const name = window.prompt(`Enter new ${itemLabel} name:`);
    if (!name?.trim()) return;

    const multiplierInput = window.prompt(
      `Enter multiplier for "${name.trim()}":`
    );
    const multiplier = Number(multiplierInput);

    if (Number.isNaN(multiplier) || multiplier <= 0) {
      setErrorMessage("Please enter a valid multiplier greater than 0.");
      return;
    }

    try {
      setIsMutating(true);

      const response = await fetch(
        `${apiBaseUrl}/${endpoint}/${resolvedCompanyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            multiplier,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Failed to add ${itemLabel}.`);
      }

      await loadTaskSetupRules();
      showSuccess(result.message || `${itemLabel} added successfully.`);
    } catch (error) {
      setErrorMessage(error.message || `Failed to add ${itemLabel}.`);
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditNamedItem = async (type, item) => {
    clearMessages();

    const itemLabel = type === "priority" ? "priority" : "complexity";
    const endpoint =
      type === "priority" ? "priority-levels" : "complexity-levels";

    const newName = window.prompt(`Edit ${itemLabel} name:`, item.name);
    if (!newName?.trim()) return;

    const multiplierInput = window.prompt(
      `Edit multiplier for "${item.name}":`,
      String(item.multiplier ?? "")
    );
    const multiplier = Number(multiplierInput);

    if (Number.isNaN(multiplier) || multiplier <= 0) {
      setErrorMessage("Please enter a valid multiplier greater than 0.");
      return;
    }

    try {
      setIsMutating(true);

      const response = await fetch(
        `${apiBaseUrl}/${endpoint}/${resolvedCompanyId}/${encodeURIComponent(
          item.name
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newName.trim(),
            multiplier,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Failed to update ${itemLabel}.`);
      }

      await loadTaskSetupRules();
      showSuccess(result.message || `${itemLabel} updated successfully.`);
    } catch (error) {
      setErrorMessage(error.message || `Failed to update ${itemLabel}.`);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteNamedItem = async (type, item) => {
    clearMessages();

    const itemLabel = type === "priority" ? "priority" : "complexity";
    const endpoint =
      type === "priority" ? "priority-levels" : "complexity-levels";

    const confirmed = window.confirm(`Delete "${item.name}"?`);
    if (!confirmed) return;

    try {
      setIsMutating(true);

      const response = await fetch(
        `${apiBaseUrl}/${endpoint}/${resolvedCompanyId}/${encodeURIComponent(
          item.name
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Failed to delete ${itemLabel}.`);
      }

      await loadTaskSetupRules();
      showSuccess(result.message || `${itemLabel} deleted successfully.`);
    } catch (error) {
      setErrorMessage(error.message || `Failed to delete ${itemLabel}.`);
    } finally {
      setIsMutating(false);
    }
  };

  const startEditMultiplier = (type, item) => {
    clearMessages();
    setEditingMultiplier({
      type,
      name: item.name,
    });
    setEditingValue(String(item.multiplier ?? ""));
  };

  const cancelEditMultiplier = () => {
    resetInlineEdit();
  };

  const saveEditMultiplier = async () => {
    if (!editingMultiplier) return;

    clearMessages();

    const multiplier = Number(editingValue);

    if (Number.isNaN(multiplier) || multiplier <= 0) {
      setErrorMessage("Please enter a valid multiplier greater than 0.");
      return;
    }

    const endpoint =
      editingMultiplier.type === "priority"
        ? "priority-levels"
        : "complexity-levels";

    try {
      setIsMutating(true);

      const response = await fetch(
        `${apiBaseUrl}/${endpoint}/${resolvedCompanyId}/${encodeURIComponent(
          editingMultiplier.name
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editingMultiplier.name,
            multiplier,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to update multiplier.");
      }

      await loadTaskSetupRules();
      showSuccess(result.message || "Multiplier updated successfully.");
      resetInlineEdit();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update multiplier.");
    } finally {
      setIsMutating(false);
    }
  };

  const tabs = [
    { key: "statuses", label: "Task Statuses", icon: <FiList /> },
    { key: "priorities", label: "Priority Levels", icon: <FiFlag /> },
    { key: "complexities", label: "Complexity Levels", icon: <FiLayers /> },
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
    { key: "formula", label: "Effort Calculation Rule", icon: <FiSliders /> },
  ];

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

      {successMessage && (
        <div className="task-setup-rules-banner task-setup-rules-banner--success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="task-setup-rules-banner task-setup-rules-banner--error">
          {errorMessage}
        </div>
      )}

      <div className="task-setup-rules-card">
        <div className="task-setup-rules-card__header">
          <div className="task-setup-rules-card__header-left">
            <h3>Task Configuration</h3>
          </div>
        </div>

        <div className="task-setup-rules-card__divider"></div>

        {!isLoading && !errorMessage && (
          <div className="task-setup-rules-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`task-setup-rules-tab ${
                  activeTab === tab.key ? "task-setup-rules-tab--active" : ""
                }`}
                onClick={() => {
                  setActiveTab(tab.key);
                  resetInlineEdit();
                }}
              >
                <span className="task-setup-rules-tab__icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="task-setup-rules-content">
          {isLoading ? (
            <div className="task-setup-rules-loading">Loading...</div>
          ) : !errorMessage && activeTab === "statuses" ? (
            <div className="task-setup-rules-tab-panel">
              <div className="task-setup-rules-tab-panel__header">
                <span className="task-setup-rules-tab-panel__title">
                  <FiList />
                  Task Statuses
                </span>
              </div>

              <div className="task-setup-rules-entry-list">
                {statusList.length ? (
                  statusList.map((item) => (
                    <div className="task-setup-rules-entry" key={item}>
                      <span className="task-setup-rules-entry__text">{item}</span>
                      <div className="task-setup-rules-entry__actions">
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn"
                          onClick={() => handleEditStatus(item)}
                          disabled={isMutating}
                        >
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                          onClick={() => handleDeleteStatus(item)}
                          disabled={isMutating}
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="task-setup-rules-empty">No statuses found.</span>
                )}

                <div className="task-setup-rules-add-row">
                  <button
                    type="button"
                    className="task-setup-rules-add-btn"
                    onClick={handleAddStatus}
                    disabled={isMutating}
                  >
                    <FiPlus />
                    Add Status
                  </button>
                </div>
              </div>
            </div>
          ) : !errorMessage && activeTab === "priorities" ? (
            <div className="task-setup-rules-tab-panel">
              <div className="task-setup-rules-tab-panel__header">
                <span className="task-setup-rules-tab-panel__title">
                  <FiFlag />
                  Priority Levels
                </span>
              </div>

              <div className="task-setup-rules-entry-list">
                {priorityNames.length ? (
                  priorityNames.map((item) => {
                    const row = priorityRows.find((entry) => entry.name === item);

                    return (
                      <div className="task-setup-rules-entry" key={item}>
                        <span className="task-setup-rules-entry__text">{item}</span>
                        <div className="task-setup-rules-entry__actions">
                          <button
                            type="button"
                            className="task-setup-rules-entry__btn"
                            onClick={() =>
                              handleEditNamedItem("priority", {
                                name: item,
                                multiplier: row?.multiplier ?? "",
                              })
                            }
                            disabled={isMutating}
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                            onClick={() =>
                              handleDeleteNamedItem("priority", {
                                name: item,
                                multiplier: row?.multiplier ?? "",
                              })
                            }
                            disabled={isMutating}
                          >
                            <FiTrash2 />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="task-setup-rules-empty">
                    No priority levels found.
                  </span>
                )}

                <div className="task-setup-rules-add-row">
                  <button
                    type="button"
                    className="task-setup-rules-add-btn"
                    onClick={() => handleAddNamedItem("priority")}
                    disabled={isMutating}
                  >
                    <FiPlus />
                    Add Priority
                  </button>
                </div>
              </div>
            </div>
          ) : !errorMessage && activeTab === "complexities" ? (
            <div className="task-setup-rules-tab-panel">
              <div className="task-setup-rules-tab-panel__header">
                <span className="task-setup-rules-tab-panel__title">
                  <FiLayers />
                  Complexity Levels
                </span>
              </div>

              <div className="task-setup-rules-entry-list">
                {complexityNames.length ? (
                  complexityNames.map((item) => {
                    const row = complexityRows.find((entry) => entry.name === item);

                    return (
                      <div className="task-setup-rules-entry" key={item}>
                        <span className="task-setup-rules-entry__text">{item}</span>
                        <div className="task-setup-rules-entry__actions">
                          <button
                            type="button"
                            className="task-setup-rules-entry__btn"
                            onClick={() =>
                              handleEditNamedItem("complexity", {
                                name: item,
                                multiplier: row?.multiplier ?? "",
                              })
                            }
                            disabled={isMutating}
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                            onClick={() =>
                              handleDeleteNamedItem("complexity", {
                                name: item,
                                multiplier: row?.multiplier ?? "",
                              })
                            }
                            disabled={isMutating}
                          >
                            <FiTrash2 />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="task-setup-rules-empty">
                    No complexity levels found.
                  </span>
                )}

                <div className="task-setup-rules-add-row">
                  <button
                    type="button"
                    className="task-setup-rules-add-btn"
                    onClick={() => handleAddNamedItem("complexity")}
                    disabled={isMutating}
                  >
                    <FiPlus />
                    Add Complexity
                  </button>
                </div>
              </div>
            </div>
          ) : !errorMessage && activeTab === "priorityMultipliers" ? (
            <div className="task-setup-rules-tab-panel">
              <div className="task-setup-rules-tab-panel__header">
                <span className="task-setup-rules-tab-panel__title">
                  <FiSliders />
                  Priority Multipliers
                </span>
              </div>

              <div className="task-setup-rules-entry-list">
                {priorityRows.length ? (
                  priorityRows.map((row) => {
                    const isEditingThisOne =
                      editingMultiplier?.type === "priority" &&
                      editingMultiplier?.name === row.name;

                    return (
                      <div className="task-setup-rules-entry" key={row.name}>
                        <span className="task-setup-rules-entry__text">
                          {row.name}
                        </span>

                        {isEditingThisOne ? (
                          <div className="task-setup-rules-inline-edit">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="task-setup-rules-inline-edit__input"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                            />
                            <button
                              type="button"
                              className="task-setup-rules-inline-edit__save"
                              onClick={saveEditMultiplier}
                              disabled={isMutating}
                            >
                              <FiCheck />
                            </button>
                            <button
                              type="button"
                              className="task-setup-rules-inline-edit__cancel"
                              onClick={cancelEditMultiplier}
                              disabled={isMutating}
                            >
                              <FiX />
                            </button>
                          </div>
                        ) : (
                          <div className="task-setup-rules-entry__actions">
                            <span className="task-setup-rules-entry__multiplier">
                              {row.multiplier || "-"}
                            </span>
                            <button
                              type="button"
                              className="task-setup-rules-entry__btn"
                              onClick={() => startEditMultiplier("priority", row)}
                              disabled={isMutating}
                            >
                              <FiEdit2 />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                              onClick={() => handleDeleteNamedItem("priority", row)}
                              disabled={isMutating}
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="task-setup-rules-empty">
                    No priority multipliers found.
                  </span>
                )}

                <div className="task-setup-rules-add-row">
                  <button
                    type="button"
                    className="task-setup-rules-add-btn"
                    onClick={() => handleAddNamedItem("priority")}
                    disabled={isMutating}
                  >
                    <FiPlus />
                    Add Priority Multiplier
                  </button>
                </div>
              </div>
            </div>
          ) : !errorMessage && activeTab === "complexityMultipliers" ? (
            <div className="task-setup-rules-tab-panel">
              <div className="task-setup-rules-tab-panel__header">
                <span className="task-setup-rules-tab-panel__title">
                  <FiSliders />
                  Complexity Multipliers
                </span>
              </div>

              <div className="task-setup-rules-entry-list">
                {complexityRows.length ? (
                  complexityRows.map((row) => {
                    const isEditingThisOne =
                      editingMultiplier?.type === "complexity" &&
                      editingMultiplier?.name === row.name;

                    return (
                      <div className="task-setup-rules-entry" key={row.name}>
                        <span className="task-setup-rules-entry__text">
                          {row.name}
                        </span>

                        {isEditingThisOne ? (
                          <div className="task-setup-rules-inline-edit">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="task-setup-rules-inline-edit__input"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                            />
                            <button
                              type="button"
                              className="task-setup-rules-inline-edit__save"
                              onClick={saveEditMultiplier}
                              disabled={isMutating}
                            >
                              <FiCheck />
                            </button>
                            <button
                              type="button"
                              className="task-setup-rules-inline-edit__cancel"
                              onClick={cancelEditMultiplier}
                              disabled={isMutating}
                            >
                              <FiX />
                            </button>
                          </div>
                        ) : (
                          <div className="task-setup-rules-entry__actions">
                            <span className="task-setup-rules-entry__multiplier">
                              {row.multiplier || "-"}
                            </span>
                            <button
                              type="button"
                              className="task-setup-rules-entry__btn"
                              onClick={() => startEditMultiplier("complexity", row)}
                              disabled={isMutating}
                            >
                              <FiEdit2 />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                              onClick={() => handleDeleteNamedItem("complexity", row)}
                              disabled={isMutating}
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="task-setup-rules-empty">
                    No complexity multipliers found.
                  </span>
                )}

                <div className="task-setup-rules-add-row">
                  <button
                    type="button"
                    className="task-setup-rules-add-btn"
                    onClick={() => handleAddNamedItem("complexity")}
                    disabled={isMutating}
                  >
                    <FiPlus />
                    Add Complexity Multiplier
                  </button>
                </div>
              </div>
            </div>
          ) : !errorMessage && activeTab === "formula" ? (
            <div className="task-setup-rules-tab-panel">
              <div className="task-setup-rules-tab-panel__header">
                <span className="task-setup-rules-tab-panel__title">
                  <FiSliders />
                  Effort Calculation Rule
                </span>
              </div>

              <div className="task-setup-rules-formula-box">
                {taskData.effortFormula || DEFAULT_FORMULA}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
