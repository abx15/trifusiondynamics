import Link from "next/link";
import { ArrowRight, BrainCircuit, Layers, Smartphone, Cloud, CheckCircle2 } from "lucide-react";
import { getCmsServices } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import type { ServiceItem } from "@/lib/cms-static-data";

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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.com").replace(/\/$/, "");
  const groupedServices = services.reduce<Map<string, ServiceItem[]>>((groups, service) => {
    const category = service.category || "Other Services";
    groups.set(category, [...(groups.get(category) || []), service]);
    return groups;
  }, new Map());

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": `${siteUrl}/services`,
      },
    ],
  };

  return (
    <div className="bg-[#070a13] py-20">
      {/* Decorative Glow */}
      <div className="absolute top-40 right-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

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

        {/* Services grouped by capability */}
        <div className="space-y-16">
          {[...groupedServices].map(([category, categoryServices], categoryIndex) => (
            <section key={category} aria-labelledby={`category-${categoryIndex}`}>
              <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Service category</p>
                  <h2 id={`category-${categoryIndex}`} className="text-2xl font-display font-bold text-white sm:text-3xl">{category}</h2>
                </div>
                <span className="text-sm text-slate-500">{categoryServices.length} services</span>
              </div>
              <div className="grid grid-cols-1 gap-5">
                {categoryServices.map((service, index) => (
                  <article
                    key={service.id}
                    className="glass-panel grid grid-cols-1 items-start gap-6 rounded-3xl p-6 transition-colors hover:border-primary/20 sm:p-8 lg:grid-cols-12"
                  >
                    <div className="lg:col-span-4">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10 text-primary">
                        <ServiceIcon name={service.iconName} className="h-6 w-6" />
                      </div>
                      <h3 className="mb-2 text-xl font-display font-bold text-white sm:text-2xl">{service.name}</h3>
                      <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                        {String(index + 1).padStart(2, "0")} / {category}
                      </p>
                    </div>
                    <div className="lg:col-span-5">
                      <p className="mb-5 text-sm leading-relaxed text-slate-300 sm:text-base">{service.longDescription}</p>
                      <div className="flex flex-wrap gap-2">
                        {service.features.map((feature) => (
                          <span key={feature} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{feature}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center pt-1 lg:col-span-3 lg:justify-end">
                      <Link
                        href={`/services/${service.slug}`}
                        className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-primary/20 hover:bg-white/10 hover:text-primary"
                      >
                        Explore service
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </div>
  );
}
