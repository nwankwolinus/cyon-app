// models/Feed.js
const mongoose = require("mongoose");

// Comment Schema (nested)
const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

// Feed Schema
const feedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String },
    image: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    
    // Repost/Reshare fields (use ONE set of naming)
    isRepost: { type: Boolean, default: false },
    originalFeed: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Feed",
      default: null 
    },
    
    // Target user for profile shares
    targetUser: { type: String, default: null },
    
    // Pin fields
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Indexes for better query performance
feedSchema.index({ user: 1, createdAt: -1 });
feedSchema.index({ isPinned: 1, pinnedAt: -1 });
feedSchema.index({ originalFeed: 1 });

module.exports = mongoose.model("Feed", feedSchema);
