export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  features: string[];
  longDescription: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  client: string;
  category: "AI & Automation" | "SaaS Development" | "Mobile Engineering" | "Web Apps";
  year: string;
  coverImage: string;
  summary: string;
  challenge: string;
  solution: string;
  impact: string[];
  techStack: string[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  date: string;
  readTime: string;
  coverImage: string;
  summary: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
}

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: "service-1",
    name: "AI Integration & RAG Pipelines",
    slug: "ai-integration-rag",
    description: "Supercharge your business workflows with tailored LLM integrations, retrieval-augmented generation (RAG), and smart agentic flows.",
    iconName: "BrainCircuit",
    features: [
      "Semantic Search & Document Q&A",
      "Custom LLM Agent Development",
      "Prompt Engineering & Fine-tuning",
      "FastAPI-based AI Microservices"
    ],
    longDescription: "In the era of AI, standard applications are no longer enough. We design and build AI-native systems that hook into your company's proprietary data safely. By leveraging state-of-the-art vector databases (like pgvector) and orchestrating LLMs with LangChain or LlamaIndex, we create context-aware systems that automate support, speed up operational research, and deliver high-accuracy insights.",
    seoTitle: "AI Integration & Custom RAG Pipelines | Trifusion Dynamics",
    seoDescription: "Tailored LLM integrations, retrieval-augmented generation (RAG), and vector database setups to build smart automation pipelines for startups."
  },
  {
    id: "service-2",
    name: "Full-Stack SaaS Development",
    slug: "full-stack-saas",
    description: "Launch your SaaS in record time with robust Next.js Frontends, reliable NestJS Gateways, and high-performance databases.",
    iconName: "Layers",
    features: [
      "Next.js 15 App Router Frontends",
      "Scaleable NestJS Microservice Backends",
      "Multi-tenant RBAC Security",
      "Stripe & Razorpay Payment Engine"
    ],
    longDescription: "Building a software-as-a-service application requires a rock-solid foundation. We build multi-tenant SaaS products from the ground up, implementing production-ready authentication, role-based access control (RBAC), billing integrations, and real-time workspaces. By combining Next.js with NestJS and Prisma ORM, we guarantee your app compiles cleanly, builds instantly, and scales gracefully.",
    seoTitle: "Full-Stack SaaS Product Development Agency | Trifusion Dynamics",
    seoDescription: "End-to-end multi-tenant SaaS development including payment gateways, secure auth, and real-time dashboards."
  },
  {
    id: "service-3",
    name: "Mobile App Engineering",
    slug: "mobile-engineering",
    description: "Deliver premium cross-platform iOS and Android experiences using React Native, fully optimized for performance and design.",
    iconName: "Smartphone",
    features: [
      "React Native & Expo Ecosystem",
      "Native Module Integrations",
      "Offline-first Sync & Storage",
      "App Store & Play Store Publishing"
    ],
    longDescription: "A great mobile app feels fluid and acts immediately. We build cross-platform mobile apps using React Native and Expo, keeping your bundle size small and render speeds high. We integrate push notifications, maps, local storage sync, and custom device hardware integrations so your users enjoy a truly native experience.",
    seoTitle: "React Native Mobile App Development Services | Trifusion Dynamics",
    seoDescription: "High-performance cross-platform iOS and Android applications built with React Native and Expo."
  },
  {
    id: "service-4",
    name: "Cloud Infrastructure & Scale",
    slug: "cloud-infra",
    description: "Achieve 99.99% uptime with containerized services, automated Kubernetes ingress orchestration, and edge caching.",
    iconName: "Cloud",
    features: [
      "Docker & Kubernetes Orchestration",
      "GitHub Actions CI/CD Pipelines",
      "Cloudflare CDN & R2 Caching",
      "Postgres & Redis Clustering"
    ],
    longDescription: "Performance is a feature. We design secure, automated cloud setups on AWS, GCP, and DigitalOcean. By implementing Kubernetes cluster autoscaling, Redis caching layers, and Cloudflare CDN optimizations, we ensure your APIs respond within milliseconds and stay online during heavy traffic spikes.",
    seoTitle: "Scalable Devops & Kubernetes Cloud Infrastructure | Trifusion Dynamics",
    seoDescription: "Uptime optimization, automated CI/CD deployments, and cloud security configurations."
  },
  {
    id: "service-5",
    name: "Enterprise ERP & Custom CRM",
    slug: "custom-erp-crm",
    description: "Streamline operations with custom ERP modules, automated sales funnels, and HR payroll management systems.",
    iconName: "Briefcase",
    features: [
      "Lead-to-Client Sales Pipelines",
      "HR Attendance & Payslip Automation",
      "Support Ticket Helpdesk Portals",
      "Inventory & Invoice Ledger Tracking"
    ],
    longDescription: "Generic SaaS tools often fail to fit unique business workflows. We design custom ERP and CRM engines tailored to your exact operational requirements. Integrate sales pipelines, employee attendance punch logs, automated payslips, and customer support tickets under one cohesive, high-speed portal.",
    seoTitle: "Custom Enterprise ERP & CRM Software | Trifusion Dynamics",
    seoDescription: "Tailored ERP and CRM platforms with automated workflows, helpdesk ticket suites, and payroll controls."
  },
  {
    id: "service-6",
    name: "Cybersecurity & Code Auditing",
    slug: "cybersecurity-compliance",
    description: "Protect enterprise data with rigorous penetration testing, OWASP compliance, and zero-trust authentication.",
    iconName: "ShieldCheck",
    features: [
      "OWASP Vulnerability Assessments",
      "JWT & RBAC Security Audits",
      "Data Encryption & Key Rotation",
      "SOC2 / GDPR Compliance Preparation"
    ],
    longDescription: "Security is non-negotiable. Our security engineering team conducts line-by-line code audits, API security scanning, and infrastructure vulnerability assessments. We enforce zero-trust access control, rate-limiting, encrypted data storage, and compliance auditing to safeguard your sensitive business data.",
    seoTitle: "Enterprise Cybersecurity & Code Audit Services | Trifusion Dynamics",
    seoDescription: "Comprehensive API security audits, OWASP penetration tests, and RBAC authorization hardened defenses."
  },
  {
    id: "service-7",
    name: "UI/UX & Motion Design",
    slug: "uiux-product-design",
    description: "Transform complex web applications into stunning, intuitive user interfaces with rich animations and visual design.",
    iconName: "Palette",
    features: [
      "Figma Design Systems & Components",
      "Glassmorphism & Dark Mode Aesthetics",
      "Micro-animations & Interactive Prototypes",
      "Conversion-Focused UX Flows"
    ],
    longDescription: "First impressions define user adoption. We design state-of-the-art UI/UX interfaces with dark mode palettes, vibrant gradient accents, interactive micro-animations, and responsive layout structures. Turn visitors into loyal users with design systems crafted for visual excellence and friction-free usability.",
    seoTitle: "Modern UI/UX & Digital Product Design Agency | Trifusion Dynamics",
    seoDescription: "High-end visual UI/UX design systems, micro-animations, glassmorphic themes, and responsive Next.js designs."
  },
  {
    id: "service-8",
    name: "Workflow Automation & Webhooks",
    slug: "workflow-automation",
    description: "Eliminate manual tasks with event-driven automation triggers, custom webhooks, and third-party API sync.",
    iconName: "Zap",
    features: [
      "Event-Driven Automation Triggers",
      "Custom Webhook Dispatchers",
      "Third-party API Integrations",
      "Scheduled Background Workers"
    ],
    longDescription: "Connect your entire tech stack effortlessly. We engineer event-driven workflow engines that listen to critical business triggers—such as lead creation, invoice payment, or ticket escalation—and execute automated actions like emailing notifications, updating CRMs, or running background sync scripts.",
    seoTitle: "Event-Driven Automation & Webhook Integration | Trifusion Dynamics",
    seoDescription: "Custom workflow automation engines, scheduled background jobs, and webhook dispatching systems."
  }
];

