"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CourseCard,
  DropdownMenu,
  EmptyState,
  Icon,
  PageHeader,
  Rating,
  Select,
  toast,
  type MenuItem,
} from "@/components/app";
import { cropSrc } from "@/lib/img";
import { toneBg } from "@/lib/landing-data";
import { useDb, demo } from "@/lib/demo/store";
import {
  MOCK_NOW_ISO,
  formatDate,
  formatDuration,
  formatINR,
  formatNumber,
  getCourseCard,
  getCourses,
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
import { BADGE_SM, BrowseTile, SectionTitle, fillGridHide } from "./bits";
import { recommendations } from "./data";
import { rescueFocus } from "./hooks";
import { useStudentId } from "./prefs";
import { useMyWishlist, useWishlistRemove } from "./wishlist-actions";

type SortKey = "saved" | "price-asc" | "price-desc" | "rating";

/**
 * Best working code for a course: the same list checkout offers ("Demo codes that work here"),
 * compared by the discount each one gives this learner on this course.
 */
function bestCoupon(uid: string, courseId: string, db: Db) {
  let best: ReturnType<typeof validateCoupon> | null = null;
  for (const c of getWorkingCoupons(courseId, uid, db)) {
    const r = validateCoupon(c.code, courseId, { userId: uid }, db);
    if (r.valid && r.discount > 0 && (!best || r.discount > best.discount))
      best = r;
  }
  return best;
}

const HEADER = {
  eyebrow: "Student space",
  eyebrowTone: "hotpink" as const,
  title: "Saved for later.",
  description: "The courses you bookmarked while pretending to go to sleep.",
  breadcrumbs: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Wishlist" },
  ],
};

