import { create } from "zustand";
import Cookies from "js-cookie";

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  organizationId: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export type PrimaryRole =
  | "super_admin"
  | "admin"
  | "sales_agent"
  | "support_agent"
  | "hr_agent"
  | "agent"
  | "employee"
  | "client";

export function getPrimaryRole(roles: string[] = []): PrimaryRole {
  const normalized = roles.map((r) => r.toLowerCase().trim());
  if (normalized.includes("super_admin") || normalized.includes("superadmin")) {
    return "super_admin";
  }
  if (normalized.includes("admin")) {
    return "admin";
  }
  if (normalized.includes("sales_agent") || normalized.includes("sales")) {
    return "sales_agent";
  }
  if (normalized.includes("support_agent") || normalized.includes("support")) {
    return "support_agent";
  }
  if (normalized.includes("hr_agent") || normalized.includes("hr")) {
    return "hr_agent";
  }
  if (normalized.includes("agent")) {
    return "agent";
  }
  if (normalized.includes("employee") || normalized.includes("worker") || normalized.includes("staff")) {
    return "employee";
  }
  if (normalized.includes("client")) {
    return "client";
  }
  return "admin";
}

export function getRoleHomeRoute(primaryRole: PrimaryRole): string {
  switch (primaryRole) {
    case "super_admin":
      return "/super-admin";
    case "admin":
      return "/dashboard";
    case "sales_agent":
      return "/crm";
    case "support_agent":
      return "/tickets";
    case "hr_agent":
      return "/hr";
    case "agent":
      return "/agent/dashboard";
    case "employee":
      return "/attendance";
    case "client":
      return "/client/dashboard";
    default:
      return "/dashboard";
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setAuth: (accessToken: string, user: User) => void;
  hydrateFromStorage: () => void;
}

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (stored) return JSON.parse(stored) as User;
  } catch {
    // ignore parse errors
  }
  return null;
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  accessToken: null,
  setUser: (user) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ user, isAuthenticated: true });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      // Clear all session storage
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      
      // Clear all local storage
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      
      // Clear all cookies with different path options to ensure complete removal
      try {
        Cookies.remove("access_token", { path: "/" });
        Cookies.remove("refresh_token", { path: "/" });
      } catch {
        // ignore cookie remove errors
      }
    }
    set({ user: null, isAuthenticated: false, accessToken: null });
  },
  setAuth: (accessToken, user) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
      if (accessToken) {
        sessionStorage.setItem("accessToken", accessToken);
        localStorage.setItem("accessToken", accessToken);
        Cookies.set("access_token", accessToken, { path: "/", expires: 1 });
      }
    }
    set({ user, isAuthenticated: true, accessToken });
  },
  hydrateFromStorage: () => {
    // Idempotency guard: if already hydrated, skip to prevent re-render loops
    const currentState = useAuthStore.getState();
    if (currentState.user) return;

    const user = getStoredUser();
    let accessToken = getStoredAccessToken();
    if (!accessToken && typeof window !== "undefined") {
      accessToken = Cookies.get("access_token") || null;
    }
    if (user) {
      set({ user, isAuthenticated: true, accessToken });
    }
  },
}));

export default useAuthStore;



