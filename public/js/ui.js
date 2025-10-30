import {
  fetchFeeds,
  likeFeed,
  commentOnFeed,
  deleteComment,
  deleteFeed,
  updateFeed,
  fetchFeedById,
  createFeed,
  togglePinFeed,
  fetchUsers
} from "./app.js";

import { getToken, redirectToLogin } from "./utils.js";

// Import rendering functions from ui.js itself for internal use,

// ==========================================================
// 🎯 EVENT DELEGATION FOR BETTER PERFORMANCE
// ==========================================================

function setupEventDelegation() {
  console.log("🔧 Setting up event delegation...");

  // Single event listener for all interactive elements
  document.addEventListener("click", async (e) => {
    // --- Like Button ---
    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
      e.preventDefault();
      const id = likeBtn.dataset.id;
      await handleLikeClick(id, likeBtn);
      return;
    }

    // --- Comment Button (Toggle) ---
    const commentBtn = e.target.closest(".comment-btn");
    if (commentBtn) {
      e.preventDefault();
      const id = commentBtn.dataset.id;
      toggleCommentsSection(id);
      return;
    }

    // --- Submit Comment Button ---
    const submitCommentBtn = e.target.closest(".submit-comment");
    if (submitCommentBtn) {
      e.preventDefault();
      const feedId = submitCommentBtn.dataset.id;
      await handleCommentSubmit(feedId, submitCommentBtn);
      return;
    }

    // --- Menu Button (Toggle) ---
    const menuBtn = e.target.closest(".menu-btn");
    if (menuBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = menuBtn.dataset.id;
      toggleMenu(feedId);
      return;
    }

    // --- Handle edit post buttons ---
    const editBtn = e.target.closest(".edit-post");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = editBtn.dataset.id;
      await handleEditPost(feedId);
      return;
    }

    // --- Handle delete post buttons ---
    const deleteBtn = e.target.closest(".delete-post");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = deleteBtn.dataset.id;
      await handleDeletePost(feedId, deleteBtn);
      return;
    }

    // --- Handle pin post buttons ---
    const pinBtn = e.target.closest(".pin-post");
    if (pinBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = pinBtn.dataset.id;
      await handlePinPost(feedId);
      return;
    }

    // --- Handle cancel edit buttons ---
    const cancelBtn = e.target.closest(".cancel-edit-btn");
    if (cancelBtn) {
      e.preventDefault();
      const feedId = cancelBtn.dataset.id;
      cancelEdit(feedId);
      return;
    }

    // --- Handle remove image button in edit form ---
    const removeBtn = e.target.closest(".remove-image-btn");
    if (removeBtn) {
      e.preventDefault();
      handleRemoveImageClick(removeBtn);
      return;
    }

    // --- Handle delete comment buttons ---
    const deleteCommentBtn = e.target.closest(".delete-comment-btn");
    if (deleteCommentBtn) {
      e.preventDefault();
      const feedId = deleteCommentBtn.dataset.feedId;
      const commentId = deleteCommentBtn.dataset.commentId;
      await handleDeleteComment(feedId, commentId);
      return;
    }

    // --- Share Button (Open Modal) ---
    const shareBtn = e.target.closest(".share-btn");
    if (shareBtn) {
      e.preventDefault();
      const feedId = shareBtn.dataset.id;
      openShareModal(feedId);
      return;
    }

    // --- Share Option Button (Inside Modal) ---
    const shareOptionBtn = e.target.closest(".share-option-btn");
    if (shareOptionBtn) {
      e.preventDefault();
      const feedId = shareOptionBtn.dataset.id;
      const target = shareOptionBtn.dataset.target;

      await handleShareOptionClick(feedId, target);

      console.log("✅ Share option executed:", target);

      closeShareModal(feedId);
      return;
    }

    // --- Close Modal Button ---
    const closeModalBtn = e.target.closest(".close-modal-btn");
    if (closeModalBtn) {
      e.preventDefault();
      const feedId = closeModalBtn.dataset.id;
      console.log("Closing modal for ID:", feedId);
      closeShareModal(feedId);
      return;
    }

    // --- Handle View Original Links in Reshare Posts ---
    const reshareLink = e.target.closest(".reshare-link");
    if (reshareLink) {
      e.preventDefault();
      const originalFeedId = reshareLink.dataset.originalId;
      handleViewOriginal(originalFeedId);
      return;
    }
  });

  // Listener for Edit Form submission (using delegation on the whole document)
  document.addEventListener("submit", async (e) => {
    const editForm = e.target.closest(".editPostForm");
    if (editForm) {
      e.preventDefault();
      const feedId = editForm.dataset.id;
      await handleEditFormSubmit(feedId, editForm);
    }
  });

  // Close menus when clicking outside the menu area
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".feed-menu")) {
      document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
        menu.classList.remove("show");
      });
    }
  });

  // Handle Enter key in comment inputs (Keyboard Support)
  document.addEventListener("keypress", (e) => {
    if (e.target.classList.contains("comment-input") && e.key === "Enter") {
      e.preventDefault();
      const feedId = e.target.id.replace("commentInput-", "");
      const submitBtn = document.querySelector(
        `.submit-comment[data-id="${feedId}"]`
      );
      if (submitBtn) {
        handleCommentSubmit(feedId, submitBtn);
      }
    }
  });
}

