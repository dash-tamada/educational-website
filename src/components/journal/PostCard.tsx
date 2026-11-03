import Link from "next/link";
import clsx from "clsx";
import { fmtDate, getAuthor, type Post } from "@/lib/content/journal";
import { Photo } from "@/components/editorial";

/* =============================================================================
   Journal post card (Mobius feed): cover, date · tag · read time in mono caps,
   the title in Inter Tight, the excerpt. The whole card is one link. Server- and
   client-safe (the feed renders it from a client component).
   `shape` picks the cover crop so a 3-column feed gets Mobius' varied rhythm.
   ============================================================================= */

const SHAPES = {
  portrait: { cls: "aspect-[4/5]", r: 5 / 4 },
  square: { cls: "aspect-square", r: 1 },
  landscape: { cls: "aspect-[4/3]", r: 3 / 4 },
} as const;

export function PostCard({
  post,
  shape = "landscape",
  sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw",
  headingLevel = 3,
  className,
}: {
  post: Post;
  shape?: keyof typeof SHAPES;
  sizes?: string;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const s = SHAPES[shape];
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className={clsx("relative", className)}>
      <Link href={`/journal/${post.slug}`} className="hover-zoom-parent group block">
        <Photo k={post.cover} ratio={s.r} sizes={sizes} className={s.cls} imgClassName="hover-zoom" />
        <p className="t-timecode mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
          <time dateTime={post.date}>{fmtDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span className="text-fg">{post.tag}</span>
          <span aria-hidden>·</span>
          <span>{post.minutes} min read</span>
        </p>
        <H className="mt-3 font-heading text-[clamp(1.5rem,1.15rem+1vw,2.125rem)] leading-[1.06] font-semibold tracking-[-0.035em] transition-colors duration-300 group-hf:text-red">
          {post.title}
        </H>
        <p className="t-small mt-3 max-w-[30rem] text-muted">{post.excerpt}</p>
        <p className="t-label mt-4 text-muted">By {getAuthor(post).name}</p>
      </Link>
    </article>
  );
}
