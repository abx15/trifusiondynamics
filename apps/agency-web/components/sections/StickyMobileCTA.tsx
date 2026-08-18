"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

export default function StickyMobileCTA() {
  const pathname = usePathname();

  // Hide on contact page itself so we don't duplicate CTA
  if (pathname === "/contact") {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#070a13]/95 border-t border-white/10 p-3.5 backdrop-blur-xl shadow-2xl shadow-black">
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-tight">Ready to build?</p>
            <p className="text-[10px] text-slate-400">Free 30-min consultation</p>
          </div>
        </div>

        <Link
          href="/contact"
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-gradient-to-r from-primary to-secondary text-xs sm:text-sm font-bold text-black shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          <span>Get a Free Quote</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
