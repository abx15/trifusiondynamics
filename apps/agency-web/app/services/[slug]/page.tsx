import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BrainCircuit, Layers, Smartphone, Cloud, HelpCircle, CheckCircle } from "lucide-react";
import { getCmsServices, getServiceBySlug } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const services = await getCmsServices();
  return services.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  
  if (!service) {
    return constructMetadata({ title: "Service Not Found" });
  }

  return constructMetadata({
    title: service.seoTitle || service.name,
    description: service.seoDescription || service.description,
    slug: `services/${slug}`,
  });
}

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
      return <HelpCircle className={className} />;
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const otherServices = (await getCmsServices()).filter((s) => s.slug !== slug);

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        
        {/* Back Link */}
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary mb-12 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all services
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Main Content (Left Col) */}
          <div className="lg:col-span-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 text-primary mb-8">
              <ServiceIcon name={service.iconName} className="h-7 w-7" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight mb-6">
              {service.name}
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 font-light leading-relaxed mb-8">
              {service.description}
            </p>

            <div className="prose prose-invert max-w-none text-slate-300 text-sm sm:text-base leading-relaxed mb-12 space-y-6">
              <p>{service.longDescription}</p>
            </div>

            {/* In-depth Features Checklist */}
            <div className="border-t border-white/5 pt-10">
              <h3 className="font-display font-bold text-xl text-white mb-6">Detailed Deliverables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {service.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Navigation / CTA (Right Col) */}
          <div className="lg:col-span-4 space-y-8">
            {/* Sidebar CTA */}
            <div className="glass-panel rounded-3xl p-8 border border-white/10 bg-gradient-to-br from-[#0c1220] to-[#070a13]">
              <h3 className="font-display font-bold text-white text-lg mb-3">Discuss this solution</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                Connect with our tech leads to see how {service.name} can streamline your product operations.
              </p>
              <Link
                href="/contact"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary py-3 text-center text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-98"
              >
                Book Consultation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Other Services List */}
            <div className="glass-panel rounded-3xl p-8">
              <h3 className="font-display font-bold text-white text-base mb-4">Other Solutions</h3>
              <div className="flex flex-col gap-3">
                {otherServices.map((other) => (
                  <Link
                    key={other.id}
                    href={`/services/${other.slug}`}
                    className="flex items-center justify-between group p-3 rounded-xl border border-white/5 bg-white/5 hover:border-primary/20 hover:bg-slate-900 transition-all"
                  >
                    <span className="text-sm text-slate-300 group-hover:text-primary transition-colors font-medium">
                      {other.name}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
