const express = require("express");
const router = express.Router();
const {
  getVapidKey, subscribe, unsubscribe
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/vapid-key", getVapidKey);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
