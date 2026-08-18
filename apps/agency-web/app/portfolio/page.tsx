import { getPortfolioItems } from "@/lib/api";
import PortfolioClient from "./PortfolioClient";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = constructMetadata({
  title: "Case Studies & Engineering Success",
  description: "Browse our premium portfolio of SaaS integrations, custom AI deployments, and mobile applications built for leading startups and SMBs.",
  slug: "portfolio",
});

export default async function PortfolioPage() {
  const items = await getPortfolioItems();

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-20 left-10 h-[250px] w-[250px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Our Work</span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mt-3 mb-6 tracking-tight">
            Case Studies in <br />
            <span className="text-gradient-cyan-blue">Engineering Excellence.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            We partner with ambitious startups and established small businesses to architect, build, and optimize products that drive operational metrics. Explore our recent deliveries.
          </p>
        </div>

        {/* Filterable Grid Component */}
        <PortfolioClient initialItems={items} />

      </div>
    </div>
  );
}
