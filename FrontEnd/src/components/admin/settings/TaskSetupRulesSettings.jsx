import { useEffect, useRef, useState } from "react";
import {
    FiArrowLeft,
    FiCheck,
    FiList,
    FiFlag,
    FiLayers,
    FiSliders,
    FiPlus,
    FiTrash,
    FiEdit2,
    FiX,
} from "react-icons/fi";
import "./../../../assets/styles/admin/settings/task-setup-rules-settings.css";

const DEFAULT_FORMULA =
    "Task Weight = Base Effort × Priority Multiplier × Complexity Multiplier";

const TABS = [
    { key: "statuses", label: "Statuses", icon: <FiList /> },
    { key: "priorities", label: "Priority", icon: <FiFlag /> },
    { key: "complexities", label: "Complexity", icon: <FiLayers /> },
    { key: "formula", label: "Effort Rule", icon: <FiSliders /> },
];

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

function parseMultiplierRows(value = "") {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((pair) => {
            const [name = "", multiplier = ""] = pair
                .split("=")
                .map((part) => part.trim());

            return { name, multiplier };
        });
}

function buildMultiplierString(rows = []) {
    return rows
        .filter((row) => row.name.trim() && row.multiplier.toString().trim())
        .map((row) => `${row.name.trim()} = ${row.multiplier.toString().trim()}`)
        .join(", ");
}

