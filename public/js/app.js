// app.js - API functions using shared utilities
import { getBackendBaseUrl, redirectToLogin, getToken } from './utils.js';

// Get base URL from shared utility
const backendBaseUrl = getBackendBaseUrl();
const API_FEEDS = `${backendBaseUrl}/api/feeds`;

// Fetch feeds
export async function fetchFeeds(page = 1) {
  try {
    const token = getToken();
    const res = await fetch(`${API_FEEDS}?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      redirectToLogin();
      return [];
    }

    if (!res.ok) throw new Error(`Failed to fetch feeds: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching feeds:", err);
    return [];
  }
}

// Fetch a single feed by ID
export async function fetchFeedById(feedId) {
  try {
    const token = getToken();
    const res = await fetch(`${API_FEEDS}/${feedId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) throw new Error(`Failed to fetch feed ${feedId}: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching single feed:", err);
    return null;
  }
}

// Like feed
export async function likeFeed(id) {
  try {
    const token = getToken();
    const res = await fetch(`${API_FEEDS}/${id}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }
    
    if (!res.ok) throw new Error("Failed to like post");
    return await res.json();
  } catch (err) {
    console.error("Error liking feed:", err);
    return null;
  }
}

// Comment on feed
export async function commentOnFeed(id, text) {
  try {
    const token = getToken();
    const res = await fetch(`${API_FEEDS}/${id}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to post comment: ${res.status} - ${errorText}`);
    } 

    return await res.json();
  } catch (err) {
    console.error("Error commenting on feed:", err);
    throw err;
  }
}

// Create a new feed (text + optional image) - FIXED VERSION
export async function createFeed(formData) {
  console.log('🔄 createFeed function STARTED');

  try {
    const token = getToken();

    if (!token) {
      console.error('❌ No token found');
      return { success: false, error: "No authentication token", shouldRedirect: true };
    }

    console.log('🎯 Making request to:', API_FEEDS);

    const response = await fetch(`${API_FEEDS}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log('📨 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
 
    if (response.status === 401) {
      console.error('❌ 401 Unauthorized');
      return { success: false, error: "Session expired", shouldRedirect: true };
    }

    if (!response.ok) {
      console.error('🚨 Response not OK');
      const msg = await response.text().catch(() => "Server did not provide detailed error");
      console.error('📝 Error response body:', msg);
      return { success: false, error: `Failed to create post: ${msg}`, shouldRedirect: false }; // ✅ RETURN
    }
    
    console.log('✅ Response OK, parsing JSON...');
    const result = await response.json();
    console.log('🎉 createFeed SUCCESS - Result:', result);
    return { success: true, data: result }; // ✅ RETURN

  } catch (err) {
    console.error("💥 createFeed COMPLETE FAILURE:", err);
    return { success: false, error: err.message, shouldRedirect: false }; // ✅ RETURN
  }
}

// Delete feed
export async function deleteFeed(feedId) {
  try {
    const token = getToken(); // ✅ FIXED: Use getToken() instead of localStorage
    console.log('🔄 Starting delete for feed:', feedId);
    
    const response = await fetch(`${API_FEEDS}/${feedId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log('📨 Response status:', response.status);
    
    if (response.ok) {
      try {
        const result = await response.json();
        console.log('✅ Delete successful:', result);
        return true; 
      } catch (e) {
        console.log('✅ Delete successful (no content)');
        return true;
      }
    } else {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error('🚨 Server error:', errorText);
      throw new Error(`Failed to delete post: ${response.status} - ${errorText}`);
    }
    
  } catch (err) {
    console.error("❌ Error in deleteFeed:", err);
    return false;
  }
}

// Delete a comment
export async function deleteComment(feedId, commentId) {
  try {
    const token = getToken();
    const res = await fetch(`${API_FEEDS}/${feedId}/comment/${commentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) throw new Error("Failed to delete comment");
    return await res.json();
  } catch (err) {
    console.error("Error deleting comment:", err);
    return null;
  }
}

// Update a feed
export async function updateFeed(feedId, formData) {
  try {
    const token = getToken();
    const response = await fetch(`${API_FEEDS}/${feedId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Server returned error without details");
      throw new Error(`Failed to update feed: ${response.status} - ${errorText}`);
    }

    return await response.json(); 
    
  } catch (error) {
    console.error("API Error updating feed:", error);
    return null;
  }
}

// In app.js - Updated togglePinFeed function
export async function togglePinFeed(feedId) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Please log in to pin posts');
        }

        const url = `${API_FEEDS}/${feedId}/toggle-pin`;
        console.log('🎯 Making pin request to:', url);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Pin response:', {
            url: url,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details');
            console.error('🚨 Server error:', errorText);
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Pin toggle successful:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Pin toggle failed:', error);
        throw error;
    }
}

// 🟢 ADD THIS HELPER FUNCTION to implement the backend endpoint)
export async function fetchUsers() {
    try {
        const token = getToken();
        const response = await fetch(`${getBackendBaseUrl()}/api/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}
