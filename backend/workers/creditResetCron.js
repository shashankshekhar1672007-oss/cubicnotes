const cron = require("node-cron");
const User = require("../models/User");

// Reset AI daily credits for all users at 00:00 UTC each day
cron.schedule("0 0 * * *", async () => {
  try {
    const result = await User.updateMany(
      {},
      { $set: { aiCredits: 5, lastCreditReset: new Date() } }
    );
    console.log(`[AI Credit Reset] Reset credits for ${result.modifiedCount} users at ${new Date().toISOString()}`);
  } catch (err) {
    console.error("[AI Credit Reset] Failed to reset user credits:", err);
  }
});

module.exports = {};
