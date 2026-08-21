"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Case Studies" },
  { href: "/blog", label: "Insights" },
  { href: "/about", label: "About Us" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#070a13]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl overflow-hidden">
            <Image 
              src="/logo.png" 
              alt="Trifusion Dynamics Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
          </div>
          <span className="font-display font-bold tracking-tight text-white text-lg sm:text-xl">
            Trifusion<span className="text-primary font-normal">Dynamics</span>
          </span>
        </Link>

        {/* Desktop Nav — visible lg+ only */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(link.href) ? "text-primary font-semibold" : "text-slate-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Call to Action — visible lg+ only */}
        <div className="hidden lg:flex items-center gap-5">
          <a
            href={`${process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "http://localhost:3001"}/login`}
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Login
          </a>
          <Link
            href="/contact"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95"
          >
            Book Consultation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Mobile hamburger button — hidden lg+ */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex lg:hidden h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer — full-screen overlay, hidden lg+ */}
      <div
        id="mobile-nav"
        className={`fixed inset-x-0 top-[64px] sm:top-[80px] bottom-0 z-40 bg-[#070a13]/97 backdrop-blur-xl lg:hidden transition-all duration-300 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full p-6 sm:p-8 border-t border-white/5 overflow-y-auto">
          <nav className="flex flex-col gap-2 flex-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center text-lg font-medium transition-colors border-b border-white/5 py-4 min-h-[56px] ${
                  isActive(link.href) ? "text-primary font-semibold" : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`${process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "http://localhost:3001"}/login`}
              onClick={() => setIsOpen(false)}
              className="flex items-center text-lg font-medium text-slate-400 hover:text-white transition-colors border-b border-white/5 py-4 min-h-[56px]"
            >
              Login
            </a>
          </nav>


          {/* Mobile CTA at bottom of drawer */}
          <div className="pt-6 pb-safe">
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary py-4 text-center font-semibold text-black min-h-[56px] active:scale-95 transition-transform"
            >
              Book Consultation
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
