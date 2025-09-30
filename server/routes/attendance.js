const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * @route  POST /api/attendance/mark
 * @desc   Mark attendance for a user
 * @access Logged-in members
 */
router.post("/mark", auth, async (req, res) => {
  
  try {
    const { meetingDate, status } = req.body;

    // Avoid duplicate attendance for the same date
    const existing = await Attendance.findOne({
      user: req.user.id,
      meetingDate,
    });

    if (existing) {
      return res
        .status(400)
        .json({ msg: "Attendance already recorded for this date" });
    }

    const attendance = new Attendance({
      user: req.user.id,
      meetingDate,
      status: status || "present",
    });

    await attendance.save();

    res.json({ msg: "Attendance recorded", attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route  GET /api/attendance/my
 * @desc   Get my attendance history
 * @access Logged-in members
 */
router.get("/history", auth, async (req, res) => {
  try {
    const records = await Attendance.find({user: req.user.id }).sort({ meetingDate: -1});
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route  GET /api/attendance/all
 * @desc   Admin - view all attendance
 * @access Admin only
 */

router.get('/all', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    try {
      const { church, month, year } = req.query;
      let filter = {};

    // filter by church/outstation if provided
    if (church) {
      filter['user.church'] = church;
    }

    // Filter by month + year
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.meetingDate = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name email church role')
      .sort({ meetingDate: -1 });
      
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;