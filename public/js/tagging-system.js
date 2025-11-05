// ========================================
// @USERNAME TAGGING SYSTEM
// Add this to your ui.js file
// ========================================

// Global variables for tagging
let allUsers = [];
let tagDropdown = null;

// Initialize tagging system (call this in initializeUI)
async function initializeTaggingSystem() {
  console.log('🏷️ Initializing tagging system...');
  
  try {
    // Fetch all users from API
    allUsers = await window.app.fetchUsers();
    console.log(`✅ Loaded ${allUsers.length} users for tagging`);
    
    // Set up tagging for all text inputs
    setupTaggingForElement(document.getElementById('postText'));
    
    // Set up tagging for comment inputs (using delegation)
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('comment-input')) {
        handleTagInput(e.target, e);
      }
    });
    
    // Set up tagging for edit forms (when they're created)
    document.addEventListener('input', (e) => {
      if (e.target.name === 'text' && e.target.closest('.editPostForm')) {
        handleTagInput(e.target, e);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize tagging system:', error);
  }
}

// Setup tagging for a specific element
function setupTaggingForElement(element) {
  if (!element) return;
  
  element.addEventListener('input', (e) => {
    handleTagInput(element, e);
  });
  
  element.addEventListener('keydown', (e) => {
    if (tagDropdown && tagDropdown.style.display === 'block') {
      handleTagKeyboard(e);
    }
  });
}

// Handle text input for @ mentions
function handleTagInput(inputElement, event) {
  const text = inputElement.value;
  const cursorPos = inputElement.selectionStart;
  
  // Find @ symbol before cursor
  const textBeforeCursor = text.substring(0, cursorPos);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  
  if (lastAtIndex === -1) {
    hideTagDropdown();
    return;
  }
  
  // Get text after @ symbol
  const searchText = textBeforeCursor.substring(lastAtIndex + 1);
  
  // Check if there's a space after @ (means we're not tagging anymore)
  if (searchText.includes(' ')) {
    hideTagDropdown();
    return;
  }
  
  // Filter users based on search text
  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(searchText.toLowerCase())
  );
  
  if (filteredUsers.length > 0) {
    showTagDropdown(inputElement, filteredUsers, lastAtIndex);
  } else {
    hideTagDropdown();
  }
}

// Show dropdown with user suggestions
function showTagDropdown(inputElement, users, atIndex) {
  if (!tagDropdown) {
    tagDropdown = document.createElement('div');
    tagDropdown.className = 'tag-dropdown';
    tagDropdown.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      min-width: 200px;
    `;
    document.body.appendChild(tagDropdown);
  }
  
  // Position dropdown below input
  const rect = inputElement.getBoundingClientRect();
  tagDropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
  tagDropdown.style.left = (rect.left + window.scrollX) + 'px';
  tagDropdown.style.display = 'block';
  
  // Populate dropdown
  tagDropdown.innerHTML = users.slice(0, 10).map((user, index) => `
    <div class="tag-option" data-user-id="${user._id}" data-username="${user.name}" data-index="${index}" style="
      padding: 10px 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s;
    " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
      <img src="${user.profilePic || './images/default-avatar.png'}" 
           alt="${user.name}" 
           style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
      <div>
        <div style="font-weight: 500; color: #333;">${user.name}</div>
        <div style="font-size: 0.85em; color: #666;">${user.church || ''}</div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  tagDropdown.querySelectorAll('.tag-option').forEach(option => {
    option.addEventListener('click', () => {
      insertTag(inputElement, option.dataset.username, atIndex);
    });
  });
  
  // Store reference to input for keyboard navigation
  tagDropdown._inputElement = inputElement;
  tagDropdown._atIndex = atIndex;
  tagDropdown._selectedIndex = 0;
  
  // Highlight first option
  highlightOption(0);
}

// Hide dropdown
function hideTagDropdown() {
  if (tagDropdown) {
    tagDropdown.style.display = 'none';
    tagDropdown._selectedIndex = 0;
  }
}

// Handle keyboard navigation in dropdown
function handleTagKeyboard(event) {
  if (!tagDropdown || tagDropdown.style.display === 'none') return;
  
  const options = tagDropdown.querySelectorAll('.tag-option');
  const currentIndex = tagDropdown._selectedIndex || 0;
  
  switch(event.key) {
    case 'ArrowDown':
      event.preventDefault();
      tagDropdown._selectedIndex = Math.min(currentIndex + 1, options.length - 1);
      highlightOption(tagDropdown._selectedIndex);
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      tagDropdown._selectedIndex = Math.max(currentIndex - 1, 0);
      highlightOption(tagDropdown._selectedIndex);
      break;
      
    case 'Enter':
      event.preventDefault();
      const selectedOption = options[tagDropdown._selectedIndex];
      if (selectedOption) {
        insertTag(
          tagDropdown._inputElement, 
          selectedOption.dataset.username,
          tagDropdown._atIndex
        );
      }
      break;
      
    case 'Escape':
      event.preventDefault();
      hideTagDropdown();
      break;
  }
}

// Highlight selected option
function highlightOption(index) {
  const options = tagDropdown.querySelectorAll('.tag-option');
  options.forEach((opt, i) => {
    if (i === index) {
      opt.style.background = '#e3f2fd';
    } else {
      opt.style.background = 'white';
    }
  });
  
  // Scroll into view
  options[index]?.scrollIntoView({ block: 'nearest' });
}

// Insert tag into input
function insertTag(inputElement, username, atIndex) {
  const text = inputElement.value;
  const cursorPos = inputElement.selectionStart;
  const textBeforeCursor = text.substring(0, cursorPos);
  const textAfterCursor = text.substring(cursorPos);
  
  // Find the @ symbol position
  const searchText = textBeforeCursor.substring(atIndex + 1);
  
  // Replace @searchText with @username
  const newText = text.substring(0, atIndex) + `@${username} ` + textAfterCursor;
  inputElement.value = newText;
  
  // Set cursor after the inserted tag
  const newCursorPos = atIndex + username.length + 2; // +2 for @ and space
  inputElement.setSelectionRange(newCursorPos, newCursorPos);
  
  // Hide dropdown
  hideTagDropdown();
  
  // Focus back on input
  inputElement.focus();
}

// Convert @mentions to clickable links in displayed text
function renderTextWithTags(text) {
  if (!text) return '';
  
  // Match @username patterns
  const mentionRegex = /@(\w+)/g;
  
  return text.replace(mentionRegex, (match, username) => {
    return `<span class="mention-tag" style="
      color: #1976d2;
      background: #e3f2fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
    " onclick="window.handleMentionClick('${username}')" title="@${username}">@${username}</span>`;
  });
}

// Handle click on mention
window.handleMentionClick = function(username) {
  console.log('👤 Mention clicked:', username);
  // You can implement user profile view here
  alert(`View profile for @${username}`);
};

// Export functions
window.taggingSystem = {
  initializeTaggingSystem,
  setupTaggingForElement,
  renderTextWithTags
};

console.log('✅ Tagging system loaded');