// utils.js - Utility functions (Enhanced & Fixed Version)

/**
 * Get the backend base URL based on environment
 * @returns {string} Backend base URL
 */
function getBackendBaseUrl() {
  // Always use the deployed backend URL
  return 'https://cyon-app.onrender.com';
}

/**
 * Get authentication token from storage
 * Checks multiple locations for backwards compatibility
 * @returns {string|null} Authentication token or null
 */
function getToken() {
  // Priority 1: Check authService if available
  if (window.authService && typeof window.authService.getToken === 'function') {
    const token = window.authService.getToken();
    if (token) {
      console.log('🔐 Token found via authService');
      return token;
    }
  }

  // Priority 2: Check cyon_user_data
  try {
    const userData = localStorage.getItem('cyon_user_data');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.token) {
        console.log('🔐 Token found in cyon_user_data');
        return user.token;
      }
    }
  } catch (error) {
    console.warn('Error parsing cyon_user_data:', error);
  }

  // Priority 3: Check legacy user object
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.token) {
      console.log('🔐 Token found in legacy user object');
      return user.token;
    }
  } catch (error) {
    console.warn('Error parsing legacy user:', error);
  }
  
  // Priority 4: Check separate token storage
  const separateToken = localStorage.getItem('token') || localStorage.getItem('cyon_auth_token');
  if (separateToken) {
    console.log('🔐 Token found in separate storage');
    return separateToken;
  }
  
  console.log('❌ No token found in any location');
  return null;
}

/**
 * Redirect to login page with cleanup
 */
function redirectToLogin() {
  console.warn('🚫 Authentication error detected. Redirecting to login.');
  
  // Clear all auth data
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('cyon_user_data');
  localStorage.removeItem('cyon_auth_token');
  sessionStorage.clear();
  
  // Redirect
  window.location.href = './index.html';
}

/**
 * Get current user data from storage
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
  // Priority 1: Use authService if available
  if (window.authService && typeof window.authService.getCurrentUser === 'function') {
    return window.authService.getCurrentUser();
  }

  // Priority 2: Check cyon_user_data
  try {
    const userData = localStorage.getItem('cyon_user_data');
    if (userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.warn('Error parsing cyon_user_data:', error);
  }

  // Priority 3: Check legacy user storage
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.warn('Error parsing legacy user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
  // Use authService if available
  if (window.authService && typeof window.authService.isAuthenticated === 'function') {
    return window.authService.isAuthenticated();
  }

  // Fallback: Check token manually
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    console.warn('Invalid token format:', error);
    return false;
  }
}

/**
 * Format time ago string
 * @param {string|Date} dateString - Date to format
 * @returns {string} Time ago string
 */
function timeAgo(dateString) {
  const now = new Date();
  const postDate = new Date(dateString);
  const diff = Math.floor((now - postDate) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff > 604800) return postDate.toLocaleDateString();
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Safe JSON parse with fallback
 * @param {string} str - String to parse
 * @param {*} fallback - Fallback value
 * @returns {*} Parsed object or fallback
 */
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
  const existingToast = document.querySelector('.app-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3',
    warning: '#ff9800'
  };

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    z-index: 10000;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== ES6 EXPORTS (for modules) =====
export {
  getBackendBaseUrl,
  getToken,
  redirectToLogin,
  getCurrentUser,
  isAuthenticated,
  timeAgo,
  debounce,
  throttle,
  safeJsonParse,
  showToast
};

// ===== GLOBAL EXPOSURE (for regular scripts) =====
// Make functions available globally for backwards compatibility
if (typeof window !== 'undefined') {
  window.utils = {
    getBackendBaseUrl,
    getToken,
    redirectToLogin,
    getCurrentUser,
    isAuthenticated,
    timeAgo,
    debounce,
    throttle,
    safeJsonParse,
    showToast
  };

  // Also expose individual functions
  window.getBackendBaseUrl = getBackendBaseUrl;
  window.getToken = getToken;
  window.redirectToLogin = redirectToLogin;
  window.getCurrentUser = getCurrentUser;
}
