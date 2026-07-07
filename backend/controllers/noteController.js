const Note = require("../models/Note");

const ACCENT_COLORS = [
  "var(--accent-teal)", "var(--accent-purple)", "var(--accent-amber)",
  "var(--accent-coral)", "var(--accent-blue)", "var(--accent-pink)",
  "var(--accent-lime)", "var(--accent-yellow)", "var(--accent-cyan)", "var(--accent-peach)",
];
const randomAccent = () => ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

/* ── GET /api/notes ─────────────────────────── */
const getNotes = async (req, res, next) => {
  try {
    const { search, tag, notebook, archived, trashed, limit, countOnly } = req.query;

    const filter = { user: req.user._id };

    if (trashed === "true")   { filter.isTrashed  = true; }
    else if (archived === "true") { filter.isArchived = true; filter.isTrashed = false; }
    else                      { filter.isTrashed = false; filter.isArchived = false; }

    if (notebook)    filter.notebook = notebook;
    if (tag)         filter.tags     = tag;
    if (search)      filter.$text    = { $search: search };
    if (req.query.pinned === "true") filter.isPinned = true;

    if (countOnly === "true") {
      const count = await Note.countDocuments(filter);
      return res.json({ count });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 0, 0), 100);
    const sortBy = req.query.sort || "pinned";
    const sortSpec = sortBy === "recent"
      ? { createdAt: -1 }
      : { isPinned: -1, createdAt: -1 };

    const notesQuery = Note.find(filter)
      .sort(sortSpec)
      .populate("notebook", "name accent")
      .lean();

    if (parsedLimit) notesQuery.limit(parsedLimit);

    const notes = await notesQuery;
    res.json(notes);
  } catch (err) { next(err); }
};

/* ── POST /api/notes ────────────────────────── */
const createNote = async (req, res, next) => {
  try {
    const { title, subheading, content, accent, tags, notebook } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const note = await Note.create({
      user:       req.user._id,
      title,
      subheading: subheading || "",
      content:    content  || "",
      accent:     accent   || randomAccent(),
      tags:       tags     || [],
      notebook:   notebook || null,
    });
    res.status(201).json(note);
  } catch (err) { next(err); }
};

/* ── GET /api/notes/:id ─────────────────────── */
const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id })
      .populate("notebook", "name accent");
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (err) { next(err); }
};

/* ── PUT /api/notes/:id ─────────────────────── */
const updateNote = async (req, res, next) => {
  try {
    const { title, subheading, content, accent, tags, notebook, isPinned, isLocked, isArchived } = req.body;

    // Load the existing note, apply changes, and save so `createdAt` remains intact.
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id }).select("+revisions");
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (note.isTrashed) return res.status(400).json({ message: "Cannot update a trashed note" });

    // Store revision BEFORE applying changes if the content/title is actually modified
    const isContentChanged = (content !== undefined && content !== note.content) || 
                             (title !== undefined && title !== note.title);

    if (isContentChanged) {
      const lastRev = note.revisions[note.revisions.length - 1];
      const hasChangedFromLastRev = !lastRev || lastRev.content !== note.content || lastRev.title !== note.title;

      if (hasChangedFromLastRev) {
        const timeSinceLastRev = lastRev ? (Date.now() - new Date(lastRev.savedAt).getTime()) : Infinity;
        // Throttle revision saves to once every 60 seconds
        if (timeSinceLastRev > 60000) {
          note.revisions.push({
            title: note.title,
            subheading: note.subheading,
            content: note.content,
            tags: note.tags,
            accent: note.accent,
            savedAt: new Date(),
          });

          // Cap revisions array at 10 items
          if (note.revisions.length > 10) {
            note.revisions.shift();
          }
        }
      }
    }

    if (title      !== undefined) note.title = title;
    if (subheading !== undefined) note.subheading = subheading;
    if (content    !== undefined) note.content = content;
    if (accent     !== undefined) note.accent = accent;
    if (tags       !== undefined) note.tags = tags;
    if (notebook   !== undefined) note.notebook = notebook;
    if (isPinned   !== undefined) note.isPinned = isPinned;
    if (isLocked   !== undefined) note.isLocked = isLocked;
    if (isArchived !== undefined) note.isArchived = isArchived;

    await note.save();
    res.json(note);
  } catch (err) { next(err); }
};

/* ── DELETE /api/notes/:id (soft trash) ─────── */
const deleteNote = async (req, res, next) => {
  try {
    const { permanent } = req.query;

    if (permanent === "true") {
      await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      return res.json({ message: "Note permanently deleted" });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: true, trashedAt: new Date() },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note moved to trash", note });
  } catch (err) { next(err); }
};

/* ── PUT /api/notes/:id/restore ─────────────── */
const restoreNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: false, trashedAt: null },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (err) { next(err); }
};

/* ── GET /api/notes/activity ────────────────── */
const getActivity = async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const notes = await Note.find({
      user: req.user._id,
      isTrashed: false,
      createdAt: { $gte: sixMonthsAgo }
    }, "createdAt").lean();

    const Task = require("../models/Task");
    const tasks = await Task.find({
      user: req.user._id,
      isTrashed: false,
      isCompleted: true,
      $or: [
        { completedAt: { $gte: sixMonthsAgo } },
        { completedAt: null, updatedAt: { $gte: sixMonthsAgo } },
        { completedAt: { $exists: false }, updatedAt: { $gte: sixMonthsAgo } }
      ]
    }, "completedAt updatedAt").lean();

    const activity = {};
    const addActivity = (date) => {
      const dateStr = date.toISOString().split("T")[0];
      activity[dateStr] = (activity[dateStr] || 0) + 1;
    };

    notes.forEach((n) => {
      if (n.createdAt) addActivity(n.createdAt);
    });
    tasks.forEach((t) => {
      const dateToUse = t.completedAt || t.updatedAt;
      if (dateToUse) addActivity(dateToUse);
    });

    res.json({
      activity,
      breakdown: {
        notes: notes.length,
        tasks: tasks.length
      }
    });
  } catch (err) { next(err); }
};

/* ── GET /api/notes/:id/revisions ───────────── */
const getNoteRevisions = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id }).select("+revisions");
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note.revisions || []);
  } catch (err) { next(err); }
};

/* ── POST /api/notes/:id/revisions/:revisionId/restore ── */
const restoreNoteRevision = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id }).select("+revisions");
    if (!note) return res.status(404).json({ message: "Note not found" });

    const revision = note.revisions.id(req.params.revisionId);
    if (!revision) return res.status(404).json({ message: "Revision not found" });

    // Push current pre-restored state to revisions
    note.revisions.push({
      title: note.title,
      subheading: note.subheading,
      content: note.content,
      tags: note.tags,
      accent: note.accent,
      savedAt: new Date(),
    });

    if (note.revisions.length > 10) {
      note.revisions.shift();
    }

    // Restore revision values
    note.title = revision.title;
    note.subheading = revision.subheading || "";
    note.content = revision.content || "";
    note.tags = revision.tags || [];
    note.accent = revision.accent || "var(--accent-teal)";

    await note.save();

    res.json({
      message: "Note restored to revision successfully",
      note
    });
  } catch (err) { next(err); }
};

module.exports = {
  getNotes,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  restoreNote,
  getActivity,
  getNoteRevisions,
  restoreNoteRevision
};
