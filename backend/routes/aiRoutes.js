const express = require("express");
const router = express.Router();
const { summarize, completeText, updateSettings, getCredits, generateText, ocrImage } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// All AI routes require authentication
router.use(protect);

router.post("/summarize", summarize);
router.post("/complete", completeText);
router.post("/generate", generateText);
router.post("/ocr", ocrImage);
router.route("/settings")
  .get(getCredits)
  .put(updateSettings);

module.exports = router;
