const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

const router = express.Router();

/**
 * @route   PUT /api/admin/promote/:id
 * @desc    Promote a probation member to active (or change role)
 * @access  Admin only
 */
router.put('/promote/:id', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body; // role: "active" | "admin"

    // Find user by ID
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Update role
    user.role = role;
    await user.save();

    res.json({ msg: `User promoted to ${role}`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
