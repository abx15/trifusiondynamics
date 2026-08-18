"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useClients } from "@/lib/hooks/useClients";
import { DataTable } from "@/components/shared/DataTable";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useClients({ search: debouncedSearch || undefined, limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total clients</p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Client
        </Link>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Search clients..."
        />
      </div>

      <DataTable
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(c) => router.push(`/clients/${c.id}`)}
        columns={[
          { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "company", header: "Company", render: (c) => c.company ?? "—" },
          { key: "email", header: "Email", render: (c) => c.email ?? "—" },
          { key: "phone", header: "Phone", render: (c) => c.phone ?? "—" },
          { key: "city", header: "City", render: (c) => c.city ?? "—" },
          {
            key: "createdAt",
            header: "Since",
            render: (c) =>
              new Date(c.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
          },
        ]}
        emptyMessage="No clients found. Add your first client."
      />
    </div>
  );
}
