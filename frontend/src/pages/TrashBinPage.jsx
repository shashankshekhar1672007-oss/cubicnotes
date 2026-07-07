import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Button from "../components/UI/Button";
import { parseMarkdown } from "../utils/parseMarkdown";
import { timeAgo } from "../utils/formatDate";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { useAuth } from "../hooks/useAuth";
import { GHOST_TRASHED_NOTES, GHOST_TRASHED_TASKS } from "../data/ghostDemoData";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import "../assets/styles/pages/trash.css";
import "../assets/styles/components/note-card.css";
import "../assets/styles/components/task-list.css";

const fetchTrashedNotes = async () => {
  const { data } = await api.get("/notes", { params: { trashed: "true" } });
  return data;
};

const fetchTrashedTasks = async () => {
  const { data } = await api.get("/tasks", { params: { trashed: "true" } });
  return data;
};

const getDateLabel = (dateStr) => {
  if (!dateStr) return "No date";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const groupByDate = (items, dateField = "updatedAt") => {
  const groups = [];
  const seen   = new Map();

  for (const item of items) {
    const val = item[dateField] || item.createdAt;
    const label = getDateLabel(val);
    if (!seen.has(label)) {
      seen.set(label, []);
      groups.push({ label, items: seen.get(label) });
    }
    seen.get(label).push(item);
  }
  return groups;
};

const TrashBinPage = () => {
  const queryClient = useQueryClient();
  const { guardAction, isGhost } = useGhostGuard();
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("notes");
  const [selectedIds, setSelectedIds] = useState([]);

  const touchTimerRef = useRef(null);
  const touchActiveIdRef = useRef(null);
  const isLongPressRef = useRef(false);
  const ignoreNextClickRef = useRef(null);

  const handleTouchStart = (id) => {
    isLongPressRef.current = false;
    touchActiveIdRef.current = id;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      ignoreNextClickRef.current = id;
      handleToggleSelect(id);
    }, 600);
  };

  const handleTouchEnd = (id, e) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    if (isLongPressRef.current) {
      setTimeout(() => {
        ignoreNextClickRef.current = null;
      }, 300);
    }
  };

  const { data: serverTrashedNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["trashedNotes"],
    queryFn: fetchTrashedNotes,
    enabled: !isGhost,
  });

  const { data: serverTrashedTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["trashedTasks"],
    queryFn: fetchTrashedTasks,
    enabled: !isGhost,
  });

  const trashedNotes = isGhost ? GHOST_TRASHED_NOTES : serverTrashedNotes;
  const trashedTasks = isGhost ? GHOST_TRASHED_TASKS : serverTrashedTasks;

  // Sort descending by date deleted (updatedAt)
  const sortedNotes = useMemo(() => {
    return [...trashedNotes].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [trashedNotes]);

  const sortedTasks = useMemo(() => {
    return [...trashedTasks].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [trashedTasks]);

  // Group by date
  const groupedNotes = useMemo(() => groupByDate(sortedNotes, "updatedAt"), [sortedNotes]);
  const groupedTasks = useMemo(() => groupByDate(sortedTasks, "updatedAt"), [sortedTasks]);

  const activeItems = activeTab === "notes" ? trashedNotes : trashedTasks;

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === activeItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeItems.map((item) => item._id));
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return;
    guardAction(async () => {
      const loadingToast = toast.loading(`Restoring ${selectedIds.length} items...`);
      try {
        const endpoint = activeTab === "notes" ? "/notes" : "/tasks";
        await Promise.all(
          selectedIds.map((id) => api.put(`${endpoint}/${id}/restore`))
        );
        toast.dismiss(loadingToast);
        toast.success(`Restored ${selectedIds.length} items successfully!`);
        setSelectedIds([]);
        queryClient.invalidateQueries({ queryKey: [activeTab === "notes" ? "trashedNotes" : "trashedTasks"] });
        queryClient.invalidateQueries({ queryKey: [activeTab === "notes" ? "notes" : "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Failed to restore some items.");
      }
    });
  };

  const handleDeleteSelectedPermanent = () => {
    if (selectedIds.length === 0) return;
    showConfirm({
      title: "Permanently Delete Selected Items?",
      message: `Are you sure you want to permanently delete the ${selectedIds.length} selected items? This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          const loadingToast = toast.loading(`Deleting ${selectedIds.length} items permanently...`);
          try {
            const endpoint = activeTab === "notes" ? "/notes" : "/tasks";
            await Promise.all(
              selectedIds.map((id) =>
                api.delete(`${endpoint}/${id}`, { params: { permanent: "true" } })
              )
            );
            toast.dismiss(loadingToast);
            toast.success("Selected items deleted permanently");
            setSelectedIds([]);
            if (activeTab === "notes") {
              queryClient.invalidateQueries({ queryKey: ["trashedNotes"] });
            } else {
              queryClient.invalidateQueries({ queryKey: ["trashedTasks"] });
            }
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Failed to delete some items.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  // We stub this out so we don't have dual definitions


  const handleRestoreNote = async (id) => {
    guardAction(async () => {
      try {
        await api.put(`/notes/${id}/restore`);
        toast.success("Note restored successfully!");
        queryClient.invalidateQueries({ queryKey: ["trashedNotes"] });
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } catch (err) {
        toast.error("Failed to restore note.");
      }
    });
  };

  const handleDeleteNotePermanent = (id, title) => {
    showConfirm({
      title: "Permanently Delete Note?",
      message: `Are you sure you want to permanently delete "${title}"? This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await api.delete(`/notes/${id}`, { params: { permanent: "true" } });
            toast.success("Note deleted permanently");
            queryClient.invalidateQueries({ queryKey: ["trashedNotes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          } catch (err) {
            toast.error("Failed to delete note.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleRestoreTask = async (id) => {
    guardAction(async () => {
      try {
        await api.put(`/tasks/${id}/restore`);
        toast.success("Task restored successfully!");
        queryClient.invalidateQueries({ queryKey: ["trashedTasks"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } catch (err) {
        toast.error("Failed to restore task.");
      }
    });
  };

  const handleDeleteTaskPermanent = (id, title) => {
    showConfirm({
      title: "Permanently Delete Task?",
      message: `Are you sure you want to permanently delete the task "${title}"? This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await api.delete(`/tasks/${id}`, { params: { permanent: "true" } });
            toast.success("Task deleted permanently");
            queryClient.invalidateQueries({ queryKey: ["trashedTasks"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          } catch (err) {
            toast.error("Failed to delete task.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleEmptyTrash = () => {
    const totalCount = trashedNotes.length + trashedTasks.length;
    if (totalCount === 0) return;
    showConfirm({
      title: "Empty Trash Bin?",
      message: `Are you sure you want to permanently delete all ${totalCount} items in the trash? This action cannot be undone.`,
      confirmLabel: "Empty Trash",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await Promise.all([
              ...trashedNotes.map(n => api.delete(`/notes/${n._id}`, { params: { permanent: "true" } })),
              ...trashedTasks.map(t => api.delete(`/tasks/${t._id}`, { params: { permanent: "true" } }))
            ]);
            toast.success("Trash emptied successfully!");
            queryClient.invalidateQueries({ queryKey: ["trashedNotes"] });
            queryClient.invalidateQueries({ queryKey: ["trashedTasks"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          } catch (err) {
            toast.error("Failed to empty trash.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const hasItems = trashedNotes.length > 0 || trashedTasks.length > 0;

  return (
    <div className={`trash-page${selectedIds.length > 0 ? " selection-active" : ""}`}>
      <header className="trash-header">
        <div>
          <h1 className="page-heading" style={{ marginBottom: 0 }}>Trash Bin</h1>
          <p className="page-subheading">Manage deleted items</p>
        </div>
        {hasItems && (
          <Button
            variant="danger"
            icon="fa-solid fa-trash-arrow-up"
            onClick={handleEmptyTrash}
            className="empty-trash-btn"
          >
            <span className="empty-trash-text">Empty Trash</span>
          </Button>
        )}
      </header>

      {/* Auto-delete Info Banner */}
      <div className="trash-info-banner">
        <i className="fa-solid fa-circle-info"></i>
        <span>
          Items in the trash will be automatically deleted after{" "}
          <strong>{user?.trashRetentionDays ?? 30} days</strong>.
        </span>
      </div>

      {/* Tabs & Select All Row */}
      <div className="task-tabs-row">

        <div className="task-tabs">
          <button
            className={`task-tab${activeTab === "notes" ? " active" : ""}`}
            onClick={() => { setActiveTab("notes"); setSelectedIds([]); }}
          >
            <i className="fa-solid fa-note-sticky"></i>
            Notes ({trashedNotes.length})
          </button>
          <button
            className={`task-tab${activeTab === "tasks" ? " active" : ""}`}
            onClick={() => { setActiveTab("tasks"); setSelectedIds([]); }}
          >
            <i className="fa-solid fa-list-check"></i>
            Tasks ({trashedTasks.length})
          </button>
        </div>
        {activeItems.length > 0 && (
          <button
            type="button"
            className="task-select-all-btn-wrapper"
            onClick={handleSelectAllToggle}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              padding: "0 0.5rem",
            }}
          >
            {activeTab === "tasks" ? (
              <i
                className={selectedIds.length === activeItems.length ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}
                style={{
                  color: selectedIds.length === activeItems.length ? "var(--accent-teal)" : "var(--text-muted)",
                  fontSize: "1.1rem",
                }}
              ></i>
            ) : (
              <input
                type="checkbox"
                className="trash-checkbox"
                checked={selectedIds.length === activeItems.length}
                readOnly
              />
            )}
            <span>Select All ({activeItems.length} items)</span>
          </button>
        )}
      </div>

      <div className="trash-content scrollbar-custom">
        {activeTab === "notes" ? (
          notesLoading ? (
            <div className="trash-notes-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="note-grid-card-skeleton skeleton-loader"></div>
              ))}
            </div>
          ) : trashedNotes.length === 0 ? (
            <div className="trash-empty-state">
              <i className="fa-solid fa-trash-can" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "1rem" }}></i>
              <p>No notes in the trash</p>
            </div>
          ) : (
            <div className="trash-grouped-container">
              {groupedNotes.map(({ label, items: groupNotes }) => (
                <div key={label} className="trash-date-group" style={{ marginBottom: "2rem" }}>
                  <div className="task-date-separator" style={{ marginBottom: "1.25rem" }}>
                    <span className="task-date-separator-label">{label}</span>
                    <span className="task-date-separator-count">{groupNotes.length}</span>
                  </div>
                  <div className="trash-notes-grid">
                    {groupNotes.map((note) => {
                      const contentHTML = parseMarkdown(note.content);
                      const isSelected = selectedIds.includes(note._id);
                      return (
                        <div
                          className={`note-card-grid${isSelected ? " selected" : ""}`}
                          key={note._id}
                          style={{ "--card-accent": note.accent || "var(--accent-teal)" }}
                          onTouchStart={() => handleTouchStart(note._id)}
                          onTouchEnd={(e) => handleTouchEnd(note._id, e)}
                          onMouseDown={() => handleTouchStart(note._id)}
                          onMouseUp={(e) => handleTouchEnd(note._id, e)}
                          onClick={(e) => {
                            if (ignoreNextClickRef.current === note._id) {
                              ignoreNextClickRef.current = null;
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            if (selectedIds.length > 0) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleSelect(note._id);
                            }
                          }}
                        >
                          <div className="ncg-outer-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div className="trash-checkbox-container" style={{ display: "flex", alignItems: "center" }}>
                                <input
                                  type="checkbox"
                                  className="trash-checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(note._id)}
                                />
                              </div>
                              <span className="ncg-category" title={note.title}>{note.title}</span>
                            </div>
                            <div className="ncg-outer-actions" style={{ gap: "6px" }}>
                              <button
                                type="button"
                                className="ncg-outer-btn"
                                title="Restore Note"
                                onClick={() => handleRestoreNote(note._id)}
                                style={{ color: "var(--text-secondary)", cursor: "pointer" }}
                              >
                                <i className="fa-solid fa-rotate-left"></i>
                              </button>
                              <button
                                type="button"
                                className="ncg-outer-btn danger"
                                title="Delete Permanently"
                                onClick={() => handleDeleteNotePermanent(note._id, note.title)}
                                style={{ color: "var(--accent-coral)", cursor: "pointer" }}
                              >
                                <i className="fa-regular fa-trash-can"></i>
                              </button>
                            </div>
                          </div>
                          <div className="note-card-grid-inner" style={{ cursor: "default" }}>
                            {note.tags?.length > 0 && (
                              <div className="ncg-tags">
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="ncg-tag">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {note.subheading && (
                              <h4 className="ncg-subheading" title={note.subheading}>
                                {note.subheading}
                              </h4>
                            )}
                            {note.content ? (
                              <div
                                className="ncg-preview"
                                dangerouslySetInnerHTML={{ __html: contentHTML }}
                              />
                            ) : (
                              <div className="ncg-preview empty">No content</div>
                            )}
                            <div className="ncg-inner-footer">
                              <span className="ncg-date">Deleted {timeAgo(note.updatedAt || note.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          tasksLoading ? (
            <div className="task-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="task-item skeleton-loader" style={{ height: "52px", borderRadius: "var(--radius-md)" }}></div>
              ))}
            </div>
          ) : trashedTasks.length === 0 ? (
            <div className="trash-empty-state">
              <i className="fa-solid fa-trash-can" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "1rem" }}></i>
              <p>No tasks in the trash</p>
            </div>
          ) : (
            <div className="trash-grouped-container">
              {groupedTasks.map(({ label, items: groupTasks }) => (
                <div key={label} className="trash-date-group" style={{ marginBottom: "2rem" }}>
                  <div className="task-date-separator" style={{ marginBottom: "1.25rem" }}>
                    <span className="task-date-separator-label">{label}</span>
                    <span className="task-date-separator-count">{groupTasks.length}</span>
                  </div>
                  <div className="task-list">
                    {groupTasks.map((task) => {
                      const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
                      const totalSubtasks     = task.subtasks?.length || 0;
                      const progress          = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                      const getPriorityColor = (prio) => {
                        if (prio === "high") return "var(--accent-coral)";
                        if (prio === "medium") return "var(--accent-amber)";
                        return "var(--accent-teal)";
                      };
                      const isSelected = selectedIds.includes(task._id);
                      return (
                        <div 
                          className="task-item-row-wrapper" 
                          style={{ display: "flex", alignItems: "center", gap: "0.85rem", width: "100%" }}
                          onTouchStart={() => handleTouchStart(task._id)}
                          onTouchEnd={(e) => handleTouchEnd(task._id, e)}
                          onMouseDown={() => handleTouchStart(task._id)}
                          onMouseUp={(e) => handleTouchEnd(task._id, e)}
                          onClick={(e) => {
                            if (ignoreNextClickRef.current === task._id) {
                              ignoreNextClickRef.current = null;
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            if (selectedIds.length > 0) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleSelect(task._id);
                            }
                          }}
                        >
                          <div className="task-select-circle-btn-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "100%", flexShrink: 0 }}>
                            <button
                              type="button"
                              className={`task-select-circle-btn${isSelected ? " selected" : ""}`}
                              onClick={() => handleToggleSelect(task._id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: isSelected ? "var(--accent-teal)" : "var(--text-muted)",
                                cursor: "pointer",
                                fontSize: "1.1rem",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "color 0.15s, transform 0.15s",
                                flexShrink: 0,
                              }}
                              title={isSelected ? "Deselect task" : "Select task"}
                            >
                              <i className={isSelected ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}></i>
                            </button>
                          </div>
                          <div
                            className={`task-item${task.isCompleted ? " task-item-done" : ""}${isSelected ? " task-item-selected" : ""}`}
                            key={task._id}
                            style={{ "--card-accent": getPriorityColor(task.priority), flex: 1, minWidth: 0 }}
                          >
                            <div className="task-item-content">
                              <div className={`task-item-text${task.isCompleted ? " completed" : ""}`}>
                                {task.title}
                              </div>
                              <div className="task-item-meta">
                                <span className="task-priority-badge" style={{ background: `color-mix(in srgb, var(--card-accent) 12%, transparent)`, color: `var(--card-accent)` }}>
                                  {task.priority}
                                </span>
                                <span className="task-item-date">
                                  <i className="fa-regular fa-calendar"></i>
                                  Deleted {timeAgo(task.updatedAt || task.createdAt)}
                                </span>
                                {totalSubtasks > 0 && (
                                  <span className="task-subtask-toggle" style={{ cursor: "default" }}>
                                    Subtasks: {completedSubtasks}/{totalSubtasks} ({Math.round(progress)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="task-item-actions">
                              <button
                                type="button"
                                className="task-action-btn"
                                title="Restore Task"
                                onClick={() => handleRestoreTask(task._id)}
                              >
                                <i className="fa-solid fa-rotate-left"></i>
                              </button>
                              <button
                                type="button"
                                className="task-action-btn task-action-delete"
                                title="Delete Permanently"
                                onClick={() => handleDeleteTaskPermanent(task._id, task.title)}
                              >
                                <i className="fa-regular fa-trash-can"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Floating Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="batch-bar-container">
          <div className="batch-bar">
            <span className="batch-count">
              <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "item" : "items"} selected
            </span>
            <div className="batch-actions">
              <Button
                variant="secondary"
                icon="fa-solid fa-rotate-left"
                onClick={handleRestoreSelected}
              >
                Restore
              </Button>
              <Button
                variant="danger"
                icon="fa-regular fa-trash-can"
                onClick={handleDeleteSelectedPermanent}
              >
                Delete Permanently
              </Button>
              <button
                type="button"
                className="batch-cancel"
                onClick={() => setSelectedIds([])}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

export default TrashBinPage;

