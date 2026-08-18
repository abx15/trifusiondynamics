"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Briefcase } from "lucide-react";
import { useProjects } from "@/lib/hooks/useProjects";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useProjects({ limit: 50 });

  const filtered = (data?.data ?? []).filter(
    (p) =>
      !debouncedSearch ||
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total projects</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Search projects..."
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Briefcase className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No projects found.</p>
          <Link href="/projects/new" className="text-primary text-sm font-medium">
            + Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="text-left rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-snug">{project.name}</p>
                <StatusBadge status={project.status} />
              </div>

              {project.client && (
                <p className="text-xs text-muted-foreground truncate">{project.client.name}</p>
              )}

              <div className="flex items-center justify-between">
                <StatusBadge status={project.priority} size="sm" />
                {project.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Due {new Date(project.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>

              {project._count?.tasks !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {project._count.tasks} tasks
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
