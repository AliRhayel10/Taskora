import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { endOfMonth, format, setMonth, setYear, startOfMonth } from "date-fns";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import "react-day-picker/dist/style.css";
import TeamLeaderSidebar from "../components/TeamLeaderSidebar";
import AppTopbar from "../components/AppTopbar";
import TeamLeaderDashboardSection from "../components/teamleader/TeamLeaderDashboardSection";
import TeamLeaderProfileSection from "../components/teamleader/TeamLeaderProfileSection";
import TasksSection from "../components/teamleader/TasksSection";
import TeamLeaderTeamSection from "../components/teamleader/TeamLeaderTeamSection";
import "../assets/styles/teamleader/team-leader-dashboard.css";
import "../assets/styles/teamleader/tasks-section.css";
import "../assets/styles/teamleader/team-leader-team-section.css";

function SectionTitle({ title }) {
  return (
    <div className="users-section">
      <div className="users-section__title-row">
        <h2>{title}</h2>
        <div className="users-section__title-line"></div>
      </div>
    </div>
  );
}

function parseStoredJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(`[TeamLeaderDashboard] Failed to parse "${key}"`, error);
    return null;
  }
}


const RANGE_STORAGE_KEY = "teamleader_shared_date_range";

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getTodayRange() {
  const today = new Date();
  return { start: startOfDay(today), end: endOfDay(today) };
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
  const weekStart = startOfDay(start);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return { start: weekStart, end: endOfDay(weekEnd) };
}

function loadSharedRangeState() {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    if (!saved) {
      const range = getWeekRange(0);
      return { selectedPreset: "thisWeek", customRange: { from: range.start, to: range.end } };
    }
    const parsed = JSON.parse(saved);
    return {
      selectedPreset: parsed?.selectedPreset || "thisWeek",
      customRange: {
        from: parsed?.customRange?.from ? new Date(parsed.customRange.from) : null,
        to: parsed?.customRange?.to ? new Date(parsed.customRange.to) : null,
      },
    };
  } catch {
    const range = getWeekRange(0);
    return { selectedPreset: "thisWeek", customRange: { from: range.start, to: range.end } };
  }
}

function saveSharedRangeState(selectedPreset, customRange) {
  localStorage.setItem(
    RANGE_STORAGE_KEY,
    JSON.stringify({
      selectedPreset,
      customRange: {
        from: customRange?.from ? customRange.from.toISOString() : null,
        to: customRange?.to ? customRange.to.toISOString() : null,
      },
    })
  );
}

function getPresetRange(preset, customRange) {
  switch (preset) {
    case "today":
      return getTodayRange();
    case "custom": {
      if (customRange?.from instanceof Date && customRange?.to instanceof Date) {
        const start = startOfDay(customRange.from);
        const end = endOfDay(customRange.to);
        if (start <= end) return { start, end };
      }
      return getWeekRange(0);
    }
    case "thisWeek":
    default:
      return getWeekRange(0);
  }
}

function getRangeLabel(preset) {
  switch (preset) {
    case "today":
      return "Today";
    case "custom":
      return "Custom";
    case "thisWeek":
    default:
      return "This Week";
  }
}

function formatDateText(date) {
  return format(date, "MMM d, yyyy");
}

function formatMonthYearText(date) {
  return format(date, "MMMM yyyy");
}

function isFullMonthRange(range) {
  if (!(range?.from instanceof Date) || !(range?.to instanceof Date)) return false;
  const monthStart = startOfMonth(range.from);
  const monthEnd = endOfMonth(range.from);
  return (
    startOfDay(range.from).getTime() === startOfDay(monthStart).getTime() &&
    endOfDay(range.to).getTime() === endOfDay(monthEnd).getTime() &&
    range.from.getMonth() === range.to.getMonth() &&
    range.from.getFullYear() === range.to.getFullYear()
  );
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
}

