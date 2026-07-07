const express  = require("express");
const router   = express.Router();
const {
  getReminders, getActiveReminders, createReminder, updateReminder, deleteReminder
} = require("../controllers/reminderController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/active", getActiveReminders);
router.route("/").get(getReminders).post(createReminder);
router.route("/:id").put(updateReminder).delete(deleteReminder);

module.exports = router;
