import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FiArrowLeft,
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiFlag,
    FiLayers,
    FiMessageCircle,
    FiMessageSquare,
    FiSend,
    FiTarget,
    FiUser,
    FiX,
    FiAlertTriangle,
    FiMoreHorizontal,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import "../../assets/styles/employee/employee-task-details-page.css";

const API_BASE = "http://localhost:5000";
const DISMISSED_REVIEW_MESSAGES_KEY = "employee_task_details_dismissed_review_messages";
const DASHBOARD_UNASSIGNED_TASK_MESSAGE_KEY = "employee_dashboard_unassigned_task_message";

const REQUEST_CHANGE_OPTIONS = [
    {
        value: "dueDateChange",
        label: "Due Date Change",
        icon: FiCalendar,
        iconClass: "employee-task-details-page__change-type-icon--purple",
    },
    {
        value: "estimatedEffortChange",
        label: "Estimated Effort Change",
        icon: FiClock,
        iconClass: "employee-task-details-page__change-type-icon--blue",
    },
    {
        value: "assigneeChange",
        label: "Assignee Change",
        icon: FiUser,
        iconClass: "employee-task-details-page__change-type-icon--green",
    },
    {
        value: "other",
        label: "Other",
        icon: FiMoreHorizontal,
        iconClass: "employee-task-details-page__change-type-icon--purple",
    },
];

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function loadDismissedReviewMessageKeys() {
    try {
        const rawValue = localStorage.getItem(DISMISSED_REVIEW_MESSAGES_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];

        return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
    } catch {
        return [];
    }
}