export const PORTFOLIO_DATA: PortfolioItem[] = [
  {
    id: "case-1",
    title: "VishwaAI: Automating Financial Document Auditing",
    subtitle: "Enterprise RAG Pipeline processing thousands of bank statements hourly with 99.4% parsing accuracy.",
    slug: "vishwa-ai-document-auditing",
    client: "Vishwa Ventures",
    category: "AI & Automation",
    year: "2025",
    coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    summary: "Vishwa Ventures needed a way to ingest unstructured financial PDFs and identify discrepancies automatically. We built a custom RAG solution using FastAPI, LangChain, and pgvector.",
    challenge: "The client was manually auditing multi-page financial statements, taking up to 4 hours per file. Documents varied wildly in layouts, tables, and scanning qualities, leading to human errors and high labor costs.",
    solution: "We engineered an automated extraction pipeline. Uploaded files are segmented, OCR'd, and vectorized into a PostgreSQL database with pgvector. A custom agentic framework compares ledger sheets against bank logs, flagging anomalies within seconds.",
    impact: [
      "Audit time reduced from 4 hours to under 30 seconds per file.",
      "Identified over ₹1.2M in ledger discrepancies within the first week of deployment.",
      "Achieved 99.4% accuracy in parsing multi-column tabular PDF records."
    ],
    techStack: ["FastAPI", "Next.js", "PostgreSQL", "pgvector", "LangChain", "Docker"],
    testimonial: {
      quote: "Trifusion Dynamics delivered a system that fundamentally transformed our operations. What used to take hours now takes seconds, with higher accuracy than we ever had.",
      author: "Rajesh Viswanathan",
      role: "Managing Director, Vishwa Ventures"
    },
    seoTitle: "VishwaAI: Enterprise Financial RAG Case Study | Trifusion Dynamics",
    seoDescription: "How we built a custom document analysis agent reducing financial auditing times by 99%."
  },
  {
    id: "case-2",
    title: "Triflow: A Unified Collaborative Workspace",
    subtitle: "Real-time SaaS builder with offline sync, Kanban workspaces, and instant chat channels.",
    slug: "triflow-collaborative-workspace",
    client: "Triflow Technologies",
    category: "SaaS Development",
    year: "2025",
    coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    summary: "We engineered a highly interactive project management dashboard featuring web socket sync, drag-and-drop Kanbans, and invoice rolling.",
    challenge: "The client wanted a system that rivaled Trello and Slack, but specifically tailored to agency workflows, demanding sub-100ms UI responses under heavy concurrent edits.",
    solution: "We built the workspace with Next.js 15 using App Router and a NestJS backend. We integrated Socket.io for immediate messaging, custom drag-and-drop hooks for Kanban columns, and a Redis state store.",
    impact: [
      "Supports over 10,000 active concurrent users.",
      "Mean time to interactive (TTI) clocked under 1.1 seconds.",
      "Unified billing, tickets, and tasks into a single database schema."
    ],
    techStack: ["Next.js", "NestJS", "Socket.io", "Prisma ORM", "Redis", "Tailwind CSS"],
    testimonial: {
      quote: "The team's execution was flawless. They understood our need for high-speed responsiveness and delivered an interface that is beautiful, fast, and extremely stable.",
      author: "Aditi Sharma",
      role: "VP of Product, Triflow Tech"
    },
    seoTitle: "Triflow Collaborative SaaS Platform Case Study | Trifusion Dynamics",
    seoDescription: "Read how we engineered a high-performance project management dashboard with real-time websocket sync."
  },
  {
    id: "case-3",
    title: "Medikart: Pharmacy Delivery on Demand",
    subtitle: "React Native mobile app with real-time driver tracking and offline prescriptions upload.",
    slug: "medikart-pharmacy-delivery",
    client: "Medikart Healthcare",
    category: "Mobile Engineering",
    year: "2024",
    coverImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
    summary: "A robust React Native iOS and Android app allowing users to upload prescriptions, consult online pharmacies, and track courier dispatches in real-time.",
    challenge: "Medikart faced high churn rates on their mobile application due to slow screen transitions and broken GPS updates in low-network regions.",
    solution: "We redesigned the app from scratch using React Native and Expo. We built an offline-first cache mechanism for order summaries, integrated Google Maps API for smooth live driver tracking, and reduced initial package size.",
    impact: [
      "App store rating rose from 3.2 to 4.7 stars.",
      "Monthly active users increased by 140% post-redesign.",
      "Offline sync enabled placing orders even on unstable 3G connections."
    ],
    techStack: ["React Native", "Expo", "Node.js", "MongoDB", "Google Maps API", "Redux Toolkit"],
    testimonial: {
      quote: "Our mobile conversion rate skyrocketed after the launch. The offline capability and smooth map tracking solved our biggest customer pain points.",
      author: "Dr. Amit Varma",
      role: "Co-Founder, Medikart"
    },
    seoTitle: "Medikart: On-Demand Pharmacy Mobile App Case Study | Trifusion Dynamics",
    seoDescription: "Learn how we built an offline-first React Native mobile app with live driver tracking and Google Maps integration."
  }
];

