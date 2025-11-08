// services/notificationService.js
const Notification = require("../models/Notification");

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Create and emit a notification
   */
  async createNotification({ user, from, type, feed, text }) {
    try {
      // Don't notify yourself
      if (user.toString() === from.toString()) {
        return null;
      }

      // Check for duplicate notifications (avoid spam)
      const existingNotification = await Notification.findOne({
        user,
        from,
        type,
        feed,
        createdAt: { $gte: new Date(Date.now() - 5000) } // Within last 5 seconds
      });

      if (existingNotification) {
        return existingNotification;
      }

      // Create notification
      const notification = new Notification({
        user,
        from,
        type,
        feed,
        text,
        isRead: false
      });

      await notification.save();

      // Populate before emitting
      await notification.populate("from", "name profilePic");
      await notification.populate("feed", "text image");

      // Emit to specific user via Socket.IO
      if (this.io) {
        this.io.to(`user_${user}`).emit("newNotification", notification);
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Notify all users except the author
   */
  async notifyAllUsers({ excludeUser, type, feed, text, from }) {
    try {
      const User = require("../models/User");
      const users = await User.find({ _id: { $ne: excludeUser } }).select("_id");

      const notificationPromises = users.map(user =>
        this.createNotification({
          user: user._id,
          from: from || excludeUser,
          type,
          feed,
          text
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error("Error notifying all users:", error);
    }
  }

  /**
   * Notify when a new post is created
   */
  async notifyNewPost({ feedId, authorId, authorName }) {
    await this.notifyAllUsers({
      excludeUser: authorId,
      from: authorId,
      type: "post",
      feed: feedId,
      text: `${authorName} created a new post`
    });
  }

  /**
   * Notify when someone likes your post
   */
  async notifyLike({ feedOwnerId, likerId, likerName, feedId }) {
    await this.createNotification({
      user: feedOwnerId,
      from: likerId,
      type: "like",
      feed: feedId,
      text: `${likerName} liked your post`
    });
  }

  /**
   * Notify when someone comments on your post
   */
  async notifyComment({ feedOwnerId, commenterId, commenterName, feedId }) {
    await this.createNotification({
      user: feedOwnerId,
      from: commenterId,
      type: "comment",
      feed: feedId,
      text: `${commenterName} commented on your post`
    });
  }

  /**
   * Notify when someone reposts your content
   */
  async notifyRepost({ originalAuthorId, reposterId, reposterName, feedId }) {
    await this.createNotification({
      user: originalAuthorId,
      from: reposterId,
      type: "repost",
      feed: feedId,
      text: `${reposterName} reposted your post`
    });
  }

  /**
   * Notify users mentioned in a post (@username)
   */
  async notifyMentions({ text, authorId, authorName, feedId }) {
    try {
      const User = require("../models/User");
      
      // Extract mentions from text (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = [...text.matchAll(mentionRegex)].map(match => match[1]);

      if (mentions.length === 0) return;

      // Find users by name (case-insensitive)
      const mentionedUsers = await User.find({
        name: { $in: mentions.map(name => new RegExp(`^${name}$`, 'i')) }
      }).select("_id name");

      // Create notifications for mentioned users
      const notificationPromises = mentionedUsers.map(user =>
        this.createNotification({
          user: user._id,
          from: authorId,
          type: "mention",
          feed: feedId,
          text: `${authorName} mentioned you in a post`
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error("Error notifying mentions:", error);
    }
  }

  /**
   * Notify other commenters when a post they commented on gets a new comment
   */
  async notifyOtherCommenters({ feedId, commenterId, commenterName, existingCommenters }) {
    try {
      // Filter out the current commenter and duplicates
      const uniqueCommenters = [...new Set(
        existingCommenters
          .filter(id => id.toString() !== commenterId.toString())
      )];

      const notificationPromises = uniqueCommenters.map(userId =>
        this.createNotification({
          user: userId,
          from: commenterId,
          type: "comment_reply",
          feed: feedId,
          text: `${commenterName} also commented on a post you commented on`
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error("Error notifying other commenters:", error);
    }
  }

  /**
   * Notify when dues are paid/updated
   */
  async notifyDuesUpdate({ userId, adminName, status, month, year }) {
    await this.createNotification({
      user: userId,
      from: userId, // Or admin ID
      type: "dues",
      text: `Your dues for ${month} ${year} have been marked as ${status} by ${adminName}`
    });
  }

  /**
   * Notify when attendance is marked
   */
  async notifyAttendance({ userId, status, date }) {
    await this.createNotification({
      user: userId,
      from: userId,
      type: "attendance",
      text: `Your attendance for ${date} has been marked as ${status}`
    });
  }

  /**
   * Notify admins about important events
   */
  async notifyAdmins({ type, text }) {
    try {
      const User = require("../models/User");
      const admins = await User.find({ role: "admin" }).select("_id");

      const notificationPromises = admins.map(admin =>
        this.createNotification({
          user: admin._id,
          from: admin._id,
          type,
          text
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error("Error notifying admins:", error);
    }
  }
}

// Export as singleton that will be initialized with io instance
let notificationService = null;

function initializeNotificationService(io) {
  notificationService = new NotificationService(io);
  return notificationService;
}

function getNotificationService() {
  if (!notificationService) {
    console.warn("NotificationService not initialized with Socket.IO");
  }
  return notificationService;
}

module.exports = {
  initializeNotificationService,
  getNotificationService
};