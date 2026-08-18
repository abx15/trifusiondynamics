"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { UserCheck, ShieldAlert, BadgeCheck, CircleAlert, Crown, Users, Briefcase, User, ChevronDown, ChevronRight, UserPlus, Edit3 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { UserFormSheet } from "@/components/UserFormSheet";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Array<{ permission: { action: string } }>;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  linkedClientId?: string;
  organizationId: string;
  roles: Array<{ role: Role }>;
  createdAt: string;
  updatedAt: string;
}

const ROLE_HIERARCHY: Record<string, { level: number; icon: any; color: string; bgColor: string; borderColor: string; department?: string }> = {
  superadmin: { level: 1, icon: Crown, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  super_admin: { level: 1, icon: Crown, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  admin: { level: 2, icon: ShieldAlert, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  agent: { level: 3, icon: UserCheck, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  sales_agent: { level: 3, icon: Briefcase, color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", department: "Sales" },
  support_agent: { level: 3, icon: UserCheck, color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", department: "Support" },
  hr_agent: { level: 3, icon: Users, color: "text-pink-500", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/30", department: "HR" },
  employee: { level: 4, icon: User, color: "text-slate-500", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30" },
  client: { level: 5, icon: User, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
};

export default function UsersSettingsPage() {
  const { isAdmin, hasPermission } = useAuth();

  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    executives: true,
    agents: true,
    clients: true,
  });
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<Member | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get("/users");
      setMembers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (hasPermission('hr:read')) {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [hasPermission]);

  const handleSuccess = () => {
    fetchUsers();
  };

  const handleEdit = (member: Member) => {
    setEditingUser(member);
    setSheetOpen(true);
  };

  const handleDeactivate = (id: string, name: string) => {
    if (!isAdmin) {
      toast.error("Access denied: Admin permissions required");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: false } : m))
    );
    toast.success(`Deactivated team member: ${name}`);
  };

  const handleActivate = (id: string, name: string) => {
    if (!isAdmin) {
      toast.error("Access denied: Admin permissions required");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: true } : m))
    );
    toast.success(`Activated team member: ${name}`);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const groupedUsers = React.useMemo(() => {
    const groups: Record<string, Member[]> = {
      executives: [],
      agents: [],
      clients: [],
    };

    members.forEach(member => {
      const userRoles = member.roles.map(r => r.role.name);
      const hasExecutiveRole = userRoles.some(role =>
        ['superadmin', 'super_admin', 'admin'].includes(role)
      );
      const hasAgentRole = userRoles.some(role =>
        ['agent', 'sales_agent', 'support_agent', 'hr_agent', 'employee'].includes(role)
      );
      const hasClientRole = userRoles.includes('client');

      if (hasExecutiveRole) {
        groups.executives.push(member);
      } else if (hasAgentRole) {
        groups.agents.push(member);
      } else if (hasClientRole) {
        groups.clients.push(member);
      }
    });

    return groups;
  }, [members]);

  const getRoleBadge = (member: Member) => {
    const userRoles = member.roles.map(r => r.role.name);
    const primaryRole = userRoles.find(role => ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY]) || userRoles[0];
    const roleConfig = ROLE_HIERARCHY[primaryRole as keyof typeof ROLE_HIERARCHY];
    const Icon = roleConfig?.icon || User;

    return (
      <div className={`inline-flex items-center gap-1.5 rounded-lg ${roleConfig?.bgColor || 'bg-slate-100'} ${roleConfig?.borderColor || 'border-slate-200'} border px-2.5 py-1 text-xs font-semibold`}>
        <Icon className={`h-3.5 w-3.5 ${roleConfig?.color || 'text-slate-600'}`} />
        <span className={`${roleConfig?.color || 'text-slate-700'}`}>
          {roleConfig?.department ? `${roleConfig.department} Agent` : primaryRole}
        </span>
        {userRoles.length > 1 && (
          <span className="text-slate-400">+{userRoles.length - 1}</span>
        )}
      </div>
    );
  };

  const UserRow = ({ member }: {
    member: Member;
  }) => (
    <div className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/10 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{member.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{member.email}</div>
            {member.phone && (
              <div className="text-xs text-slate-400 dark:text-slate-500">{member.phone}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {getRoleBadge(member)}
          <div className="flex items-center gap-2">
            {member.isActive ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                <BadgeCheck className="h-3.5 w-3.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-500 font-medium text-xs">
                <CircleAlert className="h-3.5 w-3.5" />
                Inactive
              </span>
            )}
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleEdit(member)}
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                {member.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleDeactivate(member.id, member.name)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleActivate(member.id, member.name)}
                  >
                    Activate
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Users" }]}
        actionSlot={
          isAdmin ? (
            <Button size="sm" onClick={() => { setEditingUser(null); setSheetOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          ) : undefined
        }
      />

      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Workspace Users</CardTitle>
            <CardDescription>
              Manage security access, roles, and session states for members within your organization.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {!hasPermission('hr:read') ? (
            <div className="text-center py-12">
              <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Access Restricted</h3>
              <p className="text-slate-500">You don't have permission to view users. Contact your administrator.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Executives Group */}
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup('executives')}
                  className="w-full flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div className="text-left">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100">Executives</h3>
                      <p className="text-xs text-purple-600 dark:text-purple-400">Superadmins & Admins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                      {groupedUsers.executives.length}
                    </span>
                    {expandedGroups.executives ? <ChevronDown className="h-4 w-4 text-purple-600" /> : <ChevronRight className="h-4 w-4 text-purple-600" />}
                  </div>
                </button>
                {expandedGroups.executives && (
                  <div className="divide-y divide-purple-100 dark:divide-purple-900/30">
                    {groupedUsers.executives.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No executives found</div>
                    ) : (
                      groupedUsers.executives.map((member) => (
                        <UserRow key={member.id} member={member} />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Agents Group */}
              <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup('agents')}
                  className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-left">
                      <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Agents & Employees</h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Sales, Support, HR, Staff</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                      {groupedUsers.agents.length}
                    </span>
                    {expandedGroups.agents ? <ChevronDown className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-emerald-600" />}
                  </div>
                </button>
                {expandedGroups.agents && (
                  <div className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
                    {groupedUsers.agents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No agents found</div>
                    ) : (
                      groupedUsers.agents.map((member) => (
                        <UserRow key={member.id} member={member} />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Clients Group */}
              <div className="border border-orange-200 dark:border-orange-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup('clients')}
                  className="w-full flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <div className="text-left">
                      <h3 className="font-semibold text-orange-900 dark:text-orange-100">Client Accounts</h3>
                      <p className="text-xs text-orange-600 dark:text-orange-400">External portal users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                      {groupedUsers.clients.length}
                    </span>
                    {expandedGroups.clients ? <ChevronDown className="h-4 w-4 text-orange-600" /> : <ChevronRight className="h-4 w-4 text-orange-600" />}
                  </div>
                </button>
                {expandedGroups.clients && (
                  <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
                    {groupedUsers.clients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No clients found</div>
                    ) : (
                      groupedUsers.clients.map((member) => (
                        <UserRow key={member.id} member={member} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        user={editingUser}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
