"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, ExternalLink, ChevronDown } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { SERVICES_DATA } from "@/lib/cms-static-data";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Case Studies" },
  { href: "/blog", label: "Insights" },
  { href: "/about", label: "About Us" },
];

const SERVICES_BY_CATEGORY = SERVICES_DATA.reduce<Map<string, typeof SERVICES_DATA>>(
  (groups, service) => {
    const category = service.category || "Other Services";
    groups.set(category, [...(groups.get(category) || []), service]);
    return groups;
  },
  new Map(),
);

const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://trifusiondynamicsadmin.vercel.app"
    : "http://localhost:3001");

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const servicesCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOpenedRef = useRef(false);

  const openServicesMenu = () => {
    if (servicesCloseTimeoutRef.current) {
      clearTimeout(servicesCloseTimeoutRef.current);
      servicesCloseTimeoutRef.current = null;
    }
    setIsServicesOpen(true);
  };

  const scheduleServicesMenuClose = () => {
    if (servicesCloseTimeoutRef.current) {
      clearTimeout(servicesCloseTimeoutRef.current);
    }
    servicesCloseTimeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
      servicesCloseTimeoutRef.current = null;
    }, 180);
  };

  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setIsOpen(false);
    setIsServicesOpen(false);
  }

  useEffect(() => {
    if (!isServicesOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !servicesMenuRef.current?.contains(event.target)
      ) {
        setIsServicesOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsServicesOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isServicesOpen]);

  // Scroll lock (iOS Safari ke liye html + body dono)
  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [isOpen]);

  // Close with Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close the drawer when the full desktop navigation becomes available.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsOpen(false);
    };

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Drawer band ho to andar ke links focusable na hon (React 18/19 dono me kaam karta hai)
  useEffect(() => {
    if (drawerRef.current) {
      (drawerRef.current as HTMLElement & { inert: boolean }).inert = !isOpen;
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      // transition ke baad focus, taaki animation na toote
      const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    if (hasOpenedRef.current) {
      menuButtonRef.current?.focus();
    }
  }, [isOpen]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/5 bg-[#070a13]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex min-w-0 shrink items-center gap-2.5"
            aria-label="TriFusion Dynamics Home"
          >
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
              <Image
                src="/logo.png"
                alt="TriFusion Dynamics Logo"
                width={40}
                height={40}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>

            <span className="truncate font-display text-base font-bold tracking-tight text-white sm:text-xl">
              Trifusion
              <span className="font-normal text-primary">Dynamics</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 xl:flex"
          >
            {NAV_LINKS.map((link) =>
              link.href === "/services" ? (
                <div
                  key={link.href}
                  ref={servicesMenuRef}
                  className="relative"
                  onMouseEnter={openServicesMenu}
                  onMouseLeave={scheduleServicesMenuClose}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={isServicesOpen}
                    aria-controls="desktop-services-menu"
                    onClick={openServicesMenu}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive(link.href) ? "text-primary" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {link.label}
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isServicesOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div
                    id="desktop-services-menu"
                    aria-label="Services by category"
                    onMouseEnter={openServicesMenu}
                    onMouseLeave={scheduleServicesMenuClose}
                    className={`fixed left-1/2 top-20 z-[60] w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 pt-2 transition-[opacity,transform,visibility] duration-200 ${
                      isServicesOpen
                        ? "visible translate-y-0 opacity-100"
                        : "invisible -translate-y-1 opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b101d] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                      <div className="flex flex-col gap-4 border-b border-white/10 bg-gradient-to-r from-primary/[0.08] via-transparent to-secondary/[0.08] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Services</p>
                          <p className="mt-1 text-sm text-slate-400">The right team for your next digital product.</p>
                        </div>
                        <Link
                          href="/services"
                          onClick={() => setIsServicesOpen(false)}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                        >
                          Explore all services <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                      <div className="grid max-h-[min(65vh,560px)] grid-cols-1 gap-x-8 gap-y-5 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                        {[...SERVICES_BY_CATEGORY].map(([category, services]) => (
                          <section key={category} className="min-w-0">
                            <h3 className="mb-2 border-b border-white/10 px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{category}</h3>
                            <div className="space-y-1">
                              {services.map((service) => (
                                <Link
                                  key={service.slug}
                                  href={`/services/${service.slug}`}
                                  onClick={() => setIsServicesOpen(false)}
                                  className="group/link flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium leading-snug text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                >
                                  {service.name}
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100" />
                                </Link>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-2 text-sm font-medium transition-colors ${
                    isActive(link.href) ? "text-primary" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-primary" />
                  )}
                </Link>
              )
            )}
          </nav>

          {/* DESKTOP CTA */}
          <div className="hidden shrink-0 items-center gap-4 xl:flex">
            <ThemeToggle />
            <a
              href={`${ADMIN_URL}/login`}
              className="text-xs font-semibold text-slate-300 transition-colors hover:text-white"
            >
              Login
            </a>

            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95"
            >
              Book Consultation
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* MOBILE / TABLET CONTROLS */}
          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <ThemeToggle />
            {/* Compact CTA: sirf sm se lg ke beech */}
            <Link
              href="/contact"
              className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95 sm:inline-flex xl:hidden"
            >
              Book
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsOpen(true)}
              className="group flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10 text-white transition-all duration-300 hover:border-primary/50 hover:bg-primary/20"
              aria-label="Open navigation menu"
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-md transition-all duration-300 xl:hidden ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-[70] flex h-[100dvh] w-[88%] max-w-md flex-col overflow-hidden overscroll-contain border-l border-white/10 bg-[#070a13] shadow-2xl shadow-black/50 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] xl:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_35%)]" />
        </div>

        {/* Drawer Content */}
        <div className="relative flex h-full min-h-0 flex-col">
          {/* DRAWER HEADER */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04]">
                <Image
                  src="/logo.png"
                  alt="TriFusion Dynamics Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold tracking-tight text-white">
                  Trifusion
                  <span className="font-normal text-primary">Dynamics</span>
                </p>

                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Digital Engineering
                </p>
              </div>
            </Link>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* NAVIGATION */}
          <nav
            aria-label="Mobile navigation"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 [@media(max-height:500px)]:py-3"
          >
            <div className="mb-5 px-2 [@media(max-height:500px)]:mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                Explore
              </p>
            </div>

            <div className="space-y-2">
              {NAV_LINKS.map((link, index) => {
                const active = isActive(link.href);

                return (
                  <div key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-300 [@media(max-height:500px)]:py-2.5 ${
                        active
                          ? "border-primary/20 bg-primary/[0.08]"
                          : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_18px_rgba(255,255,255,0.25)]" />
                      )}
                      <div className="flex items-center gap-4">
                        <span className={`font-mono text-[10px] ${active ? "text-primary" : "text-slate-600 group-hover:text-slate-400"}`}>
                          0{index + 1}
                        </span>
                        <span className={`text-lg font-medium transition-colors ${active ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                          {link.label}
                        </span>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition-all duration-300 ${active ? "translate-x-0 text-primary" : "translate-x-[-4px] text-slate-600 opacity-0 group-hover:translate-x-0 group-hover:text-slate-300 group-hover:opacity-100"}`} />
                    </Link>
                    {link.href === "/services" && (
                      <div className="ml-8 mt-1 space-y-1 border-l border-white/10 py-1 pl-4">
                        {[...SERVICES_BY_CATEGORY].map(([category, services]) => (
                          <div key={category}>
                            <p className="pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{category}</p>
                            {services.map((service) => (
                              <Link
                                key={service.slug}
                                href={`/services/${service.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="block py-2 text-sm text-slate-400 transition-colors hover:text-primary"
                              >
                                {service.name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="my-6 h-px bg-white/10 [@media(max-height:500px)]:my-3" />

            {/* Login */}
            <a
              href={`${ADMIN_URL}/login`}
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between rounded-2xl border border-white/5 px-4 py-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] [@media(max-height:500px)]:py-2.5"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-slate-600">05</span>

                <span className="text-base font-medium text-slate-300 transition-colors group-hover:text-white">
                  Client Login
                </span>
              </div>

              <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-primary" />
            </a>
          </nav>

          {/* BOTTOM CTA */}
          <div className="shrink-0 border-t border-white/10 bg-[#0b101d]/80 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] [@media(max-height:500px)]:py-3">
            <div className="mb-4 [@media(max-height:500px)]:hidden">
              <p className="text-xs font-medium text-slate-500">
                Have a project in mind?
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Let&apos;s build something{" "}
                <span className="text-white">great together.</span>
              </p>
            </div>

            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary py-4 text-sm font-bold text-black transition-all duration-300 hover:opacity-90 active:scale-[0.98] [@media(max-height:500px)]:py-3"
            >
              Book Consultation
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}