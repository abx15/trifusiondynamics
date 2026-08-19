import axios from "axios";
import Cookies from "js-cookie";
import { useAuthStore } from "./auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial: automatically sends and receives HttpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Bearer token fallback alongside cookies
apiClient.interceptors.request.use(
  (config) => {
    let token = useAuthStore.getState().accessToken;
    if (!token && typeof window !== "undefined") {
      token = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
    }
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Token rotation on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const requestUrl = originalRequest.url || "";
      
      // Stop infinite loop if the 401 is from login, refresh, or me endpoints
      if (
        requestUrl.includes("auth/login") ||
        requestUrl.includes("auth/refresh") ||
        requestUrl.includes("auth/me")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        let refreshToken: string | undefined;
        if (typeof window !== "undefined") {
          refreshToken = Cookies.get("refresh_token") || sessionStorage.getItem("refreshToken") || undefined;
        }

        // Call POST /auth/refresh — browser sends refresh_token HttpOnly cookie + fallback body
        const res = await axios.post(
          `${API_URL}/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true }
        );

        if (res.data?.accessToken && res.data?.user) {
          useAuthStore.getState().setAuth(res.data.accessToken, res.data.user);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        } else if (res.data?.user) {
          useAuthStore.getState().setUser(res.data.user);
        }

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshErr: any) {
        const errMessage = refreshErr?.response?.data?.message || "";
        
        // Clear all auth state completely
        useAuthStore.getState().clearAuth();
        
        if (typeof window !== "undefined") {
          // Clear cookies explicitly
          Cookies.remove("access_token", { path: "/", sameSite: "lax" });
          Cookies.remove("access_token", { path: "/", sameSite: "strict" });
          Cookies.remove("access_token", { path: "/" });
          Cookies.remove("refresh_token", { path: "/", sameSite: "lax" });
          Cookies.remove("refresh_token", { path: "/", sameSite: "strict" });
          Cookies.remove("refresh_token", { path: "/" });
          
          // Clear storage
          sessionStorage.clear();
          localStorage.clear();
          
          if (errMessage === "SESSION_SUPERSEDED") {
            // Single active session enforcement — user logged in elsewhere
            alert("You've been logged out because your account was signed in from another location.");
          }
          // Force redirect to login page
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

