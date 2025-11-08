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
      .populate("from", "name profilePic")
      .populate("feed", "text image")
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 notifications

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 2. Get unread count
// ---------------------------
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user.id, 
      isRead: false 
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 3. Mark a notification as read
// ---------------------------
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 4. Mark all notifications as read
// ---------------------------
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ msg: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 5. Delete a specific notification
// ---------------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ msg: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 6. Clear all notifications
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