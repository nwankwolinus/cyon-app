document.addEventListener("DOMContentLoaded", () => {
  // ====== Mobile Menu ======
  const menuToggleBtn = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  const icon = menuToggleBtn?.querySelector("i");

  if (menuToggleBtn && mobileMenu) {
    menuToggleBtn.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.contains("active");
      if (isOpen) {
        mobileMenu.classList.remove("active");
        icon.classList.replace("fa-times", "fa-bars");
        menuToggleBtn.setAttribute("aria-label", "Open menu");
      } else {
        mobileMenu.classList.add("active");
        icon.classList.replace("fa-bars", "fa-times");
        menuToggleBtn.setAttribute("aria-label", "Close menu");
      }
    });

    document.addEventListener("click", (e) => {
      if (
        mobileMenu.classList.contains("active") &&
        !mobileMenu.contains(e.target) &&
        !menuToggleBtn.contains(e.target)
      ) {
        mobileMenu.classList.remove("active");
        icon.classList.replace("fa-times", "fa-bars");
        menuToggleBtn.setAttribute("aria-label", "Open menu");
      }
    });
  }

  // ====== Feeds (Home) ======
  const feedBtn = document.getElementById("showFeedsBtn");
  const feedContainer = document.getElementById("feedContainer");
  const mobileFeedsLink = mobileMenu?.querySelector("a:first-child"); // first link = Feeds

  // Detect base URL automatically
  const backendBaseUrl =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5001" // local dev
      : window.location.origin; // same server if deployed

  // Function to load feeds
  const loadFeeds = async () => {
    try {
      const res = await fetch(`${backendBaseUrl}/api/feeds`);
      const data = await res.json();

      feedContainer.innerHTML = "";

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((feed) => {
          const div = document.createElement("div");
          div.className = "feed-item";

          const date = new Date(feed.createdAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          // --- Avatar logic: use backend-served default if none ---
          // const avatarSrc = feed.user.profilePic || '/uploads/default-avatar.png';

          div.innerHTML = `
            <div class="feed-header">
              <img src="${feed.user?.profilePic || './images/default-avatar.png'}"
                    alt="User Avatar" class="avatar" />
              <div class="feed-user-info">
                <strong>${feed.user.name}</strong>
                <small>${feed.user.church || ""}</small>
                <div class="feed-date">${date}</div>
              </div>
            </div>

            <div class="feed-body">
              ${feed.text ? `<p>${feed.text}</p>` : ""}
              ${
                feed.image
                  ? `<img src="${feed.image}" class="feed-image" alt="Post image">`
                  : ""
              }
            </div>

            <div class="feed-footer">
              <button class="like-btn" data-id="${feed._id}">
                👍 <span>${feed.likeCount || 0}</span>
              </button>
              <button class="comment-btn" data-id="${feed._id}">
                💬 <span>${feed.commentCount || 0}</span>
              </button>
            </div>
          `;

          feedContainer.appendChild(div);

          // === Like button click handler (only for this feed) ===
          const likeBtn = div.querySelector(".like-btn");
          likeBtn.addEventListener("click", async () => {
            const feedId = likeBtn.getAttribute("data-id");
            try {
              const res = await fetch(`${backendBaseUrl}/api/feeds/${feedId}/like`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + localStorage.getItem("token"), // if JWT stored
                },
              });

              if (!res.ok) throw new Error("Failed to like post");
              const updated = await res.json();

              // update like count on button
              likeBtn.querySelector("span").textContent = updated.likeCount;
            } catch (err) {
              console.error("Like failed:", err);
              alert("Could not like this post");
            }
          });
        });
      } else {
        feedContainer.innerHTML = "<p>No feeds available</p>";
      }
    } catch (err) {
      console.error("Error loading feeds:", err);
      feedContainer.innerHTML = "<p>Failed to load feeds.</p>";
    }
  };

  // ====== Event bindings ======
  // Top nav Feeds button
  if (feedBtn) {
    feedBtn.addEventListener("click", loadFeeds);
  }

  // Mobile Feeds link
  if (mobileFeedsLink) {
    mobileFeedsLink.addEventListener("click", (e) => {
      e.preventDefault(); // stop page reload
      loadFeeds();
      mobileMenu.classList.remove("active"); // close menu after click
      icon.classList.replace("fa-times", "fa-bars");
    });
  }

  // Load feeds immediately (acts as home)
  loadFeeds();
});