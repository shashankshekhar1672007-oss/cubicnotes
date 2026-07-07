import NoteCard from "./NoteCardCompact";

const NoteList = ({ notes, onSelect, onTogglePin, onDelete }) => {
  if (!notes?.length) {
    return (
      <div className="empty-state">
        <i className="fa-regular fa-note-sticky"></i>
        <p>No notes yet. Start writing on the left.</p>
      </div>
    );
  }

  return (
    <div className="notes-list scroll-thin">
      {notes.map((note, index) => (
        <NoteCard
          key={note._id}
          note={note}
          num={String(notes.length - index).padStart(2, "0")}
          onClick={() => onSelect(note)}
          onTogglePin={() => onTogglePin(note)}
          onDelete={() => onDelete(note)}
        />
      ))}
    </div>
  );
};

export default NoteList;
