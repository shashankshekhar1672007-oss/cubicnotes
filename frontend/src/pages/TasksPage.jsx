import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "../services/api";
import TaskInput from "../components/Tasks/TaskInput";
import TaskList from "../components/Tasks/TaskList";
import Button from "../components/UI/Button";
import Modal from "../components/UI/Modal";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { GHOST_TASKS } from "../data/ghostDemoData";
import "../assets/styles/components/task-list.css";

const TABS = [
  { key: "remaining", label: "Remaining", icon: "fa-solid fa-list" },
  { key: "completed", label: "Completed", icon: "fa-solid fa-circle-check" },
];

const PRIORITIES = ["high", "medium", "low"];

const fetchTasksList = async () => {
  const { data } = await api.get("/tasks");
  return data;
};

const TasksPage = () => {
  const queryClient = useQueryClient();
  const { guardAction, isGhost } = useGhostGuard();

  const [tab, setTab]                   = useState("remaining");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected]         = useState(new Set());
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const [editTask, setEditTask]         = useState(null);
  const [editTitle, setEditTitle]       = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editSubtasks, setEditSubtasks] = useState([]);
  const [editNewSubtaskText, setEditNewSubtaskText] = useState("");
  const [editAutoComplete, setEditAutoComplete] = useState(false);
  const [saving, setSaving]             = useState(false);

  const { data: serverTasks = [], isLoading: loading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasksList,
    enabled: !isGhost,
  });

  const tasks = isGhost ? GHOST_TASKS : serverTasks;

  /* ── Tab counts ─────────────────────────── */
  const counts = useMemo(() => ({
    remaining: tasks.filter((t) => !t.isCompleted).length,
    completed: tasks.filter((t) => t.isCompleted).length,
  }), [tasks]);

  /* ── Filtered + sorted tasks ────────────── */
  const visibleTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      if (tab === "remaining") return !t.isCompleted;
      if (tab === "completed") return t.isCompleted;
      return true;
    });
    if (priorityFilter !== "all") result = result.filter((t) => t.priority === priorityFilter);

    // Sort: Group date wise, newest first
    result = [...result].sort((a, b) => {
      if (tab === "completed") {
        const dateA = new Date(a.completedAt || a.updatedAt);
        const dateB = new Date(b.completedAt || b.updatedAt);
        return dateB - dateA;
      } else {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      }
    });
    return result;
  }, [tasks, tab, priorityFilter]);

  const openCount = tasks.filter((t) => !t.isCompleted).length;

  /* ── Mutations ──────────────────────────── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["trashedTasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
  };

  const handleAdd = async ({ text, priority, subtasks, autoCompleteOnSubtasksDone }) => {
    guardAction(async () => {
      try {
        await api.post("/tasks", { title: text, priority, subtasks, autoCompleteOnSubtasksDone });
        toast.success("Task added!");
        invalidate();
      } catch (err) {
        toast.error("Failed to add task.");
      }
    });
  };

  const patchTaskCache = (taskId, patch) => {
    queryClient.setQueriesData({ queryKey: ["tasks"] }, (prev = []) =>
      Array.isArray(prev)
        ? prev.map((item) => (item._id === taskId ? { ...item, ...patch } : item))
        : prev
    );
    queryClient.setQueriesData({ queryKey: ["dashboardData"] }, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: Array.isArray(prev.tasks)
          ? prev.tasks.map((item) => (item._id === taskId ? { ...item, ...patch } : item))
          : prev.tasks,
      };
    });
  };

  const toggleTask = async (task) => {
    const nextCompleted = !task.isCompleted;
    const previousTask = task;

    patchTaskCache(task._id, {
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
    });

    toast.success(nextCompleted ? "Task completed!" : "Task active again");

    guardAction(async () => {
      try {
        await api.put(`/tasks/${task._id}`, { isCompleted: nextCompleted });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } catch (err) {
        patchTaskCache(task._id, {
          isCompleted: previousTask.isCompleted,
          completedAt: previousTask.completedAt,
        });
        toast.error("Failed to update task.");
      }
    });
  };

  const toggleSubtask = async (task, subtask) => {
    const previousSubtasks = task.subtasks || [];
    const nextSubtasks = previousSubtasks.map((item) =>
      item._id === subtask._id ? { ...item, completed: !item.completed } : item
    );
    const allDone = nextSubtasks.every((item) => item.completed);
    const nextCompleted = task.autoCompleteOnSubtasksDone && nextSubtasks.length > 0 ? allDone : task.isCompleted;

    patchTaskCache(task._id, {
      subtasks: nextSubtasks,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
    });

    guardAction(async () => {
      try {
        await api.put(`/tasks/${task._id}/subtask/${subtask._id}/toggle`);
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } catch (err) {
        patchTaskCache(task._id, {
          subtasks: previousSubtasks,
          isCompleted: task.isCompleted,
          completedAt: task.completedAt,
        });
        toast.error("Failed to update subtask.");
      }
    });
  };

  const deleteTask = (task) => {
    showConfirm({
      title: "Move Task to Trash?",
      message: `Are you sure you want to move the task "${task.title}" to the trash?`,
      confirmLabel: "Move to Trash",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await api.delete(`/tasks/${task._id}`);
            toast.success("Task moved to trash");
            setSelected((prev) => { const s = new Set(prev); s.delete(task._id); return s; });
            invalidate();
          } catch (err) {
            toast.error("Failed to delete task.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const cyclePriority = async (task) => {
    guardAction(async () => {
      try {
        const next = PRIORITIES[(PRIORITIES.indexOf(task.priority) + 1) % PRIORITIES.length];
        await api.put(`/tasks/${task._id}`, { priority: next });
        toast.success(`Priority set to ${next}`);
        invalidate();
      } catch (err) {
        toast.error("Failed to change priority.");
      }
    });
  };

  /* ── Edit modal ─────────────────────────── */
  const openEdit = (task) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditSubtasks(task.subtasks || []);
    setEditNewSubtaskText("");
    setEditAutoComplete(task.autoCompleteOnSubtasksDone || false);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    guardAction(async () => {
      setSaving(true);
      try {
        await api.put(`/tasks/${editTask._id}`, {
          title: editTitle.trim(),
          priority: editPriority,
          subtasks: editSubtasks,
          autoCompleteOnSubtasksDone: editAutoComplete,
        });
        toast.success("Task updated!");
        invalidate();
        setEditTask(null);
      } catch (err) {
        toast.error("Failed to update task.");
      } finally {
        setSaving(false);
      }
    });
  };

  /* ── Bulk actions ───────────────────────── */
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const selectAll = () =>
    setSelected(visibleTasks.length === selected.size
      ? new Set()
      : new Set(visibleTasks.map((t) => t._id)));

  const bulkComplete = async () => {
    guardAction(async () => {
      try {
        await Promise.all([...selected].map((id) => api.put(`/tasks/${id}`, { isCompleted: true })));
        toast.success("Selected tasks completed!");
        setSelected(new Set());
        invalidate();
      } catch (err) {
        toast.error("Bulk completion failed.");
      }
    });
  };

  const bulkDelete = () => {
    showConfirm({
      title: "Move Tasks to Trash?",
      message: `Are you sure you want to move ${selected.size} task${selected.size > 1 ? "s" : ""} to the trash?`,
      confirmLabel: "Move to Trash",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await Promise.all([...selected].map((id) => api.delete(`/tasks/${id}`)));
            toast.success("Selected tasks moved to trash");
            setSelected(new Set());
            invalidate();
          } catch (err) {
            toast.error("Bulk deletion failed.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const bulkPriority = async (priority) => {
    guardAction(async () => {
      try {
        await Promise.all([...selected].map((id) => api.put(`/tasks/${id}`, { priority })));
        toast.success(`Selected tasks set to ${priority} priority`);
        setSelected(new Set());
        invalidate();
      } catch (err) {
        toast.error("Bulk priority update failed.");
      }
    });
  };

  return (
    <div className={`tasks-page${selected.size > 0 ? " selection-active" : ""}`}>
      {/* ── Header ── */}
      <div className="tasks-page-header">
        <div>
          <h1 className="page-heading" style={{ marginBottom: 0 }}>Tasks</h1>
          <p className="page-subheading">Get things done</p>
        </div>
        <div className="priority-filter-wrapper">
          <i className="fa-solid fa-arrow-down-wide-short filter-icon"></i>
          <select
            className="priority-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <i className="fa-solid fa-chevron-down chevron-icon"></i>
        </div>
      </div>

      {/* ── Task input ── */}
      <TaskInput onAdd={handleAdd} />

      {/* ── Tabs & Select All Row ── */}
      <div className="task-tabs-row">

        <div className="task-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`task-tab${tab === t.key ? " active" : ""}`}
              onClick={() => { setTab(t.key); setSelected(new Set()); }}
            >
              <i className={t.icon}></i>
              {t.label}
              {counts[t.key] > 0 && (
                <span className="task-tab-count">{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>
        {visibleTasks.length > 0 && (
          <button
            type="button"
            className="task-select-all-btn-wrapper"
            onClick={selectAll}
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
            <i
              className={selected.size === visibleTasks.length ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}
              style={{
                color: selected.size === visibleTasks.length ? "var(--accent-teal)" : "var(--text-muted)",
                fontSize: "1.05rem",
              }}
            ></i>
            <span>Select All ({visibleTasks.length} items)</span>
          </button>
        )}
      </div>

      {/* Floating Batch Actions Bar */}
      {selected.size > 0 && (
        <div className="batch-bar-container">
          <div className="batch-bar">
            <span className="batch-count">
              <strong>{selected.size}</strong> {selected.size === 1 ? "item" : "items"} selected
            </span>
            <div className="batch-actions">
              <Button
                variant="secondary"
                icon="fa-solid fa-check"
                onClick={bulkComplete}
              >
                Complete
              </Button>
              
              <div className="bulk-priority-group" style={{ display: "flex", gap: "0.25rem", background: "var(--bg-input)", padding: "2px", borderRadius: "var(--radius-sm)" }}>
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    className={`bulk-btn priority-dot-${p}`}
                    onClick={() => bulkPriority(p)}
                    title={`Set ${p} priority`}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "calc(var(--radius-sm) - 2px)",
                      border: "none",
                      background: "transparent",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      cursor: "pointer",
                      color: `var(--accent-${p === "low" ? "teal" : p === "medium" ? "amber" : "coral"})`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="danger"
                icon="fa-regular fa-trash-can"
                onClick={bulkDelete}
              >
                Delete
              </Button>
              <button
                type="button"
                className="batch-cancel"
                onClick={() => setSelected(new Set())}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task list ── */}
      {loading ? (
        <div className="task-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="task-item skeleton-loader" style={{ height: 52, borderRadius: "var(--radius-md)" }}></div>
          ))}
        </div>
      ) : (
        <TaskList
          tasks={visibleTasks}
          onToggle={toggleTask}
          onToggleSubtask={toggleSubtask}
          onDelete={deleteTask}
          onEdit={openEdit}
          selected={selected}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          showDateSeparators={true}
          groupBy={tab === "completed" ? "completedAt" : "createdAt"}
        />
      )}

      {/* ── Edit modal ── */}
      {editTask && (
        <Modal
          title="Edit task"
          onClose={() => setEditTask(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditTask(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          }
        >
          <div className="field-group">
            <label className="field-label">Title</label>
            <input
              className="input"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Priority</label>
            <div className="edit-priority-row">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`priority-badge priority-${p} priority-select-btn${editPriority === p ? " selected" : ""}`}
                  onClick={() => setEditPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks Editing Section */}
          <div className="field-group" style={{ marginTop: "1rem" }}>
            <label className="field-label">Subtasks</label>
            <div style={{ maxHeight: "160px", overflowY: "auto", marginBottom: "0.5rem" }}>
              {editSubtasks.map((st, idx) => (
                <div key={st._id || idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={(e) => {
                      const updated = [...editSubtasks];
                      updated[idx] = { ...st, completed: e.target.checked };
                      setEditSubtasks(updated);
                    }}
                  />
                  <input
                    className="input"
                    style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.85rem", height: "28px" }}
                    value={st.text}
                    onChange={(e) => {
                      const updated = [...editSubtasks];
                      updated[idx] = { ...st, text: e.target.value };
                      setEditSubtasks(updated);
                    }}
                  />
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--accent-coral)", cursor: "pointer", padding: "0 0.25rem" }}
                    onClick={() => setEditSubtasks(editSubtasks.filter((_, i) => i !== idx))}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                className="input"
                style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.85rem", height: "28px" }}
                placeholder="New subtask text..."
                value={editNewSubtaskText}
                onChange={(e) => setEditNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (editNewSubtaskText.trim()) {
                      setEditSubtasks([...editSubtasks, { text: editNewSubtaskText.trim(), completed: false }]);
                      setEditNewSubtaskText("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                style={{ height: "28px", padding: "0 0.8rem" }}
                onClick={() => {
                  if (editNewSubtaskText.trim()) {
                    setEditSubtasks([...editSubtasks, { text: editNewSubtaskText.trim(), completed: false }]);
                    setEditNewSubtaskText("");
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
          {editSubtasks.length > 0 && (
            <div className="field-group" style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginTop: "1rem" }}>
              <input
                id="edit-auto-complete"
                type="checkbox"
                checked={editAutoComplete}
                onChange={(e) => setEditAutoComplete(e.target.checked)}
              />
              <label htmlFor="edit-auto-complete" className="field-label" style={{ marginBottom: 0, cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>
                Mark complete if all subtasks are done
              </label>
            </div>
          )}
        </Modal>
      )}

      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

export default TasksPage;