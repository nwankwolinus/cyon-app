const express = require ('express');
const User = require ('../models/User.js');

const router = express.Router();

// Public route to show all users 
router.get ("/", async (req, res) => {
    try {
        const users = await User.find({}, "name church role");
        // "name church role" ensures only these fields are returned
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
});

module.exports = router;
