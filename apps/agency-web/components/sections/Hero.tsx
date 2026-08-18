import Link from "next/link";
import { ArrowRight, Sparkles, Code2, Database, Bot } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32 bg-[#070a13]">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 h-[250px] w-[250px] rounded-full bg-secondary/15 blur-[100px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 text-center lg:text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Text */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6 backdrop-blur-sm animate-pulse">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Native Software Agency
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              AI-Native SaaS Platforms, <br />
              <span className="text-gradient-cyan-blue">Engineered for Scale.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl lg:max-w-xl leading-relaxed mb-8">
              We design and construct high-performance full-stack web applications and integrate custom RAG pipelines to accelerate operations for Indian startups and SMBs.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="group relative inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full bg-gradient-to-r from-primary to-secondary px-7 py-4 text-base font-semibold text-black transition-all hover:opacity-90 active:scale-98"
              >
                Book a Free Consultation
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10 hover:border-white/20 active:scale-98"
              >
                Explore Case Studies
              </Link>
            </div>

            {/* Micro Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/5 pt-10 mt-12 w-full max-w-lg">
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">50+</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Enterprise Apps</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">99.9%</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">SLA Uptime</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">10k+</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Concurrent Users</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">&lt;30ms</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">API Latency</p>
              </div>
            </div>

            {/* Trusted-by badges */}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Trusted by:</span>
              {["Apex Retail", "Zeta Fintech", "Vishwa Ventures", "Triflow Tech", "Medikart"].map((co) => (
                <span
                  key={co}
                  className="inline-block px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium hover:bg-white/10 transition-colors"
                >
                  {co}
                </span>
              ))}
            </div>
          </div>

          {/* Visual Interactive Mockup Frame */}
          <div className="lg:col-span-5 relative w-full aspect-square max-w-[420px] lg:max-w-none mx-auto">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/10 to-secondary/10 p-1">
              <div className="h-full w-full rounded-[22px] bg-[#0c1220]/90 backdrop-blur-xl border border-white/5 p-6 flex flex-col justify-between">
                {/* Simulated Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500" />
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="rounded-full bg-white/5 px-3 py-0.5 text-[10px] text-slate-500 font-mono">
                    api.trifusion.ai
                  </div>
                </div>

                {/* Simulated Metrics Card */}
                <div className="flex-1 flex flex-col justify-center gap-4 py-6">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">AI AGENT LOAD</p>
                      <p className="text-lg font-bold text-white font-mono">Active (RAG Live)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                      <Code2 className="h-5 w-5 text-secondary mb-2" />
                      <p className="text-[10px] text-slate-500">API INTEGRITY</p>
                      <p className="text-base font-bold text-white font-mono">100% Passed</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                      <Database className="h-5 w-5 text-accent mb-2" />
                      <p className="text-[10px] text-slate-500">VECTOR SYNC</p>
                      <p className="text-base font-bold text-white font-mono">pgvector Active</p>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    Operational
                  </span>
                  <span className="font-mono text-slate-500">v1.2.0-stable</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