function SharedDateRangePicker({ selectedPreset, customRange, onRangeChange }) {
  const rangeMenuRef = useRef(null);
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState(selectedPreset);
  const [draftCustomRange, setDraftCustomRange] = useState({ from: null, to: null });
  const [draftCalendarMonth, setDraftCalendarMonth] = useState(
    customRange?.from instanceof Date ? startOfMonth(customRange.from) : startOfMonth(new Date())
  );

  const rangeLabel = useMemo(() => {
    if (selectedPreset === "custom" && customRange?.from instanceof Date && customRange?.to instanceof Date) {
      if (isFullMonthRange(customRange)) return formatMonthYearText(customRange.from);
      return `${formatDateText(customRange.from)} - ${formatDateText(customRange.to)}`;
    }
    return getRangeLabel(selectedPreset);
  }, [selectedPreset, customRange]);

  const draftRangePreview = useMemo(() => {
    if (draftCustomRange?.from instanceof Date && draftCustomRange?.to instanceof Date) {
      if (isFullMonthRange(draftCustomRange)) return formatMonthYearText(draftCustomRange.from);
      return `${formatDateText(draftCustomRange.from)} - ${formatDateText(draftCustomRange.to)}`;
    }
    return formatMonthYearText(draftCalendarMonth);
  }, [draftCalendarMonth, draftCustomRange]);

  const selectedMonthIndex = draftCalendarMonth.getMonth();
  const selectedYearValue = draftCalendarMonth.getFullYear();
  const yearOptions = useMemo(() => getYearOptions(), []);

  const syncDraftWithAppliedState = () => {
    setDraftPreset(selectedPreset);
    setDraftCustomRange({ from: customRange?.from || null, to: customRange?.to || null });
    setDraftCalendarMonth(
      customRange?.from instanceof Date ? startOfMonth(customRange.from) : startOfMonth(new Date())
    );
  };

  const openRangeMenu = () => {
    syncDraftWithAppliedState();
    setIsRangeMenuOpen(true);
  };

  const closeRangeMenu = () => {
    syncDraftWithAppliedState();
    setIsRangeMenuOpen(false);
  };

  useEffect(() => {
    if (!isRangeMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (rangeMenuRef.current && !rangeMenuRef.current.contains(event.target)) closeRangeMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isRangeMenuOpen, selectedPreset, customRange]);

  const applyPreset = (preset) => {
    if (preset === "custom") {
      setDraftPreset("custom");
      setDraftCustomRange({ from: null, to: null });
      setDraftCalendarMonth(startOfMonth(new Date()));
      return;
    }
    const nextRange = getPresetRange(preset, null);
    onRangeChange({ selectedPreset: preset, customRange: { from: nextRange.start, to: nextRange.end } });
    setIsRangeMenuOpen(false);
  };

  const handleDraftMonthChange = (monthIndex) => {
    setDraftCalendarMonth((current) => setMonth(current, Number(monthIndex)));
    setDraftCustomRange({ from: null, to: null });
  };

  const handleDraftYearChange = (yearValue) => {
    setDraftCalendarMonth((current) => setYear(current, Number(yearValue)));
    setDraftCustomRange({ from: null, to: null });
  };

  const handleApplyCustomRange = () => {
    const nextRange = draftCustomRange?.from && draftCustomRange?.to
      ? { from: startOfDay(draftCustomRange.from), to: endOfDay(draftCustomRange.to) }
      : { from: startOfDay(startOfMonth(draftCalendarMonth)), to: endOfDay(endOfMonth(draftCalendarMonth)) };
    onRangeChange({ selectedPreset: "custom", customRange: nextRange });
    setIsRangeMenuOpen(false);
  };

  return (
    <div className="dashboard-section__toolbar dashboard-section__range-toolbar">
      <div className="dashboard-section__range-menu" ref={rangeMenuRef}>
        <button type="button" className="dashboard-section__range-btn" onClick={openRangeMenu}>
          <span>{rangeLabel}</span>
          <FiChevronDown />
        </button>

        {isRangeMenuOpen && (
          <div className="dashboard-section__range-dropdown">
            <div className="dashboard-section__range-tabs" role="tablist" aria-label="Date range presets">
              {[
                ["today", "Today"],
                ["thisWeek", "This Week"],
                ["custom", "Custom"],
              ].map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  role="tab"
                  aria-selected={draftPreset === preset}
                  className={`dashboard-section__range-option ${
                    draftPreset === preset ? "dashboard-section__range-option--active" : ""
                  }`}
                  onClick={() => applyPreset(preset)}
                >
                  {label}
                </button>
              ))}
            </div>

            {draftPreset === "custom" && (
              <>
                <div className="dashboard-section__range-divider" />
                <div className="dashboard-section__custom-range">
                  <div className="dashboard-section__custom-range-header">
                    <FiCalendar />
                    <span>Pick a custom range</span>
                  </div>
                  <div className="dashboard-section__custom-range-preview">{draftRangePreview}</div>
                  <div className="dashboard-section__month-picker-row">
                    <div className="dashboard-section__month-picker-field">
                      <label htmlFor="dashboard-month-select">Month</label>
                      <div className="dashboard-section__month-picker-select-wrap">
                        <select
                          id="dashboard-month-select"
                          className="dashboard-section__month-picker-select"
                          value={selectedMonthIndex}
                          onChange={(event) => handleDraftMonthChange(event.target.value)}
                        >
                          {Array.from({ length: 12 }, (_, index) => (
                            <option key={index} value={index}>
                              {format(new Date(2026, index, 1), "MMMM")}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown />
                      </div>
                    </div>
                    <div className="dashboard-section__month-picker-field">
                      <label htmlFor="dashboard-year-select">Year</label>
                      <div className="dashboard-section__month-picker-select-wrap">
                        <select
                          id="dashboard-year-select"
                          className="dashboard-section__month-picker-select"
                          value={selectedYearValue}
                          onChange={(event) => handleDraftYearChange(event.target.value)}
                        >
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown />
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-section__calendar-shell">
                    <DayPicker
                      mode="range"
                      selected={draftCustomRange}
                      onSelect={(range) => setDraftCustomRange({ from: range?.from || null, to: range?.to || null })}
                      month={draftCalendarMonth}
                      onMonthChange={setDraftCalendarMonth}
                      showOutsideDays={false}
                      numberOfMonths={1}
                      className="dashboard-section__day-picker"
                      modifiers={{
                        past: (date) => startOfDay(date) < startOfDay(new Date()),
                      }}
                      modifiersClassNames={{
                        past: "dashboard-section__day--past",
                      }}
                    />
                  </div>
                  <div className="dashboard-section__apply-btn-wrap">
                    <button type="button" className="dashboard-section__apply-btn" onClick={handleApplyCustomRange}>
                      Apply Range
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isTeamLeader(user) {
  const role =
    user?.role ||
    user?.Role ||
    user?.user?.role ||
    user?.user?.Role ||
    "";

  return normalizeRole(role) === "teamleader";
}

export default function TeamLeaderDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("tl_theme") || "light";
  });

  const [activeItem, setActiveItem] = useState("Dashboard");
  const [searchValue, setSearchValue] = useState("");

  const initialSharedRange = useMemo(() => loadSharedRangeState(), []);
  const [selectedPreset, setSelectedPreset] = useState(initialSharedRange.selectedPreset);
  const [customRange, setCustomRange] = useState(initialSharedRange.customRange);

  const handleSharedRangeChange = ({ selectedPreset: nextPreset, customRange: nextRange }) => {
    setSelectedPreset(nextPreset);
    setCustomRange(nextRange);
    saveSharedRangeState(nextPreset, nextRange);
  };

  const [user, setUser] = useState(() => {
    const routeUser = location.state?.user || null;
    const authUser = parseStoredJson("authUser");
    const legacyUser = parseStoredJson("user");

    console.group("[TeamLeaderDashboard Init]");
    console.log("location.state?.user:", routeUser);
    console.log('localStorage "authUser":', authUser);
    console.log('localStorage "user":', legacyUser);
    console.groupEnd();

    const currentUser = isTeamLeader(routeUser)
      ? routeUser
      : isTeamLeader(authUser)
        ? authUser
        : isTeamLeader(legacyUser)
          ? legacyUser
          : null;

    console.log("[TeamLeaderDashboard] selected currentUser:", currentUser);

    if (!currentUser) return null;

    return {
      userId: currentUser.userId,
      companyId: currentUser.companyId,
      companyName: currentUser.companyName || "",
      fullName: currentUser.fullName || currentUser.name || "Team Leader",
      email: currentUser.email || "",
      role: currentUser.role || "Team Leader",
      profileImageUrl: currentUser.profileImageUrl || "",
      jobTitle: currentUser.jobTitle || "",
      token: currentUser.token || "",
    };
  });

  useEffect(() => {
    localStorage.setItem("tl_theme", theme);
    document.body.classList.toggle("dark", theme === "dark");

    return () => {
      document.body.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    if (!user) {
      console.warn(
        "[TeamLeaderDashboard] No valid team leader user found. Redirecting to login."
      );
      navigate("/login", { replace: true });
      return;
    }

    console.log("[TeamLeaderDashboard] Persisting authUser:", user);
    localStorage.setItem("authUser", JSON.stringify(user));
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

const searchPlaceholder = "Search";

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <TeamLeaderSidebar
        activeItem={activeItem}
        onSelect={setActiveItem}
        theme={theme}
      />

      <main className="admin-main">
        <AppTopbar
          user={user}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          notificationCount={0}
          showSearch={true}
          searchPlaceholder={searchPlaceholder}
          onOpenProfile={() => setActiveItem("Profile")}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        />

        <section className="admin-main__content">
          {activeItem === "Dashboard" ? (
            <TeamLeaderDashboardSection
              user={user}
              searchValue={searchValue}
              selectedPreset={selectedPreset}
              customRange={customRange}
              hideDateRange
              dateRangeControl={
                <SharedDateRangePicker
                  selectedPreset={selectedPreset}
                  customRange={customRange}
                  onRangeChange={handleSharedRangeChange}
                />
              }
            />
          ) : activeItem === "Tasks" ? (
            <TasksSection
              searchValue={searchValue}
              user={user}
              dashboardSelectedPreset={selectedPreset}
              dashboardCustomRange={customRange}
              hideDateRange
              dateRangeControl={
                <SharedDateRangePicker
                  selectedPreset={selectedPreset}
                  customRange={customRange}
                  onRangeChange={handleSharedRangeChange}
                />
              }
            />
          ) : activeItem === "Team" ? (
            <TeamLeaderTeamSection
              searchValue={searchValue}
              user={user}
              selectedPreset={selectedPreset}
              customRange={customRange}
              hideDateRange
              dateRangeControl={
                <SharedDateRangePicker
                  selectedPreset={selectedPreset}
                  customRange={customRange}
                  onRangeChange={handleSharedRangeChange}
                />
              }
            />
          ) : activeItem === "Profile" ? (
            <TeamLeaderProfileSection user={user} setUser={setUser} />
          ) : (
            <SectionTitle title={activeItem} />
          )}
        </section>
      </main>
    </div>
  );
}