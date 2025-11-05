// ui.js - UI Rendering and Event Handling (Fixed ES6 Module)

import {
  fetchFeeds,
  likeFeed,
  commentOnFeed,
  deleteComment,
  deleteFeed,
  updateFeed,
  fetchFeedById,
  createFeed,
  togglePinFeed
} from "./app.js";

import { getToken, redirectToLogin, timeAgo } from "./utils.js";

// Get current user data (ALWAYS fresh from storage, no caching)
function getCurrentUserFresh() {
  console.log('🔍 getCurrentUserFresh() called');
  
  // Check all possible locations
  const cyonUserData = localStorage.getItem('cyon_user_data');
  const legacyUser = localStorage.getItem('user');
  
  console.log('📊 Storage check:', {
    cyon_user_data: cyonUserData ? 'EXISTS' : 'NULL',
    user: legacyUser ? 'EXISTS' : 'NULL'
  });
  
  // Priority 1: Use authService
  if (window.authService && typeof window.authService.getCurrentUser === 'function') {
    const user = window.authService.getCurrentUser();
    console.log('✅ Got user from authService:', user?.name, user?.id);
    return user;
  }
  
  // Priority 2: Use window.auth
  if (window.auth && window.auth.getCurrentUser) {
    const user = window.auth.getCurrentUser();
    console.log('✅ Got user from window.auth:', user?.name, user?.id);
    return user;
  }
  
  // Priority 3: Check cyon_user_data
  try {
    if (cyonUserData) {
      const user = JSON.parse(cyonUserData);
      console.log('✅ Got user from cyon_user_data:', user?.name, user?.id);
      return user;
    }
  } catch (error) {
    console.warn('❌ Error parsing cyon_user_data:', error);
  }
  
  // Priority 4: Check legacy user key
  try {
    if (legacyUser) {
      const user = JSON.parse(legacyUser);
      console.log('✅ Got user from legacy user:', user?.name, user?.id);
      return user;
    }
  } catch (error) {
    console.warn('❌ Error parsing legacy user:', error);
  }
  
  console.error('❌ No user found in ANY storage location!');
  console.log('📋 All localStorage keys:', Object.keys(localStorage));
  return null;
}

// ==========================================================
// EVENT DELEGATION SYSTEM
// ==========================================================

export function initializeUI() {
  console.log("🎯 Initializing UI event delegation...");
  console.log("📊 Current user on init:", getCurrentUserFresh());
  setupEventDelegation();
  
  // Initialize tagging system if available
  if (window.taggingSystem && window.taggingSystem.initializeTaggingSystem) {
    console.log("🏷️ Initializing tagging system...");
    window.taggingSystem.initializeTaggingSystem();
  }
}

