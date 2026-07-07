import NoteCard from "./NoteCard";

/**
 * Masonry-style card grid for the Notes page.
 * When rendered as a pinned row (`isPinnedRow`), pinned notes appear first.
 * Otherwise the grid respects the order provided by the caller.
 */
const NoteGrid = ({
  notes,
  onSelect,
  onTogglePin,
  onDelete,
  isPinnedRow,
  cardWidth,
  cols = 4,
  selectedIds = [],
  onToggleSelect,
  selectionActive,
}) => {
  if (!notes?.length) {
    return (
      <div className="empty-state">
        <i className="fa-regular fa-note-sticky"></i>
        <p>No notes yet. Hit "New Note" to get started.</p>
      </div>
    );
  }

  // Only move pinned notes to the top when explicitly rendering the pinned row.
  const sorted = isPinnedRow ? [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  }) : notes;

  return (
    <div
      className={`note-grid${isPinnedRow ? " pinned-row" : ""}`}
      style={cardWidth ? { "--card-width": `${cardWidth}px`, "--grid-cols": cols } : undefined}
    >
      {sorted.map((note) => (
        <NoteCard
          key={note._id}
          note={note}
          onClick={() => onSelect(note, "preview")}
          onEdit={() => onSelect(note, "edit")}
          onTogglePin={() => onTogglePin(note)}
          onDelete={() => onDelete(note)}
          isSelected={selectedIds.includes(note._id)}
          onToggleSelect={onToggleSelect}
          selectionActive={selectionActive}
        />
      ))}
    </div>
  );
}

export default NoteGrid;
