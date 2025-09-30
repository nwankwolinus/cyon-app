import { fetchFeeds } from "./api.js";
import { renderFeeds } from "./ui.js";

// main.js
document.addEventListener("DOMContentLoaded", async () => {
  const homeBtn = document.getElementById("showFeedsBtn");

  // load feeds on page load
  loadFeeds();

  // load feeds when home/feed button is clicked
  homeBtn.addEventListener("click", () => {
    loadFeeds();
  });

  cons loadFeeds = async (page = 1) => {
    try {
      const feeds = await fetchFeeds(page);
      renderFeeds(feeds);
    } catch (err) {
      console.error(err);
    }
  }
});