// ==========================================================
// 🎯 INDIVIDUAL EVENT HANDLERS
// ==========================================================

async function handleDeletePost(feedId, deleteBtn) {
  console.log("🗑️ Delete post clicked:", feedId);

  if (!confirm("Are you sure you want to delete this post?")) return;

  const originalText = deleteBtn.textContent;
  deleteBtn.textContent = "Deleting...";
  deleteBtn.disabled = true;

  try {
    const success = await deleteFeed(feedId);

    if (success) {
      const feedElement = document.getElementById(`feed-${feedId}`);
      if (feedElement) {
        feedElement.style.opacity = "0";
        feedElement.style.transform = "scale(0.8)";
        feedElement.style.transition = "all 0.3s ease";

        setTimeout(() => {
          if (feedElement.parentNode) {
            feedElement.remove();
          }
        }, 300);
      }
    } else {
      throw new Error("Delete failed or unauthorized.");
    }
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete post: " + error.message);
    deleteBtn.textContent = originalText;
    deleteBtn.disabled = false;
  }
}

async function handleDeleteComment(feedId, commentId) {
  if (!confirm("Are you sure you want to delete this comment?")) return;

  const commentElement = document.getElementById(`comment-${commentId}`);
  if (!commentElement) return;

  commentElement.style.opacity = "0.5";

  try {
    const result = await deleteComment(feedId, commentId);

    if (result) {
      commentElement.remove();
      export_updateCommentCount(feedId, -1);
      console.log("✅ Comment deleted successfully.");
    } else {
      throw new Error("Delete comment failed.");
    }
  } catch (error) {
    console.error("Comment deletion failed:", error);
    alert("Failed to delete comment: " + error.message);
    commentElement.style.opacity = "1";
  }
}

async function handlePinPost(feedId) {
  console.log("📌 Pin/Unpin post clicked:", feedId);

  const pinBtn = document.querySelector(`.pin-post[data-id="${feedId}"]`);
  if (!pinBtn) return;

  const token = getToken();
  if (!token) {
    console.error("❌ No authentication token found for pin operation");
    alert("Your session has expired. Please log in again.");
    redirectToLogin();
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  if (currentUser.role !== "admin") {
    alert("Only administrators can pin posts");

    document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
      menu.classList.remove("show");
    });
    return;
  }

  const originalText = pinBtn.textContent;
  pinBtn.textContent = "Updating...";
  pinBtn.disabled = true;

  try {
    const result = await togglePinFeed(feedId);

    if (result) {
      pinBtn.textContent = result.feed.isPinned
        ? "📌 Unpin Post"
        : "📌 Pin Post";

      alert(
        `Post ${result.feed.isPinned ? "pinned" : "unpinned"} successfully!`
      );

      const feeds = await fetchFeeds();
      renderFeeds(feeds);
    } else {
      throw new Error("Pin operation failed");
    }
  } catch (error) {
    console.error("Pin operation failed:", error);
    alert("Failed to update pin status: " + error.message);
    pinBtn.textContent = originalText;
  } finally {
    pinBtn.disabled = false;

    document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
      menu.classList.remove("show");
    });
  }
}

function toggleCommentsSection(feedId) {
  const section = document.getElementById(`comments-${feedId}`);
  if (section) {
    section.style.display =
      section.style.display === "block" ? "none" : "block";
  }
}

async function handleCommentSubmit(feedId, submitBtn) {
  const input = document.getElementById(`commentInput-${feedId}`);
  const text = input?.value.trim();

  if (!text) return;

  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = "Posting...";
  submitBtn.disabled = true;

  try {
    await commentOnFeed(feedId, text);
    input.value = "";
  } catch (error) {
    console.error("Failed to post comment:", error);
    alert("Failed to post comment. Please try again.");
  } finally {
    submitBtn.innerHTML = originalHTML;
    submitBtn.disabled = false;
  }
}

