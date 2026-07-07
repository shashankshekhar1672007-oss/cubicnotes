const cron     = require("node-cron");
const Reminder = require("../models/Reminder");

/**
 * Runs every minute — finds reminders that just became due and marks repeating
 * ones with their next trigger time so the frontend polling can pick them up.
 *
 * NOTE: For production, swap this for a message queue (BullMQ / Redis) or a
 * proper scheduler (Agenda.js) to support multi-instance deployments.
 */
cron.schedule("* * * * *", async () => {
  try {
    const now    = new Date();
    const window = new Date(now.getTime() - 60 * 1000); // 1 min ago

    const due = await Reminder.find({
      triggerTime: { $gte: window, $lte: now },
      isRead:      false,
      isTrashed:   false,
    }).populate("user");

    const { webpush } = require("../config/webPush");
    const User = require("../models/User");

    for (const reminder of due) {
      // Send Web Push notification if user has active subscriptions
      if (reminder.user && Array.isArray(reminder.user.pushSubscriptions)) {
        const payload = JSON.stringify({
          title: reminder.title,
          body: reminder.description || "Reminder Triggered!",
          url: "/reminders",
        });

        for (const sub of reminder.user.pushSubscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
          } catch (err) {
            console.error(`[cron] Failed to send push notification to user ${reminder.user._id}:`, err.message);
            // Clean up expired subscriptions (410 Gone / 404 Not Found)
            if (err.statusCode === 410 || err.statusCode === 404) {
              await User.findByIdAndUpdate(reminder.user._id, {
                $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
              });
            }
          }
        }
      }

      if (reminder.repeat !== "none") {
        const next = new Date(reminder.triggerTime);

        if (reminder.repeat === "daily")   next.setDate(next.getDate() + 1);
        if (reminder.repeat === "weekly")  next.setDate(next.getDate() + 7);
        if (reminder.repeat === "monthly") next.setMonth(next.getMonth() + 1);

        // Reset so it will fire again next cycle
        await Reminder.findByIdAndUpdate(reminder._id, {
          triggerTime: next,
          isRead:      false,
        });
      }
    }

    if (due.length > 0) {
      console.log(`[cron] ${due.length} reminder(s) fired at ${now.toISOString()}`);
    }
  } catch (err) {
    console.error("[cron] Reminder job error:", err.message);
  }
});

console.log("⏰ Reminder cron worker started");