function setupEventDelegation() {
  // Single event listener for all clicks
  document.addEventListener("click", async (e) => {
    // Like button
    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
      e.preventDefault();
      await handleLikeClick(likeBtn.dataset.id, likeBtn);
      return;
    }

    // Comment button (toggle)
    const commentBtn = e.target.closest(".comment-btn");
    if (commentBtn) {
      e.preventDefault();
      toggleCommentsSection(commentBtn.dataset.id);
      return;
    }

    // Submit comment
    const submitCommentBtn = e.target.closest(".submit-comment");
    if (submitCommentBtn) {
      e.preventDefault();
      await handleCommentSubmit(submitCommentBtn.dataset.id, submitCommentBtn);
      return;
    }

    // Menu button
    const menuBtn = e.target.closest(".menu-btn");
    if (menuBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu(menuBtn.dataset.id);
      return;
    }

    // Edit post
    const editBtn = e.target.closest(".edit-post");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = editBtn.dataset.id;
      console.log('🎯 Edit button clicked for feed:', feedId);
      await handleEditPost(feedId);
      return;
    }

    // Delete post
    const deleteBtn = e.target.closest(".delete-post");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      await handleDeletePost(deleteBtn.dataset.id, deleteBtn);
      return;
    }

    // Pin post
    const pinBtn = e.target.closest(".pin-post");
    if (pinBtn) {
      e.preventDefault();
      e.stopPropagation();
      await handlePinPost(pinBtn.dataset.id);
      return;
    }

    // Cancel edit
    const cancelBtn = e.target.closest(".cancel-edit-btn");
    if (cancelBtn) {
      e.preventDefault();
      cancelEdit(cancelBtn.dataset.id);
      return;
    }

    // Remove image in edit form
    const removeBtn = e.target.closest(".remove-image-btn");
    if (removeBtn) {
      e.preventDefault();
      handleRemoveImageClick(removeBtn);
      return;
    }

    // Delete comment
    const deleteCommentBtn = e.target.closest(".delete-comment-btn");
    if (deleteCommentBtn) {
      e.preventDefault();
      await handleDeleteComment(deleteCommentBtn.dataset.feedId, deleteCommentBtn.dataset.commentId);
      return;
    }

    // Share button
    const shareBtn = e.target.closest(".share-btn");
    if (shareBtn) {
      e.preventDefault();
      openShareModal(shareBtn.dataset.id);
      return;
    }

    // Share option
    const shareOptionBtn = e.target.closest(".share-option-btn");
    if (shareOptionBtn) {
      e.preventDefault();
      await handleShareOptionClick(shareOptionBtn.dataset.id, shareOptionBtn.dataset.target);
      closeShareModal(shareOptionBtn.dataset.id);
      return;
    }

    // Close modal
    const closeModalBtn = e.target.closest(".close-modal-btn");
    if (closeModalBtn) {
      e.preventDefault();
      closeShareModal(closeModalBtn.dataset.id);
      return;
    }

    // View original reshare
    const reshareLink = e.target.closest(".reshare-link");
    if (reshareLink) {
      e.preventDefault();
      handleViewOriginal(reshareLink.dataset.originalId);
      return;
    }
  });

  // Form submission delegation
  document.addEventListener("submit", async (e) => {
    const editForm = e.target.closest(".editPostForm");
    if (editForm) {
      e.preventDefault();
      await handleEditFormSubmit(editForm.dataset.id, editForm);
    }
  });

  // Close menus on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".feed-menu")) {
      document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
        menu.classList.remove("show");
      });
    }
  });

  // Enter key for comments
  document.addEventListener("keypress", (e) => {
    if (e.target.classList.contains("comment-input") && e.key === "Enter") {
      e.preventDefault();
      const feedId = e.target.id.replace("commentInput-", "");
      const submitBtn = document.querySelector(`.submit-comment[data-id="${feedId}"]`);
      if (submitBtn) handleCommentSubmit(feedId, submitBtn);
    }
  });
}

// ==========================================================
// EVENT HANDLERS
// ==========================================================

async function handleLikeClick(feedId, likeBtn) {
  likeBtn.classList.toggle("liked");
  
  const feedElement = document.getElementById(`feed-${feedId}`);
  const stats = feedElement?.querySelector(".feed-stats");
  if (stats) {
    const text = stats.textContent;
    const match = text.match(/👍\s*(\d+)/);
    let likeCount = match ? parseInt(match[1]) : 0;
    likeCount += likeBtn.classList.contains("liked") ? 1 : -1;
    stats.textContent = text.replace(/👍\s*\d+/, `👍 ${likeCount}`);
  }

  try {
    await likeFeed(feedId);
  } catch (err) {
    likeBtn.classList.toggle("liked");
    if (stats) {
      const feeds = await fetchFeeds();
      renderFeeds(feeds);
    }
    alert("Could not like this post.");
  }
}

async function handleDeletePost(feedId, deleteBtn) {
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
        setTimeout(() => feedElement.remove(), 300);
      }
    } else {
      throw new Error("Delete failed");
    }
  } catch (error) {
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
      updateCommentCount(feedId, -1);
    } else {
      throw new Error("Delete failed");
    }
  } catch (error) {
    alert("Failed to delete comment: " + error.message);
    commentElement.style.opacity = "1";
  }
}

