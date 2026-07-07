import { stripMarkdown } from "../../utils/parseMarkdown";
import { timeAgo } from "../../utils/formatDate";
import "../../assets/styles/components/note-card.css";

/**
 * Compact sidebar/dashboard card with nested outer/inner visual layout.
 * Used by NoteList (sidebar) and Dashboard (recent notes).
 */
const NoteCardCompact = ({ note, num, onClick, onTogglePin, onDelete }) => {
  const stop = (e, fn) => { e.stopPropagation(); fn?.(); };

  return (
    <div
      className="note-card"
      style={{ "--card-accent": note.accent || "var(--accent-teal)" }}
    >
      {/* Outer Header */}
      <div className="note-card-outer-header">
        <span className="note-card-outer-title" title={note.title}>
          {num ? `${num}. ` : ""}{note.title}
        </span>
        <div className="note-card-outer-actions">
          {onTogglePin && (
            <button
              type="button"
              className={`note-card-outer-action-btn${note.isPinned ? " pinned" : ""}`}
              title={note.isPinned ? "Unpin note" : "Pin note"}
              onClick={(e) => stop(e, onTogglePin)}
            >
              <i className="fa-solid fa-thumbtack"></i>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="note-card-outer-action-btn delete"
              title="Delete note"
              onClick={(e) => stop(e, onDelete)}
            >
              <i className="fa-regular fa-trash-can"></i>
            </button>
          )}
        </div>
      </div>

      {/* Inner Card */}
      <div className="note-card-inner" onClick={onClick}>
        {note.tags?.length > 0 && (
          <div className="note-card-inner-tags">
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="note-card-inner-tag">#{tag}</span>
            ))}
          </div>
        )}

        {note.subheading && (
          <h4 className="note-card-inner-subheading" title={note.subheading}>
            {note.subheading}
          </h4>
        )}

        <p className="note-card-inner-preview">{stripMarkdown(note.content) || "No content"}</p>

        <div className="note-card-inner-footer">
          <span className="note-card-inner-date">{timeAgo(note.createdAt)}</span>
          {note.isPinned && (
            <span className="note-card-inner-pinned" title="Pinned">
              <i className="fa-solid fa-thumbtack"></i>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteCardCompact;
