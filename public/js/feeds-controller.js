// feeds-controller.js - Main Feed Application Controller (ES6 Module)
// This consolidates the functionality from nav.js and feeds.js

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
  initializeUI
} from "./ui.js";

import { getBackendBaseUrl, getToken, redirectToLogin } from './utils.js';

// ==========================================================
// INITIALIZATION & SOCKET SETUP
// ==========================================================

class FeedsController {
  constructor() {
    this.socket = null;
    this.postForm = null;
    this.postText = null;
    this.postImage = null;
    this.preview = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      console.warn('⚠️ FeedsController already initialized');
      return;
    }

    console.log('🚀 Initializing FeedsController...');

    // Check authentication
    const token = getToken();
    if (!token) {
      console.error('❌ No authentication token found');
      redirectToLogin();
      return;
    }

    // Initialize Socket.IO
    this.initializeSocket(token);

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeDOM());
    } else {
      await this.initializeDOM();
    }

    this.initialized = true;
    console.log('✅ FeedsController initialized successfully');
  }

  initializeSocket(token) {
    console.log('🔌 Initializing Socket.IO connection...');

    this.socket = io(getBackendBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    // Connection handlers
    this.socket.on("connect", () => {
      console.log('✅ Socket.IO connected:', this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log('🔴 Socket.IO disconnected:', reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error('💥 Socket reconnection failed');
    });

    // Feed event handlers
    this.socket.on("newFeed", (feed) => {
      console.log("⚡ New feed received:", feed._id);
      renderSingleFeed(feed);
    });

    this.socket.on("feedUpdated", (feed) => {
      console.log("⚡ Feed updated:", feed._id);
      const existingElement = document.getElementById(`feed-${feed._id}`);
      
      if (existingElement && existingElement.dataset.editing === 'true') {
        console.log('⏭️ Skipping update - feed is being edited');
        return;
      }
      
      renderSingleFeed(feed);
    });

    this.socket.on("feedDeleted", (feedId) => {
      console.log("⚡ Feed deleted:", feedId);
      const feedElement = document.getElementById(`feed-${feedId}`);
      if (feedElement) {
        feedElement.style.opacity = '0';
        feedElement.style.transform = 'scale(0.8)';
        feedElement.style.transition = 'all 0.3s ease';
        setTimeout(() => feedElement.remove(), 300);
      }
    });

    this.socket.on("feedLiked", ({ feedId, likeCount }) => {
      console.log("⚡ Feed liked:", feedId, "Count:", likeCount);
      const stats = document.querySelector(`#feed-${feedId} .feed-stats`);
      if (stats) {
        const text = stats.textContent;
        const newText = text.replace(/👍\s*\d+/, `👍 ${likeCount}`);
        stats.textContent = newText;
      }
    });

    // Comment handlers
    this.socket.on("newComment", ({ feedId, comment }) => {
      console.log("⚡ New comment received:", feedId, comment._id);
      
      const commentsList = document.querySelector(`#comments-${feedId} .comments-list`);
      if (commentsList) {
        // Import renderComment from ui.js
        import('./ui.js').then(({ renderComment, updateCommentCount }) => {
          commentsList.insertAdjacentHTML('beforeend', renderComment(feedId, comment));
          updateCommentCount(feedId, 1);
          
          const commentsSection = document.getElementById(`comments-${feedId}`);
          if (commentsSection && commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
          }
        });
      }
    });

    this.socket.on("commentDeleted", ({ feedId, commentId }) => {
      console.log("⚡ Comment deleted:", feedId, commentId);
      const commentElement = document.getElementById(`comment-${commentId}`);
      if (commentElement) {
        commentElement.remove();
        import('./ui.js').then(({ updateCommentCount }) => {
          updateCommentCount(feedId, -1);
        });
      }
    });

    // Pin handlers
    this.socket.on("feedPinned", (pinnedFeed) => {
      console.log("📌 Feed pinned:", pinnedFeed._id);
      this.updatePinnedFeedInUI(pinnedFeed);
    });

    this.socket.on("feedUnpinned", (unpinnedFeed) => {
      console.log("📌 Feed unpinned:", unpinnedFeed._id);
      this.updatePinnedFeedInUI(unpinnedFeed);
    });
  }

  async updatePinnedFeedInUI(updatedFeed) {
    const feedElement = document.getElementById(`feed-${updatedFeed._id}`);
    
    if (feedElement && feedElement.dataset.editing !== 'true') {
      renderSingleFeed(updatedFeed);
      console.log("✅ Pin status updated in UI");
    } else {
      console.log("🔄 Refreshing feeds for proper pin sorting...");
      setTimeout(async () => {
        const feeds = await fetchFeeds();
        renderFeeds(feeds);
      }, 100);
    }
  }

  async initializeDOM() {
    console.log('🔧 Initializing DOM elements...');
    
    // CRITICAL: Get fresh user data immediately
    const currentUser = window.auth?.getCurrentUser() || 
                       JSON.parse(localStorage.getItem('cyon_user_data') || 
                                 localStorage.getItem('user') || '{}');
    
    console.log('👤 Current user on init:', {
      name: currentUser.name,
      email: currentUser.email,
      id: currentUser.id,
      role: currentUser.role
    });
    
    if (!currentUser || !currentUser.id) {
      console.error('❌ No valid user found on initialization');
      alert('Session error. Please log in again.');
      redirectToLogin();
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get DOM references
    this.postForm = document.getElementById("postForm");
    this.postText = document.getElementById("postText");
    this.postImage = document.getElementById("postImage");
    this.preview = document.getElementById("preview");

    console.log('🔍 DOM Elements:', {
      postForm: !!this.postForm,
      postText: !!this.postText,
      postImage: !!this.postImage,
      preview: !!this.preview,
      feedContainer: !!document.getElementById("feedContainer")
    });

    if (!this.postForm || !document.getElementById("feedContainer")) {
      console.error('❌ CRITICAL: Required DOM elements not found!');
      return;
    }

    // Initialize UI event delegation
    initializeUI();

    // Setup form handlers
    this.setupImagePreview();
    this.setupFormSubmission();
    this.setupNavigation();
    this.setupLogout();

    // Load initial feeds
    await this.loadInitialFeeds();
  }

  setupImagePreview() {
    if (!this.postImage || !this.preview) return;
    
    this.postImage.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.preview.src = reader.result;
          this.preview.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        this.preview.src = "";
        this.preview.style.display = "none";
      }
    });
  }

  setupFormSubmission() {
    if (!this.postForm) return;

    this.postForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const text = this.postText.value.trim();
      const file = this.postImage.files[0];
      const postBtn = this.postForm.querySelector('button[type="submit"]');

      if (!text && !file) {
        alert("Please write something or select an image!");
        return;
      }

      // UI feedback
      const originalBtnText = postBtn ? postBtn.textContent : "Post";
      if (postBtn) {
        postBtn.textContent = "Posting...";
        postBtn.disabled = true;
      }
      this.postText.disabled = true;
      this.postImage.disabled = true;

      const formData = new FormData();
      formData.append("text", text);
      if (file) formData.append("image", file);

      try {
        await createFeed(formData);
        
        // Clear form
        this.postText.value = "";
        this.postImage.value = "";
        this.preview.src = "";
        this.preview.style.display = "none";

      } catch (error) {
        console.error("💥 Post submission error:", error);
        alert("An error occurred: " + (error.message || 'Please try again'));
      } finally {
        // Re-enable UI
        if (postBtn) { 
          postBtn.textContent = originalBtnText;
          postBtn.disabled = false;
        }
        this.postText.disabled = false;
        this.postImage.disabled = false;
      }
    });
  }

  setupNavigation() {
    const showFeedsBtn = document.getElementById("showFeedsBtn");
    const showNotificationsBtn = document.getElementById("showNotificationsBtn");
    const showAttendanceBtn = document.getElementById("showAttendanceBtn");
    const showDashboardBtn = document.getElementById("showDashboardBtn");
    const showDuesBtn = document.getElementById("showDuesBtn");
    const showProfileBtn = document.getElementById("showProfileBtn");

    const sections = {
      feeds: document.getElementById("feedsSection"),
      notifications: document.getElementById("notificationsSection"),
      attendance: document.getElementById("attendanceSection"),
      dashboard: document.getElementById("dashboardSection"),
      dues: document.getElementById("duesSection"),
      profile: document.getElementById("profileSection")
    };

    const hideAllSections = () => {
      Object.values(sections).forEach(section => {
        if (section) section.classList.remove("active");
      });
    };

    const showSection = (sectionName) => {
      hideAllSections();
      if (sections[sectionName]) {
        sections[sectionName].classList.add("active");
      }
    };

    if (showFeedsBtn) {
      showFeedsBtn.addEventListener("click", () => showSection("feeds"));
    }

    if (showNotificationsBtn) {
      showNotificationsBtn.addEventListener("click", () => showSection("notifications"));
    }

    if (showAttendanceBtn) {
      showAttendanceBtn.addEventListener("click", () => showSection("attendance"));
    }

    if (showDashboardBtn) {
      showDashboardBtn.addEventListener("click", () => showSection("dashboard"));
    }

    if (showDuesBtn) {
      showDuesBtn.addEventListener("click", () => showSection("dues"));
    }

    if (showProfileBtn) {
      showProfileBtn.addEventListener("click", () => showSection("profile"));
    }

    // Mobile menu
    this.setupMobileMenu();
  }

  setupMobileMenu() {
    const menuToggleBtn = document.getElementById("hamburger");
    const mobileMenu = document.getElementById("mobileMenu");
    const icon = menuToggleBtn?.querySelector("i");

    if (menuToggleBtn && mobileMenu) {
      menuToggleBtn.addEventListener("click", () => {
        const isOpen = mobileMenu.classList.contains("active");
        if (isOpen) {
          mobileMenu.classList.remove("active");
          if (icon) icon.classList.replace("fa-times", "fa-bars");
          menuToggleBtn.setAttribute("aria-label", "Open menu");
        } else {
          mobileMenu.classList.add("active");
          if (icon) icon.classList.replace("fa-bars", "fa-times");
          menuToggleBtn.setAttribute("aria-label", "Close menu");
        }
      });

      // Close on outside click
      document.addEventListener("click", (e) => {
        if (
          mobileMenu.classList.contains("active") &&
          !mobileMenu.contains(e.target) &&
          !menuToggleBtn.contains(e.target)
        ) {
          mobileMenu.classList.remove("active");
          if (icon) icon.classList.replace("fa-times", "fa-bars");
          menuToggleBtn.setAttribute("aria-label", "Open menu");
        }
      });
    }
  }

  setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    const performLogout = () => {
      console.log('🚪 Logging out...');
      if (window.authService) {
        window.authService.logout();
      } else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'welcome.html?logout=success';
      }
    };

    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          performLogout();
        }
      });
    }

    const mobileLogoutLink = mobileMenu?.querySelector('a[href="#logout"]');
    if (mobileLogoutLink) {
      mobileLogoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          performLogout();
        }
      });
    }
  }

  async loadInitialFeeds() {
    console.log('📥 Loading initial feeds...');
    try {
      const feeds = await fetchFeeds();
      if (feeds) {
        renderFeeds(feeds);
        console.log('✅ Initial feeds loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load initial feeds:', error);
    }
  }
}

// Create and initialize controller
const feedsController = new FeedsController();

// Auto-initialize when module loads
feedsController.init();

// Export for external access
export default feedsController;