async function handlePinPost(feedId) {
  const token = getToken();
  if (!token) {
    alert("Your session has expired. Please log in again.");
    redirectToLogin();
    return;
  }

  // FIX: Get currentUser properly (no global variable)
  const currentUser = getCurrentUserFresh();
  
  if (!currentUser || currentUser.role !== "admin") {
    alert("Only administrators can pin posts");
    document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
      menu.classList.remove("show");
    });
    return;
  }

  const pinBtn = document.querySelector(`.pin-post[data-id="${feedId}"]`);
  if (!pinBtn) return;

  const originalText = pinBtn.textContent;
  pinBtn.textContent = "Updating...";
  pinBtn.disabled = true;

  try {
    const result = await togglePinFeed(feedId);
    if (result) {
      pinBtn.textContent = result.feed.isPinned ? "📌 Unpin Post" : "📌 Pin Post";
      alert(`Post ${result.feed.isPinned ? 'pinned' : 'unpinned'} successfully!`);
      
      const feeds = await fetchFeeds();
      renderFeeds(feeds);
    } else {
      throw new Error("Pin operation failed");
    }
  } catch (error) {
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
    section.style.display = section.style.display === "block" ? "none" : "block";
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
  console.log('✏️ Edit post clicked:', feedId);
  
  const card = document.getElementById(`feed-${feedId}`);
  if (!card) {
    console.error('❌ Feed card not found:', feedId);
    return;
  }

  try {
    const originalHTML = card.innerHTML;
    card.innerHTML = '<div style="text-align:center; padding: 20px;">Loading editor...</div>';

    console.log('📥 Fetching feed data...');
    const feedToEdit = await fetchFeedById(feedId);
    
    if (!feedToEdit) {
      console.error('❌ Could not load feed for editing');
      showErrorNotification("Could not load post for editing.");
      card.innerHTML = originalHTML;
      return;
    }
    
    console.log('✅ Feed loaded:', feedToEdit);

    card.dataset.originalHtml = originalHTML;
    card.dataset.editing = "true";

    console.log('🎨 Creating edit form...');
    card.innerHTML = createEditForm(feedToEdit);
    
    console.log('🔧 Setting up form listeners...');
    setupEditFormListeners(feedId);

    // Close any open menus
    document.querySelectorAll(".menu-dropdown.show").forEach((menu) => {
      menu.classList.remove("show");
    });
    
    console.log('✅ Edit form ready');
  } catch (error) {
    console.error('💥 Error loading post for editing:', error);
    showErrorNotification("Failed to load post for editing: " + error.message);
    cancelEdit(feedId);
  }
}

