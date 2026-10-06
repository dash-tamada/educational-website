"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Badge, Button, Icon, ProgressRing, Skeleton, toast } from "@/components/app";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { getCourseAccess } from "@/lib/access";
import {
  formatDate,
  formatINR,
  getCertificates,
  getCourseById,
  getCourseProgress,
  getCourseStats,
  getFirstFreeItem,
  timeAgo,
  validateCoupon,
} from "@/lib/mock";
import { couponHintLine, whatsIncluded, workingCoupons } from "@/lib/mock/extra/catalog";
import { useWishlist } from "./hooks";
import { StickyWhenFits } from "./StickyWhenFits";

/**
 * Extra height the buy card can still grow by (lg+, where it sticks), so it is
 * only made sticky when its tallest state fits: the open coupon form is about
 * 95px taller than the "Have a coupon?" link, and about 50px taller than the
 * applied-code row; an error can wrap to a second line.
 */
const RESERVE = { closed: 110, applied: 64, form: 24 } as const;

/**
 * The course page's sticky purchase card. Swaps itself for:
 *   enrolled -> progress + Continue learning
 *   tutor    -> open in course studio
 *   admin    -> open in the admin review screen
 *   archived -> no longer on sale
 * Coupons are checked with the mock validator and carried to checkout (?coupon=).
 * On phones a slim bar with the price + main action appears once the card scrolls away.
 */
export function PurchaseCard({ courseId, sticky = false }: { courseId: string; sticky?: boolean }) {
  const [reserve, setReserve] = useState(0);
  const inner = <PurchaseCardInner courseId={courseId} onReserve={setReserve} />;
  return sticky ? <StickyWhenFits reserve={reserve}>{inner}</StickyWhenFits> : inner;
}

