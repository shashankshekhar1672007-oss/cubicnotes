const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    notebook:   { type: mongoose.Schema.Types.ObjectId, ref: "Notebook", default: null },
    title:      { type: String, required: true, trim: true },
    subheading: { type: String, default: "" },
    content:    { type: String, default: "" },
    accent:     { type: String, default: "var(--accent-teal)" },
    tags:       [{ type: String, trim: true, lowercase: true }],
    isPinned:   { type: Boolean, default: false },
    isLocked:   { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isTrashed:  { type: Boolean, default: false },
    trashedAt:  { type: Date,    default: null },
    revisions: {
      type: [
        {
          title: { type: String, required: true },
          subheading: { type: String, default: "" },
          content: { type: String, default: "" },
          tags: [{ type: String }],
          accent: { type: String },
          savedAt: { type: Date, default: Date.now },
        }
      ],
      default: [],
      select: false
    }
  },
  { timestamps: true }
);

// Full-text search index on title + content + tags
noteSchema.index({ title: "text", content: "text", tags: "text" });
noteSchema.index({ user: 1, isTrashed: 1, isArchived: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);
