export function getBackendBaseUrl() {
  const hostname = window.location.hostname;
  const port = 5001;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://localhost:${port}`;
  }
  
  // For production/other environments
  return `https://${hostname}:${port}`;
}

/**
 * Retrieves the JWT token from localStorage.
 * @returns {string | null} The token or null.
 */
export function getToken() {
  // Check user object first
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.token) {
    console.log('🔐 Token found in user object');
    return user.token;
  }
  
  // Check separate token storage
  const separateToken = localStorage.getItem('token');
  if (separateToken) {
    console.log('🔐 Token found in separate storage');
    return separateToken;
  }
  
  console.log('❌ No token found in any location');
  return null;
}

/**
 * Clears authentication state and redirects the user to the login page.
 */
export function redirectToLogin() {
  console.warn('Authentication error detected. Redirecting to login.');
  localStorage.removeItem('user');
  window.location.href = './login.html';
}