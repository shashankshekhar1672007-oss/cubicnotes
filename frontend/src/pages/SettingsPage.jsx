import { useState, useContext, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../context/ThemeContext";
import api from "../services/api";
import GeminiIcon from "../components/UI/GeminiIcon";
import { useGhostGuard } from "../hooks/useGhostGuard";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import { generateGhostActivity } from "../data/ghostDemoData";
import "../assets/styles/pages/settings.css";

/* ── Avatar preset images ─────────────────────────────── */
const AVATAR_PRESETS = Array.from({ length: 9 }, (_, i) => ({
  key: `avatar-${i + 1}`,
  src: new URL(`../assets/images/avatars/avatar-${i + 1}.png`, import.meta.url).href,
  label: `Avatar ${i + 1}`,
}));

/* resolve an avatarPreset key -> image src (or null for 'google') */
const getAvatarSrc = (preset) => {
  if (!preset || preset === "google") return null;
  const found = AVATAR_PRESETS.find((p) => p.key === preset);
  return found ? found.src : AVATAR_PRESETS[0].src;
};

const formatLocalDateYMD = (dateObj) => {
  if (!dateObj) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fileToDataUri = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/* ── Stats fetch ──────────────────────────────────────── */
const fetchStats = async () => {
  const [notes, notebooks, tasks, reminders] = await Promise.all([
    api.get("/notes"),
    api.get("/notebooks"),
    api.get("/tasks"),
    api.get("/reminders"),
  ]);
  const allTasks = tasks.data || [];
  return {
    notes:          (notes.data || []).length,
    notebooks:      (notebooks.data || []).length,
    tasksOpen:      allTasks.filter((t) => !t.isCompleted).length,
    tasksDone:      allTasks.filter((t) =>  t.isCompleted).length,
    reminders:      (reminders.data || []).length,
    pinnedNotes:    (notes.data || []).filter((n) => n.isPinned).length,
  };
};

/* ── Section wrapper ──────────────────────────────────── */
const Section = ({ title, accent = "var(--accent-teal)", children }) => (
  <div className="sp-section">
    <div className="sp-section-label">
      <span className="sp-section-dot" style={{ background: accent }}></span>
      {title}
    </div>
    {children}
  </div>
);

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth();
  const { 
    theme, 
    toggleTheme, 
    setThemeMode: contextSetThemeMode, 
    setThemeAutoHours 
  } = useContext(ThemeContext);
  const { guardAction, isGhost }     = useGhostGuard();
  const location = useLocation();

  /* Editable fields */
  const [name, setName]           = useState(user?.name   || "");
  const [avatarPreset, setAvatarPreset] = useState(
    user?.avatarPreset || "avatar-1"
  );
  const [dashboardNotesMode, setDashboardNotesMode] = useState(user?.dashboardNotesMode || "recent");
  const [trashRetentionDays, setTrashRetentionDays] = useState(user?.trashRetentionDays ?? 30);
  const [themeMode, setThemeMode] = useState(user?.themeMode || "light");
  const [themeAutoStartHour, setThemeAutoStartHour] = useState(user?.themeAutoStartHour ?? 6);
  const [themeAutoEndHour, setThemeAutoEndHour] = useState(user?.themeAutoEndHour ?? 18);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const formatHour = (h) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, "0")}:00 ${suffix}`;
  };

  const isLightHour = (h, start, end) => {
    if (start <= end) {
      return h >= start && h < end;
    }
    return h >= start || h < end;
  };

  const HOUR_PRESETS = [
    { label: "☀️ Standard (6 AM - 6 PM)", start: 6, end: 18 },
    { label: "🌅 Workday (8 AM - 6 PM)", start: 8, end: 18 },
    { label: "🦉 Night Owl (10 AM - 10 PM)", start: 10, end: 22 },
    { label: "🌙 Late Night (12 PM - 12 AM)", start: 12, end: 0 },
  ];

  useEffect(() => {
    if (user?.avatarPreset) {
      setAvatarPreset(user.avatarPreset);
    }
    if (user?.dashboardNotesMode) {
      setDashboardNotesMode(user.dashboardNotesMode);
    }
    if (user?.trashRetentionDays !== undefined) {
      setTrashRetentionDays(user.trashRetentionDays);
    }
    if (user?.themeMode) {
      setThemeMode(user.themeMode);
    }
    if (user?.themeAutoStartHour !== undefined) {
      setThemeAutoStartHour(user.themeAutoStartHour);
    }
    if (user?.themeAutoEndHour !== undefined) {
      setThemeAutoEndHour(user.themeAutoEndHour);
    }
  }, [user]);

  /* Password change */
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwError, setPwError]       = useState("");

  /* UI state */
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwSaved, setPwSaved]       = useState(false);
  const [activeTab, setActiveTab]   = useState(location.state?.tab || "account");

  /* AI settings state */
  const [aiKey, setAiKey]           = useState("");
  const [aiCredits, setAiCredits]   = useState(null);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [aiSaving, setAiSaving]     = useState(false);
  const [aiSaved, setAiSaved]       = useState(false);

  const loadAiSettings = async () => {
    if (isGhost) return;
    try {
      const { data } = await api.get("/ai/settings");
      setAiCredits(data.aiCredits);
      setHasCustomKey(data.hasCustomKey);
    } catch (err) {
      console.error("Failed to load AI credits", err);
    }
  };

  useEffect(() => {
    if (activeTab === "ai") {
      loadAiSettings();
    }
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("calendar_connected") === "true") {
      toast.success("Google Calendar connected successfully!");
      window.history.replaceState({}, document.title, window.location.pathname);
      api.get("/auth/me").then(({ data }) => updateUser(data)).catch(() => {});
    } else if (params.get("calendar_error")) {
      toast.error("Failed to connect Google Calendar.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search, updateUser]);

  const handleSaveAiKey = async (e) => {
    e.preventDefault();
    guardAction(async () => {
      setAiSaving(true);
      setAiSaved(false);
      try {
        const { data } = await api.put("/ai/settings", { customGeminiKey: aiKey.trim() });
        setAiCredits(data.aiCredits);
        setHasCustomKey(data.hasCustomKey);
        setAiKey("");
        setAiSaved(true);
        toast.success("AI Settings updated successfully!");
        setTimeout(() => setAiSaved(false), 2500);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to save API key");
      } finally {
        setAiSaving(false);
      }
    });
  };

  const handleClearAiKey = () => {
    showConfirm({
      title: "Remove Custom Gemini Key?",
      message: "Are you sure you want to remove your custom Gemini API key? You will be switched back to the default free tier.",
      confirmLabel: "Remove Key",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          setAiSaving(true);
          try {
            const { data } = await api.put("/ai/settings", { customGeminiKey: "" });
            setAiCredits(data.aiCredits);
            setHasCustomKey(data.hasCustomKey);
            setAiKey("");
            toast.success("Custom API key removed. Switched to free tier.");
          } catch (err) {
            toast.error("Failed to clear API key.");
          } finally {
            setAiSaving(false);
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const { data: serverStats, isLoading: statsLoading } = useQuery({
    queryKey: ["settings-stats"],
    queryFn: fetchStats,
    enabled: !isGhost,
  });

  const stats = useMemo(() => {
    if (isGhost) {
      return {
        notes: 4,
        notebooks: 3,
        tasksOpen: 4,
        tasksDone: 2,
        reminders: 3,
        pinnedNotes: 1,
      };
    }
    return serverStats;
  }, [isGhost, serverStats]);

  const { data: activityRes, isLoading: activityLoading } = useQuery({
    queryKey: ["settings-activity", isGhost],
    queryFn: async () => {
      if (isGhost) {
        return generateGhostActivity();
      }
      const { data } = await api.get("/notes/activity");
      return data;
    },
    enabled: activeTab === "activity",
  });

  const activityData = useMemo(() => activityRes?.activity || activityRes || {}, [activityRes]);
  const breakdown = useMemo(() => activityRes?.breakdown || { notes: 0, tasks: 0 }, [activityRes]);

  const heatmapMonths = useMemo(() => {
    if (!activityRes) return [];
    const today = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString("en-US", { month: "long" });
      const year = d.getFullYear();
      
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const limitDay = (i === 0) ? today.getDate() : lastDay;
      const startDayOfWeek = d.getDay();
      
      const days = [];
      // Pad beginning
      for (let p = 0; p < startDayOfWeek; p++) {
        days.push({ isPadding: true });
      }
      // Add days
      for (let dayNum = 1; dayNum <= limitDay; dayNum++) {
        const dateObj = new Date(d.getFullYear(), d.getMonth(), dayNum);
        days.push({
          isPadding: false,
          date: dateObj,
          dateStr: formatLocalDateYMD(dateObj),
          dayNum
        });
      }

      result.push({
        monthName,
        year,
        days
      });
    }
    return result;
  }, [activityRes]);

  const getIntensityLevel = (count) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const streakStats = useMemo(() => {
    if (!activityRes) return { total: 0, currentStreak: 0, maxStreak: 0 };
    const dates = Object.keys(activityData).sort();
    const total = Object.values(activityData).reduce((sum, val) => sum + val, 0);

    let maxStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesSet = new Set(dates);

    // Calculate max streak (last 180 days)
    for (let i = 180; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatLocalDateYMD(d);
      
      if (datesSet.has(dateStr)) {
        tempStreak++;
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak backwards from today or yesterday
    const todayStr = formatLocalDateYMD(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatLocalDateYMD(yesterday);

    let checkDate = new Date(today);
    if (!datesSet.has(todayStr) && datesSet.has(yesterdayStr)) {
      checkDate = yesterday;
    }

    while (true) {
      const dateStr = formatLocalDateYMD(checkDate);
      if (datesSet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { total, currentStreak, maxStreak };
  }, [activityRes, activityData]);

  const initials = isGhost ? "G" : (name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?");

  /* ── Avatar preset selection ──────────────────────── */
  const handleSelectPreset = async (preset) => {
    setAvatarPreset(preset);
    try {
      const { data } = await api.put("/auth/profile", { avatarPreset: preset });
      updateUser(data);
      toast.success(preset === "google" ? "Using Google profile photo!" : "Avatar updated!");
    } catch (err) {
      toast.error("Failed to update avatar.");
    }
  };

  /* computed active avatar src for the hero */
  const heroAvatarSrc = avatarPreset === "google"
    ? user?.avatar
    : getAvatarSrc(avatarPreset);

  /* ── Save profile ─────────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault();
    guardAction(async () => {
      setSaving(true);
      setSaved(false);
      try {
        const { data } = await api.put("/auth/profile", { name });
        updateUser(data);
        setSaved(true);
        toast.success("Profile updated successfully!");
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to update profile.");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDashboardNotesModeChange = async (mode) => {
    setDashboardNotesMode(mode);
    guardAction(async () => {
      setSaving(true);
      setSaved(false);
      try {
        const { data } = await api.put("/auth/profile", {
          dashboardNotesMode: mode,
        });
        updateUser(data);
        setSaved(true);
        toast.success("Dashboard preference updated successfully!");
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to update dashboard preference.");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleGeneralSettingsSave = async () => {
    guardAction(async () => {
      setSaving(true);
      setSaved(false);
      try {
        const { data } = await api.put("/auth/profile", {
          trashRetentionDays: Number(trashRetentionDays),
        });
        updateUser(data);
        setSaved(true);
        toast.success("Trash retention updated successfully!");
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to save trash retention.");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleAppearanceSave = async () => {
    guardAction(async () => {
      setSaving(true);
      setSaved(false);
      try {
        const { data } = await api.put("/auth/profile", {
          themeMode,
          themeAutoStartHour: Number(themeAutoStartHour),
          themeAutoEndHour: Number(themeAutoEndHour),
        });
        updateUser(data);
        setThemeAutoHours(Number(themeAutoStartHour), Number(themeAutoEndHour));
        setSaved(true);
        toast.success("Appearance settings updated successfully!");
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to save appearance settings.");
      } finally {
        setSaving(false);
      }
    });
  };

  /* ── Change password ──────────────────────────────── */
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    if (newPw.length < 6) { 
      setPwError("New password must be at least 6 characters."); 
      toast.error("New password must be at least 6 characters.");
      return; 
    }
    if (newPw !== confirmPw) { 
      setPwError("Passwords do not match."); 
      toast.error("Passwords do not match.");
      return; 
    }
    guardAction(async () => {
      setPwSaving(true);
      try {
        await api.put("/auth/profile", { currentPassword: currentPw, newPassword: newPw });
        setPwSaved(true);
        toast.success("Password changed successfully!");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
        setTimeout(() => setPwSaved(false), 2500);
      } catch (err) {
        const errMsg = err?.response?.data?.message || "Failed to change password.";
        setPwError(errMsg);
        toast.error(errMsg);
      } finally {
        setPwSaving(false);
      }
    });
  };

  const handleConnectCalendar = async () => {
    try {
      const { data } = await api.get("/auth/google/calendar/connect");
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Could not fetch connection URL.");
      }
    } catch (err) {
      toast.error("Failed to connect to Google Calendar.");
    }
  };

  const handleDisconnectCalendar = () => {
    showConfirm({
      title: "Disconnect Google Calendar?",
      message: "Are you sure you want to disconnect Google Calendar? Synced reminders will no longer update.",
      confirmLabel: "Disconnect",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        setSaving(true);
        try {
          const { data } = await api.post("/auth/google/calendar/disconnect");
          updateUser(data);
          toast.success("Google Calendar disconnected.");
        } catch (err) {
          toast.error("Failed to disconnect calendar.");
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleLogoutClick = () => {
    showConfirm({
      title: "Sign Out?",
      message: "Are you sure you want to sign out from this device?",
      confirmLabel: "Sign Out",
      variant: "danger",
      onConfirm: () => {
        setConfirmConfig({ isOpen: false });
        logout();
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  /* ── Stat card helper ─────────────────────────────── */
  const StatCard = ({ icon, label, value, accent, onClick }) => (
    <div className="sp-stat-card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", "--card-accent": accent }}>
      <div className="sp-stat-icon" style={{ color: accent, background: `${accent}18` }}>
        <i className={icon}></i>
      </div>
      <div className="sp-stat-value">
        {statsLoading ? <span className="sp-stat-skeleton"></span> : value}
      </div>
      <div className="sp-stat-label">{label}</div>
    </div>
  );

  const TABS = [
    { key: "account",    label: "Account",    icon: "fa-solid fa-user" },
    { key: "general",    label: "General",    icon: "fa-solid fa-gear" },
    { key: "appearance", label: "Appearance", icon: "fa-solid fa-palette" },
    { key: "activity",   label: "Activity",   icon: "fa-solid fa-chart-line" },
    { key: "ai",         label: "AI Settings", icon: "fa-solid fa-robot" },
  ];

  return (
    <div className="sp-root">

      {/* ── Hero profile card ──────────────────────── */}
      <div className="sp-hero">
        {/* Avatar */}
        <div className="sp-hero-avatar-wrap">
          <div className="sp-avatar-hover-wrapper">
            {/* Active avatar display */}
            {heroAvatarSrc ? (
              <img
                src={heroAvatarSrc}
                alt="avatar"
                className="sp-hero-avatar"
                style={{ objectFit: "cover" }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="sp-hero-avatar" style={{ background: "var(--accent-teal)" }}>
                {initials}
              </div>
            )}

            {/* Hover edit icon */}
            <div className="sp-avatar-edit-overlay">
              <i className="fa-solid fa-pen"></i>
            </div>

            {/* Popover picker */}
            <div className="sp-avatar-color-popover sp-avatar-img-popover">
              <div className="sp-popover-arrow"></div>
              <p className="sp-popover-title">Choose avatar</p>
              <div className="sp-avatar-img-grid">
                {AVATAR_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`sp-avatar-img-btn${avatarPreset === p.key ? " active" : ""}`}
                    title={p.label}
                    onClick={() => handleSelectPreset(p.key)}
                  >
                    <img src={p.src} alt={p.label} />
                    {avatarPreset === p.key && (
                      <span className="sp-avatar-img-check">
                        <i className="fa-solid fa-check"></i>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Google users can revert to their Google photo */}
              {user?.googleId && user?.avatar && (
                <button
                  type="button"
                  className="sp-avatar-google-revert"
                  onClick={() => handleSelectPreset("google")}
                >
                  <img src={user.avatar} alt="Google" className="sp-avatar-google-thumb" referrerPolicy="no-referrer" />
                  Use Google photo
                  {avatarPreset === "google" && <i className="fa-solid fa-check" style={{ marginLeft: "auto", color: "var(--accent-teal)" }}></i>}
                </button>
              )}
            </div>
          </div>
          <div className="sp-hero-avatar-ring" style={{ borderColor: "transparent" }}></div>
        </div>

        {/* Identity */}
        <div className="sp-hero-identity">
          <h1 className="sp-hero-name">{user?.name || "—"}</h1>
          <div className="sp-hero-meta">
            <span><i className="fa-regular fa-envelope"></i>{user?.email}</span>

            <span
              className="sp-theme-chip"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              <i className={theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
              {theme === "light" ? "Light" : "Dark"} mode
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────── */}
      <div className="sp-stats-row">
        <StatCard icon="fa-regular fa-file-lines" label="Notes"       value={stats?.notes}      accent="var(--accent-teal)"   />
        <StatCard icon="fa-solid fa-folder"        label="Notebooks"   value={stats?.notebooks}   accent="var(--accent-purple)" />
        <StatCard icon="fa-solid fa-circle-check"  label="Done"        value={stats?.tasksDone}   accent="var(--accent-lime)"   />
        <StatCard icon="fa-solid fa-list-check"    label="Open tasks"  value={stats?.tasksOpen}   accent="var(--accent-amber)"  />
        <StatCard icon="fa-regular fa-bell"        label="Reminders"   value={stats?.reminders}   accent="var(--accent-blue)"   />
        <StatCard icon="fa-solid fa-thumbtack"     label="Pinned"      value={stats?.pinnedNotes} accent="var(--accent-coral)"  />
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="sp-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`sp-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.key === "ai" ? (
              <GeminiIcon size={14} style={{ marginRight: "0.5rem" }} />
            ) : (
              <i className={t.icon}></i>
            )}
            <span className="sp-tab-label">{t.label}</span>
          </button>
        ))}
      </div>



      {/* ── Tab: General ──────────────────────────── */}
      {activeTab === "general" && (
        <div className="sp-panels">
          <div className="sp-panel">
            <Section title="Dashboard" accent="var(--accent-coral)">
              <p className="sp-panel-desc">
                Choose how dashboard notes are displayed.
              </p>
              <div className="sp-field">
                <div className="sp-field-label" style={{ marginBottom: "0.75rem" }}>Dashboard Display Mode</div>
                
                <div className="sp-option-cards">
                  <button
                    type="button"
                    className={`sp-option-card${dashboardNotesMode === "pinned" ? " active" : ""}`}
                    onClick={() => handleDashboardNotesModeChange("pinned")}
                  >
                    <div className="sp-oc-icon-wrap">
                      <i className="fa-solid fa-thumbtack"></i>
                    </div>
                    <div className="sp-oc-details">
                      <div className="sp-oc-title">Pinned Notes Only</div>
                      <div className="sp-oc-desc">Show only your pinned notes on the dashboard for quick access to key information.</div>
                    </div>
                    {dashboardNotesMode === "pinned" && (
                      <span className="sp-oc-check"><i className="fa-solid fa-check"></i></span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`sp-option-card${dashboardNotesMode === "recent" ? " active" : ""}`}
                    onClick={() => handleDashboardNotesModeChange("recent")}
                  >
                    <div className="sp-oc-icon-wrap">
                      <i className="fa-solid fa-clock"></i>
                    </div>
                    <div className="sp-oc-details">
                      <div className="sp-oc-title">Recent Notes</div>
                      <div className="sp-oc-desc">Display notes ordered by active edit time so you can pick up exactly where you left off.</div>
                    </div>
                    {dashboardNotesMode === "recent" && (
                      <span className="sp-oc-check"><i className="fa-solid fa-check"></i></span>
                    )}
                  </button>
                </div>
              </div>
            </Section>
          </div>

          <div className="sp-panel">
            <Section title="Trash" accent="var(--accent-amber)">
              <p className="sp-panel-desc">
                Configure how long items stay in trash before being permanently deleted.
              </p>
              <div className="sp-field">
                <label className="sp-field-label" style={{ marginBottom: "0.75rem" }}>Retention Period (days)</label>
                
                {/* Presets */}
                <div className="sp-preset-grid" style={{ marginBottom: "1rem" }}>
                  {[7, 30, 90, 180].map((days) => {
                    const isActive = Number(trashRetentionDays) === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        className={`sp-preset-chip${isActive ? " active" : ""}`}
                        onClick={() => setTrashRetentionDays(days)}
                      >
                        {days} Days
                      </button>
                    );
                  })}
                </div>

                {/* Input Stepper */}
                <div className="sp-stepper">
                  <button
                    type="button"
                    className="sp-stepper-btn"
                    onClick={() => setTrashRetentionDays(Math.max(1, Number(trashRetentionDays) - 1))}
                    disabled={Number(trashRetentionDays) <= 1}
                  >
                    <i className="fa-solid fa-minus"></i>
                  </button>
                  <input
                    className="sp-stepper-input"
                    type="number"
                    min="1"
                    max="365"
                    value={trashRetentionDays}
                    onChange={(e) => setTrashRetentionDays(Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="sp-stepper-btn"
                    onClick={() => setTrashRetentionDays(Math.min(365, Number(trashRetentionDays) + 1))}
                    disabled={Number(trashRetentionDays) >= 365}
                  >
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
                
                <span className="sp-field-hint" style={{ marginTop: "0.55rem", display: "block" }}>
                  Trashed notes and notebooks will be automatically deleted forever after this period.
                </span>
              </div>
              <div className="sp-form-footer">
                <button type="button" className="sp-btn-primary" onClick={handleGeneralSettingsSave} disabled={saving}>
                  Save trash retention
                </button>
                {saved && <span className="sp-saved-msg"><i className="fa-solid fa-check"></i> Saved</span>}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ── Tab: Appearance ───────────────────────── */}
      {activeTab === "appearance" && (
        <div className="sp-panels sp-panels-appearance">
          <div className="sp-panel">
            <Section title="Theme" accent="var(--accent-amber)">
              <p className="sp-panel-desc">
                Click a theme to apply it instantly. Choose System to follow your device setting, or Auto to schedule light/dark by time.
              </p>

              <div className="sp-theme-cards">
                {[
                  { value: "light",  label: "Light",   preview: "light" },
                  { value: "dark",   label: "Dark",    preview: "dark"  },
                  { value: "system", label: "System",  preview: "system" },
                  { value: "auto",   label: "Auto",    preview: "auto"  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`sp-theme-card${themeMode === opt.value ? " active" : ""}`}
                    onClick={() => {
                      setThemeMode(opt.value);
                      contextSetThemeMode(opt.value);
                    }}
                    title={opt.label}
                  >
                    <div className={`sp-tc-preview sp-tc-${opt.preview}`}>
                      {opt.value === "system" ? (
                        <>
                          <div className="sp-tc-inner sp-tc-inner-dark" style={{ position: "absolute", left: 12, bottom: 12 }}>
                            <span className="sp-tc-aa">Aa</span>
                          </div>
                          <div className="sp-tc-inner sp-tc-inner-light" style={{ position: "absolute", right: 12, bottom: 12 }}>
                            <span className="sp-tc-aa" style={{ color: "#1d1d1f" }}>Aa</span>
                            {themeMode === "system" && (
                              <span className="sp-tc-check"><i className="fa-solid fa-check"></i></span>
                            )}
                          </div>
                        </>
                      ) : opt.value === "auto" ? (
                        <>
                          <div className="sp-tc-inner sp-tc-inner-dark" style={{ position: "absolute", left: 12, bottom: 12 }}>
                            <span className="sp-tc-aa">Aa</span>
                            <i className="fa-solid fa-moon" style={{ position: "absolute", top: 4, right: 6, fontSize: "0.55rem", opacity: 0.7 }}></i>
                          </div>
                          <div className="sp-tc-inner sp-tc-inner-light" style={{ position: "absolute", right: 12, bottom: 12 }}>
                            <span className="sp-tc-aa" style={{ color: "#1d1d1f" }}>Aa</span>
                            <i className="fa-solid fa-sun" style={{ position: "absolute", top: 4, right: 6, fontSize: "0.55rem", opacity: 0.7, color: "#e09417" }}></i>
                            {themeMode === "auto" && (
                              <span className="sp-tc-check"><i className="fa-solid fa-check"></i></span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className={`sp-tc-inner sp-tc-inner-${opt.preview}`}>
                          <span className="sp-tc-aa"
                            style={{ color: opt.value === "light" ? "#1d1d1f" : "#f5f5f7" }}
                          >Aa</span>
                          {themeMode === opt.value && (
                            <span className="sp-tc-check"><i className="fa-solid fa-check"></i></span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="sp-tc-label">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Auto schedule time inputs — only shown when auto is selected */}
              {themeMode === "auto" && (
                <div className="sp-field" style={{ marginTop: "1.5rem" }}>
                  <label className="sp-field-label" style={{ marginBottom: "0.75rem" }}>Auto Schedule Configuration</label>
                  
                  {/* Preset Selector Chips */}
                  <div className="sp-preset-grid">
                    {HOUR_PRESETS.map((preset) => {
                      const isActive = themeAutoStartHour === preset.start && themeAutoEndHour === preset.end;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          className={`sp-preset-chip${isActive ? " active" : ""}`}
                          onClick={() => {
                            setThemeAutoStartHour(preset.start);
                            setThemeAutoEndHour(preset.end);
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Time dropdowns */}
                  <div className="sp-time-grid">
                    <div className="sp-field">
                      <label className="sp-field-label">Light mode starts</label>
                      <select
                        className="sp-select"
                        value={themeAutoStartHour}
                        onChange={(e) => setThemeAutoStartHour(Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>
                            {formatHour(h)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sp-field">
                      <label className="sp-field-label">Dark mode starts</label>
                      <select
                        className="sp-select"
                        value={themeAutoEndHour}
                        onChange={(e) => setThemeAutoEndHour(Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>
                            {formatHour(h)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Timeline Visualizer */}
                  <div className="sp-timeline-container">
                    <div className="sp-timeline-header-row">
                      <div className="sp-timeline-title">Active Schedule Overview</div>
                      <div className="sp-timeline-legend">
                        <div className="sp-legend-item">
                          <span className="sp-legend-dot light"></span>
                          <span>Light</span>
                        </div>
                        <div className="sp-legend-item">
                          <span className="sp-legend-dot dark"></span>
                          <span>Dark</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="sp-timeline-track">
                      {Array.from({ length: 24 }).map((_, h) => {
                        const light = isLightHour(h, themeAutoStartHour, themeAutoEndHour);
                        return (
                          <div
                            key={h}
                            className={`sp-timeline-segment ${light ? "light" : "dark"}`}
                            title={`${formatHour(h)}: ${light ? "Light" : "Dark"} Mode active`}
                          />
                        );
                      })}
                    </div>

                    <div className="sp-timeline-labels">
                      <span>12 AM</span>
                      <span>6 AM</span>
                      <span>12 PM</span>
                      <span>6 PM</span>
                      <span>12 AM</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="sp-btn-primary"
                    style={{ width: "fit-content" }}
                    onClick={handleAppearanceSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save schedule"}
                  </button>
                </div>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* ── Tab: Account ──────────────────────────── */}
      {activeTab === "account" && (
        <div className="sp-panels">
          <div className="sp-panel">
            <Section title="Display name" accent="var(--accent-teal)">
              <form onSubmit={handleSave} className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Full name</label>
                  <input
                    className="sp-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-field-label">Email address</label>
                  <input
                    className="sp-input sp-input-disabled"
                    value={user?.email || ""}
                    disabled
                  />
                  <span className="sp-field-hint">Email cannot be changed.</span>
                </div>
                <div className="sp-form-footer">
                  <button type="submit" className="sp-btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  {saved && <span className="sp-saved-msg"><i className="fa-solid fa-check"></i> Saved</span>}
                </div>
              </form>
            </Section>
          </div>

          <div className="sp-panel">
            <Section title="Change password" accent="var(--accent-blue)">
              <form onSubmit={handlePasswordChange} className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Current password</label>
                  <input
                    className="sp-input"
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-field-label">New password</label>
                  <input
                    className="sp-input"
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-field-label">Confirm new password</label>
                  <input
                    className="sp-input"
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </div>
                {pwError && <p className="sp-error-msg"><i className="fa-solid fa-circle-exclamation"></i>{pwError}</p>}
                <div className="sp-form-footer">
                  <button type="submit" className="sp-btn-primary" disabled={pwSaving}>
                    {pwSaving ? "Updating…" : "Update password"}
                  </button>
                  {pwSaved && <span className="sp-saved-msg"><i className="fa-solid fa-check"></i> Password updated</span>}
                </div>
              </form>
            </Section>
          </div>

          <div className="sp-panel">
            <Section title="Google Calendar" accent="var(--accent-teal)">
              <p className="sp-panel-desc">
                Link your Google Account to enable calendar sync for your reminders.
              </p>
              <div className="sp-info-card">
                <div className="sp-info-card-row">
                  <div className="sp-info-card-left">
                    <i className="fa-solid fa-calendar-days sp-info-card-icon"></i>
                    <div>
                      <div className="sp-danger-title">Google Calendar Sync</div>
                      <div className="sp-danger-desc">
                        {user?.googleCalendarConnected 
                          ? "Connected and ready to sync." 
                          : "Connect your Google Account to enable calendar sync."}
                      </div>
                    </div>
                  </div>
                  <span className={`sp-status-badge${user?.googleCalendarConnected ? " connected" : ""}`}>
                    {user?.googleCalendarConnected ? "CONNECTED" : "DISCONNECTED"}
                  </span>
                </div>

                <div className="sp-info-card-actions">
                  {user?.googleCalendarConnected ? (
                    <button 
                      type="button" 
                      className="sp-btn-secondary sp-btn-danger-outline" 
                      onClick={handleDisconnectCalendar}
                      disabled={saving}
                    >
                      Disconnect Calendar
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="sp-btn-primary" 
                      onClick={handleConnectCalendar}
                      disabled={saving}
                    >
                      Connect Google Calendar
                    </button>
                  )}
                </div>
              </div>
            </Section>
          </div>

          <div className="sp-panel">
            <Section title="Danger zone" accent="var(--accent-coral)">
              <p className="sp-panel-desc">
                Permanently delete your account and all data. This action cannot be undone.
              </p>
              <div className="sp-danger-card">
                <div className="sp-danger-info">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <div>
                    <div className="sp-danger-title">Delete account</div>
                    <div className="sp-danger-desc">All your notes, notebooks, tasks and reminders will be erased forever.</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="sp-btn-danger"
                  onClick={() => window.alert("Account deletion is not yet implemented. Add a confirmation flow before wiring this up.")}
                >
                  Delete my account
                </button>
              </div>
              <div className="sp-danger-card sp-danger-card-stacked">
                <div className="sp-danger-info">
                  <i className="fa-solid fa-right-from-bracket" style={{ color: "var(--accent-amber)" }}></i>
                  <div>
                    <div className="sp-danger-title">Sign out</div>
                    <div className="sp-danger-desc">Log out from this device.</div>
                  </div>
                </div>
                <button type="button" className="sp-btn-secondary" onClick={handleLogoutClick}>
                  Sign out
                </button>
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ── Tab: AI Settings ──────────────────────── */}
      {activeTab === "ai" && (
        <div className="sp-panels">
          <div className="sp-panel">
            <Section title="API Configuration" accent="var(--accent-teal)">
              <p className="sp-panel-desc">
                CubicNotes includes 5 free daily AI actions. To unlock unlimited requests and enjoy faster response times, you can configure your own Google Gemini API Key below.
              </p>
              <form onSubmit={handleSaveAiKey} className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Google Gemini API Key</label>
                  <input
                    className="sp-input"
                    type="password"
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    placeholder={hasCustomKey ? "••••••••••••••••••••••••••••••••••••" : "Enter your Google Gemini API Key"}
                    autoComplete="off"
                  />
                  <span className="sp-field-hint">
                    Get an API key for free from the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="sp-hint-link">Google AI Studio</a>.
                  </span>
                </div>
                {hasCustomKey && (
                  <div className="sp-status-indicator">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Custom key is active (Unlimited access)</span>
                  </div>
                )}
                <div className="sp-form-footer">
                  <button type="submit" className="sp-btn-primary" disabled={aiSaving}>
                    {aiSaving ? "Saving…" : "Save API Key"}
                  </button>
                  {hasCustomKey && (
                    <button type="button" className="sp-btn-secondary" onClick={handleClearAiKey} disabled={aiSaving}>
                      Remove key
                    </button>
                  )}
                  {aiSaved && <span className="sp-saved-msg"><i className="fa-solid fa-check"></i> Updated</span>}
                </div>
              </form>
            </Section>
          </div>

          <div className="sp-panel">
            <Section title="Usage & Credits" accent="var(--accent-purple)">
              <p className="sp-panel-desc">
                Tracks your daily free AI actions. Free tier resets automatically every midnight.
              </p>
              <div className="sp-usage-card">
                <div className="sp-usage-row">
                  <span className="sp-usage-label">Free Tier Usage</span>
                  <span className={`sp-usage-value${hasCustomKey ? " unlimited" : ""}`}>
                    {hasCustomKey ? "Unlimited" : `${aiCredits !== null ? aiCredits : "5"} / 5 remaining`}
                  </span>
                </div>
                {!hasCustomKey && (
                  <div className="sp-usage-bar-track">
                    <div
                      className={`sp-usage-bar-fill${(aiCredits || 0) <= 1 ? " low" : ""}`}
                      style={{ width: `${((aiCredits !== null ? aiCredits : 5) / 5) * 100}%` }}
                    ></div>
                  </div>
                )}
                <p className="sp-usage-note">
                  {hasCustomKey 
                    ? "You are using your own API Key. No daily usage limits or actions limit apply to your account."
                    : "You are currently on the free tier. Enter a custom key on the left to bypass this limit completely."}
                </p>
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ── Tab: Activity ─────────────────────────── */}
      {activeTab === "activity" && (
        <div className="sp-panels sp-panels-single sp-panels-activity">
          <div className="sp-panel sp-panel-heatmap">
            <Section title="Activity Calendar" accent="var(--accent-teal)">
              <p className="sp-panel-desc">
                Your activity heatmap tracking notes created and tasks completed over the last 6 months.
              </p>
              {activityLoading ? (
                <div className="sp-heatmap-skeleton-loader skeleton-pulse"></div>
              ) : (
                <div className="settings-heatmap-card">
                  {/* Left Panel: Calendar Grid & Title */}
                  <div className="heatmap-left-panel">
                    <div className="heatmap-months-wrapper">
                      {heatmapMonths.map((month, mIdx) => (
                        <div key={mIdx} className="heatmap-month-block">
                          <div className="heatmap-month-name">{month.monthName} {month.year}</div>
                          <div className="heatmap-month-body">
                            <div className="heatmap-weekdays">
                              <span>S</span>
                              <span>M</span>
                              <span>T</span>
                              <span>W</span>
                              <span>T</span>
                              <span>F</span>
                              <span>S</span>
                            </div>
                            <div className="heatmap-grid">
                              {month.days.map((day, dIdx) => {
                                if (day.isPadding) {
                                  return <div key={`pad-${dIdx}`} className="heatmap-cell padding" />;
                                }
                                const count = activityData[day.dateStr] || 0;
                                const level = getIntensityLevel(count);
                                const formattedDate = day.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                
                                return (
                                  <div
                                    key={day.dateStr}
                                    className={`heatmap-cell level-${level}`}
                                    title={`${count} activity${count === 1 ? "" : "ies"} on ${formattedDate}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Panel: Insights & Breakdown */}
                  <div className="heatmap-stats-col">
                    <div className="heatmap-stats-card">
                      <div className="heatmap-stats-header">
                        <i className="fa-solid fa-chart-line"></i>
                        <span>Insights &amp; Analytics</span>
                      </div>
                      
                      <div className="heatmap-stats-grid">
                        <div className="heatmap-stats-subcol">
                          <div className="heatmap-stat-box">
                            <span className="heatmap-stat-lbl">Total Contributions</span>
                            <span className="heatmap-stat-val highlight">{streakStats.total}</span>
                          </div>
                          
                          <div className="heatmap-breakdown-box">
                            <div className="heatmap-breakdown-item">
                              <span className="breakdown-dot note-dot"></span>
                              <span className="breakdown-name">Notes Created</span>
                              <span className="breakdown-val">{breakdown.notes}</span>
                            </div>
                            <div className="heatmap-breakdown-item">
                              <span className="breakdown-dot task-dot"></span>
                              <span className="breakdown-name">Tasks Completed</span>
                              <span className="breakdown-val">{breakdown.tasks}</span>
                            </div>
                          </div>
                        </div>

                        <div className="heatmap-stats-v-divider"></div>

                        <div className="heatmap-stats-subcol justify-between">
                          <div className="heatmap-stats-row">
                            <div className="heatmap-stat-box">
                              <span className="heatmap-stat-lbl">Current Streak</span>
                              <span className="heatmap-stat-val">{streakStats.currentStreak} day{streakStats.currentStreak === 1 ? "" : "s"}</span>
                            </div>
                            <div className="heatmap-stat-box">
                              <span className="heatmap-stat-lbl">Max Streak</span>
                              <span className="heatmap-stat-val">{streakStats.maxStreak} day{streakStats.maxStreak === 1 ? "" : "s"}</span>
                            </div>
                          </div>

                          <div className="heatmap-legend-container">
                            <span className="heatmap-legend-lbl">Activity Level</span>
                            <div className="heatmap-legend">
                              <span>Less</span>
                              <div className="heatmap-cell level-0" />
                              <div className="heatmap-cell level-1" />
                              <div className="heatmap-cell level-2" />
                              <div className="heatmap-cell level-3" />
                              <div className="heatmap-cell level-4" />
                              <span>More</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </Section>
          </div>
        </div>
      )}
      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

export default SettingsPage;