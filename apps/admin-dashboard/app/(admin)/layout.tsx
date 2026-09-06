"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, setUser, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(!user);
  const router = useRouter();

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
          console.warn("Admin session restore error:", err);
          useAuthStore.getState().clearAuth();
          router.replace("/login");
          return;
        } finally {
          setIsInitializing(false);
        }
      }

      if (currentUser) {
        const primary = getPrimaryRole(currentUser.roles);
        const path = typeof window !== "undefined" ? window.location.pathname : "";

        // Super Admin and Admin have full access to all admin group routes
        if (primary === "super_admin" || primary === "admin") {
          setIsInitializing(false);
          return;
        }

        // Sales Agent is allowed on CRM & Leads Inbox
        if (primary === "sales_agent" && (path.startsWith("/crm") || path.startsWith("/leads-inbox"))) {
          setIsInitializing(false);
          return;
        }

        // Support Agent is allowed on Tickets
        if (primary === "support_agent" && path.startsWith("/tickets")) {
          setIsInitializing(false);
          return;
        }

        // HR Agent is allowed on Payroll
        if (primary === "hr_agent" && path.startsWith("/payroll")) {
          setIsInitializing(false);
          return;
        }

        // General Agent is allowed on Tickets, CRM, Leads Inbox
        if (primary === "agent" && (path.startsWith("/tickets") || path.startsWith("/crm") || path.startsWith("/leads-inbox"))) {
          setIsInitializing(false);
          return;
        }

        // Otherwise redirect to their role's dedicated home route
        const homeRoute = getRoleHomeRoute(primary);
        if (path !== homeRoute) {
          router.replace(homeRoute);
        }
        return;
      }
      setIsInitializing(false);
    }

    restoreSession();
  }, [router]);



  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500 font-medium font-sans">
            Syncing Operations...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 h-full transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </aside>

      {/* Main Panel Content Container */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar sidebarOpen={false} setSidebarOpen={() => {}} />
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-zinc-900/30 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
