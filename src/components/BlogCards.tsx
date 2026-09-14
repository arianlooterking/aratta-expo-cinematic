import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Clock3 } from "lucide-react";
import type { BlogPost, SiteContent } from "@/data/aratta-content";

type BlogCardsProps = {
  content: SiteContent;
  posts: BlogPost[];
  limit?: number;
};

export function BlogCards({ content, posts, limit }: BlogCardsProps) {
  const visiblePosts = typeof limit === "number" ? posts.slice(0, limit) : posts;

  if (visiblePosts.length === 0) {
    return (
      <div className="industrial-card rounded-[2rem] p-8 text-center">
        <BookOpenText className="mx-auto text-[var(--cyan)]" size={30} />
        <p className="mt-4 font-bold text-white/64">{content.blog.emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visiblePosts.map((post) => (
        <BlogCard key={post.slug} content={content} post={post} />
      ))}
    </div>
  );
}

function BlogCard({ content, post }: { content: SiteContent; post: BlogPost }) {
  return (
    <article className="industrial-card group flex min-h-full flex-col overflow-hidden rounded-[2rem] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/36">
      <Link
        href={`/${content.lang}/blog/${post.slug}`}
        className="relative block aspect-[16/10] overflow-hidden"
        aria-label={`${content.blog.readMoreLabel}: ${post.title}`}
      >
        <Image
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          unoptimized
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/12 to-transparent" />
        <span className="absolute start-4 top-4 rounded-full border border-white/14 bg-black/48 px-3 py-1.5 text-xs font-black text-white/86 backdrop-blur-xl">
          {post.category}
        </span>
        {post.featured ? (
          <span className="absolute end-4 top-4 rounded-full border border-amber-200/24 bg-amber-200/14 px-3 py-1.5 text-xs font-black text-amber-50 backdrop-blur-xl">
            {content.blog.featuredLabel}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-white/46">
          <time>{post.publishedAt}</time>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />
            {post.readTime}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-black leading-[1.45] text-white">{post.title}</h3>
        <p className="mt-4 line-clamp-3 leading-8 text-white/62">{post.excerpt}</p>
        <Link
          href={`/${content.lang}/blog/${post.slug}`}
          className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 font-black text-[var(--gold)]"
        >
          {content.blog.readMoreLabel}
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
