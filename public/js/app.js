// app.js - API functions (ES6 Module Version)

import { getBackendBaseUrl, getToken } from './utils.js';

const backendBaseUrl = getBackendBaseUrl();
const API_FEEDS = `${backendBaseUrl}/api/feeds`;

// Helper function to handle API responses
async function handleApiResponse(response, operation) {
  if (!response) {
    console.error(`❌ ${operation}: No response (likely auth issue)`);
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No error details');
    console.error(`❌ ${operation} failed: ${response.status} - ${errorText}`);
    throw new Error(`${operation} failed: ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    console.log(`✅ ${operation} successful (no content)`);
    return { success: true };
  }
}

// Fetch feeds
export async function fetchFeeds(page = 1) {
  try {
    console.log('📥 Fetching feeds, page:', page);
    
    if (window.authService) {
      const response = await window.authService.authenticatedFetch(`${API_FEEDS}?page=${page}`);
      return await handleApiResponse(response, 'Fetch feeds');
    } else {
      const token = getToken();
      const response = await fetch(`${API_FEEDS}?page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return await handleApiResponse(response, 'Fetch feeds');
    }
  } catch (err) {
    console.error("Error fetching feeds:", err);
    return [];
  }
}

// Fetch a single feed by ID
export async function fetchFeedById(feedId) {
  try {
    console.log('📥 Fetching feed:', feedId);
    
    if (window.authService) {
      const response = await window.authService.authenticatedFetch(`${API_FEEDS}/${feedId}`);
      return await handleApiResponse(response, `Fetch feed ${feedId}`);
    } else {
      const token = getToken();
      const response = await fetch(`${API_FEEDS}/${feedId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return await handleApiResponse(response, `Fetch feed ${feedId}`);
    }
  } catch (err) {
    console.error("Error fetching single feed:", err);
    return null;
  }
}

// Like feed
export async function likeFeed(id) {
  try {
    console.log('👍 Liking feed:', id);
    
    if (window.authService) {
      const response = await window.authService.authenticatedFetch(`${API_FEEDS}/${id}/like`, {
        method: "POST"
      });
      return await handleApiResponse(response, `Like feed ${id}`);
    } else {
      const token = getToken();
      const response = await fetch(`${API_FEEDS}/${id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return await handleApiResponse(response, `Like feed ${id}`);
    }
  } catch (err) {
    console.error("Error liking feed:", err);
    return null;
  }
}

// Comment on feed
export async function commentOnFeed(id, text) {
  try {
    console.log('💬 Commenting on feed:', id);
    
    if (window.authService) {
      const response = await window.authService.authenticatedFetch(`${API_FEEDS}/${id}/comment`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return await handleApiResponse(response, `Comment on feed ${id}`);
    } else {
      const token = getToken();
      const response = await fetch(`${API_FEEDS}/${id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      return await handleApiResponse(response, `Comment on feed ${id}`);
    }
  } catch (err) {
    console.error("Error commenting on feed:", err);
    throw err;
  }
}

// Create a new feed (text + optional image)
export async function createFeed(formData) {
  console.log('🔄 createFeed function STARTED');

  try {
    console.log('🎯 Making request to:', API_FEEDS);

    let response;
    if (window.authService) {
      response = await window.authService.authenticatedFetch(`${API_FEEDS}`, {
        method: "POST",
        body: formData,
      });
    } else {
      const token = getToken();
      response = await fetch(`${API_FEEDS}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    }

    console.log('📨 Response received:', {
      status: response?.status,
      statusText: response?.statusText,
      ok: response?.ok
    });

    if (!response) {
      console.error('❌ No response - authentication issue');
      return { success: false, error: "Authentication failed", shouldRedirect: true };
    }

    if (!response.ok) {
      console.error('🚨 Response not OK');
      const msg = await response.text().catch(() => "Server did not provide detailed error");
      console.error('📝 Error response body:', msg);
      return { success: false, error: `Failed to create post: ${msg}`, shouldRedirect: false };
    }
    
    console.log('✅ Response OK, parsing JSON...');
    const result = await response.json();
    console.log('🎉 createFeed SUCCESS - Result:', result);
    return { success: true, data: result };

  } catch (err) {
    console.error("💥 createFeed COMPLETE FAILURE:", err);
    return { success: false, error: err.message, shouldRedirect: false };
  }
}

// Delete feed
export async function deleteFeed(feedId) {
  try {
    console.log('🗑️ Starting delete for feed:', feedId);
    
    let response;
    if (window.authService) {
      response = await window.authService.authenticatedFetch(`${API_FEEDS}/${feedId}`, {
        method: "DELETE"
      });
    } else {
      const token = getToken();
      response = await fetch(`${API_FEEDS}/${feedId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    }

    console.log('📨 Response status:', response?.status);
    
    if (!response) {
      console.error('❌ No response - authentication issue');
      return false;
    }

    const result = await handleApiResponse(response, `Delete feed ${feedId}`);
    return result !== null;

  } catch (err) {
    console.error("❌ Error in deleteFeed:", err);
    return false;
  }
}

// Delete a comment
export async function deleteComment(feedId, commentId) {
  try {
    console.log('🗑️ Deleting comment:', commentId, 'from feed:', feedId);
    
    let response;
    if (window.authService) {
      response = await window.authService.authenticatedFetch(
        `${API_FEEDS}/${feedId}/comment/${commentId}`, 
        { method: "DELETE" }
      );
    } else {
      const token = getToken();
      response = await fetch(`${API_FEEDS}/${feedId}/comment/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    }
    
    return await handleApiResponse(response, `Delete comment ${commentId}`);
  } catch (err) {
    console.error("Error deleting comment:", err);
    return null;
  }
}

// Update a feed
export async function updateFeed(feedId, formData) {
  try {
    console.log('✏️ updateFeed called for:', feedId);
    console.log('📦 FormData contents:');
    
    // Log FormData contents (for debugging)
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    let response;
    if (window.authService) {
      console.log('🔐 Using authService for update...');
      response = await window.authService.authenticatedFetch(`${API_FEEDS}/${feedId}`, {
        method: "PUT",
        body: formData,
      });
    } else {
      console.log('🔐 Using manual token for update...');
      const token = getToken();
      response = await fetch(`${API_FEEDS}/${feedId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    }

    console.log('📡 Update response:', {
      status: response?.status,
      statusText: response?.statusText,
      ok: response?.ok
    });

    if (!response) {
      console.error('❌ No response - authentication issue');
      throw new Error('Authentication failed - please log in again');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update failed:', response.status, errorText);
      throw new Error(`Update failed (${response.status}): ${errorText}`);
    }

    const result = await handleApiResponse(response, `Update feed ${feedId}`);
    console.log('✅ Update successful:', result);
    return result;
    
  } catch (error) {
    console.error("💥 updateFeed error:", error);
    throw error; // Re-throw so caller can handle it
  }
}

// Toggle pin feed
export async function togglePinFeed(feedId) {
  try {
    console.log('📌 Toggling pin for feed:', feedId);

    const url = `${API_FEEDS}/${feedId}/toggle-pin`;
    console.log('🎯 Making pin request to:', url);

    let response;
    if (window.authService) {
      response = await window.authService.authenticatedFetch(url, {
        method: 'PATCH'
      });
    } else {
      const token = getToken();
      response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('📡 Pin response:', {
      url: url,
      status: response?.status,
      statusText: response?.statusText,
      ok: response?.ok
    });

    if (!response) {
      console.error('❌ No response - authentication issue');
      throw new Error('Authentication failed');
    }

    return await handleApiResponse(response, `Toggle pin ${feedId}`);
        
  } catch (error) {
    console.error('❌ Pin toggle failed:', error);
    throw error;
  }
}

// Fetch users
export async function fetchUsers() {
  try {
    console.log('👥 Fetching users');
    
    let response;
    if (window.authService) {
      response = await window.authService.authenticatedFetch(`${backendBaseUrl}/api/users`);
    } else {
      const token = getToken();
      response = await fetch(`${backendBaseUrl}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!response) {
      console.error('❌ No response - authentication issue');
      return [];
    }

    if (response.ok) {
      return await response.json();
    }
    
    console.warn('⚠️ Fetch users failed:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Health check (no auth required)
export async function healthCheck() {
  try {
    const response = await fetch(`${backendBaseUrl}/api/health`);
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    return { status: 'error', message: error.message };
  }
}

// Also expose via window for backward compatibility with non-module scripts
if (typeof window !== 'undefined') {
  window.app = {
    fetchFeeds,
    fetchFeedById,
    likeFeed,
    commentOnFeed,
    createFeed,
    deleteFeed,
    deleteComment,
    updateFeed,
    togglePinFeed,
    fetchUsers,
    healthCheck
  };
}