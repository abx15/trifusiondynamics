"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Ticket,
  LogOut,
  Sparkles,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { useLogout } from "@/hooks/useLogout";
import { Loader2 } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
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
            // Force hard redirect to ensure clean session state
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            } else {
              router.replace("/login");
            }
            return;
          }
        } catch (err) {
          console.warn("Client session restore error:", err);
          useAuthStore.getState().clearAuth();
          // Force hard redirect to ensure clean session state
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          } else {
            router.replace("/login");
          }
          return;
        } finally {
          setIsInitializing(false);
        }
      }

      if (currentUser) {
        const primary = getPrimaryRole(currentUser.roles);
        if (primary !== "client") {
          router.replace(getRoleHomeRoute(primary));
          return;
        }
      }
      setIsInitializing(false);
    }

    restoreSession();
  }, [router]);



  const navItems = [
    {
      label: "Client Overview",
      href: "/client/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Active Projects",
      href: "/client/projects",
      icon: FolderKanban,
    },
    {
      label: "Invoices & Billing",
      href: "/client/invoices",
      icon: Receipt,
    },
    {
      label: "Support Tickets",
      href: "/client/tickets",
      icon: Ticket,
    },
    {
      label: "Security & Password",
      href: "/client/settings",
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white font-sans">
      {/* Client Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/60 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-zinc-800">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/30 overflow-hidden shrink-0">
              <Image src="/logo.png" alt="Trifusion Dynamics" width={36} height={36} className="object-contain" priority />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">Trifusion Client</h1>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-purple-400">
                <ShieldCheck className="w-3 h-3" /> Authorized Portal
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
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
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
            <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0) : "C"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || "Client User"}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email || "client@company.com"}</p>
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

      {/* Main Client Workspace Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Client Topbar */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-400">Organization:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-xs font-medium text-purple-300 border border-purple-500/20">
              <Building2 className="w-3.5 h-3.5" /> Apex Retail Solutions
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/client/tickets"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md shadow-purple-600/30"
            >
              <Ticket className="w-3.5 h-3.5" /> Raise Support Ticket
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
