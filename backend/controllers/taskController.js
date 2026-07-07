const Task = require("../models/Task");

/* ── GET /api/tasks ─────────────────────────── */
const getTasks = async (req, res, next) => {
  try {
    const { completed, priority, linkedNote, trashed, limit, countOnly } = req.query;
    const filter = { user: req.user._id };

    filter.isTrashed    = trashed    === "true";
    if (completed !== undefined) filter.isCompleted = completed === "true";
    if (priority)                filter.priority    = priority;
    if (linkedNote)              filter.linkedNote  = linkedNote;

    if (countOnly === "true") {
      const count = await Task.countDocuments(filter);
      return res.json({ count });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 0, 0), 100);
    const tasksQuery = Task.find(filter).sort({ createdAt: -1 }).lean();
    if (parsedLimit) tasksQuery.limit(parsedLimit);

    const tasks = await tasksQuery;
    res.json(tasks);
  } catch (err) { next(err); }
};

/* ── POST /api/tasks ────────────────────────── */
const createTask = async (req, res, next) => {
  try {
    const { title, priority, dueDate, subtasks, tags, linkedNote, isCompleted, autoCompleteOnSubtasksDone } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    let markCompleted = isCompleted;
    if (autoCompleteOnSubtasksDone && subtasks && subtasks.length > 0 && subtasks.every(s => s.completed)) {
      markCompleted = true;
    }

    const task = await Task.create({
      user: req.user._id,
      title,
      isCompleted: markCompleted || false,
      priority:   priority   || "medium",
      dueDate:    dueDate    || null,
      completedAt: markCompleted ? new Date() : null,
      subtasks:   subtasks   || [],
      tags:       tags       || [],
      linkedNote: linkedNote || null,
      autoCompleteOnSubtasksDone: autoCompleteOnSubtasksDone || false,
    });
    res.status(201).json(task);
  } catch (err) { next(err); }
};

/* ── PUT /api/tasks/:id ─────────────────────── */
const updateTask = async (req, res, next) => {
  try {
    const { title, isCompleted, priority, dueDate, subtasks, tags, linkedNote, autoCompleteOnSubtasksDone } = req.body;

    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const explicitCompletion = isCompleted !== undefined;

    if (title !== undefined) task.title = title;
    if (explicitCompletion) {
      task.isCompleted = isCompleted;
      task.completedAt = isCompleted ? new Date() : null;
    }
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (subtasks !== undefined) task.subtasks = subtasks;
    if (tags !== undefined) task.tags = tags;
    if (linkedNote !== undefined) task.linkedNote = linkedNote;
    if (autoCompleteOnSubtasksDone !== undefined) task.autoCompleteOnSubtasksDone = autoCompleteOnSubtasksDone;

    if (!explicitCompletion && task.autoCompleteOnSubtasksDone && task.subtasks && task.subtasks.length > 0) {
      const allDone = task.subtasks.every((s) => s.completed);
      task.isCompleted = allDone;
      task.completedAt = allDone ? (task.completedAt || new Date()) : null;
    } else if (explicitCompletion && !isCompleted) {
      task.completedAt = null;
    }

    await task.save();
    res.json(task);
  } catch (err) { next(err); }
};

/* ── DELETE /api/tasks/:id ──────────────────── */
const deleteTask = async (req, res, next) => {
  try {
    const { permanent } = req.query;

    if (permanent === "true") {
      await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      return res.json({ message: "Task permanently deleted" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: true, trashedAt: new Date() },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task trashed", task });
  } catch (err) { next(err); }
};

/* ── PUT /api/tasks/:id/subtask/:sid ────────── */
const toggleSubtask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const sub = task.subtasks.id(req.params.sid);
    if (!sub) return res.status(404).json({ message: "Subtask not found" });

    sub.completed = !sub.completed;

    if (task.autoCompleteOnSubtasksDone && task.subtasks && task.subtasks.length > 0) {
      const allDone = task.subtasks.every((s) => s.completed);
      task.isCompleted = allDone;
      task.completedAt = allDone ? (task.completedAt || new Date()) : null;
    }

    await task.save();
    res.json(task);
  } catch (err) { next(err); }
};

/* ── PUT /api/tasks/:id/restore ─────────────── */
const restoreTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: false, trashedAt: null },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) { next(err); }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, toggleSubtask, restoreTask };
