// auth-service.js - Professional authentication service (FIXED VERSION)
class AuthService {
  constructor() {
    this.backendBaseUrl = this.getBackendBaseUrl();
    this.tokenKey = "cyon_auth_token";
    this.userKey = "cyon_user_data";
  }

  getBackendBaseUrl() {
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1"
      ? "http://localhost:5001"
      : `${window.location.protocol}//${window.location.hostname}:5001`;
  }

  // ===== TOKEN MANAGEMENT =====
  getToken() {
    try {
      const userData = localStorage.getItem(this.userKey);
      if (userData) {
        const user = JSON.parse(userData);
        return user.token || null;
      }
      return localStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  setToken(token, userData = null) {
    try {
      if (userData) {
        const userWithToken = { ...userData, token };
        localStorage.setItem(this.userKey, JSON.stringify(userWithToken));
      } else {
        localStorage.setItem(this.tokenKey, token);
      }
      return true;
    } catch (error) {
      console.error("Error setting token:", error);
      return false;
    }
  }

  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    // Also clear legacy 'user' and 'token' keys
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();
  }

  // ===== AUTHENTICATION METHODS =====
  async login(email, password) {
    try {
      console.log("🔐 Attempting login for:", email);

      const response = await fetch(`${this.backendBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || `Login failed: ${response.status}`);
      }

      if (!data.token) {
        throw new Error("No authentication token received");
      }

      // Store authentication data
      this.setToken(data.token, data.user);

      console.log("✅ Login successful for:", data.user?.email);
      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.backendBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || `Registration failed: ${response.status}`);
      }

      return {
        success: true,
        message: "Registration successful",
      };
    } catch (error) {
      console.error("❌ Registration error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async logout() {
    try {
      // Call backend logout if needed (for server-side sessions)
      const token = this.getToken();
      if (token) {
        await fetch(`${this.backendBaseUrl}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      this.clearAuth();
      window.location.href = "welcome.html?logout=success";
    }
  }

  // ===== SESSION VALIDATION =====
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Check token expiration
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        this.clearAuth();
        return false;
      }

      return true;
    } catch (error) {
      this.clearAuth();
      return false;
    }
  }

  getCurrentUser() {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const userData = localStorage.getItem(this.userKey);
      if (userData) {
        return JSON.parse(userData);
      }
      
      // Fallback to legacy 'user' key
      const legacyUser = localStorage.getItem('user');
      if (legacyUser) {
        return JSON.parse(legacyUser);
      }
      
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // ===== API REQUEST WITH AUTH =====
  async authenticatedFetch(url, options = {}) {
    const token = this.getToken();

    const headers = {
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (
      !headers["Content-Type"] &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle token expiration - try to refresh first
      if (response.status === 401) {
        console.warn("🔄 Token expired, attempting refresh...");

        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          console.log("✅ Token refreshed, retrying original request...");
          // Retry the original request with new token
          return this.authenticatedFetch(url, options);
        } else {
          console.warn("❌ Token refresh failed, redirecting to login...");
          this.clearAuth();
          if (window.location.pathname.includes("feeds.html")) {
            window.location.href = "welcome.html";
          }
          return null;
        }
      }

      return response;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Enhanced refreshToken method
  async refreshToken() {
    try {
      const token = this.getToken();
      if (!token) {
        console.warn("❌ No token available for refresh");
        return false;
      }

      console.log("🔄 Attempting token refresh...");

      const response = await fetch(`${this.backendBaseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Token refresh successful");

        // Update the token in storage
        this.setToken(data.token, data.user);
        return true;
      } else {
        console.warn("❌ Token refresh failed with status:", response.status);
        return false;
      }
    } catch (error) {
      console.warn("❌ Token refresh network error:", error.message);
      return false;
    }
  }

  // ===== SPECIFIC API METHODS =====
  async apiGet(url) {
    const response = await this.authenticatedFetch(url);
    if (!response) return null;

    if (!response.ok) {
      throw new Error(`GET request failed: ${response.status}`);
    }

    return await response.json();
  }

  async apiPost(url, data = null) {
    const options = {
      method: "POST",
    };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await this.authenticatedFetch(url, options);
    if (!response) return null;

    if (!response.ok) {
      throw new Error(`POST request failed: ${response.status}`);
    }

    return await response.json();
  }

  async apiPut(url, data = null) {
    const options = {
      method: "PUT",
    };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await this.authenticatedFetch(url, options);
    if (!response) return null;

    if (!response.ok) {
      throw new Error(`PUT request failed: ${response.status}`);
    }

    return await response.json();
  }

  async apiPatch(url, data = null) {
    const options = {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    };

    const response = await this.authenticatedFetch(url, options);
    if (!response) return null;

    if (!response.ok) {
      throw new Error(`PATCH request failed: ${response.status}`);
    }

    return await response.json();
  }

  async apiDelete(url) {
    const response = await this.authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response) return null;

    if (!response.ok) {
      throw new Error(`DELETE request failed: ${response.status}`);
    }

    // For DELETE, return success status
    try {
      return await response.json();
    } catch {
      return { success: true };
    }
  }
}

// ✅ FIX: Create singleton instance and expose globally WITHOUT calling it as a function
const authService = new AuthService();
window.authService = authService;

// Also expose the class itself for testing/debugging
window.AuthService = AuthService;