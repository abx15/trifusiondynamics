import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Layers,
  Smartphone,
  Cloud,
  Briefcase,
  ShieldCheck,
  Palette,
  Zap,
  HelpCircle,
} from "lucide-react";
import { ServiceItem } from "@/lib/cms-static-data";

// Helper to render icons dynamically
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
    case "Briefcase":
      return <Briefcase className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "Palette":
      return <Palette className={className} />;
    case "Zap":
      return <Zap className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}

interface ServicesGridProps {
  services: ServiceItem[];
}

export default function ServicesGrid({ services }: ServicesGridProps) {
  return (
    <section className="py-16 sm:py-24 bg-[#090d19] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Our Expertise</h2>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
              Bespoke Systems, Tailored For High-Growth Agencies
            </p>
          </div>
          <Link
            href="/services"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-white transition-colors min-h-[44px] sm:min-h-0"
          >
            View All Services
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Services Cards Grid: 1 column mobile -> 2 column tablet/desktop -> 4 column xl */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                {/* Icon Container */}
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 text-primary mb-6">
                  <ServiceIcon name={service.iconName} className="h-6 w-6" />
                </div>
                
                <h3 className="text-xl font-display font-bold text-white mb-3">
                  {service.name}
                </h3>
                
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {service.description}
                </p>
                
                {/* Micro Features list */}
                <ul className="grid grid-cols-1 gap-2.5 mb-8">
                  {service.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/services/${service.slug}`}
                className="group inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-primary transition-colors py-2 min-h-[44px] sm:min-h-0"
              >
                Learn More
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
