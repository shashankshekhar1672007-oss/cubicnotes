const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const taskSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    linkedNote:  { type: mongoose.Schema.Types.ObjectId, ref: "Note", default: null },
    title:       { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false },
    priority:    { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueDate:     { type: Date, default: null },
    completedAt: { type: Date, default: null },
    subtasks:    [subtaskSchema],
    tags:        [{ type: String, trim: true }],
    autoCompleteOnSubtasksDone: { type: Boolean, default: false },
    isTrashed:   { type: Boolean, default: false },
    trashedAt:   { type: Date,    default: null },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, isCompleted: 1, isTrashed: 1, dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
