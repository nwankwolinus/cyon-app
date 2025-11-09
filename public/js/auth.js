// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const upload = require('../middleware/upload');

const router = express.Router();

// Import token blacklist utility if it exists
let addToBlacklist;
try {
  const tokenBlacklist = require('../utils/tokenBlacklist');
  addToBlacklist = tokenBlacklist.addToBlacklist;
} catch (err) {
  console.log('⚠️ Token blacklist not found, using dummy function');
  addToBlacklist = (token) => console.log('Token blacklisted:', token);
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', upload.single('profilePic'), async (req, res) => {
  console.log('\n🔷 ===== REGISTRATION REQUEST STARTED =====');
  console.log('📝 Request body:', req.body);
  console.log('📸 File uploaded:', req.file ? {
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: req.file.path
  } : 'No file');

  const { name, email, password, church, gender, dob } = req.body;

  // Log extracted fields
  console.log('📋 Extracted fields:', {
    name: name || 'MISSING',
    email: email || 'MISSING',
    password: password ? '***' : 'MISSING',
    church: church || 'MISSING',
    gender: gender || 'MISSING',
    dob: dob || 'MISSING'
  });

  try {
    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!church) missingFields.push('church');
    if (!gender) missingFields.push('gender');
    if (!dob) missingFields.push('dob');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        msg: 'Missing required fields: ' + missingFields.join(', '),
        missingFields: missingFields
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format:', email);
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      console.error('❌ Password too short');
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    // Check for existing email
    console.log('🔍 Checking if user exists:', email);
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('✅ Password hashed successfully');

    // Handle profile picture
    let profilePicUrl = '';
    if (req.file) {
      // Store relative path for database
      profilePicUrl = `/uploads/${req.file.filename}`;
      console.log('✅ Profile picture saved:', req.file.filename);
      console.log('✅ Profile picture path:', profilePicUrl);
      console.log('✅ File location:', req.file.path);
    } else {
      console.log('ℹ️ No profile picture uploaded');
    }

    // Create user with default role 'probation'
    console.log('💾 Creating new user...');
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
    console.log('✅ User saved to database:', user._id);

    // Generate token
    console.log('🎫 Generating JWT token...');
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('✅ Token generated');

    const responseData = {
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
    };

    console.log('✅ Sending success response');
    console.log('🔷 ===== REGISTRATION COMPLETED SUCCESSFULLY =====\n');
    
    res.status(201).json(responseData);

  } catch (err) {
    console.error('❌ Registration error:', err.message);
    console.error('❌ Full error stack:', err.stack);
    console.log('🔷 ===== REGISTRATION FAILED =====\n');
    
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

/**
 * @route   PUT /api/auth/promote/:id
 * @desc    Promote user role
 * @access  Admin (should add auth middleware)
 */
router.put('/promote/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role }, // 'active' or 'admin'
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ msg: 'User role updated', user });
  } catch (err) {
    console.error('Promote user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
