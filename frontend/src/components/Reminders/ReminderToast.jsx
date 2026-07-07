import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import "../../assets/styles/components/reminder-toast.css";

const fetchActiveReminders = async () => {
  const { data } = await api.get("/reminders/active");
  return data;
};

const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Ping 1 (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Ping 2 (C6) delayed slightly
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.47);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.error("Audio chime error:", e);
  }
};

const showNotification = (title, body) => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    const n = new Notification(title, {
      body: body || "CubicNotes Reminder Alert",
      icon: "/favicon.svg",
    });
    n.onclick = () => {
      window.focus();
    };
  }
};

const ReminderToast = () => {
  const queryClient = useQueryClient();
  const [active, setActive] = useState(null);

  const { data: activeReminders = [] } = useQuery({
    queryKey: ["activeReminders"],
    queryFn: fetchActiveReminders,
    refetchInterval: 15000, // Poll every 15 seconds for more responsive reminders
  });

  // Request browser Notification permissions on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Play chime and trigger notification when a new active reminder arrives
  useEffect(() => {
    if (activeReminders.length > 0) {
      const nextReminder = activeReminders[0];
      if (!active || active._id !== nextReminder._id) {
        setActive(nextReminder);
        playChime();
        showNotification(nextReminder.title, nextReminder.description || "Reminder Triggered");
      }
    } else {
      setActive(null);
    }
  }, [activeReminders, active]);

  const dismiss = async () => {
    if (active) {
      await api.put(`/reminders/${active._id}`, { isRead: true }).catch(() => {});
      queryClient.setQueryData(["activeReminders"], (oldData) =>
        oldData ? oldData.filter((r) => r._id !== active._id) : []
      );
    }
    setActive(null);
  };

  if (!active) return null;

  return (
    <div className="reminder-toast">
      <div className="reminder-icon"><i className="fa-solid fa-bell"></i></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{active.title}</div>
        {active.description && (
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
            {active.description}
          </div>
        )}
      </div>
      <button className="modal-close" onClick={dismiss}><i className="fa-solid fa-xmark"></i></button>
    </div>
  );
};

export default ReminderToast;