function handleViewOriginal(originalFeedId) {
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
  console.log('💾 Form submitted for feed:', feedId);
  
  const saveBtn = form.querySelector(".save-edit-btn");
  const cancelBtn = form.querySelector(".cancel-edit-btn");
  const originalBtnText = saveBtn.textContent;

  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;

  try {
    const formData = new FormData(form);
    
    // Log what we're sending
    console.log('📤 Sending form data:');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}:`, value.name || 'No file');
      } else {
        console.log(`  ${key}:`, value);
      }
    }
    
    console.log('🔄 Calling updateFeed API...');
    const updatedFeed = await updateFeed(feedId, formData);

    console.log('📥 Update response:', updatedFeed);

    if (updatedFeed) {
      console.log('✅ Post updated successfully');
      
      // OPTIMIZED: Exit edit mode and re-render immediately (no slow import)
      const card = document.getElementById(`feed-${feedId}`);
      if (card) {
        delete card.dataset.editing;
        delete card.dataset.originalHtml;
        
        // Re-render immediately with updated data
        console.log('🔄 Re-rendering updated feed...');
        renderSingleFeed(updatedFeed);
        
        // Show success notification
        showSuccessNotification('Post updated successfully!');
      }
      
    } else {
      throw new Error("Update returned null - check backend logs");
    }
  } catch (error) {
    console.error('💥 Edit form submission error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Show user-friendly error
    const errorMsg = error.message || 'Unknown error occurred';
    showErrorNotification("Failed to update post: " + errorMsg);
    
  } finally {
    // Re-enable buttons
    saveBtn.textContent = originalBtnText;
    saveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

// Helper function for success notifications
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    z-index: 10000;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `✅ ${message}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Helper function for error notifications
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f44336;
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    z-index: 10000;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `❌ ${message}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
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
    ? feedElement.querySelector(".feed-text")?.textContent?.substring(0, 100) + "..."
    : "Check out this post!";
  const shareUrl = `${window.location.origin}/feeds.html?feedId=${feedId}`;

  switch (target) {
    case "feeds":
      try {
        const originalFeed = await fetchFeedById(feedId);
        let reshareText = originalFeed && originalFeed.text 
          ? originalFeed.text 
          : `Shared post from feed ${feedId}. Check it out!`;

        const formData = new FormData();
        formData.append("type", "reshare");
        formData.append("originalFeedId", feedId);
        formData.append("text", reshareText);

        await createFeed(formData);
        alert("Post successfully re-posted to your feeds page!");
      } catch (error) {
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
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error sharing externally:", error);
          }
        }
      } else {
        alert("Web Share API not supported. Use 'Copy Link'.");
      }
      break;

    case "link":
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      } catch (err) {
        alert("Could not copy link to clipboard.");
      }
      break;

    default:
      console.warn(`Unknown share target: ${target}`);
  }
}

// ==========================================================
// RENDER FUNCTIONS
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
    console.error("❌ feedContainer element not found!");
    return;
  }

  container.innerHTML = "";

  if (!feeds || feeds.length === 0) {
    container.innerHTML = "<p>No posts yet</p>";
    return;
  }

  // Get fresh user data for rendering
  const currentUser = getCurrentUserFresh();
  console.log('📊 Rendering feeds for user:', currentUser?.name, currentUser?.role);
  
  const sortedFeeds = sortFeeds(feeds);

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

  if (feedElement && feedElement.dataset.editing !== "true") {
    feedElement.innerHTML = generateFeedHTML(updatedFeed);
  } else {
    setTimeout(async () => {
      const feeds = await fetchFeeds();
      renderFeeds(feeds);
    }, 100);
  }
}

function generateFeedHTML(feed) {
  // ALWAYS get fresh user data from storage (no caching)
  const currentUser = getCurrentUserFresh();
  
  if (!currentUser || !currentUser.id) {
    console.error('❌ No valid current user found in generateFeedHTML');
    console.log('Available storage keys:', Object.keys(localStorage));
    console.log('cyon_user_data:', localStorage.getItem('cyon_user_data'));
    return '<div class="error">Authentication error - Please refresh the page</div>';
  }
  
  console.log('👤 Rendering feed with user:', {
    name: currentUser.name,
    id: currentUser.id,
    role: currentUser.role
  });

  const isReshare = feed.type === "reshare";
  const originalFeedId = feed.originalFeed;

  let shouldShowText = false;
  if (feed.text) {
    if (isReshare) {
      const defaultReshareText = `Shared post from feed ${originalFeedId}. Check it out!`;
      shouldShowText = feed.text.trim() !== defaultReshareText.trim();
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

  const menuHTML = showMenu ? generateMenuHTML(feed, canEdit, canPin, canDelete) : "";
  const likeCount = feed.likes?.length || feed.likeCount || 0;
  const commentCount = feed.comments?.length || feed.commentCount || 0;
  const commentsHTML = generateCommentsHTML(feed);

  let reshareIndicatorHTML = "";
  if (isReshare) {
    reshareIndicatorHTML = `
      <div class="feed-reshare-indicator">
        <i class="fas fa-retweet"></i> ${feed.user?.name || "A User"} shared a post
        ${originalFeedId ? `<span class="reshare-link" data-original-id="${originalFeedId}">View Original</span>` : ""}
      </div>
    `;
  }

  return `
    <div class="feed-card ${isReshare ? "reshared-feed" : "original-feed"}" data-id="${feed._id}">
      ${reshareIndicatorHTML}
      
      <div class="feed-header">
        <div class="user-info">
          <img src="${feed.user?.profilePic || "./images/default-avatar.png"}" 
                alt="User Avatar" class="avatar" />
          <div>
            <h4 class="username">
              ${feed.user?.name || "Unknown User"}
              ${currentUser.role === "admin" ? '<span class="admin-badge">ADMIN</span>' : ""}
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
        <button class="like-btn ${isLiked ? "liked" : ""}" data-id="${feed._id}">👍 Like</button>
        <button class="comment-btn" data-id="${feed._id}">💬 Comment</button>
        <button class="share-btn" data-id="${feed._id}">
          <img src="./images/share-green.png" alt="Share" class="share-icon" style="width:30px; height:auto; border-radius:1px;"> Share
        </button>
      </div>

      <div class="feed-stats">
        👍 ${likeCount} Likes · 💬 ${commentCount} Comments
      </div>

      <div class="comments-section" id="comments-${feed._id}" style="display:none;">
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
  console.log('🎛️ Generating menu:', {
    feedId: feed._id,
    canEdit,
    canPin,
    canDelete,
    isPinned: feed.isPinned
  });
  
  return `
    <div class="feed-menu">
      <button class="menu-btn" data-id="${feed._id}">⋯</button>
      <div class="menu-dropdown" id="menu-${feed._id}">
        ${canEdit ? `<button class="menu-item edit-post" data-id="${feed._id}">✏️ Edit Post</button>` : ""}
        ${canPin ? `<button class="menu-item pin-post" data-id="${feed._id}">${feed.isPinned ? "📌 Unpin Post" : "📌 Pin Post"}</button>` : ""}
        ${canDelete ? `<button class="menu-item delete-post" data-id="${feed._id}">🗑️ Delete Post</button>` : ""}
      </div>
    </div>
  `;
}

