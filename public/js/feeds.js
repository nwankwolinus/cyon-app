import { 
    fetchFeeds, 
    createFeed, 
    likeFeed, 
    commentOnFeed, 
    deleteComment, 
    deleteFeed, 
    updateFeed, 
    fetchFeedById 
} from "./app.js";

import { 
    renderFeeds, 
    renderSingleFeed, 
    renderComment, 
    updateCommentCount, 
    initializeUI, 
    cancelEdit 
} from "./ui.js";

import { getBackendBaseUrl, getToken, redirectToLogin } from './utils.js';

// ==========================================================
// 1. INITIAL SETUP & TOKEN CHECK
// ==========================================================
const token = getToken();
if (!token) redirectToLogin();

const socket = io(getBackendBaseUrl(), {
  auth: {
    token: token
  },
  // Stability options
  transports: ['websocket', 'polling'],
  upgrade: true,
  forceNew: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

// === DOM Element References ===
let postForm, postText, postImage, preview;

// ==========================================================
// 2. SOCKET.IO CONNECTION & REAL-TIME HANDLERS
// ==========================================================

socket.on("connect", () => {
  console.log('✅ Socket.IO connected:', socket.id);
});

socket.on("disconnect", (reason) => {
  console.log('🔴 Socket.IO disconnected:', reason);
});

socket.on("connect_error", (error) => {
  console.error('❌ Socket.IO connection error:', error);
});

socket.on("reconnect_failed", () => {
  console.error('💥 Socket reconnection failed');
});

// --- Real-time Feed Handlers ---

// Handle new post creation (emitted by server after POST request success)
socket.on("newFeed", (feed) => {
    console.log("⚡ New feed received via socket:", feed._id);
    renderSingleFeed(feed); // Render at the top
});

// Handle post update (emitted by server after PUT request success)
socket.on("feedUpdated", (feed) => {
    console.log("⚡ Feed updated via socket:", feed._id);
    const existingElement = document.getElementById(`feed-${feed._id}`);
    
    // If the user is currently editing the post, cancel the edit first
    if (existingElement && existingElement.dataset.editing === 'true') {
        cancelEdit(feed._id);
    }
    
    // Then re-render the updated content
    renderSingleFeed(feed); 
    
    console.log('✅ Feed updated and re-rendered.');
});

// Handle post deletion (emitted by server after DELETE request success)
socket.on("feedDeleted", (feedId) => {
    console.log("⚡ Feed deleted via socket:", feedId);
    const feedElement = document.getElementById(`feed-${feedId}`);
    if (feedElement) {
        // Apply smooth transition before removal (if it's still in the DOM)
        feedElement.style.opacity = '0';
        feedElement.style.transform = 'scale(0.8)';
        feedElement.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            feedElement.remove();
        }, 300);
    }
});

// Handle like/unlike updates
socket.on("feedLiked", ({ feedId, likeCount }) => {
    console.log("⚡ Feed liked via socket:", feedId, "Count:", likeCount);
    
    // Update the feed stats directly on the card
    const stats = document.querySelector(`#feed-${feedId} .feed-stats`);
    if (stats) {
        const text = stats.textContent;
        // Use regex to replace the old like count
        const newText = text.replace(/👍\s*\d+/, `👍 ${likeCount}`);
        stats.textContent = newText;
    }
});

// --- Real-time Comment Handlers ---

// Handle new comment (emitted by server after POST request success)
socket.on("newComment", ({ feedId, comment }) => {
    console.log("⚡ New comment received via socket:", feedId, comment._id);
    
    const commentsList = document.querySelector(`#comments-${feedId} .comments-list`);
    if (commentsList) {
        // Append the new comment HTML and update the counter
        commentsList.insertAdjacentHTML('beforeend', renderComment(feedId, comment));
        updateCommentCount(feedId, 1);
        
        // Ensure comments section is visible if it was hidden
        const commentsSection = document.getElementById(`comments-${feedId}`);
        if (commentsSection && commentsSection.style.display === 'none') {
             commentsSection.style.display = 'block';
        }
    }
});

// Handle comment deletion
socket.on("commentDeleted", ({ feedId, commentId }) => {
    console.log("⚡ Comment deleted via socket:", feedId, commentId);
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (commentElement) {
        commentElement.remove();
        updateCommentCount(feedId, -1);
    }
});


// ==========================================================
// 3. INITIALIZATION & FORM HANDLERS
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log('🔧 DOM loaded - initializing feeds.js');
  
  // Initialize DOM elements
  postForm = document.getElementById("postForm");
  postText = document.getElementById("postText");
  postImage = document.getElementById("postImage");
  preview = document.getElementById("preview");

  if (!postForm) {
    console.error('❌ CRITICAL: postForm element not found!');
    return;
  }

  // Set up event listeners
  setupImagePreview();
  setupFormSubmission();

  // Initialize UI event delegation (handles all clicks: like, comment, edit, delete)
  console.log('🎯 Initializing UI event delegation...');
  initializeUI();

  // Load initial feeds
  console.log('📥 Loading initial feeds...');
  try {
    const feeds = await fetchFeeds();
    if (feeds) {
        renderFeeds(feeds);
    }
  } catch (error) {
    console.error('Failed to fetch initial feeds:', error);
  }
});

/**
 * Handles the image file selection and displays a preview.
 */
function setupImagePreview() {
  if (!postImage || !preview) return;
  
  postImage.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      preview.src = "";
      preview.style.display = "none";
    }
  });
}

/**
 * Handles the submission of the new post form.
 */
function setupFormSubmission() {
  if (!postForm) return;

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = postText.value.trim();
    const file = postImage.files[0];
    const postBtn = postForm.querySelector(`button[type="submit"]`);

    if (!text && !file) {
      alert("Please write something or select an image!");
      return;
    }

    // Provide Feedback (Disable UI)
    const originalPostBtnText = postBtn ? postBtn.textContent : "Post";
    if (postBtn) {
      postBtn.textContent = "Posting...";
      postBtn.disabled = true;
    }
    postText.disabled = true;
    postImage.disabled = true;

    const formData = new FormData();
    formData.append("text", text);
    if (file) formData.append("image", file);

    try {
      // The newFeed result will be an object. The socket handler will render it.
      await createFeed(formData); 
      
      // Clear input fields on success
      postText.value = "";
      postImage.value = "";
      preview.src = "";
      preview.style.display = "none";

    } catch (error) {
      console.error("💥 Post Submission Error:", error);
      alert("An error occurred during posting: " + (error.message || 'Please check console.'));
    } finally {
      // Always Re-enable UI
      if (postBtn) { 
        postBtn.textContent = originalPostBtnText;
        postBtn.disabled = false;
      }
      postText.disabled = false;
      postImage.disabled = false;
    } 
  });
}