import Link from "next/link";

interface LegalSection {
  title: string;
  content: string;
}

interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export default function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <div className="relative bg-[#070a13] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <Link href="/" className="mb-8 inline-flex text-sm text-primary hover:underline">
          Trifusion Dynamics
        </Link>
        <header className="mb-10 border-b border-white/10 pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Legal information</p>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{intro}</p>
          <p className="mt-4 text-xs text-slate-500">Effective date: 18 October 2026</p>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-lg font-display font-bold text-white">{section.title}</h2>
              <p className="text-sm leading-7 text-slate-300">{section.content}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-white/10 pt-6 text-sm text-slate-400">
          Questions? Contact us at{" "}
          <a className="text-primary hover:underline" href="mailto:support.trifusion@gmail.com">
            support.trifusion@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
