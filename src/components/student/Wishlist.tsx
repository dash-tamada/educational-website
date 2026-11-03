"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button, CourseCard, DropdownMenu, EmptyState, Icon, PageHeader, Select, toast, type MenuItem } from "@/components/app";
import { cropSrc } from "@/lib/img";
import { lessonPoster } from "@/lib/media";
import { FLAGSHIP } from "@/lib/content/site";
import { useDb, demo } from "@/lib/demo/store";
import {
  MOCK_NOW_ISO,
  formatDate,
  formatDuration,
  formatINR,
  formatNumber,
  getCourseCard,
  getWorkingCoupons,
  isEnrolled,
  isWishlisted,
  plural,
  timeAgo,
  validateCoupon,
  type Course,
  type Db,
} from "@/lib/mock";
import { Hydrated, WishlistSkeleton } from "./Hydrated";
import { SectionTitle, idx } from "./bits";
import { getMyCourses, recommendations } from "./data";
import { rescueFocus } from "./hooks";
import { useStudentId } from "./prefs";
import { useMyWishlist, useWishlistRemove } from "./wishlist-actions";

/* =============================================================================
   Wishlist, v2: saved courses as ruled editorial rows (a square-cornered still,
   mono slate, Inter Tight title, price in Anton with the strike and today's best
   code in mono, red Buy / outline Free lesson / text Remove), a ruled "totted
   up" column, and an editorial empty state.
   ============================================================================= */

type SortKey = "saved" | "price-asc" | "price-desc" | "rating";

/**
 * Best working code for a course: the same list checkout offers ("Demo codes that work here"),
 * compared by the discount each one gives this learner on this course.
 */
function bestCoupon(uid: string, courseId: string, db: Db) {
  let best: ReturnType<typeof validateCoupon> | null = null;
  for (const c of getWorkingCoupons(courseId, uid, db)) {
    const r = validateCoupon(c.code, courseId, { userId: uid }, db);
    if (r.valid && r.discount > 0 && (!best || r.discount > best.discount)) best = r;
  }
  return best;
}

const HEADER = {
  eyebrow: "Student space",
  title: (
    <>
      Saved for <em>later</em>.
    </>
  ),
  description: "The courses you bookmarked while pretending to go to sleep.",
  breadcrumbs: [{ label: "Dashboard", href: "/dashboard" }, { label: "Wishlist" }],
};

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function WishlistFallback() {
  return <WishlistSkeleton header={<PageHeader {...HEADER} rule={false} />} />;
}

export function Wishlist() {
  return (
    <Hydrated fallback={<WishlistFallback />}>
      <WishlistInner />
    </Hydrated>
  );
}

