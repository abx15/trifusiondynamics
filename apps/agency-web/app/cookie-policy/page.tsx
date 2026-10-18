import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Cookie Policy",
  description: "Understand the browser storage, theme preference, analytics, and caching technologies used by the Trifusion Dynamics website.",
  slug: "cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="This page describes the small amount of browser storage and similar technology used to operate and improve this website."
      sections={[
        { title: "Theme preference", content: "When you choose light or dark appearance, the site saves that preference in your browser's local storage under the key trifusion-theme. This preference stays on your device and is used to remember your choice on later visits." },
        { title: "Analytics", content: "If the site owner configures a Google Analytics measurement identifier, the website loads Google Analytics to understand aggregate website usage. Analytics may use cookies or similar identifiers. If analytics is not configured, those analytics scripts are not loaded." },
        { title: "Hosting and essential storage", content: "Our hosting provider and browser may use technical storage or caching needed to deliver pages, static assets, and the site's service worker. These functions support website delivery and are not used by us to sell advertising profiles." },
        { title: "Manage browser storage", content: "You can clear local storage and cookies in your browser settings. Clearing the saved theme preference means the site will use your system appearance preference until you select a theme again. Blocking essential storage may affect some site features." },
        { title: "Updates and contact", content: "We may update this policy as the website changes. For questions, email support.trifusion@gmail.com." },
      ]}
    />
  );
}
