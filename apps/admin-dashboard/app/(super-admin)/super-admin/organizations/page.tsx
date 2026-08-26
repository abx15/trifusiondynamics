"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Users,
  Search,
  ExternalLink,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Activity,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count?: {
    users: number;
  };
}

export default function SuperAdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/users/organizations");
      if (res.data) {
        setOrganizations(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setIsSubmitting(true);
      const slug = newOrgSlug.trim() || newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const res = await apiClient.post("/users/organizations", {
        name: newOrgName.trim(),
        slug,
      });

      toast.success(`Organization "${newOrgName}" created successfully!`);
      setNewOrgName("");
      setNewOrgSlug("");
      setIsCreateOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      console.error("Error creating organization:", err);
      toast.error(err?.response?.data?.message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
            <Building2 className="w-3 h-3" /> Tenancy Management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Organizations & Tenants
          </h1>
          <p className="text-xs text-zinc-400">
            Manage multi-tenant workspaces, view organization users, and provision new instances.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Provision New Organization
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search organizations by name or slug..."
          className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
        />
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" /> Provision Organization
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    if (!newOrgSlug) {
                      setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Domain / Slug
                </label>
                <input
                  type="text"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="acme-corp"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs text-black font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organizations Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <p className="text-zinc-400 text-sm">No organizations found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => (
            <div
              key={org.id}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Activity className="w-3 h-3" /> Active
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-white">{org.name}</h3>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">/{org.slug}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <strong className="text-white">{org._count?.users ?? 0}</strong> members
                </span>
                <span className="text-[11px] text-zinc-500">
                  {new Date(org.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