function toggleMenu(feedId) {
  const menu = document.getElementById(`menu-${feedId}`);
  if (!menu) return;

  document.querySelectorAll(".menu-dropdown.show").forEach((otherMenu) => {
    if (otherMenu !== menu) otherMenu.classList.remove("show");
  });

  menu.classList.toggle("show");
}

async function handleEditPost(feedId) {
  const card = document.getElementById(`feed-${feedId}`);
  if (!card) return;

  try {
    const originalHTML = card.innerHTML;
    card.innerHTML =
      '<div style="text-align:center; padding: 20px;">Loading editor...</div>';

    const feedToEdit = await fetchFeedById(feedId);
    if (!feedToEdit) {
      alert("Could not load post for editing.");
      card.innerHTML = originalHTML;
      return;
    }

    card.dataset.originalHtml = originalHTML;
    card.dataset.editing = "true";

    card.innerHTML = createEditForm(feedToEdit);
    setupEditFormListeners(feedId);

    document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
      menu.classList.remove("show");
    });
  } catch (error) {
    console.error("Error loading post for editing:", error);
    alert("Failed to load post for editing. " + error.message);
    cancelEdit(feedId);
  }
}

function handleViewOriginal(originalFeedId) {
  console.log("🔍 View Original clicked for:", originalFeedId);

  const isOnFeedsPage = window.location.pathname.includes("feeds.html");

  if (isOnFeedsPage) {
    const originalPost = document.getElementById(`feed-${originalFeedId}`);
    if (originalPost) {
      originalPost.scrollIntoView({ behavior: "smooth", block: "center" });

      originalPost.style.backgroundColor = "#fff9e6";
      originalPost.style.transition = "background-color 0.5s ease";

      setTimeout(() => {
        originalPost.style.backgroundColor = "";
      }, 3000);
    } else {
      window.location.href = `feeds.html?feedId=${originalFeedId}`;
    }
  } else {
    window.location.href = `feeds.html?feedId=${originalFeedId}`;
  }
}

async function handleEditFormSubmit(feedId, form) {
  const saveBtn = form.querySelector(".save-edit-btn");
  const originalBtnText = saveBtn.textContent;

  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;
  form.disabled = true;

  try {
    const formData = new FormData(form);

    console.log("🔄 Calling updateFeed API...");

    const updatedFeed = await updateFeed(feedId, formData);

    if (updatedFeed) {
      console.log("✅ Post updated successfully. Awaiting socket re-render...");
    } else {
      throw new Error("Update failed on server.");
    }
  } catch (error) {
    console.error("💥 Edit Form Submission Error:", error);
    alert(
      "Failed to update post: " + error.message.split(": ")[1] ||
        "Please try again."
    );

    saveBtn.textContent = originalBtnText;
    saveBtn.disabled = false;
    form.disabled = false;
  }
}

export function cancelEdit(feedId) {
  const card = document.getElementById(`feed-${feedId}`);
  if (card && card.dataset.originalHtml) {
    delete card.dataset.editing;
    card.innerHTML = card.dataset.originalHtml;
    delete card.dataset.originalHtml;
  }
}

function handleRemoveImageClick(removeBtn) {
  const form = removeBtn.closest(".editPostForm");
  if (!form) return;

  const feedId = form.dataset.id;
  const imageInput = document.getElementById(`edit-post-image-${feedId}`);
  const imagePreview = document.getElementById(`edit-image-preview-${feedId}`);
  const removeFlag = document.getElementById(`remove-image-flag-${feedId}`);

  if (imagePreview) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
  if (removeFlag) removeFlag.value = "true";
  if (imageInput) imageInput.value = "";

  removeBtn.style.display = "none";
}

function setupEditFormListeners(feedId) {
  const imageInput = document.getElementById(`edit-post-image-${feedId}`);
  const imagePreview = document.getElementById(`edit-image-preview-${feedId}`);
  const removeBtn = document.querySelector(`#feed-${feedId} .remove-image-btn`);
  const removeFlag = document.getElementById(`remove-image-flag-${feedId}`);

  if (imageInput) {
    imageInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          if (imagePreview) {
            imagePreview.src = reader.result;
            imagePreview.style.display = "block";
          }
          if (removeFlag) removeFlag.value = "false";
          if (removeBtn) removeBtn.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    };
  }
}