function saveDismissedReviewMessageKeys(keys) {
    try {
        localStorage.setItem(
            DISMISSED_REVIEW_MESSAGES_KEY,
            JSON.stringify(Array.from(new Set(keys.map(String))))
        );
    } catch {
        // Local storage is optional. If unavailable, the message still dismisses for this session.
    }
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

function formatDateForInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

function getTaskAssignedUserId(task = {}) {
    return Number(
        task.assignedToUserId ||
        task.AssignedToUserId ||
        task.assignedUserId ||
        task.AssignedUserId ||
        task.assigneeUserId ||
        task.AssigneeUserId ||
        task.assignedToId ||
        task.AssignedToId ||
        task.assigneeId ||
        task.AssigneeId ||
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
        item.requestedByName ||
        item.RequestedByName ||
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
        user.requestedByProfileImageUrl ||
        user.requestedByAvatar ||
        "";

    const value = String(rawValue || "").trim();

    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/")) return `${API_BASE}${value}`;

    return `${API_BASE}/${value}`;
}

function getRequestChangeTypeLabel(value) {
    return (
        REQUEST_CHANGE_OPTIONS.find((option) => option.value === value)?.label || "Other"
    );
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

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestChangeType, setRequestChangeType] = useState("");
    const [requestNewDate, setRequestNewDate] = useState("");
    const [requestNewEffort, setRequestNewEffort] = useState("");
    const [requestReason, setRequestReason] = useState("");

    const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [showAllFeedbackHistory, setShowAllFeedbackHistory] = useState(false);
    const [showAllTimeline, setShowAllTimeline] = useState(false);
    const [toast, setToast] = useState({ show: false, type: "success", message: "" });
    const [dismissedReviewMessageKeys, setDismissedReviewMessageKeys] = useState(() =>
        loadDismissedReviewMessageKeys()
    );

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

    function resetRequestChangeForm() {
        setRequestChangeType("");
        setRequestNewDate("");
        setRequestNewEffort("");
        setRequestReason("");
    }

    const isRequestFormValid = useMemo(() => {
        const hasReason = requestReason.trim().length > 0;
        if (!requestChangeType || !hasReason) return false;

        if (requestChangeType === "dueDateChange") {
            return Boolean(requestNewDate);
        }

        if (requestChangeType === "estimatedEffortChange") {
            return Boolean(String(requestNewEffort).trim());
        }

        return true;
    }, [requestChangeType, requestNewDate, requestNewEffort, requestReason]);

    const currentStatusNormalized = useMemo(
        () => normalizeStatus(task?.status),
        [task?.status]
    );

    const pendingRequestChange = useMemo(() => {
        if (!Array.isArray(task?.requestChanges)) return null;

        return (
            task.requestChanges.find(
                (request) => normalizeStatus(request?.requestStatus) === "pending"
            ) || null
        );
    }, [task?.requestChanges]);

    const latestReviewedRequestChange = useMemo(() => {
        if (!Array.isArray(task?.requestChanges)) return null;

        return (
            [...task.requestChanges]
                .filter((request) => {
                    const status = normalizeStatus(request?.requestStatus);
                    return status === "approved" || status === "rejected";
                })
                .sort((first, second) => {
                    const firstDate = new Date(
                        first?.reviewedAt || first?.ReviewedAt || first?.createdAt || first?.changedAt || 0
                    ).getTime();
                    const secondDate = new Date(
                        second?.reviewedAt || second?.ReviewedAt || second?.createdAt || second?.changedAt || 0
                    ).getTime();

                    return secondDate - firstDate;
                })[0] || null
        );
    }, [task?.requestChanges]);

    const latestReviewedRequestStatus = normalizeStatus(latestReviewedRequestChange?.requestStatus);

    const latestReviewedRequestMessageKey = useMemo(() => {
        if (!latestReviewedRequestChange) return "";

        const requestId = latestReviewedRequestChange?.id || latestReviewedRequestChange?.taskChangeRequestId || latestReviewedRequestChange?.TaskChangeRequestId || "";
        const status = normalizeStatus(latestReviewedRequestChange?.requestStatus);
        const reviewedAt = latestReviewedRequestChange?.reviewedAt || latestReviewedRequestChange?.ReviewedAt || "";
        const createdAt = latestReviewedRequestChange?.createdAt || latestReviewedRequestChange?.CreatedAt || "";

        return [taskId || "task", requestId, status, reviewedAt || createdAt].map(String).join(":");
    }, [latestReviewedRequestChange, taskId]);

    const isLatestReviewedRequestMessageDismissed = Boolean(
        latestReviewedRequestMessageKey && dismissedReviewMessageKeys.includes(latestReviewedRequestMessageKey)
    );

    const shouldShowLatestReviewedRequestMessage = Boolean(
        latestReviewedRequestMessageKey && latestReviewedRequestStatus && !isLatestReviewedRequestMessageDismissed
    );

    const dismissLatestReviewedRequestMessage = useCallback(() => {
        if (!latestReviewedRequestMessageKey) return;

        setDismissedReviewMessageKeys((previousKeys) => {
            const nextKeys = Array.from(new Set([...previousKeys, latestReviewedRequestMessageKey]));
            saveDismissedReviewMessageKeys(nextKeys);
            return nextKeys;
        });
    }, [latestReviewedRequestMessageKey]);

const latestReviewedRequestMessage = useMemo(() => {
    if (!latestReviewedRequestChange) return "";

    const status = normalizeStatus(latestReviewedRequestChange?.requestStatus);

    const typeLabel =
        latestReviewedRequestChange?.changeTypeLabel ||
        getRequestChangeTypeLabel(latestReviewedRequestChange?.changeType || "other");

    const taskTitle = task?.title || "this task";

    if (status === "approved") {
        return `The ${typeLabel.toLowerCase()} request for “${taskTitle}” was approved by your team leader.`;
    }

    if (status === "rejected") {
        return `The ${typeLabel.toLowerCase()} request for “${taskTitle}” was rejected by your team leader.`;
    }

    return "";
}, [latestReviewedRequestChange, task?.title]);

    const canRequestChange = currentStatusNormalized === "acknowledged" && !pendingRequestChange;

    const requestChangeAvailabilityMessage = useMemo(() => {
        if (pendingRequestChange) {
            return "A request change is pending and being processed by your team leader.";
        }

        return "";
    }, [pendingRequestChange]);

    const loadTaskDetails = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) {
                setIsLoading(true);
            }
            setErrorMessage("");

            const storedUser = getStoredEmployee();
            let rawTask = null;
            let historyItems = [];
            let availableStatuses = [];
            let changeRequests = [];

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

            const currentEmployeeId = Number(getStoredEmployeeId());
            const assignedUserId = getTaskAssignedUserId(rawTask);

            if (currentEmployeeId && assignedUserId && assignedUserId !== currentEmployeeId) {
                try {
                    sessionStorage.setItem(
                        DASHBOARD_UNASSIGNED_TASK_MESSAGE_KEY,
                        JSON.stringify({
                            taskId,
                            title: rawTask.title || rawTask.Title || "this task",
                            message:
                                "This task is no longer assigned to you, so it was removed from your dashboard.",
                            createdAt: new Date().toISOString(),
                        })
                    );
                } catch {
                    // Session storage is optional. Navigation should still continue.
                }

                navigate("/employee", { replace: true });
                return;
            }


            if (storedUser?.companyId) {
                const [historyResponse, statusesResponse, requestChangesResponse] = await Promise.all([
                    fetch(`${API_BASE}/api/tasks/${taskId}/history`, { cache: "no-store" }),
                    fetch(`${API_BASE}/api/tasks/statuses/${storedUser.companyId}`, { cache: "no-store" }),
                    fetch(`${API_BASE}/api/tasks/${taskId}/change-requests`, { cache: "no-store" }),
                ]);

                const historyData = await parseJsonResponse(historyResponse);
                const statusesData = await parseJsonResponse(statusesResponse);
                const requestChangesData = await parseJsonResponse(requestChangesResponse);

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

                if (requestChangesResponse.ok && requestChangesData.success !== false) {
                    changeRequests = Array.isArray(requestChangesData.data)
                        ? requestChangesData.data
                        : Array.isArray(requestChangesData.requests)
                            ? requestChangesData.requests
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

            const requestChangeEntries = changeRequests.map((item, index) => ({
                id: item.taskChangeRequestId || item.TaskChangeRequestId || `request-change-${index}`,
                changeType: item.changeType || item.ChangeType || "other",
                changeTypeLabel: getRequestChangeTypeLabel(item.changeType || item.ChangeType || "other"),
                oldValue: item.oldValue || item.OldValue || "",
                newValue: item.newValue || item.NewValue || "",
                reason: item.reason || item.Reason || "",
                requestStatus: item.requestStatus || item.RequestStatus || "Pending",
                reviewedAt: item.reviewedAt || item.ReviewedAt || "",
                reviewNote: item.reviewNote || item.ReviewNote || "",
                reviewedByName: item.reviewedByName || item.ReviewedByName || "",
                createdAt: item.createdAt || item.CreatedAt || "",
                changedAt: item.createdAt || item.CreatedAt || "",
                changedAtLabel: formatDateTime(item.createdAt || item.CreatedAt || ""),
                changedByName: resolveChangedByName(item),
                changedByProfileImage: getProfileImage(item),
                message: item.reason || item.Reason || "",
            }));

            const pureFeedbackEntries = feedbackEntries;

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
                    !getTaskAssignedUserId(rawTask) &&
                    (rawTask.formerAssignedUserName || rawTask.FormerAssignedUserName)
                        ? `${rawTask.formerAssignedUserName || rawTask.FormerAssignedUserName} (deleted user)`
                        : rawTask.assignedToName ||
                          rawTask.AssignedToName ||
                          rawTask.assignedUserName ||
                          rawTask.employeeName ||
                          "Assigned user",
                assignedToEmail:
                    !getTaskAssignedUserId(rawTask) &&
                    (rawTask.formerAssignedUserEmail || rawTask.FormerAssignedUserEmail)
                        ? rawTask.formerAssignedUserEmail || rawTask.FormerAssignedUserEmail
                        : rawTask.assignedToEmail ||
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
    }, [taskId, navigate]);

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

    useEffect(() => {
        const reassignmentCheckInterval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                loadTaskDetails({ silent: true });
            }
        }, 5000);

        return () => window.clearInterval(reassignmentCheckInterval);
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
            const isRejectedReassignmentToPending =
                feedbackValue &&
                (oldNormalized === "done" || oldNormalized === "completed") &&
                newNormalized === "pending";

            return {
                id:
                    item.taskStatusHistoryId ||
                    item.TaskStatusHistoryId ||
                    `history-item-${index}`,
                type: hasStatusChanged ? "status" : "feedback",
                hasStatusChanged,
                isRejectedReassignmentToPending,
                title: isRejectedReassignmentToPending
                    ? "Task rejected and reassigned to Pending."
                    : hasStatusChanged
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

        const requestEntries = (task.requestChanges || []).map((item, index) => {
            const requestStatus = item.requestStatus || "Pending";
            const normalizedRequestStatus = normalizeStatus(requestStatus);
            const reviewedAt = item.reviewedAt || item.ReviewedAt || "";
            const createdAt = item.createdAt || item.changedAt || "";
            const timelineDate = reviewedAt || createdAt;
            const requestTypeLabel =
                item.changeTypeLabel || getRequestChangeTypeLabel(item.changeType || "other");

            return {
                id: item.id || `timeline-request-${index}`,
                type: "request",
                hasStatusChanged: false,
                isRequestChange: true,
                title:
                    normalizedRequestStatus === "approved"
                        ? "Change request approved"
                        : normalizedRequestStatus === "rejected"
                            ? "Change request rejected"
                            : "Change request made",
                createdAt: timelineDate,
                changedAtLabel: formatDateTime(timelineDate),
                changedByName:
                    normalizedRequestStatus === "approved" || normalizedRequestStatus === "rejected"
                        ? item.reviewedByName || item.changedByName || "Team leader"
                        : item.changedByName || "",
                changedByProfileImage: item.changedByProfileImage || "",
                requestTypeLabel,
                requestStatus,
                normalizedRequestStatus,
                reviewNote: item.reviewNote || "",
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

        return [...historyEntries, ...requestEntries, ...fallbackStatusEvent].sort(
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
                : feedbackHistoryEntries.slice(0, 5),
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

    async function handleConfirmedStatusUpdate() {
        if (!task) return;

        const changedByUserId = getStoredEmployeeId();
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
            setShowStatusConfirmModal(false);

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
                                changedByName: getStoredEmployeeName() || "",
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
                                changedByName: getStoredEmployeeName() || "",
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

        if (!canRequestChange) {
            showToast(
                requestChangeAvailabilityMessage || "Request changes are not available for this task right now.",
                "error"
            );
            return;
        }

        if (!task || !requestChangeType || !requestReason.trim()) {
            showToast("Please select a change type and add the reason of change.", "error");
            return;
        }

        if (requestChangeType === "dueDateChange" && !requestNewDate) {
            showToast("Please choose the new due date.", "error");
            return;
        }

        if (requestChangeType === "estimatedEffortChange" && !String(requestNewEffort).trim()) {
            showToast("Please enter the new estimated effort.", "error");
            return;
        }

        const requestedByUserId = getStoredEmployeeId();
        const createdAt = new Date().toISOString();
        const previousTask = task;

        if (!requestedByUserId || !task.taskStatusId) {
            const message = "Unable to submit request change.";
            setErrorMessage(message);
            showToast(message, "error");
            return;
        }

        let oldValue = null;
        let newValue = null;

        if (requestChangeType === "dueDateChange") {
            oldValue = formatDate(task.dueDate);
            newValue = formatDate(requestNewDate);
        } else if (requestChangeType === "estimatedEffortChange") {
            oldValue = `${task.effort} h`;
            newValue = `${requestNewEffort} h`;
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
                                changeType: requestChangeType,
                                changeTypeLabel: getRequestChangeTypeLabel(requestChangeType),
                                oldValue,
                                newValue,
                                reason: requestReason.trim(),
                                requestStatus: "Pending",
                                createdAt,
                                changedAt: createdAt,
                                changedAtLabel: formatDateTime(createdAt),
                                changedByName: getStoredEmployeeName() || "",
                                changedByProfileImage: "",
                            },
                            ...(prev.requestChanges || []),
                        ],
                    }
                    : prev
            );

            const response = await fetch(`${API_BASE}/api/tasks/${task.taskId}/change-requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    taskId: Number(task.taskId),
                    requestedByUserId: Number(requestedByUserId),
                    changeType: requestChangeType,
                    oldValue,
                    newValue,
                    reason: requestReason.trim(),
                }),
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Failed to submit request change.");
            }

            resetRequestChangeForm();
            setShowRequestModal(false);
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
    const nextStatusData = getNextStatusData(task);
    const nextStatusLabel = nextStatusData
        ? mapStatusLabel(nextStatusData.statusName || nextStatusData.StatusName || getNextStatus(task.status))
        : getNextStatus(task.status);

    return (
        <div className="employee-task-details-page">
            {toast.show ? (
                <div
                    className={`employee-task-details-page__toast employee-task-details-page__toast--${toast.type}`}
                >
                    {toast.message}
                </div>
            ) : null}

            {showRequestModal && canRequestChange ? (
                <div
                    className="employee-task-details-page__modal-overlay"
                    onClick={() => {
                        if (!isSubmittingRequest) {
                            resetRequestChangeForm();
                            setShowRequestModal(false);
                        }
                    }}
                >
                    <div
                        className="employee-task-details-page__modal employee-task-details-page__modal--request"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="employee-task-details-page__modal-header">
                            <div className="employee-task-details-page__modal-title-wrap">
                                <div className="employee-task-details-page__modal-icon">
                                    <FiMessageCircle />
                                </div>
                                <div>
                                    <h3>Request Change</h3>
                                    <p>
                                        Let the team leader know what change you are requesting for this task.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="employee-task-details-page__modal-close"
                                onClick={() => {
                                    if (!isSubmittingRequest) {
                                        resetRequestChangeForm();
                                        setShowRequestModal(false);
                                    }
                                }}
                                aria-label="Close request change form"
                            >
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={handleRequestChangeSubmit}>
                            <div className="employee-task-details-page__modal-body">
                                <div className="employee-task-details-page__request-field">
                                    <label>
                                        Change Type <span>*</span>
                                    </label>

                                    <div className="employee-task-details-page__change-type-grid">
                                        {REQUEST_CHANGE_OPTIONS.map((option) => {
                                            const IconComponent = option.icon;
                                            const isActive = requestChangeType === option.value;

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={`employee-task-details-page__change-type-card ${isActive
                                                            ? "employee-task-details-page__change-type-card--active"
                                                            : ""
                                                        }`}
                                                    onClick={() => {
                                                        setRequestChangeType(option.value);
                                                        setRequestNewDate("");
                                                        setRequestNewEffort("");
                                                    }}
                                                >
                                                    <span
                                                        className={`employee-task-details-page__change-type-icon ${option.iconClass}`}
                                                    >
                                                        <IconComponent />
                                                    </span>

                                                    <span className="employee-task-details-page__change-type-card-label">
                                                        {option.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {requestChangeType === "dueDateChange" ? (
                                    <div className="employee-task-details-page__request-values-grid">
                                        <div className="employee-task-details-page__request-field">
                                            <label>Original Due Date</label>
                                            <input
                                                type="text"
                                                value={formatDate(task.dueDate)}
                                                readOnly
                                                className="employee-task-details-page__request-readonly"
                                            />
                                        </div>

                                        <div className="employee-task-details-page__request-field">
                                            <label htmlFor="requestNewDate">New Due Date</label>
                                            <input
                                                id="requestNewDate"
                                                type="date"
                                                value={requestNewDate}
                                                min={formatDateForInput(new Date())}
                                                onChange={(event) => setRequestNewDate(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                {requestChangeType === "estimatedEffortChange" ? (
                                    <div className="employee-task-details-page__request-values-grid">
                                        <div className="employee-task-details-page__request-field">
                                            <label>Original Estimated Effort</label>
                                            <input
                                                type="text"
                                                value={`${task.effort} h`}
                                                readOnly
                                                className="employee-task-details-page__request-readonly"
                                            />
                                        </div>

                                        <div className="employee-task-details-page__request-field">
                                            <label htmlFor="requestNewEffort">New Estimated Effort</label>
                                            <input
                                                id="requestNewEffort"
                                                type="number"
                                                min="1"
                                                step="1"
                                                placeholder="Enter new effort in hours"
                                                value={requestNewEffort}
                                                onChange={(event) => setRequestNewEffort(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                <div className="employee-task-details-page__request-field">
                                    <label htmlFor="requestReason">
                                        Reason for Change <span>*</span>
                                    </label>
                                    <textarea
                                        id="requestReason"
                                        value={requestReason}
                                        onChange={(event) => setRequestReason(event.target.value.slice(0, 500))}
                                        placeholder="Explain what needs to be changed and why..."
                                    />
                                    <div className="employee-task-details-page__request-counter">
                                        {requestReason.length}/500
                                    </div>
                                </div>
                            </div>

                            <div className="employee-task-details-page__modal-footer">
                                <button
                                    type="button"
                                    className="employee-task-details-page__request-cancel"
                                    onClick={() => {
                                        if (!isSubmittingRequest) {
                                            resetRequestChangeForm();
                                            setShowRequestModal(false);
                                        }
                                    }}
                                    disabled={isSubmittingRequest}
                                >
                                    <FiX />
                                    <span>Cancel</span>
                                </button>

                                <button
                                    type="submit"
                                    className="employee-task-details-page__request-submit"
                                    disabled={isSubmittingRequest || !isRequestFormValid}
                                >
                                    <FiSend />
                                    <span>{isSubmittingRequest ? "Sending..." : "Send Request"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {showStatusConfirmModal ? (
                <div
                    className="employee-task-details-page__modal-overlay"
                    onClick={() => {
                        if (!isUpdatingStatus) {
                            setShowStatusConfirmModal(false);
                        }
                    }}
                >
                    <div
                        className="employee-task-details-page__modal employee-task-details-page__modal--confirm"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="employee-task-details-page__confirm-icon">
                            <FiCheckCircle />
                        </div>

                        <h3>Confirm Status Change</h3>
                        <p>
                            Are you sure you want to change this task status to <strong>{nextStatusLabel}</strong>?
                        </p>

                        <div className="employee-task-details-page__confirm-actions">
                            <button
                                type="button"
                                className="employee-task-details-page__request-cancel"
                                onClick={() => setShowStatusConfirmModal(false)}
                                disabled={isUpdatingStatus}
                            >
                                <FiX />
                                <span>Cancel</span>
                            </button>

                            <button
                                type="button"
                                className="employee-task-details-page__status-btn"
                                onClick={handleConfirmedStatusUpdate}
                                disabled={isUpdatingStatus}
                            >
                                {isUpdatingStatus ? "Updating..." : "Confirm"}
                            </button>
                        </div>
                    </div>
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
                {latestReviewedRequestMessage && shouldShowLatestReviewedRequestMessage ? (
                    <div
                        className={`employee-task-details-page__request-review-message employee-task-details-page__request-review-message--${latestReviewedRequestStatus}`}
                        role="status"
                    >
                        <span className="employee-task-details-page__request-review-icon">
                            {latestReviewedRequestStatus === "approved" ? <FiCheckCircle /> : <FiAlertTriangle />}
                        </span>
                        <span className="employee-task-details-page__request-review-copy">
                            {latestReviewedRequestMessage}
                        </span>
                        <button
                            type="button"
                            className="employee-task-details-page__request-review-dismiss"
                            onClick={dismissLatestReviewedRequestMessage}
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}

                {canRequestChange ? (
                    <button
                        type="button"
                        className="employee-task-details-page__request-btn"
                        onClick={() => setShowRequestModal(true)}
                        disabled={isSubmittingRequest}
                    >
                        <FiMessageCircle />
                        <span>Request Change</span>
                    </button>
                ) : requestChangeAvailabilityMessage ? (
                    <div className="employee-task-details-page__request-unavailable" role="status">
                        <FiMessageCircle />
                        <span>{requestChangeAvailabilityMessage}</span>
                    </div>
                ) : null}

                <button
                    type="button"
                    className="employee-task-details-page__status-btn"
                    onClick={() => setShowStatusConfirmModal(true)}
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
                                <span>Start Date</span>
                            </div>
                            <strong>{formatDate(task.startDate)}</strong>
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
                                                    className={`employee-task-details-page__timeline-marker ${item.type === "status"
                                                            ? "employee-task-details-page__timeline-marker--status"
                                                            : item.type === "request"
                                                                ? "employee-task-details-page__timeline-marker--request"
                                                                : "employee-task-details-page__timeline-marker--feedback"
                                                        }`}
                                                />

                                                <div className="employee-task-details-page__timeline-content">
                                                    <div className="employee-task-details-page__timeline-heading">
                                                        {item.type === "status" ? (
                                                            item.isRejectedReassignmentToPending ? (
                                                                <>
<span>Task rejected and reassigned to </span>
<span className={getStatusClass(item.newStatusName)}>
  {mapStatusLabel(item.newStatusName)}
</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>Status changed to </span>
                                                                    <span className={getStatusClass(item.newStatusName)}>
                                                                        {mapStatusLabel(item.newStatusName)}
                                                                    </span>
                                                                </>
                                                            )
                                                        ) : item.type === "request" ? (
                                                            item.title || "Change request made"
                                                        ) : (
                                                            "Feedback added"
                                                        )}
                                                    </div>

                                                    <div className="employee-task-details-page__timeline-meta">
                                                        {item.changedByName ? `By ${item.changedByName} • ` : ""}
                                                        {item.changedAtLabel}
                                                    </div>

                                                    {item.type === "request" ? (
                                                        <div className="employee-task-details-page__timeline-request-note">
                                                            <div>
                                                                <strong>Type:</strong> {item.requestTypeLabel}
                                                            </div>
                                                            {item.reviewNote ? (
                                                                <div>
                                                                    <strong>Review note:</strong> {item.reviewNote}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ) : item.feedbackText ? (
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

                                {feedbackHistoryEntries.length > 4 ? (
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