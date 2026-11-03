"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Skeleton, StickyActionBar, toast, useMediaQuery } from "@/components/app";
import { Button } from "@/components/editorial";
import { COURSE_PAGE } from "@/lib/content/course";
import { formatINR, getCertificates, timeAgo, validateCoupon } from "@/lib/mock";
import { couponHintLine, whatsIncluded, workingCoupons } from "@/lib/mock/extra/catalog";
import { StickyWhenFits } from "../StickyWhenFits";
import { courseFacts, useCourseState, usePassed } from "./state";
import { MonoTag, SaveButton, ShareButton } from "./ui";

/* =============================================================================
   Buying, owning, managing: the mode-aware CTA pair (hero + final CTA), the price
   lockup, the sticky purchase rail (lg+, inline below) and the phone bar.
   Coupons are checked with the mock validator and carried to checkout (?coupon=).
   ============================================================================= */

const offPct = (price: number, was?: number) => (was && was > price ? Math.round((1 - price / was) * 100) : 0);

/* ---------------------------------------------------------------------------- CTA pair */
export const CourseCtas = forwardRef<HTMLDivElement, { courseId: string; size?: "md" | "lg"; className?: string; full?: boolean }>(function CourseCtas(
  { courseId, size = "lg", className, full },
  ref,
) {
  const s = useCourseState(courseId);
  const { course, mode } = s;
  if (!course) return null;
  const wrap = clsx("flex flex-wrap items-center gap-3", full && "[&>*]:max-sm:w-full [&>*]:max-sm:flex", className);
  if (s.pending)
    return (
      <div ref={ref} className={clsx(wrap, "invisible")} aria-hidden>
        <Button size={size}>Loading</Button>
      </div>
    );
  if (mode === "enrolled")
    return (
      <div ref={ref} className={wrap}>
        <Button href={s.learnHref} size={size} arrow>
          {s.learnLabel}
        </Button>
        <Button href="/dashboard/courses" variant="outline" size={size}>
          My courses
        </Button>
      </div>
    );
  if (mode === "staff")
    return (
      <div ref={ref} className={wrap}>
        <Button href={s.access?.owner ? `/tutor/courses/${course.id}/builder` : `/admin/courses/${course.id}`} size={size} arrow>
          {s.access?.owner ? "Open in course studio" : "Open in admin"}
        </Button>
        <Button href={`/learn/${course.slug}`} variant="outline" size={size}>
          Open in the player
        </Button>
      </div>
    );
  if (mode === "closed")
    return (
      <div ref={ref} className={wrap}>
        <p className="t-label text-muted">{course.status === "archived" ? "Archived · not on sale" : "Not on sale"}</p>
      </div>
    );
  return (
    <div ref={ref} className={wrap}>
      <Button href={s.checkoutHref} size={size} arrow>
        Enroll now
      </Button>
      {s.free && (
        <Button href={s.freeHref} variant="outline" size={size}>
          Watch free lesson
        </Button>
      )}
    </div>
  );
});

