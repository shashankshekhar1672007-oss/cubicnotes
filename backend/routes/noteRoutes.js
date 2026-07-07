const express  = require("express");
const router   = express.Router();
const {
  getNotes, createNote, getNoteById, updateNote, deleteNote, restoreNote, getActivity,
  getNoteRevisions, restoreNoteRevision
} = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(getNotes)
  .post(createNote);

router.get("/activity", getActivity);

router.get("/:id/revisions", getNoteRevisions);
router.post("/:id/revisions/:revisionId/restore", restoreNoteRevision);

router.route("/:id")
  .get(getNoteById)
  .put(updateNote)
  .delete(deleteNote);

router.put("/:id/restore", restoreNote);

module.exports = router;
