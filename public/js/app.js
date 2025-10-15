// app.js - API functions with automatic backend URL detection

// Detect backend base URL automatically (works for local dev and production)
const backendBaseUrl =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5001"
    : window.location.origin;

const API_FEEDS = `${backendBaseUrl}/api/feeds`;

// Fetch feeds
export async function fetchFeeds(page = 1) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_FEEDS}?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Handle expired/invalid token
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return [];
    }

    if (!res.ok) throw new Error(`Failed to fetch feeds: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching feeds:", err);
    return [];
  }
}

// Like feed
export async function likeFeed(id) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_FEEDS}/${id}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

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
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_FEEDS}/${id}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

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

// Create a new feed (text + optional image)
export async function createFeed(formData) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in before posting.");
      window.location.href = "login.html";
      return;
    }

    const res = await fetch(`${API_FEEDS}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData, // FormData handles image upload automatically
    });
 
    // Handle expired/invalid token
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to create post: ${msg}`);
    }

    return await res.json();

  } catch (err) {
    console.error("Error creating feed:", err);
    return null;
  }
}