const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    linkedNote:  { type: mongoose.Schema.Types.ObjectId, ref: "Note", default: null },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    triggerTime: { type: Date, required: true },
    repeat:      {
      type:    String,
      enum:    ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    isRead:     { type: Boolean, default: false },
    isTrashed:  { type: Boolean, default: false },
    syncToGoogleCalendar: { type: Boolean, default: false },
    googleCalendarEventId: { type: String, default: null },
  },
  { timestamps: true }
);

reminderSchema.index({ user: 1, triggerTime: 1, isRead: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);
