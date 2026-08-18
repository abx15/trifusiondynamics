import Hero from "@/components/sections/Hero";
import ServicesGrid from "@/components/sections/ServicesGrid";
import TechStackSection from "@/components/sections/TechStackSection";
import ProcessSection from "@/components/sections/ProcessSection";
import PortfolioGrid from "@/components/sections/PortfolioGrid";
import TestimonialCarousel from "@/components/sections/TestimonialCarousel";
import BlogPreview from "@/components/sections/BlogPreview";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import CTASection from "@/components/sections/CTASection";

import {
  getCmsServices,
  getPortfolioItems,
  getBlogPosts,
  getTestimonials,
} from "@/lib/api";

// Incremental Static Regeneration configuration
export const revalidate = 60;

export default async function Home() {
  // Concurrent fetching of CMS and stub resources
  const [services, portfolioItems, blogPosts, testimonials] = await Promise.all([
    getCmsServices(),
    getPortfolioItems(),
    getBlogPosts(),
    getTestimonials(),
  ]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#070a13] text-slate-100 overflow-x-hidden">
      <Hero />
      <ServicesGrid services={services} />
      <TechStackSection />
      <ProcessSection />
      <PortfolioGrid items={portfolioItems} />
      <PricingSection />
      <TestimonialCarousel testimonials={testimonials} />
      <FAQSection />
      <BlogPreview posts={blogPosts} />
      <CTASection />
    </div>
  );
}
