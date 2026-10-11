"use client";

import { FolderKanban, CheckCircle, Clock, FileText, ExternalLink } from "lucide-react";
import { useProjects, type Project } from "@/lib/hooks/useProjects";
import { useAuthStore } from "@/lib/auth-store";

export default function ClientProjectsPage() {
  const user = useAuthStore((state) => state.user);
  const clientId = user?.linkedClientId ?? undefined;
  const { data: projectsData, isLoading } = useProjects({ clientId, limit: 20 });
  const projects = projectsData?.data || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-purple-400" /> Active Projects & Deliverables
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor real-time development milestones, active sprint timelines, and access staging deployment previews.
        </p>
      </div>

      {/* Projects List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-zinc-950/80 border border-zinc-800 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center text-zinc-400">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-sm">No projects found</p>
            <p className="text-xs text-zinc-500 mt-1">Your projects will appear here once assigned by the admin team.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project: Project) => (
              <div key={project.id} className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      project.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" :
                      project.status === "PLANNING" ? "bg-blue-500/20 text-blue-300" :
                      project.status === "ON_HOLD" ? "bg-amber-500/20 text-amber-300" :
                      project.status === "COMPLETED" ? "bg-purple-500/20 text-purple-300" :
                      "bg-rose-500/20 text-rose-300"
                    }`}>
                      {project.status.replace(/_/g, " ")}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-2">{project.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{project.description || "No description available"}</p>
                  </div>
                  {project.startDate && (
                    <a
                      href={process.env.NEXT_PUBLIC_AGENCY_WEB_URL || (process.env.NODE_ENV === "production" ? "https://trifusiondynamics.vercel.app" : "http://localhost:3000")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Staging Preview
                    </a>
                  )}
                </div>

                {/* Milestones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.milestones && project.milestones.length > 0 ? (
                    project.milestones.map((milestone, idx) => (
                      <div key={milestone.id} className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                        <div className="flex items-center gap-2 text-xs font-bold mb-2">
                          {milestone.completed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-purple-400" />
                          )}
                          <span>{milestone.completed ? "Completed" : `Milestone ${idx + 1}`}</span>
                        </div>
                        <p className="text-xs text-zinc-400">Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "TBD"}</p>
                        <span className="mt-3 block text-[10px] uppercase font-bold">
                          {milestone.completed ? (
                            <span className="text-emerald-400">Status: Completed</span>
                          ) : (
                            <span className="text-purple-400">Status: In Progress</span>
                          )}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center text-zinc-400 text-sm">
                      No milestones defined yet
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
