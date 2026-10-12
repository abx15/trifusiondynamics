"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Bell, Menu, User, Settings, LogOut, X, Check, Loader2, Wifi, WifiOff } from "lucide-react";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead, type Notification } from "@/lib/hooks/useNotifications";
import { useIsRealtimeConnected } from "@/hooks/useWebSocket";

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Topbar({ sidebarOpen, setSidebarOpen }: TopbarProps) {
  const { user } = useAuth();
  const { logout } = useLogout();
  const isRealtimeConnected = useIsRealtimeConnected();
  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useNotifications({ limit: 20 });
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const notifications = notificationsData?.data || [];
  const totalUnread = unreadCount?.count || 0;

  // Get initials for avatar fallback
  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleMarkRead = async (notification: Notification) => {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500";
      case "warning":
        return "bg-amber-500";
      case "success":
        return "bg-emerald-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-[#ffffff]/90 dark:bg-[#09090b]/90 backdrop-blur-md px-6 shadow-xs">
      
      {/* Mobile Sidebar Toggle Hamburger */}
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger>
              <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent className="p-0">
              <Sidebar collapsed={false} />
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Subtitle brand name or placeholder */}
        <span className="font-semibold text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest hidden sm:inline-block">
          Internal Console
        </span>
      </div>

      {/* User Actions Right */}
      <div className="flex items-center gap-4">

        {/* Real-time Connection Status */}
        <div
          title={isRealtimeConnected ? "Real-time: Connected" : "Real-time: Disconnected"}
          className="hidden sm:flex items-center gap-1.5"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isRealtimeConnected
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                : "bg-slate-400"
            }`}
          />
          <span className="text-[10px] font-mono text-muted-foreground">
            {isRealtimeConnected ? "Live" : "Offline"}
          </span>
        </div>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {totalUnread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 mt-2 p-0" align="right">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <DropdownMenuLabel className="font-semibold text-sm">Notifications</DropdownMenuLabel>
              {totalUnread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllRead.isPending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {markAllRead.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin inline" />
                  ) : (
                    "Mark all read"
                  )}
                </button>
              )}
            </div>
            
            {notificationsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification: Notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleMarkRead(notification)}
                    className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-start gap-3 ${
                      !notification.isRead ? "bg-slate-50 dark:bg-slate-900/30" : ""
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${getSeverityColor(notification.severity)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.isRead ? "font-semibold" : ""} text-foreground truncate`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {notifications.length > 0 && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem asChild className="justify-center py-2">
              <Link
                href="/notifications"
                className="text-sm text-primary hover:underline w-full text-center"
              >
                View All Notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className="focus:outline-none">
              <Avatar className="h-9 w-9 cursor-pointer hover:opacity-90 transition-opacity">
                <AvatarFallback>{getInitials(user?.name || "AD")}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-2" align="right">
            <DropdownMenuLabel className="font-normal px-2.5 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-foreground truncate">{user?.name || "System Admin"}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-none">{user?.email || "admin@trifusiondynamics.com"}</p>
                {user?.organization?.name && (
                  <p className="text-[10px] text-primary font-semibold truncate leading-none">
                    {user.organization.name}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href="/settings/users" className="flex items-center gap-2 w-full text-xs">
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={logout} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 w-full text-xs">
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}

export default Topbar;
