// auth.js - Authentication functions with automatic backend URL detection

// Note: Standardized to include port 5001 for consistency across environments.
const backendBaseUrl =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5001"
    : `${window.location.protocol}//${window.location.hostname}:5001`;

// === Register ===
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const gender = document.getElementById("gender").value;
    const church = document.getElementById("church").value;
    const dob = document.getElementById("dob").value;
    const profilePic = document.getElementById("profilePic").value;

    const msgDiv = document.getElementById("registerMessage");
    msgDiv.textContent = "Registering...";
    msgDiv.style.color = "gray";

    try {
      const res = await fetch(`${backendBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, gender, church, dob, profilePic }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Registration failed");
      
      msgDiv.style.color = "green";
      msgDiv.textContent = "Registration successful! Redirecting to login...";
      setTimeout(() => (window.location.href = "login.html"), 1500);
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = err.message;
    }
  });
}

// === Login ===
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const msgDiv = document.getElementById("loginMessage");
    msgDiv.textContent = "Logging in...";
    msgDiv.style.color = "gray";

    try {
      const res = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Login failed");

      if (data.token) {
        try {
          const tokenParts = data.token.split('.');
          if (tokenParts.length !== 3) throw new Error("Token format invalid.");
          
          const payload = JSON.parse(atob(tokenParts[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          
          if (!isExpired) {
            // CRITICAL FIX: Save the entire user object INCLUDING the token under the 'user' key.
            // This aligns with the expected structure of utils.js's getToken().
            const userWithToken = { ...data.user, token: data.token }; 
            localStorage.setItem("user", JSON.stringify(userWithToken));

            msgDiv.style.color = "green";
            msgDiv.textContent = "Login successful! Redirecting...";
            setTimeout(() => (window.location.href = "feeds.html"), 1500);
          } else {
            throw new Error("Login token has expired");
          }
        } catch (tokenErr) {
          msgDiv.style.color = "red";
          msgDiv.textContent = "Invalid authentication token received";
          console.error("Token error:", tokenErr);
        }
      } else {
        throw new Error("No authentication token received");
      }
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = err.message;
    }
  });
}

// === Logout Function ===
function logout() {
  // CRITICAL FIX: Only remove the single 'user' key
  localStorage.removeItem("user"); 
  window.location.href = "login.html";
}

// === Check Authentication Status ===
function isAuthenticated() {
  const userData = localStorage.getItem("user");
  if (!userData) return false;
  
  const user = JSON.parse(userData);
  const token = user.token; // Check the token nested inside the 'user' object
  if (!token) return false;

  try {
    // Validate token expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if the token is not expired
    return payload.exp * 1000 > Date.now();
  } catch (err) {
    // If token is invalid, remove it and return false
    localStorage.removeItem("user"); 
    return false;
  }
}

// === Get Current User ===
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// === Auto-redirect if already authenticated (CRITICAL: MUST check single 'user' key) ===
if (window.location.pathname.includes('login.html') || 
    window.location.pathname.includes('register.html')) {
  if (isAuthenticated()) {
    window.location.href = "feeds.html";
  }
}

// === Protect feed pages (CRITICAL: MUST check single 'user' key) ===
if (window.location.pathname.includes('feeds.html')) {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
  }
}

// Make functions available globally for other scripts
window.auth = {
  logout,
  isAuthenticated,
  getCurrentUser
};
