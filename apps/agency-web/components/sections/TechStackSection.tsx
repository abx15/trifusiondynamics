"use client";

import * as React from "react";
import { Cpu, Database, Server, Cloud, ShieldCheck, Zap, Code2, Bot, Layers } from "lucide-react";

const TECH_STACK = [
  {
    category: "Frontend & Web Apps",
    icon: Code2,
    description: "Ultra-fast Next.js 14 & React SSR platforms with Tailwind CSS and responsive glassmorphism UI.",
    technologies: ["Next.js 14", "React 18", "TypeScript", "TailwindCSS", "Zustand", "PWA"],
    badge: "Sub-1s Load Time",
    gradient: "from-cyan-500/20 to-blue-500/10",
    borderColor: "border-cyan-500/30",
  },
  {
    category: "Backend & Microservices",
    icon: Server,
    description: "Robust NestJS, Node.js, and Python FastAPI microservices built with strict OpenAPI Swagger contracts.",
    technologies: ["NestJS", "FastAPI", "Node.js", "GraphQL", "Swagger / OpenAPI", "gRPC"],
    badge: "10k+ Concurrency",
    gradient: "from-purple-500/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    category: "AI & Vector Search (RAG)",
    icon: Bot,
    description: "Custom Retrieval-Augmented Generation, pgvector embeddings, and LLM orchestration with LangChain.",
    technologies: ["pgvector", "LangChain", "OpenAI / Claude", "ChromaDB", "Python", "LlamaIndex"],
    badge: "99.4% Extraction Accuracy",
    gradient: "from-emerald-500/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    category: "Database & Caching",
    icon: Database,
    description: "High-throughput PostgreSQL databases paired with Redis distributed caching and MongoDB activity logs.",
    technologies: ["PostgreSQL", "Redis", "MongoDB", "Prisma ORM", "TypeORM", "pg_stat"],
    badge: "Sub-30ms Query Latency",
    gradient: "from-amber-500/20 to-orange-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    category: "Cloud Infrastructure & DevOps",
    icon: Cloud,
    description: "Containerized Docker and Kubernetes deployments orchestrated with Nginx reverse proxies & CI/CD.",
    technologies: ["Docker", "Kubernetes", "AWS / GCP", "Nginx", "GitHub Actions", "Terraform"],
    badge: "99.9% SLA Uptime",
    gradient: "from-blue-500/20 to-indigo-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    category: "Enterprise Security & Auth",
    icon: ShieldCheck,
    description: "Bank-grade JWT access token rotation, RBAC permission matrices, rate limiting, and SSL encryption.",
    technologies: ["JWT Rotation", "RBAC Auth", "Bcrypt", "Helmet", "OWASP Compliant", "CORS Policy"],
    badge: "Enterprise Grade",
    gradient: "from-rose-500/20 to-red-500/10",
    borderColor: "border-rose-500/30",
  },
];

export default function TechStackSection() {
  return (
    <section className="w-full py-20 lg:py-28 bg-[#070a13] relative overflow-hidden border-t border-white/5">
      {/* Glow Effects */}
      <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 h-[300px] w-[300px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400 backdrop-blur-md">
            <Zap className="h-3.5 w-3.5" />
            Cutting-Edge Tech Stack
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Engineered with Modern <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              High-Performance Architecture
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            We don&apos;t just write code — we design scalable microservices, integrated AI intelligence, and enterprise-grade security protocols tailored for high-growth tech platforms.
          </p>
        </div>

        {/* 6 Tech Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TECH_STACK.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className={`group relative rounded-3xl border ${item.borderColor} bg-gradient-to-b ${item.gradient} p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {item.category}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                {/* Tech Pills */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  {item.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-black/40 text-slate-300 border border-white/5"
                    >
                      {tech}
                    </span>
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