function WishlistInner() {
  const db = useDb();
  const uid = useStudentId();
  const [sort, setSort] = useState<SortKey>("saved");
  const list = useRef<HTMLUListElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const removeFromWishlist = useWishlistRemove(uid);
  const saved = useMyWishlist(uid, db);
  const ownsSomething = useMemo(() => getMyCourses(uid, db).length > 0, [uid, db]);

  const items = useMemo(() => {
    const rows = saved.map((w) => ({
      ...w,
      card: getCourseCard(w.course.id, db),
      owned: isEnrolled(uid, w.course.id, db),
      coupon: bestCoupon(uid, w.course.id, db),
    }));
    if (sort !== "saved")
      rows.sort((a, b) => (sort === "price-asc" ? a.course.price - b.course.price : sort === "price-desc" ? b.course.price - a.course.price : b.course.rating - a.course.rating));
    return rows;
  }, [uid, db, sort, saved]);

  const buyable = items.filter((i) => !i.owned && i.course.status === "published");
  const total = buyable.reduce((s, i) => s + i.course.price, 0);
  const savings = buyable.reduce((s, i) => s + (i.coupon?.discount ?? 0), 0);
  const upcoming = db.coupons.find((c) => c.active && c.courseIds === null && c.startsAt > MOCK_NOW_ISO);

  const remove = (courseId: string, title: string, index: number) =>
    removeFromWishlist(courseId, title, () =>
      requestAnimationFrame(() => {
        // keep keyboard users in the list: next row's Remove button, else the previous one; when the
        // last one goes, the empty state's first link (the list and its count are gone)
        const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('[data-wl-remove], button[aria-haspopup="menu"]') ?? [])].filter((b) => b.offsetParent);
        (buttons[index] ?? buttons[index - 1] ?? countRef.current ?? emptyRef.current?.querySelector<HTMLElement>("a[href]"))?.focus();
      }),
    );

  return (
    <div className="app-enter">
      <PageHeader {...HEADER} rule={false} />

      {items.length === 0 ? (
        <>
          <div ref={emptyRef} className="grid gap-x-8 border-t border-fg lg:grid-cols-12">
            <EmptyState
              art="none"
              align="start"
              eyebrow="00 saved"
              className="px-0! pt-8! pb-12! lg:col-span-7"
              title={ownsSomething ? "Nothing to save. You already own the whole shelf." : "Nothing saved yet."}
              body={
                ownsSomething
                  ? "Tamada Media runs one course, done properly, and it's yours. New modules land inside it for free."
                  : "Tap the heart on the course page and it waits here, price, today's best code and the free lesson included."
              }
              action={
                ownsSomething ? (
                  <>
                    <Button href="/dashboard/courses" variant="ink" iconRight="arrow-right">
                      Go to my course
                    </Button>
                    <Button href="/courses" variant="outline">
                      The library
                    </Button>
                  </>
                ) : (
                  <>
                    <Button href={FLAGSHIP.freeLessonHref} variant="red" icon="play">
                      Watch free lesson
                    </Button>
                    <Button href="/courses" variant="outline">
                      Browse courses
                    </Button>
                  </>
                )
              }
            />
            <ul className="self-end border-t border-line pb-12 font-mono text-[11px] tracking-[0.06em] uppercase max-lg:mb-2 lg:col-span-4 lg:col-start-9 lg:mb-12 lg:border-t-0 lg:pb-0">
              {["Wishlists are private", "Prices include GST", "The first lesson is always free"].map((t, i) => (
                <li key={t} className="flex gap-4 border-b border-line py-2.5 lg:first:border-t">
                  <span className="text-muted">{idx(i + 1)}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Nudges
            uid={uid}
            onSaved={() =>
              // the nudges unmount as the list appears: land on the new row's title (or the count)
              rescueFocus(() => [...(list.current?.querySelectorAll<HTMLElement>("h2 a") ?? [])].find((a) => a.offsetParent) ?? countRef.current)
            }
          />
        </>
      ) : (
        <div className="grid items-start gap-x-10 gap-y-10 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <p ref={countRef} tabIndex={-1} className="font-mono text-[11px] tracking-[0.08em] uppercase focus:outline-none" role="status" aria-live="polite">
                {plural(items.length, "saved course")}
              </p>
              <div className={items.length > 1 ? "w-full sm:w-56" : "hidden"}>
                <Select
                  aria-label="Sort wishlist"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  options={[
                    { value: "saved", label: "Recently saved" },
                    { value: "price-asc", label: "Price: low to high" },
                    { value: "price-desc", label: "Price: high to low" },
                    { value: "rating", label: "Top rated" },
                  ]}
                />
              </div>
            </div>
            <ul ref={list} className="border-b border-line">
              {items.map(({ id, course, card, owned, coupon, createdAt }, i) => (
                <li key={id} className="app-fade border-t border-fg">
                  <WishRow n={i + 1} course={course} card={card} owned={owned} coupon={coupon} savedAt={createdAt} onRemove={() => remove(course.id, course.title, i)} />
                </li>
              ))}
            </ul>
          </div>

          <aside aria-label="Wishlist summary" className="xl:sticky xl:top-24">
            {buyable.length > 0 && (
              <section className="border-t border-fg pt-4">
                <h2 className="text-[11px] font-semibold tracking-[0.16em] uppercase">Totted up</h2>
                <dl className="mt-4 border-b border-line font-mono text-[12px] tracking-[0.02em] tabular-nums">
                  <div className="flex justify-between gap-3 border-t border-line py-2.5">
                    <dt className="text-muted uppercase">{plural(buyable.length, "course")} to buy</dt>
                    <dd>{formatINR(total)}</dd>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between gap-3 border-t border-line py-2.5">
                      <dt className="text-muted uppercase">Today&apos;s best codes</dt>
                      <dd className="text-red-deep">−{formatINR(savings)}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-3 border-t border-line py-3">
                    <dt className="uppercase">All of it</dt>
                    <dd className="t-display-s text-[2rem]">{formatINR(total - savings)}</dd>
                  </div>
                </dl>
                <p className="mt-3 t-small text-muted">Bought one at a time, GST included. The first lesson of each is free.</p>
              </section>
            )}
            <ul className="mt-8 border-b border-line t-small text-muted">
              {upcoming && (
                <li className="flex gap-3 border-t border-line py-3">
                  <Icon name="ticket" className="mt-0.5 size-4 shrink-0 text-fg" strokeWidth={1.6} />
                  <span>
                    <span className="font-mono text-[11px] tracking-[0.06em] text-fg uppercase">{upcoming.code}</span> goes live on {formatDate(upcoming.startsAt, "short")}. {upcoming.description}.
                  </span>
                </li>
              )}
              <li className="flex gap-3 border-t border-line py-3">
                <Icon name="info" className="mt-0.5 size-4 shrink-0 text-fg" strokeWidth={1.6} />
                Wishlists are private. Tutors never see who saved their course.
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}

/** One saved course: poster | title + meta | price + actions (stacks on phones). */
function WishRow({
  n,
  course,
  card,
  owned,
  coupon,
  savedAt,
  onRemove,
}: {
  n: number;
  course: Course;
  card: ReturnType<typeof getCourseCard>;
  owned: boolean;
  coupon: ReturnType<typeof bestCoupon>;
  savedAt: string;
  onRemove: () => void;
}) {
  const onSale = !owned && course.status === "published";
  const price = coupon?.coupon ? coupon.total : course.price;
  const poster = course.id === FLAGSHIP.id ? lessonPoster(1) : null;
  const img = poster?.src ?? course.thumbnail;
  const menu: MenuItem[] = [
    { label: "Course page", icon: "book", href: `/courses/${course.slug}` },
    ...(card?.tutor?.slug ? [{ label: `About ${card.tutor.name.split(" ")[0]}`, icon: "user" as const, href: `/tutors/${card.tutor.slug}` }] : []),
    { divider: true },
    { label: "Remove from wishlist", icon: "trash", danger: true, onSelect: onRemove },
  ];
  return (
    <article className="@container py-5 md:py-6">
      <div className="grid gap-x-6 gap-y-4 @[640px]:grid-cols-[200px_minmax(0,1fr)_200px] @[640px]:gap-x-8">
        <Link href={`/courses/${course.slug}`} tabIndex={-1} aria-hidden className="group relative block aspect-[16/10] overflow-hidden bg-ink @[640px]:self-start">
          <Image src={cropSrc(img, 10 / 16)} alt="" fill sizes="(min-width: 640px) 200px, 100vw" className="object-cover opacity-90 transition-[scale] duration-[1.2s] ease-expo group-hf:scale-[1.04]" style={{ objectPosition: poster?.pos }} />
          <span className="absolute top-2.5 left-3 font-mono text-[10.5px] tracking-[0.08em] text-cream uppercase">{idx(n)}</span>
        </Link>

        <div className="min-w-0">
          <p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
            {card?.category && <span>{card.category.name}</span>}
            <span>{course.level}</span>
            {owned && <span className="text-fg">You own this</span>}
            {course.status !== "published" && <span className="text-red-deep">Not on sale right now</span>}
          </p>
          <h2 className="mt-2.5 font-heading text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)] leading-[1.08] font-semibold tracking-[-0.03em]">
            <Link href={`/courses/${course.slug}`} className="transition-colors hf:text-red">
              {course.title}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-2 max-w-[56ch] t-small text-muted">{course.promise}</p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
            {card?.tutor && <span>{card.tutor.name}</span>}
            <span>★ {course.rating.toFixed(1)}</span>
            {card && (
              <span>
                {formatDuration(card.stats.totalSec)} · {card.stats.videos} videos
              </span>
            )}
            <span>Saved {timeAgo(savedAt)}</span>
            <span className="max-sm:hidden">{formatNumber(course.learners)} learners</span>
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4 @[640px]:items-end @[640px]:border-0 @[640px]:pt-0 @[640px]:text-right">
          {onSale && (
            <div>
              <p className="flex items-baseline gap-2.5 @[640px]:justify-end">
                <span className="t-display-s text-[2rem] leading-none">{formatINR(course.price)}</span>
                {course.compareAtPrice && (
                  <span className="font-mono text-[12px] text-muted line-through">
                    <span className="sr-only">was </span>
                    {formatINR(course.compareAtPrice)}
                  </span>
                )}
              </p>
              {coupon?.coupon && (
                <p className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-red-deep uppercase">
                  {formatINR(coupon.total)} with {coupon.coupon.code}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 @[640px]:w-full @[640px]:flex-col @[640px]:items-stretch">
            {owned ? (
              <Button href={`/learn/${course.slug}`} variant="ink" iconRight="arrow-right" className="@max-[640px]:flex-1" aria-label={`Go to course: ${course.title}`}>
                Go to course
              </Button>
            ) : onSale ? (
              <>
                <Button
                  href={`/checkout/${course.slug}${coupon?.coupon ? `?coupon=${encodeURIComponent(coupon.coupon.code)}` : ""}`}
                  variant="red"
                  className="@max-[640px]:flex-1"
                  aria-label={`Buy ${course.title} for ${formatINR(price)}`}
                >
                  Buy · {formatINR(price)}
                </Button>
                {card?.firstFreeItemId && (
                  <Button href={`/learn/${course.slug}/${card.firstFreeItemId}`} variant="outline" icon="play" className="@max-[640px]:flex-1" aria-label={`Watch the free lesson of ${course.title}`}>
                    Free lesson
                  </Button>
                )}
              </>
            ) : null}
            <div className="flex items-center gap-1 @[640px]:justify-end @max-[640px]:ml-auto">
              <Button variant="ghost" size="sm" icon="trash" data-wl-remove="" onClick={onRemove} aria-label={`Remove ${course.title} from wishlist`} className="text-muted">
                Remove
              </Button>
              <DropdownMenu
                label={`More for ${course.title}`}
                trigger={<Icon name="more" className="size-5" strokeWidth={1.7} />}
                triggerClassName="tap grid size-9 place-items-center text-muted transition-colors coarse:size-11 hf:text-fg"
                items={menu}
                width={240}
                align="end"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Empty-wishlist suggestions. Chosen once per visit, so saving one doesn't reshuffle the grid. */
function Nudges({ uid, onSaved }: { uid: string; onSaved?: () => void }) {
  const db = useDb();
  const [ids] = useState(() => recommendations(uid, db, 3).cards.map((c) => c.course.id));
  const cards = ids.map((id) => getCourseCard(id, db)).filter((c): c is NonNullable<typeof c> => !!c);
  if (!cards.length) return null;
  const toggle = (card: (typeof cards)[number]) => {
    const now = demo.toggleWishlist(uid, card.course.id);
    if (now) onSaved?.();
    toast(now ? { title: "Saved to your wishlist", description: card.course.title, tone: "success" } : { title: "Removed from your wishlist", description: card.course.title });
  };
  return (
    <section aria-labelledby="wl-recs" className="mt-14 md:mt-16">
      <SectionTitle id="wl-recs" index="01" title="Worth saving" description="Tap the heart to keep it here for later." />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <CourseCard key={card.course.id} data={card} wishlisted={isWishlisted(uid, card.course.id, db)} onToggleWishlist={() => toggle(card)} />
        ))}
      </div>
    </section>
  );
}
