// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // 🌟 ROLE SYSTEM
  role: {
    type: String,
    enum: ['probation', 'active', 'admin'],
    default: 'probation'
  },

  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },

  dob: { type: Date, required: true },
  profilePic: { type: String, default: '' }, // store image URL

  church: {
    type: String,
    enum: ['ss_joachim_and_anne', 'st_marys', 'st_brendan'],
    default: 'ss_joachim_and_anne'
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
