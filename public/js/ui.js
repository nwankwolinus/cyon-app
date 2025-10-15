// 🧩 Import functions for API interaction
import { fetchFeeds, likeFeed, commentOnFeed } from "./app.js";

// ==========================================================
// 📜 Renders all feeds when page loads or refreshes
// ==========================================================
export function renderFeeds(feeds) {
  const container = document.getElementById("feedContainer");
  container.innerHTML = ""; // clear old content

  if (!feeds || feeds.length === 0) {
    container.innerHTML = "<p>No posts yet</p>";
    return;
  }

  // Loop through each feed item
  feeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "feed-card";

    // 🖼️ Add image if available
    const imageHTML = feed.image
      ? `<img src="${feed.image}" alt="Feed Image" class="feed-image" />`
      : "";

    // 🧱 Build feed card HTML structure
    card.innerHTML = `
      <div class="feed-header">
        <img src="${feed.user?.profilePic || './images/default-avatar.png'}"
             alt="User Avatar" class="avatar" />
        <div>
          <h4 class="username">${feed.user?.name || "Unknown User"}</h4>
          <span class="churchAttend">${feed.user?.church || ""}</span>
          <span class="timestamp">${timeAgo(feed.createdAt)}</span>
        </div>
      </div>

      <p>${feed.text || ""}</p>
      ${imageHTML}

      <!-- Action Buttons -->
      <div class="feed-actions">
        <button class="like-btn" data-id="${feed._id}">👍 Like</button>
        <button class="comment-btn" data-id="${feed._id}">💬 Comment</button>
        <button class="share-btn">↗ Share</button>
      </div>

      <!-- Like & Comment Count -->
      <div class="feed-stats">
        👍 ${feed.likes?.length || 0} Likes · 💬 ${feed.comments?.length || 0} Comments
      </div>

      <!-- Comments Section -->
      <div class="comments-section" id="comments-${feed._id}" style="display:none;">
        <div class="comments-list">
          ${
            feed.comments
              ?.map(
                (c) => `
              <div class="comment">
                <b>${c.user?.name || "Anonymous"}:</b> ${c.text}
              </div>
            `
              )
              .join("") || ""
          }
        </div>

        <!-- New Comment Input -->
        <div class="comment-form">
          <input type="text" placeholder="Write a comment..."
                 class="comment-input" id="commentInput-${feed._id}" />
          <button class="submit-comment" data-id="${feed._id}">Post</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // 🎯 Attach like/comment listeners after rendering
  attachFeedListeners();
}

// ==========================================================
// ⚡ Renders a single feed instantly (used for real-time updates)
// ==========================================================
export function renderSingleFeed(feed) {
  const container = document.getElementById("feedContainer");
  const card = document.createElement("div");
  card.className = "feed-card";

  const imageHTML = feed.image
    ? `<img src="${feed.image}" alt="Feed Image" class="feed-image" />`
    : "";

  card.innerHTML = `
    <div class="feed-header">
      <img src="${feed.user?.profilePic || './images/default-avatar.png'}"
           alt="User Avatar" class="avatar" />
      <div>
        <h4 class="username">${feed.user?.name || "Unknown User"}</h4>
        <span class="churchAttend">${feed.user?.church || ""}</span>
        <span class="timestamp">${timeAgo(feed.createdAt)}</span>
      </div>
    </div>

    <p>${feed.text || ""}</p>
    ${imageHTML}

    <div class="feed-actions">
      <button class="like-btn" data-id="${feed._id}">👍 Like</button>
      <button class="comment-btn" data-id="${feed._id}">💬 Comment</button>
      <button class="share-btn">↗ Share</button>
    </div>

    <div class="feed-stats">
      👍 ${feed.likeCount || 0} Likes · 💬 ${feed.commentCount || 0} Comments
    </div>

    <div class="comments-section" id="comments-${feed._id}" style="display:none;">
      <div class="comments-list"></div>
      <div class="comment-form">
        <input type="text" placeholder="Write a comment..."
               class="comment-input" id="commentInput-${feed._id}" />
        <button class="submit-comment" data-id="${feed._id}">Post</button>
      </div>
    </div>
  `;

  // 👇 Add new post to top of feed list
  container.insertAdjacentElement("afterbegin", card);
  attachFeedListeners(); // re-bind events to include the new post
}

// ==========================================================
// 🧠 Handles Like & Comment button behavior
// ==========================================================
function attachFeedListeners() {
  // Like button handler
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      const button = e.currentTarget;
      const id = button.dataset.id;

      try {
        // API call to toggle like
        const result = await likeFeed(id);

        if (!result) return;

        // Update like count immediately on UI
        // button.textCount = `👍 ${result.likeCount}`;

      } catch (err) {
        console.error("Error liking post:", err);
      }
    };
  });

  // 💬 Toggle comments section visibility
  document.querySelectorAll(".comment-btn").forEach((btn) => {
    btn.onclick = (e) => {
      const id = e.target.dataset.id;
      const section = document.getElementById(`comments-${id}`);
      section.style.display =
        section.style.display === "none" ? "block" : "none";
    };
  });

  // ✍️ Submit new comment
  document.querySelectorAll(".submit-comment").forEach((btn) => {
    btn.onclick = async (e) => {
      const feedId = e.target.dataset.id;
      const input = document.getElementById(`commentInput-${feedId}`);
      const text = input.value.trim();
      if (!text) return;

      // Show loading state
      const originalHTML = btn.innerHTML;

      // Show loading state
      btn.innerHTML = "Posting...";
      btn.disabled = true;
      input.value = ""; // Clear input

      try {
        await commentOnFeed(feedId, text);
        // Socket.IO will handle adding the comment
      } catch (error) {
        console.error('Failed to post comment;', error);
        input.value = text; // Put the text back so user doesn't lose it
        alert('Failed to post comment. Please try again.')
      } finally {
        // Always reset button state - even if there's an error
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    };
  });
}

// ==========================================================
// ⏱️ Helper function: shows "time ago" format (e.g. 5m ago)
// ==========================================================
function timeAgo(dateString) {
  const now = new Date();
  const postDate = new Date(dateString);
  const diff = Math.floor((now - postDate) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
