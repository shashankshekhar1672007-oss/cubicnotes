const cron = require("node-cron");
const Note = require("../models/Note");
const Task = require("../models/Task");
const User = require("../models/User");

// Permanently delete trashed notes and tasks older than each user's retention setting.
cron.schedule("0 1 * * *", async () => {
  try {
    const users = await User.find({});
    for (const user of users) {
      const days = user.trashRetentionDays ?? 30;
      const olderThan = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const noteResult = await Note.deleteMany({ user: user._id, isTrashed: true, trashedAt: { $lte: olderThan } });
      const taskResult = await Task.deleteMany({ user: user._id, isTrashed: true, trashedAt: { $lte: olderThan } });
      if (noteResult.deletedCount || taskResult.deletedCount) {
        console.log(`[Trash Cleanup] User ${user.email}: removed ${noteResult.deletedCount} notes and ${taskResult.deletedCount} tasks older than ${days} days.`);
      }
    }
  } catch (err) {
    console.error("[Trash Cleanup] Failed to purge old trashed items:", err);
  }
});

module.exports = {};
