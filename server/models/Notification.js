// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who receives it
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who triggered it
    type: { 
      type: String, 
      enum: [
        "new_feed",           // when a new feed is posted
        "feed_reposted",      // when your post is reposted
        "feed_liked",         // when your post is liked
        "feed_commented",     // when someone comments on your post
        "comment_liked",      // when your comment is liked
        "mentioned",          // when you're tagged/mentioned
        "comment_reply",      // when someone replies to a comment thread you're in
        "follow"              // bonus: when someone follows you
      ], 
      required: true 
    },
    feed: { type: mongoose.Schema.Types.ObjectId, ref: "Feed" }, // related feed
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" }, // related comment if applicable
    text: String, // notification message
    isRead: { type: Boolean, default: false },
    actionUrl: String // URL to redirect when clicked
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
