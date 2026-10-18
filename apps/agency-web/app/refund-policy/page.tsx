import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Refund & Cancellation Policy",
  description: "Read how project cancellations, completed work, milestone payments, and any agreed subscription services are handled.",
  slug: "refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro="The terms in your signed proposal or service agreement take precedence for a specific project. The general guidance below applies where an agreement does not set out a different process."
      sections={[
        { title: "Project payments", content: "Project estimates, advance payments, milestones, and deliverables are agreed in writing before work starts. Payments for work already completed, approved expenses, or third-party costs already incurred are not refundable, except where required by applicable law or the project agreement." },
        { title: "Cancellation requests", content: "A client may request cancellation by writing to support.trifusion@gmail.com. We will confirm work completed and outstanding commitments as of the cancellation date. Any refund due for prepaid work not yet performed will be assessed against the written agreement and applicable law." },
        { title: "Subscriptions and recurring support", content: "Where recurring support or subscription services are offered, the applicable agreement will state the billing period, cancellation notice, included work, and any refund eligibility. Cancellation generally applies to future billing periods and does not reverse charges for periods already delivered." },
        { title: "How to raise a billing concern", content: "Please include your project or invoice reference and a description of the concern. We will review the agreement, payment record, and work delivered and respond using the contact details associated with the request." },
        { title: "Legal rights", content: "This policy does not remove any consumer or other rights that cannot be excluded under applicable law. If this policy conflicts with a signed project agreement or mandatory law, that agreement or law applies to the extent of the conflict." },
      ]}
    />
  );
}