function TabButton({ isActive, icon, label, onClick }) {
    return (
        <button
            type="button"
            className={`task-setup-rules-tab ${isActive ? "task-setup-rules-tab--active" : ""
                }`}
            onClick={onClick}
        >
            <span className="task-setup-rules-tab__icon">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

function PanelCard({ title, icon, children }) {
    return (
        <div className="task-setup-rules-panel-card">
            <div className="task-setup-rules-panel-card__header">
                <div className="task-setup-rules-panel-card__title">
                    <span className="task-setup-rules-panel-card__icon">{icon}</span>
                    <h3>{title}</h3>
                </div>
            </div>

            <div className="task-setup-rules-panel-card__body">{children}</div>
        </div>
    );
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

    const [statusesList, setStatusesList] = useState([]);
    const [priorityRows, setPriorityRows] = useState([]);
    const [complexityRows, setComplexityRows] = useState([]);

    const [editingStatusIndex, setEditingStatusIndex] = useState(null);
    const [editingPriorityIndex, setEditingPriorityIndex] = useState(null);
    const [editingComplexityIndex, setEditingComplexityIndex] = useState(null);
    const [activeTab, setActiveTab] = useState("statuses");

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const panelRef = useRef(null);

    const [pendingNewRow, setPendingNewRow] = useState(null);

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
                    setStatusesList(parseCommaSeparated(mappedData.statuses));
                    setPriorityRows(parseMultiplierRows(mappedData.priorityMultipliers));
                    setComplexityRows(parseMultiplierRows(mappedData.complexityMultipliers));
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

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSuccessMessage("");
        }, 2500);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [successMessage]);

    const statusOriginalValue = (index) => {
        return parseCommaSeparated(taskData.statuses)[index] || "";
    };

    const priorityOriginalRow = (index) => {
        return parseMultiplierRows(taskData.priorityMultipliers)[index] || {
            name: "",
            multiplier: "",
        };
    };

    const complexityOriginalRow = (index) => {
        return parseMultiplierRows(taskData.complexityMultipliers)[index] || {
            name: "",
            multiplier: "",
        };
    };

    const didStatusRowChange = (index) => {
        const currentValue = (statusesList[index] || "").trim();
        const originalValue = statusOriginalValue(index).trim();
        return currentValue !== originalValue;
    };

    const didPriorityRowChange = (index) => {
        const currentRow = priorityRows[index] || { name: "", multiplier: "" };
        const originalRow = priorityOriginalRow(index);

        return (
            (currentRow.name || "").trim() !== (originalRow.name || "").trim() ||
            String(currentRow.multiplier || "").trim() !==
            String(originalRow.multiplier || "").trim()
        );
    };

    const didComplexityRowChange = (index) => {
        const currentRow = complexityRows[index] || { name: "", multiplier: "" };
        const originalRow = complexityOriginalRow(index);

        return (
            (currentRow.name || "").trim() !== (originalRow.name || "").trim() ||
            String(currentRow.multiplier || "").trim() !==
            String(originalRow.multiplier || "").trim()
        );
    };

    const syncStatuses = (nextStatuses) => {
        const cleaned = nextStatuses.map((item) => item.trim()).filter(Boolean);
        const nextDraftData = {
            ...draftData,
            statuses: cleaned.join(", "),
        };

        setStatusesList(nextStatuses);
        setDraftData(nextDraftData);
    };

    const syncPriorityRows = (nextRows) => {
        const nextDraftData = {
            ...draftData,
            priorities: nextRows.map((row) => row.name.trim()).filter(Boolean).join(", "),
            priorityMultipliers: buildMultiplierString(nextRows),
        };

        setPriorityRows(nextRows);
        setDraftData(nextDraftData);
    };

    const syncComplexityRows = (nextRows) => {
        const nextDraftData = {
            ...draftData,
            complexityLevels: nextRows.map((row) => row.name.trim()).filter(Boolean).join(", "),
            complexityMultipliers: buildMultiplierString(nextRows),
        };

        setComplexityRows(nextRows);
        setDraftData(nextDraftData);
    };

    const cancelExistingEditing = () => {
        let didCancel = false;

        if (editingStatusIndex !== null && !pendingNewRow) {
            setStatusesList(parseCommaSeparated(taskData.statuses));
            setEditingStatusIndex(null);
            didCancel = true;
        }

        if (editingPriorityIndex !== null && !pendingNewRow) {
            setPriorityRows(parseMultiplierRows(taskData.priorityMultipliers));
            setEditingPriorityIndex(null);
            didCancel = true;
        }

        if (editingComplexityIndex !== null && !pendingNewRow) {
            setComplexityRows(parseMultiplierRows(taskData.complexityMultipliers));
            setEditingComplexityIndex(null);
            didCancel = true;
        }

        if (didCancel) {
            setDraftData(taskData);
            setErrorMessage("");
            setSuccessMessage("");
        }
    };

    const removePendingRow = () => {
        if (!pendingNewRow) {
            return;
        }

        if (pendingNewRow.type === "status") {
            const nextStatuses = statusesList.filter(
                (_, itemIndex) => itemIndex !== pendingNewRow.index
            );
            setStatusesList(nextStatuses);
            setEditingStatusIndex(null);
        }

        if (pendingNewRow.type === "priority") {
            const nextRows = priorityRows.filter(
                (_, itemIndex) => itemIndex !== pendingNewRow.index
            );
            setPriorityRows(nextRows);
            setEditingPriorityIndex(null);
        }

        if (pendingNewRow.type === "complexity") {
            const nextRows = complexityRows.filter(
                (_, itemIndex) => itemIndex !== pendingNewRow.index
            );
            setComplexityRows(nextRows);
            setEditingComplexityIndex(null);
        }

        const resetDraftData = {
            ...taskData,
        };

        setDraftData(resetDraftData);
        setPendingNewRow(null);
        setErrorMessage("");
        setSuccessMessage("");
    };

    useEffect(() => {
        const hasEditableFieldOpen =
            pendingNewRow !== null ||
            editingStatusIndex !== null ||
            editingPriorityIndex !== null ||
            editingComplexityIndex !== null;

        if (!hasEditableFieldOpen) {
            return;
        }

        const handleOutsideClick = (event) => {
            if (!panelRef.current) {
                return;
            }

            if (panelRef.current.contains(event.target)) {
                return;
            }

            if (pendingNewRow) {
                removePendingRow();
                return;
            }

            cancelExistingEditing();
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [
        pendingNewRow,
        editingStatusIndex,
        editingPriorityIndex,
        editingComplexityIndex,
        statusesList,
        priorityRows,
        complexityRows,
        taskData,
    ]);

    const saveSetupRules = async (nextDraftData, options = {}) => {
        const { showSuccess = true } = options;

        if (!companyId) {
            setErrorMessage("Company ID is missing.");
            return false;
        }

        setErrorMessage("");
        setSuccessMessage("");

        const payload = {
            statuses: parseCommaSeparated(nextDraftData.statuses),
            priorityMultipliers: parseMultiplierString(nextDraftData.priorityMultipliers),
            complexityMultipliers: parseMultiplierString(nextDraftData.complexityMultipliers),
            effortFormula: nextDraftData.effortFormula.trim() || DEFAULT_FORMULA,
        };

        if (!payload.statuses.length) {
            setErrorMessage("Please enter at least one task status.");
            return false;
        }

        if (!Object.keys(payload.priorityMultipliers).length) {
            setErrorMessage("Please enter at least one priority name and multiplier.");
            return false;
        }

        if (!Object.keys(payload.complexityMultipliers).length) {
            setErrorMessage("Please enter at least one complexity name and multiplier.");
            return false;
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
                statuses: payload.statuses.join(", "),
                priorities: Object.keys(payload.priorityMultipliers).join(", "),
                complexityLevels: Object.keys(payload.complexityMultipliers).join(", "),
                priorityMultipliers: formatMultiplierObject(payload.priorityMultipliers),
                complexityMultipliers: formatMultiplierObject(payload.complexityMultipliers),
                effortFormula: payload.effortFormula,
            };

            setTaskData(normalizedData);
            setDraftData(normalizedData);
            setStatusesList(payload.statuses);
            setPriorityRows(parseMultiplierRows(normalizedData.priorityMultipliers));
            setComplexityRows(parseMultiplierRows(normalizedData.complexityMultipliers));
            setEditingStatusIndex(null);
            setEditingPriorityIndex(null);
            setEditingComplexityIndex(null);
            setPendingNewRow(null);

            if (showSuccess) {
                setSuccessMessage(result?.message || "Task setup rules updated.");
            }

            return true;
        } catch (error) {
            setErrorMessage(
                error.message || "Something went wrong while saving the settings."
            );
            return false;
        }
    };

    const updateStatusValue = (index, value) => {
        const next = [...statusesList];
        next[index] = value;
        syncStatuses(next);
    };

    const addStatus = () => {
        const next = [...statusesList, ""];
        setStatusesList(next);
        setEditingStatusIndex(next.length - 1);
        setPendingNewRow({ type: "status", index: next.length - 1 });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const deleteStatus = async (index) => {
        const isPending =
            pendingNewRow?.type === "status" && pendingNewRow?.index === index;

        if (!isPending) {
            const confirmed = window.confirm(
                "Are you sure you want to delete this status?"
            );
            if (!confirmed) {
                return;
            }
        }

        const nextStatuses = statusesList.filter((_, itemIndex) => itemIndex !== index);
        const cleaned = nextStatuses.map((item) => item.trim()).filter(Boolean);

        const nextDraftData = {
            ...draftData,
            statuses: cleaned.join(", "),
        };

        setStatusesList(nextStatuses);
        setDraftData(nextDraftData);

        if (editingStatusIndex === index) {
            setEditingStatusIndex(null);
        }

        if (isPending) {
            setPendingNewRow(null);
            setSuccessMessage("");
            setErrorMessage("");
            return;
        }

        await saveSetupRules(nextDraftData, { showSuccess: true });
    };

    const updatePriorityRow = (index, field, value) => {
        const next = [...priorityRows];
        next[index] = {
            ...next[index],
            [field]: value,
        };
        syncPriorityRows(next);
    };

    const addPriority = () => {
        const next = [...priorityRows, { name: "", multiplier: "" }];
        setPriorityRows(next);
        setEditingPriorityIndex(next.length - 1);
        setPendingNewRow({ type: "priority", index: next.length - 1 });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const deletePriority = async (index) => {
        const isPending =
            pendingNewRow?.type === "priority" && pendingNewRow?.index === index;

        if (!isPending) {
            const confirmed = window.confirm(
                "Are you sure you want to delete this priority level?"
            );
            if (!confirmed) {
                return;
            }
        }

        const nextRows = priorityRows.filter((_, itemIndex) => itemIndex !== index);
        const nextDraftData = {
            ...draftData,
            priorities: nextRows.map((row) => row.name.trim()).filter(Boolean).join(", "),
            priorityMultipliers: buildMultiplierString(nextRows),
        };

        setPriorityRows(nextRows);
        setDraftData(nextDraftData);

        if (editingPriorityIndex === index) {
            setEditingPriorityIndex(null);
        }

        if (isPending) {
            setPendingNewRow(null);
            setSuccessMessage("");
            setErrorMessage("");
            return;
        }

        await saveSetupRules(nextDraftData, { showSuccess: true });
    };

    const updateComplexityRow = (index, field, value) => {
        const next = [...complexityRows];
        next[index] = {
            ...next[index],
            [field]: value,
        };
        syncComplexityRows(next);
    };

    const addComplexity = () => {
        const next = [...complexityRows, { name: "", multiplier: "" }];
        setComplexityRows(next);
        setEditingComplexityIndex(next.length - 1);
        setPendingNewRow({ type: "complexity", index: next.length - 1 });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const deleteComplexity = async (index) => {
        const isPending =
            pendingNewRow?.type === "complexity" && pendingNewRow?.index === index;

        if (!isPending) {
            const confirmed = window.confirm(
                "Are you sure you want to delete this complexity level?"
            );
            if (!confirmed) {
                return;
            }
        }

        const nextRows = complexityRows.filter((_, itemIndex) => itemIndex !== index);
        const nextDraftData = {
            ...draftData,
            complexityLevels: nextRows.map((row) => row.name.trim()).filter(Boolean).join(", "),
            complexityMultipliers: buildMultiplierString(nextRows),
        };

        setComplexityRows(nextRows);
        setDraftData(nextDraftData);

        if (editingComplexityIndex === index) {
            setEditingComplexityIndex(null);
        }

        if (isPending) {
            setPendingNewRow(null);
            setSuccessMessage("");
            setErrorMessage("");
            return;
        }

        await saveSetupRules(nextDraftData, { showSuccess: true });
    };

    const handleStatusEditToggle = async (index, isEditingRow) => {
        if (isEditingRow) {
            const currentValue = (statusesList[index] || "").trim();
            if (!currentValue) {
                return;
            }
            const isPending =
                pendingNewRow?.type === "status" && pendingNewRow?.index === index;

            if (!isPending && !didStatusRowChange(index)) {
                setEditingStatusIndex(null);
                setPendingNewRow(null);
                setSuccessMessage("");
                setErrorMessage("");
                setStatusesList(parseCommaSeparated(taskData.statuses));
                setDraftData(taskData);
                return;
            }

            const ok = await saveSetupRules(draftData, {
                showSuccess: didStatusRowChange(index) || isPending,
            });

            if (ok) {
                setEditingStatusIndex(null);
                setPendingNewRow(null);
            }
            return;
        }

        setEditingStatusIndex(index);
    };

    const handlePriorityEditToggle = async (index, isEditingRow) => {
        if (isEditingRow) {
            const currentRow = priorityRows[index] || { name: "", multiplier: "" };
            if (!String(currentRow.name || "").trim() || !String(currentRow.multiplier || "").trim()) {
                return;
            }
            const isPending =
                pendingNewRow?.type === "priority" && pendingNewRow?.index === index;

            if (!isPending && !didPriorityRowChange(index)) {
                setEditingPriorityIndex(null);
                setPendingNewRow(null);
                setSuccessMessage("");
                setErrorMessage("");
                setPriorityRows(parseMultiplierRows(taskData.priorityMultipliers));
                setDraftData(taskData);
                return;
            }

            const ok = await saveSetupRules(draftData, {
                showSuccess: didPriorityRowChange(index) || isPending,
            });

            if (ok) {
                setEditingPriorityIndex(null);
                setPendingNewRow(null);
            }
            return;
        }

        setEditingPriorityIndex(index);
    };

    const handleComplexityEditToggle = async (index, isEditingRow) => {
        if (isEditingRow) {
            const currentRow = complexityRows[index] || { name: "", multiplier: "" };
            if (!String(currentRow.name || "").trim() || !String(currentRow.multiplier || "").trim()) {
                return;
            }
            const isPending =
                pendingNewRow?.type === "complexity" && pendingNewRow?.index === index;

            if (!isPending && !didComplexityRowChange(index)) {
                setEditingComplexityIndex(null);
                setPendingNewRow(null);
                setSuccessMessage("");
                setErrorMessage("");
                setComplexityRows(parseMultiplierRows(taskData.complexityMultipliers));
                setDraftData(taskData);
                return;
            }

            const ok = await saveSetupRules(draftData, {
                showSuccess: didComplexityRowChange(index) || isPending,
            });

            if (ok) {
                setEditingComplexityIndex(null);
                setPendingNewRow(null);
            }
            return;
        }

        setEditingComplexityIndex(index);
    };

    const renderStatusRow = (status, index) => {
        const isEditingRow = editingStatusIndex === index;

        return (
            <div className="task-setup-rules-row" key={`status-${index}`}>
                {isEditingRow ? (
                    <input
                        type="text"
                        className="task-setup-rules-input task-setup-rules-input--row"
                        value={status}
                        onChange={(e) => updateStatusValue(index, e.target.value)}
                        placeholder="Status name"
                    />
                ) : (
                    <div className="task-setup-rules-row-value">{status || "-"}</div>
                )}

                <div className="task-setup-rules-row-actions">
                    <button
                        type="button"
                        className="task-setup-rules-icon-btn"
                        onClick={() => handleStatusEditToggle(index, isEditingRow)}
                        aria-label="Edit status"
                        disabled={isEditingRow && !(statusesList[index] || "").trim()}
                    >
                        {isEditingRow ? <FiCheck /> : <FiEdit2 />}
                    </button>

                    <button
                        type="button"
                        className="task-setup-rules-icon-btn task-setup-rules-icon-btn--danger"
                        onClick={() => deleteStatus(index)}
                        aria-label="Delete status"
                    >
                        <FiTrash />
                    </button>
                </div>
            </div>
        );
    };

    const renderNamedMultiplierRow = (
        row,
        index,
        section,
        editingIndex,
        onEditToggle,
        onUpdate,
        onDelete
    ) => {
        const isEditingRow = editingIndex === index;

        return (
            <div
                className="task-setup-rules-row task-setup-rules-row--triple"
                key={`${section}-${index}`}
            >
                {isEditingRow ? (
                    <>
                        <input
                            type="text"
                            className="task-setup-rules-input task-setup-rules-input--row"
                            value={row.name}
                            onChange={(e) => onUpdate(index, "name", e.target.value)}
                            placeholder={`${section} name`}
                        />
                        <input
                            type="text"
                            className="task-setup-rules-input task-setup-rules-input--row task-setup-rules-input--small"
                            value={row.multiplier}
                            onChange={(e) => onUpdate(index, "multiplier", e.target.value)}
                            placeholder="1.0"
                        />
                    </>
                ) : (
                    <>
                        <div className="task-setup-rules-row-value">{row.name || "-"}</div>
                        <div className="task-setup-rules-row-number">{row.multiplier || "-"}</div>
                    </>
                )}

                <div className="task-setup-rules-row-actions">
                    <button
                        type="button"
                        className="task-setup-rules-icon-btn"
                        onClick={() => onEditToggle(index, isEditingRow)}
                        aria-label={`Edit ${section}`}
                        disabled={
                            isEditingRow &&
                            (
                                !String(row.name || "").trim() ||
                                !String(row.multiplier || "").trim()
                            )
                        }
                    >
                        {isEditingRow ? <FiCheck /> : <FiEdit2 />}
                    </button>

                    <button
                        type="button"
                        className="task-setup-rules-icon-btn task-setup-rules-icon-btn--danger"
                        onClick={() => onDelete(index)}
                        aria-label={`Delete ${section}`}
                    >
                        <FiTrash />
                    </button>
                </div>
            </div>
        );
    };

    const renderActivePanel = () => {
        if (activeTab === "statuses") {
            return (
                <PanelCard title="Task Statuses" icon={<FiList />}>
                    <div className="task-setup-rules-list-stack">
                        {statusesList.length ? (
                            statusesList.map(renderStatusRow)
                        ) : (
                            <div className="task-setup-rules-row-empty">No statuses yet.</div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="task-setup-rules-add-btn"
                        onClick={addStatus}
                    >
                        <span className="task-setup-rules-add-btn__text">
                            <FiPlus /> Add New Status
                        </span>
                    </button>
                </PanelCard>
            );
        }

        if (activeTab === "priorities") {
            return (
                <PanelCard title="Priority Levels" icon={<FiFlag />}>
                    <div className="task-setup-rules-list-stack">
                        <div className="task-setup-rules-mini-head">
                            <span>Name</span>
                            <span>Multiplier</span>
                            <span></span>
                        </div>

                        {priorityRows.length ? (
                            priorityRows.map((row, index) =>
                                renderNamedMultiplierRow(
                                    row,
                                    index,
                                    "priority",
                                    editingPriorityIndex,
                                    handlePriorityEditToggle,
                                    updatePriorityRow,
                                    deletePriority
                                )
                            )
                        ) : (
                            <div className="task-setup-rules-row-empty">
                                No priority levels yet.
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="task-setup-rules-add-btn"
                        onClick={addPriority}
                    >
                        <span className="task-setup-rules-add-btn__text">
                            <FiPlus /> Add New Priority
                        </span>
                    </button>
                </PanelCard>
            );
        }

        if (activeTab === "complexities") {
            return (
                <PanelCard title="Complexity Levels" icon={<FiLayers />}>
                    <div className="task-setup-rules-list-stack">
                        <div className="task-setup-rules-mini-head">
                            <span>Name</span>
                            <span>Multiplier</span>
                            <span></span>
                        </div>

                        {complexityRows.length ? (
                            complexityRows.map((row, index) =>
                                renderNamedMultiplierRow(
                                    row,
                                    index,
                                    "complexity",
                                    editingComplexityIndex,
                                    handleComplexityEditToggle,
                                    updateComplexityRow,
                                    deleteComplexity
                                )
                            )
                        ) : (
                            <div className="task-setup-rules-row-empty">
                                No complexity levels yet.
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="task-setup-rules-add-btn"
                        onClick={addComplexity}
                    >
                        <span className="task-setup-rules-add-btn__text">
                            <FiPlus /> Add New Complexity
                        </span>
                    </button>
                </PanelCard>
            );
        }

        return (
            <PanelCard title="Effort Calculation Rule" icon={<FiSliders />}>
                <div className="task-setup-rules-formula-box">
                    {taskData.effortFormula || DEFAULT_FORMULA}
                </div>
            </PanelCard>
        );
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

            <div className="task-setup-rules-tabs">
                {TABS.map((tab) => (
                    <TabButton
                        key={tab.key}
                        icon={tab.icon}
                        label={tab.label}
                        isActive={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                    />
                ))}
            </div>

            {successMessage && !isLoading && (
                <div className="task-setup-rules-alert task-setup-rules-alert--success">
                    <FiCheck />
                    <span>{successMessage}</span>
                </div>
            )}

            {errorMessage && !isLoading && (
                <div className="task-setup-rules-alert task-setup-rules-alert--error">
                    <FiX />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="task-setup-rules-main-panel" ref={panelRef}>
                {isLoading ? (
                    <div className="task-setup-rules-empty-state">Loading...</div>
                ) : (
                    renderActivePanel()
                )}
            </div>
        </section>
    );
}
