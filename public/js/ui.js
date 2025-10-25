import { 
    fetchFeeds, 
    likeFeed, 
    commentOnFeed, 
    deleteComment, 
    deleteFeed, 
    updateFeed, 
    fetchFeedById 
} from "./app.js";

// Import rendering functions from ui.js itself for internal use,

// ==========================================================
// 🎯 EVENT DELEGATION FOR BETTER PERFORMANCE
// ==========================================================

function setupEventDelegation() {
  console.log('🔧 Setting up event delegation...');
  
  // Single event listener for all interactive elements
  document.addEventListener('click', async (e) => {
    
    // --- Like Button ---
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
      e.preventDefault();
      const id = likeBtn.dataset.id;
      await handleLikeClick(id, likeBtn);
      return;
    }

    // --- Comment Button (Toggle) ---
    const commentBtn = e.target.closest('.comment-btn');
    if (commentBtn) {
      e.preventDefault();
      const id = commentBtn.dataset.id;
      toggleCommentsSection(id);
      return;
    }

    // --- Submit Comment Button ---
    const submitCommentBtn = e.target.closest('.submit-comment');
    if (submitCommentBtn) {
      e.preventDefault();
      const feedId = submitCommentBtn.dataset.id;
      await handleCommentSubmit(feedId, submitCommentBtn);
      return;
    }

    // --- Menu Button (Toggle) ---
    const menuBtn = e.target.closest('.menu-btn');
    if (menuBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = menuBtn.dataset.id;
      toggleMenu(feedId);
      return;
    }

    // --- Handle edit post buttons ---
    const editBtn = e.target.closest('.edit-post');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = editBtn.dataset.id;
      await handleEditPost(feedId);
      return;
    }

    // --- Handle delete post buttons ---
    const deleteBtn = e.target.closest('.delete-post');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = deleteBtn.dataset.id;
      await handleDeletePost(feedId, deleteBtn);
      return;
    }

    // --- Handle pin post buttons ---
    const pinBtn = e.target.closest('.pin-post');
    if (pinBtn) {
      e.preventDefault();
      e.stopPropagation();
      const feedId = pinBtn.dataset.id;
      await handlePinPost(feedId);
      return;
    }

    // --- Handle cancel edit buttons ---
    const cancelBtn = e.target.closest('.cancel-edit-btn');
    if (cancelBtn) {
      e.preventDefault();
      const feedId = cancelBtn.dataset.id;
      cancelEdit(feedId);
      return;
    }
    
    // --- Handle remove image button in edit form ---
    const removeBtn = e.target.closest('.remove-image-btn');
    if (removeBtn) {
      e.preventDefault();
      handleRemoveImageClick(removeBtn);
      return;
    }
    
    // --- Handle delete comment buttons ---
    const deleteCommentBtn = e.target.closest('.delete-comment-btn');
    if (deleteCommentBtn) {
        e.preventDefault();
        const feedId = deleteCommentBtn.dataset.feedId;
        const commentId = deleteCommentBtn.dataset.commentId;
        await handleDeleteComment(feedId, commentId);
        return;
    }
  });

  // Listener for Edit Form submission (using delegation on the whole document)
  document.addEventListener('submit', async (e) => {
    const editForm = e.target.closest('.editPostForm');
    if (editForm) {
      e.preventDefault();
      const feedId = editForm.dataset.id;
      await handleEditFormSubmit(feedId, editForm); // NEW HANDLER
    }
  });


  // Close menus when clicking outside the menu area
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.feed-menu')) {
      document.querySelectorAll('.menu-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });

  // Handle Enter key in comment inputs (Keyboard Support)
  document.addEventListener('keypress', (e) => {
    if (e.target.classList.contains('comment-input') && e.key === 'Enter') {
      e.preventDefault();
      const feedId = e.target.id.replace('commentInput-', '');
      const submitBtn = document.querySelector(`.submit-comment[data-id="${feedId}"]`);
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
  console.log('🗑️ Delete post clicked:', feedId);
  
  if (!confirm('Are you sure you want to delete this post?')) return;

  const originalText = deleteBtn.textContent;
  deleteBtn.textContent = 'Deleting...';
  deleteBtn.disabled = true;

  try {
    // deleteFeed sends the API call which triggers the 'feedDeleted' socket event
    const success = await deleteFeed(feedId); 
    
    if (success) {
      // Immediate UI removal for fast feedback, even before the socket event
      const feedElement = document.getElementById(`feed-${feedId}`);
      if (feedElement) {
        feedElement.style.opacity = '0';
        feedElement.style.transform = 'scale(0.8)';
        feedElement.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          if (feedElement.parentNode) {
            feedElement.remove();
          }
        }, 300);
      }
    } else {
      throw new Error('Delete failed or unauthorized.');
    }
  } catch (error) {
    console.error('Delete failed:', error);
    alert('Failed to delete post: ' + error.message);
    deleteBtn.textContent = originalText;
    deleteBtn.disabled = false;
  }
}

async function handleDeleteComment(feedId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;

    // Optional: visual feedback
    commentElement.style.opacity = '0.5';

    try {
        const result = await deleteComment(feedId, commentId);

        if (result) {
            // Success, remove from DOM and update count
            commentElement.remove();
            export_updateCommentCount(feedId, -1);
            console.log('✅ Comment deleted successfully.');
        } else {
            throw new Error('Delete comment failed.');
        }
    } catch (error) {
        console.error('Comment deletion failed:', error);
        alert('Failed to delete comment: ' + error.message);
        commentElement.style.opacity = '1'; // Restore opacity on failure
    }
}

async function handlePinPost(feedId) {
  console.log('📌 Pin post clicked:', feedId);
  alert('Pin functionality will be implemented soon!');
  
  // Close menu
  document.querySelectorAll('.menu-dropdown.show').forEach(menu => {
    menu.classList.remove('show');
  });
}

async function handleLikeClick(feedId, likeBtn) {
  // Add temporary feedback class
  likeBtn.classList.add('liking');
  likeBtn.disabled = true;

  try {
    const result = await likeFeed(feedId);
    if (!result) return;
    
    // Update like count immediately on UI
    const stats = likeBtn.closest('.feed-item')?.querySelector('.feed-stats');
    if (stats) {
      const text = stats.textContent;
      // Using a regex to reliably find and replace the like count
      const newText = text.replace(/👍\s*\d+/, `👍 ${result.likeCount}`);
      stats.textContent = newText;
    }
  } catch (err) {
    console.error('Error liking post:', err);
  } finally {
    likeBtn.classList.remove('liking');
    likeBtn.disabled = false;
  }
}

function toggleCommentsSection(feedId) {
  const section = document.getElementById(`comments-${feedId}`);
  if (section) {
    // Toggle between 'none' and 'block'
    section.style.display = section.style.display === 'block' ? 'none' : 'block';
  }
}

async function handleCommentSubmit(feedId, submitBtn) {
  const input = document.getElementById(`commentInput-${feedId}`);
  const text = input?.value.trim();
  
  if (!text) return;

  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Posting...';
  submitBtn.disabled = true;

  try {
    // commentOnFeed calls the API, which emits the socket event on success.
    await commentOnFeed(feedId, text);
    input.value = ''; // Clear input on success
    
    // NOTE: The actual comment rendering and count update is handled 
    // by the 'newComment' socket listener in feeds.js.

  } catch (error) {
    console.error('Failed to post comment:', error);
    alert('Failed to post comment. Please try again.');
  } finally {
    submitBtn.innerHTML = originalHTML;
    submitBtn.disabled = false;
  }
}

function toggleMenu(feedId) {
  const menu = document.getElementById(`menu-${feedId}`);
  if (!menu) return;

  // Close all other menus for a clean UI
  document.querySelectorAll('.menu-dropdown.show').forEach(otherMenu => {
    if (otherMenu !== menu) otherMenu.classList.remove('show');
  });

  // Toggle current menu
  menu.classList.toggle('show');
}

async function handleEditPost(feedId) {
  const card = document.getElementById(`feed-${feedId}`);
  if (!card) return;

  try {
    const originalHTML = card.innerHTML;
    // Show loading state
    card.innerHTML = '<div style="text-align:center; padding: 20px;">Loading editor...</div>';
    
    // Fetch the raw feed data
    const feedToEdit = await fetchFeedById(feedId);
    if (!feedToEdit) {
      alert('Could not load post for editing.');
      card.innerHTML = originalHTML; // Restore on failure
      return;
    }

    // Store original HTML and set flag
    card.dataset.originalHtml = originalHTML;
    card.dataset.editing = 'true';

    // Replace card content with the edit form
    card.innerHTML = createEditForm(feedToEdit);
    setupEditFormListeners(feedId);

    // Close any open menus
    document.querySelectorAll('.menu-dropdown.show').forEach(menu => {
      menu.classList.remove('show');
    });

  } catch (error) {
    console.error('Error loading post for editing:', error);
    alert('Failed to load post for editing. ' + error.message);
    cancelEdit(feedId);
  }
}

/**
 * NEW FUNCTION: Handles the submission of the Edit Post form.
 */
async function handleEditFormSubmit(feedId, form) {
  const saveBtn = form.querySelector('.save-edit-btn');
  const originalBtnText = saveBtn.textContent;
  
  // Disable UI
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  form.disabled = true;

  try {
    const formData = new FormData(form);
    
    console.log('🔄 Calling updateFeed API...');
    
    const updatedFeed = await updateFeed(feedId, formData);
    
    if (updatedFeed) {
      console.log('✅ Post updated successfully. Awaiting socket re-render...');
      // NOTE: We don't restore the original content (cancelEdit) here.
      // The 'feedUpdated' socket listener in feeds.js will receive the
      // full, updated post from the server and re-render the card, 
      // automatically overriding the edit form.
      
    } else {
      throw new Error('Update failed on server.');
    }
  } catch (error) {
    console.error('💥 Edit Form Submission Error:', error);
    alert('Failed to update post: ' + error.message.split(': ')[1] || 'Please try again.');
    
    // If update fails, re-enable button but keep the form open
    saveBtn.textContent = originalBtnText;
    saveBtn.disabled = false;
    form.disabled = false;
  }
}

/**
 * Restores the card's original content after an edit cancel or success.
 */
export function cancelEdit(feedId) {
  const card = document.getElementById(`feed-${feedId}`);
  if (card && card.dataset.originalHtml) {
    delete card.dataset.editing;
    // Restore the original content
    card.innerHTML = card.dataset.originalHtml;
    delete card.dataset.originalHtml;
  }
}

function handleRemoveImageClick(removeBtn) {
  const form = removeBtn.closest('.editPostForm');
  if (!form) return;
  
  const feedId = form.dataset.id;
  const imageInput = document.getElementById(`edit-post-image-${feedId}`);
  const imagePreview = document.getElementById(`edit-image-preview-${feedId}`);
  const removeFlag = document.getElementById(`remove-image-flag-${feedId}`);
  
  if (imagePreview) {
    imagePreview.src = '';
    imagePreview.style.display = 'none';
  }
  if (removeFlag) removeFlag.value = 'true'; // Set flag for backend
  if (imageInput) imageInput.value = ''; // Clear file input
  
  // Hide the button after click
  removeBtn.style.display = 'none'; 
}

function setupEditFormListeners(feedId) {
  const imageInput = document.getElementById(`edit-post-image-${feedId}`);
  const imagePreview = document.getElementById(`edit-image-preview-${feedId}`);
  const removeBtn = document.querySelector(`#feed-${feedId} .remove-image-btn`);
  const removeFlag = document.getElementById(`remove-image-flag-${feedId}`);

  if (imageInput) {
    // Listener for when a new file is selected
    imageInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          if (imagePreview) {
            imagePreview.src = reader.result;
            imagePreview.style.display = 'block';
          }
          if (removeFlag) removeFlag.value = 'false'; // New image overrides removal
          if (removeBtn) removeBtn.style.display = 'block'; // Show remove button if a file is present
        };
        reader.readAsDataURL(file);
      }
    };
  }
}

