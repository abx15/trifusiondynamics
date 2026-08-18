import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-20 bg-[#070a13] relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-5xl px-6 sm:px-8 relative">
        <div className="glass-panel rounded-3xl p-10 sm:p-16 text-center border border-white/10 bg-gradient-to-br from-[#0c1220] via-[#0f172a]/60 to-[#070a13]">
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight mb-6">
            Ready to Build Your <span className="text-gradient-cyan-blue">Next-Gen Platform?</span>
          </h2>
          
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Schedule a free consultation to map your architecture, discuss vector databases/AI agents, or scope a full-stack SaaS engineering project.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/contact"
              className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-base font-semibold text-black transition-all hover:opacity-90 active:scale-98"
            >
              Book a Free Consultation
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/portfolio"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10 active:scale-98"
            >
              Explore Our Work
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
