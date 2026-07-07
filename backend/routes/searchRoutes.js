const express = require("express");
const router = express.Router();
const { searchAll } = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", searchAll);

module.exports = router;
