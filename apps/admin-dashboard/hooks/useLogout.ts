"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const logout = async () => {
    const refreshToken =
      (typeof window !== "undefined" &&
        (Cookies.get("refresh_token") ||
          sessionStorage.getItem("refreshToken") ||
          localStorage.getItem("refreshToken"))) ||
      undefined;

    try {
      await apiClient.post("/auth/logout", refreshToken ? { refreshToken } : {});
    } catch (err) {
      console.warn("Backend token revocation on logout:", err);
    } finally {
      clearAuth();
      toast.success("Successfully logged out");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    }
  };

  return { logout };
}

export default useLogout;

