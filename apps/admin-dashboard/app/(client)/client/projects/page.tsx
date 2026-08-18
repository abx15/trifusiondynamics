"use client";

import { FolderKanban, CheckCircle, Clock, FileText, ExternalLink } from "lucide-react";

export default function ClientProjectsPage() {
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
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                SaaS Core Build
              </span>
              <h2 className="text-xl font-bold text-white mt-2">Triflow SaaS Portal & Mobile App</h2>
              <p className="text-xs text-zinc-400 mt-1">Lead Architect: Arun Kumar | Tech Stack: Next.js 15, NestJS, Prisma</p>
            </div>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open Staging Preview
            </a>
          </div>

          {/* Sprints & Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                <CheckCircle className="w-4 h-4" /> Sprint 1: Auth & Gateway
              </div>
              <p className="text-xs text-zinc-400">JWT authentication, multi-role RBAC security & NextAuth integration.</p>
              <span className="mt-3 block text-[10px] text-emerald-400 uppercase font-bold">Status: Completed</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-2">
                <Clock className="w-4 h-4" /> Sprint 2: Support Helpdesk
              </div>
              <p className="text-xs text-zinc-400">Support tickets, client dashboard, worker allocation & reply logs.</p>
              <span className="mt-3 block text-[10px] text-purple-400 uppercase font-bold">Status: In Progress (75%)</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-2">
                <FileText className="w-4 h-4" /> Sprint 3: AI RAG Search
              </div>
              <p className="text-xs text-zinc-400">PostgreSQL pgvector database, document chunking & AI summary agent.</p>
              <span className="mt-3 block text-[10px] text-zinc-500 uppercase font-bold">Status: Scheduled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
