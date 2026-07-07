const express  = require("express");
const router   = express.Router();
const {
  getTasks, createTask, updateTask, deleteTask, toggleSubtask, restoreTask
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").get(getTasks).post(createTask);
router.route("/:id").put(updateTask).delete(deleteTask);
router.put("/:id/restore", restoreTask);
router.put("/:id/subtask/:sid/toggle", toggleSubtask);

module.exports = router;
