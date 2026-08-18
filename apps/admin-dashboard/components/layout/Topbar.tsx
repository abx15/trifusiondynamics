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
import { Bell, Menu, User, Settings, LogOut } from "lucide-react";

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Topbar({ sidebarOpen, setSidebarOpen }: TopbarProps) {
  const { user } = useAuth();
  const { logout } = useLogout();

  // Get initials for avatar fallback
  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
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
        
        {/* Notifications Icon (Mock) */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

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
