"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { hydrateFromStorage } = useAuthStore();

  useEffect(() => {
    hydrateFromStorage();
    const user = useAuthStore.getState().user;
    if (user) {
      const primaryRole = getPrimaryRole(user.roles);
      const homeRoute = getRoleHomeRoute(primaryRole);
      router.replace(homeRoute);
    } else {
      router.replace("/login");
    }
  }, [router, hydrateFromStorage]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-slate-400 font-medium">Initializing workspace session...</p>
      </div>
    </div>
  );
}
