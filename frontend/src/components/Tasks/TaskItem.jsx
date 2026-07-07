import { useState, useRef } from "react";

const getPriorityColor = (prio) => {
  if (prio === "high") return "var(--accent-coral)";
  if (prio === "medium") return "var(--accent-amber)";
  return "var(--accent-teal)"; // low
};

const TaskItem = ({
  task,
  onToggle,
  onToggleSubtask,
  onDelete,
  onEdit,
  selected,
  onSelect,
  selectionActive,
}) => {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [pressTimer, setPressTimer] = useState(null);
  const isLongPress = useRef(false);
  const ignoreNextClick = useRef(false);

  const handleTouchStart = (e) => {
    isLongPress.current = false;
    const timer = setTimeout(() => {
      isLongPress.current = true;
      ignoreNextClick.current = true;
      onSelect(task._id);
    }, 600);
    setPressTimer(timer);
  };

  const handleTouchEnd = (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    if (isLongPress.current) {
      setTimeout(() => {
        ignoreNextClick.current = false;
      }, 300);
    }
  };

  const handleCancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks     = task.subtasks?.length || 0;
  const progress          = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const itemElement = (
    <div
      className={`task-item${task.isCompleted ? " task-item-done" : ""}${selected ? " task-item-selected" : ""}`}
      style={{ "--card-accent": getPriorityColor(task.priority), flex: 1, minWidth: 0 }}
    >
      <div
        className={`task-checkbox${task.isCompleted ? " checked" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        title={task.isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        {task.isCompleted && <i className="fa-solid fa-check"></i>}
      </div>

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
            {task.isCompleted ? (
              <>
                Created {formatDateLabel(task.createdAt)} • Completed {formatDateLabel(task.completedAt || task.updatedAt)}
              </>
            ) : (
              <>Created {formatDateLabel(task.createdAt)}</>
            )}
          </span>

          {totalSubtasks > 0 && (
            <button
              type="button"
              className="task-subtask-toggle"
              onClick={(e) => { e.stopPropagation(); setSubtasksOpen((v) => !v); }}
              title="Toggle subtasks"
            >
              <i className={`fa-solid fa-chevron-${subtasksOpen ? "up" : "down"}`} style={{ fontSize: "0.6rem" }}></i>
              Subtasks: {completedSubtasks}/{totalSubtasks}
            </button>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div className="task-progress-bar">
            <div className="task-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {subtasksOpen && totalSubtasks > 0 && (
          <div className="subtask-list" onClick={(e) => e.stopPropagation()}>
            {task.subtasks.map((sub) => (
              <div className="subtask-item" key={sub._id}>
                <div
                  className={`task-checkbox${sub.completed ? " checked" : ""}`}
                  style={{ width: 14, height: 14 }}
                  onClick={(e) => { e.stopPropagation(); onToggleSubtask(task, sub); }}
                >
                  {sub.completed && <i className="fa-solid fa-check" style={{ fontSize: "0.5rem" }}></i>}
                </div>
                <span className={sub.completed ? "completed" : ""}>{sub.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="task-item-actions">
        <button
          type="button"
          className="task-action-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          title="Edit task"
        >
          <i className="fa-solid fa-pen"></i>
        </button>
        <button
          type="button"
          className="task-action-btn task-action-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(task); }}
          title="Delete task"
        >
          <i className="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>
  );

  if (!onSelect) {
    return itemElement;
  }

  return (
    <div
      className="task-item-row-wrapper" 
      style={{ display: "flex", alignItems: "center", gap: "0.85rem", width: "100%" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleCancelPress}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseMove={handleCancelPress}
      onClick={(e) => {
        if (ignoreNextClick.current) {
          ignoreNextClick.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (selectionActive) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(task._id);
        }
      }}
    >
      <div className="task-select-circle-btn-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "100%", flexShrink: 0 }}>
        <button
          type="button"
          className={`task-select-circle-btn${selected ? " selected" : ""}`}
          onClick={(e) => { e.stopPropagation(); onSelect(task._id); }}
          style={{
            background: "none",
            border: "none",
            color: selected ? "var(--accent-teal)" : "var(--text-muted)",
            cursor: "pointer",
            fontSize: "1.1rem",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s, transform 0.15s"
          }}
          title={selected ? "Deselect task" : "Select task"}
        >
          <i className={selected ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}></i>
        </button>
      </div>
      {itemElement}
    </div>
  );
};

export default TaskItem;
