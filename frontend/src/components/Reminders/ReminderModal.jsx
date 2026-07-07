import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import { toast } from "react-hot-toast";
import Modal from "../UI/Modal";
import Button from "../UI/Button";

/**
 * Modal for creating/editing a reminder, optionally linked to a note.
 * `initial` lets the caller pre-fill fields when editing an existing one.
 */
const ReminderModal = ({ onClose, onSave, onDelete, linkedNote = null, initial = null }) => {
  const { user, updateUser } = useAuth();
  const [title, setTitle]             = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [triggerTime, setTriggerTime] = useState(() => {
    if (!initial?.triggerTime) return "";
    const date = new Date(initial.triggerTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [repeat, setRepeat] = useState(initial?.repeat || "none");
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(initial?.syncToGoogleCalendar || false);
  const [connecting, setConnecting] = useState(false);

  const handleSave = () => {
    if (!title.trim() || !triggerTime) return;
    
    // Parse the datetime-local string (which is in local time) and convert to UTC ISO string
    const localDate = new Date(triggerTime);
    const triggerTimeISO = isNaN(localDate.getTime()) ? triggerTime : localDate.toISOString();
    
    onSave({
      title: title.trim(),
      description,
      triggerTime: triggerTimeISO,
      repeat,
      linkedNote: linkedNote?._id || initial?.linkedNote || null,
      syncToGoogleCalendar,
    });
  };

  const handleDelete = () => {
    if (onDelete && initial?._id) {
      onDelete(initial);
    }
  };

  const handleConnectCalendar = async () => {
    setConnecting(true);
    try {
      const { data } = await api.get("/auth/google/calendar/connect");
      if (data.url) {
        // Open Google Consent Screen in a new tab so user doesn't lose form state
        const connectWindow = window.open(data.url, "_blank");
        
        // Listen for connection status changes
        const checkConnection = setInterval(async () => {
          if (connectWindow.closed) {
            clearInterval(checkConnection);
            // Refresh user session state
            try {
              const { data: userData } = await api.get("/auth/me");
              updateUser(userData);
              if (userData.googleCalendarConnected) {
                toast.success("Google Calendar connected successfully!");
                setSyncToGoogleCalendar(true);
              }
            } catch (err) {
              console.error(err);
            }
            setConnecting(false);
          }
        }, 1000);
      } else {
        toast.error("Could not fetch connection URL.");
        setConnecting(false);
      }
    } catch (err) {
      toast.error("Failed to connect Google Calendar.");
      setConnecting(false);
    }
  };

  return (
    <Modal
      title={(initial && initial._id) ? "Edit reminder" : "New reminder"}
      onClose={onClose}
      footer={
        <>
          {initial?._id && (
            <Button variant="danger" onClick={handleDelete} style={{ marginRight: "auto" }}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save reminder</Button>
        </>
      }
    >
      <div className="field-group">
        <label className="field-label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Submit assignment" />
      </div>

      <div className="field-group">
        <label className="field-label">Notes (optional)</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Extra detail..." />
      </div>

      <div className="field-group">
        <label className="field-label">Date & time</label>
        <input
          type="datetime-local"
          className="input"
          value={triggerTime}
          onChange={(e) => setTriggerTime(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label className="field-label">Repeat</label>
        <select className="input" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
          <option value="none">Doesn't repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* Google Calendar sync settings */}
      <div className="field-group" style={{ 
        marginTop: "1.25rem", 
        padding: "1rem", 
        background: "var(--bg-raised)", 
        border: "1px solid var(--border)", 
        borderRadius: "var(--radius-sm)" 
      }}>
        {user?.googleCalendarConnected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }} onClick={() => setSyncToGoogleCalendar(!syncToGoogleCalendar)}>
            <input 
              type="checkbox" 
              checked={syncToGoogleCalendar}
              onChange={(e) => setSyncToGoogleCalendar(e.target.checked)}
              style={{ accentColor: "var(--accent-teal)", cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text-primary)" }}>
              Add this reminder to Google Calendar
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
              Sync this reminder to Google Calendar?
            </span>
            <button 
              type="button" 
              onClick={handleConnectCalendar}
              disabled={connecting}
              style={{ 
                background: "transparent", 
                border: "1px solid var(--accent-teal)", 
                color: "var(--accent-teal)", 
                padding: "0.4rem 0.8rem", 
                borderRadius: "4px", 
                fontSize: "0.78rem", 
                fontWeight: "600", 
                cursor: "pointer",
                width: "fit-content"
              }}
            >
              {connecting ? "Connecting..." : "Connect Google Calendar"}
            </button>
          </div>
        )}
      </div>

      {linkedNote && (
        <div className="field-group">
          <label className="field-label">Linked note</label>
          <div className="note-tag-chip" style={{ width: "fit-content" }}>{linkedNote.title}</div>
        </div>
      )}
    </Modal>
  );
};

export default ReminderModal;