/* ---------------------------------------------------------------------------- price lockup */
/** ₹2,999 ~₹4,999~ 40% OFF (buy) · progress (enrolled) · nothing otherwise. */
export function PriceLockup({ courseId, className, size = "lg", note = true }: { courseId: string; className?: string; size?: "md" | "lg"; note?: boolean }) {
  const s = useCourseState(courseId);
  const { course } = s;
  if (!course) return null;
  if (s.pending) return <Skeleton className={clsx("h-12 w-48", className)} />;
  if (s.mode === "enrolled" && s.progress) {
    const p = s.progress;
    return (
      <div className={clsx("min-w-[12rem]", className)}>
        <p className="t-label text-muted">{p.percent >= 100 ? "Completed" : "In your library"}</p>
        <p className={clsx("mt-1 font-display leading-none", size === "lg" ? "text-[clamp(2.5rem,2rem+1.6vw,3.5rem)]" : "text-[2.25rem]")}>
          {p.percent}%<span className="ml-2 align-middle font-mono text-[11px] tracking-[0.1em] text-muted uppercase">watched</span>
        </p>
        <div className="mt-3 h-px w-full bg-line-strong" aria-hidden>
          <div className="h-px bg-red" style={{ width: `${p.percent}%` }} />
        </div>
      </div>
    );
  }
  if (s.mode === "staff")
    return (
      <div className={className}>
        <p className="t-label text-muted">{s.access?.owner ? "Your course · listed at" : "Admin view · listed at"}</p>
        <p className={clsx("mt-1 font-display leading-[0.9] text-muted", size === "lg" ? "text-[clamp(2.5rem,2rem+1.6vw,3.5rem)]" : "text-[2.25rem]")}>{formatINR(course.price)}</p>
      </div>
    );
  if (s.mode !== "buy") return null;
  const off = offPct(course.price, course.compareAtPrice);
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={clsx("font-display leading-[0.9]", size === "lg" ? "text-[clamp(2.75rem,2rem+2.4vw,4.25rem)]" : "text-[2.5rem]")}>
          {course.compareAtPrice && <span className="sr-only">Now </span>}
          {formatINR(course.price)}
        </span>
        {course.compareAtPrice && (
          <span className="text-[17px] font-medium text-muted line-through decoration-1">
            <span className="sr-only">was </span>
            {formatINR(course.compareAtPrice)}
          </span>
        )}
        {off > 0 && <MonoTag tone="red">{off}% off</MonoTag>}
      </p>
      {note && <p className="t-label mt-2 text-muted">One-time · lifetime access · GST included</p>}
    </div>
  );
}

/* ---------------------------------------------------------------------------- purchase rail */
/**
 * Extra height the rail can still grow by (lg+, where it sticks), so it is only
 * made sticky when its tallest state fits (the open coupon form, an error line).
 */
const RESERVE = { closed: 92, applied: 40, form: 24 } as const;

export function PurchaseRail({ courseId }: { courseId: string }) {
  const [reserve, setReserve] = useState(0);
  return (
    <StickyWhenFits reserve={reserve}>
      <RailInner courseId={courseId} onReserve={setReserve} />
    </StickyWhenFits>
  );
}

