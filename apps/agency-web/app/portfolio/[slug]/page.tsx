import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, User, Tag, CheckCircle2, Quote } from "lucide-react";
import { getPortfolioItems, getPortfolioItemBySlug } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const items = await getPortfolioItems();
  return items.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPortfolioItemBySlug(slug);

  if (!item) {
    return constructMetadata({ title: "Case Study Not Found" });
  }

  return constructMetadata({
    title: item.seoTitle || `${item.client} Case Study`,
    description: item.seoDescription || item.summary,
    image: item.coverImage,
    slug: `portfolio/${slug}`,
  });
}

export default async function PortfolioDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await getPortfolioItemBySlug(slug);

  if (!item) {
    notFound();
  }

  const allItems = await getPortfolioItems();
  const nextItem = allItems.find((p) => p.slug !== slug);

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 right-10 h-[350px] w-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        {/* Back Link */}
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary mb-10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all case studies
        </Link>

        {/* Header Block */}
        <div className="mb-12">
          <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-4">
            {item.category}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight mb-4">
            {item.title}
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">
            {item.subtitle}
          </p>
        </div>

        {/* Cover Image */}
        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 border border-white/5 mb-12">
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Info Grid (Meta & Core Stats) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-white/5 pb-10 mb-12">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Client</p>
              <p className="text-sm font-semibold text-white">{item.client}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Year</p>
              <p className="text-sm font-semibold text-white">{item.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Industry</p>
              <p className="text-sm font-semibold text-white">{item.category}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {item.techStack.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* In-depth Narrative */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
          <div className="md:col-span-8 space-y-10">
            {/* Challenge */}
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-4">The Challenge</h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{item.challenge}</p>
            </div>

            {/* Solution */}
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-4">The Solution</h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{item.solution}</p>
            </div>
          </div>

          {/* Impact Column (Right) */}
          <div className="md:col-span-4 glass-panel rounded-3xl p-6 sm:p-8 border border-white/5 bg-[#0f172a]/30">
            <h3 className="font-display font-bold text-white text-base mb-6">Key Outcomes</h3>
            <ul className="space-y-4">
              {item.impact.map((metric, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm leading-snug">{metric}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Client Testimonial Banner */}
        {item.testimonial && (
          <div className="glass-panel rounded-3xl p-8 sm:p-10 relative mb-16 border-l-4 border-l-primary bg-[#0f172a]/20">
            <Quote className="absolute top-6 right-8 h-10 w-10 text-white/5 pointer-events-none" />
            <p className="text-slate-300 italic text-sm sm:text-base leading-relaxed mb-6">
              &ldquo;{item.testimonial.quote}&rdquo;
            </p>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">{item.testimonial.author}</h4>
              <p className="text-xs text-slate-500">{item.testimonial.role}, <span className="text-primary">{item.client}</span></p>
            </div>
          </div>
        )}

        {/* Next Case Study Navigation */}
        {nextItem && (
          <div className="border-t border-white/5 pt-12 text-center">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Next Case Study</p>
            <Link
              href={`/portfolio/${nextItem.slug}`}
              className="group inline-flex items-center gap-2 text-xl font-display font-bold text-white hover:text-primary transition-colors"
            >
              {nextItem.client} Case Study
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
