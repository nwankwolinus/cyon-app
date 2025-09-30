// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who receives it
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who triggered it
    type: { type: String, enum: ["like", "comment", "post"], required: true },
    feed: { type: mongoose.Schema.Types.ObjectId, ref: "Feed" }, // optional, if related to a feed
    text: String, // short message like "Linus liked your post"
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
