import { useState } from "react";
import Button from "../UI/Button";

const TaskInput = ({ onAdd }) => {
  const [text, setText]       = useState("");
  const [priority, setPriority] = useState("medium");
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [autoComplete, setAutoComplete] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text: text.trim(), priority, subtasks, autoCompleteOnSubtasksDone: autoComplete });
    setText("");
    setPriority("medium");
    setSubtasks([]);
    setNewSubtaskText("");
    setAutoComplete(false);
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setSubtasks([...subtasks, { text: newSubtaskText.trim(), completed: false }]);
    setNewSubtaskText("");
  };

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  return (
    <form className="task-input-form" onSubmit={handleSubmit}>
      <div className="task-input-main">
        <button
          type="button"
          className="task-input-add-icon"
          tabIndex={-1}
          aria-label="Add task"
        >
          <i className="fa-solid fa-plus"></i>
        </button>
        <input
          type="text"
          className="task-input-text"
          placeholder="Add a new task and press Enter..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setExpanded(true)}
        />
        {text && (
          <button
            type="button"
            className="task-input-clear"
            onClick={() => setText("")}
            tabIndex={-1}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {expanded && (
        <div className="task-input-options" style={{ flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <div className="task-input-priority-row">
              {["high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`priority-badge priority-${p} priority-select-btn${priority === p ? " selected" : ""}`}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Button type="submit" size="sm" disabled={!text.trim()}>
                Add task
              </Button>
              <button
                type="button"
                className="task-input-collapse"
                onClick={() => setExpanded(false)}
              >
                <i className="fa-solid fa-chevron-up"></i>
              </button>
            </div>
          </div>

          {/* Subtasks listing and input */}
          <div className="task-input-subtasks-section" style={{ width: "100%", borderTop: "1px solid var(--border)", paddingTop: "0.8rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Subtasks</div>
            {subtasks.map((st, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", flex: 1 }}>• {st.text}</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--accent-coral)", cursor: "pointer", fontSize: "0.8rem" }}
                  onClick={() => removeSubtask(idx)}
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", width: "100%" }}>
              <input
                type="text"
                className="input"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", height: "30px", flex: 1 }}
                placeholder="Add subtask text..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
              />
              <Button type="button" size="sm" variant="secondary" style={{ height: "30px", padding: "0 0.8rem" }} onClick={addSubtask}>
                Add
              </Button>
            </div>
            {subtasks.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginTop: "0.8rem" }}>
                <input
                  id="create-auto-complete"
                  type="checkbox"
                  checked={autoComplete}
                  onChange={(e) => setAutoComplete(e.target.checked)}
                />
                <label htmlFor="create-auto-complete" className="field-label" style={{ marginBottom: 0, cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Mark complete if all subtasks are done
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
};

export default TaskInput;
