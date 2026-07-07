const Page     = require("../models/Page");
const Notebook = require("../models/Notebook");

/* Verifies the notebook belongs to the requesting user before touching its pages */
const assertNotebookOwnership = async (notebookId, userId) => {
  const notebook = await Notebook.findOne({ _id: notebookId, user: userId });
  if (!notebook) {
    const err = new Error("Notebook not found");
    err.statusCode = 404;
    throw err;
  }
  return notebook;
};

/* ── GET /api/notebooks/:notebookId/pages ───── */
const getPages = async (req, res, next) => {
  try {
    await assertNotebookOwnership(req.params.notebookId, req.user._id);

    const pages = await Page.find({
      notebook:  req.params.notebookId,
      isTrashed: false,
    }).sort({ order: 1, createdAt: 1 });

    res.json(pages);
  } catch (err) { next(err); }
};

/* ── POST /api/notebooks/:notebookId/pages ──── */
const createPage = async (req, res, next) => {
  try {
    await assertNotebookOwnership(req.params.notebookId, req.user._id);

    const { title, icon } = req.body;

    // New pages go to the end of the list
    const lastPage = await Page.findOne({ notebook: req.params.notebookId })
      .sort({ order: -1 });
    const nextOrder = lastPage ? lastPage.order + 1 : 0;

    const page = await Page.create({
      user:     req.user._id,
      notebook: req.params.notebookId,
      title:    title || "Untitled",
      icon:     icon  || "",
      order:    nextOrder,
      content:  null,
    });
    res.status(201).json(page);
  } catch (err) { next(err); }
};

/* ── GET /api/pages/:id ──────────────────────── */
const getPageById = async (req, res, next) => {
  try {
    const page = await Page.findOne({ _id: req.params.id, user: req.user._id });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) { next(err); }
};

const updatePage = async (req, res, next) => {
  try {
    const { title, content, icon, order } = req.body;

    const page = await Page.findOne({ _id: req.params.id, user: req.user._id });
    if (!page) return res.status(404).json({ message: "Page not found" });
    if (page.isTrashed) return res.status(400).json({ message: "Cannot update a trashed page" });

    if (title   !== undefined) page.title = title;
    if (content !== undefined) page.content = content;
    if (icon    !== undefined) page.icon = icon;
    if (order   !== undefined) page.order = order;

    await page.save();
    res.json(page);
  } catch (err) { next(err); }
};

/* ── DELETE /api/pages/:id (soft trash) ─────── */
const deletePage = async (req, res, next) => {
  try {
    const { permanent } = req.query;

    if (permanent === "true") {
      await Page.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      return res.json({ message: "Page permanently deleted" });
    }

    const page = await Page.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: true, trashedAt: new Date() },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ message: "Page moved to trash", page });
  } catch (err) { next(err); }
};

/* ── PUT /api/pages/reorder ──────────────────── */
/* Body: { pageIds: [id1, id2, id3, ...] } in desired display order */
const reorderPages = async (req, res, next) => {
  try {
    const { pageIds } = req.body;
    if (!Array.isArray(pageIds)) {
      return res.status(400).json({ message: "pageIds must be an array" });
    }

    const bulkOps = pageIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, user: req.user._id },
        update: { order: index }
      }
    }));

    await Page.bulkWrite(bulkOps);
    res.json({ message: "Pages reordered" });
  } catch (err) { next(err); }
};

/* ── PUT /api/pages/:id/restore ─────────────── */
const restorePage = async (req, res, next) => {
  try {
    const page = await Page.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: false, trashedAt: null },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) { next(err); }
};

module.exports = { getPages, createPage, getPageById, updatePage, deletePage, reorderPages, restorePage };
