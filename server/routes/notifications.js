const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Notification = require("../models/Notification");

// ---------------------------
// 1. Get current user's notifications
// ---------------------------
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate("from", "name") // show who triggered it
      .populate("feed", "text image") // show related feed info
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 2. Mark a notification as read
// ---------------------------
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ msg: "Notification not found" });

    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 3. Clear all notifications
// ---------------------------
router.delete("/clear", auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ msg: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
