const express  = require("express");
const router   = express.Router();
const {
  getNotebooks, createNotebook, updateNotebook, deleteNotebook
} = require("../controllers/notebookController");
const { getPages, createPage } = require("../controllers/pageController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").get(getNotebooks).post(createNotebook);
router.route("/:id").put(updateNotebook).delete(deleteNotebook);

// Pages nested under a notebook
router.route("/:notebookId/pages").get(getPages).post(createPage);

module.exports = router;