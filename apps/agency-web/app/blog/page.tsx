import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { getBlogPosts } from "@/lib/api";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = constructMetadata({
  title: "Insights, Technology & AI Strategy",
  description: "Read our technical reviews, SaaS engineering deep dives, and custom workflow automation tutorials.",
  slug: "blog",
});

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-20 right-10 h-[250px] w-[250px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Insights</span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mt-3 mb-6 tracking-tight">
            Engineering & <br />
            <span className="text-gradient-cyan-blue">Technology Insights.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Written by our architects and builders. Deep dives into vector databases, Next.js optimization, multi-tenant schemas, and enterprise automations.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-3xl bg-[#0f172a]/45 border border-white/5 overflow-hidden transition-all hover:border-primary/20 hover:bg-[#0f172a]/70"
            >
              {/* Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-w-768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-103"
                />
                <span className="absolute top-4 left-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-semibold text-primary border border-white/5">
                  {post.category}
                </span>
              </div>

              {/* Copy */}
              <div className="flex-1 flex flex-col justify-between p-8">
                <div>
                  <h2 className="text-xl font-display font-bold text-white mb-3 group-hover:text-primary transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-6">
                    {post.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-4">
                  {/* Author block */}
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-slate-900 border border-white/10">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{post.author.name}</p>
                      <p className="text-[10px] text-slate-500">{post.author.role}</p>
                    </div>
                  </div>

                  {/* Read Metadata */}
                  <div className="flex items-center gap-3.5 text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
