"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/useLogout";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useLogout();

  useEffect(() => {
    const performLogout = async () => {
      await logout();
      router.replace("/login");
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Logging out...</p>
      </div>
    </div>
  );
}