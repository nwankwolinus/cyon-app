const express = require("express");
const Feed = require("../models/Feed");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const router = express.Router();
const Notification = require("../models/Notification");


// helper funtion to map church enum to readable string 
const mapChurch = (churchKey) => {
  const map = {
    ss_joachim_and_anne: "SS Joachim & Anne Catholic Church Ijegun",
    st_marys: "St. Mary’s Catholic Church Ijagemo",
    st_brendan: "St. Brendan Catholic Church Ifesowapo",
  };
  return map[churchKey] || "Unknown Parish";
}

// --- function to format feeds before sending
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
}

// Create a feed (text + optional image)
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const imageUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;
      
    let feed = new Feed({
      user: req.user.id,
      text: req.body.text,
      image: imageUrl
    });

    await feed.save();

    // populate user after saving
    await feed.populate("user", "name profilePic church");


    // Notify (example: admin, or later loop over followers)
    await Notification.create({
      user: feed.user, // or replace with target user(s)
      from: req.user.id,
      type: "post",
      feed: feed._id,
      text: `${req.user.name} created a new post`,
    });

    res.status(201).json(formatFeed(feed));
  } catch (err) {
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message })
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
    res.status(500).json({ error: err.message });
  }
});

// 3. Like/unlike a feed
router.put("/:id/like", auth, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ msg: "Feed not found" });

    if (feed.likes.includes(req.user.id)) {
      feed.likes = feed.likes.filter((uid) => uid.toString() !== req.user.id);
    } else {
      feed.likes.push(req.user.id);

      if (feed.user.toString() !== req.user.id) {
        await Notification.create({
          user: feed.user,
          from: req.user.id,
          type: "like",
          feed: feed._id,
          text: `${req.user.name} liked your post`,
        })
      }
    }
    await feed.save();

    res.json({ likes: feed.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Comment on a feed
router.post("/:id/comment", auth, async (req, res) => {
  try {
    if (!req.body.text) {
      return res.status(400).json({ msg: "Comment text is required" });
    }

    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ msg: "Feed not found" });

    feed.comments.push({ user: req.user.id, text: req.body.text });
    await feed.save();

    // Notification post owner if not self-comment
    if (feed.user.toString() !== req.user.id) {
      await Notification.create({
        user: feed.user,
        from: req.user.id,
        type: "comment",
        feed: feed._id,
        text: `${req.user.name} commented on your post`,
      });
    }

    res.json(feed.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Edit a feed (only owner or admin)
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ msg: "Feed not found" });

    if (feed.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized" });
    }

    feed.text = req.body.text || feed.text;
    if (req.file) {
      feed.image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    await feed.save();
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete a feed (only owner or admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ msg: "Feed not found" });

    if (feed.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await feed.deleteOne();
    res.json({
      ...feed._doc,
      likeCount: feed.likes.length,
      commentCount: feed.comments.length
     });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Delete a comment (only owner or admin)
router.delete("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ msg: "Feed not found" });

    const comment = feed.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    if (
      comment.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    comment.deleteOne();
    await feed.save();
    res.json(feed.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
