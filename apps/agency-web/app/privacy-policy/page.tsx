import { getCmsPage } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy | Data Protection & Compliance",
  description: "Read our privacy guidelines regarding client data, submission forms, and analytic records.",
  slug: "privacy-policy",
});

export default async function PrivacyPolicyPage() {
  const pageData = await getCmsPage("privacy-policy");

  return (
    <div className="bg-[#070a13] py-20 relative">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        
        {/* Page Header */}
        <div className="mb-12 border-b border-white/5 pb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            {pageData.title === "Home" ? "Privacy Policy" : pageData.title}
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-2">
            Last Updated: July 12, 2026
          </p>
        </div>

        {/* Policy Body */}
        <div className="prose prose-invert max-w-none text-slate-300 text-sm sm:text-base leading-relaxed space-y-6">
          {pageData.content ? (
            <p>{pageData.content}</p>
          ) : (
            <p>
              We protect your data. Submissions are processed and secured in compliance with local guidelines.
            </p>
          )}

          <h2 className="text-white font-display font-bold text-lg pt-4">1. Data Ingestion</h2>
          <p>
            When you submit a query through our contact form, we collect the details you provide (Name, Email, Phone, and Project Context) to evaluate requirements and prepare proposals. This data feeds directly into our secure lead gateway.
          </p>

          <h2 className="text-white font-display font-bold text-lg pt-4">2. Protection Measures</h2>
          <p>
            We implement strict security measures to protect the integrity of database logs. Submissions are encrypted in transit via SSL/TLS protocols and stored in compliant PostgreSQL instances.
          </p>

          <h2 className="text-white font-display font-bold text-lg pt-4">3. Third-party Links</h2>
          <p>
            Our website may link to third-party dashboards or external APIs. We do not control their compliance and suggest reviewing their privacy terms individually.
          </p>

          <h2 className="text-white font-display font-bold text-lg pt-4">4. Cookie Configuration</h2>
          <p>
            We set basic functional cookies to retain interface preferences. No persistent marketing trackers are injected.
          </p>
        </div>

      </div>
    </div>
  );
}
