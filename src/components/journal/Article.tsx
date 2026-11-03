import Link from "next/link";
import clsx from "clsx";
import { fmtDate, getAuthor, headingId, postIndex, type Block, type Post } from "@/lib/content/journal";
import { media } from "@/lib/media";
import { ArrowIcon, ArrowLink, ParallaxPhoto, Photo, RedWords, SplitReveal } from "@/components/editorial";
import { PromptCard } from "./PromptCard";
import { ShareRow } from "./ShareRow";

/* =============================================================================
   ARTICLE (Mobius "The Logic of Emotion" x Marlowe). Server components.
   <ArticleHeader>  back link | meta in mono caps, the title in giant Inter Tight,
                    the dek, the byline; then the cover, full bleed, drifting.
   <ArticleBody>    a sticky left rail (ghost "03/08" index, "In this note" contents,
                    share) + the body on the editorial grid: paragraphs, h2s with
                    Mobius ghost letters (/A /B) in the right margin, pull quotes with
                    a red word (wider than the text), figures, PROMPT cards, lists.
   <AuthorBox>      written by: portrait, name, role, bio, link to the crew.
   ============================================================================= */

const n2 = (n: number) => String(n).padStart(2, "0");

export function ArticleHeader({ post }: { post: Post }) {
  const a = getAuthor(post);
  const cover = media(post.cover);
  return (
    <header className="ground-cream relative">
      <div className="container-wide pt-[calc(var(--header-offset)+var(--sat)+clamp(32px,7vh,96px))]">
        <div className="edit-grid gap-y-8">
          <div className="col-span-12 lg:col-span-3">
            <Link href="/journal" className="e-arrow group t-label inline-flex items-center gap-3 text-muted hf:text-fg">
              <ArrowIcon dir="left" className="size-3.5" />
              <span className="link-draw">All notes</span>
            </Link>
          </div>
          <div className="col-span-12 lg:col-span-8 lg:col-start-4">
            <p className="t-timecode flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              <Link href={`/journal?tag=${post.tag.toLowerCase()}`} className="link-draw text-red-deep">
                {post.tag}
              </Link>
              <span aria-hidden>·</span>
              <time dateTime={post.date}>{fmtDate(post.date)}</time>
              <span aria-hidden>·</span>
              <span>{post.minutes} min read</span>
            </p>
            <SplitReveal as="h1" immediate className="mt-6 font-heading text-[clamp(2.75rem,1.2rem+5.4vw,7.25rem)] leading-[0.94] font-bold tracking-[-0.052em]">
              {post.title}
            </SplitReveal>
            <p data-reveal="rise" className="t-body-l mt-8 max-w-[40rem] text-muted">
              {post.excerpt}
            </p>
            <div data-reveal="rise" data-reveal-delay="0.06" className="mt-8 flex items-center gap-3">
              <Photo k={a.photo} ratio={1} sizes="44px" alt="" className="size-11 shrink-0 rounded-full" />
              <p>
                <span className="block text-[14.5px] font-semibold">{a.name}</span>
                <span className="t-caption block">{a.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <figure className="container-wide mt-[clamp(48px,7vw,104px)]">
        <ParallaxPhoto k={post.cover} preload sizes="(min-width: 1792px) 1760px, 100vw" amount={6} className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]" />
        <figcaption className="t-timecode mt-3 text-muted">Cover · {cover.alt}</figcaption>
      </figure>
    </header>
  );
}

