// ui.js
function renderFeeds(feeds) {
  const container = document.getElementById("feedContainer");
  container.innerHTML = ""; // clear before rendering

  feeds.forEach(feed => {
    const card = document.createElement("div");
    card.className = "feed-card";

    card.innerHTML = `
      <div class="feed-header">
        <img src="${feed.user.profilePic || '/images/default-avatar.png'}" 
             alt="User Avatar" class="avatar" />
        <div>
          <h4 class="username">${feed.user.name}</h4>
          <span class="churchAttend">${feed.user.church}</span>
          <span class="timestamp">${timeAgo(feed.createdAt)}</span>
        </div>
      </div>
      <p>${feed.text || ''}</p>
      <div class="feed-actions">
        <button>👍 Like</button>
        <button>💬 Comment</button>
        <button>↗ Share</button>
      </div>
      <div class="feed-stats">
        👍 ${feed.likeCount} Likes · 💬 ${feed.commentCount} Comments
      </div>
    `;

    container.appendChild(card);
  });
}
