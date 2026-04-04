import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiList,
  FiFlag,
  FiLayers,
  FiSliders,
  FiEdit2,
  FiTrash2,
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
  const [errorMessage, setErrorMessage] = useState("");

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

  useEffect(() => {
    let ignore = false;

    const fetchTaskSetupRules = async () => {
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

        if (!ignore) {
          setTaskData(mappedData);
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
  }, [apiBaseUrl, resolvedCompanyId]);

  const tabs = [
    { key: "statuses", label: "Task Statuses", icon: <FiList /> },
    { key: "priorities", label: "Priority Levels", icon: <FiFlag /> },
    { key: "complexities", label: "Complexity Levels", icon: <FiLayers /> },
    { key: "priorityMultipliers", label: "Priority Multipliers", icon: <FiSliders /> },
    { key: "complexityMultipliers", label: "Complexity Multipliers", icon: <FiSliders /> },
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
                onClick={() => setActiveTab(tab.key)}
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
                        <button type="button" className="task-setup-rules-entry__btn">
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
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
                  priorityNames.map((item) => (
                    <div className="task-setup-rules-entry" key={item}>
                      <span className="task-setup-rules-entry__text">{item}</span>
                      <div className="task-setup-rules-entry__actions">
                        <button type="button" className="task-setup-rules-entry__btn">
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="task-setup-rules-empty">
                    No priority levels found.
                  </span>
                )}
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
                  complexityNames.map((item) => (
                    <div className="task-setup-rules-entry" key={item}>
                      <span className="task-setup-rules-entry__text">{item}</span>
                      <div className="task-setup-rules-entry__actions">
                        <button type="button" className="task-setup-rules-entry__btn">
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="task-setup-rules-empty">
                    No complexity levels found.
                  </span>
                )}
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
                  priorityRows.map((row) => (
                    <div className="task-setup-rules-entry" key={row.name}>
                      <span className="task-setup-rules-entry__text">
                        {row.name} = {row.multiplier || "-"}
                      </span>
                      <div className="task-setup-rules-entry__actions">
                        <button type="button" className="task-setup-rules-entry__btn">
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="task-setup-rules-empty">
                    No priority multipliers found.
                  </span>
                )}
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
                  complexityRows.map((row) => (
                    <div className="task-setup-rules-entry" key={row.name}>
                      <span className="task-setup-rules-entry__text">
                        {row.name} = {row.multiplier || "-"}
                      </span>
                      <div className="task-setup-rules-entry__actions">
                        <button type="button" className="task-setup-rules-entry__btn">
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="task-setup-rules-entry__btn task-setup-rules-entry__btn--danger"
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="task-setup-rules-empty">
                    No complexity multipliers found.
                  </span>
                )}
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