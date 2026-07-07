const Notebook = require("../models/Notebook");
const Note     = require("../models/Note");
const Page     = require("../models/Page");

/* ── GET /api/notebooks ─────────────────────── */
const getNotebooks = async (req, res, next) => {
  try {
    const { countOnly } = req.query;
    const filter = { user: req.user._id };

    if (countOnly === "true") {
      const count = await Notebook.countDocuments(filter);
      return res.json({ count });
    }

    const notebooks = await Notebook.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .populate("parent", "name");

    // Attach note count per notebook
    const noteCounts = await Note.aggregate([
      { $match: { user: req.user._id, isTrashed: false } },
      { $group: { _id: "$notebook", count: { $sum: 1 } } },
    ]);
    const noteCountMap = Object.fromEntries(noteCounts.map((c) => [String(c._id), c.count]));

    // Attach page count per notebook
    const pageCounts = await Page.aggregate([
      { $match: { user: req.user._id, isTrashed: false } },
      { $group: { _id: "$notebook", count: { $sum: 1 } } },
    ]);
    const pageCountMap = Object.fromEntries(pageCounts.map((c) => [String(c._id), c.count]));

    res.json(notebooks.map((nb) => ({
      ...nb.toObject(),
      noteCount: noteCountMap[String(nb._id)] || 0,
      pageCount: pageCountMap[String(nb._id)] || 0,
    })));
  } catch (err) { next(err); }
};

/* ── POST /api/notebooks ────────────────────── */
const createNotebook = async (req, res, next) => {
  try {
    const { name, accent, parent } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const notebook = await Notebook.create({
      user:   req.user._id,
      name,
      accent: accent || "var(--accent-purple)",
      parent: parent || null,
    });
    
    res.status(201).json(notebook);
  } catch (err) { next(err); }
};

/* ── PUT /api/notebooks/:id ─────────────────── */
const updateNotebook = async (req, res, next) => {
  try {
    const { name, accent, parent } = req.body;
    const notebook = await Notebook.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...(name && { name }), ...(accent && { accent }), ...(parent !== undefined && { parent }) },
      { new: true }
    );
    if (!notebook) return res.status(404).json({ message: "Notebook not found" });
    res.json(notebook);
  } catch (err) { next(err); }
};

/* ── DELETE /api/notebooks/:id ──────────────── */
const deleteNotebook = async (req, res, next) => {
  try {
    const notebook = await Notebook.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!notebook) return res.status(404).json({ message: "Notebook not found" });

    // Unlink notes from this notebook (keep notes, just remove grouping)
    await Note.updateMany({ notebook: req.params.id }, { notebook: null });
    await Page.deleteMany({ notebook: req.params.id, user: req.user._id });
    res.json({ message: "Notebook deleted" });
  } catch (err) { next(err); }
};

module.exports = { getNotebooks, createNotebook, updateNotebook, deleteNotebook };
