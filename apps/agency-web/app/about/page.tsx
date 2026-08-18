import { getCmsPage } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Target, Shield, Zap, Sparkles } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = constructMetadata({
  title: "About Us | Our Story & Engineering Philosophy",
  description: "Trifusion Dynamics is an elite full-stack and AI engineering agency. Meet our principles, design rules, and core methodology.",
  slug: "about",
});

export default async function AboutPage() {
  const pageData = await getCmsPage("about-us");

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-20 right-10 h-[300px] w-[300px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">About Trifusion</span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mt-3 mb-6 tracking-tight">
            {pageData.title === "Home" ? "About Us" : pageData.title}
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            We are a dedicated team of engineers, cloud architects, and AI researchers. We focus on transforming complex backend requirements into highly responsive, premium products.
          </p>
        </div>

        {/* Dynamic CMS Copy */}
        {pageData.content && (
          <div className="glass-panel rounded-3xl p-8 border border-white/5 mb-16 text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl">
            <p className="font-mono text-xs text-primary mb-3">// CMS BACKEND COPY</p>
            {pageData.content}
          </div>
        )}

        {/* Vision & Core Methodology */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-[#0f172a]/30">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-6">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-white text-lg mb-3">Our Objective</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              To strip away complex software layers and build fast, responsive, and robust applications that solve core business constraints.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-[#0f172a]/30">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-6">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-white text-lg mb-3">Performance Focus</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Uptime, sub-second API latencies, and high compression rates. We believe performance is the most critical feature of any product.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-[#0f172a]/30">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-6">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-white text-lg mb-3">Security & Trust</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              We design multi-tenant architectures, secure API keys, and RAG document flows ensuring enterprise compliance and absolute data privacy.
            </p>
          </div>
        </div>

        {/* Brand Showcase Section */}
        <div className="glass-panel rounded-3xl p-10 sm:p-16 border border-white/10 bg-gradient-to-br from-[#0c1220] via-[#0f172a]/60 to-[#070a13] text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Trifusion Dynamics Core
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-4">
            Custom Software, Built for Results
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            From Indiranagar, Bengaluru, we consult and build platforms for clients globally. By pairing cutting-edge AI integrations with battle-tested database indexes, we guarantee products that are durable and high-performing.
          </p>
        </div>

      </div>
    </div>
  );
}
