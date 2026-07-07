const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    notebook: { type: mongoose.Schema.Types.ObjectId, ref: "Notebook", required: true },
    title:    { type: String, default: "Untitled", trim: true },
    // Stores Tiptap/ProseMirror JSON document (rich structured content),
    // not a plain string — lets us preserve headings, lists, marks, etc.
    content:  { type: mongoose.Schema.Types.Mixed, default: null },
    icon:     { type: String, default: "" },   // optional emoji/icon for the page
    order:    { type: Number, default: 0 },    // manual drag-reorder position within notebook
    isTrashed:{ type: Boolean, default: false },
    trashedAt:{ type: Date, default: null },
  },
  { timestamps: true }
);

pageSchema.index({ notebook: 1, isTrashed: 1, order: 1 });
pageSchema.index({ user: 1, title: "text" });

module.exports = mongoose.model("Page", pageSchema);
