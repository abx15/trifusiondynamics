"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "What technology stack does Trifusion Dynamics use?",
    answer: "We specialize in modern full-stack web and mobile tech stacks including Next.js 15 (App Router), React, React Native, NestJS (TypeScript), Python FastAPI, PostgreSQL with pgvector, MongoDB, Redis, Docker, and Kubernetes.",
  },
  {
    question: "How do your multi-tenant portals work for Clients and Workers?",
    answer: "Our AgencyOS platform comes with dedicated role-based portals out of the box. Clients receive a secure login to submit support tickets, view live project milestones, and pay invoices. Employees/Workers receive access to their task Kanbans, attendance punches, leave management, and ticket resolution threads.",
  },
  {
    question: "Can you integrate custom AI models into our existing software?",
    answer: "Yes! We specialize in custom Retrieval-Augmented Generation (RAG) pipelines, semantic vector search, LLM fine-tuning, and automated agent workflows using Python FastAPI microservices and vector databases.",
  },
  {
    question: "Do I get full ownership of the source code and database?",
    answer: "Absolutely. Upon project completion, you retain 100% intellectual property rights, full Git repository ownership, and all database schemas and documentation.",
  },
  {
    question: "What is your typical turnaround time for an enterprise MVP?",
    answer: "Most custom MVPs and SaaS platforms are delivered in 4 to 8 weeks, depending on module complexity. Our modular monorepo architecture allows us to move fast without sacrificing code quality.",
  },
  {
    question: "How does the Support Ticket & SLA system work?",
    answer: "Support tickets can be submitted directly from the Client Portal. Tickets are automatically categorized, assigned to relevant engineering leads, and backed by response time SLAs ranging from 1 hour to 24 hours.",
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-24 px-6 bg-black text-white relative overflow-hidden" id="faq">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" /> Got Questions?
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Everything you need to know about our services, portals, AI capabilities, and SLA support.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-semibold text-lg text-white hover:text-purple-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-purple-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-zinc-300 leading-relaxed border-t border-zinc-800/40 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
