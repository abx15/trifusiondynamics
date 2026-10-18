import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy",
  description: "Learn what information Trifusion Dynamics collects through its website, how it is used, and how to contact us about your data.",
  slug: "privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains how Trifusion Dynamics handles information when you browse our website or contact us about our services."
      sections={[
        { title: "Information you provide", content: "When you use our contact form or email us, we may receive your name, email address, phone number, project details, and any other information you choose to share. Please do not send passwords, payment-card details, or other sensitive personal information through the website." },
        { title: "How we use information", content: "We use enquiry details to respond to requests, understand project requirements, prepare proposals, provide support, and maintain the security of our website. We do not sell personal information." },
        { title: "Service providers and transfers", content: "We may use hosting, communications, analytics, and other technology providers to operate the website and respond to enquiries. Those providers process information as needed to deliver their services and may operate in locations outside your state or country." },
        { title: "Retention and security", content: "We keep enquiry information only as long as reasonably needed for the purposes above, legitimate business records, and legal obligations. We use reasonable safeguards, but no method of internet transmission or storage can be guaranteed to be completely secure." },
        { title: "Cookies and analytics", content: "The website stores your selected light or dark theme in your browser. Analytics scripts are loaded only when an analytics identifier is configured for the site. See our Cookie Policy for details." },
        { title: "Your choices and contact", content: "You may contact us to ask about, correct, or request deletion of personal information you have submitted, subject to applicable legal requirements. Email support.trifusion@gmail.com and include enough detail for us to identify your enquiry." },
        { title: "Changes to this policy", content: "We may update this policy when our website or practices change. The effective date above indicates when this version was published." },
      ]}
    />
  );
}