async function handleShareOptionClick(feedId, target) {
  const feedElement = document.getElementById(`feed-${feedId}`);
  const postText = feedElement
    ? feedElement.querySelector(".feed-text").textContent.substring(0, 100) +
      "..."
    : "Check out this post!";
  const shareUrl = `${window.location.origin}/feeds.html?feedId=${feedId}`;

  switch (target) {
    case "feeds":
      console.log(
        `API Call: Preparing to Re-post feed ${feedId} to main feeds page.`
      );

      try {
        const reshareData = {
          type: "reshare",
          originalFeedId: feedId,
          text: `Shared post from feed ${feedId}. Check it out!`,
        };

        const originalFeed = await fetchFeedById(feedId);
        if (originalFeed && originalFeed.text) {
          reshareData.text = originalFeed.text;
        }

        console.log("📝 Reshare content:", {
          originalText: originalFeed?.text,
          usingText: reshareData.text,
          hasImage: !!originalFeed?.image,
        });

        const formData = new FormData();
        formData.append("type", reshareData.type);
        formData.append("originalFeedId", reshareData.originalFeedId);
        formData.append("text", reshareData.text);

        await createFeed(formData);

        console.log(`✅ API Call: Re-post ${feedId} to feeds page successful.`);
        alert("Post successfully re-posted to your feeds page!");
      } catch (error) {
        console.error("Error re-posting to feeds:", error);
        alert("Error: Could not re-post to feeds page.");
      }
      break;

    case "external":
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Check out this post!",
            text: postText,
            url: shareUrl,
          });
          console.log("✅ External share successful (Web Share API).");
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error sharing externally:", error);
          }
        }
      } else {
        alert("Web Share API not supported on this device. Use 'Copy Link'.");
      }
      break;

    case "link":
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
        console.log("✅ Link copied:", shareUrl);
      } catch (err) {
        alert("Could not copy link to clipboard.");
        console.error("Clipboard write failed:", err);
      }
      break;

    default:
      console.warn(`Unknown share target: ${target}`);
  }
}

// ==========================================================
// 🎯 RENDER FUNCTIONS (EXPORTED)
// ==========================================================

export function renderSingleFeed(feed) {
  const container = document.getElementById("feedContainer");
  if (!container) return;

  const existingElement = document.getElementById(`feed-${feed._id}`);

  if (existingElement) {
    if (existingElement.dataset.editing !== "true") {
      existingElement.innerHTML = generateFeedHTML(feed);
    }
    return;
  }

  const card = document.createElement("div");
  card.className = "feed-item";
  card.id = `feed-${feed._id}`;
  card.innerHTML = generateFeedHTML(feed);

  container.insertAdjacentElement("afterbegin", card);
}

export function renderFeeds(feeds) {
  const container = document.getElementById("feedContainer");

  if (!container) {
    console.error("❌ CRITICAL: feedContainer element not found!");
    return;
  }

  container.innerHTML = "";

  if (!feeds || feeds.length === 0) {
    container.innerHTML = "<p>No posts yet</p>";
    return;
  }

  const sortedFeeds = sortFeeds(feeds);

  console.log(
    "📌 Sorted feeds:",
    sortedFeeds.map((f) => ({
      id: f._id,
      pinned: f.isPinned,
      date: f.createdAt,
      pinnedAt: f.pinnedAt,
    }))
  );

  sortedFeeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "feed-item";
    card.id = `feed-${feed._id}`;
    card.innerHTML = generateFeedHTML(feed);
    container.appendChild(card);
  });
}

export function updatePinnedFeedInUI(updatedFeed) {
  const feedElement = document.getElementById(`feed-${updatedFeed._id}`);

  if (feedElement) {
    if (feedElement.dataset.editing !== "true") {
      feedElement.innerHTML = generateFeedHTML(updatedFeed);
      console.log("✅ Pin status updated in UI for feed:", updatedFeed._id);
    }
  } else {
    console.log(
      "🔄 Feed not in current view, refreshing feeds for proper sorting..."
    );
    setTimeout(async () => {
      const feeds = await fetchFeeds();
      renderFeeds(feeds);
    }, 100);
  }
}

