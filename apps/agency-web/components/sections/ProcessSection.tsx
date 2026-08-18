"use client";

import * as React from "react";
import { Compass, Code, Rocket, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Discovery & Architecture",
    description: "We analyze your business model, system requirements, data schema, and security prerequisites to construct a detailed architectural roadmap.",
    icon: Compass,
    highlights: ["Data Flow Mapping", "Database Schema Design", "Tech Stack Selection"],
    gradient: "from-blue-500/20 to-cyan-500/10",
  },
  {
    step: "02",
    title: "Agile Development & AI Integration",
    description: "Iterative 2-week sprints with clean NestJS microservices, responsive React/Next.js frontends, and pgvector RAG pipeline integration.",
    icon: Code,
    highlights: ["2-Week Sprints", "Full-Stack Codebase", "RAG Vector Pipelines"],
    gradient: "from-purple-500/20 to-indigo-500/10",
  },
  {
    step: "03",
    title: "Rigorous QA & Cloud Deployment",
    description: "Comprehensive automated e2e testing, load stress verification, Docker containerization, and zero-downtime Nginx deployment.",
    icon: Rocket,
    highlights: ["Automated E2E Testing", "Docker Containerization", "Zero-Downtime Release"],
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  {
    step: "04",
    title: "24/7 SLA Monitoring & Support",
    description: "Continuous health tracking, automated backup policies, Dedicated Client Portal access, and fast SLA support response guarantees.",
    icon: ShieldCheck,
    highlights: ["99.9% Uptime SLA", "Dedicated Client Portal", "Fast Ticket SLA"],
    gradient: "from-amber-500/20 to-orange-500/10",
  },
];

export default function ProcessSection() {
  return (
    <section className="w-full py-20 lg:py-28 bg-[#0b0f19] relative overflow-hidden border-t border-white/5">
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            Our Proven Execution Model
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight">
            How We Build & Scale <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Enterprise SaaS Products
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            From initial software specification to live production deployment and SLA maintenance, we handle the complete lifecycle.
          </p>
        </div>

        {/* 4 Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className={`relative rounded-3xl border border-white/10 bg-gradient-to-b ${s.gradient} p-6 backdrop-blur-xl flex flex-col justify-between group hover:border-white/20 transition-all duration-300`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-display font-black text-white/30 group-hover:text-white/60 transition-colors">
                      {s.step}
                    </span>
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-6">{s.description}</p>
                </div>

                {/* Highlights */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  {s.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 text-[11px] text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
