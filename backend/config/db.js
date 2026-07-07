const mongoose = require("mongoose");
const User = require("../models/User");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Auto-heal legacy users with missing aiCredits field
    const result = await User.updateMany(
      { aiCredits: { $exists: false } },
      { $set: { aiCredits: 5, lastCreditReset: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Auto-Heal] Set 5 daily AI credits for ${result.modifiedCount} legacy users.`);
    }
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
