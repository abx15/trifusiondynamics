"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  Lock,
  Plus,
  Crown,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  roles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
}

const AVAILABLE_ROLES = [
  { name: "superadmin", label: "Super Admin" },
  { name: "admin", label: "Admin" },
  { name: "sales_agent", label: "Sales Agent" },
  { name: "support_agent", label: "Support Agent" },
  { name: "hr_agent", label: "HR Agent" },
  { name: "agent", label: "General Agent" },
  { name: "employee", label: "Employee" },
  { name: "client", label: "Client" },
];

export default function SuperAdminRBACPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/users");
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenEdit = (u: UserRecord) => {
    setSelectedUser(u);
    setEditRoles(u.roles.map((r) => r.role.name));
    setNewPassword("");
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setIsUpdating(true);
      const payload: any = {
        roles: editRoles,
        isActive: selectedUser.isActive,
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      await apiClient.patch(`/users/${selectedUser.id}`, payload);
      toast.success(`User ${selectedUser.email} updated successfully!`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Failed to update user:", err);
      toast.error(err?.response?.data?.message || "Failed to update user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (user: UserRecord) => {
    try {
      await apiClient.patch(`/users/${user.id}`, {
        isActive: !user.isActive,
      });
      toast.success(`User ${user.email} ${!user.isActive ? "activated" : "deactivated"}`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update user status");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.roles.some((r) => r.role.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
            <KeyRound className="w-3 h-3" /> RBAC & Security Control
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Universal Roles & Permissions
          </h1>
          <p className="text-xs text-zinc-400">
            Full root authority to inspect, grant permissions, re-assign roles, and reset user access.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email, name, or role..."
          className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
        />
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" /> Manage Roles & Access
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Assign Roles (Multi-Role Support)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.map((r) => {
                    const isChecked = editRoles.includes(r.name);
                    return (
                      <label
                        key={r.name}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditRoles([...editRoles, r.name]);
                            } else {
                              setEditRoles(editRoles.filter((item) => item !== r.name));
                            }
                          }}
                          className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                        />
                        <span className="font-semibold">{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New secure password"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs text-black font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Assigned Roles</th>
                  <th className="p-4">Organization</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-zinc-400 font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r.role.id}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ['superadmin', 'super_admin'].includes(r.role.name)
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : r.role.name === "admin"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {r.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">
                      {u.organization?.name || "TFX AI Demo Org"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          u.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                        }`}
                      >
                        {u.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-300 transition-all cursor-pointer inline-flex items-center gap-1.5 font-semibold text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Roles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
