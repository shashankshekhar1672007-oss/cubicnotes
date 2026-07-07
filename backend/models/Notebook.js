const mongoose = require("mongoose");

const notebookSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name:   { type: String, required: true, trim: true },
    accent: { type: String, default: "var(--accent-purple)" },
    // null = root-level; set to another Notebook._id for nested folders
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Notebook", default: null },
  },
  { timestamps: true }
);

notebookSchema.index({ user: 1, parent: 1 });

module.exports = mongoose.model("Notebook", notebookSchema);
