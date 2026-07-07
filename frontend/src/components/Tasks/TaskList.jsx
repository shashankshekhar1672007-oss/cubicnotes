import TaskItem from "./TaskItem";
import "../../assets/styles/components/task-list.css";

/**
 * Groups tasks by date label when showDateSeparators is true.
 * Each group gets a styled separator row with the date label.
 * Falls back to a flat list for Today / No Date / Completed tabs.
 */
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

const groupByDate = (tasks, dateField) => {
  const groups = [];
  const seen   = new Map();

  for (const task of tasks) {
    const val = task[dateField] || task.createdAt;
    const label = getDateLabel(val);
    if (!seen.has(label)) {
      seen.set(label, []);
      groups.push({ label, tasks: seen.get(label) });
    }
    seen.get(label).push(task);
  }
  return groups;
};

const TaskList = ({
  tasks,
  onToggle,
  onToggleSubtask,
  onDelete,
  onEdit,
  selected = new Set(),
  onSelect,
  onSelectAll,
  showDateSeparators = false,
  groupBy = "createdAt",
  compact = false,
}) => {
  if (!tasks?.length) {
    if (compact) return null;
    return (
      <div className="empty-state">
        <i className="fa-solid fa-list-check"></i>
        <p>No tasks here.</p>
      </div>
    );
  }

  const renderItem = (task) => (
    <TaskItem
      key={task._id}
      task={task}
      onToggle={onToggle}
      onToggleSubtask={onToggleSubtask}
      onDelete={onDelete}
      onEdit={onEdit}
      selected={selected.has(task._id)}
      onSelect={onSelect}
      selectionActive={selected.size > 0}
    />
  );

  if (!showDateSeparators) {
    return (
      <div className="task-list">
        {tasks.map(renderItem)}
      </div>
    );
  }

  const groups = groupByDate(tasks, groupBy);

  return (
    <div className="task-list">
      {groups.map(({ label, tasks: groupTasks }) => (
        <div key={label} className="task-date-group">
          <div className="task-date-separator">
            <span className="task-date-separator-label">{label}</span>
            <span className="task-date-separator-count">{groupTasks.length}</span>
          </div>
          {groupTasks.map(renderItem)}
        </div>
      ))}
    </div>
  );
};

export default TaskList;
