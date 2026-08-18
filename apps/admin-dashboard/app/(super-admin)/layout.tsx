"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Crown,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Server,
  Settings,
  LogOut,
  Loader2,
  KeyRound,
} from "lucide-react";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { useLogout } from "@/hooks/useLogout";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, clearAuth } = useAuthStore();
  const { logout } = useLogout();
  const [isInitializing, setIsInitializing] = React.useState(!user);

  React.useEffect(() => {
    async function restoreSession() {
      useAuthStore.getState().hydrateFromStorage();
      let currentUser = useAuthStore.getState().user;

      if (!currentUser) {
        try {
          const res = await apiClient.get("/auth/me");
          if (res.data?.user) {
            useAuthStore.getState().setUser(res.data.user);
            currentUser = res.data.user;
          } else {
            useAuthStore.getState().clearAuth();
            router.replace("/login");
            return;
          }
        } catch (err) {
          console.warn("Super Admin session restore error:", err);
          useAuthStore.getState().clearAuth();
          router.replace("/login");
          return;
        } finally {
          setIsInitializing(false);
        }
      }

      if (currentUser) {
        const primary = getPrimaryRole(currentUser.roles);
        if (primary !== "super_admin") {
          router.replace(getRoleHomeRoute(primary));
          return;
        }
      }
      setIsInitializing(false);
    }

    restoreSession();
  }, [router]);


  const navItems = [
    { label: "Executive Control", href: "/super-admin", icon: LayoutDashboard },
    { label: "Organizations & Tenancy", href: "/super-admin/organizations", icon: Users },
    { label: "RBAC & Permissions", href: "/super-admin/rbac", icon: KeyRound },
    { label: "Infrastructure & Health", href: "/super-admin/system", icon: Server },
    { label: "Global Settings", href: "/super-admin/settings", icon: Settings },
  ];

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-amber-500 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm font-medium text-zinc-400">Authenticating Super Admin Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white font-sans">
      {/* Super Admin Sidebar */}
      <aside className="w-64 border-r border-amber-500/20 bg-zinc-900/80 flex flex-col justify-between p-4 shrink-0 shadow-2xl">
        <div>
          {/* Logo & Super Admin Crown Badge */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-amber-500/20">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-lg text-black shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">Trifusion OS</h1>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400">
                <ShieldCheck className="w-3 h-3" /> Super Admin Portal
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card & Logout */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || "Super Admin"}</p>
              <p className="text-[10px] text-amber-300/80 truncate">{user?.email || "superadmin@trifusiondynamics.com"}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-rose-600/20 text-zinc-300 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Super Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Crown className="w-4 h-4" /> Root Executive Level
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Role: SUPER_ADMIN
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
