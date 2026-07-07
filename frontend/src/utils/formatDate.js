/**
 * Formats a date like the original CubicNotes style: "19 Jun 2026, 07:04 pm"
 */
export const formatDate = (date) =>
  new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

/**
 * Relative time, e.g. "2 hours ago", "just now", "3 days ago"
 */
export const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return formatDate(date);
};

/**
 * Short label for due dates: "Today", "Tomorrow", or formatted date
 */
export const formatDueDate = (date) => {
  if (!date) return null;
  const due   = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(due, today)) return "Today";
  if (isSameDay(due, tomorrow)) return "Tomorrow";

  return due.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export const isOverdue = (date) => date && new Date(date) < new Date();
