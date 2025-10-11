import { fetchFeeds, createFeed, likeFeed, commentOnFeed } from "./app.js";
import { renderFeeds } from "./ui.js";

const socket = io("http://localhost:5001");
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const postForm = document.getElementById("postForm");
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const preview = document.getElementById("preview");
const feedContainer = document.getElementById("feedContainer");

// === Preview selected image ===
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
    preview.style.display = "none";
  }
});

// === Load feeds initially ===
document.addEventListener("DOMContentLoaded", async () => {
  const feeds = await fetchFeeds();
  renderFeeds(feeds);
});

// === Handle post submission (text + optional image) ===
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) {
    alert("Please write something or select an image!");
    return;
  }

  const formData = new FormData();
  formData.append("text", text);
  if (file) formData.append("image", file);

  // Use centralized API function
  const newFeed = await createFeed(formData);
  if (!newFeed) return;

  // Clear input fields
  postText.value = "";
  postImage.value = "";
  preview.style.display = "none";
  
  // Render instantly
  const feedHTML = renderSingleFeed(newFeed);
  feedContainer.insertAdjacentHTML("afterbegin", feedHTML);

  // Notify all connected clients via Socket.IO
  socket.emit("newFeed", newFeed);
});

// To prevent flickering when both fetchFeeds() and the socket event fire close together
let feedsLoaded = false;

async function initFeeds() {
  const feeds = await fetchFeeds();
  renderFeeds(feeds);
  feedsLoaded = true;
}

// === Listen for real-time new feeds ===
socket.on("newFeed", (feed) => {
  renderSingleFeed(feed);
});

initFeeds();

// === Listen for live like updates ===
socket.on("feedLiked", ({ feedId, likeCount }) => {
  const likeBtn = document.querySelector(`button.like-btn[data-id="${feedId}"]`);
  if (likeBtn) {
    const stats = likeBtn.closest(".feed-card")?.querySelector(".feed-stats");
    if (stats) {
      const text = stats.textContent.replace(/👍 \d+/, `👍 ${likeCount}`);
      stats.textContent = text;
    }
  }
});

// === Listen for new comments ===
socket.on("newComment", ({ feedId, comment }) => {
  // Append the new comment in real-time
  const commentsList = document.querySelector(`#comments-${feedId} .comments-list`);
  if (commentsList) {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<b>${comment.user.name}:</b> ${comment.text}`;
    commentsList.appendChild(div);
  }

  // Update the comment count 
  const card = document.querySelector(`button.comment-btn[data-id="${feedId}"]`);
  if (card) {
    const stats = card.closest(".feed-card")?.querySelector(".feed-stats");
    if (stats) {
      // Extract counts safely
      const likeMatch = stats.textContent.match(/👍\s*(\d+)/);
      const commentMatch = stats.textContent.match(/💬\s*(\d+)/);

      const likeCount = likeMatch ? parseInt(likeMatch[1]) : 0;
      const commentCount = commentMatch ? parseInt(commentMatch[1]) + 1 : 1;

      // Update full string consistently
      stats.textContent = `👍 ${likeCount} Likes . 💬 ${commentCount} Comments`;
    }
  }
});

// === Render a single feed (for newFeed event) ===
function renderSingleFeed(feed) {
  const imageHTML = feed.image
    ? `<img src="${feed.image}" alt="Post image" class="feed-image" />`
    : "";

  return `
    <div class="feed-card" id="feed-${feed._id}">
      <div class="feed-header">
        <strong>${feed.user.name}</strong> <small>${feed.user.church}</small>
      </div>
      <div class="feed-body">
        <p>${feed.text || ""}</p>
        ${imageHTML}
      </div>
      <div class="feed-actions">
        <button class="like-btn" data-id="${feed._id}">👍 ${feed.likeCount}</button>
        <span class="feed-stats">💬 ${feed.commentCount}</span>
      </div>
      <div id="comments-${feed._id}">
        <div class="comments-list"></div>
      </div>
    </div>
  `;
}
