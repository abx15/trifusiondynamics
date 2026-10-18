import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Terms of Service",
  description: "Website terms covering enquiries, service proposals, project delivery, intellectual property, and third-party services.",
  slug: "terms-of-service",
});

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms apply to your use of the Trifusion Dynamics website. Services are provided under a separate written proposal or agreement when a project is accepted."
      sections={[
        { title: "Website use", content: "You may use this website for lawful purposes and must not attempt to disrupt, damage, gain unauthorized access to, or misuse the website or its systems. Website content is provided for general information and may change without notice." },
        { title: "Enquiries and proposals", content: "Submitting an enquiry does not create a client relationship or commit either party to a project. Pricing, deliverables, timelines, payment milestones, and support obligations are confirmed in a written proposal or service agreement before work begins." },
        { title: "Project delivery and client responsibilities", content: "Project scope and delivery dates depend on the agreed statement of work and timely access to content, feedback, approvals, and systems from the client. Changes to agreed scope may affect price and timing and should be approved in writing." },
        { title: "Ownership and third-party tools", content: "Ownership and licensing of project deliverables are defined in the applicable project agreement. Third-party software, hosting, APIs, and open-source components remain subject to their own terms, availability, and fees." },
        { title: "Availability and disclaimers", content: "We aim to keep this website available and accurate but do not guarantee uninterrupted access or that all information is complete or current. Website content is provided on an as-available basis to the extent permitted by law." },
        { title: "Liability and governing terms", content: "Nothing in these website terms limits rights or remedies that cannot legally be limited. Any project-specific liability, dispute resolution, and governing-law provisions will be set out in the applicable service agreement." },
        { title: "Contact", content: "For questions about these terms or our services, email support.trifusion@gmail.com." },
      ]}
    />
  );
}
