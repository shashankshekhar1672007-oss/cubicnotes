import MarkdownRenderer from "./MarkdownRenderer";

/**
 * Plain textarea writing surface with an optional live markdown preview
 * toggle. Swap the textarea internals for a real WYSIWYG (TipTap/Slate)
 * later without touching the parent NotesPage logic — props stay the same.
 */
const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Start writing here...",
  mode = "edit",
  onModeChange,
}) => {
  const showPreview = mode === "preview";

  return (
    <div className="field-group" style={{ flex: 1 }}>
      <div className="editor-toolbar">
        <label className="field-label" htmlFor="note-body">Content</label>
        <div className="editor-mode-toggle" aria-label="Note display mode">
          <button
            type="button"
            className={`editor-mode-btn${!showPreview ? " active" : ""}`}
            onClick={() => onModeChange?.("edit")}
          >
            <i className="fa-solid fa-pen"></i>
            Edit
          </button>
          <button
            type="button"
            className={`editor-mode-btn${showPreview ? " active" : ""}`}
            onClick={() => onModeChange?.("preview")}
          >
            <i className="fa-solid fa-eye"></i>
            Preview
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="note-content-input note-preview-surface">
          <MarkdownRenderer content={value} />
        </div>
      ) : (
        <textarea
          id="note-body"
          className="note-content-input"
          placeholder={placeholder}
          rows="10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
