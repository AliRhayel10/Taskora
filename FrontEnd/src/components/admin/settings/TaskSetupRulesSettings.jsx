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
    const statusesArray = Array.isArray(data?.statuses) ? data.statuses : [];

    return {
        statuses: statusesArray.join(", "),
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
        defaultStatus:
            data?.defaultStatus ||
            statusesArray.find((status) => status.trim().toLowerCase() === "new") ||
            statusesArray[0] ||
            "",
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
        defaultStatus: "",
    });

    const [draftData, setDraftData] = useState({
        statuses: "",
        priorities: "",
        complexityLevels: "",
        priorityMultipliers: "",
        complexityMultipliers: "",
        effortFormula: DEFAULT_FORMULA,
        defaultStatus: "",
    });

    const [statusesList, setStatusesList] = useState([]);
    const [priorityRows, setPriorityRows] = useState([]);
    const [complexityRows, setComplexityRows] = useState([]);

    const [editingPriorityIndex, setEditingPriorityIndex] = useState(null);
    const [editingComplexityIndex, setEditingComplexityIndex] = useState(null);
    const [activeTab, setActiveTab] = useState("statuses");

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null,
        index: null,
        title: "",
        message: "",
    });

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

    const resetDraftToSaved = () => {
        setDraftData(taskData);
        setStatusesList(parseCommaSeparated(taskData.statuses));
        setPriorityRows(parseMultiplierRows(taskData.priorityMultipliers));
        setComplexityRows(parseMultiplierRows(taskData.complexityMultipliers));
    };

    const syncStatuses = (nextStatuses) => {
        const cleaned = nextStatuses.map((item) => item.trim()).filter(Boolean);
        setStatusesList(nextStatuses);
        setDraftData((prev) => ({
            ...prev,
            statuses: cleaned.join(", "),
        }));
    };

    const syncPriorityRows = (nextRows) => {
        setPriorityRows(nextRows);
        setDraftData((prev) => ({
            ...prev,
            priorities: nextRows.map((row) => row.name.trim()).filter(Boolean).join(", "),
            priorityMultipliers: buildMultiplierString(nextRows),
        }));
    };

    const syncComplexityRows = (nextRows) => {
        setComplexityRows(nextRows);
        setDraftData((prev) => ({
            ...prev,
            complexityLevels: nextRows.map((row) => row.name.trim()).filter(Boolean).join(", "),
            complexityMultipliers: buildMultiplierString(nextRows),
        }));
    };

    const closeDeleteModal = () => {
        setDeleteModal({
            isOpen: false,
            type: null,
            index: null,
            title: "",
            message: "",
        });
    };

    const openDeleteModal = (type, index, title, message) => {
        setDeleteModal({
            isOpen: true,
            type,
            index,
            title,
            message,
        });
    };

    const cancelPriorityEdit = (index) => {
        const isPending =
            pendingNewRow?.type === "priority" && pendingNewRow?.index === index;

        if (isPending) {
            const nextRows = priorityRows.filter((_, itemIndex) => itemIndex !== index);
            setPriorityRows(nextRows);
            setDraftData(taskData);
            setPendingNewRow(null);
            setEditingPriorityIndex(null);
            setErrorMessage("");
            setSuccessMessage("");
            return;
        }

        resetDraftToSaved();
        setEditingPriorityIndex(null);
        setPendingNewRow(null);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const cancelComplexityEdit = (index) => {
        const isPending =
            pendingNewRow?.type === "complexity" && pendingNewRow?.index === index;

        if (isPending) {
            const nextRows = complexityRows.filter((_, itemIndex) => itemIndex !== index);
            setComplexityRows(nextRows);
            setDraftData(taskData);
            setPendingNewRow(null);
            setEditingComplexityIndex(null);
            setErrorMessage("");
            setSuccessMessage("");
            return;
        }

        resetDraftToSaved();
        setEditingComplexityIndex(null);
        setPendingNewRow(null);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const removePendingRow = () => {
        if (!pendingNewRow) {
            return;
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

        setDraftData(taskData);
        setPendingNewRow(null);
        setErrorMessage("");
        setSuccessMessage("");
    };

    useEffect(() => {
        const hasEditableFieldOpen =
            pendingNewRow !== null ||
            editingPriorityIndex !== null ||
            editingComplexityIndex !== null;

        if (!hasEditableFieldOpen) {
            return;
        }

        const handleOutsideClick = (event) => {
            const clickedInsideAnyRow = event.target.closest(".task-setup-rules-row");
            const clickedInsideDeleteModal = event.target.closest(
                ".task-setup-rules-delete-modal"
            );

            if (clickedInsideDeleteModal) {
                return;
            }


            if (editingPriorityIndex !== null) {
                const activeRow = panelRef.current?.querySelector(
                    `[data-row-type="priority"][data-row-index="${editingPriorityIndex}"]`
                );

                if (activeRow && !activeRow.contains(event.target)) {
                    cancelPriorityEdit(editingPriorityIndex);
                    return;
                }
            }

            if (editingComplexityIndex !== null) {
                const activeRow = panelRef.current?.querySelector(
                    `[data-row-type="complexity"][data-row-index="${editingComplexityIndex}"]`
                );

                if (activeRow && !activeRow.contains(event.target)) {
                    cancelComplexityEdit(editingComplexityIndex);
                    return;
                }
            }

            if (!clickedInsideAnyRow && pendingNewRow) {
                removePendingRow();
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [
        pendingNewRow,
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

        payload.defaultStatus =
            nextDraftData.defaultStatus?.trim() ||
            payload.statuses.find((status) => status.trim().toLowerCase() === "new") ||
            payload.statuses[0] ||
            "";

        console.log("Saving payload:", payload);

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

            const rawText = await response.text();
            console.log("Raw response:", rawText);

            const result = rawText ? JSON.parse(rawText) : null;

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
                defaultStatus: payload.defaultStatus,
            };

            setTaskData(normalizedData);
            setDraftData(normalizedData);
            setStatusesList(payload.statuses);
            setPriorityRows(parseMultiplierRows(normalizedData.priorityMultipliers));
            setComplexityRows(parseMultiplierRows(normalizedData.complexityMultipliers));
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


    const updatePriorityRow = (index, field, value) => {
        const next = [...priorityRows];
        next[index] = {
            ...next[index],
            [field]: value,
        };
        syncPriorityRows(next);
    };

    const updateComplexityRow = (index, field, value) => {
        const next = [...complexityRows];
        next[index] = {
            ...next[index],
            [field]: value,
        };
        syncComplexityRows(next);
    };

    const stepMultiplierValue = (section, index, direction) => {
        const step = 0.1;

        if (section === "priority") {
            const currentRow = priorityRows[index] || { name: "", multiplier: "" };
            const currentValue = Number(currentRow.multiplier);
            const safeValue = Number.isNaN(currentValue) || currentValue <= 0 ? 0.1 : currentValue;
            const nextValue =
                direction === "up"
                    ? safeValue + step
                    : Math.max(0.1, safeValue - step);

            updatePriorityRow(index, "multiplier", nextValue.toFixed(1));
            return;
        }

        if (section === "complexity") {
            const currentRow = complexityRows[index] || { name: "", multiplier: "" };
            const currentValue = Number(currentRow.multiplier);
            const safeValue = Number.isNaN(currentValue) || currentValue <= 0 ? 0.1 : currentValue;
            const nextValue =
                direction === "up"
                    ? safeValue + step
                    : Math.max(0.1, safeValue - step);

            updateComplexityRow(index, "multiplier", nextValue.toFixed(1));
        }
    };

    const addPriority = () => {
        const next = [...priorityRows, { name: "", multiplier: "" }];
        setPriorityRows(next);
        setEditingPriorityIndex(next.length - 1);
        setPendingNewRow({ type: "priority", index: next.length - 1 });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const addComplexity = () => {
        const next = [...complexityRows, { name: "", multiplier: "" }];
        setComplexityRows(next);
        setEditingComplexityIndex(next.length - 1);
        setPendingNewRow({ type: "complexity", index: next.length - 1 });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const deletePriority = async (index, options = {}) => {
        const { skipModal = false } = options;
        const isPending =
            pendingNewRow?.type === "priority" && pendingNewRow?.index === index;

        if (!isPending && !skipModal) {
            openDeleteModal(
                "priority",
                index,
                "Delete priority level",
                "Are you sure you want to delete this priority level? This action will remove it from your task setup rules."
            );
            return;
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

    const deleteComplexity = async (index, options = {}) => {
        const { skipModal = false } = options;
        const isPending =
            pendingNewRow?.type === "complexity" && pendingNewRow?.index === index;

        if (!isPending && !skipModal) {
            openDeleteModal(
                "complexity",
                index,
                "Delete complexity level",
                "Are you sure you want to delete this complexity level? This action will remove it from your task setup rules."
            );
            return;
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

    const handleConfirmDelete = async () => {
        const { type, index } = deleteModal;
        closeDeleteModal();


        if (type === "priority") {
            await deletePriority(index, { skipModal: true });
            return;
        }

        if (type === "complexity") {
            await deleteComplexity(index, { skipModal: true });
        }
    };

    const handlePriorityEditToggle = async (index, isEditingRow) => {
        if (isEditingRow) {
            const currentRow = priorityRows[index] || { name: "", multiplier: "" };
            const multiplierValue = Number(currentRow.multiplier);

            if (
                !String(currentRow.name || "").trim() ||
                Number.isNaN(multiplierValue) ||
                multiplierValue <= 0
            ) {
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
            const multiplierValue = Number(currentRow.multiplier);

            if (
                !String(currentRow.name || "").trim() ||
                Number.isNaN(multiplierValue) ||
                multiplierValue <= 0
            ) {
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
        return (
            <div
                className="task-setup-rules-row task-setup-rules-row--status"
                key={`status-${index}`}
                data-row-type="status"
                data-row-index={index}
            >
                <div className="task-setup-rules-row-value">{status || "-"}</div>
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
        onDelete,
        onCancel
    ) => {
        const isEditingRow = editingIndex === index;

        return (
            <div
                className="task-setup-rules-row task-setup-rules-row--triple"
                key={`${section}-${index}`}
                data-row-type={section}
                data-row-index={index}
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
                        <div className="task-setup-rules-stepper-field">
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                className="task-setup-rules-input task-setup-rules-input--row task-setup-rules-input--small task-setup-rules-input--with-stepper"
                                value={row.multiplier}
                                onChange={(e) => onUpdate(index, "multiplier", e.target.value)}
                                placeholder="1.0"
                            />

                            <div className="task-setup-rules-stepper-buttons">
                                <button
                                    type="button"
                                    className="task-setup-rules-stepper-btn"
                                    onClick={() => stepMultiplierValue(section, index, "down")}
                                    aria-label={`Decrease ${section} multiplier`}
                                >
                                    ↓
                                </button>

                                <button
                                    type="button"
                                    className="task-setup-rules-stepper-btn"
                                    onClick={() => stepMultiplierValue(section, index, "up")}
                                    aria-label={`Increase ${section} multiplier`}
                                >
                                    ↑
                                </button>
                            </div>
                        </div>
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
                                Number(row.multiplier) <= 0 ||
                                Number.isNaN(Number(row.multiplier))
                            )
                        }
                    >
                        {isEditingRow ? <FiCheck /> : <FiEdit2 />}
                    </button>

                    {isEditingRow ? (
                        <button
                            type="button"
                            className="task-setup-rules-icon-btn task-setup-rules-icon-btn--cancel"
                            onClick={() => onCancel(index)}
                            aria-label={`Cancel ${section} edit`}
                        >
                            <FiX />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="task-setup-rules-icon-btn task-setup-rules-icon-btn--danger"
                            onClick={() => onDelete(index)}
                            aria-label={`Delete ${section}`}
                        >
                            <FiTrash />
                        </button>
                    )}
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
                                    deletePriority,
                                    cancelPriorityEdit
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
                                    deleteComplexity,
                                    cancelComplexityEdit
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

            {deleteModal.isOpen && (
                <div
                    className="users-section__modal-overlay"
                    role="presentation"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="users-section__modal users-section__modal--confirm task-setup-rules-delete-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-setup-delete-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="users-section__modal-header">
                            <div>
                                <h3 id="task-setup-delete-title">{deleteModal.title}</h3>
                                <p>{deleteModal.message}</p>
                            </div>
                            <button
                                type="button"
                                className="users-section__modal-close"
                                onClick={closeDeleteModal}
                                aria-label="Close delete confirmation"
                            >
                                <FiX />
                            </button>
                        </div>


                        <div className="users-section__form-actions users-section__form-actions--confirm">
                            <button
                                type="button"
                                className="users-section__secondary-btn"
                                onClick={closeDeleteModal}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="users-section__submit-btn users-section__submit-btn--danger"
                                onClick={handleConfirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}