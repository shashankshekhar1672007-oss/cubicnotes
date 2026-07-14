const Reminder = require("../models/Reminder");
const User     = require("../models/User");

/* ── GET /api/reminders ─────────────────────── */
const getReminders = async (req, res, next) => {
  try {
    const { upcoming, trashed, limit, countOnly } = req.query;
    const filter = { user: req.user._id, isTrashed: trashed === "true" };

    if (upcoming === "true") {
      filter.triggerTime = { $gte: new Date() };
      filter.isRead      = false;
    }

    if (countOnly === "true") {
      const count = await Reminder.countDocuments(filter);
      return res.json({ count });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 0, 0), 100);
    const remindersQuery = Reminder.find(filter)
      .sort({ triggerTime: 1 })
      .populate("linkedNote", "title accent")
      .lean();

    if (parsedLimit) remindersQuery.limit(parsedLimit);

    const reminders = await remindersQuery;
    res.json(reminders);
  } catch (err) { next(err); }
};

/* ── GET /api/reminders/active ──────────────── */
const getActiveReminders = async (req, res, next) => {
  try {
    const now      = new Date();
    const window   = new Date(now.getTime() - 5 * 60 * 1000); // 5 min past window
    const reminders = await Reminder.find({
      user:        req.user._id,
      triggerTime: { $gte: window, $lte: now },
      isRead:      false,
      isTrashed:   false,
    }).populate("linkedNote", "title accent");

    res.json(reminders);
  } catch (err) { next(err); }
};

/* ── POST /api/reminders ────────────────────── */
const createReminder = async (req, res, next) => {
  try {
    const { title, description, triggerTime, repeat, linkedNote, syncToGoogleCalendar } = req.body;
    if (!title || !triggerTime)
      return res.status(400).json({ message: "Title and triggerTime are required" });

    const reminder = await Reminder.create({
      user:        req.user._id,
      title,
      description: description || "",
      triggerTime: new Date(triggerTime),
      repeat:      repeat     || "none",
      linkedNote:  linkedNote || null,
      syncToGoogleCalendar: !!syncToGoogleCalendar,
    });

    if (reminder.syncToGoogleCalendar && req.user.googleCalendarConnected) {
      console.log(`[Reminder] Calendar sync requested — fetching tokens for user ${req.user._id}`);
      const userWithTokens = await User.findById(req.user._id).select("+googleCalendarTokens");
      if (userWithTokens && userWithTokens.googleCalendarTokens) {
        console.log("[Reminder] Tokens found — creating calendar event...");
        const { createCalendarEvent } = require("../utils/googleCalendar");
        const eventId = await createCalendarEvent(userWithTokens, reminder);
        if (eventId) {
          reminder.googleCalendarEventId = eventId;
          await reminder.save();
          console.log(`[Reminder] Calendar event linked: ${eventId}`);
        } else {
          console.warn("[Reminder] createCalendarEvent returned null — event not created");
        }
      } else {
        console.warn("[Reminder] No calendar tokens found for user despite googleCalendarConnected=true");
      }
    } else {
      if (reminder.syncToGoogleCalendar) {
        console.log("[Reminder] syncToGoogleCalendar=true but googleCalendarConnected=false on req.user");
      }
    }

    // Check if the user got disconnected during the Google Calendar API call
    if (req.user.googleCalendarConnected) {
      const currentUser = await User.findById(req.user._id).select("googleCalendarConnected");
      if (currentUser && !currentUser.googleCalendarConnected) {
        res.setHeader("x-calendar-disconnected", "true");
      }
    }

    res.status(201).json(reminder);
  } catch (err) { next(err); }
};