export const BLOG_DATA: BlogPost[] = [
  {
    id: "post-1",
    title: "Building Context-Aware Applications with pgvector and RAG",
    slug: "pgvector-context-aware-rag-apps",
    category: "Artificial Intelligence",
    author: {
      name: "Arun Kumar",
      role: "Lead AI Engineer",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"
    },
    date: "July 8, 2026",
    readTime: "6 min read",
    coverImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
    summary: "Vector databases are the engine of modern AI apps. Discover how to leverage pgvector in PostgreSQL to construct precise RAG systems without leaving your primary relational database.",
    content: `
# Building Context-Aware Applications with pgvector and RAG

Retrieval-Augmented Generation (RAG) has become the gold standard for connecting Large Language Models (LLMs) to private, custom datasets. While specialized vector databases exist, keeping your vectors in your primary database simplifies backups, schema integrity, and transaction consistency.

Enter **pgvector** — an open-source extension for PostgreSQL that enables storing and querying vector embeddings directly alongside your tables.

## Why pgvector?

1. **No Extra Infrastructure**: You don't need to spin up and maintain a separate vector store (like Pinecone or Milvus). If you are already using PostgreSQL, you can enable pgvector with a single SQL query.
2. **Relational Joins**: You can query vector distances and join the results directly with your other tables (e.g., users, projects, or billing history) in a single query.
3. **Transaction Safety**: It respects PostgreSQL's ACID compliance, ensuring that updates to your vectors are atomic.

## Step-by-Step RAG Setup

### 1. Enable the Extension
To get started, simply run the following SQL command:
\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;
\`\`\`

### 2. Define the Schema
Let's create a table that stores text chunks and their corresponding 1536-dimensional embeddings (e.g., from OpenAI's \`text-embedding-3-small\` model):
\`\`\`sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536)
);
\`\`\`

### 3. Build a Vector Index
For small datasets, exact searches (flat scans) are incredibly fast. However, as your data grows, you should add an approximate nearest neighbors index (like HNSW) to maintain sub-10ms response times:
\`\`\`sql
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
\`\`\`

## Orchestrating the RAG Flow

The full pipeline follows these steps:
1. **Chunking**: Break long documents into readable chunks (e.g., 500 characters with 100-character overlap).
2. **Embedding**: Pass chunks to an embedding model API to generate the vector representation.
3. **Storage**: Save the content and vector array into PostgreSQL.
4. **Querying**: When a user asks a question, embed their query, perform a similarity search using cosine distance (\`<=>\`), retrieve the top chunks, and feed them to the LLM as context.

\`\`\`typescript
// Example Node/Typescript query using Prisma:
const queryVector = await getOpenAIEmbedding(userQuery);
const contextChunks = await prisma.$queryRaw\`
  SELECT content, 1 - (embedding <=> \${queryVector}::vector) AS similarity
  FROM document_chunks
  ORDER BY embedding <=> \${queryVector}::vector
  LIMIT 5;
\`;
\`\`\`

By adopting pgvector, you can build production-grade, context-aware applications that respond instantly while keeping your database footprint clean.
    `,
    seoTitle: "How to Build RAG Apps with pgvector & Postgres | Trifusion Dynamics",
    seoDescription: "Step-by-step guide to setting up vector databases in PostgreSQL using pgvector, LangChain, and Next.js."
  },
  {
    id: "post-2",
    title: "Next.js 15: Optimizing Core Web Vitals for Production",
    slug: "nextjs-15-optimizing-core-web-vitals",
    category: "Web Development",
    author: {
      name: "Jane Employee",
      role: "Senior Frontend Engineer",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
    },
    date: "June 24, 2026",
    readTime: "5 min read",
    coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    summary: "With the latest release of Next.js 15, caching behaviors have shifted. Learn the best patterns to configure ISR, lazy loading, and priority image loads to maintain a perfect 100 mobile score.",
    content: `
# Next.js 15: Optimizing Core Web Vitals for Production

Next.js 15 brings powerful updates to the compiler (Turbopack) and modifications to routing and caching. Crucially, client-side fetches and route cache behaviors are now dynamic by default. Let's look at how to optimize Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) in this version.

## 1. Static vs. Dynamic Caching
In Next.js 15, \`fetch\` requests are no longer cached by default unless specified. To implement Incremental Static Regeneration (ISR) for pages like Blogs or Portfolios, you must explicitly pass revalidation tags or options:

\`\`\`typescript
// ISR Fetch pattern:
const res = await fetch('https://api.example.com/cms/data', {
  next: { revalidate: 60 } // Revalidate every 60 seconds
});
\`\`\`

## 2. Image Optimization and Priority
Largest Contentful Paint (LCP) is almost always caused by heavy hero images. Next.js provides the \`next/image\` component to automatically compress files, but you must instruct the browser to load below-the-fold or above-the-fold images correctly:

- **For Hero Images**: Always set \`priority\` to true. This adds a link header that triggers preloading.
- **For Below-the-Fold images**: Allow lazy-loading (default behavior).

\`\`\`jsx
<Image
  src="/hero-illustration.png"
  alt="Trifusion Hero"
  width={600}
  height={400}
  priority
  className="w-full h-auto"
/>
\`\`\`

## 3. Dynamic Imports and Code Splitting
Reduce your initial bundle sizes by lazy-loading heavy interactive components (such as maps, charts, or carousels) only when they enter the viewport:

\`\`\`typescript
import dynamic from 'next/dynamic';

const TestimonialsCarousel = dynamic(
  () => import('@/components/sections/TestimonialCarousel'),
  { ssr: false, loading: () => <p>Loading testimonials...</p> }
);
\`\`\`

By configuring explicit revalidations, prioritising layout images, and lazy-loading non-critical interactive components, you can ensure your Next.js application scores 95+ on Google Lighthouse.
    `,
    seoTitle: "Optimizing Next.js 15 Core Web Vitals | Trifusion Dynamics",
    seoDescription: "Learn to configure static/dynamic caching, Next.js image components, and code splitting in Next.js 15."
  }
];

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: "test-1",
    name: "Sanjay Singhania",
    role: "CEO",
    company: "Apex Retail Solutions",
    quote: "Trifusion Dynamics modernized our online ordering platform. Our page load speed dropped by 65%, and the automated invoice triggers saved our accounting team 10 hours a week.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "test-2",
    name: "Meera Nair",
    role: "Co-Founder",
    company: "Zeta Fintech India",
    quote: "Working with Arun and his team was outstanding. They engineered an AI document summarizer that integrates seamlessly with our dashboard, built within a highly secure Kubernetes container.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "test-3",
    name: "Rajesh Viswanathan",
    role: "Managing Director",
    company: "Vishwa Ventures",
    quote: "What used to take 4 hours per file now takes under 30 seconds. Trifusion delivered a system that fundamentally transformed our financial audit operations with 99.4% parsing accuracy.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "test-4",
    name: "Aditi Sharma",
    role: "VP of Product",
    company: "Triflow Technologies",
    quote: "The team's execution was flawless. They built an interface that is beautiful, fast, and extremely stable — supporting 10,000 concurrent users with sub-1.1 second load times.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "test-5",
    name: "Dr. Amit Varma",
    role: "Co-Founder",
    company: "Medikart Healthcare",
    quote: "Our mobile conversion rate skyrocketed after Trifusion's launch. The offline capability and smooth GPS tracking solved our biggest customer pain points across 3G networks.",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80"
  }
];
