// utils/tokenBlacklist.js

// Simple in-memory blacklist (resets when server restarts)
const blacklistedTokens = new Set();

function addToBlacklist(token) {
  blacklistedTokens.add(token);
}

function isTokenBlacklisted(token) {
  return blacklistedTokens.has(token);
}

module.exports = {
  addToBlacklist,
  isTokenBlacklisted,
};
