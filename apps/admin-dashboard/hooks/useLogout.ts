"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/auth-store";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const logout = async () => {
    // Clear all auth state immediately
    clearAuth();

    if (typeof window !== "undefined") {
      // Clear all cookies with every possible option to ensure complete removal
      const cookiePaths = [
        { path: "/", sameSite: "lax" as const },
        { path: "/", sameSite: "strict" as const },
        { path: "/", sameSite: "none" as const },
        { path: "/" },
      ];

      cookiePaths.forEach((options) => {
        Cookies.remove("access_token", options);
        Cookies.remove("refresh_token", options);
      });

      // Clear all storage
      sessionStorage.clear();
      localStorage.clear();

      // Force replace to login (prevents back-button from returning)
      window.location.replace("/login");
    } else {
      router.replace("/login");
    }
  };

  return { logout };
}

export default useLogout;

