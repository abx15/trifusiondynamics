"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Users2,
  Briefcase,
  CreditCard,
  HeartHandshake,
  HelpCircle,
  FileText,
  Globe,
  BarChart3,
  Cpu,
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  TrendingUp,
  Layers,
  Inbox,
  Receipt,
  ClipboardList,
  RefreshCw,
  DollarSign,
  Quote,
  Clock,
  Calendar,
  Wallet,
  Code,
  Terminal,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  collapsed?: boolean;
  setCollapsed?: (val: boolean) => void;
  onItemClick?: () => void;
}

interface SidebarSubItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  active: boolean;
  badge?: number | string;
}

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  active: boolean;
  disabled: boolean;
  subitems?: SidebarSubItem[];
}

interface MenuGroup {
  label: string;
  items: SidebarItem[];
}

export function Sidebar({ collapsed = false, setCollapsed, onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, isEmployee, hasPermission } = useAuth();

  const { data: inboxData } = useQuery({
    queryKey: ["leads-inbox-count"],
    queryFn: async () => {
      const { data } = await apiClient.get("/crm/contact-submissions?status=NEW");
      return data as { data: Array<{ status?: string }>; total: number };
    },
    staleTime: 30_000,
  });

  const unpromotedCount = (inboxData?.data ?? []).filter((s) => s.status === "NEW").length;

  const menuGroups: MenuGroup[] = [];

  // 1. Overview Section
  const overviewItems: SidebarItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      disabled: false,
    },
    {
      label: "ERP",
      href: "/erp",
      icon: Layers,
      active: pathname === "/erp",
      disabled: false,
    },
    {
      label: "Finance",
      href: "/finance",
      icon: TrendingUp,
      active: pathname === "/finance",
      disabled: false,
    },
  ];

  if (isAdmin || hasPermission("analytics:read")) {
    overviewItems.push({
      label: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      active: pathname.startsWith("/analytics"),
      disabled: false,
    });
  }

  menuGroups.push({
    label: "Overview",
    items: overviewItems,
  });

  // 2. Employee Self-Service Section
  if (isEmployee) {
    menuGroups.push({
      label: "Employee Self-Service",
      items: [
        {
          label: "My Attendance",
          href: "/attendance",
          icon: Clock,
          active: pathname === "/attendance",
          disabled: false,
        },
        {
          label: "My Leaves",
          href: "/leave",
          icon: Calendar,
          active: pathname === "/leave",
          disabled: false,
        },
        {
          label: "My Payslips",
          href: "/payslips",
          icon: Wallet,
          active: pathname === "/payslips",
          disabled: false,
        },
      ],
    });
  }

  // 3. Operations Section
  const operationsItems: SidebarItem[] = [];

  if (isAdmin || hasPermission("crm:read")) {
    operationsItems.push({
      label: "CRM",
      href: "/crm",
      icon: Target,
      active: pathname.startsWith("/crm") || pathname.startsWith("/leads-inbox"),
      disabled: false,
      subitems: [
        { label: "Kanban Board", href: "/crm", icon: Layers, active: pathname === "/crm" },
        {
          label: "Leads Inbox",
          href: "/leads-inbox",
          icon: Inbox,
          active: pathname === "/leads-inbox",
          badge: unpromotedCount > 0 ? unpromotedCount : undefined,
        },
        { label: "Quotes", href: "/crm/quotes", icon: Quote, active: pathname.startsWith("/crm/quotes") },
      ],
    });
  }

  if (isAdmin || hasPermission("clients:read")) {
    operationsItems.push({
      label: "Clients",
      href: "/clients",
      icon: Users2,
      active: pathname.startsWith("/clients"),
      disabled: false,
    });
  }

  if (isAdmin || hasPermission("projects:read")) {
    operationsItems.push({
      label: "Projects",
      href: "/projects",
      icon: Briefcase,
      active: pathname.startsWith("/projects"),
      disabled: false,
    });
  }

  if (isAdmin || hasPermission("billing:read")) {
    operationsItems.push({
      label: "Billing",
      href: "/billing/invoices",
      icon: CreditCard,
      active: pathname.startsWith("/billing"),
      disabled: false,
      subitems: [
        { label: "Invoices", href: "/billing/invoices", icon: Receipt, active: pathname.startsWith("/billing/invoices") },
        { label: "Estimates", href: "/billing/estimates", icon: ClipboardList, active: pathname.startsWith("/billing/estimates") },
        { label: "Subscriptions", href: "/billing/subscriptions", icon: RefreshCw, active: pathname.startsWith("/billing/subscriptions") },
        { label: "Expenses", href: "/billing/expenses", icon: DollarSign, active: pathname.startsWith("/billing/expenses") },
      ],
    });
  }

  if (isAdmin || hasPermission("hr:read")) {
    operationsItems.push({
      label: "HR Portal",
      href: "/hr/employees",
      icon: HeartHandshake,
      active: pathname.startsWith("/hr"),
      disabled: false,
      subitems: [
        { label: "Employees", href: "/hr/employees", icon: Users2, active: pathname.startsWith("/hr/employees") },
        { label: "Leaves", href: "/hr/leaves", icon: Calendar, active: pathname.startsWith("/hr/leaves") },
        { label: "Recruitment", href: "/hr/recruitment", icon: ClipboardList, active: pathname.startsWith("/hr/recruitment") },
      ],
    });
  }

  if (isAdmin || hasPermission("payroll:read")) {
    operationsItems.push({
      label: "Payroll Management",
      href: "/payroll",
      icon: DollarSign,
      active: pathname.startsWith("/payroll"),
      disabled: false,
    });
  }

  if (isAdmin || hasPermission("projects:read")) {
    operationsItems.push({
      label: "Support Tickets",
      href: "/tickets",
      icon: HelpCircle,
      active: pathname.startsWith("/tickets"),
      disabled: false,
    });
  }

  if (operationsItems.length > 0) {
    menuGroups.push({
      label: "Operations",
      items: operationsItems,
    });
  }

  // 4. Technical Assets Section
  const technicalItems: SidebarItem[] = [];

  if (isAdmin || hasPermission("ai:read")) {
    technicalItems.push({
      label: "AI Workloads",
      href: "/ai/proposal-generator",
      icon: Cpu,
      active: pathname.startsWith("/ai"),
      disabled: false,
      subitems: [
        { label: "Proposal Generator", href: "/ai/proposal-generator", icon: FileText, active: pathname === "/ai/proposal-generator" },
        { label: "SEO Audit", href: "/ai/seo-audit", icon: Globe, active: pathname === "/ai/seo-audit" },
        { label: "Email Writer", href: "/ai/email-writer", icon: Inbox, active: pathname === "/ai/email-writer" },
        { label: "Meeting Summary", href: "/ai/meeting-summary", icon: ClipboardList, active: pathname === "/ai/meeting-summary" },
        { label: "AI Assistant", href: "/ai/assistant", icon: HelpCircle, active: pathname === "/ai/assistant" },
      ],
    });
  }

  if (isAdmin || hasPermission("automation:read")) {
    technicalItems.push({
      label: "Automations",
      href: "/automation",
      icon: GitBranch,
      active: pathname.startsWith("/automation"),
      disabled: false,
    });
  }

  if (isAdmin || hasPermission("developer:read")) {
    technicalItems.push({
      label: "Developer Portal",
      href: "/developer/api-keys",
      icon: Code,
      active: pathname.startsWith("/developer"),
      disabled: false,
      subitems: [
        { label: "API Keys", href: "/developer/api-keys", icon: ShieldCheck, active: pathname === "/developer/api-keys" },
        { label: "Webhooks", href: "/developer/webhooks", icon: Globe, active: pathname === "/developer/webhooks" },
        { label: "API Logs", href: "/developer/logs", icon: Terminal, active: pathname === "/developer/logs" },
      ],
    });
  }

  // Fallback KeyIcon since Lucide has Key or ShieldCheck. Let's use ShieldCheck if we don't import Key, but wait, Lucide has "Key" or we can use ShieldCheck/Settings.
  // Wait, let's just use Settings or CreditCard or similar, or let's use Activity/ShieldCheck. Let's use ShieldCheck for API Keys subitem since it's already imported.
  // Wait! Let's check if "Key" is a valid Lucide icon. Lucide has "Key" icon, but let's use ShieldCheck to be safe, or just use key icon in list of imports.
  // Actually, we can use ShieldCheck which is already imported! Let's check imports. Yes, ShieldCheck is imported.
  // Let's modify the subitem: { label: "API Keys", href: "/developer/api-keys", icon: ShieldCheck, active: pathname === "/developer/api-keys" }

  if (technicalItems.length > 0) {
    menuGroups.push({
      label: "Technical Assets",
      items: technicalItems,
    });
  }

  // 5. Configuration Section
  if (isAdmin) {
    menuGroups.push({
      label: "Configuration",
      items: [
        {
          label: "Settings",
          href: "/settings/users",
          icon: Settings,
          active: pathname.startsWith("/settings"),
          disabled: false,
          subitems: [
            {
              label: "Team Members",
              href: "/settings/users",
              icon: UserCheck,
              active: pathname === "/settings/users",
            },
            {
              label: "Roles & Access",
              href: "/settings/roles",
              icon: ShieldCheck,
              active: pathname === "/settings/roles",
            },
          ],
        },
      ],
    });
  }


  return (
    <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#09090b] border-r border-border text-foreground transition-all duration-300">
      
      {/* Header Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="Trifusion Logo" 
              width={32} 
              height={32}
              className="object-contain"
              priority
            />
          </div>
          {!collapsed && (
            <span className="font-display font-extrabold tracking-tight text-foreground text-sm uppercase">
              Trifusion<span className="text-slate-500 font-normal">Ops</span>
            </span>
          )}
        </Link>

        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                {group.label}
              </h3>
            )}
            <ul className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <li key={itemIdx} className="space-y-1">
                    {item.disabled ? (
                      <div
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-600 cursor-not-allowed select-none ${
                          collapsed ? "justify-center" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </div>
                        {!collapsed && (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            Soon
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <Link
                          href={item.href}
                          onClick={onItemClick}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                            item.active
                              ? "bg-slate-200/60 dark:bg-slate-800/60 text-foreground font-semibold"
                              : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-foreground"
                          } ${collapsed ? "justify-center" : ""}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>

                        {/* Nested Subitems */}
                        {!collapsed && item.subitems && item.active && (
                          <ul className="pl-6 mt-1 space-y-1 border-l border-border ml-5">
                            {item.subitems.map((sub, subIdx) => {
                              const SubIcon = sub.icon;
                              return (
                                <li key={subIdx}>
                                  <Link
                                    href={sub.href}
                                    onClick={onItemClick}
                                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-[11px] font-medium transition-colors ${
                                      sub.active
                                        ? "text-primary font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="flex-1 min-w-0 truncate">{sub.label}</span>
                                    {sub.badge !== undefined && (
                                      <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[9px] font-bold leading-none shrink-0">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
