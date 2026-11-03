import Link from "next/link";
import { fmtDate, postIndex, type Post } from "@/lib/content/journal";
import { ArrowIcon, Eyebrow, Photo, SplitReveal } from "@/components/editorial";
import { PostCard } from "./PostCard";

/* =============================================================================
   Article ending. <ReadMore> (Mobius "Read More"): two related notes, cream.
   <NextNote> (ink): one giant link to the next note: index, tag + date, the title
   in huge Inter Tight with a red arrow, the cover easing in on the right on hover.
   Server components.
   ============================================================================= */

export function ReadMore({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  return (
    <section aria-labelledby="read-more-title" className="ground-cream relative">
      <div className="container-wide edit-grid gap-y-10 pb-section">
        <div className="col-span-12 lg:col-span-3">
          <Eyebrow>Keep reading</Eyebrow>
        </div>
        <div className="col-span-12 lg:col-span-9 lg:col-start-4">
          <SplitReveal as="h2" id="read-more-title" className="t-headline-xl">
            Read more
          </SplitReveal>
          <ul data-reveal-stagger="rise" className="mt-[clamp(40px,5vw,72px)] grid gap-x-grid gap-y-14 sm:grid-cols-2">
            {posts.map((p, i) => (
              <li key={p.slug}>
                <PostCard post={p} shape={i % 2 ? "portrait" : "square"} sizes="(min-width: 1024px) 34vw, (min-width: 640px) 46vw, 92vw" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function NextNote({ post }: { post: Post }) {
  const { n, total } = postIndex(post.slug);
  return (
    <section aria-label="Next note" className="theatre relative border-b border-line">
      <Link href={`/journal/${post.slug}`} className="group container-wide edit-grid items-center gap-y-8 py-[clamp(72px,10vw,160px)]">
        <div className="col-span-12 flex items-center justify-between lg:col-span-3 lg:flex-col lg:items-start lg:gap-6">
          <p className="t-label flex items-center gap-3">
            <span aria-hidden className="block size-[7px] bg-red" />
            Next note
          </p>
          <p className="t-timecode text-ash">
            {String(n).padStart(2, "0")}/{String(total).padStart(2, "0")} · {post.tag} · <time dateTime={post.date}>{fmtDate(post.date)}</time>
          </p>
        </div>
        <div className="col-span-12 lg:col-span-6 lg:col-start-4">
          <p className="font-heading text-[clamp(2.5rem,1.2rem+4.6vw,6.5rem)] leading-[0.95] font-bold tracking-[-0.05em] transition-colors duration-300 group-hf:text-red-lite">
            {post.title}
            <ArrowIcon className="ml-[0.2em] inline-block size-[0.55em] align-middle text-red transition-transform duration-500 ease-expo group-hf:translate-x-3" />
          </p>
          <p className="t-small mt-6 max-w-[30rem] text-cream/70">{post.excerpt}</p>
        </div>
        <div className="col-span-12 lg:col-span-3 lg:col-start-10">
          <Photo
            k={post.cover}
            ratio={5 / 4}
            alt=""
            sizes="(min-width: 1024px) 22vw, 92vw"
            className="aspect-[4/5] max-lg:hidden"
            imgClassName="scale-[1.08] opacity-55 transition-[scale,opacity] duration-[1.1s] ease-expo group-hf:scale-100 group-hf:opacity-100"
          />
        </div>
      </Link>
    </section>
  );
}