/* ── PUT /api/reminders/:id ─────────────────── */
const updateReminder = async (req, res, next) => {
  try {
    const { title, description, triggerTime, repeat, isRead, linkedNote, syncToGoogleCalendar } = req.body;

    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id });
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });

    if (title !== undefined) reminder.title = title;
    if (description !== undefined) reminder.description = description;
    if (triggerTime !== undefined) reminder.triggerTime = new Date(triggerTime);
    if (repeat !== undefined) reminder.repeat = repeat;
    if (isRead !== undefined) reminder.isRead = isRead;
    if (linkedNote !== undefined) reminder.linkedNote = linkedNote;
    
    let previousSync = reminder.syncToGoogleCalendar;
    if (syncToGoogleCalendar !== undefined) reminder.syncToGoogleCalendar = syncToGoogleCalendar;

    await reminder.save();

    // Google Calendar Sync Logic
    if (reminder.syncToGoogleCalendar && req.user.googleCalendarConnected) {
      const userWithTokens = await User.findById(req.user._id).select("+googleCalendarTokens");
      if (userWithTokens && userWithTokens.googleCalendarTokens) {
        const { createCalendarEvent, updateCalendarEvent } = require("../utils/googleCalendar");
        if (reminder.googleCalendarEventId) {
          await updateCalendarEvent(userWithTokens, reminder.googleCalendarEventId, reminder);
        } else {
          const eventId = await createCalendarEvent(userWithTokens, reminder);
          if (eventId) {
            reminder.googleCalendarEventId = eventId;
            await reminder.save();
          }
        }
      }
    } else if (!reminder.syncToGoogleCalendar && reminder.googleCalendarEventId) {
      // User turned off sync or disconnected, remove from calendar
      const userWithTokens = await User.findById(req.user._id).select("+googleCalendarTokens");
      if (userWithTokens && userWithTokens.googleCalendarTokens) {
        const { deleteCalendarEvent } = require("../utils/googleCalendar");
        await deleteCalendarEvent(userWithTokens, reminder.googleCalendarEventId);
        reminder.googleCalendarEventId = null;
        await reminder.save();
      }
    }

    // Check if the user got disconnected during the Google Calendar API call
    if (req.user.googleCalendarConnected) {
      const currentUser = await User.findById(req.user._id).select("googleCalendarConnected");
      if (currentUser && !currentUser.googleCalendarConnected) {
        res.setHeader("x-calendar-disconnected", "true");
      }
    }

    res.json(reminder);
  } catch (err) { next(err); }
};

/* ── DELETE /api/reminders/:id ──────────────── */
const deleteReminder = async (req, res, next) => {
  try {
    const { permanent } = req.query;

    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id });
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });

    // Check if the user got disconnected during the Google Calendar API call
    if (req.user.googleCalendarConnected) {
      const currentUser = await User.findById(req.user._id).select("googleCalendarConnected");
      if (currentUser && !currentUser.googleCalendarConnected) {
        res.setHeader("x-calendar-disconnected", "true");
      }
    }

    if (permanent === "true") {
      if (reminder.googleCalendarEventId && req.user.googleCalendarConnected) {
        const userWithTokens = await User.findById(req.user._id).select("+googleCalendarTokens");
        if (userWithTokens && userWithTokens.googleCalendarTokens) {
          const { deleteCalendarEvent } = require("../utils/googleCalendar");
          await deleteCalendarEvent(userWithTokens, reminder.googleCalendarEventId);
        }
      }
      // Check if user got disconnected during deleteCalendarEvent call
      if (req.user.googleCalendarConnected) {
        const currentUser = await User.findById(req.user._id).select("googleCalendarConnected");
        if (currentUser && !currentUser.googleCalendarConnected) {
          res.setHeader("x-calendar-disconnected", "true");
        }
      }
      await Reminder.deleteOne({ _id: req.params.id });
      return res.json({ message: "Reminder deleted" });
    }

    reminder.isTrashed = true;
    
    // Also delete calendar event if it was synced
    if (reminder.googleCalendarEventId && req.user.googleCalendarConnected) {
      const userWithTokens = await User.findById(req.user._id).select("+googleCalendarTokens");
      if (userWithTokens && userWithTokens.googleCalendarTokens) {
        const { deleteCalendarEvent } = require("../utils/googleCalendar");
        await deleteCalendarEvent(userWithTokens, reminder.googleCalendarEventId);
        reminder.googleCalendarEventId = null;
      }
    }

    await reminder.save();

    // Check again in case deletion triggered invalid_grant
    if (req.user.googleCalendarConnected) {
      const currentUser = await User.findById(req.user._id).select("googleCalendarConnected");
      if (currentUser && !currentUser.googleCalendarConnected) {
        res.setHeader("x-calendar-disconnected", "true");
      }
    }

    res.json({ message: "Reminder trashed" });
  } catch (err) { next(err); }
};

module.exports = { getReminders, getActiveReminders, createReminder, updateReminder, deleteReminder };
