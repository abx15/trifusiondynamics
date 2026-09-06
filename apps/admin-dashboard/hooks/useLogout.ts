"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.warn("Logout API call failed, proceeding with local cleanup:", err);
    }

    clearAuth();

    if (typeof window !== "undefined") {
      const cookiePaths = [
        { path: "/", sameSite: "lax" as const },
        { path: "/", sameSite: "strict" as const },
        { path: "/" },
      ];

      cookiePaths.forEach((options) => {
        Cookies.remove("access_token", options);
        Cookies.remove("refresh_token", options);
      });

      sessionStorage.clear();
      localStorage.clear();

      window.location.replace("/login");
    } else {
      router.replace("/login");
    }
  };

  return { logout };
}

export default useLogout;