const SAVINGS_GREEN = "text-[#006b30]";

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function WishlistFallback() {
  return (
    <WishlistSkeleton
      header={
        <PageHeader
          {...HEADER}
          actions={
            <Button href="/courses" variant="secondary" icon="search">
              Browse courses
            </Button>
          }
        />
      }
    />
  );
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

  const items = useMemo(() => {
    const rows = saved.map((w) => ({
      ...w,
      card: getCourseCard(w.course.id, db),
      owned: isEnrolled(uid, w.course.id, db),
      coupon: bestCoupon(uid, w.course.id, db),
    }));
    if (sort !== "saved")
      rows.sort((a, b) =>
        sort === "price-asc"
          ? a.course.price - b.course.price
          : sort === "price-desc"
            ? b.course.price - a.course.price
            : b.course.rating - a.course.rating,
      );
    return rows;
  }, [uid, db, sort, saved]);

  const buyable = items.filter(
    (i) => !i.owned && i.course.status === "published",
  );
  const total = buyable.reduce((s, i) => s + i.course.price, 0);
  const savings = buyable.reduce((s, i) => s + (i.coupon?.discount ?? 0), 0);
  const upcoming = db.coupons.find(
    (c) => c.active && c.courseIds === null && c.startsAt > MOCK_NOW_ISO,
  );

  const remove = (courseId: string, title: string, index: number) =>
    removeFromWishlist(courseId, title, () =>
      requestAnimationFrame(() => {
        // keep keyboard users in the list: next row's Remove button, else the previous one; when the
        // last one goes, the empty state's "Browse courses" (the list and its count are gone)
        const buttons = [
          ...(list.current?.querySelectorAll<HTMLButtonElement>(
            '[data-wl-remove], button[aria-haspopup="menu"]',
          ) ?? []),
        ].filter((b) => b.offsetParent);
        (
          buttons[index] ??
          buttons[index - 1] ??
          countRef.current ??
          emptyRef.current?.querySelector<HTMLElement>("a[href]")
        )?.focus();
      }),
    );

  return (
    <div className="app-enter">
      <PageHeader
        {...HEADER}
        actions={
          items.length > 0 ? (
            <Button href="/courses" variant="secondary" icon="search">
              Browse courses
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <>
          <div ref={emptyRef}>
            <Card padding="none">
              <EmptyState
                art="tami"
                tone="blush"
                title="Nothing saved yet. Go window-shop the library."
                body="Tap the heart on any course and it waits for you here, price and free lesson included."
                action={
                  <Button
                    href="/courses"
                    variant="accent"
                    iconRight="arrow-right"
                  >
                    Browse courses
                  </Button>
                }
              />
            </Card>
          </div>
          <Nudges
            uid={uid}
            onSaved={() =>
              // the nudges unmount as the list appears: land on the new row's title (or the count)
              rescueFocus(
                () =>
                  [
                    ...(list.current?.querySelectorAll<HTMLElement>("h2 a") ??
                      []),
                  ].find((a) => a.offsetParent) ?? countRef.current,
              )
            }
          />
        </>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p
                ref={countRef}
                tabIndex={-1}
                className="text-[15px] font-bold focus:outline-none"
                role="status"
                aria-live="polite"
              >
                {plural(items.length, "saved course")}
              </p>
              <div className="w-full sm:w-56">
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
            {/* phones: the "totted up" card shrinks to one line above the list (S-05) */}
            {buyable.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-card bg-butter px-4 py-3 sm:hidden">
                <p className="text-[14px] font-semibold">
                  <span className="font-bold">
                    {plural(buyable.length, "course")} to buy
                  </span>{" "}
                  · {formatINR(total)}
                </p>
                {savings > 0 && (
                  <p className={clsx("text-[13.5px] font-bold", SAVINGS_GREEN)}>
                    {formatINR(total - savings)} with today&apos;s codes
                  </p>
                )}
              </div>
            )}
            {/* Rows switch layout on the list's own width (container query), not the viewport,
                so they stay readable whether or not the sidebar and summary are showing. */}
            <ul ref={list} className="@container space-y-3">
              {items.map(
                ({ id, course, card, owned, coupon, createdAt }, i) => (
                  <li key={id} className="app-fade">
                    <PhoneWishRow
                      course={course}
                      card={card}
                      owned={owned}
                      coupon={coupon}
                      onRemove={() => remove(course.id, course.title, i)}
                    />
                    <Card
                      padding="sm"
                      className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3.5 gap-y-3 p-3 @max-[600px]:hidden @[600px]:grid-cols-[168px_minmax(180px,1fr)_168px] @[600px]:gap-x-5 @[600px]:pr-5"
                    >
                      <Link
                        href={`/courses/${course.slug}`}
                        tabIndex={-1}
                        aria-hidden
                        className={clsx(
                          "relative col-start-1 row-start-1 block aspect-[4/3] w-full self-start overflow-hidden rounded-[14px] @[600px]:row-span-2 @[600px]:aspect-auto @[600px]:h-full @[600px]:min-h-[132px] @[600px]:rounded-img",
                          toneBg[course.tone],
                        )}
                      >
                        <Image
                          src={cropSrc(course.thumbnail, 3 / 4)}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 168px, 96px"
                          className="object-cover"
                        />
                      </Link>

                      {/* heading block: beside the thumbnail on narrow rows, top of the middle column on wide ones */}
                      <div className="col-start-2 row-start-1 min-w-0 self-center @[600px]:self-start @[600px]:pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {card?.category && (
                            <Badge size="sm" tone="neutral">
                              {card.category.name}
                            </Badge>
                          )}
                          <Badge size="sm" tone="neutral">
                            {course.level}
                          </Badge>
                          {owned && (
                            <Badge size="sm" tone="mint" dot>
                              You own this
                            </Badge>
                          )}
                          {course.status !== "published" && (
                            <Badge size="sm" tone="butter">
                              Not on sale right now
                            </Badge>
                          )}
                        </div>
                        <h2 className="mt-2 font-heading text-[18px] leading-[1.1] font-extrabold tracking-[-0.02em] [font-variation-settings:'opsz'_96] @[600px]:text-[21px]">
                          <Link
                            href={`/courses/${course.slug}`}
                            className="hf:underline hf:decoration-ink/25 hf:underline-offset-4"
                          >
                            {course.title}
                          </Link>
                        </h2>
                      </div>

                      <div className="col-span-2 row-start-2 min-w-0 @[600px]:col-span-1 @[600px]:col-start-2 @[600px]:row-start-2">
                        <p className="line-clamp-2 text-[14px] leading-snug font-medium text-ink/70">
                          {course.promise}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-semibold text-ink/70">
                          {card?.tutor && (
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar
                                name={card.tutor.name}
                                src={card.tutor.avatar}
                                tone={card.tutor.tone}
                                size="xs"
                              />
                              {card.tutor.name}
                            </span>
                          )}
                          <Rating
                            value={course.rating}
                            count={course.reviewCount}
                            size="sm"
                            className="text-ink"
                          />
                          {card && (
                            <span className="whitespace-nowrap">
                              {formatDuration(card.stats.totalSec)} ·{" "}
                              {card.stats.videos} lessons
                            </span>
                          )}
                        </div>
                        <p className="mt-2.5 text-[12.5px] font-semibold text-ink/70">
                          <span className="whitespace-nowrap">
                            Saved {timeAgo(createdAt)}
                          </span>{" "}
                          ·{" "}
                          <span className="whitespace-nowrap">
                            {formatNumber(course.learners)} learners
                          </span>
                        </p>
                      </div>

                      {/* price + actions: full-width footer on narrow rows, right column on wide ones */}
                      <div className="col-span-2 row-start-3 flex flex-col gap-3 border-t border-ink/[0.07] pt-3 @[600px]:col-span-1 @[600px]:col-start-3 @[600px]:row-span-2 @[600px]:row-start-1 @[600px]:items-end @[600px]:border-0 @[600px]:py-1">
                        {!owned && course.status === "published" && (
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 @[600px]:block @[600px]:text-right">
                            <p className="font-heading text-[24px] leading-none font-extrabold tracking-[-0.02em]">
                              {formatINR(course.price)}
                              {course.compareAtPrice && (
                                <span className="ml-1.5 align-middle text-[14px] font-semibold text-ink/65 line-through">
                                  <span className="sr-only">was </span>
                                  {formatINR(course.compareAtPrice)}
                                </span>
                              )}
                            </p>
                            {coupon?.coupon && (
                              <p
                                className={clsx(
                                  "text-[12.5px] font-bold @[600px]:mt-1.5",
                                  SAVINGS_GREEN,
                                )}
                              >
                                {formatINR(coupon.total)} with{" "}
                                <span className="font-mono">
                                  {coupon.coupon.code}
                                </span>
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-auto flex flex-wrap items-center gap-2 @[600px]:w-full @[600px]:flex-col @[600px]:items-stretch">
                          {owned ? (
                            <Button
                              href={`/learn/${course.slug}`}
                              variant="primary"
                              iconRight="arrow-right"
                              className="max-[420px]:flex-1"
                              aria-label={`Go to course: ${course.title}`}
                            >
                              Go to course
                            </Button>
                          ) : course.status === "published" ? (
                            <>
                              <Button
                                href={`/checkout/${course.slug}${coupon?.coupon ? `?coupon=${encodeURIComponent(coupon.coupon.code)}` : ""}`}
                                variant="accent"
                                icon="ticket"
                                className="max-[420px]:flex-1"
                                aria-label={`Buy course: ${course.title}`}
                              >
                                Buy course
                              </Button>
                              {card?.firstFreeItemId && (
                                <Button
                                  href={`/learn/${course.slug}/${card.firstFreeItemId}`}
                                  variant="secondary"
                                  icon="play"
                                  className="bg-cream! shadow-none! max-[420px]:flex-1 hf:bg-butter!"
                                  aria-label={`Watch the free lesson of ${course.title}`}
                                >
                                  Free lesson
                                </Button>
                              )}
                            </>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="trash"
                            data-wl-remove=""
                            onClick={() => remove(course.id, course.title, i)}
                            aria-label={`Remove ${course.title} from wishlist`}
                            className="ml-auto text-ink/70 @[600px]:ml-0"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ),
              )}
            </ul>
          </div>

          <aside
            aria-label="Wishlist summary"
            className="grid items-start gap-4 md:grid-cols-2 xl:sticky xl:top-24 xl:grid-cols-1"
          >
            <Card tone="butter" className="max-sm:hidden">
              <h2 className="t-app-h3">Your wishlist, totted up</h2>
              <dl className="mt-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/75">
                    {plural(buyable.length, "course")} to buy
                  </dt>
                  <dd className="font-bold">{formatINR(total)}</dd>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink/75">
                      With today&apos;s best codes
                    </dt>
                    <dd className={clsx("font-bold", SAVINGS_GREEN)}>
                      −{formatINR(savings)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-ink/10 pt-2.5">
                  <dt className="font-bold">If you bought them all</dt>
                  <dd className="font-heading text-[20px] leading-none font-extrabold">
                    {formatINR(total - savings)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 t-small text-ink/75">
                Courses are bought one at a time, prices include GST. No rush:
                the first lesson of each is free.
              </p>
            </Card>
            <div className="flex flex-col gap-4">
              {upcoming && (
                <Card
                  tone="blush"
                  padding="sm"
                  className="flex items-start gap-3 p-4"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-white"
                    aria-hidden
                  >
                    <Icon name="ticket" className="size-[18px]" />
                  </span>
                  <p className="t-small">
                    <span className="font-bold">Heads up:</span> {upcoming.code}{" "}
                    goes live on {formatDate(upcoming.startsAt, "short")}.{" "}
                    {upcoming.description}.
                  </p>
                </Card>
              )}
              <Card padding="sm" className="flex items-start gap-2 p-4">
                <Icon
                  name="info"
                  className="mt-0.5 size-4 shrink-0 text-ink/70"
                />
                <p className="t-small text-ink/75">
                  Wishlists are private. Tutors never see who saved their
                  course.
                </p>
              </Card>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Phone row (list narrower than 600px): thumb + title + price, Buy / Free lesson as 44px
 *  buttons, Remove and the course links in the "…" sheet (S-05). */
function PhoneWishRow({
  course,
  card,
  owned,
  coupon,
  onRemove,
}: {
  course: Course;
  card: ReturnType<typeof getCourseCard>;
  owned: boolean;
  coupon: ReturnType<typeof bestCoupon>;
  onRemove: () => void;
}) {
  const onSale = !owned && course.status === "published";
  const price = coupon?.coupon ? coupon.total : course.price;
  const menu: MenuItem[] = [
    { label: "Course page", icon: "book", href: `/courses/${course.slug}` },
    ...(card?.tutor?.slug
      ? [
          {
            label: `About ${card.tutor.name.split(" ")[0]}`,
            icon: "user" as const,
            href: `/tutors/${card.tutor.slug}`,
          },
        ]
      : []),
    { divider: true },
    {
      label: "Remove from wishlist",
      icon: "trash",
      danger: true,
      onSelect: onRemove,
    },
  ];
  return (
    <article className="rounded-card bg-white p-3 pr-1.5 shadow-soft @[600px]:hidden">
      <div className="flex items-start gap-3">
        <Link
          href={`/courses/${course.slug}`}
          tabIndex={-1}
          aria-hidden
          className={clsx(
            "relative block aspect-[16/10] w-[104px] shrink-0 overflow-hidden rounded-[12px]",
            toneBg[course.tone],
          )}
        >
          <Image
            src={cropSrc(course.thumbnail, 10 / 16)}
            alt=""
            fill
            sizes="104px"
            className="object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="line-clamp-2 text-[16px] leading-[1.18] font-bold tracking-[-0.01em]">
            <Link href={`/courses/${course.slug}`}>{course.title}</Link>
          </h2>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-[13px] font-semibold text-ink/65">
            <span className="truncate">{card?.tutor?.name}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <Icon name="star" className="size-3.5 text-tangerine" />
              <span className="sr-only">Rated </span>
              {course.rating.toFixed(1)}
            </span>
          </p>
          {onSale ? (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-heading text-[19px] leading-none font-extrabold tracking-[-0.02em]">
                {formatINR(course.price)}
              </span>
              {coupon?.coupon ? (
                <span className={clsx("text-[12.5px] font-bold", SAVINGS_GREEN)}>
                  {formatINR(coupon.total)} with{" "}
                  <span className="font-mono">{coupon.coupon.code}</span>
                </span>
              ) : (
                course.compareAtPrice && (
                  <span className="text-[13px] font-semibold text-ink/60 line-through">
                    <span className="sr-only">was </span>
                    {formatINR(course.compareAtPrice)}
                  </span>
                )
              )}
            </p>
          ) : (
            <p className="mt-1.5">
              <Badge
                size="sm"
                tone={owned ? "mint" : "butter"}
                dot={owned}
                className={BADGE_SM}
              >
                {owned ? "You own this" : "Not on sale right now"}
              </Badge>
            </p>
          )}
        </div>
        <DropdownMenu
          label={`More for ${course.title}`}
          trigger={<Icon name="more" className="size-5" />}
          triggerClassName="tap -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink/70 active:bg-ink/[0.06]"
          items={menu}
          width={240}
        />
      </div>
      {(owned || onSale) && (
        <div className="mt-3 flex gap-2 pr-1.5">
          {owned ? (
            <Button
              href={`/learn/${course.slug}`}
              variant="primary"
              iconRight="arrow-right"
              className="flex-1"
              aria-label={`Go to course: ${course.title}`}
            >
              Go to course
            </Button>
          ) : (
            <>
              <Button
                href={`/checkout/${course.slug}${coupon?.coupon ? `?coupon=${encodeURIComponent(coupon.coupon.code)}` : ""}`}
                variant="accent"
                className="min-w-0 flex-1 px-3"
                aria-label={`Buy ${course.title} for ${formatINR(price)}`}
              >
                Buy {formatINR(price)}
              </Button>
              {card?.firstFreeItemId && (
                <Button
                  href={`/learn/${course.slug}/${card.firstFreeItemId}`}
                  variant="secondary"
                  icon="play"
                  className="min-w-0 flex-1 bg-cream! px-3 shadow-none!"
                  aria-label={`Watch the free lesson of ${course.title}`}
                >
                  Free lesson
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

/** Empty-wishlist suggestions. Chosen once per visit, so saving one doesn't reshuffle the grid. */
function Nudges({ uid, onSaved }: { uid: string; onSaved?: () => void }) {
  const db = useDb();
  const [ids] = useState(() =>
    recommendations(uid, db, 4).cards.map((c) => c.course.id),
  );
  const cards = ids
    .map((id) => getCourseCard(id, db))
    .filter((c): c is NonNullable<typeof c> => !!c);
  if (!cards.length) return null;
  const toggle = (card: (typeof cards)[number]) => {
    const now = demo.toggleWishlist(uid, card.course.id);
    if (now) onSaved?.();
    toast(
      now
        ? {
            title: "Saved to your wishlist",
            description: card.course.title,
            tone: "success",
          }
        : {
            title: "Removed from your wishlist",
            description: card.course.title,
          },
    );
  };
  return (
    <section aria-labelledby="wl-recs" className="mt-10 md:mt-12">
      <SectionTitle
        id="wl-recs"
        title="Need a nudge?"
        description="Popular right now. Tap a heart to save one."
      />
      {/* phones: compact row cards (heart on the right), from sm the colour card grid */}
      <ul className="space-y-2.5 sm:hidden">
        {cards.map((card) => (
          <li key={card.course.id}>
            <CourseCard
              data={card}
              variant="compact"
              wishlisted={isWishlisted(uid, card.course.id, db)}
              onToggleWishlist={() => toggle(card)}
            />
          </li>
        ))}
      </ul>
      <div className="grid gap-4 max-sm:hidden sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => (
          <CourseCard
            key={card.course.id}
            data={card}
            className={fillGridHide(i, cards.length, {
              filler: cards.length % 2 === 1,
            })}
            wishlisted={isWishlisted(uid, card.course.id, db)}
            onToggleWishlist={() => toggle(card)}
          />
        ))}
        <BrowseTile
          show={cards.length % 2 === 1}
          count={getCourses({ pageSize: 1 }, db).total}
        />
      </div>
    </section>
  );
}