function PurchaseCardInner({ courseId, onReserve }: { courseId: string; onReserve: (px: number) => void }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const { isSaved, toggle } = useWishlist();
  const card = useRef<HTMLDivElement>(null);
  // the slim phone bar: on once the card has scrolled away, off again over the footer
  const [barOn, setBarOn] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  // the applied code is kept as a string and re-checked on every render for
  // whoever is looking (first-purchase-only codes depend on the buyer)
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);

  const course = getCourseById(courseId, db);
  const access = course ? getCourseAccess(session, course, db) : null;
  // which card is showing (the observer re-attaches when it swaps)
  const mode = !access
    ? "none"
    : access.enrolled
      ? "enrolled"
      : access.owner || access.admin
        ? "staff"
        : access.purchasable
          ? "buy"
          : "closed";
  // A student's demo-store purchases only exist after the client overlay applies:
  // until then the seed says "buy", which would flash a price for a course they own.
  const pending = !hydrated && session?.role === "student" && mode === "buy";

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    // the bar shows only once the card has scrolled up out of view. A scroll
    // listener (not an IntersectionObserver): a jump from "below the fold" to
    // "above it" never intersects, so an observer would miss it.
    let raf = 0;
    const check = () => {
      raf = 0;
      const footer = document.querySelector("footer");
      const overFooter = !!footer && footer.getBoundingClientRect().top < window.innerHeight;
      setBarOn(el.getBoundingClientRect().bottom <= 0 && !overFooter);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode, pending]);

  // keyboard focus follows the coupon UI as it swaps controls (open -> input,
  // apply -> Remove, remove -> input), so focus never falls back to <body>
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    document.getElementById(id)?.focus();
  });

  // how much taller the buy card can still get (see RESERVE); other cards don't grow
  const growth =
    mode !== "buy" || pending ? 0 : !couponOpen && !appliedCode && !couponErr ? RESERVE.closed : appliedCode && !couponErr ? RESERVE.applied : RESERVE.form;
  useEffect(() => onReserve(growth), [growth, onReserve]);

  if (!course || !access) return null;
  if (pending) {
    return (
      <div ref={card} className="rounded-card-lg bg-white p-5 shadow-soft md:p-6" aria-busy="true" aria-label="Loading your access">
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" className="size-[76px] shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-3.5 w-2/3 rounded-full" />
          </div>
        </div>
        <Skeleton className="mt-5 h-[52px] rounded-full" />
        <Skeleton className="mt-2 h-11 rounded-full" />
      </div>
    );
  }
  const stats = getCourseStats(course.id, db);
  const free = getFirstFreeItem(course.id, db);
  const freeHref = free
    ? `/learn/${course.slug}/${free.id}`
    : `/learn/${course.slug}`;
  const saved = isSaved(course.id);
  const who = session?.role === "student" ? { userId: session.userId } : null;
  const check = appliedCode ? validateCoupon(appliedCode, course.id, who, db) : null;
  const applied = check?.valid ? check : null;
  const couponMsg = couponErr ?? (check && !check.valid ? check.message : null);
  const hints = workingCoupons(course.id, who?.userId, db);
  const price = applied ? applied.total : course.price;
  const checkoutHref = `/checkout/${course.slug}${applied?.coupon ? `?coupon=${encodeURIComponent(applied.coupon.code)}` : ""}`;
  const offPct = course.compareAtPrice
    ? Math.round((1 - course.price / course.compareAtPrice) * 100)
    : 0;

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setCouponErr("Type a code first.");
      return;
    }
    const r = validateCoupon(code, course.id, who, db);
    if (!r.valid) {
      setCouponErr(r.message);
      setAppliedCode(null);
      return;
    }
    setCouponErr(null);
    setAppliedCode(r.coupon.code);
    focusNext.current = "course-coupon-remove";
    toast.success("Coupon applied", {
      description: `You save ${formatINR(r.discount)}.`,
    });
  };

  /* ----------------------------------------------------------------- enrolled */
  if (access.enrolled && session) {
    const p = getCourseProgress(session.userId, course.id, db);
    const done = p.percent >= 100;
    const cert = getCertificates(session.userId, db).find(
      (c) => c.courseId === course.id,
    );
    const href = `/learn/${course.slug}${p.resumeItemId ? `/${p.resumeItemId}` : ""}`;
    const cta = done ? "Rewatch the course" : p.percent ? "Continue learning" : "Start learning";
    return (
      <>
        <div
          ref={card}
          className="app-fade rounded-card-lg bg-white p-5 shadow-soft md:p-6"
        >
          <div className="flex items-center gap-4">
            <ProgressRing
              value={p.percent}
              size={76}
              stroke={8}
              tone={done ? "green" : "hotpink"}
              label="Course progress"
            >
              <span className={clsx("font-display font-black", done ? "text-[18px]" : "text-[22px]")}>
                {p.percent}%
              </span>
            </ProgressRing>
            <div className="min-w-0">
              <Badge tone="mint" dot>
                {done ? "Completed" : "You're enrolled"}
              </Badge>
              <p className="mt-2 t-app-h3">
                {done ? "You did the thing." : p.percent > 0 ? "Pick up where you left off." : "Your first lesson is waiting."}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink/60">
                {p.completed} of {p.total} items done
                {p.lastActivityAt
                  ? ` · ${`active ${timeAgo(p.lastActivityAt)}`.replace(/ /g, " ")}`
                  : ""}
              </p>
            </div>
          </div>
          <Button
            href={href}
            variant="accent"
            size="lg"
            fullWidth
            icon="play"
            className="mt-5"
          >
            {cta}
          </Button>
          {done && course.hasCertificate && (
            <Button
              href={
                cert ? `/certificates/${cert.code}` : "/dashboard/certificates"
              }
              variant="secondary"
              fullWidth
              icon="award"
              className="mt-2"
            >
              View certificate
            </Button>
          )}
          <Button
            href="/dashboard/courses"
            variant="ghost"
            fullWidth
            className="mt-1"
          >
            All my courses
          </Button>
        </div>
        <MobileBar
          show={barOn}
          label={done ? "Completed" : `${p.percent}% done`}
          sub={course.title}
          action={
            <Button href={href} variant="accent" icon="play">
              {done ? "Rewatch" : p.percent ? "Continue" : "Start"}
            </Button>
          }
        />
      </>
    );
  }

  /* ----------------------------------------------------------------- owner / admin */
  if (access.owner || access.admin) {
    return (
      <div
        ref={card}
        className="app-fade rounded-card-lg bg-white p-5 shadow-soft md:p-6"
      >
        <Badge tone={access.owner ? "cyan" : "lilac"} dot>
          {access.owner ? "This is your course" : "Admin view"}
        </Badge>
        <p className="mt-3 t-app-h3">
          {access.owner
            ? course.status === "published"
              ? "Learners see a price and a Buy button here."
              : "Once it's published, learners see a price and a Buy button here."
            : "You can open every lesson without buying."}
        </p>
        <p className="mt-1 text-[14px] text-ink/65">
          Listed at{" "}
          <strong className="text-ink">{formatINR(course.price)}</strong>.
          Status: {course.status.replace("_", " ")}.
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            href={
              access.owner
                ? `/tutor/courses/${course.id}/builder`
                : `/admin/courses/${course.id}`
            }
            variant="primary"
            size="lg"
            icon={access.owner ? "edit" : "shield"}
            fullWidth
          >
            {access.owner ? "Open in course studio" : "Open in admin"}
          </Button>
          <Button
            href={`/learn/${course.slug}`}
            variant="secondary"
            icon="eye"
            fullWidth
          >
            Open in the player
          </Button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- not for sale */
  if (!access.purchasable) {
    return (
      <div
        ref={card}
        className="rounded-card-lg bg-white p-5 shadow-soft md:p-6"
      >
        <Badge tone="lilac" dot>
          Not on sale
        </Badge>
        <p className="mt-3 t-app-h3">This course is resting.</p>
        <p className="mt-1 text-[14px] text-ink/65">
          The tutor has archived it, so it can&apos;t be bought right now.
          People who already own it keep their access.
        </p>
        <Button href="/courses" variant="secondary" fullWidth className="mt-5">
          Browse similar courses
        </Button>
      </div>
    );
  }

  /* ----------------------------------------------------------------- buy */
  return (
    <>
      <div
        ref={card}
        className="rounded-card-lg bg-white p-5 shadow-soft md:grid md:grid-cols-2 md:gap-x-8 md:p-6 lg:block"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="font-display text-[3rem] leading-[0.85] font-black tracking-[0.01em]">
              {(applied || course.compareAtPrice) && <span className="sr-only">Now </span>}
              {formatINR(price)}
            </span>
            {(applied || course.compareAtPrice) && (
              <span className="pb-1 text-[16px] font-semibold text-ink/45">
                <span className="sr-only">Was </span>
                <span className="line-through">{formatINR(applied ? course.price : course.compareAtPrice!)}</span>
              </span>
            )}
            {applied ? (
              <Badge tone="mint" className="mb-1">
                −{formatINR(applied.discount)} coupon
              </Badge>
            ) : offPct > 0 ? (
              <Badge tone="hotpink" className="mb-1">
                {offPct}% off launch price
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-[14px] font-semibold text-ink/60">
            One-time payment · lifetime access · GST included
          </p>

          <div className="mt-5 grid gap-2">
            <Button
              href={checkoutHref}
              variant="accent"
              size="lg"
              fullWidth
              iconRight="arrow-right"
            >
              Unlock the full course
            </Button>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button href={freeHref} variant="secondary" icon="play" fullWidth>
                Watch free preview
              </Button>
              <Button
                variant="secondary"
                iconOnly
                icon="heart"
                aria-pressed={saved}
                aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                onClick={() => toggle(course.id, course.title)}
                className={clsx(
                  // `!`: the secondary variant's own bg-white / text-ink win otherwise
                  saved && "bg-blush! text-hotpink! [&_svg]:fill-current",
                )}
              />
            </div>
          </div>
          <p className="mt-3 text-center text-[13px] font-semibold text-ink/60">
            The first video is free. See if the vibe fits before you pay.
          </p>

          <div className="mt-4 border-t border-ink/[0.07] pt-4">
            {!couponOpen && !applied && !couponMsg ? (
              <button
                type="button"
                id="course-coupon-open"
                onClick={() => {
                  focusNext.current = "course-coupon";
                  setCouponOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full text-[14px] font-bold text-blue underline-offset-4 hf:underline"
              >
                <Icon name="ticket" className="size-4" />
                Have a coupon?
              </button>
            ) : applied ? (
              <div className="flex items-center justify-between gap-3 rounded-tag bg-mint/50 px-3 py-2.5 text-[14px]">
                <span className="min-w-0">
                  <strong className="font-bold">{applied.coupon?.code}</strong>{" "}
                  <span className="text-forest">applied</span>
                </span>
                <button
                  type="button"
                  id="course-coupon-remove"
                  aria-label={`Remove coupon ${applied.coupon?.code ?? ""}`.trim()}
                  onClick={() => {
                    focusNext.current = "course-coupon";
                    setCouponOpen(true);
                    setAppliedCode(null);
                    setCouponErr(null);
                    setCode("");
                  }}
                  className="shrink-0 rounded-full px-2 py-1 text-[13px] font-bold underline-offset-4 hf:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon} noValidate>
                <label
                  htmlFor="course-coupon"
                  className="text-[14px] font-bold"
                >
                  Coupon code
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="course-coupon"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setCouponErr(null);
                      if (appliedCode) setAppliedCode(null);
                    }}
                    placeholder={`e.g. ${hints[0] ?? "INBOX10"}`}
                    autoComplete="off"
                    autoCapitalize="characters"
                    aria-invalid={couponMsg ? true : undefined}
                    aria-describedby={
                      couponMsg ? "course-coupon-msg" : "course-coupon-hint"
                    }
                    className="h-11 w-full min-w-0 flex-1 rounded-tag bg-white px-3.5 text-[15px] font-semibold tracking-[0.04em] uppercase ring-1 ring-ink/[0.12] placeholder:font-medium placeholder:tracking-normal placeholder:text-ink/40 placeholder:normal-case focus:ring-2 focus:ring-blue focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-flame"
                  />
                  <Button type="submit" variant="primary">
                    Apply
                  </Button>
                </div>
                {couponMsg ? (
                  <p
                    id="course-coupon-msg"
                    role="alert"
                    className="mt-1.5 text-[13px] font-semibold text-[#c13500]"
                  >
                    {couponMsg}
                  </p>
                ) : (
                  <p
                    id="course-coupon-hint"
                    className="mt-1.5 text-[13px] text-ink/55"
                  >
                    {couponHintLine(course.id, who?.userId, db)}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
        <div className="min-w-0">
          {/* lg+: "What's included" moves to the main column (CourseIncluded), so the
              sticky card stays short enough to fit small laptop screens */}
          <div className="mt-5 md:mt-0 lg:hidden">
            <p className="t-micro tracking-[0.06em] text-ink/55 uppercase">
              What&apos;s included
            </p>
            <ul className="mt-3 space-y-2.5">
              {whatsIncluded(course, stats).map((w) => (
                <li
                  key={w.text}
                  className="flex items-start gap-2.5 text-[14px] font-semibold"
                >
                  <Icon
                    name={w.icon}
                    className="mt-px size-[18px] shrink-0 text-blue"
                  />
                  {w.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 flex items-center gap-2 rounded-tag bg-cream px-3 py-2.5 text-[13px] font-semibold text-ink/70">
            <Icon name="shield" className="size-4 shrink-0 text-green" />
            7-day refund if it&apos;s not for you. Updated{" "}
            {formatDate(course.updatedAt, "short")}.
          </p>
        </div>
      </div>
      <MobileBar
        show={barOn}
        label={formatINR(price)}
        sub={
          course.compareAtPrice && !applied
            ? `was ${formatINR(course.compareAtPrice)}`
            : "lifetime access"
        }
        action={
          <Button href={checkoutHref} variant="accent" iconRight="arrow-right">
            Unlock course
          </Button>
        }
      />
    </>
  );
}

/** Phones only: slim fixed bar with the price and the main action. */
function MobileBar({
  show,
  label,
  sub,
  action,
}: {
  show: boolean;
  label: string;
  sub: string;
  action: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-[translate,opacity] duration-300 ease-ui lg:hidden",
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="flex items-center justify-between gap-3 rounded-card bg-white p-2.5 pl-4 shadow-lift">
        <div className="min-w-0">
          <p className="font-display text-[26px] leading-none font-black">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink/55">
            {sub}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
