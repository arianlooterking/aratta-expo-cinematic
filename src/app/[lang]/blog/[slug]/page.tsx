import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText, Clock3, UserRound } from "lucide-react";
import { BlogCards } from "@/components/BlogCards";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import {
  getContent,
  getPublishedBlogPost,
  getPublishedBlogPosts,
} from "@/data/aratta-content";
import { isLang, languages } from "@/lib/lang";
import { getLanguageSeo, siteName } from "@/lib/seo";

type BlogPostPageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

export function generateStaticParams() {
  return languages.flatMap((lang) =>
    getPublishedBlogPosts(lang).map((post) => ({ lang, slug: post.slug })),
  );
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const post = getPublishedBlogPost(lang, slug);
  if (!post) return {};
  const seo = getLanguageSeo(lang);

  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: {
      canonical: `/${lang}/blog/${post.slug}`,
      languages: {
        fa: `/fa/blog/${post.slug}`,
        en: `/en/blog/${post.slug}`,
      },
    },
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: `/${lang}/blog/${post.slug}`,
      siteName,
      locale: seo.locale,
      alternateLocale: [seo.alternateLocale],
      type: "article",
      authors: [post.author],
      images: [{ url: post.coverImage, alt: post.coverAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.seoDescription,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();

  const content = getContent(lang);
  const post = getPublishedBlogPost(lang, slug);
  if (!post) notFound();
  const relatedPosts = getPublishedBlogPosts(lang).filter((item) => item.slug !== post.slug).slice(0, 2);
  const BackIcon = content.dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <>
      <SiteChrome content={content} />
      <main id="main-content" dir={content.dir} lang={content.lang} className="min-h-screen pt-28 sm:pt-32">
        <article className="section-shell pb-24">
          <Link
            href={`/${content.lang}/blog`}
            className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/12 bg-ink/[0.045] px-4 py-2 text-sm font-black text-ink-72 transition hover:bg-ink/[0.09] hover:text-ink"
          >
            <BackIcon size={17} />
            {content.lang === "fa" ? "بازگشت به مجله" : "Back to the journal"}
          </Link>

          <header className="on-photo relative isolate min-h-[520px] overflow-hidden rounded-[2.4rem] border border-ink/14 p-6 shadow-2xl shadow-umbra/40 sm:p-8 lg:p-10">
            <Image
              src={post.coverImage}
              alt={post.coverAlt}
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 1180px, 100vw"
              className="absolute inset-0 -z-10 object-cover object-center"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,5,8,0.16),rgba(2,5,8,0.94)_82%)]" />
            <div className="relative flex min-h-[440px] max-w-[58rem] flex-col justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-aqua-200/24 bg-aqua-200/10 px-3 py-1.5 text-xs font-black text-aqua-50 backdrop-blur-xl">
                  {post.category}
                </span>
                {post.featured ? (
                  <span className="rounded-full border border-gilt-200/24 bg-gilt-200/12 px-3 py-1.5 text-xs font-black text-gilt-50 backdrop-blur-xl">
                    {content.blog.featuredLabel}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 text-[clamp(2.15rem,5vw,4.8rem)] font-black leading-[1.16] text-ink">
                {post.title}
              </h1>
              <p className="site-copy mt-5 text-lg font-semibold text-ink-74 sm:text-xl">{post.excerpt}</p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-ink-58">
                <time>{post.publishedAt}</time>
                <span className="inline-flex items-center gap-2"><Clock3 size={16} />{post.readTime}</span>
                <span className="inline-flex items-center gap-2"><UserRound size={16} />{post.author}</span>
              </div>
            </div>
          </header>

          <div className="mx-auto mt-10 grid max-w-[72rem] gap-8 lg:grid-cols-[1fr_16rem] lg:items-start">
            <div className="glass rounded-[2rem] p-6 sm:p-8 lg:p-10">
              <div className="mb-7 flex items-center gap-3 text-[var(--cyan)]">
                <BookOpenText size={22} />
                <span className="text-sm font-black">{content.blog.kicker}</span>
              </div>
              <div className="space-y-6">
                {post.body.map((paragraph, index) => (
                  <p key={`${post.slug}-${index}`} className="text-base font-semibold leading-[2.15] text-ink-76 sm:text-lg">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <aside className="industrial-card rounded-[1.7rem] p-5 lg:sticky lg:top-32">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gold)]">
                {content.lang === "fa" ? "خلاصه مقاله" : "Article details"}
              </div>
              <dl className="mt-5 grid gap-4 text-sm">
                <div><dt className="text-ink-42">{content.lang === "fa" ? "موضوع" : "Topic"}</dt><dd className="mt-1 font-black text-ink-82">{post.category}</dd></div>
                <div><dt className="text-ink-42">{content.lang === "fa" ? "زمان مطالعه" : "Reading time"}</dt><dd className="mt-1 font-black text-ink-82">{post.readTime}</dd></div>
                <div><dt className="text-ink-42">{content.lang === "fa" ? "نویسنده" : "Author"}</dt><dd className="mt-1 font-black text-ink-82">{post.author}</dd></div>
              </dl>
            </aside>
          </div>

          {relatedPosts.length ? (
            <section className="mt-16" aria-labelledby="related-blog-posts">
              <div className="section-kicker">{content.blog.kicker}</div>
              <h2 id="related-blog-posts" className="section-display-title mt-4 font-black text-ink">
                {content.lang === "fa" ? "مقاله‌های پیشنهادی بعدی" : "Continue reading"}
              </h2>
              <div className="mt-8">
                <BlogCards content={content} posts={relatedPosts} />
              </div>
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