function generateFeedHTML(feed) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const isReshare = feed.type === "reshare";
  const originalFeedId = feed.originalFeed;

  let shouldShowText = false;

  if (feed.text) {
    if (isReshare) {
      const defaultReshareText = `Shared post from feed ${originalFeedId}. Check it out!`;
      const isDefaultMessage = feed.text.trim() === defaultReshareText.trim();
      shouldShowText = !isDefaultMessage;
    } else {
      shouldShowText = true;
    }
  }

  const isOwner = currentUser.id === feed.user?._id;
  const canDelete = currentUser.role === "admin" || isOwner;
  const canEdit = isOwner;
  const canPin = currentUser.role === "admin";
  const showMenu = canDelete || canEdit || canPin;
  const isLiked = feed.likes && feed.likes.includes(currentUser.id);

  const imageHTML = feed.image
    ? `<img src="${feed.image}" alt="Feed Image" class="feed-image" onerror="this.style.display='none';" />`
    : "";

  const menuHTML = showMenu
    ? generateMenuHTML(feed, canEdit, canPin, canDelete)
    : "";

  const likeCount = feed.likes?.length || feed.likeCount || 0;
  const commentCount = feed.comments?.length || feed.commentCount || 0;
  const commentsHTML = generateCommentsHTML(feed);

  let reshareIndicatorHTML = "";
  if (isReshare) {
    reshareIndicatorHTML = `
          <div class="feed-reshare-indicator">
              <i class="fas fa-retweet"></i> ${
                feed.user?.name || "A User"
              } shared a post
              ${
                originalFeedId
                  ? `<span class="reshare-link" data-original-id="${originalFeedId}">View Original</span>`
                  : ""
              }
          </div>
      `;
  }

  return `
    <div class="feed-card ${
      isReshare ? "reshared-feed" : "original-feed"
    }" data-id="${feed._id}">
        
      ${reshareIndicatorHTML} 
      
      <div class="feed-header">
        <div class="user-info">
          <img src="${feed.user?.profilePic || "./images/default-avatar.png"}" 
                alt="User Avatar" class="avatar" />
          <div>
            <h4 class="username">
                ${feed.user?.name || "Unknown User"}
                ${
                  currentUser.role === "admin"
                    ? '<span class="admin-badge">ADMIN</span>'
                    : ""
                }
            </h4>
            <span class="churchAttend">${feed.user?.church || ""}</span>
            <span class="timestamp">${timeAgo(feed.createdAt)}</span>
          </div>
        </div>
        ${menuHTML}
      </div>

      ${shouldShowText ? `<p class="feed-text">${feed.text || ""}</p>` : ""} 
      
      ${imageHTML}

      <div class="feed-actions">
        <button class="like-btn ${isLiked ? "liked" : ""}" data-id="${
    feed._id
  }">👍 Like</button>
        <button class="comment-btn" data-id="${feed._id}">💬 Comment</button>
        <button class="share-btn" data-id="${feed._id}" data-text="${(
    feed.text || ""
  ).substring(0, 100)}...">
          <img src="./images/share-green.png" alt="Share" class="share-icon" style="width:30px; height:auto; border-radius:1px;"> Share
        </button>
      </div>

      <div class="feed-stats">
        👍 ${likeCount} Likes · 💬 ${commentCount} Comments
      </div>

      <div class="comments-section" id="comments-${
        feed._id
      }" style="display:none;">
        <div class="comments-list">
          ${commentsHTML}
        </div>
        <div class="comment-form">
          <input type="text" placeholder="Write a comment..."
                  class="comment-input" id="commentInput-${feed._id}" />
          <button class="submit-comment" data-id="${feed._id}">Post</button>
        </div>
      </div>
    </div>
  `;
}

function generateMenuHTML(feed, canEdit, canPin, canDelete) {
  return `
    <div class="feed-menu">
      <button class="menu-btn" data-id="${feed._id}">⋯</button>
      <div class="menu-dropdown" id="menu-${feed._id}">
        ${
          canEdit
            ? `<button class="menu-item edit-post" data-id="${feed._id}">✏️ Edit Post</button>`
            : ""
        }
        ${
          canPin
            ? `<button class="menu-item pin-post" data-id="${feed._id}">📌 ${
                feed.isPinned ? "📌 Unpin Post" : "📌 Pin Post"
              }</button>`
            : ""
        }
        ${
          canDelete
            ? `<button class="menu-item delete-post" data-id="${feed._id}">🗑️ Delete Post</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function generateCommentsHTML(feed) {
  if (!feed.comments || feed.comments.length === 0) return "";
  return feed.comments
    .map((comment) => export_renderComment(feed._id, comment))
    .join("");
}

export function renderComment(feedId, comment) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isOwner = currentUser.id === comment.user?._id;
  const isAdmin = currentUser.role === "admin";
  const canDelete = isAdmin || isOwner;

  const deleteBtn = canDelete
    ? `<button class="delete-comment-btn" data-feed-id="${feedId}" data-comment-id="${comment._id}" title="Delete Comment">❌</button>`
    : "";

  return `
    <div class="comment" id="comment-${comment._id}">
      <div class="comment-header">
        <img src="${
          comment.user?.profilePic || "./images/default-avatar.png"
        }" alt="Avatar" class="comment-avatar"/>
        <b class="comment-username">${comment.user?.name || "Unknown User"}:</b>
        ${deleteBtn}
      </div>
      <div class="comment-text">${comment.text}</div>
    </div>
  `;
}

