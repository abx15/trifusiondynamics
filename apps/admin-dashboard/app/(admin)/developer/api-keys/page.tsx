"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type ApiKey } from "@/lib/hooks/useDeveloper";
import { toast } from "@/lib/toast";
import { ShieldAlert, Key, Copy, Eye, EyeOff, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";

const SCOPES = [
  { label: "CRM Read", value: "crm:read" },
  { label: "CRM Write", value: "crm:write" },
  { label: "HR Read", value: "hr:read" },
  { label: "HR Write", value: "hr:write" },
  { label: "Payroll Read", value: "payroll:read" },
  { label: "Payroll Write", value: "payroll:write" },
  { label: "Billing Read", value: "billing:read" },
  { label: "Billing Write", value: "billing:write" },
];

export default function ApiKeysPage() {
  const { data: apiKeys = [], isLoading, refetch } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  // Create Form State
  const [name, setName] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([]);
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null);

  // Revoke Dialog State
  const [revokeTargetId, setRevokeTargetId] = React.useState<string | null>(null);

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSelectAllScopes = () => {
    if (selectedScopes.length === SCOPES.length) {
      setSelectedScopes([]);
    } else {
      setSelectedScopes(SCOPES.map((s) => s.value));
    }
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a name for the API key.");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope.");
      return;
    }

    createKey.mutate(
      { name, scopes: selectedScopes },
      {
        onSuccess: (data) => {
          setNewlyCreatedKey(data.rawKey);
          toast.success("API key generated successfully!");
          setName("");
          setSelectedScopes([]);
          refetch();
        },
        onError: () => {
          toast.error("Failed to generate API key.");
        },
      }
    );
  };

  const handleCopyNewKey = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    toast.success("API key copied to clipboard!");
  };

  const handleConfirmRevoke = () => {
    if (!revokeTargetId) return;

    revokeKey.mutate(revokeTargetId, {
      onSuccess: () => {
        toast.success("API key revoked successfully.");
        setRevokeTargetId(null);
        refetch();
      },
      onError: () => {
        toast.error("Failed to revoke API key.");
      },
    });
  };

  const columns = [
    {
      key: "name",
      header: "Key Identifier",
      render: (row: ApiKey) => (
        <div>
          <p className="font-bold text-foreground">{row.name}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Prefix: {row.keyPrefix}...</p>
        </div>
      ),
    },
    {
      key: "scopes",
      header: "Permissions Scopes",
      render: (row: ApiKey) => (
        <div className="flex flex-wrap gap-1">
          {row.scopes.map((sc) => (
            <span key={sc} className="text-[9px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-foreground px-1.5 py-0.5 rounded">
              {sc}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "lastUsedAt",
      header: "Last Active",
      render: (row: ApiKey) => (
        <span className="text-xs text-muted-foreground">
          {row.lastUsedAt
            ? new Date(row.lastUsedAt).toLocaleDateString()
            : "Never Used"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: ApiKey) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row: ApiKey) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRevokeTargetId(row.id)}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 p-1.5 h-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-xs font-sans">
      <PageHeader
        title="API Keys Manager"
        breadcrumbs={[{ label: "Developer Tools" }, { label: "Security" }, { label: "API Keys" }]}
      />

      {/* Warning Panel */}
      <Card className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/30 shadow-xs flex flex-row items-start p-4 gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed text-amber-700 dark:text-amber-400/90 text-xs">
          <p className="font-bold uppercase tracking-wider text-[10px]">API Security Warning</p>
          <p>
            API secret tokens grant programmatic access to your organization's records. Do not commit keys to GitHub, share them in front-end client bundles, or post them publicly. Revoke exposed tokens immediately.
          </p>
        </div>
      </Card>

      {/* Success banner once key is generated */}
      {newlyCreatedKey && (
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-900/30 shadow-md p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-emerald-800 dark:text-emerald-400">
              <p className="font-bold text-sm">Key Generated Successfully!</p>
              <p className="text-xs text-muted-foreground">
                Copy this secret token now. You will not be able to retrieve or view it again after closing this window.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-w-xl">
            <Input
              type="text"
              readOnly
              value={newlyCreatedKey}
              className="font-mono text-xs text-foreground bg-card border border-emerald-300 dark:border-emerald-900 pr-10 shrink"
            />
            <Button size="sm" onClick={handleCopyNewKey} className="gap-1.5 shrink-0">
              <Copy className="h-4 w-4" />
              Copy Key
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNewlyCreatedKey(null)} className="shrink-0">
              Close
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create API Key Form */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle>Create Secret Token</CardTitle>
              <CardDescription>Generate scoped secret tokens to connect external systems.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateKey} className="space-y-4">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Key Label *</label>
                  <Input
                    type="text"
                    placeholder="e.g. CI/CD Deployment Sync"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                {/* Scopes Selection Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Scopes Selection *</label>
                    <button
                      type="button"
                      onClick={handleSelectAllScopes}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      {selectedScopes.length === SCOPES.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border border-border bg-card p-3 rounded-lg max-h-48 overflow-y-auto">
                    {SCOPES.map((sc) => {
                      const isChecked = selectedScopes.includes(sc.value);
                      return (
                        <div
                          key={sc.value}
                          onClick={() => handleScopeToggle(sc.value)}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer border hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${
                            isChecked
                              ? "bg-slate-100/70 dark:bg-zinc-800/80 border-primary"
                              : "border-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="pointer-events-none rounded border-gray-300"
                          />
                          <span className="text-[10px] font-semibold text-foreground">{sc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={createKey.isPending || !name.trim() || selectedScopes.length === 0}
                  className="w-full gap-2"
                >
                  {createKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generate Token Prefix
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Existing API Keys Table */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle>Active Key Directory</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DataTable
                columns={columns}
                data={apiKeys}
                isLoading={isLoading}
                emptyMessage="No secret keys created yet."
              />
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Revoke Confirm Dialog */}
      <ConfirmDialog
        open={!!revokeTargetId}
        onClose={() => setRevokeTargetId(null)}
        onConfirm={handleConfirmRevoke}
        loading={revokeKey.isPending}
        title="Revoke API Key"
        description="Are you sure you want to revoke this secret token? Programmatic calls currently utilizing this token prefix will instantly return 401 Unauthorized errors."
        confirmLabel="Revoke Key"
        destructive={true}
      />
    </div>
  );
}
