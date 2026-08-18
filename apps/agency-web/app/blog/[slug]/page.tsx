import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from "lucide-react";
import { getBlogPosts, getBlogPostBySlug } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return constructMetadata({ title: "Article Not Found" });
  }

  return constructMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.summary,
    image: post.coverImage,
    slug: `blog/${slug}`,
  });
}

export default async function BlogPostDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = await getBlogPosts();
  const nextPost = allPosts.find((p) => p.slug !== slug);

  // Article JSON-LD Structured Data
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": post.coverImage,
    "datePublished": new Date(post.date).toISOString(),
    "author": {
      "@type": "Person",
      "name": post.author.name,
      "jobTitle": post.author.role,
    },
    "description": post.summary,
  };

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Dynamic structured data script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary mb-10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all articles
        </Link>

        {/* Header Block */}
        <div className="mb-10">
          <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-4">
            {post.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight leading-tight mb-6">
            {post.title}
          </h1>

          {/* Author & Meta Row */}
          <div className="flex flex-wrap items-center justify-between gap-6 border-y border-white/5 py-5 mt-6">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-900 border border-white/10">
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{post.author.name}</p>
                <p className="text-xs text-slate-500">{post.author.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {post.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </span>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 border border-white/5 mb-12">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Body Content with Custom Styled Markdown Elements */}
        <div className="mb-16">
          <ReactMarkdown
            components={{
              h1: ({ ...props }) => (
                <h1
                  className="text-2xl sm:text-3xl font-display font-extrabold text-white mt-10 mb-4 border-b border-white/5 pb-2.5 tracking-tight"
                  {...props}
                />
              ),
              h2: ({ ...props }) => (
                <h2
                  className="text-xl sm:text-2xl font-display font-bold text-white mt-8 mb-4 tracking-tight"
                  {...props}
                />
              ),
              h3: ({ ...props }) => (
                <h3
                  className="text-lg sm:text-xl font-display font-bold text-white mt-6 mb-3"
                  {...props}
                />
              ),
              p: ({ ...props }) => (
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6" {...props} />
              ),
              ul: ({ ...props }) => (
                <ul className="list-disc pl-6 mb-6 text-slate-300 space-y-2 text-sm sm:text-base" {...props} />
              ),
              ol: ({ ...props }) => (
                <ol className="list-decimal pl-6 mb-6 text-slate-300 space-y-2 text-sm sm:text-base" {...props} />
              ),
              li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
              code: ({ ...props }) => (
                <code
                  className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-xs font-mono text-primary"
                  {...props}
                />
              ),
              pre: ({ ...props }) => (
                <pre
                  className="rounded-2xl border border-white/5 bg-[#0b0f19] p-5 overflow-x-auto text-[11px] sm:text-xs font-mono text-slate-200 mb-6 leading-relaxed"
                  {...props}
                />
              ),
              blockquote: ({ ...props }) => (
                <blockquote
                  className="border-l-4 border-primary bg-white/5 p-4 rounded-r-xl italic my-6 text-slate-300 text-sm sm:text-base"
                  {...props}
                />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Next Post Navigation */}
        {nextPost && (
          <div className="border-t border-white/5 pt-12 text-center">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Up Next</p>
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group inline-flex items-center gap-2 text-lg sm:text-xl font-display font-bold text-white hover:text-primary transition-colors"
            >
              {nextPost.title}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