export function updateCommentCount(feedId, change = 0) {
  const stats = document.querySelector(`#feed-${feedId} .feed-stats`);
  if (stats) {
    const text = stats.textContent;
    const likeMatch = text.match(/👍\s*(\d+)/);
    const commentMatch = text.match(/💬\s*(\d+)/);

    const likeCount = likeMatch ? parseInt(likeMatch[1]) : 0;
    let commentCount = commentMatch ? parseInt(commentMatch[1]) : 0;
    commentCount = Math.max(0, commentCount + change);

    stats.textContent = `👍 ${likeCount} Likes · 💬 ${commentCount} Comments`;
  }
}

export function createEditForm(feed) {
  const hasImage = !!feed.image;
  const feedId = feed._id;

  const imagePreview = hasImage
    ? `<img src="${feed.image}" alt="Current Feed Image" class="feed-image" id="edit-image-preview-${feedId}" style="display:block;" />`
    : `<img src="" alt="Image Preview" class="feed-image" id="edit-image-preview-${feedId}" style="display:none;" />`;

  const removeImageButton = hasImage
    ? `<button type="button" class="remove-image-btn menu-item">Remove Image</button>`
    : "";

  return `
    <div class="feed-edit-form" id="edit-form-container-${feedId}" data-has-original-image="${hasImage}">
      <form class="editPostForm" data-id="${feedId}">
        <textarea name="text" rows="4" required>${feed.text || ""}</textarea>
        <div class="image-upload-area">
          ${imagePreview}
          <div class="edit-image-controls">
            ${removeImageButton}
            <input type="file" name="image" accept="image/*" id="edit-post-image-${feedId}" />
          </div>
          <input type="hidden" name="removeImage" id="remove-image-flag-${feedId}" value="false" />
        </div>
        <div class="edit-actions">
          <button type="submit" class="save-edit-btn">Save Changes</button>
          <button type="button" class="cancel-edit-btn" data-id="${feedId}">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function createShareModal(feedId) {
  return `
    <div id="shareModal-${feedId}" class="share-modal-backdrop">
      <div class="share-modal-content">
        <h3>Share Post</h3>
        <p>Choose how you want to share this post:</p>
        
        <button class="share-option-btn internal-share" data-id="${feedId}" data-target="feeds">
          📢 Repost to My Feeds
        </button>
        
        <button class="share-option-btn external-share" data-id="${feedId}" data-target="external">
          🌐 Share to External App
        </button>
        
        <button class="share-option-btn copy-link" data-id="${feedId}" data-target="link">
          🔗 Copy Link to Clipboard
        </button>
        
        <button class="close-modal-btn" data-id="${feedId}">Close</button>
      </div>
    </div>
  `;
}

function openShareModal(feedId) {
  if (!document.getElementById(`shareModal-${feedId}`)) {
    document.body.insertAdjacentHTML("beforeend", createShareModal(feedId));
  }
  document.getElementById(`shareModal-${feedId}`).style.display = "flex";
}

function closeShareModal(feedId) {
  const modal = document.getElementById(`shareModal-${feedId}`);
  if (modal) {
    modal.style.display = "none";
  }
}

function sortFeeds(feeds) {
  return [...feeds].sort((a, b) => {
    if (a.isPinned && b.isPinned) {
      const aPinDate = a.pinnedAt || a.updatedAt || a.createdAt;
      const bPinDate = b.pinnedAt || b.updatedAt || b.createdAt;
      return new Date(bPinDate) - new Date(aPinDate);
    }

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function timeAgo(dateString) {
  const now = new Date();
  const postDate = new Date(dateString);
  const diff = Math.floor((now - postDate) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function initializeUI() {
  console.log("🎯 Initializing UI event delegation...");
  setupEventDelegation();
}