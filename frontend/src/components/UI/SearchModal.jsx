import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import { stripMarkdown } from "../../utils/parseMarkdown";
import { useGhostGuard } from "../../hooks/useGhostGuard";
import { GHOST_NOTES, GHOST_TASKS, GHOST_REMINDERS } from "../../data/ghostDemoData";
import "../../assets/styles/components/search-modal.css";

const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ notes: [], tasks: [], reminders: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults({ notes: [], tasks: [], reminders: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const { isGhost } = useGhostGuard();

  // Fetch results on debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ notes: [], tasks: [], reminders: [] });
      setLoading(false);
      return;
    }

    if (isGhost) {
      const q = debouncedQuery.toLowerCase();
      const notes = GHOST_NOTES.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
      const tasks = GHOST_TASKS.filter(
        (t) => t.title.toLowerCase().includes(q)
      );
      const reminders = GHOST_REMINDERS.filter(
        (r) => r.title.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
      );
      setResults({ notes, tasks, reminders });
      setSelectedIndex(0);
      setLoading(false);
      return;
    }

    const fetchSearch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/search", { params: { q: debouncedQuery } });
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSearch();
  }, [debouncedQuery, isGhost]);

  // Flatten results for index-based keyboard navigation
  const flatResults = [
    ...results.notes.map((item) => ({ ...item, type: "note" })),
    ...results.tasks.map((item) => ({ ...item, type: "task" })),
    ...results.reminders.map((item) => ({ ...item, type: "reminder" })),
  ];

  // Handle result selection action
  const handleSelect = (item) => {
    onClose();
    if (item.type === "note") {
      navigate("/notes", { state: { noteId: item._id, mode: isGhost ? "preview" : "edit" } });
    } else if (item.type === "task") {
      navigate("/tasks");
    } else if (item.type === "reminder") {
      navigate("/reminders");
    }
  };

  // Keyboard navigation logic
  useEffect(() => {
    if (!isOpen) return;

    const handleKeys = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (flatResults.length > 0 ? (prev + 1) % flatResults.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (flatResults.length > 0 ? (prev - 1 + flatResults.length) % flatResults.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [isOpen, flatResults, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-card" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <button 
            type="button" 
            className="search-back-btn" 
            onClick={onClose}
            title="Go back"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <i className="fa-solid fa-magnifying-glass search-input-icon"></i>
          <input
            ref={inputRef}
            type="text"
            className="search-input-field"
            placeholder="Search notes, tasks, reminders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="search-close-hint">ESC</span>
        </div>
        {/* Results Body */}
        <div className="search-body scroll-thin">
          {loading && (
            <div className="search-loading-state">
              <span className="saving-pulse"></span>
              Searching knowledge base...
            </div>
          )}

          {!loading && query.trim() && flatResults.length === 0 && (
            <div className="search-empty-state">
              <i className="fa-regular fa-folder-open"></i>
              <p>No results found for "{query}"</p>
            </div>
          )}

          {!query.trim() && (
            <div className="search-instructions">
              <div className="search-instruction-title">Quick Search</div>
              <p>Type keywords to search across notes content, tasks checklist, and reminder descriptions.</p>
              <div className="search-shortcuts-tips">
                <div><kbd>↑↓</kbd> to navigate</div>
                <div><kbd>Enter</kbd> to open</div>
              </div>
            </div>
          )}

          {!loading && flatResults.length > 0 && (
            <div className="search-results-list">
              {/* Notes Category */}
              {results.notes.length > 0 && (
                <div className="search-category-section">
                  <div className="search-category-title">Notes</div>
                  {results.notes.map((note) => {
                    const globalIdx = flatResults.findIndex((item) => item._id === note._id && item.type === "note");
                    const isActive = globalIdx === selectedIndex;
                    return (
                      <div
                        key={note._id}
                        className={`search-result-item ${isActive ? "active" : ""}`}
                        onClick={() => handleSelect({ ...note, type: "note" })}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="search-result-icon note-type">
                          <i className="fa-solid fa-file-lines"></i>
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-title">{note.title || "Untitled Note"}</div>
                          <div className="search-result-preview">
                            {note.subheading && <span className="subheading-span">{note.subheading} — </span>}
                            {stripMarkdown(note.content).slice(0, 85) || "Empty note"}
                          </div>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="search-result-tags">
                            {note.tags.map((t) => (
                              <span key={t} className="search-result-tag">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tasks Category */}
              {results.tasks.length > 0 && (
                <div className="search-category-section">
                  <div className="search-category-title">Tasks</div>
                  {results.tasks.map((task) => {
                    const globalIdx = flatResults.findIndex((item) => item._id === task._id && item.type === "task");
                    const isActive = globalIdx === selectedIndex;
                    return (
                      <div
                        key={task._id}
                        className={`search-result-item ${isActive ? "active" : ""}`}
                        onClick={() => handleSelect({ ...task, type: "task" })}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="search-result-icon task-type">
                          <i className={`fa-regular ${task.isCompleted ? "fa-circle-check" : "fa-circle"}`}></i>
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-title" style={task.isCompleted ? { textDecoration: "line-through", opacity: 0.6 } : {}}>
                            {task.title}
                          </div>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="search-result-preview">
                              {task.subtasks.length} subtask{task.subtasks.length === 1 ? "" : "s"} ({task.subtasks.filter(s => s.completed).length} completed)
                            </div>
                          )}
                        </div>
                        <div className={`search-result-priority priority-${task.priority}`}>
                          {task.priority}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reminders Category */}
              {results.reminders.length > 0 && (
                <div className="search-category-section">
                  <div className="search-category-title">Reminders</div>
                  {results.reminders.map((rem) => {
                    const globalIdx = flatResults.findIndex((item) => item._id === rem._id && item.type === "reminder");
                    const isActive = globalIdx === selectedIndex;
                    return (
                      <div
                        key={rem._id}
                        className={`search-result-item ${isActive ? "active" : ""}`}
                        onClick={() => handleSelect({ ...rem, type: "reminder" })}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="search-result-icon reminder-type">
                          <i className="fa-regular fa-bell"></i>
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-title">{rem.title}</div>
                          {rem.description && (
                            <div className="search-result-preview">{rem.description.slice(0, 85)}</div>
                          )}
                        </div>
                        <div className="search-result-meta">
                          {new Date(rem.triggerTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
