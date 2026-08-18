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
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      } else {
        await apiClient.post("/auth/logout");
      }
    } catch (err) {
      console.warn("Backend token revocation on logout:", err);
    } finally {
      clearAuth();

      if (typeof window !== "undefined") {
        Cookies.remove("access_token", { path: "/", sameSite: "lax" });
        Cookies.remove("refresh_token", { path: "/", sameSite: "lax" });
        sessionStorage.removeItem("refreshToken");
        localStorage.removeItem("refreshToken");

        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      } else {
        router.replace("/login");
      }
    }
  };

  return { logout };
}

export default useLogout;

