import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { BlogPost } from "@/lib/cms-static-data";

interface BlogPreviewProps {
  posts: BlogPost[];
}

export default function BlogPreview({ posts }: BlogPreviewProps) {
  return (
    <section className="py-24 bg-[#070a13] relative">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Insights</h2>
            <p className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
              Engineering & AI Deep Dives
            </p>
          </div>
          <Link
            href="/blog"
            className="group flex items-center gap-2 text-sm font-semibold text-primary hover:text-white transition-colors"
          >
            Read All Articles
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Blog Post List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.slice(0, 2).map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col sm:flex-row rounded-3xl bg-[#0f172a]/45 border border-white/5 overflow-hidden transition-all hover:border-primary/20 hover:bg-[#0f172a]/70"
            >
              {/* Cover Image */}
              <div className="relative aspect-video sm:aspect-auto sm:w-2/5 min-h-[200px] bg-slate-950">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-w-768px) 100vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-103"
                />
              </div>

              {/* Text Info */}
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <span className="inline-block rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[10px] font-semibold text-primary mb-4">
                    {post.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                    {post.summary}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 border-t border-white/5 pt-4">
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
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
