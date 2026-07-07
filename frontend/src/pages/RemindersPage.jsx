import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, startOfToday,
  startOfWeek, endOfWeek, isWithinInterval, isSameMonth,
  addDays, subDays, addWeeks, subWeeks
} from "date-fns";

import api from "../services/api";
import ReminderModal from "../components/Reminders/ReminderModal";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import Button from "../components/UI/Button";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { GHOST_REMINDERS } from "../data/ghostDemoData";
import "../assets/styles/pages/reminders.css";

const HOURS = Array.from({ length: 24 }, (_, i) => (i + 7) % 24); // 24 hours starting at 7 AM

const REMINDER_COLORS = [
  "var(--accent-teal)",
  "var(--accent-purple)",
  "var(--accent-amber)",
  "var(--accent-coral)",
  "var(--accent-blue)",
  "var(--accent-pink)",
  "var(--accent-lime)",
  "var(--accent-cyan)",
  "var(--accent-peach)",
];

const getReminderColor = (reminderId) => {
  if (!reminderId) return REMINDER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < reminderId.length; i++) {
    hash = reminderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % REMINDER_COLORS.length;
  return REMINDER_COLORS[index];
};

const fetchRemindersList = async () => {
  const { data } = await api.get("/reminders");
  return data;
};

const RemindersPage = () => {
  const queryClient = useQueryClient();
  const workspaceBodyRef = useRef(null);
  const { guardAction, isGhost } = useGhostGuard();

  const { data: serverReminders = [], isLoading: loading } = useQuery({
    queryKey: ["reminders"],
    queryFn: fetchRemindersList,
    enabled: !isGhost,
  });

  const reminders = isGhost ? GHOST_REMINDERS : serverReminders;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState("monthly"); 
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const handleDeleteReminderClick = (reminder) => {
    showConfirm({
      title: "Delete Reminder?",
      message: `Are you sure you want to permanently delete the reminder "${reminder.title}"?`,
      confirmLabel: "Delete permanently",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await api.delete(`/reminders/${reminder._id}`);
            toast.success("Reminder deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
            setShowModal(false);
            setEditing(null);
          } catch (err) {
            toast.error("Failed to delete reminder.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  // Keep mini-calendar month in sync when selected date changes
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);

  // --- SYNC LOGIC: Navigation ---
  const handlePrev = () => {
    if (viewMode === "daily") setSelectedDate(prev => subDays(prev, 1));
    else if (viewMode === "weekly") setSelectedDate(prev => subWeeks(prev, 1));
    else setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNext = () => {
    if (viewMode === "daily") setSelectedDate(prev => addDays(prev, 1));
    else if (viewMode === "weekly") setSelectedDate(prev => addWeeks(prev, 1));
    else setSelectedDate(prev => addMonths(prev, 1));
  };

  // --- SYNC LOGIC: Timeline Content ---
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const rDate = new Date(r.triggerTime);
      if (viewMode === "daily") return isSameDay(rDate, selectedDate);
      if (viewMode === "weekly") return isWithinInterval(rDate, { 
        start: startOfWeek(selectedDate), 
        end: endOfWeek(selectedDate) 
      });
      return isSameMonth(rDate, selectedDate);
    });
  }, [reminders, selectedDate, viewMode]);

  // --- CALENDAR WIDGET LOGIC (correct padding days) ---
  const miniCalendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // --- WEEK VIEW LOGIC ---
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(selectedDate),
      end: endOfWeek(selectedDate)
    });
  }, [selectedDate]);

  // --- MONTH VIEW LOGIC ---
  const monthCalendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedDate));
    const end = endOfWeek(endOfMonth(selectedDate));
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // --- CURRENT REMINDER SIDEBAR CARD LOGIC ---
  const currentReminder = useMemo(() => {
    const todayReminders = reminders.filter(r => isSameDay(new Date(r.triggerTime), startOfToday()));
    const now = new Date();
    // Sort ascending to get next upcoming first
    const sorted = [...todayReminders].sort((a, b) => new Date(a.triggerTime) - new Date(b.triggerTime));
    const upcoming = sorted.filter(r => new Date(r.triggerTime) >= now);
    if (upcoming.length > 0) return upcoming[0];
    return null;
  }, [reminders]);

  const upcomingActiveReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter(r => new Date(r.triggerTime) >= now)
      .sort((a, b) => new Date(a.triggerTime) - new Date(b.triggerTime))
      .slice(0, 10);
  }, [reminders]);

  // --- AUTO-SCROLL TO FIRST REMINDER ---
  useEffect(() => {
    if (viewMode !== "daily" || loading || reminders.length === 0) return;

    const dayReminders = reminders.filter(r => isSameDay(new Date(r.triggerTime), selectedDate));
    if (dayReminders.length === 0) return;

    // Find earliest reminder of the day
    const earliestReminder = dayReminders.reduce((earliest, current) => {
      if (!earliest) return current;
      return new Date(current.triggerTime) < new Date(earliest.triggerTime) ? current : earliest;
    }, null);

    if (earliestReminder) {
      const hour = new Date(earliestReminder.triggerTime).getHours();
      const timer = setTimeout(() => {
        const container = workspaceBodyRef.current;
        const element = document.getElementById(`timeline-hour-${hour}`);
        if (container && element) {
          const top = element.offsetTop - container.offsetTop;
          container.scrollTo({ top, behavior: "smooth" });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, viewMode, reminders, loading]);

  const handleSave = async (payload) => {
    guardAction(async () => {
      try {
        if (editing && editing._id) {
          await api.put(`/reminders/${editing._id}`, payload);
          toast.success("Reminder updated successfully!");
        } else {
          await api.post("/reminders", payload);
          toast.success("Reminder created successfully!");
        }
        queryClient.invalidateQueries({ queryKey: ["reminders"] });
        setShowModal(false);
        setEditing(null);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to save reminder.");
      }
    });
  };

  const getWeekRangeString = () => {
    const start = startOfWeek(selectedDate);
    const end = endOfWeek(selectedDate);
    if (isSameMonth(start, end)) {
      return `${format(start, "MMMM dd")} - ${format(end, "dd, yyyy")}`;
    }
    return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
  };

  return (
    <div className="reminders-app-container">
      {/* SIDEBAR */}
      <aside className="reminders-sidebar-container">
        <div className="side-card calendar-card" style={{ "--card-accent": "var(--accent-teal)" }}>
          <div className="side-card-header">
            <h4>{format(currentMonth, "MMMM yyyy")}</h4>
            <div className="mini-nav">
              <i className="fa-solid fa-chevron-left" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}></i>
              <i className="fa-solid fa-chevron-right" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}></i>
            </div>
          </div>
          <div className="mini-calendar-grid">
            {['S','M','T','W','T','F','S'].map((d, idx) => <span key={`${d}-${idx}`} className="day-label">{d}</span>)}
            {miniCalendarDays.map(day => {
              const isToday = isSameDay(day, startOfToday());
              const isSelected = isSameDay(day, selectedDate);
              const inMonth = isSameMonth(day, currentMonth);
              const hasReminders = reminders.some(r => isSameDay(new Date(r.triggerTime), day));
              return (
                <button 
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`mini-date-cell ${isSelected ? 'is-active' : ''} ${isToday ? 'is-today' : ''} ${!inMonth ? 'outside-month' : ''}`}
                >
                  {format(day, "d")}
                  {isToday ? (
                    <span className="event-dot is-today-dot" />
                  ) : (
                    hasReminders && <span className="event-dot" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Highlight Card (TEAL) */}
        <div className="side-card highlight-teal-card" style={{ "--card-accent": "var(--accent-teal)" }}>
          <span className="overtitle">Current Reminder</span>
          {loading ? (
            <div className="skeleton-loader" style={{ height: "24px", width: "80%", borderRadius: "4px", margin: "6px 0 10px" }}></div>
          ) : (
            <h3>{currentReminder?.title || "Schedule Clear"}</h3>
          )}
          <div className="meta-info">
             <i className="fa-regular fa-clock"></i> 
             {loading ? (
               <span className="skeleton-loader" style={{ height: "16px", width: "40px", borderRadius: "4px", display: "inline-block" }}></span>
             ) : currentReminder ? (
               format(new Date(currentReminder.triggerTime), "hh:mm a")
             ) : (
               "No tasks today"
             )}
          </div>
        </div>


        {/* 4. Upcoming Reminders Card */}
        <div className="side-card upcoming-reminders-card" style={{ "--card-accent": "var(--accent-teal)" }}>
          <div className="filter-title-row" style={{ marginBottom: '10px' }}>
            <h4>Upcoming</h4>
            <i className="fa-regular fa-bell"></i>
          </div>
          <div className="side-upcoming-list scrollbar-custom">
            {loading ? (
              <div className="skeleton-loader" style={{ height: "40px", borderRadius: "var(--radius-sm)" }}></div>
            ) : upcomingActiveReminders.length === 0 ? (
              <span className="no-reminders-text">No upcoming reminders</span>
            ) : (
              upcomingActiveReminders.map(r => (
                <div 
                  key={r._id} 
                  className="side-upcoming-item"
                  style={{ "--card-accent": getReminderColor(r._id) }}
                  onClick={() => { setEditing(r); setShowModal(true); }}
                >
                  <strong>{r.title}</strong>
                  <span>
                    {format(new Date(r.triggerTime), "MMM dd, hh:mm a")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="reminders-main-workspace">
        <header className="workspace-header">
          <div className="workspace-date-nav">
            <Button variant="secondary" size="sm" icon="fa-solid fa-chevron-left" onClick={handlePrev} aria-label="Previous" />
            <h2>
              {viewMode === 'daily' && format(selectedDate, "MMMM dd, yyyy")}
              {viewMode === 'weekly' && getWeekRangeString()}
              {viewMode === 'monthly' && format(selectedDate, "MMMM yyyy")}
            </h2>
            <Button variant="secondary" size="sm" icon="fa-solid fa-chevron-right" onClick={handleNext} aria-label="Next" />
          </div>
          
          <div className="workspace-actions">
            <div className="view-mode-toggle">
              <button className={viewMode === 'daily' ? 'active' : ''} onClick={() => setViewMode('daily')}>Day</button>
              <button className={viewMode === 'weekly' ? 'active' : ''} onClick={() => setViewMode('weekly')}>Week</button>
              <button className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>Month</button>
            </div>
            <Button 
              icon="fa-solid fa-plus" 
              onClick={() => { 
                const defaultTime = new Date(selectedDate);
                const now = new Date();
                defaultTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
                setEditing({ triggerTime: defaultTime.toISOString() }); 
                setShowModal(true); 
              }}
            >
              New Reminder
            </Button>
          </div>
        </header>

        {/* Timeline body */}
        {viewMode === 'daily' && (
          <div className="workspace-body scrollbar-custom" ref={workspaceBodyRef}>
            {HOURS.map(hour => (
              <div key={hour} id={`timeline-hour-${hour}`} className="timeline-row">
                <div className="timeline-time">
                  {format(new Date().setHours(hour, 0), "hh:00 a")}
                </div>
                <div className="timeline-content">
                  {loading ? (
                    hour % 3 === 0 && (
                      <div className="timeline-pill skeleton-loader" style={{ height: "38px", width: "120px", border: "none", animation: "skeleton-pulse 1.4s ease infinite" }}></div>
                    )
                  ) : (
                    filteredReminders
                      .filter(r => new Date(r.triggerTime).getHours() === hour)
                      .map(reminder => {
                        const isExpired = new Date(reminder.triggerTime) < new Date();
                        return (
                          <div 
                            key={reminder._id} 
                            className={`timeline-pill ${isExpired ? 'is-expired' : ''}`}
                            style={{ "--card-accent": getReminderColor(reminder._id) }}
                            onClick={() => {setEditing(reminder); setShowModal(true)}}
                          >
                            <div className="pill-accent"></div>
                            <div className="pill-text">
                              <strong>
                                {reminder.title}
                                {reminder.syncToGoogleCalendar && (
                                  <i className="fa-solid fa-calendar-check" style={{ color: "var(--accent-teal)", marginLeft: "6px", fontSize: "0.8rem" }} title="Synced with Google Calendar"></i>
                                )}
                              </strong>
                              <span>
                                <i className="fa-regular fa-clock" style={{ marginRight: "4px" }}></i>
                                {format(new Date(reminder.triggerTime), "hh:mm a")}
                                {reminder.repeat !== "none" ? ` • 🔁 ${reminder.repeat}` : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'weekly' && (
          <div className="workspace-body scrollbar-custom" ref={workspaceBodyRef}>
            {weekDays.map(day => {
              const dayReminders = reminders.filter(r => isSameDay(new Date(r.triggerTime), day));
              const isToday = isSameDay(day, startOfToday());
              return (
                <div key={day.toString()} className={`timeline-row week-row ${isToday ? 'is-today-row' : ''}`}>
                  <div className="timeline-time week-time">
                    <span className="week-day-name">{format(day, "EEE")}</span>
                    <span className="week-day-date">{format(day, "dd")}</span>
                  </div>
                  <div 
                    className="timeline-content week-content"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        const targetDate = new Date(day);
                        targetDate.setHours(9, 0, 0, 0);
                        setEditing({ triggerTime: targetDate.toISOString() });
                        setShowModal(true);
                      }
                    }}
                  >
                    {loading ? (
                      <div className="timeline-pill skeleton-loader" style={{ height: "38px", width: "120px", border: "none" }}></div>
                    ) : (
                      dayReminders.map(reminder => {
                        const isExpired = new Date(reminder.triggerTime) < new Date();
                        return (
                          <div 
                            key={reminder._id} 
                            className={`timeline-pill ${isExpired ? 'is-expired' : ''}`}
                            style={{ "--card-accent": getReminderColor(reminder._id) }}
                            onClick={() => {setEditing(reminder); setShowModal(true)}}
                          >
                            <div className="pill-accent"></div>
                            <div className="pill-text">
                              <strong>
                                {reminder.title}
                                {reminder.syncToGoogleCalendar && (
                                  <i className="fa-solid fa-calendar-check" style={{ color: "var(--accent-teal)", marginLeft: "6px", fontSize: "0.8rem" }} title="Synced with Google Calendar"></i>
                                )}
                              </strong>
                              <span>
                                <i className="fa-regular fa-clock" style={{ marginRight: "4px" }}></i>
                                {format(new Date(reminder.triggerTime), "hh:mm a")}
                                {reminder.repeat !== "none" ? ` • 🔁 ${reminder.repeat}` : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className="workspace-body month-view-body scrollbar-custom">
            <div className="month-day-header">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="month-day-name">{d}</div>
              ))}
            </div>
            <div className="month-calendar-grid" style={{ gridTemplateRows: `repeat(${monthCalendarDays.length / 7}, 1fr)` }}>
              {monthCalendarDays.map(day => {
                const dayReminders = reminders.filter(r => isSameDay(new Date(r.triggerTime), day));
                const isToday = isSameDay(day, startOfToday());
                const isSelected = isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, selectedDate);
                
                return (
                  <div 
                    key={day.toString()}
                    className={`month-date-cell ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${!inMonth ? 'outside-month' : ''}`}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => {
                      setSelectedDate(day);
                      const targetDate = new Date(day);
                      targetDate.setHours(9, 0, 0, 0);
                      setEditing({ triggerTime: targetDate.toISOString() });
                      setShowModal(true);
                    }}
                  >
                    <span className="month-date-num">{format(day, "d")}</span>
                    <div className="month-day-events">
                      {loading ? (
                        <div className="skeleton-loader" style={{ height: "16px", width: "80%", borderRadius: "2px" }}></div>
                      ) : (
                        dayReminders.slice(0, 3).map(reminder => {
                          const isExpired = new Date(reminder.triggerTime) < new Date();
                          return (
                            <div 
                              key={reminder._id} 
                              className={`month-event-tag ${isExpired ? 'is-expired' : ''}`}
                              style={{ "--event-color": getReminderColor(reminder._id) }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditing(reminder);
                                setShowModal(true);
                              }}
                            >
                              <span className="event-dot-small" style={{ backgroundColor: getReminderColor(reminder._id) }}></span>
                              <span className="event-title-small">
                                {reminder.title}
                                {reminder.syncToGoogleCalendar && (
                                  <i className="fa-solid fa-calendar-check" style={{ color: "var(--accent-teal)", marginLeft: "3px", fontSize: "0.65rem" }} title="Synced with Google Calendar"></i>
                                )}
                              </span>
                            </div>
                          );
                        })
                      )}
                      {dayReminders.length > 3 && (
                        <div className="month-event-more">
                          +{dayReminders.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <ReminderModal initial={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSave={handleSave} onDelete={handleDeleteReminderClick} />
      )}

      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

export default RemindersPage;