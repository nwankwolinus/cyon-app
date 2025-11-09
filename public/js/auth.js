// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// ===== REGISTER NEW USER =====
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      churchAttend,
      role = "user",
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        msg: "Please provide name, email, and password",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create new user
    user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phoneNumber,
      churchAttend,
      role,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            churchAttend: user.churchAttend,
            phoneNumber: user.phoneNumber,
            profilePicture: user.profilePicture,
          },
        });
      }
    );
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ msg: "Server error during registration" });
  }
});

// ===== LOGIN USER =====
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ msg: "Please provide email and password" });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            churchAttend: user.churchAttend,
            phoneNumber: user.phoneNumber,
            profilePicture: user.profilePicture,
          },
        });
      }
    );
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ msg: "Server error during login" });
  }
});

// ===== GET CURRENT USER =====
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== UPDATE USER PROFILE =====
router.put("/profile", auth, async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      churchAttend,
      profilePicture,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (churchAttend) user.churchAttend = churchAttend;
    if (profilePicture) user.profilePicture = profilePicture;

    // Update password if provided
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        churchAttend: user.churchAttend,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).json({ msg: "Server error during profile update" });
  }
});

// ===== VERIFY TOKEN =====
router.get("/verify", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ valid: true, user });
  } catch (err) {
    console.error("Token verification error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== LOGOUT (Optional - mainly for clearing server-side sessions) =====
router.post("/logout", auth, async (req, res) => {
  try {
    // In JWT, logout is handled client-side by removing the token
    // This endpoint can be used for logging or additional cleanup
    res.json({ msg: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ msg: "Server error during logout" });
  }
});

// ===== FORGOT PASSWORD (Generate reset token) =====
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Please provide email" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ msg: "If email exists, reset link will be sent" });
    }

    // Generate reset token (you would send this via email)
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" }
    );

    // TODO: Send email with reset link containing token
    // For now, just return success
    console.log("Password reset token:", resetToken);

    res.json({ 
      msg: "If email exists, reset link will be sent",
      // Remove this in production - only for testing
      resetToken 
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== RESET PASSWORD =====
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ msg: "Please provide token and new password" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ msg: "Password reset successfully" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ msg: "Reset token has expired" });
    }
    console.error("Reset password error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== GET ALL USERS (Admin only) =====
router.get("/users", auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== UPDATE USER ROLE (Admin only) =====
router.put("/users/:id/role", auth, async (req, res) => {
  try {
    const { role } = req.body;

    // Check if current user is admin
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.role = role;
    await user.save();

    res.json({
      msg: "User role updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Update role error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== DELETE USER (Admin only) =====
router.delete("/users/:id", auth, async (req, res) => {
  try {
    // Check if current user is admin
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Don't allow deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ msg: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
