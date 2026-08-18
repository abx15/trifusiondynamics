"use client";

import { useAuthStore } from "@/lib/auth-store";

export function useAuth() {
  const { user, accessToken, isAuthenticated } = useAuthStore();

  const isAdmin = user?.roles?.includes("admin") || false;
  const isEmployee = user?.roles?.includes("employee") || isAdmin;

  const hasPermission = (action: string) => {
    if (!user) return false;
    // Admins have wildcard access to everything
    if (isAdmin) return true;
    return user.permissions?.includes(action) || false;
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    isEmployee,
    hasPermission,
    isLoading: false, // will coordinate with hydration mounting if required
  };
}

export function useIsAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin;
}

export function useIsEmployee() {
  const { isEmployee } = useAuth();
  return isEmployee;
}

export default useAuth;

