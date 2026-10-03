import Link from "next/link";
import { Metadata } from "next";
import { Home, ArrowLeft, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "404 – Page Not Found | Trifusion Dynamics",
  description: "The page you're looking for doesn't exist. Head back to Trifusion Dynamics homepage.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#070a13] px-6">
      {/* Decorative glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Glitchy 404 */}
        <p
          className="text-[120px] sm:text-[160px] font-display font-extrabold leading-none select-none"
          style={{
            background:
              "linear-gradient(135deg, #00d4aa 0%, #7c3aed 50%, #00d4aa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </p>

        <div className="mt-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            Looks like this URL wandered into the void. The page you&apos;re
            looking for may have been moved, renamed, or never existed.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-all active:scale-95"
          >
            <Search className="h-4 w-4" />
            Browse Services
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Contact Us
          </Link>
        </div>

        {/* Divider */}
        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-xs text-slate-600 font-mono">
            Error 404 · Trifusion Dynamics ·{" "}
            <a
              href="mailto:support.trifusion@gmail.com"
              className="hover:text-primary transition-colors"
            >
              support.trifusion@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
