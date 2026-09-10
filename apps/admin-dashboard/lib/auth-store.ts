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
  
  // Check for super admin roles first (highest priority)
  if (normalized.includes("super_admin") || normalized.includes("superadmin")) {
    return "super_admin";
  }
  
  // Check for admin role (but only if no super admin role)
  if (normalized.includes("admin") && !normalized.includes("super_admin") && !normalized.includes("superadmin")) {
    return "admin";
  }
  
  // Check for specific agent roles
  if (normalized.includes("sales_agent") || normalized.includes("sales")) {
    return "sales_agent";
  }
  if (normalized.includes("support_agent") || normalized.includes("support")) {
    return "support_agent";
  }
  if (normalized.includes("hr_agent") || normalized.includes("hr")) {
    return "hr_agent";
  }
  
  // Check for generic agent role
  if (normalized.includes("agent")) {
    return "agent";
  }
  
  // Check for employee role
  if (normalized.includes("employee") || normalized.includes("worker") || normalized.includes("staff")) {
    return "employee";
  }
  
  // Check for client role
  if (normalized.includes("client")) {
    return "client";
  }
  
  // Default fallback
  return "employee";
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
  isHydrating: boolean;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setAuth: (accessToken: string, user: User) => void;
  hydrateFromStorage: () => boolean;
  setHydrated: (hydrated: boolean) => void;
}

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem("user");
    if (stored) return JSON.parse(stored) as User;
  } catch {
    // ignore parse errors
  }
  return null;
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken");
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  accessToken: null,
  isHydrating: true,
  setUser: (user) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("user", JSON.stringify(user));
    }
    set({ user, isAuthenticated: true });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      try {
        Cookies.remove("access_token", { path: "/" });
        Cookies.remove("refresh_token", { path: "/" });
      } catch {
        // ignore cookie remove errors
      }
    }
    set({ user: null, isAuthenticated: false, accessToken: null, isHydrating: false });
  },
  setAuth: (accessToken, user) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("user", JSON.stringify(user));
      if (accessToken) {
        sessionStorage.setItem("accessToken", accessToken);
      }
    }
    set({ user, isAuthenticated: true, accessToken, isHydrating: false });
  },
  hydrateFromStorage: () => {
    // Idempotency guard: if already hydrated, skip to prevent re-render loops
    const currentState = useAuthStore.getState();
    if (currentState.user) {
      set({ isHydrating: false });
      return true;
    }

    const user = getStoredUser();
    let accessToken = getStoredAccessToken();
    if (!accessToken && typeof window !== "undefined") {
      accessToken = Cookies.get("access_token") || null;
    }
    if (user) {
      set({ user, isAuthenticated: true, accessToken, isHydrating: false });
      return true;
    }
    set({ isHydrating: false });
    return false;
  },
  setHydrated: (hydrated) => {
    set({ isHydrating: !hydrated });
  },
}));

export default useAuthStore;



