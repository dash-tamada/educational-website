"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { JOURNAL, JOURNAL_TAGS, POSTS, fmtDate, getAuthor, tagCounts, type JournalTag, type Post } from "@/lib/content/journal";
import { ArrowLink, Button, Photo } from "@/components/editorial";
import { Reveal } from "@/components/motion/Reveal";
import { PostCard } from "./PostCard";

/* =============================================================================
   JOURNAL FEED (Mobius "Feed"). Cream.
   Tag chips (All · Prompting · Direction · Sound · Edit · Tools, with counts) filter
   the notes; the choice lives in the URL (?tag=sound, replaceState, shareable).
   The newest matching note is featured large (copy left, cover right, so the
   fixed clock lands on the photo, not on text); the rest fill a 3-column feed whose
   middle column steps down (Mobius), six at a time with "Load more".
   Client-rendered pieces wire their own reveals (<Reveal>), not the route scanner.
   <JournalFeed /> reads the URL (wrap it in <Suspense>); <FeedView tag={null} /> is
   the static fallback.
   ============================================================================= */

const SHAPES = ["landscape", "portrait", "square"] as const;
const COUNTS = tagCounts();

const parseTag = (v: string | null): JournalTag | null => JOURNAL_TAGS.find((t) => t.toLowerCase() === (v ?? "").toLowerCase()) ?? null;

export function JournalFeed() {
  const params = useSearchParams();
  return <FeedView tag={parseTag(params.get("tag"))} />;
}

export function FeedView({ tag }: { tag: JournalTag | null }) {
  const posts = tag ? POSTS.filter((p) => p.tag === tag) : POSTS;
  const [featured, ...rest] = posts;

  const choose = (t: JournalTag | null) => {
    const url = t ? `${window.location.pathname}?tag=${t.toLowerCase()}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-4 border-y border-line py-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter notes by topic" className="-mx-1 flex flex-wrap gap-2">
          {[null, ...JOURNAL_TAGS].map((t) => {
            const on = t === tag;
            const count = t ? COUNTS[t] : POSTS.length;
            return (
              <button
                key={t ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => choose(t)}
                className={clsx(
                  "t-label tap flex h-10 items-center gap-2.5 rounded-full border px-4 transition-colors duration-300 coarse:h-11",
                  on ? "border-ink bg-ink text-cream" : "border-line-strong text-fg hf:border-ink",
                )}
              >
                {on && <span aria-hidden className="block size-[6px] rounded-full bg-red" />}
                {t ?? JOURNAL.all}
                <span className={clsx("t-timecode", on ? "text-cream/60" : "text-muted")}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="t-timecode text-muted" aria-live="polite">
          {posts.length} {posts.length === 1 ? "note" : "notes"}
          {tag ? ` · ${tag}` : ""}
        </p>
      </div>

      {!featured ? (
        <p className="t-statement-m py-24 text-muted">{JOURNAL.empty}</p>
      ) : (
        <>
          <Featured key={featured.slug} post={featured} label={tag ? `Latest in ${tag}` : JOURNAL.featured} />
          <FeedGrid key={tag ?? "all"} posts={rest} />
        </>
      )}
    </div>
  );
}

function Featured({ post, label }: { post: Post; label: string }) {
  const a = getAuthor(post);
  const href = `/journal/${post.slug}`;
  return (
    <Reveal as="section" aria-label={label} className="edit-grid mt-[clamp(40px,5vw,72px)] items-end gap-y-8">
      <Link href={href} tabIndex={-1} aria-hidden className="hover-zoom-parent group col-span-12 block lg:col-span-7 lg:col-start-6 lg:row-start-1">
        <Photo k={post.cover} ratio={10 / 16} preload sizes="(min-width: 1024px) 58vw, 100vw" className="aspect-[16/10]" imgClassName="hover-zoom" />
      </Link>
      <div className="col-span-12 lg:order-1 lg:col-span-4 lg:col-start-1 lg:row-start-1">
        <p className="t-label flex items-center gap-3">
          <span aria-hidden className="block size-[7px] bg-red" />
          {label}
        </p>
        <p className="t-timecode mt-6 flex flex-wrap gap-x-2 text-muted">
          <time dateTime={post.date}>{fmtDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span className="text-fg">{post.tag}</span>
          <span aria-hidden>·</span>
          <span>{post.minutes} min read</span>
        </p>
        <h2 className="t-headline-l mt-4">
          <Link href={href} className="transition-colors duration-300 hf:text-red">
            {post.title}
          </Link>
        </h2>
        <p className="t-body-l mt-5 max-w-[30rem] text-muted">{post.excerpt}</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Photo k={a.photo} ratio={1} sizes="40px" alt="" className="size-10 shrink-0 rounded-full" />
            <p>
              <span className="block text-[14px] font-semibold">{a.name}</span>
              <span className="t-caption block">{a.role}</span>
            </p>
          </div>
          <ArrowLink href={href} size="lg">
            Read the note
          </ArrowLink>
        </div>
      </div>
    </Reveal>
  );
}

function FeedGrid({ posts }: { posts: Post[] }) {
  const [shown, setShown] = useState<number>(JOURNAL.pageSize);
  const visible = posts.slice(0, shown);
  const left = posts.length - visible.length;
  if (!posts.length) return null;
  return (
    <>
      <ul className="mt-[clamp(72px,9vw,140px)] grid gap-x-grid gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:[&>li:nth-child(3n+2)]:mt-[clamp(56px,7vw,128px)]">
        {visible.map((p, i) => (
          <Reveal as="li" key={p.slug} y={32}>
            <PostCard post={p} shape={SHAPES[i % SHAPES.length]} />
          </Reveal>
        ))}
      </ul>
      {left > 0 && (
        <div className="mt-[clamp(56px,7vw,104px)] flex flex-col items-center gap-3">
          <Button variant="outline" onClick={() => setShown((n) => n + JOURNAL.pageSize)}>
            {`${JOURNAL.more} (${left})`}
          </Button>
          <p className="t-timecode text-muted">
            Showing {visible.length + 1} of {posts.length + 1}
          </p>
        </div>
      )}
    </>
  );
}
