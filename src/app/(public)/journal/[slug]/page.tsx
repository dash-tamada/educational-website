import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/app/SiteShell";
import { ArticleBody, ArticleHeader, AuthorBox } from "@/components/journal/Article";
import { NextNote, ReadMore } from "@/components/journal/ArticleEnd";
import { CourseCta } from "@/components/journal/CourseCta";
import { ReadingProgress } from "@/components/journal/ReadingProgress";
import { POSTS, getAuthor, getPost, nextPost, relatedPosts } from "@/lib/content/journal";
import { media } from "@/lib/media";

/* /journal/[slug] (Mobius article x Marlowe). Every note is prerendered; unknown slugs
   are a real 404. Order: header + cover, body with the sticky rail, author, course CTA,
   Read more (2 related), the big Next note link, footer. */

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Note not found", robots: { index: false } };
  const cover = media(post.cover);
  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: getAuthor(post).name }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: `${post.date}T09:00:00+05:30`,
      images: [{ url: `${cover.src}?w=1200&h=630&fit=crop&auto=format`, alt: cover.alt }],
    },
  };
}

export default async function JournalPostPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const next = nextPost(post.slug);
  const related = relatedPosts(post.slug, 2, [next.slug]);

  return (
    <SiteShell flush>
      <ReadingProgress target="#article-body" />
      <ArticleHeader post={post} />
      <ArticleBody post={post} />
      <section aria-label="Author and the course" className="ground-cream relative">
        <div className="container-wide edit-grid gap-y-16 pb-section">
          <AuthorBox post={post} className="col-span-12 lg:col-span-6 lg:col-start-4" />
          <CourseCta className="col-span-12 lg:col-span-9 lg:col-start-4" />
        </div>
      </section>
      <ReadMore posts={related} />
      <NextNote post={next} />
    </SiteShell>
  );
}