function generateCommentsHTML(feed) {
  if (!feed.comments || feed.comments.length === 0) return "";
  return feed.comments.map((comment) => renderComment(feed._id, comment)).join("");
}

export function renderComment(feedId, comment) {
  // FIX: Get fresh user data (don't use global variable)
  const currentUser = getCurrentUserFresh();
  
  if (!currentUser || !currentUser.id) {
    console.error('❌ No valid current user in renderComment');
    return '<div class="comment-error">Unable to load comment</div>';
  }
  
  const isOwner = currentUser.id === comment.user?._id;
  const isAdmin = currentUser.role === "admin";
  const canDelete = isAdmin || isOwner;

  const deleteBtn = canDelete
    ? `<button class="delete-comment-btn" data-feed-id="${feedId}" data-comment-id="${comment._id}" title="Delete Comment">❌</button>`
    : "";

  return `
    <div class="comment" id="comment-${comment._id}">
      <div class="comment-header">
        <img src="${comment.user?.profilePic || "./images/default-avatar.png"}" alt="Avatar" class="comment-avatar"/>
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
    <div class="feed-edit-form" id="edit-form-container-${feedId}">
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
  if (modal) modal.style.display = "none";
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

// Render text with @mentions highlighted
function renderTextWithMentions(text) {
  if (!text) return '';
  
  // Escape HTML to prevent XSS
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Match @username patterns (letters, numbers, underscores)
  const mentionRegex = /@([\w]+)/g;
  
  return escapedText.replace(mentionRegex, (match, username) => {
    return `<span class="mention-tag" style="
      color: #1976d2;
      background: #e3f2fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
    " data-username="${username}" title="@${username}">@${username}</span>`;
  });
}