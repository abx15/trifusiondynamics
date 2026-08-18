"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PortfolioItem } from "@/lib/cms-static-data";

interface PortfolioClientProps {
  initialItems: PortfolioItem[];
}

type FilterCategory = "All" | "AI & Automation" | "SaaS Development" | "Mobile Engineering" | "Web Apps";

const CATEGORIES: FilterCategory[] = [
  "All",
  "AI & Automation",
  "SaaS Development",
  "Mobile Engineering",
  "Web Apps",
];

export default function PortfolioClient({ initialItems }: PortfolioClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("All");

  const filteredItems = selectedCategory === "All"
    ? initialItems
    : initialItems.filter((item) => item.category === selectedCategory);

  return (
    <div className="flex flex-col gap-12">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2.5 border-b border-white/5 pb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-primary to-secondary text-black"
                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          No case studies in this category yet. Stay tuned!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/portfolio/${item.slug}`}
              className="group flex flex-col h-full rounded-3xl bg-[#0f172a]/45 border border-white/5 overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/20 hover:bg-[#0f172a]/80"
            >
              {/* Cover Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  fill
                  sizes="(max-w-768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-transparent to-transparent opacity-80" />
                <span className="absolute top-4 left-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-semibold text-primary border border-white/5">
                  {item.category}
                </span>
              </div>

              {/* Card Copy */}
              <div className="flex-1 flex flex-col justify-between p-6">
                <div>
                  <p className="text-[11px] font-mono text-slate-500 mb-2">
                    {item.client} • {item.year}
                  </p>
                  <h3 className="text-lg font-bold text-white mb-2.5 leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-6">
                    {item.summary}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 group-hover:text-primary transition-colors">
                  Read Case Study
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
