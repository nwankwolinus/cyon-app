const express = require("express");
const Feed = require("../models/Feed");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const Notification = require("../models/Notification");
const router = express.Router();

// Helper function to map church enum to readable string
const mapChurch = (churchKey) => {
  const map = {
    ss_joachim_and_anne: "SS Joachim & Anne Catholic Church Ijegun",
    st_marys: "St. Mary's Catholic Church Ijagemo",
    st_brendan: "St. Brendan Catholic Church Ifesowapo",
  };
  return map[churchKey] || "Unknown Parish";
};

// Function to format feeds before sending
const formatFeed = (feed) => {
  return {
    ...feed._doc,
    likeCount: feed.likes.length,
    commentCount: feed.comments.length,
    user: {
      ...feed.user._doc,
      church: mapChurch(feed.user.church),
    },
  };
};

// Create a feed (text + optional image)
router.post("/", auth, upload.single("image"), async (req, res) => {
  console.log('🚀 POST /api/feeds REQUEST RECEIVED');
  
  try {
    // Log request details
    console.log('📨 Request details:', {
      method: req.method,
      url: req.url,
      user: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : 'No user',
      body: req.body ? { text: req.body.text, hasText: !!req.body.text } : 'No body',
      file: req.file ? { originalname: req.file.originalname, size: req.file.size } : 'No file'
    });

    // Validation
    if (!req.body.text && !req.file) {
      console.log('❌ Validation failed: No text and no image');
      return res.status(400).json({ error: "Post must contain text or an image" });
    }

    const imageUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;
    
    console.log('🖼️ Image URL:', imageUrl);

    const feed = new Feed({
      user: req.user.id,
      text: req.body.text || "",
      image: imageUrl,
    });
    
    console.log('💾 Saving feed to database...');
    await feed.save();

    console.log('👤 Populating user data...');
    await feed.populate("user", "name profilePic church");

    console.log('📢 Creating notification...');
    await Notification.create({
      user: feed.user,
      from: req.user.id,
      type: "post",
      feed: feed._id,
      text: `${req.user.name} created a new post`,
    });

    const formatted = formatFeed(feed);
    console.log('✅ Feed created:', { id: formatted._id, text: formatted.text, hasImage: !!formatted.image });

    console.log('📡 Broadcasting via Socket.IO...');
    const io = req.app.get("io");
    io.emit("newFeed", formatted);
    
    console.log('📤 Sending response to client...');
    res.status(201).json(formatted);

    console.log('🎉 REQUEST COMPLETED SUCCESSFULLY');

  } catch (err) {
    console.error('💥 REQUEST FAILED:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get feeds with pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const feeds = await Feed.find()
      .populate("user", "name profilePic church role")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(feeds.map(formatFeed));
  } catch (err) {
    console.error("Error fetching feeds:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single feed by ID
router.get("/:id", async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id)
      .populate("user", "name profilePic church role")
      .populate("comments.user", "name profilePic");

    if (!feed) {
      return res.status(404).json({ error: "Feed not found" });
    }

    res.json(formatFeed(feed)); 
  } catch (err) {
    console.error("Error fetching single feed:", err);
    res.status(500).json({ error: "Server error fetching post" });
  }
});

// Get feeds of the logged-in user
router.get("/me", auth, async (req, res) => {
  try {
    const feeds = await Feed.find({ user: req.user.id })
      .populate("user", "name profilePic church role")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(feeds.map(formatFeed));
  } catch (err) {
    console.error("Error fetching user feeds:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get posts of a specific user
router.get("/user/:id", async (req, res) => {
  try {
    const feeds = await Feed.find({ user: req.params.id })
      .populate("user", "name profilePic church role")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(feeds.map(formatFeed));
  } catch (err) {
    console.error("Error fetching user posts:", err);
    res.status(500).json({ error: err.message });
  }
});

// Like/unlike a feed
router.post("/:id/like", auth, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ error: "Feed not found" });

    let liked = false;

    // Toggle like/unlike
    if (feed.likes.includes(req.user.id)) {
      feed.likes = feed.likes.filter((uid) => uid.toString() !== req.user.id);
    } else {
      feed.likes.push(req.user.id);
      liked = true;
      
      // Notify post owner (if not same person)
      if (feed.user.toString() !== req.user.id) {
        await Notification.create({
          user: feed.user,
          from: req.user.id,
          type: "like",
          feed: feed._id,
          text: `${req.user.name} liked your post`,
        });
      }
    }

    await feed.save();

    // Emit real-time event
    const io = req.app.get("io");
    io.emit("feedLiked", { feedId: feed._id, likeCount: feed.likes.length });

    res.json({ likeCount: feed.likes.length, liked });
  } catch (err) {
    console.error("Error liking feed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Comment on a feed
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ error: "Feed not found" });

    feed.comments.push({ user: req.user.id, text: text.trim() });
    await feed.save();

    const populatedFeed = await feed.populate("comments.user", "name profilePic");
    const newComment = populatedFeed.comments[populatedFeed.comments.length - 1];

    // Send notification
    if (feed.user.toString() !== req.user.id) {
      await Notification.create({
        user: feed.user,
        from: req.user.id,
        type: "comment",
        feed: feed._id,
        text: `${req.user.name} commented on your post`,
      }).catch((err) => console.error("Notification error:", err));
    }

    // Emit real-time event
    const io = req.app.get("io");
    io.emit("newComment", {
      feedId: feed._id,
      comment: {
        _id: newComment._id,
        text: newComment.text,
        user: {
          _id: newComment.user._id,
          name: newComment.user.name,
          profilePic: newComment.user.profilePic,
        },
      },
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error commenting on feed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Edit a feed (only owner or admin)
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ error: "Feed not found" });
    
    // Authorization check
    if (feed.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Handle image removal
    if (req.body.removeImage === "true") {
      feed.image = null;
    }
    
    // Apply text update
    feed.text = req.body.text || feed.text;

    // Handle new image upload
    if (req.file) {
      feed.image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    await feed.save();

    // Populate and format updated feed
    const updatedFeedDoc = await Feed.findById(feed._id)
      .populate("user", "name profilePic church role")
      .populate("comments.user", "name profilePic");
    
    const formattedUpdatedFeed = formatFeed(updatedFeedDoc);

    // Broadcast update
    const io = req.app.get("io");
    io.emit("feedUpdated", formattedUpdatedFeed);

    res.json(formattedUpdatedFeed);
    
  } catch (err) {
    console.error("Error updating feed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a feed (owner or admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id).populate("user", "role");
    if (!feed) return res.status(404).json({ error: "Feed not found" });

    // Check permissions
    const isOwner = feed.user._id.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: No permission to delete this post" });
    }

    await Feed.findByIdAndDelete(req.params.id);

    // Broadcast deletion
    const io = req.app.get("io");
    io.emit("feedDeleted", req.params.id);

    res.json({ message: "Feed deleted successfully", feedId: req.params.id });
  } catch (err) {
    console.error("Error deleting feed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment (only owner or admin)
router.delete("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ error: "Feed not found" });

    const comment = feed.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    comment.deleteOne();
    await feed.save();

    // Emit real-time deletion event
    const io = req.app.get("io");
    io.emit("commentDeleted", {
      feedId: req.params.id,
      commentId: req.params.commentId
    });

    res.json(feed.comments);
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;