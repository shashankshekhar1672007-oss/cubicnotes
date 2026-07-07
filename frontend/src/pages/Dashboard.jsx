import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { GHOST_NOTES, GHOST_TASKS, GHOST_COUNTS } from "../data/ghostDemoData";
import NoteCard from "../components/Notes/NoteCardCompact";
import TaskList from "../components/Tasks/TaskList";
import DashboardCarousel from "../components/UI/DashboardCarousel";
import Modal from "../components/UI/Modal";
import Button from "../components/UI/Button";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import heroImage from "../assets/images/dashboard-hero.png";
import "../assets/styles/pages/dashboard.css";

const QUOTES = [
  { text: "The faint ink is better than the sharpest memory.", author: "Chinese Proverb" },
  { text: "A short pencil is better than a long memory.", author: "Unknown" },
  { text: "Write it down. Written goals have a way of transforming wishes into wants.", author: "Unknown" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Your mind is for having ideas, not holding them.", author: "David Allen" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small steps every day add up to miles of progress.", author: "Unknown" },
  { text: "Capture everything. Let your system do the remembering.", author: "Unknown" },
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "You can do anything, but not everything.", author: "David Allen" },
  { text: "By failing to prepare, you are preparing to fail.", author: "Benjamin Franklin" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
  { text: "Things which matter most must never be at the mercy of things which matter least.", author: "Johann Wolfgang von Goethe" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Nothing is less productive than to make more efficient what should not be done at all.", author: "Peter Drucker" },
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Abraham Lincoln" },
  { text: "Organizing is what you do before you do something, so that when you do it, it is not all mixed up.", author: "A.A. Milne" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
  { text: "It is not a daily increase, but a daily decrease. Hack away at the inessentials.", author: "Bruce Lee" },
  { text: "Someday is not a day of the week.", author: "Janet Dailey" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Don't wait. The time will never be just right.", author: "Napoleon Hill" },
  { text: "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.", author: "Paul J. Meyer" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "If you want to make an easy job seem mighty hard, just keep putting off doing it.", author: "Olin Miller" },
  { text: "Most of us spend too much time on what is urgent and not enough time on what is important.", author: "Stephen Covey" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Paper is to write things down that we need to remember. Our brains are used to think.", author: "Albert Einstein" }
];

const getDailyQuote = () => QUOTES[(new Date().getDate() - 1) % QUOTES.length];

const fetchDashboardData = async (dashboardNotesMode) => {
  const notesParams = { limit: 4 };
  if (dashboardNotesMode === "pinned") {
    notesParams.pinned = true;
  } else {
    notesParams.sort = "recent";
  }

  const [
    notesRes,
    tasksRes,
    noteCountRes,
    notebookCountRes,
    taskCountRes,
    reminderCountRes,
  ] = await Promise.all([
    api.get("/notes",     { params: notesParams }),
    api.get("/tasks",     { params: { completed: false, limit: 6 } }),
    api.get("/notes",     { params: { countOnly: true } }),
    api.get("/notebooks", { params: { countOnly: true } }),
    api.get("/tasks",     { params: { completed: false, countOnly: true } }),
    api.get("/reminders", { params: { upcoming: true, countOnly: true } }),
  ]);
  return {
    notes: notesRes.data,
    tasks: tasksRes.data,
    counts: {
      notes:     noteCountRes.data.count     || notesRes.data.length  || 0,
      notebooks: notebookCountRes.data.count || notebookCountRes.data.length || 0,
      tasks:     taskCountRes.data.count     || tasksRes.data.length  || 0,
      reminders: reminderCountRes.data.count || 0,
    }
  };
};

const Dashboard = () => {
  const { user } = useAuth();
  const { guardAction, isGhost } = useGhostGuard();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editTask, setEditTask]         = useState(null);
  const [editTitle, setEditTitle]       = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editSubtasks, setEditSubtasks] = useState([]);
  const [editNewSubtaskText, setEditNewSubtaskText] = useState("");
  const [editAutoComplete, setEditAutoComplete] = useState(false);
  const [savingTask, setSavingTask]     = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const PRIORITIES = ["high", "medium", "low"];

  const { data, isLoading: loading } = useQuery({
    queryKey: ["dashboardData", user?.dashboardNotesMode],
    queryFn: () => fetchDashboardData(user?.dashboardNotesMode || "recent"),
    enabled: !isGhost,
  });

  // Use demo data for ghost users, real data for authenticated users
  const notes = isGhost ? GHOST_NOTES : (data?.notes || []);
  const tasks = isGhost ? GHOST_TASKS.filter((t) => !t.isCompleted) : (data?.tasks || []);
  const counts = isGhost ? GHOST_COUNTS : (data?.counts || { notes: 0, notebooks: 0, tasks: 0, reminders: 0 });

  const quote = getDailyQuote();

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
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } catch (err) {
        patchTaskCache(task._id, {
          isCompleted: previousTask.isCompleted,
          completedAt: previousTask.completedAt,
        });
        toast.error("Failed to update task.");
      }
    });
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditSubtasks(task.subtasks || []);
    setEditNewSubtaskText("");
    setEditAutoComplete(task.autoCompleteOnSubtasksDone || false);
  };

  const saveEditTask = async () => {
    if (!editTitle.trim()) return;
    guardAction(async () => {
      setSavingTask(true);
      try {
        await api.put(`/tasks/${editTask._id}`, {
          title: editTitle.trim(),
          priority: editPriority,
          subtasks: editSubtasks,
          autoCompleteOnSubtasksDone: editAutoComplete,
        });
        toast.success("Task updated!");
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        setEditTask(null);
      } catch (err) {
        toast.error("Failed to update task.");
      } finally {
        setSavingTask(false);
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
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          } catch (err) {
            toast.error("Failed to delete task.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
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
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
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

  const firstName = isGhost ? "Explorer" : (user?.name?.split(" ")[0] || "there");

  return (
    <div className="dashboard-root">

      {/* ── Hero — full viewport height ──────────────────── */}
      <section className="dashboard-hero">
        <div className="dashboard-hero-left">
          <p className="dashboard-hero-greeting">Good {getTimeOfDay()}</p>
          <h1 className="dashboard-hero-heading">
            Welcome back,<br />
            <span className="dashboard-hero-name">{firstName}</span>
          </h1>

          <blockquote className="dashboard-hero-quote">
            <span className="quote-mark">&ldquo;</span>
            {quote.text}
            <span className="quote-mark">&rdquo;</span>
            <cite className="quote-author">— {quote.author}</cite>
          </blockquote>

          <div className="dashboard-hero-ctas">
            <button
              className="dashboard-cta-btn dashboard-cta-primary"
              onClick={() => guardAction(() => navigate("/notes", { state: { createNew: true } }))}
            >
              <i className="fa-solid fa-pen-to-square"></i>
              Create Quick Note
            </button>
            <button
              className="dashboard-cta-btn dashboard-cta-secondary"
              onClick={() => guardAction(() => navigate("/notebooks"))}
            >
              <i className="fa-solid fa-folder-plus"></i>
              Start a Notebook
            </button>
          </div>
        </div>

        <div className="dashboard-hero-right">
          <img
            src={heroImage}
            alt="Productivity illustration"
            className="dashboard-hero-image"
          />
        </div>

        {/* Scroll hint */}
        <div className="dashboard-scroll-hint">
          <i className="fa-solid fa-chevron-down"></i>
        </div>
      </section>

      {/* ── Below the fold ───────────────────────────────── */}
      <section className="dashboard-below">

        {/* Carousel launcher */}
        <DashboardCarousel />

        {/* Stats row */}
        <div className="dashboard-grid">
          <div className="stat-card" onClick={() => navigate("/notes")} style={{ "--card-accent": "var(--accent-teal)" }}>
            <div className="stat-card-header">
              <span className="stat-card-icon" style={{ color: "var(--accent-teal)" }}>
                <i className="fa-regular fa-file-lines"></i>
              </span>
              <span className="stat-card-value">
                {loading && !isGhost ? (
                  <span className="skeleton-loader" style={{ width: "36px", height: "28px", borderRadius: "var(--radius-sm)", display: "inline-block", verticalAlign: "middle" }}></span>
                ) : (
                  counts.notes
                )}
              </span>
            </div>
            <div className="stat-card-label">TOTAL NOTES</div>
          </div>

          <div className="stat-card" onClick={() => navigate("/notebooks")} style={{ "--card-accent": "var(--accent-purple)" }}>
            <div className="stat-card-header">
              <span className="stat-card-icon" style={{ color: "var(--accent-purple)" }}>
                <i className="fa-solid fa-folder"></i>
              </span>
              <span className="stat-card-value">
                {loading && !isGhost ? (
                  <span className="skeleton-loader" style={{ width: "36px", height: "28px", borderRadius: "var(--radius-sm)", display: "inline-block", verticalAlign: "middle" }}></span>
                ) : (
                  counts.notebooks
                )}
              </span>
            </div>
            <div className="stat-card-label">NOTEBOOKS</div>
          </div>

          <div className="stat-card" onClick={() => navigate("/tasks")} style={{ "--card-accent": "var(--accent-amber)" }}>
            <div className="stat-card-header">
              <span className="stat-card-icon" style={{ color: "var(--accent-amber)" }}>
                <i className="fa-solid fa-circle-check"></i>
              </span>
              <span className="stat-card-value">
                {loading && !isGhost ? (
                  <span className="skeleton-loader" style={{ width: "36px", height: "28px", borderRadius: "var(--radius-sm)", display: "inline-block", verticalAlign: "middle" }}></span>
                ) : (
                  counts.tasks
                )}
              </span>
            </div>
            <div className="stat-card-label">OPEN TASKS</div>
          </div>

          <div className="stat-card" onClick={() => navigate("/reminders")} style={{ "--card-accent": "var(--accent-blue)" }}>
            <div className="stat-card-header">
              <span className="stat-card-icon" style={{ color: "var(--accent-blue)" }}>
                <i className="fa-regular fa-bell"></i>
              </span>
              <span className="stat-card-value">
                {loading && !isGhost ? (
                  <span className="skeleton-loader" style={{ width: "36px", height: "28px", borderRadius: "var(--radius-sm)", display: "inline-block", verticalAlign: "middle" }}></span>
                ) : (
                  counts.reminders
                )}
              </span>
            </div>
            <div className="stat-card-label">UPCOMING REMINDERS</div>
          </div>
        </div>

        {/* Recent notes + pending tasks */}
        <div className="dashboard-row">
          <div className="dashboard-section">
            <div className="section-label">
              <span className="label-dot" style={{ background: "var(--accent-coral)" }}></span>
              Recent notes
            </div>
            <div className="notes-list">
              {loading && !isGhost ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="note-card skeleton-loader" style={{ height: "92px", borderRadius: "var(--radius-md)" }}></div>
                ))
              ) : (
                <>
                  {notes.slice(0, 4).map((note, i) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      num={String(i + 1).padStart(2, "0")}
                      onClick={() => {
                        if (isGhost) return; // Ghost users can see cards but clicking does nothing (read-only preview)
                        navigate("/notes", { state: { noteId: note._id, mode: "preview" } });
                      }}
                    />
                  ))}
                  {notes.length === 0 && (
                    <div className="empty-state"><p>No notes yet.</p></div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-label">
              <span className="label-dot" style={{ background: "var(--accent-teal)" }}></span>
              Due today &amp; pending
            </div>
            {loading && !isGhost ? (
              <div className="task-list">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="task-item skeleton-loader" style={{ height: "48px", borderRadius: "var(--radius-md)" }}></div>
                ))}
              </div>
            ) : (
              <>
                <TaskList
                  tasks={tasks.slice(0, 6)}
                  onToggle={(task) => guardAction(() => toggleTask(task))}
                  onToggleSubtask={toggleSubtask}
                  onDelete={deleteTask}
                  onEdit={openEditTask}
                  compact
                />
                {tasks.length === 0 && (
                  <div className="empty-state"><p>Nothing pending. Nice work.</p></div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Edit task modal ── */}
      {editTask && (
        <Modal
          title="Edit task"
          onClose={() => setEditTask(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditTask(null)}>Cancel</Button>
              <Button onClick={saveEditTask} disabled={savingTask}>
                {savingTask ? "Saving..." : "Save"}
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
              onKeyDown={(e) => e.key === "Enter" && saveEditTask()}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Priority</label>
            <div className="edit-priority-row" style={{ display: "flex", gap: "0.5rem" }}>
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
                Mark task complete if all subtasks are done
              </label>
            </div>
          )}
        </Modal>
      )}

      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

/** Returns "morning", "afternoon", or "evening" based on current hour */
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default Dashboard;