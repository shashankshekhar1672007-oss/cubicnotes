const express   = require("express");
const cors      = require("cors");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

/* ── Middleware ─────────────────────────────────────── */
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Routes ─────────────────────────────────────────── */
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/notes",     require("./routes/noteRoutes"));
app.use("/api/notebooks", require("./routes/notebookRoutes"));
app.use("/api/pages",     require("./routes/pageRoutes"));
app.use("/api/tasks",     require("./routes/taskRoutes"));
app.use("/api/reminders", require("./routes/reminderRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/search",    require("./routes/searchRoutes"));
app.use("/api/ai",        require("./routes/aiRoutes"));

/* ── Health check ───────────────────────────────────── */
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date() }));

/* ── Serve Static Assets in Production ──────────────── */
const path = require("path");
const fs = require("fs");
const frontendDistPath = path.join(__dirname, "../frontend/dist");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

/* ── Error middleware (must be last) ────────────────── */
app.use(require("./middleware/errorMiddleware"));

/* ── Cron jobs ──────────────────────────────────────── */
require("./workers/reminderCron");
require("./workers/trashCleanupCron");
require("./workers/creditResetCron");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));