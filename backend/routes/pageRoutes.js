const express  = require("express");
const router   = express.Router();
const {
  getPageById, updatePage, deletePage, reorderPages, restorePage
} = require("../controllers/pageController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.put("/reorder", reorderPages);   // must come before /:id to avoid route collision

router.route("/:id")
  .get(getPageById)
  .put(updatePage)
  .delete(deletePage);

router.put("/:id/restore", restorePage);

module.exports = router;