function RailInner({ courseId, onReserve }: { courseId: string; onReserve: (px: number) => void }) {
  const s = useCourseState(courseId);
  const { course, db, session, mode } = s;
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  // kept as a string and re-checked every render for whoever is looking
  // (first-purchase-only codes depend on the buyer)
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);

  // keyboard focus follows the coupon UI as it swaps controls
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    document.getElementById(id)?.focus();
  });

  const growth = mode !== "buy" || s.pending ? 0 : !couponOpen && !appliedCode && !couponErr ? RESERVE.closed : appliedCode && !couponErr ? RESERVE.applied : RESERVE.form;
  useEffect(() => onReserve(growth), [growth, onReserve]);

  if (!course) return null;
  const facts = courseFacts(course, db);
  const box = "border border-line-strong bg-surface p-5 md:p-6";

  if (s.pending)
    return (
      <div className={box} aria-busy="true" aria-label="Loading your access">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-12 w-40" />
        <Skeleton className="mt-6 h-[52px]" />
        <Skeleton className="mt-2 h-[52px]" />
      </div>
    );

  /* ---- enrolled */
  if (mode === "enrolled" && session && s.progress) {
    const p = s.progress;
    const done = p.percent >= 100;
    const cert = getCertificates(session.userId, db).find((c) => c.courseId === course.id);
    return (
      <div className={box}>
        <PriceLockup courseId={courseId} size="md" />
        <p className="t-small mt-4 text-muted">
          {p.completed} of {p.total} done
          {p.lastActivityAt ? ` · active ${timeAgo(p.lastActivityAt)}` : ""}
        </p>
        <div className="mt-5 grid gap-2">
          <Button href={s.learnHref} full arrow>
            {s.learnLabel}
          </Button>
          {done && course.hasCertificate && (
            <Button href={cert ? `/certificates/${cert.code}` : "/dashboard/certificates"} variant="outline" full>
              View certificate
            </Button>
          )}
          <Button href="/dashboard/courses" variant="ghost" full>
            All my courses
          </Button>
        </div>
      </div>
    );
  }

  /* ---- tutor / admin */
  if (mode === "staff") {
    const owner = !!s.access?.owner;
    return (
      <div className={box}>
        <MonoTag tone="ink">{owner ? "Your course" : "Admin view"}</MonoTag>
        <p className="t-headline-m mt-4">
          {owner
            ? course.status === "published"
              ? "Learners see the price and Enroll here."
              : "Once it's published, learners see the price and Enroll here."
            : "You can open every lesson without buying."}
        </p>
        <p className="t-small mt-2 text-muted">
          Listed at {formatINR(course.price)} · status: {course.status.replace("_", " ")}
        </p>
        <div className="mt-5 grid gap-2">
          <Button href={owner ? `/tutor/courses/${course.id}/builder` : `/admin/courses/${course.id}`} variant="ink" full arrow>
            {owner ? "Open in course studio" : "Open in admin"}
          </Button>
          <Button href={`/learn/${course.slug}`} variant="outline" full>
            Open in the player
          </Button>
        </div>
      </div>
    );
  }

  /* ---- not for sale */
  if (mode === "closed")
    return (
      <div className={box}>
        <MonoTag>Not on sale</MonoTag>
        <p className="t-headline-m mt-4">This course is resting.</p>
        <p className="t-small mt-2 text-muted">It can&apos;t be bought right now. People who already own it keep their access.</p>
        <div className="mt-5">
          <Button href="/" variant="outline" full>
            Back home
          </Button>
        </div>
      </div>
    );

  /* ---- buy */
  const who = session?.role === "student" ? { userId: session.userId } : null;
  const check = appliedCode ? validateCoupon(appliedCode, course.id, who, db) : null;
  const applied = check?.valid ? check : null;
  const couponMsg = couponErr ?? (check && !check.valid ? check.message : null);
  const hints = workingCoupons(course.id, who?.userId, db);
  const checkoutHref = `${s.checkoutHref}${applied?.coupon ? `?coupon=${encodeURIComponent(applied.coupon.code)}` : ""}`;

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setCouponErr("Type a code first.");
    const r = validateCoupon(code, course.id, who, db);
    if (!r.valid) {
      setCouponErr(r.message);
      setAppliedCode(null);
      return;
    }
    setCouponErr(null);
    setAppliedCode(r.coupon.code);
    focusNext.current = "rail-coupon-remove";
    toast.success("Coupon applied", { description: `You save ${formatINR(r.discount)}. It's carried to checkout.` });
  };

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-3">
        <p className="t-label text-muted">One payment</p>
        <div className="flex gap-1.5">
          <SaveButton courseId={course.id} title={course.title} small />
          <ShareButton title={course.title} path={`/courses/${course.slug}`} small />
        </div>
      </div>
      <div className="mt-2">
        {applied ? (
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[2.75rem] leading-[0.9]">
              <span className="sr-only">Now </span>
              {formatINR(applied.total)}
            </span>
            <span className="text-[16px] font-medium text-muted line-through decoration-1">
              <span className="sr-only">was </span>
              {formatINR(course.price)}
            </span>
          </p>
        ) : (
          <PriceLockup courseId={courseId} size="md" note={false} />
        )}
      </div>
      <p className="t-small mt-2 text-muted">GST included · {COURSE_PAGE.trust[0]}</p>

      <div className="mt-5 grid gap-2">
        <Button href={checkoutHref} full arrow>
          Enroll now
        </Button>
        {s.free && (
          <Button href={s.freeHref} variant="outline" full>
            Watch free lesson
          </Button>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="t-label">{COURSE_PAGE.includedTitle}</p>
        <ul className="mt-2">
          {whatsIncluded(course, facts.stats).map((w, i) => (
            <li key={w.text} className="grid grid-cols-[26px_1fr] items-baseline border-b border-line py-[7px] last:border-b-0">
              <span className="font-mono text-[10.5px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="t-small">{w.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 border-t border-line pt-4">
        {!couponOpen && !applied && !couponMsg ? (
          <button
            type="button"
            id="rail-coupon-open"
            onClick={() => {
              focusNext.current = "rail-coupon";
              setCouponOpen(true);
            }}
            className="link-draw t-label"
          >
            Have a coupon code?
          </button>
        ) : applied ? (
          <div className="flex items-center justify-between gap-3">
            <p className="t-small min-w-0">
              <span className="font-mono font-medium tracking-[0.06em]">{applied.coupon?.code}</span> applied · −{formatINR(applied.discount)}
            </p>
            <button
              type="button"
              id="rail-coupon-remove"
              aria-label={`Remove coupon ${applied.coupon?.code ?? ""}`.trim()}
              onClick={() => {
                focusNext.current = "rail-coupon";
                setCouponOpen(true);
                setAppliedCode(null);
                setCouponErr(null);
                setCode("");
              }}
              className="link-draw t-label shrink-0"
            >
              Remove
            </button>
          </div>
        ) : (
          <CouponForm
            id="rail-coupon"
            code={code}
            onCode={(v) => {
              setCode(v);
              setCouponErr(null);
              if (appliedCode) setAppliedCode(null);
            }}
            onSubmit={apply}
            error={couponMsg}
            hint={couponHintLine(course.id, who?.userId, db)}
            placeholder={hints[0] ?? "ARJUN15"}
          />
        )}
      </div>
    </div>
  );
}

/** Underline coupon field + Apply (rail and checkout). */
export function CouponForm({
  id,
  code,
  onCode,
  onSubmit,
  error,
  hint,
  placeholder,
  disabled,
}: {
  id: string;
  code: string;
  onCode: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  hint: string;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={id} className="t-label">
        Coupon code
      </label>
      <div className="mt-2 flex items-end gap-3">
        <input
          id={id}
          value={code}
          disabled={disabled}
          onChange={(e) => onCode(e.target.value.toUpperCase())}
          placeholder={`e.g. ${placeholder}`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-msg`}
          className="conv-field h-11 w-full min-w-0 flex-1 font-mono text-[15px] tracking-[0.08em] uppercase placeholder:tracking-normal placeholder:normal-case aria-[invalid=true]:border-red"
        />
        <Button type="submit" variant="outline" size="sm" disabled={disabled}>
          Apply
        </Button>
      </div>
      <p id={`${id}-msg`} role={error ? "alert" : undefined} className={clsx("mt-2 text-[12.5px] leading-snug", error ? "font-medium text-red-deep on-dark:text-red-lite" : "text-muted")}>
        {error ?? hint}
      </p>
    </form>
  );
}

/* ---------------------------------------------------------------------------- phone / tablet bar */
/** Below lg: a square bar with the price (or progress) + the main action, once `watch` has scrolled away. */
export function CourseBar({ courseId, watch }: { courseId: string; watch: React.RefObject<HTMLElement | null> }) {
  const s = useCourseState(courseId);
  const lg = useMediaQuery("(min-width: 1024px)");
  const passed = usePassed(watch);
  const { course } = s;
  if (!course || s.pending || s.mode === "closed") return null;
  const show = passed && !lg;
  if (s.mode === "enrolled" && s.progress)
    return (
      <StickyActionBar show={show} phoneOnly={false} className="lg:hidden" money={`${s.progress.percent}%`} sub={course.title} label="Course actions">
        <Button href={s.learnHref} size="sm" arrow>
          {s.progress.percent > 0 && s.progress.percent < 100 ? "Continue" : s.progress.percent >= 100 ? "Rewatch" : "Start"}
        </Button>
      </StickyActionBar>
    );
  if (s.mode === "staff")
    return (
      <StickyActionBar show={show} phoneOnly={false} className="lg:hidden" title={s.access?.owner ? "Your course" : "Admin view"} sub={`Listed at ${formatINR(course.price)}`} label="Course actions">
        <Button href={`/learn/${course.slug}`} variant="ink" size="sm">
          Open player
        </Button>
      </StickyActionBar>
    );
  return (
    <StickyActionBar
      show={show}
      phoneOnly={false}
      className="lg:hidden"
      money={formatINR(course.price)}
      sub={course.compareAtPrice ? `was ${formatINR(course.compareAtPrice)} · lifetime access` : "lifetime access"}
      label="Enroll"
    >
      <Button href={s.checkoutHref} size="sm" arrow>
        Enroll
      </Button>
    </StickyActionBar>
  );
}
