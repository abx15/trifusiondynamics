"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Ticket,
  Clock,
  FileText,
  LogOut,
  HardHat,
} from "lucide-react";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { useLogout } from "@/hooks/useLogout";
import { Loader2 } from "lucide-react";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
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
          console.warn("Employee session restore error:", err);
          useAuthStore.getState().clearAuth();
          router.replace("/login");
          return;
        } finally {
          setIsInitializing(false);
        }
      }

      if (currentUser) {
        const primary = getPrimaryRole(currentUser.roles);
        if (primary === "client") {
          router.replace("/client/dashboard");
          return;
        }
      }
      setIsInitializing(false);
    }

    restoreSession();
  }, [router]);

  const navItems = [
    { label: "Attendance", href: "/attendance", icon: Clock },
    { label: "Leave Requests", href: "/leave", icon: FileText },
    { label: "My Payslips", href: "/payslips", icon: FileText },
    { label: "Support Tickets", href: "/employee/tickets", icon: Ticket },
  ];


  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white font-sans">
      {/* Worker Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/60 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-zinc-800">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-600/30">
              T
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">Trifusion Worker</h1>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-blue-400">
                <HardHat className="w-3 h-3" /> Staff Portal
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
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

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="px-3 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 mb-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0) : "W"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || "Worker"}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email || "worker@trifusiondynamics.com"}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-rose-600/20 text-zinc-300 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Worker Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/40 px-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-300">
            Worker Dashboard — Trifusion Dynamics Ops
          </span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <HardHat className="w-3.5 h-3.5" /> Staff Access
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}