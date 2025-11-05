// auth.js - Authentication form handlers and page protection

const backendBaseUrl = (function() {
  const hostname = window.location.hostname;
  return (hostname === "localhost" || hostname === "127.0.0.1")
    ? "http://localhost:5001"
    : `${window.location.protocol}//${window.location.hostname}:5001`;
})();

// ===== Enhanced Logout Function =====
function logout() {
  console.log('🚪 Performing logout...');
  
  // Use authService if available
  if (window.authService && typeof window.authService.logout === 'function') {
    window.authService.logout();
    return;
  }
  
  // Fallback: Manual logout
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'welcome.html?logout=success';
}

// ===== Check Authentication Status =====
function isAuthenticated() {
  // Use authService if available
  if (window.authService && typeof window.authService.isAuthenticated === 'function') {
    return window.authService.isAuthenticated();
  }

  // Fallback: Manual check
  const userData = localStorage.getItem('user') || localStorage.getItem('cyon_user_data');
  if (!userData) return false;
  
  try {
    const user = JSON.parse(userData);
    const token = user.token;
    
    if (!token) return false;

    // Validate token expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (err) {
    localStorage.removeItem('user');
    localStorage.removeItem('cyon_user_data');
    return false;
  }
}

// ===== Get Current User =====
function getCurrentUser() {
  // Use authService if available
  if (window.authService && typeof window.authService.getCurrentUser === 'function') {
    return window.authService.getCurrentUser();
  }

  // Fallback: Manual retrieval
  const userData = localStorage.getItem('user') || localStorage.getItem('cyon_user_data');
  return userData ? JSON.parse(userData) : null;
}

// ===== Register Form Handler =====
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      gender: document.getElementById("gender").value,
      church: document.getElementById("church").value,
      dob: document.getElementById("dob").value,
      profilePic: document.getElementById("profilePic").value || undefined,
    };

    const msgDiv = document.getElementById("registerMessage");
    const registerBtn = document.getElementById("registerBtn");
    
    msgDiv.textContent = "Creating your account...";
    msgDiv.style.color = "gray";
    
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = "Creating Account...";
    }

    try {
      // Use authService if available
      if (window.authService && typeof window.authService.register === 'function') {
        const result = await window.authService.register(formData);
        
        if (!result.success) {
          throw new Error(result.error || "Registration failed");
        }
        
        msgDiv.style.color = "green";
        msgDiv.textContent = "Registration successful! Redirecting to login...";
        setTimeout(() => (window.location.href = "login.html"), 1500);
      } else {
        // Fallback: Direct API call
        const res = await fetch(`${backendBaseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.msg || "Registration failed");
        
        msgDiv.style.color = "green";
        msgDiv.textContent = "Registration successful! Redirecting to login...";
        setTimeout(() => (window.location.href = "login.html"), 1500);
      }
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = err.message;
      
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = "Register";
      }
    }
  });
}

// ===== Login Form Handler =====
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    
    const msgDiv = document.getElementById("loginMessage");
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    
    msgDiv.textContent = "Logging in...";
    msgDiv.style.color = "gray";
    
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    try {
      console.log('🔐 Attempting login for:', email);
      
      // Use authService if available
      if (window.authService && typeof window.authService.login === 'function') {
        const result = await window.authService.login(email, password);
        
        if (!result.success) {
          throw new Error(result.error || "Login failed");
        }
        
        console.log('✅ Login successful via authService');
        msgDiv.style.color = "green";
        msgDiv.textContent = "Login successful! Redirecting...";
        
        setTimeout(() => {
          // Force hard refresh to clear all cached data
          window.location.replace("feeds.html");
          window.location.reload(true);
        }, 500);
      } else {
        // Fallback: Direct API call
        const res = await fetch(`${backendBaseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await res.json();
        console.log('📡 Login response:', data);

        if (!res.ok) {
          throw new Error(data.msg || `Login failed with status: ${res.status}`);
        }

        if (data.token && data.user) {
          console.log('✅ Login successful, saving user data...');
          
          const userWithToken = { 
            ...data.user, 
            token: data.token
          }; 
          
          localStorage.setItem("user", JSON.stringify(userWithToken));

          msgDiv.style.color = "green";
          msgDiv.textContent = "Login successful! Redirecting...";
          
          setTimeout(() => {
            window.location.href = "feeds.html";
          }, 500);
        } else {
          throw new Error("No authentication token or user data received");
        }
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      msgDiv.style.color = "red";
      msgDiv.textContent = err.message;
      
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
}

// ===== Auto-redirect if already authenticated =====
if (window.location.pathname.includes('login.html') || 
    window.location.pathname.includes('register.html')) {
  if (isAuthenticated()) {
    const user = getCurrentUser();
    console.log('🔄 User already authenticated, redirecting:', user?.email);
    setTimeout(() => {
      window.location.href = "feeds.html";
    }, 100);
  }
}

// ===== Protect feed pages =====
if (window.location.pathname.includes('feeds.html')) {
  if (!isAuthenticated()) {
    console.log('🚫 Not authenticated, redirecting to welcome page');
    setTimeout(() => {
      window.location.href = "welcome.html";
    }, 100);
  } else {
    const user = getCurrentUser();
    console.log('🔐 User authenticated:', user?.name, user?.email, user?.role);
  }
}

// ===== Make functions available globally =====
window.auth = {
  logout,
  isAuthenticated,
  getCurrentUser
};

window.logout = logout;

// ===== Debug function =====
window.debugUser = function() {
  const user = getCurrentUser();
  console.log('👤 Current User Debug:', user);
  console.log('🔐 Is Authenticated:', isAuthenticated());
  console.log('💾 Storage Keys:', Object.keys(localStorage));
  return user;
};