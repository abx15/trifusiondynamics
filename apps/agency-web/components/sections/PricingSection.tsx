"use client";

import { useState } from "react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter MVP",
    tagline: "Ideal for early-stage startups needing a fast, high-quality MVP launch.",
    monthlyPrice: 1999,
    annualPrice: 1599,
    features: [
      "Custom Next.js Frontend Development",
      "NestJS Backend Gateway & Auth",
      "PostgreSQL Database & Prisma ORM",
      "Basic Support Ticket Helpdesk",
      "2 Weeks Post-Launch SLA Warranty",
    ],
    cta: "Launch Your MVP",
  },
  {
    id: "growth",
    name: "Growth Scale",
    tagline: "For scaling platforms requiring AI integration, custom workflows & ERP.",
    monthlyPrice: 4999,
    annualPrice: 3999,
    popular: true,
    features: [
      "Everything in Starter MVP",
      "Custom RAG AI & Vector Search",
      "Multi-Tenant Client & Employee Portals",
      "Automated CRM & HR Payroll Engine",
      "Docker & Kubernetes CI/CD Pipeline",
      "24/7 Priority SLA Support",
    ],
    cta: "Scale Your Business",
  },
  {
    id: "enterprise",
    name: "Enterprise Dedicated",
    tagline: "Full-scale dedicated engineering team for complex enterprise SaaS systems.",
    monthlyPrice: 9999,
    annualPrice: 7999,
    features: [
      "Dedicated Full-Stack & AI Team",
      "Custom LLM Fine-Tuning & Agents",
      "White-labeled Client & Worker Apps",
      "Zero-Trust OWASP Security Audits",
      "Custom Webhook & API Rate-Limits",
      "Dedicated Account Manager & SLA",
    ],
    cta: "Contact Enterprise",
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="py-24 px-6 relative bg-zinc-950 text-white overflow-hidden" id="pricing">
      {/* Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-600/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> Transparent Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Flexible Plans Built for Growth
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Select the plan that fits your business stage. No hidden fees, full ownership of code and architecture.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !annual ? "bg-purple-600 text-white shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? "bg-purple-600 text-white shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              Annual Billing
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? "bg-zinc-900/90 border-2 border-purple-500/60 shadow-2xl shadow-purple-900/20 scale-[1.03]"
                    : "bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg">
                    Most Popular Choice
                  </div>
                )}

                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 text-sm text-zinc-400 min-h-[40px]">{plan.tagline}</p>

                  <div className="mt-6 mb-8 flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-black text-white">${price}</span>
                    <span className="text-zinc-400 text-sm">/month</span>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-zinc-800">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="p-1 rounded-full bg-purple-500/10 text-purple-400 mt-0.5">
                          <Check className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-zinc-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6">
                  <Link
                    href="/contact"
                    className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold transition-all ${
                      plan.popular
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
