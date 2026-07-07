const Note = require("../models/Note");
const Task = require("../models/Task");
const Reminder = require("../models/Reminder");

const searchAll = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ notes: [], tasks: [], reminders: [] });
    }

    const userId = req.user._id;

    // Search Notes: use text search index first
    let notes = await Note.find({
      user: userId,
      isTrashed: false,
      $text: { $search: q }
    })
      .limit(10)
      .populate("notebook", "name accent")
      .lean();

    // Fallback: regex search on title, subheading, or tags if text search yielded nothing (for partial words)
    if (notes.length === 0) {
      notes = await Note.find({
        user: userId,
        isTrashed: false,
        $or: [
          { title: { $regex: q, $options: "i" } },
          { subheading: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } }
        ]
      })
        .limit(10)
        .populate("notebook", "name accent")
        .lean();
    }

    // Search Tasks: regex on title, tags, or subtasks
    const tasks = await Task.find({
      user: userId,
      isTrashed: false,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { "subtasks.text": { $regex: q, $options: "i" } }
      ]
    })
      .limit(10)
      .lean();

    // Search Reminders: regex on title or description
    const reminders = await Reminder.find({
      user: userId,
      isTrashed: false,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ]
    })
      .limit(10)
      .lean();

    res.json({ notes, tasks, reminders });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchAll };
