"use client";

import { useMemo, useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function useAuth() {
  const { user, accessToken, isAuthenticated, isHydrating } = useAuthStore();

  const isAdmin = useMemo(
    () =>
      user?.roles?.some((role) =>
        ["admin", "superadmin", "super_admin"].includes(role),
      ) || false,
    [user?.roles],
  );

  const isEmployee = useMemo(
    () =>
      user?.roles?.some((role) =>
        ["employee", "agent", "sales_agent", "support_agent", "hr_agent"].includes(
          role,
        ),
      ) || isAdmin,
    [user?.roles, isAdmin],
  );

  const hasPermission = useCallback(
    (action: string) => {
      if (!user) return false;
      // Admins have wildcard access to everything
      if (isAdmin) return true;
      return user.permissions?.includes(action) || false;
    },
    [user, isAdmin],
  );

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    isEmployee,
    hasPermission,
    isLoading: isHydrating,
    isHydrating,
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
