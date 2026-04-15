import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../assets/styles/teamleader/tasks-section.css";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

const API_BASE = "http://localhost:5000";

const DEFAULT_FORM = {
  title: "",
  description: "",
  assignedUserId: "",
  priority: "",
  complexity: "",
  estimatedEffortHours: "",
  startDate: "",
  dueDate: "",
};

const DEFAULT_RANGE = {
  from: undefined,
  to: undefined,
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getInitials = (fullName = "") => {
  const parts = fullName.trim().split(" ").filter(Boolean);

  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB");
};

const formatHours = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}h`;
};

const normalizeStatus = (status = "") => {
  const safe = String(status).trim().toLowerCase();

  if (["new", "todo", "to do"].includes(safe)) return "todo";
  if (["inprogress", "in progress"].includes(safe)) return "inprogress";
  if (safe === "blocked") return "blocked";
  if (safe === "done") return "done";

  return safe || "unknown";
};

const prettifyLabel = (value = "") =>
  String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClass = (status = "") => {
  const normalized = normalizeStatus(status);

  if (normalized === "inprogress") return "tasks-section__status--progress";
  if (normalized === "blocked") return "tasks-section__status--blocked";
  if (normalized === "done") return "tasks-section__status--done";

  return "tasks-section__status--todo";
};

const getPriorityClass = (priority = "") => {
  const safe = String(priority).toLowerCase();

  if (safe === "critical") return "tasks-section__badge--critical";
  if (safe === "high") return "tasks-section__badge--high";
  if (safe === "medium") return "tasks-section__badge--medium";

  return "tasks-section__badge--low";
};

const getComplexityClass = (complexity = "") => {
  const safe = String(complexity).toLowerCase();

  if (safe === "complex") return "tasks-section__badge--complex";
  if (safe === "medium") return "tasks-section__badge--medium-complexity";

  return "tasks-section__badge--simple";
};

const getResponseData = (payload) => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }

  return payload;
};

const getProfileImage = (user = {}) => {
  const rawValue =
    user.profileImageUrl ||
    user.ProfileImageUrl ||
    user.imageUrl ||
    user.ImageUrl ||
    "";

  const value = String(rawValue || "").trim();

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE}${value}`;
  }

  return `${API_BASE}/${value}`;
};

const mapTaskFromApi = (task) => ({
  id: task.id ?? task.taskId ?? task.TaskId ?? crypto.randomUUID(),
  title: task.title ?? task.Title ?? "",
  description: task.description ?? task.Description ?? "",
  assignedUserId:
    task.assignedUserId ??
    task.assignedToUserId ??
    task.AssignedToUserId ??
    "",
  assignedUserName:
    task.assignedUserName ??
    task.assignedToUserName ??
    task.assignedEmployeeName ??
    task.fullName ??
    task.FullName ??
    "",
  assignedUserEmail:
    task.assignedUserEmail ??
    task.assignedToUserEmail ??
    task.assignedEmployeeEmail ??
    task.email ??
    task.Email ??
    "",
  assignedUserAvatar:
    task.assignedUserAvatar ??
    task.profileImageUrl ??
    task.ProfileImageUrl ??
    "",
  priority: task.priority ?? task.Priority ?? "Low",
  complexity: task.complexity ?? task.Complexity ?? "Simple",
  estimatedEffortHours:
    task.estimatedEffortHours ??
    task.effort ??
    task.effortHours ??
    task.EstimatedEffortHours ??
    0,
  weight: task.weight ?? task.Weight ?? 0,
  status:
    task.status ??
    task.taskStatusName ??
    task.TaskStatusName ??
    "New",
  startDate: task.startDate ?? task.StartDate ?? "",
  dueDate: task.dueDate ?? task.DueDate ?? "",
  teamId: task.teamId ?? task.TeamId ?? "",
  isAcknowledged:
    task.isAcknowledged ??
    task.IsAcknowledged ??
    task.acknowledged ??
    task.Acknowledged ??
    task.hasAcknowledged ??
    task.HasAcknowledged ??
    false,
});

const getEffectiveTaskStatus = (task) => {
  const rawStatus = String(task?.status || "").trim();
  const normalizedRawStatus = normalizeStatus(rawStatus);

  if (normalizedRawStatus === "pending" && !task?.isAcknowledged) {
    return "New";
  }

  return rawStatus || "New";
};

