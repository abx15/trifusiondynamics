import Link from "next/link";
import { ArrowRight, Sparkles, Bot, Globe2, Layers3 } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#070a13] pb-20 pt-14 sm:pb-24 lg:pt-16">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 h-[250px] w-[250px] rounded-full bg-secondary/15 blur-[100px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px] 2xl:px-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10 2xl:gap-16">
          
          {/* Hero Text */}
          <div className="flex flex-col items-center text-center lg:col-span-7 lg:items-start lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Software development for ambitious businesses
            </div>

            <h1 className="mb-6 max-w-3xl text-4xl font-display font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl 2xl:text-7xl">
              Digital products that{" "}
              <span className="text-gradient-cyan-blue">move business forward.</span>
            </h1>

            <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg lg:text-xl">
              From polished websites and mobile apps to AI-powered software, we design and build digital products around the way your business works.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="group relative inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-7 py-4 text-base font-semibold text-black transition-all hover:opacity-90 active:scale-98 sm:w-auto"
              >
                Book a Free Consultation
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/10 active:scale-98 sm:w-auto"
              >
                Explore Case Studies
              </Link>
            </div>

            {/* What We Focus On */}
            <div className="mt-12 grid w-full max-w-2xl grid-cols-2 gap-5 border-t border-white/5 pt-8 sm:grid-cols-4 sm:gap-6">
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">SaaS</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Platforms</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">AI</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Applications</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">API</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Development</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-white">Custom</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Systems</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Built with</span>
              {["Next.js", "TypeScript", "PostgreSQL", "React Native"].map((co) => (
                <span
                  key={co}
                  className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10"
                >
                  {co}
                </span>
              ))}
            </div>
          </div>

          {/* Visual Interactive Mockup Frame */}
          <div className="relative mx-auto aspect-square w-full max-w-[480px] lg:col-span-5 lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 blur-2xl" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/30 via-primary/5 to-secondary/30 p-px shadow-2xl shadow-primary/5">
              <div className="flex h-full w-full flex-col justify-between rounded-[23px] border border-white/5 bg-[#0c1220]/95 p-5 backdrop-blur-xl sm:p-7">
                {/* Simulated Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500" />
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-mono text-slate-500">
                    PRODUCT ARCHITECTURE
                  </div>
                </div>

                {/* Simulated Metrics Card */}
                <div className="flex-1 flex flex-col justify-center gap-4 py-6">
                  <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400">INTELLIGENT SOFTWARE</p>
                      <p className="mt-1 text-base font-bold text-white sm:text-lg">AI that works with your data</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <Layers3 className="mb-2 h-5 w-5 text-secondary" />
                      <p className="text-[10px] text-slate-500">PRODUCTS</p>
                      <p className="text-sm font-bold text-white sm:text-base">Web &amp; SaaS</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <Globe2 className="mb-2 h-5 w-5 text-accent" />
                      <p className="text-[10px] text-slate-500">EXPERIENCES</p>
                      <p className="text-sm font-bold text-white sm:text-base">Mobile &amp; AI</p>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Made for your next stage
                  </span>
                  <span className="font-mono text-slate-500">India &amp; worldwide</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
