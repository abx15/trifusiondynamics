import { getCmsPage } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Sparkles, Code2, Database, Bot, Globe, Mail, ArrowRight, CheckCircle2, Briefcase, Cpu, Layers, Zap, Shield, Target } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = constructMetadata({
  title: "About TriFusion Dynamics | Software & AI Engineering Company",
  description: "Learn about TriFusion Dynamics, a remote-first software engineering company building scalable SaaS platforms, AI-powered applications, APIs, and custom business systems for growing businesses worldwide.",
  slug: "about",
});

export default async function AboutPage() {
  const pageData = await getCmsPage("about-us");
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.vercel.app"
  ).replace(/\/$/, "");

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
        "name": "About",
        "item": `${siteUrl}/about`,
      },
    ],
  };

  return (
    <div className="bg-[#070a13]">
      {/* Decorative Glow */}
      <div className="absolute top-20 right-10 h-[300px] w-[300px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 h-[250px] w-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              About TriFusion Dynamics
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white mt-3 mb-6 tracking-tight">
              Building Intelligent Software<br />
              <span className="text-gradient-cyan-blue">for Modern Businesses</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4">
              TriFusion Dynamics is a software engineering and AI development company focused on building scalable SaaS platforms, web applications, AI-powered products, APIs, and custom business systems.
            </p>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-3xl mx-auto">
              We combine modern engineering practices, thoughtful product design, and AI technologies to turn complex business requirements into reliable digital products.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <Globe className="h-4 w-4 text-primary" />
              Remote-first. Built for businesses worldwide.
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Software That Solves Real Business Problems</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">We don't build software just to add features. We focus on understanding the problem, designing the right architecture, and delivering software that can evolve as the business grows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-3">SaaS Platforms</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We build scalable SaaS products with modern architectures, authentication, subscriptions, dashboards, multi-tenant systems, billing, analytics, and integrations.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
              <div className="h-12 w-12 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center mb-4">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-3">AI-Powered Applications</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We integrate AI into practical business workflows through LLMs, RAG systems, AI agents, intelligent search, document processing, automation, and custom AI applications.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
              <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-3">Custom Business Systems</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We develop internal platforms and business software including CRM, ERP, HRMS, operations systems, admin dashboards, client portals, and workflow management tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Approach */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-transparent via-[#0c1220]/30 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">From Idea to Production</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Our systematic approach to building reliable software</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                step: "01",
                title: "Understand",
                description: "We start by understanding the business problem, users, requirements, and technical constraints."
              },
              {
                step: "02",
                title: "Architect",
                description: "We design a scalable architecture, database structure, API strategy, security model, and technology stack around the product's actual needs."
              },
              {
                step: "03",
                title: "Build",
                description: "We develop the product using modern technologies with a focus on clean code, performance, maintainability, and usability."
              },
              {
                step: "04",
                title: "Integrate",
                description: "We connect APIs, AI services, databases, payment systems, authentication providers, third-party platforms, and other required services."
              },
              {
                step: "05",
                title: "Test",
                description: "We validate functionality, reliability, security, API behaviour, and important user workflows before production."
              },
              {
                step: "06",
                title: "Deploy & Improve",
                description: "We deploy the application and continue improving performance, features, reliability, and scalability as requirements evolve."
              }
            ].map((item, index) => (
              <div key={index} className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 relative">
                <div className="text-4xl font-display font-bold text-primary/20 mb-3">{item.step}</div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">End-to-End Software Engineering</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Comprehensive services from architecture to deployment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Layers className="h-5 w-5" />,
                title: "Full-Stack Development",
                description: "Modern web applications built with technologies such as Next.js, React, TypeScript, Node.js, and NestJS."
              },
              {
                icon: <Bot className="h-5 w-5" />,
                title: "AI Development",
                description: "AI-powered applications, RAG systems, LLM integrations, AI agents, intelligent search, and workflow automation."
              },
              {
                icon: <Briefcase className="h-5 w-5" />,
                title: "SaaS Development",
                description: "Multi-tenant SaaS platforms with authentication, subscriptions, dashboards, billing, analytics, and scalable backend architecture."
              },
              {
                icon: <Cpu className="h-5 w-5" />,
                title: "API & Backend Engineering",
                description: "Secure and scalable REST APIs, backend services, authentication systems, integrations, and database-driven applications."
              },
              {
                icon: <Zap className="h-5 w-5" />,
                title: "Business Automation",
                description: "Automation systems that connect business workflows, APIs, AI models, databases, notifications, and internal tools."
              },
              {
                icon: <Shield className="h-5 w-5" />,
                title: "Cloud & DevOps",
                description: "Production deployment, CI/CD, monitoring, infrastructure configuration, performance optimization, and scalable cloud architecture."
              }
            ].map((service, index) => (
              <div key={index} className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                  {service.icon}
                </div>
                <h3 className="font-display font-bold text-white text-base mb-2">{service.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-transparent via-[#0c1220]/30 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Modern Technologies. Practical Engineering.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Technology choices are based on project requirements rather than forcing every project into the same stack.</p>
          </div>

          <div className="space-y-8 max-w-5xl mx-auto">
            {[
              {
                category: "Frontend",
                technologies: "Next.js • React • TypeScript • Tailwind CSS"
              },
              {
                category: "Backend",
                technologies: "Node.js • NestJS • FastAPI • REST APIs"
              },
              {
                category: "Databases",
                technologies: "PostgreSQL • MongoDB • Redis • Prisma • pgvector"
              },
              {
                category: "AI",
                technologies: "OpenAI • Anthropic • Gemini • RAG • LLMs • AI Agents"
              },
              {
                category: "Cloud & DevOps",
                technologies: "Vercel • AWS • GitHub Actions • Docker"
              }
            ].map((category, index) => (
              <div key={index} className="glass-panel rounded-xl p-5 border border-white/5 bg-[#0f172a]/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="font-display font-bold text-white text-sm">{category.category}</h3>
                  <p className="text-slate-400 text-sm">{category.technologies}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Believe */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Engineering With Purpose</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Principles that guide our development approach</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <Zap className="h-5 w-5" />,
                title: "Performance First",
                description: "We design applications with efficient APIs, optimized queries, caching strategies, and scalable architecture."
              },
              {
                icon: <Shield className="h-5 w-5" />,
                title: "Security by Design",
                description: "Authentication, authorization, data protection, validation, and secure architecture are considered from the beginning."
              },
              {
                icon: <Target className="h-5 w-5" />,
                title: "Built to Scale",
                description: "We design systems that can evolve from an initial product into a larger platform without unnecessary complexity."
              },
              {
                icon: <Code2 className="h-5 w-5" />,
                title: "Clean & Maintainable",
                description: "Readable code, modular architecture, documentation, and sensible engineering practices make future development easier."
              },
              {
                icon: <Bot className="h-5 w-5" />,
                title: "AI With Practical Value",
                description: "We use AI where it can genuinely improve a product, workflow, decision process, or user experience—not simply because AI is trending."
              },
              {
                icon: <Sparkles className="h-5 w-5" />,
                title: "Transparent Collaboration",
                description: "Clear communication, understandable technical decisions, and regular progress help keep development aligned with business goals."
              }
            ].map((principle, index) => (
              <div key={index} className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                    {principle.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base mb-2">{principle.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{principle.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Work */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-transparent via-[#0c1220]/30 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Products & Systems We Build</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Examples of the systems and platforms we develop</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
              <div className="mb-4">
                <h3 className="font-display font-bold text-white text-lg mb-2">AgencyOS</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  An integrated business management platform designed to bring agency operations, CRM, billing, HR, workflows, and automation into one system.
                </p>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-2">Technology</p>
                  <p className="text-sm text-slate-300">Next.js • NestJS • PostgreSQL • Redis • AI</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
              <div className="mb-4">
                <h3 className="font-display font-bold text-white text-lg mb-2">AI-Powered Applications</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  We build AI applications that combine LLMs, retrieval systems, structured data, APIs, and automation to solve practical business problems.
                </p>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-2">Technology</p>
                  <p className="text-sm text-slate-300">OpenAI • LangChain • pgvector • RAG</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 glass-panel-hover">
              <div className="mb-4">
                <h3 className="font-display font-bold text-white text-lg mb-2">Custom Business Platforms</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  From internal dashboards to complete operational systems, we build software around the specific workflows and requirements of a business.
                </p>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-2">Technology</p>
                  <p className="text-sm text-slate-300">Next.js • React • Node.js • PostgreSQL</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
            >
              View Our Case Studies
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Built for Growing Businesses</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Whether the requirement is a new product, an internal platform, or an existing system that needs to scale, we focus on building technology that supports the business.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Startups building their first product",
              "SMBs modernizing existing workflows",
              "Businesses looking for custom internal software",
              "Teams building SaaS products",
              "Companies exploring practical AI adoption",
              "Organizations that need scalable APIs and backend systems"
            ].map((item, index) => (
              <div key={index} className="glass-panel rounded-xl p-5 border border-white/5 bg-[#0f172a]/30 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Remote-First */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-transparent via-[#0c1220]/30 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Work With Us From Anywhere</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">TriFusion Dynamics operates as a remote-first software engineering company.</p>
          </div>

          <div className="glass-panel rounded-2xl p-8 border border-white/5 bg-[#0f172a]/30 max-w-4xl mx-auto text-center mb-8">
            <p className="text-slate-300 leading-relaxed mb-6">
              Our development workflow is designed for distributed collaboration using modern communication, project management, version control, documentation, and deployment tools.
            </p>
            <p className="text-slate-300 leading-relaxed">
              We can collaborate with businesses and teams across different regions without requiring a physical office.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Remote Collaboration",
              "Global Projects",
              "Async-Friendly Workflow"
            ].map((badge, index) => (
              <div key={index} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                <Globe className="h-4 w-4" />
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Have a Product or Business Problem?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-4">Tell us what you're trying to build, improve, or automate.</p>
            <p className="text-slate-400 max-w-2xl mx-auto">We'll help you understand the technical possibilities and identify a practical path from idea to production.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
            <Link
              href="/contact"
              className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 text-center hover:border-primary/20 transition-colors group"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-white text-base mb-2">Start a Conversation</h3>
              <p className="text-slate-400 text-sm">Reach out to discuss your project</p>
            </Link>

            <Link
              href="/services"
              className="glass-panel rounded-2xl p-6 border border-white/5 bg-[#0f172a]/30 text-center hover:border-secondary/20 transition-colors group"
            >
              <div className="h-12 w-12 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-white text-base mb-2">Explore Our Services</h3>
              <p className="text-slate-400 text-sm">Learn more about what we offer</p>
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-base font-semibold text-black transition-all hover:opacity-90 active:scale-98"
            >
              Start a Conversation
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic CMS Copy */}
      {pageData.content && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass-panel rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/5 text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl mx-auto">
              <p className="font-mono text-[10px] sm:text-xs text-primary mb-3">CMS Backend Copy</p>
              {pageData.content}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
