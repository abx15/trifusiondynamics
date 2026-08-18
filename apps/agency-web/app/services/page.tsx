import Link from "next/link";
import { ArrowRight, BrainCircuit, Layers, Smartphone, Cloud, CheckCircle2 } from "lucide-react";
import { getCmsServices } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = constructMetadata({
  title: "Bespoke Services & Technical Solutions",
  description: "Explore our range of core engineering solutions: AI Integration, SaaS Product Engineering, Mobile Apps, and Scalable Cloud Architectures.",
  slug: "services",
});

function ServiceIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "BrainCircuit":
      return <BrainCircuit className={className} />;
    case "Layers":
      return <Layers className={className} />;
    case "Smartphone":
      return <Smartphone className={className} />;
    case "Cloud":
      return <Cloud className={className} />;
    default:
      return <CheckCircle2 className={className} />;
  }
}

export default async function ServicesPage() {
  const services = await getCmsServices();

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-40 right-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        
        {/* Page Header */}
        <div className="max-w-3xl mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">What We Do</span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mt-3 mb-6 tracking-tight">
            Core Engineering & <br />
            <span className="text-gradient-cyan-blue">AI-Powered SaaS.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            We operate at the intersection of AI modeling and enterprise web development. We help businesses deploy fast, modern, secure systems that automate heavy workflows.
          </p>
        </div>

        {/* Services List */}
        <div className="flex flex-col gap-12">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="glass-panel rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start hover:border-primary/10 transition-colors"
            >
              {/* Left Column: Title & Icon */}
              <div className="lg:col-span-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 text-primary mb-6">
                  <ServiceIcon name={service.iconName} className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  {service.name}
                </h2>
                <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">
                  0{index + 1} / Solution Scope
                </p>
              </div>

              {/* Middle Column: Details & Description */}
              <div className="lg:col-span-5">
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  {service.longDescription}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {service.features.map((feature, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column: CTA */}
              <div className="lg:col-span-3 flex lg:justify-end items-center h-full pt-6 lg:pt-0">
                <Link
                  href={`/services/${service.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:text-primary hover:border-primary/20 transition-all"
                >
                  Explore Details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
