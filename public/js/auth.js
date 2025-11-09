// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const upload = require('../middleware/upload');


const router = express.Router();

const { addToBlacklist } = require('../utils/tokenBlacklist');



/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
// routes/auth.js
// Register with profile picture upload
router.post('/register', upload.single('profilePic'), async (req, res) => {
  const { name, email, password, church, gender, dob } = req.body;

  try {
    // Check for existing email
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle profile picture
    let profilePicUrl = '';
    if (req.file) {
      profilePicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Create user with default role 'probation'
    user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      church,
      gender,
      dob,
      profilePic: profilePicUrl
    });

    await user.save();

    // Generate token
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      msg: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        church: user.church,
        profilePic: user.profilePic,
        gender: user.gender,
        dob: user.dob
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user & return JWT
 * @access  Public
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Sign JWT
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        church: user.church,
        profilePic: user.profilePic,
        gender: user.gender,
        dob: user.dob
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post("/refresh", auth, async (req, res) => {
  try {
    console.log('🔄 Token refresh requested for user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate new token with same expiration (1 day)
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    console.log('✅ Token refreshed for:', user.email);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        church: user.church,
        profilePic: user.profilePic,
        gender: user.gender,
        dob: user.dob
      }
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ msg: 'Server error during token refresh' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', (req, res) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ msg: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  addToBlacklist(token);
  res.json({ msg: 'User logged out successfully' });
});


// Example endpoint
router.put('/promote/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role }, // 'active' or 'admin'
      { new: true }
    );
    res.json({ msg: 'User role updated', user });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});


module.exports = router;
