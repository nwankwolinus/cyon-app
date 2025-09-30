const express = require('express');
const auth = require("../middleware/auth.js");
const Dues = require("../models/Dues.js");

const router = express.Router();

// Admin creates dues record
router.post("/create", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const { userId, year, month, status } = req.body;

    // Check if dues already recorded for this user, year, and month
    const existing = await Dues.findOne({ user: userId, year, month });
    if (existing) {
      return res.status(400).json({ msg: "Dues already recorded for this user in this month" });
    }

    const dues = new Dues({
      user: userId,  // 👈 this is the parishioner/member
      year,
      month,
      status: status || "paid", // admin sets it directly
    });

    await dues.save();
    res.status(201).json({ msg: "Dues created successfully", dues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dues history for logged-in user
router.get("/history", auth, async (req, res) => {
  try {
    const records = await Dues.find({ user: req.user.id }).sort({ year: -1, month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all dues (admin only)
router.get("/all", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const records = await Dues.find().populate("user", "name email church role").sort({ year: -1, month: -1 });
    
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dues record for a user by year
router.get("/:userId/:year", auth, async (req, res) => {
  try {
    const { userId, year } = req.params;
    const dues = await Dues.findOne({ user: userId, year }).populate("user", "name email").sort({ month: 1 });
    if (!dues || dues.length === 0) {
      return res.status(404).json({ msg: "No dues record found" });
    }
    res.json(dues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;