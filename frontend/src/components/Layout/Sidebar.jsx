import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useGhostGuard } from "../../hooks/useGhostGuard";
import { useContext, useState, useEffect, useRef, useMemo } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import ConfirmationModal from "../UI/ConfirmationModal";
import "../../assets/styles/components/sidebar.css";

/* resolve avatarPreset -> image src */
const AVATAR_SRCS = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [
    `avatar-${i + 1}`,
    new URL(`../../assets/images/avatars/avatar-${i + 1}.png`, import.meta.url).href,
  ])
);
const getPresetSrc = (preset, googleUrl) => {
  if (!preset || preset === "avatar-1") return AVATAR_SRCS["avatar-1"];
  if (preset === "google") return googleUrl || null;
  return AVATAR_SRCS[preset] || AVATAR_SRCS["avatar-1"];
};

const NAV_ITEMS = [
  { to: "/",          icon: "fa-solid fa-table-columns", label: "Dashboard" },
  { to: "/notes",      icon: "fa-solid fa-note-sticky",   label: "Notes" },
  { to: "/notebooks",  icon: "fa-solid fa-folder",        label: "Notebooks" },
  { to: "/tasks",      icon: "fa-solid fa-list-check",    label: "Tasks" },
  { to: "/reminders",  icon: "fa-solid fa-bell",          label: "Reminders" },
  { to: "/bin",        icon: "fa-solid fa-trash-can",     label: "Trash Bin" },
];

/**
 * Icon-rail sidebar that expands to show labels on hover (pure CSS, via
 * .sidebar:hover in theme.css — no JS needed for that on desktop).
 *
 * Touch devices have no real :hover state, so below the 768px breakpoint we
 * fall back to JS: a tap on the rail toggles `.sidebar.expanded`, tapping
 * outside the sidebar (or navigating to a new route) collapses it again.
 * `data-mobile-expanded` mirrors `expanded` only on mobile so the CSS hover
 * rule and this tap rule never fight each other on desktop.
 */
const Sidebar = ({ mobileExpanded, setMobileExpanded }) => {
  const { user, logout } = useAuth();
  const { guardAction, isGhost } = useGhostGuard();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const handleLogoutClick = (e) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: "Log Out?",
      message: "Are you sure you want to log out of your account?",
      confirmLabel: "Log Out",
      variant: "danger",
      onConfirm: () => {
        setConfirmConfig({ isOpen: false });
        logout();
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const sidebarRef = useRef(null);

  // Collapse on every route change (e.g. after tapping a nav link)
  useEffect(() => {
    setMobileExpanded(false);
  }, [location.pathname]);

  // Collapse when tapping/clicking anywhere outside the sidebar
  useEffect(() => {
    const handleOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMobileExpanded(false);
      }
    };
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarAvatarSrc = useMemo(
    () => getPresetSrc(user?.avatarPreset, user?.avatar),
    [user?.avatarPreset, user?.avatar]
  );

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar${mobileExpanded ? " mobile-expanded" : ""}`}
      onClick={() => setMobileExpanded((prev) => !prev)}
    >
      {/* ── Logo ──────────────────────────────── */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-mark">
          <i className="fa-solid fa-note-sticky"></i>
        </span>
        <span className="sidebar-label sidebar-logo-name">CubicNotes</span>
      </div>

      {/* ── Nav links ─────────────────────────── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            title={item.label}
          >
            <i className={item.icon}></i>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Footer: profile + theme toggle + logout (or Sign In for ghost) ───────── */}
      <div className="sidebar-footer">
        {isGhost ? (
          /* Ghost user footer — Sign In prompt */
          <>
            <div
              className="sidebar-profile"
              onClick={(e) => { e.stopPropagation(); guardAction(() => {}); }}
              title="Sign in to CubicNotes"
              style={{ cursor: "pointer" }}
            >
              <div className="sidebar-avatar">
                <i className="fa-solid fa-user" style={{ fontSize: "0.7rem" }}></i>
              </div>
              <div className="sidebar-profile-info sidebar-label">
                <div className="sidebar-profile-name">Guest</div>
                <div className="sidebar-profile-email">Browsing as guest</div>
              </div>
            </div>

            <button
              className="theme-toggle-btn"
              onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              <i className={theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
              <span className="sidebar-label">{theme === "light" ? "Light mode" : "Dark mode"}</span>
            </button>

            <div
              className="logout-btn"
              onClick={(e) => { e.stopPropagation(); guardAction(() => {}); }}
              title="Sign in"
              style={{ color: "var(--accent-teal)" }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket"></i>
              <span className="sidebar-label">Sign in</span>
            </div>
          </>
        ) : (
          /* Authenticated user footer */
          <>
            <NavLink to="/settings" className="sidebar-profile" title={user?.name || "Account"}>
              {sidebarAvatarSrc ? (
                <img src={sidebarAvatarSrc} alt={user?.name} className="sidebar-avatar" style={{ objectFit: "cover" }} />
              ) : (
                <div className="sidebar-avatar" style={{ backgroundColor: "var(--accent-teal)" }}>
                  {initials || "?"}
                </div>
              )}
              <div className="sidebar-profile-info sidebar-label">
                <div className="sidebar-profile-name">{user?.name || "Guest"}</div>
                <div className="sidebar-profile-email">{user?.email || ""}</div>
              </div>
            </NavLink>

            <button
              className="theme-toggle-btn"
              onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              <i className={theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
              <span className="sidebar-label">{theme === "light" ? "Light mode" : "Dark mode"}</span>
            </button>

            <div className="logout-btn" onClick={handleLogoutClick} title="Log out">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              <span className="sidebar-label">Log out</span>
            </div>
          </>
        )}
      </div>
      <ConfirmationModal {...confirmConfig} />
    </aside>
  );
};

export default Sidebar;