// ==========================================================
// 🎯 RENDER FUNCTIONS (EXPORTED)
// ==========================================================

/**
 * Renders a single new feed card at the top of the container.
 * Also handles efficient update if the feed already exists.
 */
export function renderSingleFeed(feed) {
  const container = document.getElementById('feedContainer');
  if (!container) return;

  const existingElement = document.getElementById(`feed-${feed._id}`);
  
  if (existingElement) {
    // If it exists and is not being edited, update its content (used for socket updates)
    if (existingElement.dataset.editing !== 'true') {
        existingElement.innerHTML = generateFeedHTML(feed);
    }
    return; // Don't insert a duplicate
  }

  const card = document.createElement('div');
  card.className = 'feed-item';
  card.id = `feed-${feed._id}`;
  card.innerHTML = generateFeedHTML(feed);

  container.insertAdjacentElement('afterbegin', card);
}

/**
 * Replaces the entire feed container content with the provided feeds.
 */
export function renderFeeds(feeds) {
  const container = document.getElementById('feedContainer');
  
  if (!container) {
    console.error('❌ CRITICAL: feedContainer element not found!');
    return;
  }

  container.innerHTML = '';

  if (!feeds || feeds.length === 0) {
    container.innerHTML = '<p>No posts yet</p>';
    return;
  }
  
  feeds.forEach((feed) => {
    const card = document.createElement('div');
    card.className = 'feed-item';
    card.id = `feed-${feed._id}`;
    card.innerHTML = generateFeedHTML(feed);
    container.appendChild(card);
  });
}

