import { useLocation } from "react-router-dom";
import { useGhostGuard } from "../../hooks/useGhostGuard";
import "../../assets/styles/components/topbar.css";

const PAGE_TITLES = {
  "/":          "Dashboard",
  "/notes":     "Notes",
  "/notebooks": "Notebooks",
  "/tasks":     "Tasks",
  "/reminders": "Reminders",
  "/settings":  "Settings",
};

/**
 * Global topbar. `onSearch` is optional — pass it from a page that wants
 * search wired to its own filtering logic (e.g. NotesPage).
 *
 * Note: this component isn't rendered at all on /notebooks/:notebookId —
 * see AppLayout.jsx, which skips it for that route — so no internal
 * route-checking is needed here anymore.
 */
const Topbar = ({ onSearchClick, searchPlaceholder = "Search everything...", onToggleSidebar }) => {
  const location = useLocation();
  const { guardAction, isGhost } = useGhostGuard();
  const title = PAGE_TITLES[location.pathname] || "CubicNotes";

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcutText = isMac ? "⌘K" : "Ctrl+K";

  return (
    <header className="topbar">
      <button 
        type="button" 
        className="topbar-sidebar-toggle" 
        onClick={onToggleSidebar}
        title="Open navigation menu"
        aria-label="Open navigation menu"
      >
        <i className="fa-solid fa-bars"></i>
      </button>
      <span className="topbar-breadcrumb">{title}</span>

      <div className="topbar-search" onClick={onSearchClick} style={{ cursor: "pointer" }}>
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          placeholder={searchPlaceholder}
          readOnly
          style={{ cursor: "pointer" }}
        />
        <span className="search-shortcut">{shortcutText}</span>
      </div>

      <div className="topbar-actions">
        {isGhost && (
          <div
            className="topbar-ghost-badge"
            onClick={() => guardAction(() => {})}
            title="Browse mode only. Click to register or log in."
          >
            <i className="fa-solid fa-ghost"></i>
            <span>Guest Mode</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;