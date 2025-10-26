const mongoose = require("mongoose");
// CommentSchema sub-schema
const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const feedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
    image: { type: String }, 
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    
    // 🟢 NEW FIELD 1: To distinguish between 'post' and 'reshare'
    type: { 
      type: String, 
      enum: ['post', 'reshare'], // Restricts values to these two options
      default: 'post'           // Default is a regular post
    },
    
    // 🟢 NEW FIELD 2: To store the ID of the original post being reshared
    originalFeed: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Feed", 
      required: false           // Only required if type is 'reshare'
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feed", feedSchema);