// 🎯 EXTRACTED: Generate feed HTML (reduces duplication)
function generateFeedHTML(feed) {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = currentUser.id === feed.user?._id;
  const canDelete = currentUser.role === 'admin' || isOwner;
  const canEdit = isOwner;
  const canPin = currentUser.role === 'admin';
  const showMenu = canDelete || canEdit || canPin;
  const isLiked = feed.likes && feed.likes.includes(currentUser.id);

  const imageHTML = feed.image 
    ? `<img src="${feed.image}" alt="Feed Image" class="feed-image" onerror="this.style.display='none';" />` 
    : '';

  const menuHTML = showMenu ? generateMenuHTML(feed, canEdit, canPin, canDelete) : '';
  
  const likeCount = feed.likes?.length || feed.likeCount || 0;
  const commentCount = feed.comments?.length || feed.commentCount || 0;
  const commentsHTML = generateCommentsHTML(feed);

  return `
    <div class="feed-card">
      <div class="feed-header">
        <div class="user-info">
          <img src="${feed.user?.profilePic || './images/default-avatar.png'}" 
                alt="User Avatar" class="avatar" />
          <div>
            <h4 class="username">${feed.user?.name || 'Unknown User'}</h4>
            <span class="churchAttend">${feed.user?.church || ''}</span>
            <span class="timestamp">${timeAgo(feed.createdAt)}</span>
          </div>
        </div>
        ${menuHTML}
      </div>

      <p class="feed-text">${feed.text || ''}</p>
      ${imageHTML}

      <div class="feed-actions">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${feed._id}">👍 Like</button>
        <button class="comment-btn" data-id="${feed._id}">💬 Comment</button>
        <button class="share-btn" disabled>↗ Share</button>
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

// 🎯 EXTRACTED: Generate menu HTML
function generateMenuHTML(feed, canEdit, canPin, canDelete) {
  return `
    <div class="feed-menu">
      <button class="menu-btn" data-id="${feed._id}">⋯</button>
      <div class="menu-dropdown" id="menu-${feed._id}">
        ${canEdit ? `<button class="menu-item edit-post" data-id="${feed._id}">✏️ Edit Post</button>` : ''}
        ${canPin ? `<button class="menu-item pin-post" data-id="${feed._id}">📌 ${feed.isPinned ? 'Unpin Post' : 'Pin Post'}</button>` : ''}
        ${canDelete ? `<button class="menu-item delete-post" data-id="${feed._id}">🗑️ Delete Post</button>` : ''}
      </div>
    </div>
  `;
}

// 🎯 EXTRACTED: Generate comments HTML (Reduces duplication)
function generateCommentsHTML(feed) {
  if (!feed.comments || feed.comments.length === 0) return '';
  // NOTE: feed._id is passed to renderComment
  return feed.comments.map(comment => export_renderComment(feed._id, comment)).join('');
}

export function renderComment(feedId, comment) {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = currentUser.id === comment.user?._id;
  const isAdmin = currentUser.role === 'admin';
  const canDelete = isAdmin || isOwner;
  
  const deleteBtn = canDelete 
    ? `<button class="delete-comment-btn" data-feed-id="${feedId}" data-comment-id="${comment._id}" title="Delete Comment">❌</button>`
    : '';

  return `
    <div class="comment" id="comment-${comment._id}">
      <div class="comment-header">
        <img src="${comment.user?.profilePic || './images/default-avatar.png'}" alt="Avatar" class="comment-avatar"/>
        <b class="comment-username">${comment.user?.name || 'Unknown User'}:</b>
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
    : '';

  return `
    <div class="feed-edit-form" id="edit-form-container-${feedId}" data-has-original-image="${hasImage}">
      <form class="editPostForm" data-id="${feedId}">
        <textarea name="text" rows="4" required>${feed.text || ''}</textarea>
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

function timeAgo(dateString) {
  const now = new Date();
  const postDate = new Date(dateString);
  const diff = Math.floor((now - postDate) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Initialize event delegation when module loads
export function initializeUI() {
  console.log('🎯 Initializing UI event delegation...');
  setupEventDelegation();
}