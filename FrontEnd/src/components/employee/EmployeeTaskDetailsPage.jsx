import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FiArrowLeft,
    FiCalendar,
    FiCheckCircle,
    FiChevronDown,
    FiClock,
    FiFlag,
    FiLayers,
    FiMessageCircle,
    FiMessageSquare,
    FiSend,
    FiTarget,
    FiUser,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import "../../assets/styles/employee/employee-task-details-page.css";

const API_BASE = "http://localhost:5000";

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function mapStatusLabel(status) {
    const normalized = normalizeStatus(status);

    if (normalized === "new") return "New";
    if (normalized === "acknowledged") return "Acknowledged";
    if (normalized === "pending") return "Pending";
    if (normalized === "done" || normalized === "completed") return "Done";
    if (normalized === "approved") return "Approved";
    if (normalized === "rejected") return "Rejected";
    if (normalized === "archived") return "Archived";

    return status || "New";
}

function getNextStatus(status) {
    const normalized = normalizeStatus(status);

    if (normalized === "new") return "Acknowledged";
    if (normalized === "acknowledged") return "Pending";
    if (normalized === "pending") return "Done";

    return "Done";
}

function getStatusActionLabel(status) {
    const normalized = normalizeStatus(status);

    if (normalized === "new") return "Acknowledge";
    if (normalized === "acknowledged") return "Mark as Pending";
    if (normalized === "pending") return "Mark as Done";

    return "Completed";
}

function getPriorityClass(value) {
    const normalized = normalizeStatus(value);

    if (normalized === "low") return "employee-task-details-page__value--low";
    if (normalized === "medium") return "employee-task-details-page__value--medium-priority";
    if (normalized === "high") return "employee-task-details-page__value--high";
    if (normalized === "critical") return "employee-task-details-page__value--critical";

    return "employee-task-details-page__value--default";
}

function getComplexityClass(value) {
    const normalized = normalizeStatus(value);

    if (normalized === "simple") return "employee-task-details-page__value--simple";
    if (normalized === "medium") return "employee-task-details-page__value--medium-complexity";
    if (normalized === "complex") return "employee-task-details-page__value--complex";

    return "employee-task-details-page__value--default";
}

function getStatusClass(value) {
    const normalized = normalizeStatus(value);

    if (normalized === "new") return "employee-task-details-page__value--new";
    if (normalized === "acknowledged") return "employee-task-details-page__value--acknowledged";
    if (normalized === "pending") return "employee-task-details-page__value--pending";
    if (normalized === "done" || normalized === "completed") {
        return "employee-task-details-page__value--done";
    }
    if (normalized === "approved") return "employee-task-details-page__value--approved";
    if (normalized === "rejected") return "employee-task-details-page__value--rejected";
    if (normalized === "archived") return "employee-task-details-page__value--archived";

    return "employee-task-details-page__value--default";
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "No updates yet";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const now = new Date();

    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const timePart = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    if (isToday) {
        return `Today, ${timePart}`;
    }

    const datePart = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return `${datePart}, ${timePart}`;
}

function initialsFromName(name) {
    const clean = String(name || "").trim();
    if (!clean) return "NA";

    return clean
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
}

function getStoredEmployee() {
    try {
        const authUser = localStorage.getItem("authUser");
        const user = localStorage.getItem("user");
        return authUser ? JSON.parse(authUser) : user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

function getStoredEmployeeId() {
    const storedUser = getStoredEmployee();

    return (
        storedUser?.userId ||
        storedUser?.UserId ||
        storedUser?.id ||
        storedUser?.employeeId ||
        storedUser?.EmployeeId ||
        0
    );
}

function getStoredEmployeeName() {
    const storedUser = getStoredEmployee();

    return (
        storedUser?.fullName ||
        storedUser?.FullName ||
        storedUser?.name ||
        storedUser?.Name ||
        storedUser?.userName ||
        storedUser?.UserName ||
        storedUser?.employeeName ||
        storedUser?.EmployeeName ||
        ""
    );
}

function resolveChangedByName(item = {}) {
    return (
        item.changedByName ||
        item.ChangedByName ||
        item.changedByUserName ||
        item.ChangedByUserName ||
        item.userName ||
        item.UserName ||
        item.fullName ||
        item.FullName ||
        item.name ||
        item.Name ||
        ""
    );
}

function getProfileImage(user = {}) {
    const rawValue =
        user.profileImageUrl ||
        user.ProfileImageUrl ||
        user.imageUrl ||
        user.ImageUrl ||
        user.avatar ||
        user.assignedUserAvatar ||
        user.changedByProfileImageUrl ||
        user.changedByAvatar ||
        "";

    const value = String(rawValue || "").trim();

    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/")) return `${API_BASE}${value}`;

    return `${API_BASE}/${value}`;
}

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return rawText ? JSON.parse(rawText) : {};
    } catch {
        return {};
    }
}

