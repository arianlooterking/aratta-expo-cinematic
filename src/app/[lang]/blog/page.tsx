import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { BlogCards } from "@/components/BlogCards";
import { SiteChrome } from "@/components/SiteChrome";
import { getContent, getPublishedBlogPosts } from "@/data/aratta-content";
import { getBrandAssets } from "@/lib/brand-assets";
import { isLang, languages } from "@/lib/lang";
import { getLanguageSeo, siteName, socialPreviewImage } from "@/lib/seo";

type BlogPageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const content = getContent(lang);
  const seo = getLanguageSeo(lang);
  const brand = getBrandAssets(lang);
  const title = `${content.blog.title} | ${seo.shortTitle}`;
  const description = content.blog.body;

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/blog`,
      languages: { fa: "/fa/blog", en: "/en/blog" },
    },
    icons: {
      icon: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
      apple: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/blog`,
      siteName,
      locale: seo.locale,
      alternateLocale: [seo.alternateLocale],
      type: "website",
      images: [{ ...socialPreviewImage, alt: seo.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialPreviewImage.url],
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const content = getContent(lang);
  const posts = getPublishedBlogPosts(lang);

  return (
    <>
      <SiteChrome content={content} />
      <main id="main-content" dir={content.dir} lang={content.lang} className="min-h-screen pt-32">
        <section className="section-shell pb-24">
          <header className="relative isolate min-h-[390px] overflow-hidden rounded-[2.2rem] border border-white/14 p-6 shadow-2xl shadow-black/30 lg:p-8">
            <Image
              src="/hero-v6/desktop/stage-05.webp"
              alt=""
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 1180px, 100vw"
              className="absolute inset-0 -z-10 object-cover object-center"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,5,8,0.94)_0%,rgba(2,5,8,0.76)_50%,rgba(2,5,8,0.26)_100%)] rtl:bg-[linear-gradient(270deg,rgba(2,5,8,0.94)_0%,rgba(2,5,8,0.76)_50%,rgba(2,5,8,0.26)_100%)]" />
            <div className="relative flex min-h-[325px] max-w-[52rem] flex-col justify-end">
              <div className="section-kicker">{content.blog.kicker}</div>
              <h1 className="page-display-title mt-4 font-black text-white">{content.blog.title}</h1>
              <p className="site-copy mt-5 text-lg font-semibold text-white/72 sm:text-xl">
                {content.blog.body}
              </p>
              <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/22 bg-black/34 px-4 py-2 text-sm font-black text-white/76 backdrop-blur-xl">
                <BookOpenText size={17} className="text-[var(--cyan)]" />
                {content.lang === "fa" ? `${posts.length} مقاله منتشرشده` : `${posts.length} published articles`}
              </div>
            </div>
          </header>

          <div className="mt-10">
            <BlogCards content={content} posts={posts} />
          </div>
        </section>
      </main>
    </>
  );
}