function BlockView({ block, letter }: { block: Block; letter?: string }) {
  switch (block.type) {
    case "p":
      return <p className="col-span-9 text-[1.0625rem] leading-[1.75] tracking-[-0.008em] text-ink/85 lg:col-span-6 lg:text-[1.125rem]">{block.text}</p>;
    case "h2":
      return (
        <h2 id={headingId(block.text)} className="relative col-span-9 mt-10 t-headline-m lg:col-span-6 lg:mt-14">
          {letter && (
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-[calc(100%+clamp(32px,6vw,120px))] hidden -translate-y-1/2 font-heading text-[clamp(3rem,2rem+3vw,5.5rem)] leading-none font-bold tracking-[-0.05em] whitespace-nowrap text-ink/[0.08] select-none lg:block">
              /{letter}
            </span>
          )}
          {block.text}
        </h2>
      );
    case "quote":
      return (
        <blockquote className="col-span-9 my-8 lg:my-14">
          <SplitReveal as="p" className="font-heading text-[clamp(1.875rem,1.1rem+2.8vw,4rem)] leading-[1.04] font-semibold tracking-[-0.042em] lg:indent-[14%]">
            <RedWords text={block.text} red={block.red} />
          </SplitReveal>
        </blockquote>
      );
    case "image":
      return (
        <figure className="col-span-9 my-6 lg:col-span-8 lg:my-10">
          <ParallaxPhoto k={block.image} sizes="(min-width: 1024px) 60vw, 100vw" amount={6} className="aspect-[16/10]" />
          <figcaption className="t-timecode mt-3 text-muted">{block.caption}</figcaption>
        </figure>
      );
    case "prompt":
      return <PromptCard label={block.label} tool={block.tool} text={block.text} kind={block.kind} className="col-span-9 my-4 lg:col-span-7 lg:my-6" />;
    case "list":
      return (
        <ul className="col-span-9 grid gap-3 lg:col-span-6">
          {block.items.map((it) => (
            <li key={it} className="grid grid-cols-[18px_1fr] text-[1.0625rem] leading-[1.65] text-ink/85 lg:text-[1.125rem]">
              <span aria-hidden className="mt-[0.68em] block size-[6px] bg-red" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
  }
}

export function ArticleBody({ post }: { post: Post }) {
  const { n, total } = postIndex(post.slug);
  const headings = post.body.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");
  const letters = new Map(headings.map((h, i) => [h, String.fromCharCode(65 + (i % 26))]));
  const path = `/journal/${post.slug}`;
  return (
    <div id="article-body" className="ground-cream relative">
      <div className="container-wide edit-grid gap-y-10 py-[clamp(56px,8vw,128px)]">
        {/* Left rail */}
        <aside aria-label="About this note" className="col-span-12 max-lg:hidden lg:col-span-3">
          <div className="lg:sticky lg:top-[calc(var(--header-offset)+40px)]">
            <p aria-hidden className="font-heading text-[clamp(3rem,2rem+2.6vw,4.75rem)] leading-none font-bold tracking-[-0.05em] text-ink/[0.09] select-none">
              {n2(n)}/{n2(total)}
            </p>
            {headings.length > 0 && (
              <nav aria-label="In this note" className="mt-10">
                <p className="t-timecode text-muted">In this note</p>
                <ol className="mt-3 grid gap-2">
                  {headings.map((h) => (
                    <li key={h.text}>
                      <a href={`#${headingId(h.text)}`} className="t-small grid grid-cols-[22px_1fr] text-muted transition-colors hf:text-fg">
                        <span className="t-timecode pt-[3px]">{letters.get(h)}</span>
                        <span className="max-w-[15rem]">{h.text}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <ShareRow path={path} title={post.title} stacked className="mt-10" />
          </div>
        </aside>

        {/* Body */}
        <article aria-labelledby="article-title" className="col-span-12 grid grid-cols-9 gap-x-grid gap-y-6 lg:col-span-9 lg:col-start-4">
          <h2 id="article-title" className="sr-only">
            {post.title}
          </h2>
          {post.body.map((b, i) => (
            <BlockView key={i} block={b} letter={b.type === "h2" ? letters.get(b) : undefined} />
          ))}
          <p className="t-timecode col-span-9 mt-6 text-muted lg:col-span-6">
            — {getAuthor(post).name}, {fmtDate(post.date)}
          </p>
          <ShareRow path={path} title={post.title} className="col-span-9 mt-4 border-t border-line pt-6 lg:hidden" />
        </article>
      </div>
    </div>
  );
}

export function AuthorBox({ post, className }: { post: Post; className?: string }) {
  const a = getAuthor(post);
  return (
    <aside aria-label="About the author" className={clsx("grid grid-cols-[88px_minmax(0,1fr)] gap-5 border-t border-line pt-8 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-8", className)}>
      <Photo k={a.photo} ratio={1} sizes="132px" alt="" className="aspect-square" />
      <div>
        <p className="t-timecode text-muted">Written by</p>
        <p className="t-headline-m mt-2">{a.name}</p>
        <p className="t-label mt-2 text-muted">{a.role}</p>
        <p className="t-small mt-4 max-w-[34rem] text-muted">{a.bio}</p>
        <div className="mt-5">
          <ArrowLink href="/about">Meet the crew</ArrowLink>
        </div>
      </div>
    </aside>
  );
}