export default function EmployeeTaskDetailsPage() {
    const navigate = useNavigate();
    const { taskId } = useParams();

    const [task, setTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [feedbackText, setFeedbackText] = useState("");
    const [requestChangeText, setRequestChangeText] = useState("");
    const [showRequestMenu, setShowRequestMenu] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [showAllFeedbackHistory, setShowAllFeedbackHistory] = useState(false);
    const [showAllTimeline, setShowAllTimeline] = useState(false);
    const [toast, setToast] = useState({ show: false, type: "success", message: "" });
    const toastTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    function showToast(message, type = "success") {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }

        setToast({ show: true, type, message });

        toastTimeoutRef.current = setTimeout(() => {
            setToast((prev) => ({ ...prev, show: false }));
        }, 3000);
    }

    const loadTaskDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const storedUser = getStoredEmployee();
            let rawTask = null;
            let historyItems = [];
            let availableStatuses = [];

            const byIdResponse = await fetch(`${API_BASE}/api/tasks/by-id/${taskId}`, {
                cache: "no-store",
            });
            const byIdData = await parseJsonResponse(byIdResponse);

            if (byIdResponse.ok && byIdData.success !== false) {
                rawTask = byIdData.task || byIdData.data || byIdData;
            }

            if (!rawTask) {
                const directResponse = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
                    cache: "no-store",
                });
                const directData = await parseJsonResponse(directResponse);

                if (directResponse.ok && directData.success !== false) {
                    rawTask = directData.task || directData.data || directData;
                }
            }

            if (!rawTask) {
                if (!storedUser?.companyId) {
                    throw new Error("Failed to load task details.");
                }

                const companyResponse = await fetch(
                    `${API_BASE}/api/tasks/company/${storedUser.companyId}`,
                    { cache: "no-store" }
                );
                const companyData = await parseJsonResponse(companyResponse);

                if (!companyResponse.ok || companyData.success === false) {
                    throw new Error(companyData.message || "Failed to load task details.");
                }

                const taskList = Array.isArray(companyData.tasks)
                    ? companyData.tasks
                    : Array.isArray(companyData.data)
                        ? companyData.data
                        : Array.isArray(companyData)
                            ? companyData
                            : [];

                rawTask =
                    taskList.find((item) => String(item.taskId || item.TaskId) === String(taskId)) || null;
            }

            if (!rawTask) {
                throw new Error("Failed to load task details.");
            }

            if (storedUser?.companyId) {
                const [historyResponse, statusesResponse] = await Promise.all([
                    fetch(`${API_BASE}/api/tasks/${taskId}/history`, { cache: "no-store" }),
                    fetch(`${API_BASE}/api/tasks/statuses/${storedUser.companyId}`, { cache: "no-store" }),
                ]);

                const historyData = await parseJsonResponse(historyResponse);
                const statusesData = await parseJsonResponse(statusesResponse);

                if (historyResponse.ok && historyData.success !== false) {
                    historyItems = Array.isArray(historyData.data)
                        ? historyData.data
                        : Array.isArray(historyData.history)
                            ? historyData.history
                            : [];
                }

                if (statusesResponse.ok && statusesData.success !== false) {
                    availableStatuses = Array.isArray(statusesData.statuses)
                        ? statusesData.statuses
                        : Array.isArray(statusesData.data)
                            ? statusesData.data
                            : [];
                }
            }

            const feedbackEntries = historyItems
                .filter((item) => String(item.feedback || item.Feedback || "").trim())
                .map((item, index) => ({
                    id: item.taskStatusHistoryId || item.TaskStatusHistoryId || `feedback-history-${index}`,
                    message: item.feedback || item.Feedback,
                    feedbackText: item.feedback || item.Feedback,
                    createdAt: item.changedAt || item.ChangedAt,
                    changedAt: item.changedAt || item.ChangedAt,
                    changedAtLabel: formatDateTime(item.changedAt || item.ChangedAt),
                    changedByName: resolveChangedByName(item),
                    changedByProfileImage: getProfileImage(item),
                }));

            const requestChangeEntries = feedbackEntries.filter((item) =>
                String(item.message).trim().toLowerCase().startsWith("request change:")
            );

            const pureFeedbackEntries = feedbackEntries.filter(
                (item) => !String(item.message).trim().toLowerCase().startsWith("request change:")
            );

            if (
                !feedbackEntries.length &&
                rawTask.feedback &&
                String(rawTask.feedback).trim()
            ) {
                pureFeedbackEntries.unshift({
                    id: "task-feedback-current",
                    message: rawTask.feedback,
                    feedbackText: rawTask.feedback,
                    createdAt: rawTask.updatedAt || rawTask.createdAt || "",
                    changedAt: rawTask.updatedAt || rawTask.createdAt || "",
                    changedAtLabel: formatDateTime(rawTask.updatedAt || rawTask.createdAt || ""),
                    changedByName: "",
                    changedByProfileImage: "",
                });
            }

            const mappedTask = {
                taskId: rawTask.taskId || rawTask.TaskId,
                companyId: rawTask.companyId || rawTask.CompanyId || storedUser?.companyId || 0,
                title: rawTask.title || rawTask.Title || "Untitled Task",
                description: rawTask.description || rawTask.Description || "",
                priority: rawTask.priority || rawTask.Priority || "-",
                complexity: rawTask.complexity || rawTask.Complexity || "-",
                effort:
                    rawTask.effort ??
                    rawTask.Effort ??
                    rawTask.estimatedEffortHours ??
                    rawTask.estimatedEffort ??
                    0,
                weight: rawTask.weight ?? rawTask.Weight ?? rawTask.taskWeight ?? 0,
                dueDate: rawTask.dueDate || rawTask.DueDate || rawTask.endDate || rawTask.deadline || "",
                startDate: rawTask.startDate || rawTask.StartDate || rawTask.createdAt || rawTask.CreatedAt || "",
                status:
                    rawTask.taskStatusName ||
                    rawTask.TaskStatusName ||
                    rawTask.status ||
                    rawTask.Status ||
                    rawTask.taskStatus?.statusName ||
                    "New",
                taskStatusId: rawTask.taskStatusId || rawTask.TaskStatusId || rawTask.statusId || rawTask.StatusId || 0,
                assignedToName:
                    rawTask.assignedToName ||
                    rawTask.AssignedToName ||
                    rawTask.assignedUserName ||
                    rawTask.employeeName ||
                    "Assigned user",
                assignedToEmail:
                    rawTask.assignedToEmail ||
                    rawTask.AssignedToEmail ||
                    rawTask.assignedUserEmail ||
                    rawTask.employeeEmail ||
                    "",
                assignedToProfileImage: getProfileImage(rawTask),
                feedback: pureFeedbackEntries,
                requestChanges: requestChangeEntries,
                updatedAt:
                    rawTask.updatedAt ||
                    rawTask.UpdatedAt ||
                    rawTask.lastUpdated ||
                    rawTask.createdAt ||
                    rawTask.CreatedAt ||
                    "",
                history: historyItems,
                availableStatuses,
            };

            setTask(mappedTask);
        } catch (error) {
            setErrorMessage(error.message || "Failed to load task details.");
        } finally {
            setIsLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadTaskDetails();
    }, [loadTaskDetails]);

    useEffect(() => {
        const handleWindowFocus = () => {
            loadTaskDetails();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                loadTaskDetails();
            }
        };

        window.addEventListener("focus", handleWindowFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleWindowFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [loadTaskDetails]);

    const timelineItems = useMemo(() => {
        if (!task) return [];

        const historyEntries = (task.history || []).map((item, index) => {
            const feedbackValue = String(item.feedback || item.Feedback || "").trim();
            const oldStatusName = item.oldStatusName || item.OldStatusName || "";
            const newStatusName = item.newStatusName || item.NewStatusName || "";
            const changedByName = resolveChangedByName(item);
            const changedAt = item.changedAt || item.ChangedAt || "";
            const oldNormalized = normalizeStatus(oldStatusName);
            const newNormalized = normalizeStatus(newStatusName);
            const hasStatusChanged = Boolean(newStatusName) && oldNormalized !== newNormalized;

            return {
                id:
                    item.taskStatusHistoryId ||
                    item.TaskStatusHistoryId ||
                    `history-item-${index}`,
                type: hasStatusChanged ? "status" : "feedback",
                hasStatusChanged,
                title: hasStatusChanged
                    ? `Status changed to ${mapStatusLabel(newStatusName)}`
                    : "Feedback added",
                createdAt: changedAt,
                changedAtLabel: formatDateTime(changedAt),
                feedbackText: feedbackValue,
                changedByName,
                changedByProfileImage: getProfileImage(item),
                statusName: newStatusName,
                newStatusName,
            };
        });

        const fallbackStatusEvent = historyEntries.length
            ? []
            : [
                {
                    id: `status-${task.taskId}`,
                    type: "status",
                    hasStatusChanged: true,
                    title: `Status changed to ${mapStatusLabel(task.status)}`,
                    createdAt: task.updatedAt || task.startDate,
                    changedAtLabel: formatDateTime(task.updatedAt || task.startDate),
                    feedbackText: "",
                    changedByName: "",
                    changedByProfileImage: "",
                    statusName: task.status,
                    newStatusName: task.status,
                },
            ];

        return [...historyEntries, ...fallbackStatusEvent].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }, [task]);

    const feedbackHistoryEntries = useMemo(() => {
        if (!task?.feedback?.length) return [];

        return [...task.feedback].sort(
            (a, b) =>
                new Date(b.createdAt || b.changedAt || 0).getTime() -
                new Date(a.createdAt || a.changedAt || 0).getTime()
        );
    }, [task]);

    const visibleTimelineEntries = useMemo(
        () => (showAllTimeline ? timelineItems : timelineItems.slice(0, 5)),
        [timelineItems, showAllTimeline]
    );

    const visibleFeedbackHistoryEntries = useMemo(
        () =>
            showAllFeedbackHistory
                ? feedbackHistoryEntries
                : feedbackHistoryEntries.slice(0, 3),
        [feedbackHistoryEntries, showAllFeedbackHistory]
    );

    const latestUpdateText = useMemo(() => {
        if (!task) return "No updates yet";

        const dates = [
            task.updatedAt,
            ...(task.history || []).map((item) => item.changedAt || item.ChangedAt),
            ...(task.feedback || []).map((item) => item.createdAt || item.date),
            ...(task.requestChanges || []).map((item) => item.createdAt || item.date),
        ].filter(Boolean);

        if (dates.length === 0) return "No updates yet";

        const latest = dates.sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime()
        )[0];

        return formatDateTime(latest);
    }, [task]);

    function getNextStatusData(currentTask) {
        const availableStatuses = Array.isArray(currentTask?.availableStatuses)
            ? [...currentTask.availableStatuses].sort(
                (a, b) =>
                    Number(a.displayOrder || a.DisplayOrder || 0) -
                    Number(b.displayOrder || b.DisplayOrder || 0)
            )
            : [];

        if (availableStatuses.length && currentTask?.taskStatusId) {
            const currentIndex = availableStatuses.findIndex(
                (item) =>
                    Number(item.taskStatusId || item.TaskStatusId) ===
                    Number(currentTask.taskStatusId)
            );

            if (currentIndex >= 0 && currentIndex < availableStatuses.length - 1) {
                return availableStatuses[currentIndex + 1];
            }
        }

        const fallbackNextLabel = getNextStatus(currentTask?.status);

        return (
            availableStatuses.find(
                (item) =>
                    normalizeStatus(item.statusName || item.StatusName) ===
                    normalizeStatus(fallbackNextLabel)
            ) || null
        );
    }

    async function handleStatusUpdate() {
        if (!task) return;

        const changedByUserId = getStoredEmployeeId();
        const currentUserName = getStoredEmployeeName();
        const nextStatusData = getNextStatusData(task);

        if (!changedByUserId) {
            setErrorMessage("Unable to identify the current employee.");
            showToast("Unable to identify the current employee.", "error");
            return;
        }

        if (!nextStatusData?.taskStatusId && !nextStatusData?.TaskStatusId) {
            const message =
                normalizeStatus(task.status) === "done"
                    ? "This task is already completed."
                    : "No next status is available for this task.";
            setErrorMessage(message);
            showToast(message, "error");
            return;
        }

        const nextStatusId = Number(nextStatusData.taskStatusId || nextStatusData.TaskStatusId);
        const nextStatus =
            nextStatusData.statusName ||
            nextStatusData.StatusName ||
            getNextStatus(task.status);

        const previousTask = task;
        const nextUpdatedAt = new Date().toISOString();

        try {
            setIsUpdatingStatus(true);
            setErrorMessage("");

            setTask((prev) =>
                prev
                    ? {
                        ...prev,
                        status: nextStatus,
                        taskStatusId: nextStatusId,
                        updatedAt: nextUpdatedAt,
                        history: [
                            {
                                taskStatusHistoryId: `history-status-local-${nextUpdatedAt}`,
                                oldStatusName: prev.status,
                                newStatusName: nextStatus,
                                feedback: "",
                                changedAt: nextUpdatedAt,
                                changedByName: currentUserName || "",
                            },
                            ...(prev.history || []),
                        ],
                    }
                    : prev
            );

            const response = await fetch(`${API_BASE}/api/tasks/update-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    TaskId: Number(task.taskId),
                    NewTaskStatusId: nextStatusId,
                    ChangedByUserId: Number(changedByUserId),
                    Feedback: "",
                }),
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Failed to update task status.");
            }

            await loadTaskDetails();
            showToast(`Task status updated to ${mapStatusLabel(nextStatus)}.`, "success");
        } catch (error) {
            setTask(previousTask);
            setErrorMessage(error.message || "Failed to update task status.");
            showToast(error.message || "Failed to update task status.", "error");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    async function handleSubmitFeedback(event) {
        event.preventDefault();

        if (!task) return;

        const trimmedFeedback = feedbackText.trim();
        if (!trimmedFeedback || isSubmittingFeedback) return;

        const changedByUserId = getStoredEmployeeId();
        const currentStatusId = Number(task.taskStatusId || 0);
        const createdAt = new Date().toISOString();
        const currentUserName = getStoredEmployeeName();
        const previousTask = task;

        if (!changedByUserId || !currentStatusId) {
            const message = "Unable to submit feedback right now.";
            setErrorMessage(message);
            showToast(message, "error");
            return;
        }

        try {
            setIsSubmittingFeedback(true);
            setErrorMessage("");
            setFeedbackText("");

            setTask((prev) =>
                prev
                    ? {
                        ...prev,
                        feedback: [
                            {
                                id: `feedback-local-${createdAt}`,
                                message: trimmedFeedback,
                                feedbackText: trimmedFeedback,
                                createdAt,
                                changedAt: createdAt,
                                changedAtLabel: formatDateTime(createdAt),
                                changedByName: currentUserName || "",
                                changedByProfileImage: "",
                            },
                            ...(prev.feedback || []),
                        ],
                        history: [
                            {
                                taskStatusHistoryId: `history-feedback-local-${createdAt}`,
                                oldStatusName: prev.status,
                                newStatusName: prev.status,
                                feedback: trimmedFeedback,
                                changedAt: createdAt,
                                changedByName: currentUserName || "",
                            },
                            ...(prev.history || []),
                        ],
                        updatedAt: createdAt,
                    }
                    : prev
            );

            const response = await fetch(`${API_BASE}/api/tasks/update-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    TaskId: Number(task.taskId),
                    NewTaskStatusId: currentStatusId,
                    ChangedByUserId: Number(changedByUserId),
                    Feedback: trimmedFeedback,
                }),
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Unable to submit feedback.");
            }

            await loadTaskDetails();
            showToast("Feedback submitted successfully.", "success");
        } catch (error) {
            setTask(previousTask);
            setFeedbackText(trimmedFeedback);
            setErrorMessage(error.message || "Unable to submit feedback.");
            showToast(error.message || "Unable to submit feedback.", "error");
        } finally {
            setIsSubmittingFeedback(false);
        }
    }

    async function handleRequestChangeSubmit(event) {
        event.preventDefault();

        if (!task || !requestChangeText.trim()) return;

        const changedByUserId = getStoredEmployeeId();
        const requestFeedback = `Request change: ${requestChangeText.trim()}`;
        const createdAt = new Date().toISOString();
        const previousTask = task;

        if (!changedByUserId || !task.taskStatusId) {
            const message = "Unable to submit request change.";
            setErrorMessage(message);
            showToast(message, "error");
            return;
        }

        try {
            setIsSubmittingRequest(true);
            setErrorMessage("");

            setTask((prev) =>
                prev
                    ? {
                        ...prev,
                        requestChanges: [
                            {
                                id: `request-local-${createdAt}`,
                                message: requestFeedback,
                                createdAt,
                                changedByName: getStoredEmployeeName() || "",
                            },
                            ...(prev.requestChanges || []),
                        ],
                        history: [
                            {
                                taskStatusHistoryId: `history-request-${createdAt}`,
                                oldStatusName: prev.status,
                                newStatusName: prev.status,
                                feedback: requestFeedback,
                                changedAt: createdAt,
                                changedByName: getStoredEmployeeName() || "",
                            },
                            ...(prev.history || []),
                        ],
                        updatedAt: createdAt,
                    }
                    : prev
            );

            const response = await fetch(`${API_BASE}/api/tasks/update-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    TaskId: Number(task.taskId),
                    NewTaskStatusId: Number(task.taskStatusId),
                    ChangedByUserId: Number(changedByUserId),
                    Feedback: requestFeedback,
                }),
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Failed to submit request change.");
            }

            setRequestChangeText("");
            setShowRequestMenu(false);
            await loadTaskDetails();
            showToast("Request change sent successfully.", "success");
        } catch (error) {
            setTask(previousTask);
            setErrorMessage(error.message || "Failed to submit request change.");
            showToast(error.message || "Failed to submit request change.", "error");
        } finally {
            setIsSubmittingRequest(false);
        }
    }

    if (isLoading) {
        return (
            <div className="employee-task-details-page">
                <div className="employee-task-details-page__empty-state-card">
                    Loading task details...
                </div>
            </div>
        );
    }

    if (errorMessage && !task) {
        return (
            <div className="employee-task-details-page">
                <div className="employee-task-details-page__top-error">{errorMessage}</div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="employee-task-details-page">
                <div className="employee-task-details-page__empty-state-card">
                    Task not found.
                </div>
            </div>
        );
    }

    const nextStatusActionLabel = getStatusActionLabel(task.status);
    const isTaskDone = normalizeStatus(task.status) === "done";

    return (
        <div className="employee-task-details-page">
            {toast.show ? (
                <div
                    className={`employee-task-details-page__toast employee-task-details-page__toast--${toast.type}`}
                >
                    {toast.message}
                </div>
            ) : null}

            <div className="employee-task-details-page__title-row">
                <button
                    type="button"
                    className="employee-task-details-page__back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    <FiArrowLeft />
                </button>

                <h2>Task Details</h2>
                <div className="employee-task-details-page__title-line" />
            </div>

            <div className="employee-task-details-page__toolbar">
                <div className="employee-task-details-page__request-wrap">
                    <button
                        type="button"
                        className="employee-task-details-page__request-btn"
                        onClick={() => setShowRequestMenu((prev) => !prev)}
                        disabled={isSubmittingRequest}
                    >
                        <FiMessageCircle />
                        <span>Request Change</span>
                        <FiChevronDown />
                    </button>

                    {showRequestMenu ? (
                        <form
                            className="employee-task-details-page__request-dropdown"
                            onSubmit={handleRequestChangeSubmit}
                        >
                            <textarea
                                value={requestChangeText}
                                onChange={(event) =>
                                    setRequestChangeText(event.target.value.slice(0, 500))
                                }
                                placeholder="Explain what should be changed..."
                            />
                            <button
                                type="submit"
                                className="employee-task-details-page__request-submit"
                                disabled={isSubmittingRequest || !requestChangeText.trim()}
                            >
                                {isSubmittingRequest ? "Sending..." : "Send Request"}
                            </button>
                        </form>
                    ) : null}
                </div>

                <button
                    type="button"
                    className="employee-task-details-page__status-btn"
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingStatus || isTaskDone}
                >
                    <FiCheckCircle />
                    <span>{isUpdatingStatus ? "Updating..." : nextStatusActionLabel}</span>
                </button>
            </div>

            <div className="employee-task-details-page__content-grid">
                <div className="employee-task-details-page__single-card">
                    <div className="employee-task-details-page__top-block">
                        <h3>{task.title}</h3>
                        <p>{task.description || "No description available."}</p>
                    </div>

                    <div className="employee-task-details-page__divider" />

                    <div className="employee-task-details-page__assigned-section">
                        <h4>Assigned To</h4>

                        <div className="employee-task-details-page__assignee-row">
                            <div className="employee-task-details-page__assignee-avatar">
                                {task.assignedToProfileImage ? (
                                    <img
                                        src={task.assignedToProfileImage}
                                        alt={task.assignedToName}
                                    />
                                ) : (
                                    initialsFromName(task.assignedToName)
                                )}
                            </div>

                            <div className="employee-task-details-page__assignee-copy">
                                <strong>{task.assignedToName}</strong>
                                <small>{task.assignedToEmail || "No email available"}</small>
                            </div>
                        </div>
                    </div>

                    <div className="employee-task-details-page__divider" />

                    <div className="employee-task-details-page__details-grid">
                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiFlag />
                                <span>Priority</span>
                            </div>
                            <strong className={getPriorityClass(task.priority)}>
                                {task.priority}
                            </strong>
                        </div>

                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiLayers />
                                <span>Complexity</span>
                            </div>
                            <strong className={getComplexityClass(task.complexity)}>
                                {task.complexity}
                            </strong>
                        </div>

                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiClock />
                                <span>Estimated Effort</span>
                            </div>
                            <strong>{task.effort} h</strong>
                        </div>

                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiTarget />
                                <span>Weight</span>
                            </div>
                            <strong>{Number(task.weight || 0).toFixed(2)}</strong>
                        </div>

                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiCalendar />
                                <span>Due Date</span>
                            </div>
                            <strong>{formatDate(task.dueDate)}</strong>
                        </div>

                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiCalendar />
                                <span>Start Date</span>
                            </div>
                            <strong>{formatDate(task.startDate)}</strong>
                        </div>

                        <div className="employee-task-details-page__detail-item">
                            <div className="employee-task-details-page__label-row">
                                <FiUser />
                                <span>Status</span>
                            </div>
                            <strong className={getStatusClass(task.status)}>
                                {mapStatusLabel(task.status)}
                            </strong>
                        </div>
                    </div>
                </div>

                <div className="employee-task-details-page__right-column">
                    <div className="employee-task-details-page__top-panels">
                        <div className="employee-task-details-page__timeline-card">
                            <div className="employee-task-details-page__section-header">
                                <div className="employee-task-details-page__section-title-wrap">
                                    <div className="employee-task-details-page__section-icon">
                                        <FiClock />
                                    </div>
                                    <h3>Activity Timeline</h3>
                                </div>

                                {timelineItems.length > 4 ? (
                                    <button
                                        type="button"
                                        className="employee-task-details-page__view-all-btn"
                                        onClick={() => setShowAllTimeline((previous) => !previous)}
                                    >
                                        {showAllTimeline ? "Show less" : "View all"}
                                    </button>
                                ) : null}
                            </div>

                            <div className="employee-task-details-page__card-scroll-area">
                                {visibleTimelineEntries.length === 0 ? (
                                    <div className="employee-task-details-page__empty-state">
                                        No activity has been recorded yet.
                                    </div>
                                ) : (
                                    <div className="employee-task-details-page__timeline-list">
                                        {visibleTimelineEntries.map((item) => (
                                            <div
                                                key={item.id}
                                                className="employee-task-details-page__timeline-item"
                                            >
                                                <div
                                                    className={`employee-task-details-page__timeline-marker ${
                                                        item.hasStatusChanged
                                                            ? "employee-task-details-page__timeline-marker--status"
                                                            : "employee-task-details-page__timeline-marker--feedback"
                                                    }`}
                                                />

                                                <div className="employee-task-details-page__timeline-content">
                                                    <div className="employee-task-details-page__timeline-heading">
                                                        {item.hasStatusChanged ? (
                                                            <>
                                                                <span>Status changed to </span>
                                                                <span className={getStatusClass(item.newStatusName)}>
                                                                    {mapStatusLabel(item.newStatusName)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            "Feedback added"
                                                        )}
                                                    </div>

                                                    <div className="employee-task-details-page__timeline-meta">
                                                        {item.changedByName ? `By ${item.changedByName} • ` : ""}
                                                        {item.changedAtLabel}
                                                    </div>

                                                    {!item.hasStatusChanged && item.feedbackText ? (
                                                        <div className="employee-task-details-page__timeline-note">
                                                            “{item.feedbackText}”
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="employee-task-details-page__history-card employee-task-details-page__summary-card">
                            <div className="employee-task-details-page__section-header">
                                <div className="employee-task-details-page__section-title-wrap">
                                    <div className="employee-task-details-page__section-icon">
                                        <FiMessageSquare />
                                    </div>
                                    <h3>Feedback Summary</h3>
                                </div>

                                {feedbackHistoryEntries.length > 2 ? (
                                    <button
                                        type="button"
                                        className="employee-task-details-page__view-all-btn"
                                        onClick={() =>
                                            setShowAllFeedbackHistory((previous) => !previous)
                                        }
                                    >
                                        {showAllFeedbackHistory ? "Show less" : "View all"}
                                    </button>
                                ) : null}
                            </div>

                            <div className="employee-task-details-page__summary-stats">
                                <div className="employee-task-details-page__summary-stat">
                                    <span>Total Feedback</span>
                                    <strong>{feedbackHistoryEntries.length}</strong>
                                </div>

                                <div className="employee-task-details-page__summary-stat">
                                    <span>Latest Update</span>
                                    <strong>
                                        {feedbackHistoryEntries.length
                                            ? feedbackHistoryEntries[0].changedAtLabel
                                            : latestUpdateText}
                                    </strong>
                                </div>
                            </div>

                            <div className="employee-task-details-page__card-scroll-area">
                                {visibleFeedbackHistoryEntries.length ? (
                                    <div className="employee-task-details-page__history-list">
                                        {visibleFeedbackHistoryEntries.map((item, index) => (
                                            <div
                                                key={item.id || `${item.createdAt}-${index}`}
                                                className="employee-task-details-page__history-item"
                                            >
                                                <div className="employee-task-details-page__history-dot" />

                                                <div className="employee-task-details-page__history-avatar">
                                                    {item.changedByProfileImage ? (
                                                        <img
                                                            src={item.changedByProfileImage}
                                                            alt={item.changedByName || "User"}
                                                        />
                                                    ) : (
                                                        initialsFromName(item.changedByName || "User")
                                                    )}
                                                </div>

                                                <div className="employee-task-details-page__history-content">
                                                    <div className="employee-task-details-page__history-meta">
                                                        <strong>
                                                            {item.changedByName || "Unknown user"}
                                                        </strong>
                                                        <span>
                                                            {item.changedAtLabel ||
                                                                formatDateTime(item.createdAt)}
                                                        </span>
                                                        {index === 0 ? (
                                                            <span className="employee-task-details-page__history-badge">
                                                                Latest
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p>{item.feedbackText || item.message || item.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="employee-task-details-page__empty-state">
                                        No feedback has been added yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="employee-task-details-page__feedback-inline-card">
                        <form
                            className="employee-task-details-page__feedback-inline-form"
                            onSubmit={handleSubmitFeedback}
                        >
                            <div className="employee-task-details-page__feedback-inline-main">
                                <div className="employee-task-details-page__feedback-inline-input-wrap">
                                    <input
                                        type="text"
                                        placeholder="Add feedback and send it..."
                                        value={feedbackText}
                                        onChange={(event) =>
                                            setFeedbackText(event.target.value.slice(0, 500))
                                        }
                                    />
                                    <span className="employee-task-details-page__feedback-inline-count">
                                        {feedbackText.length}/500
                                    </span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="employee-task-details-page__feedback-inline-submit"
                                disabled={isSubmittingFeedback || !feedbackText.trim()}
                            >
                                <FiSend />
                                <span>{isSubmittingFeedback ? "Sending..." : "Send"}</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}