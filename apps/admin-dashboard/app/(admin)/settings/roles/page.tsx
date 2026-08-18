"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Info } from "lucide-react";

interface RolePolicy {
  name: string;
  description: string;
  scope: string;
  permissions: string[];
}

export default function RolesSettingsPage() {
  const [roles, setRoles] = React.useState<RolePolicy[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setRoles([
        {
          name: "admin",
          description: "Full system administration with read/write access across all modules, tenants, and logs.",
          scope: "Global",
          permissions: ["*:*"],
        },
        {
          name: "developer",
          description: "Technical access to developer options, system integrations, webhooks, request logs, and API key management.",
          scope: "Technical Integration",
          permissions: [
            "developer:read",
            "developer:write",
            "automations:read",
            "automations:write",
          ],
        },
        {
          name: "hr",
          description: "Human resource management including employee files, salary structures, leave tracking, and attendance logs.",
          scope: "Internal HR Modules",
          permissions: [
            "hr:read",
            "hr:write",
            "leaves:read",
            "leaves:write",
            "attendance:read",
          ],
        },
        {
          name: "client",
          description: "External customer role mapping client-portal access to projects, tasks, and proposals.",
          scope: "Client Portal Only",
          permissions: ["projects:read", "client:read"],
        },
      ]);
      setIsLoading(false);
    }, 500); // 500ms delay to display skeletons

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Access Policies"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Roles" }]}
      />

      <div className="grid grid-cols-1 gap-6">
        
        {/* Main RBAC Card */}
        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
          <CardHeader>
            <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
            <CardDescription>
              View mapped system security roles and authorized permission scopes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-40">Role Name</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 w-44">Scope Limit</th>
                    <th className="py-3.5 px-4">Permission Nodes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="h-16">
                        <td className="py-2.5 px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-2.5 px-4"><Skeleton className="h-4 w-80" /></td>
                        <td className="py-2.5 px-4"><Skeleton className="h-4 w-28" /></td>
                        <td className="py-2.5 px-4 flex gap-1.5 mt-4"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-12" /></td>
                      </tr>
                    ))
                  ) : (
                    roles.map((role) => (
                      <tr key={role.name} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                        <td className="py-4 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-mono text-xs uppercase">{role.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs text-muted-foreground leading-relaxed">
                          {role.description}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-500 font-medium">
                          {role.scope}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {role.permissions.map((perm) => (
                              <span
                                key={perm}
                                className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold font-mono ${
                                  perm === "*:*"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {perm}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Informational Policy Card */}
        <Card className="bg-[#f8fafc] dark:bg-zinc-950 border border-slate-200/60 dark:border-border shadow-xs">
          <CardContent className="flex items-start gap-3 p-5">
            <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Policy Management Details</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Roles and mappings are declared globally in the NestJS Gateway application database and assigned dynamically to administrators during account creation or via organization settings. Custom roles adjustments will be editable in subsequent phases.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
