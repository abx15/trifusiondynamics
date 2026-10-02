"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { useCallback } from "react";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const logout = useCallback(async () => {
    try {
      // Send logout request without body - rely on cookies being sent via withCredentials
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.warn("Logout API call failed, proceeding with local cleanup:", err);
    }

    clearAuth();

    if (typeof window !== "undefined") {
      router.replace("/login");
    } else {
      router.replace("/login");
    }
  }, [clearAuth, router]);

  return { logout };
}

export default useLogout;
