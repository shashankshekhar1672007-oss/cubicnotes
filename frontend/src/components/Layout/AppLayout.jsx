import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ReminderToast from "../Reminders/ReminderToast";
import SearchModal from "../UI/SearchModal";
import "../../assets/styles/layout/app-shell.css";

/**
 * Wraps every page in the sidebar + topbar shell.
 * Both authenticated and ghost (unauthenticated) users see this layout.
 */
const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isGhost = !user;

  // Global keydown listeners for shortcuts (disabled for ghost users)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isGhost) return; // Silently do nothing for ghost users

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K: Toggle Search Modal
      if (modifier && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      // Cmd/Ctrl + N: New Note
      if (modifier && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/notes", { state: { createNew: true } });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isGhost]);

  // /notebooks/:notebookId is the document workspace — it has its own
  // "filter pages" control, so the global topbar (search + breadcrumb) is
  // redundant there. Checking the route here (rather than via CSS :has())
  // means the topbar never mounts in the first place — no flash on load.
  const isNotebookWorkspace = /^\/notebooks\/[^/]+$/.test(location.pathname);

  return (
    <div className="app-shell">
      <Sidebar mobileExpanded={mobileSidebarOpen} setMobileExpanded={setMobileSidebarOpen} />
      <div className="app-main">
        {!isNotebookWorkspace && (
          <Topbar 
            onSearchClick={() => !isGhost && setSearchOpen(true)} 
            onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          />
        )}
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      {mobileSidebarOpen && (
        <div className="app-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      {/* Skip reminder polling and search for ghost users */}
      {!isGhost && <ReminderToast />}
      {!isGhost && <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-sans)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
          },
          success: {
            iconTheme: {
              primary: 'var(--accent-teal)',
              secondary: 'var(--bg-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--accent-coral)',
              secondary: 'var(--bg-surface)',
            },
          },
        }}
      />
    </div>
  );
};

export default AppLayout;