export default function TasksSection({
  companyId,
  tasksEndpoint,
  createTaskEndpoint,
  updateTaskStatusEndpoint,
  setupRulesEndpoint,
  statusesEndpoint,
  membersEndpoint,
  pageSize = 5,
}) {
  const storedUser = getStoredUser();

  const resolvedCompanyId = companyId ?? storedUser?.companyId ?? null;
  const resolvedCurrentUserId = storedUser?.userId ?? null;

  const resolvedTasksEndpoint =
    tasksEndpoint ?? `${API_BASE}/api/tasks/company/${resolvedCompanyId}`;

  const resolvedCreateTaskEndpoint =
    createTaskEndpoint ?? `${API_BASE}/api/tasks/create`;

  const resolvedUpdateTaskStatusEndpoint =
    updateTaskStatusEndpoint ?? `${API_BASE}/api/tasks/update-status`;

  const resolvedSetupRulesEndpoint =
    setupRulesEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/tasks/setup-rules/${resolvedCompanyId}`
      : "");

  const resolvedStatusesEndpoint =
    statusesEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/tasks/statuses/${resolvedCompanyId}`
      : "");

  const resolvedMembersEndpoint =
    membersEndpoint ??
    (resolvedCompanyId
      ? `${API_BASE}/api/Teams/company/${resolvedCompanyId}/members`
      : "");

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);
  const [priorityMultipliers, setPriorityMultipliers] = useState({});
  const [complexityMultipliers, setComplexityMultipliers] = useState({});
  const [statusTabs, setStatusTabs] = useState([{ key: "all", label: "All" }]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(DEFAULT_RANGE);
  const [draftRange, setDraftRange] = useState(DEFAULT_RANGE);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormState, setEditFormState] = useState(null);
  const [isEditAssigneeOpen, setIsEditAssigneeOpen] = useState(false);
  const [isEditTaskInfoOpen, setIsEditTaskInfoOpen] = useState(false);
  const [editMemberSearch, setEditMemberSearch] = useState("");
  const [editTaskDraft, setEditTaskDraft] = useState({ title: "", description: "" });

  const datePickerRef = useRef(null);
  const editRowRef = useRef(null);
  const editTaskInfoModalRef = useRef(null);
  const editAssigneeModalRef = useRef(null);

  const capitalizeWords = (value = "") =>
    value.replace(/\b\w/g, (char) => char.toUpperCase());
  useEffect(() => {
    if (!editingTaskId) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;

      if (editRowRef.current?.contains(target)) return;
      if (editTaskInfoModalRef.current?.contains(target)) return;
      if (editAssigneeModalRef.current?.contains(target)) return;

      cancelEditMode();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [editingTaskId]);


  useEffect(() => {
    let isMounted = true;

    const fetchJson = async (url) => {
      if (!url) return null;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed for ${url}`);
      }

      return response.json();
    };

    const loadData = async () => {
      if (!resolvedCompanyId) {
        setErrorMessage("Company information is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [tasksPayload, setupRulesPayload, statusesPayload, membersPayload] =
          await Promise.all([
            fetchJson(resolvedTasksEndpoint).catch(() => []),
            fetchJson(resolvedSetupRulesEndpoint).catch(() => null),
            fetchJson(resolvedStatusesEndpoint).catch(() => null),
            fetchJson(resolvedMembersEndpoint).catch(() => []),
          ]);

        if (!isMounted) return;

        const tasksData = getResponseData(tasksPayload);
        const setupRulesData = getResponseData(setupRulesPayload);
        const statusesData = getResponseData(statusesPayload);
        const membersData = getResponseData(membersPayload);

        const normalizedTasks = Array.isArray(tasksData)
          ? tasksData.map(mapTaskFromApi)
          : Array.isArray(tasksData?.tasks)
          ? tasksData.tasks.map(mapTaskFromApi)
          : Array.isArray(tasksData?.items)
          ? tasksData.items.map(mapTaskFromApi)
          : [];

        setTasks(normalizedTasks);

        const mappedPriorityMultipliers =
          setupRulesData?.priorityMultipliers &&
          typeof setupRulesData.priorityMultipliers === "object"
            ? setupRulesData.priorityMultipliers
            : {};

        const mappedComplexityMultipliers =
          setupRulesData?.complexityMultipliers &&
          typeof setupRulesData.complexityMultipliers === "object"
            ? setupRulesData.complexityMultipliers
            : {};

        setPriorityMultipliers(mappedPriorityMultipliers);
        setComplexityMultipliers(mappedComplexityMultipliers);
        setPriorityOptions(Object.keys(mappedPriorityMultipliers));
        setComplexityOptions(Object.keys(mappedComplexityMultipliers));

        const members = Array.isArray(membersData)
          ? membersData
          : Array.isArray(membersData?.items)
          ? membersData.items
          : [];

        setUsers(members);

        const backendStatuses = Array.isArray(statusesData?.statuses)
          ? statusesData.statuses
          : Array.isArray(setupRulesData?.statuses)
          ? setupRulesData.statuses
          : [];

        const tabs = backendStatuses
          .map((item) => {
            const raw =
              typeof item === "string"
                ? item
                : item?.statusName ??
                  item?.StatusName ??
                  item?.name ??
                  item?.value ??
                  "";

            if (!raw) return null;

            return {
              key: normalizeStatus(raw),
              label: prettifyLabel(raw),
            };
          })
          .filter(Boolean)
          .filter(
            (tab, index, array) =>
              array.findIndex((entry) => entry.key === tab.key) === index
          );

        setStatusTabs([{ key: "all", label: "All" }, ...tabs]);
      } catch {
        if (!isMounted) return;
        setErrorMessage("Unable to load tasks right now.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [
    resolvedCompanyId,
    resolvedTasksEndpoint,
    resolvedSetupRulesEndpoint,
    resolvedStatusesEndpoint,
    resolvedMembersEndpoint,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const syncDraftWithAppliedRange = () => {
    setDraftRange({
      from: selectedRange?.from || undefined,
      to: selectedRange?.to || undefined,
    });
  };

  const openDatePicker = () => {
    syncDraftWithAppliedRange();
    setIsDatePickerOpen(true);
  };

  const closeDatePicker = () => {
    syncDraftWithAppliedRange();
    setIsDatePickerOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        closeDatePicker();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedRange]);

  useEffect(() => {
    if (formState.startDate && formState.dueDate) {
      const from = new Date(formState.startDate);
      const to = new Date(formState.dueDate);

      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        setSelectedRange({ from, to });
        return;
      }
    }

    setSelectedRange(DEFAULT_RANGE);
  }, [formState.startDate, formState.dueDate]);

  const assignableUsers = useMemo(() => {
    const filteredByRole = users.filter((user) => {
      const role = String(user.role || "").trim().toLowerCase();
      return role !== "team leader";
    });

    const source = filteredByRole.length ? filteredByRole : users;
    const query = memberSearch.trim().toLowerCase();

    if (!query) return source;

    return source.filter((user) => {
      const fullName = String(user.fullName ?? user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      const role = String(user.role ?? "").toLowerCase();
      const jobTitle = String(user.jobTitle ?? "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        jobTitle.includes(query)
      );
    });
  }, [users, memberSearch]);

  const selectedUser = useMemo(
    () =>
      users.find(
        (user) =>
          String(user.userId ?? user.id) === String(formState.assignedUserId)
      ) || null,
    [users, formState.assignedUserId]
  );

  const selectedUserTeamId = useMemo(() => {
    if (!selectedUser) return 0;

    const directTeamId =
      selectedUser.teamId ??
      selectedUser.TeamId ??
      selectedUser.team?.teamId ??
      selectedUser.team?.TeamId;

    if (directTeamId) {
      return Number(directTeamId);
    }

    const teamIds = selectedUser.teamIds ?? selectedUser.TeamIds;
    if (Array.isArray(teamIds) && teamIds.length > 0) {
      return Number(teamIds[0]);
    }

    return 76;
  }, [selectedUser]);

  const editingSelectedUser = useMemo(
    () =>
      users.find(
        (user) =>
          String(user.userId ?? user.id) === String(editFormState?.assignedUserId ?? "")
      ) || null,
    [users, editFormState]
  );

  const filteredEditAssignableUsers = useMemo(() => {
    const filteredByRole = users.filter((user) => {
      const role = String(user.role || "").trim().toLowerCase();
      return role !== "team leader";
    });

    const source = filteredByRole.length ? filteredByRole : users;
    const query = editMemberSearch.trim().toLowerCase();

    if (!query) return source;

    return source.filter((user) => {
      const fullName = String(user.fullName ?? user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      const role = String(user.role ?? "").toLowerCase();
      const jobTitle = String(user.jobTitle ?? "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        jobTitle.includes(query)
      );
    });
  }, [users, editMemberSearch]);

  const tasksWithUsers = useMemo(() => {
    return tasks.map((task) => {
      const matchedUser = users.find(
        (user) =>
          String(user.userId ?? user.id) === String(task.assignedUserId)
      );

      const fallbackName =
        matchedUser?.fullName ??
        matchedUser?.name ??
        "Unknown User";

      const fallbackEmail = matchedUser?.email ?? "";
      const fallbackAvatar = getProfileImage(matchedUser || {});

      const rawName = String(task.assignedUserName || "").trim();
      const resolvedName =
        !rawName || rawName.toLowerCase() === "unknown user"
          ? fallbackName
          : rawName;

      const effectiveStatus = getEffectiveTaskStatus(task);

      return {
        ...task,
        assignedUserName: resolvedName,
        assignedUserEmail: task.assignedUserEmail || fallbackEmail,
        assignedUserAvatar: task.assignedUserAvatar || fallbackAvatar,
        effectiveStatus,
      };
    });
  }, [tasks, users]);

  const taskCounts = useMemo(() => {
    const counts = { all: tasksWithUsers.length };

    tasksWithUsers.forEach((task) => {
      const key = normalizeStatus(task.effectiveStatus);
      counts[key] = (counts[key] ?? 0) + 1;
    });

    return counts;
  }, [tasksWithUsers]);

  const filteredTasks = useMemo(() => {
    return tasksWithUsers.filter((task) => {
      const statusKey = normalizeStatus(task.effectiveStatus);
      return activeTab === "all" ? true : statusKey === activeTab;
    });
  }, [tasksWithUsers, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  const computedTaskWeight = useMemo(() => {
    const baseEffort = Number(formState.estimatedEffortHours);
    const priorityMultiplier = Number(priorityMultipliers[formState.priority] ?? 0);
    const complexityMultiplier = Number(
      complexityMultipliers[formState.complexity] ?? 0
    );

    if (!baseEffort || !priorityMultiplier || !complexityMultiplier) {
      return "";
    }

    return (baseEffort * priorityMultiplier * complexityMultiplier).toFixed(2);
  }, [
    formState.estimatedEffortHours,
    formState.priority,
    formState.complexity,
    priorityMultipliers,
    complexityMultipliers,
  ]);

  const isStepOneValid =
    formState.title.trim() !== "" &&
    formState.description.trim() !== "" &&
    formState.assignedUserId !== "";

  const isCreateDisabled =
    isSubmitting ||
    !isStepOneValid ||
    !formState.priority ||
    !formState.complexity ||
    !formState.estimatedEffortHours ||
    !formState.startDate ||
    !formState.dueDate ||
    !computedTaskWeight;

  const computedEditTaskWeight = useMemo(() => {
    const baseEffort = Number(editFormState?.estimatedEffortHours);
    const priorityMultiplier = Number(
      priorityMultipliers[editFormState?.priority] ?? 0
    );
    const complexityMultiplier = Number(
      complexityMultipliers[editFormState?.complexity] ?? 0
    );

    if (!baseEffort || !priorityMultiplier || !complexityMultiplier) {
      return "";
    }

    return (baseEffort * priorityMultiplier * complexityMultiplier).toFixed(2);
  }, [
    editFormState,
    priorityMultipliers,
    complexityMultipliers,
  ]);

  const formattedRangeLabel =
    selectedRange?.from && selectedRange?.to
      ? `${format(selectedRange.from, "dd/MM/yyyy")} - ${format(
          selectedRange.to,
          "dd/MM/yyyy"
        )}`
      : "Select date range";

  const openCreateModal = () => {
    setFormState(DEFAULT_FORM);
    setCreateStep(1);
    setMemberSearch("");
    setSelectedRange(DEFAULT_RANGE);
    setDraftRange(DEFAULT_RANGE);
    setIsDatePickerOpen(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateStep(1);
    setMemberSearch("");
    setSelectedRange(DEFAULT_RANGE);
    setDraftRange(DEFAULT_RANGE);
    setIsDatePickerOpen(false);
    setFormState(DEFAULT_FORM);
  };

  const applyDateRange = () => {
    if (!draftRange?.from || !draftRange?.to) return;

    setSelectedRange({
      from: draftRange.from,
      to: draftRange.to,
    });

    setFormState((previous) => ({
      ...previous,
      startDate: format(draftRange.from, "yyyy-MM-dd"),
      dueDate: format(draftRange.to, "yyyy-MM-dd"),
    }));

    setIsDatePickerOpen(false);
  };

  const createTask = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        companyId: Number(resolvedCompanyId),
        teamId: selectedUserTeamId,
        title: formState.title.trim(),
        description: formState.description.trim(),
        assignedToUserId: Number(formState.assignedUserId),
        createdByUserId: Number(resolvedCurrentUserId),
        priority: formState.priority,
        complexity: formState.complexity,
        estimatedEffortHours: Number(formState.estimatedEffortHours),
        startDate: formState.startDate,
        dueDate: formState.dueDate,
      };

      const response = await fetch(resolvedCreateTaskEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create task.");
      }

      await response.json().catch(() => null);

      const refreshResponse = await fetch(resolvedTasksEndpoint);
      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh tasks.");
      }

      const refreshPayload = await refreshResponse.json();
      const refreshData = getResponseData(refreshPayload);

      const refreshedTasks = Array.isArray(refreshData)
        ? refreshData.map(mapTaskFromApi)
        : Array.isArray(refreshData?.tasks)
        ? refreshData.tasks.map(mapTaskFromApi)
        : Array.isArray(refreshData?.items)
        ? refreshData.items.map(mapTaskFromApi)
        : [];

      setTasks(refreshedTasks);

      closeCreateModal();
      setFeedback({
        type: "success",
        message: "Task created successfully.",
      });
      setActiveTab("all");
      setCurrentPage(1);
    } catch {
      setFeedback({
        type: "error",
        message: "Unable to create task.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteTask = () => {
    if (!deleteTaskId) return;

    setTasks((current) => current.filter((task) => task.id !== deleteTaskId));
    setDeleteTaskId(null);
    setFeedback({
      type: "success",
      message: "Task removed from the list.",
    });
  };

  const handleFormChange = (field, value) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleEditFormChange = (field, value) => {
    setEditFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openEditMode = (task) => {
    setEditingTaskId(task.id);
    setEditMemberSearch("");
    setEditFormState({
      id: task.id,
      title: task.title || "",
      description: task.description || "",
      assignedUserId: String(task.assignedUserId ?? ""),
      priority: task.priority || "",
      complexity: task.complexity || "",
      estimatedEffortHours:
        task.estimatedEffortHours === null || task.estimatedEffortHours === undefined
          ? ""
          : String(task.estimatedEffortHours),
    });
  };

  const cancelEditMode = () => {
    setEditingTaskId(null);
    setEditFormState(null);
    setIsEditAssigneeOpen(false);
    setIsEditTaskInfoOpen(false);
    setEditMemberSearch("");
    setEditTaskDraft({ title: "", description: "" });
  };

  const openEditTaskInfoModal = () => {
    if (!editFormState) return;
    setEditTaskDraft({
      title: editFormState.title || "",
      description: editFormState.description || "",
    });
    setIsEditTaskInfoOpen(true);
  };

  const applyEditTaskInfo = () => {
    handleEditFormChange("title", capitalizeWords(editTaskDraft.title));
    handleEditFormChange("description", capitalizeWords(editTaskDraft.description));
    setIsEditTaskInfoOpen(false);
  };

  const saveTaskChanges = () => {
    if (!editingTaskId || !editFormState) return;

    setTasks((current) =>
      current.map((task) => {
        if (task.id !== editingTaskId) return task;

        const matchedUser = users.find(
          (user) =>
            String(user.userId ?? user.id) === String(editFormState.assignedUserId)
        );

        return {
          ...task,
          title: editFormState.title.trim(),
          description: editFormState.description.trim(),
          assignedUserId: editFormState.assignedUserId,
          assignedUserName: matchedUser?.fullName ?? matchedUser?.name ?? task.assignedUserName,
          assignedUserEmail: matchedUser?.email ?? task.assignedUserEmail,
          assignedUserAvatar: getProfileImage(matchedUser || {}) || task.assignedUserAvatar,
          priority: editFormState.priority,
          complexity: editFormState.complexity,
          estimatedEffortHours: Number(editFormState.estimatedEffortHours),
          weight: computedEditTaskWeight || task.weight,
        };
      })
    );

    setFeedback({
      type: "success",
      message: "Task updated successfully.",
    });

    cancelEditMode();
  };

  const startIndex = filteredTasks.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredTasks.length);

  return (
    <section className="tasks-section">
      <div className="tasks-section__title-row">
        <h2>Tasks</h2>
        <div className="tasks-section__title-line" />
      </div>

      {feedback && (
        <div
          className={`tasks-section__feedback ${
            feedback.type === "success"
              ? "tasks-section__feedback--success"
              : "tasks-section__feedback--error"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="tasks-section__toolbar tasks-section__toolbar--tabs-row">
        <div className="tasks-section__tabs">
          {statusTabs.map((tab) => (
            <div key={tab.key} className="tasks-section__tab-wrap">
              <button
                type="button"
                className={`tasks-section__tab ${
                  activeTab === tab.key ? "tasks-section__tab--active" : ""
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tasks-section__tab-text">{tab.label}</span>
              </button>

              <span className="tasks-section__tab-count">
                {taskCounts[tab.key] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="tasks-section__create-btn"
          onClick={openCreateModal}
        >
          <FiPlus />
          Create Task
        </button>
      </div>

      {isLoading ? (
        <div className="tasks-section__state-card">
          <h3>Loading tasks</h3>
          <p>Please wait while the task list is being prepared.</p>
        </div>
      ) : errorMessage ? (
        <div className="tasks-section__state-card tasks-section__state-card--error">
          <h3>Something went wrong</h3>
          <p>{errorMessage}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="tasks-section__state-card">
          <h3>No tasks found</h3>
          <p>Try changing the selected tab or create a new task to get started.</p>
        </div>
      ) : (
        <div className="tasks-section__table-card">
          <div className="tasks-section__table-wrap">
            <table className="tasks-section__table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Complexity</th>
                  <th>Effort</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th className="tasks-section__col-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedTasks.map((task, index) => {
                  const isEditing = editingTaskId === task.id && editFormState;
                  const previewUser = isEditing ? editingSelectedUser : null;

                  return (
                  <tr
                    key={task.id}
                    ref={isEditing ? editRowRef : null}
                    className={
                      index % 2 === 0
                        ? "tasks-section__row--odd"
                        : "tasks-section__row--even"
                    }
                  >
                    <td>
                      {isEditing ? (
                        <button
                          type="button"
                          className="tasks-section__inline-link"
                          onClick={openEditTaskInfoModal}
                        >
                          <div className="tasks-section__task-cell">
                            <strong>{editFormState.title || "Add task name"}</strong>
                            <small>{editFormState.description || "Add task description"}</small>
                          </div>
                        </button>
                      ) : (
                        <div className="tasks-section__task-cell">
                          <strong>{task.title}</strong>
                          <small>{task.description || "No description"}</small>
                        </div>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <button
                          type="button"
                          className="tasks-section__inline-link"
                          onClick={() => setIsEditAssigneeOpen(true)}
                        >
                          <div className="tasks-section__user-cell">
                            <div className="tasks-section__avatar">
                              {previewUser && getProfileImage(previewUser) ? (
                                <img
                                  src={getProfileImage(previewUser)}
                                  alt={previewUser.fullName ?? previewUser.name ?? "User"}
                                  className="tasks-section__avatar-image"
                                />
                              ) : (
                                getInitials(
                                  previewUser?.fullName ?? previewUser?.name ?? task.assignedUserName
                                )
                              )}
                            </div>

                            <div className="tasks-section__user-details">
                              <strong>{previewUser?.fullName ?? previewUser?.name ?? task.assignedUserName}</strong>
                              <small>{previewUser?.email ?? task.assignedUserEmail ?? "—"}</small>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="tasks-section__user-cell">
                          <div className="tasks-section__avatar">
                            {task.assignedUserAvatar ? (
                              <img
                                src={task.assignedUserAvatar}
                                alt={task.assignedUserName}
                                className="tasks-section__avatar-image"
                              />
                            ) : (
                              getInitials(task.assignedUserName)
                            )}
                          </div>

                          <div className="tasks-section__user-details">
                            <strong>{task.assignedUserName}</strong>
                            <small>{task.assignedUserEmail || "—"}</small>
                          </div>
                        </div>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div className="tasks-section__inline-select-wrap">
                          <select
                            value={editFormState.priority}
                            onChange={(event) =>
                              handleEditFormChange("priority", event.target.value)
                            }
                            className="tasks-section__inline-select"
                          >
                            {priorityOptions.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown />
                        </div>
                      ) : (
                        <span
                          className={`tasks-section__badge ${getPriorityClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div className="tasks-section__inline-select-wrap">
                          <select
                            value={editFormState.complexity}
                            onChange={(event) =>
                              handleEditFormChange("complexity", event.target.value)
                            }
                            className="tasks-section__inline-select"
                          >
                            {complexityOptions.map((complexity) => (
                              <option key={complexity} value={complexity}>
                                {complexity}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown />
                        </div>
                      ) : (
                        <span
                          className={`tasks-section__badge ${getComplexityClass(
                            task.complexity
                          )}`}
                        >
                          {task.complexity}
                        </span>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="tasks-section__inline-effort-input"
                          value={editFormState.estimatedEffortHours}
                          onChange={(event) =>
                            handleEditFormChange("estimatedEffortHours", event.target.value)
                          }
                        />
                      ) : (
                        formatHours(task.estimatedEffortHours)
                      )}
                    </td>
                    <td>{isEditing ? (computedEditTaskWeight || task.weight) : task.weight}</td>

                    <td className="tasks-section__cell-status">
                      <span
                        className={`tasks-section__status-badge ${getStatusClass(
                          task.effectiveStatus
                        )}`}
                      >
                        {prettifyLabel(task.effectiveStatus)}
                      </span>
                    </td>

                    <td>{formatDate(task.dueDate)}</td>

                    <td className="tasks-section__cell-actions">
                      <div className="tasks-section__actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="tasks-section__action-btn tasks-section__action-btn--edit"
                              title="Save changes"
                              onClick={saveTaskChanges}
                              disabled={
                                !editFormState.title?.trim() ||
                                !editFormState.description?.trim() ||
                                !editFormState.assignedUserId ||
                                !editFormState.priority ||
                                !editFormState.complexity ||
                                !editFormState.estimatedEffortHours ||
                                !computedEditTaskWeight
                              }
                            >
                              <FiCheck />
                            </button>

                            <button
                              type="button"
                              className="tasks-section__action-btn tasks-section__action-btn--danger"
                              title="Cancel"
                              onClick={cancelEditMode}
                            >
                              <FiX />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="tasks-section__action-btn tasks-section__action-btn--view"
                              title="View task"
                            >
                              <FiEye />
                            </button>

                            <button
                              type="button"
                              className="tasks-section__action-btn tasks-section__action-btn--edit"
                              title="Edit task"
                              onClick={() => openEditMode(task)}
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              type="button"
                              className="tasks-section__action-btn tasks-section__action-btn--danger"
                              title="Delete task"
                              onClick={() => setDeleteTaskId(task.id)}
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="tasks-section__pagination">
            <div className="tasks-section__pagination-info">
              Showing {startIndex}-{endIndex} of {filteredTasks.length} tasks
            </div>

            <div className="tasks-section__pagination-controls">
              <button
                type="button"
                className="tasks-section__page-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft />
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`tasks-section__page-btn tasks-section__page-btn--number ${
                    currentPage === pageNumber
                      ? "tasks-section__page-btn--active"
                      : ""
                  }`}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="tasks-section__page-btn"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div
          className="tasks-section__modal-overlay"
          onClick={closeCreateModal}
        >
          <div
            className="tasks-section__modal tasks-section__modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Create Task</h3>
                <p>
                  {createStep === 1
                    ? "Add the main task details and choose the assigned employee."
                    : "Complete the remaining task details and review the calculated weight."}
                </p>
              </div>

              <button
                type="button"
                className="tasks-section__modal-close"
                onClick={closeCreateModal}
              >
                <FiX />
              </button>
            </div>

            <div className="tasks-section__stepper">
              <div
                className={`tasks-section__step ${
                  createStep === 1 ? "tasks-section__step--active" : ""
                }`}
              >
                <span className="tasks-section__step-number">1</span>
                <span className="tasks-section__step-label">Task Info</span>
              </div>
              <div className="tasks-section__step-line" />
              <div
                className={`tasks-section__step ${
                  createStep === 2 ? "tasks-section__step--active" : ""
                }`}
              >
                <span className="tasks-section__step-number">2</span>
                <span className="tasks-section__step-label">Details</span>
              </div>
            </div>

            <form className="tasks-section__form" onSubmit={createTask}>
              {createStep === 1 ? (
                <div className="tasks-section__form-grid">
                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label htmlFor="task-title">
                      Name <span className="tasks-section__required">*</span>
                    </label>
                    <input
                      id="task-title"
                      type="text"
                      value={formState.title}
                      onChange={(event) =>
                        handleFormChange("title", capitalizeWords(event.target.value))
                      }
                      required
                    />
                  </div>

                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label htmlFor="task-description">
                      Description <span className="tasks-section__required">*</span>
                    </label>
                    <textarea
                      id="task-description"
                      value={formState.description}
                      onChange={(event) =>
                        handleFormChange(
                          "description",
                          capitalizeWords(event.target.value)
                        )
                      }
                      rows={4}
                      required
                    />
                  </div>

                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label>
                      Selected user <span className="tasks-section__required">*</span>
                    </label>
                    <p className="tasks-section__field-description">
                      Search and select one employee to assign this task to.
                    </p>

                    <div className="tasks-section__member-picker">
                      <div className="tasks-section__member-search">
                        <FiSearch />
                        <input
                          type="text"
                          placeholder="Search any member in the company..."
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                        />
                      </div>

                      <div className="tasks-section__member-table">
                        {assignableUsers.length === 0 ? (
                          <p className="tasks-section__members-empty">
                            No members found.
                          </p>
                        ) : (
                          assignableUsers.map((user) => {
                            const userId = user.userId ?? user.id;
                            const isSelected =
                              String(formState.assignedUserId) === String(userId);
                            const imageUrl = getProfileImage(user);

                            return (
                              <button
                                key={userId}
                                type="button"
                                className={`tasks-section__member-row ${
                                  isSelected
                                    ? "tasks-section__member-row--selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleFormChange("assignedUserId", String(userId))
                                }
                              >
                                <span
                                  className={`tasks-section__member-check ${
                                    isSelected
                                      ? "tasks-section__member-check--selected"
                                      : ""
                                  }`}
                                >
                                  {isSelected ? "✓" : ""}
                                </span>

                                <span className="tasks-section__member-avatar">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={user.fullName ?? user.name ?? "User"}
                                      className="tasks-section__member-avatar-image"
                                    />
                                  ) : (
                                    <span className="tasks-section__member-avatar-fallback">
                                      {getInitials(user.fullName ?? user.name ?? "")}
                                    </span>
                                  )}
                                </span>

                                <span className="tasks-section__member-copy">
                                  <strong>{user.fullName ?? user.name ?? "Unknown User"}</strong>
                                  <small>{user.email || "—"}</small>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tasks-section__form-grid">
                  <div className="tasks-section__form-group">
                    <label htmlFor="task-priority">
                      Priority <span className="tasks-section__required">*</span>
                    </label>
                    <div className="tasks-section__select-wrapper">
                      <select
                        id="task-priority"
                        value={formState.priority}
                        onChange={(event) =>
                          handleFormChange("priority", event.target.value)
                        }
                        required
                      >
                        <option value="">Select priority</option>
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown />
                    </div>
                  </div>

                  <div className="tasks-section__form-group">
                    <label htmlFor="task-complexity">
                      Complexity <span className="tasks-section__required">*</span>
                    </label>
                    <div className="tasks-section__select-wrapper">
                      <select
                        id="task-complexity"
                        value={formState.complexity}
                        onChange={(event) =>
                          handleFormChange("complexity", event.target.value)
                        }
                        required
                      >
                        <option value="">Select complexity</option>
                        {complexityOptions.map((complexity) => (
                          <option key={complexity} value={complexity}>
                            {complexity}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown />
                    </div>
                  </div>

                  <div className="tasks-section__form-group">
                    <label htmlFor="task-effort">
                      Base effort <span className="tasks-section__required">*</span>
                    </label>
                    <input
                      id="task-effort"
                      type="number"
                      min="1"
                      step="1"
                      value={formState.estimatedEffortHours}
                      onChange={(event) =>
                        handleFormChange("estimatedEffortHours", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="tasks-section__form-group">
                    <label htmlFor="task-weight">Task weight</label>
                    <input
                      id="task-weight"
                      type="text"
                      value={computedTaskWeight}
                      readOnly
                      placeholder="Calculated automatically"
                    />
                  </div>

                  <div className="tasks-section__form-group tasks-section__form-group--full">
                    <label>
                      Date range <span className="tasks-section__required">*</span>
                    </label>

                    <div className="tasks-section__date-picker-shell" ref={datePickerRef}>
                      <button
                        type="button"
                        className="tasks-section__date-picker-trigger"
                        onClick={() => {
                          if (isDatePickerOpen) {
                            closeDatePicker();
                          } else {
                            openDatePicker();
                          }
                        }}
                      >
                        <span>{formattedRangeLabel}</span>
                        <FiCalendar />
                      </button>

                      {isDatePickerOpen && (
                        <div className="tasks-section__date-picker-popover">
                          <div className="tasks-section__date-picker-calendar">
                            <DayPicker
                              mode="range"
                              selected={draftRange}
                              onSelect={(range) =>
                                setDraftRange({
                                  from: range?.from || undefined,
                                  to: range?.to || undefined,
                                })
                              }
                              showOutsideDays
                              numberOfMonths={1}
                              className="tasks-section__day-picker"
                            />
                          </div>

                          <button
                            type="button"
                            className="tasks-section__apply-btn"
                            onClick={applyDateRange}
                            disabled={!draftRange?.from || !draftRange?.to}
                          >
                            Apply Range
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="tasks-section__form-actions">
                <button
                  type="button"
                  className="tasks-section__secondary-btn"
                  onClick={createStep === 1 ? closeCreateModal : () => setCreateStep(1)}
                  disabled={isSubmitting}
                >
                  {createStep === 1 ? "Cancel" : "Back"}
                </button>

                {createStep === 1 ? (
                  <button
                    type="button"
                    className="tasks-section__submit-btn"
                    onClick={() => setCreateStep(2)}
                    disabled={!isStepOneValid}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="tasks-section__submit-btn"
                    disabled={isCreateDisabled}
                  >
                    {isSubmitting ? "Creating..." : "Create Task"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditTaskInfoOpen && editFormState && (
        <div className="tasks-section__modal-overlay" onClick={cancelEditMode}>
          <div ref={editTaskInfoModalRef} className="tasks-section__confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Edit Task Info</h3>
                <p>Update the task name and description.</p>
              </div>

              <button
                type="button"
                className="tasks-section__modal-close"
                onClick={cancelEditMode}
              >
                <FiX />
              </button>
            </div>

            <div className="tasks-section__form">
              <div className="tasks-section__form-group">
                <label htmlFor="edit-task-title">Name</label>
                <input
                  id="edit-task-title"
                  type="text"
                  value={editTaskDraft.title}
                  onChange={(event) =>
                    setEditTaskDraft((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="tasks-section__form-group">
                <label htmlFor="edit-task-description">Description</label>
                <textarea
                  id="edit-task-description"
                  rows={4}
                  value={editTaskDraft.description}
                  onChange={(event) =>
                    setEditTaskDraft((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="tasks-section__form-actions">
                <button
                  type="button"
                  className="tasks-section__secondary-btn"
                  onClick={cancelEditMode}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="tasks-section__submit-btn"
                  onClick={applyEditTaskInfo}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditAssigneeOpen && editFormState && (
        <div className="tasks-section__modal-overlay" onClick={cancelEditMode}>
          <div ref={editAssigneeModalRef} className="tasks-section__confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tasks-section__modal-header tasks-section__modal-header--lined">
              <div>
                <h3>Edit Assignee</h3>
                <p>Search and choose a different employee.</p>
              </div>

              <button
                type="button"
                className="tasks-section__modal-close"
                onClick={cancelEditMode}
              >
                <FiX />
              </button>
            </div>

            <div className="tasks-section__member-picker">
              <div className="tasks-section__member-search">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search any member in the company..."
                  value={editMemberSearch}
                  onChange={(event) => setEditMemberSearch(event.target.value)}
                />
              </div>

              <div className="tasks-section__member-table">
                {filteredEditAssignableUsers.length === 0 ? (
                  <p className="tasks-section__members-empty">No members found.</p>
                ) : (
                  filteredEditAssignableUsers.map((user) => {
                    const userId = user.userId ?? user.id;
                    const isSelected =
                      String(editFormState.assignedUserId) === String(userId);
                    const imageUrl = getProfileImage(user);

                    return (
                      <button
                        key={userId}
                        type="button"
                        className={`tasks-section__member-row ${
                          isSelected ? "tasks-section__member-row--selected" : ""
                        }`}
                        onClick={() => handleEditFormChange("assignedUserId", String(userId))}
                      >
                        <span
                          className={`tasks-section__member-check ${
                            isSelected ? "tasks-section__member-check--selected" : ""
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </span>

                        <span className="tasks-section__member-avatar">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={user.fullName ?? user.name ?? "User"}
                              className="tasks-section__member-avatar-image"
                            />
                          ) : (
                            <span className="tasks-section__member-avatar-fallback">
                              {getInitials(user.fullName ?? user.name ?? "")}
                            </span>
                          )}
                        </span>

                        <span className="tasks-section__member-copy">
                          <strong>{user.fullName ?? user.name ?? "Unknown User"}</strong>
                          <small>{user.email || "—"}</small>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="tasks-section__form-actions">
              <button
                type="button"
                className="tasks-section__secondary-btn"
                onClick={cancelEditMode}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tasks-section__submit-btn"
                onClick={cancelEditMode}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTaskId && (
        <div
          className="tasks-section__modal-overlay"
          onClick={() => setDeleteTaskId(null)}
        >
          <div
            className="tasks-section__confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tasks-section__confirm-copy">
              <h3>Delete Task</h3>
              <p>Are you sure you want to delete this task?</p>
            </div>

            <div className="tasks-section__confirm-actions">
              <button
                type="button"
                className="tasks-section__secondary-btn"
                onClick={() => setDeleteTaskId(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="tasks-section__danger-btn"
                onClick={confirmDeleteTask}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
