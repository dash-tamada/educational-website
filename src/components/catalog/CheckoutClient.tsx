"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Eyebrow } from "@/components/decor/Bits";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Icon,
  Skeleton,
  toast,
} from "@/components/app";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { demo, getLiveDb, useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import { getCourseAccess } from "@/lib/access";
import { toneBg } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import {
  formatDate,
  formatDuration,
  formatINR,
  getEnrollment,
  getCourseById,
  getCourseProgress,
  getCourseStats,
  getTutor,
  getUser,
  isEnrolled,
  validateCoupon,
  DEMO_STUDENT_ID,
  type Order,
} from "@/lib/mock";
import {
  PAYMENT_METHODS,
  REFUND_LINE,
  couponHintLine,
  firstName,
  gstIncluded,
  workingCoupons,
} from "@/lib/mock/extra/catalog";
import { LoginPrompt } from "./CheckoutGate";

const STEPS = [
  "Opening the demo payment…",
  "Pretending to talk to your bank…",
  "Unlocking your course…",
];

/**
 * Mock checkout. Needs a demo student session; logged-out visitors get a login
 * prompt (or one click into the student demo). Pay runs a short fake processing
 * sequence, then demo.checkout() creates the paid order + enrollment and we go
 * to /checkout/success?order=<id>. No real payment details are ever collected.
 */
export function CheckoutClient({
  courseId,
  initialCoupon,
}: {
  courseId: string;
  initialCoupon?: string;
}) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const { session, loginAs, logout } = useDemoAuth();
  const router = useTransitionRouter();
  const [method, setMethod] = useState<Order["method"]>("UPI");
  const [code, setCode] = useState(initialCoupon?.toUpperCase() ?? "");
  const [applied, setApplied] = useState<string | null>(
    initialCoupon ? initialCoupon.toUpperCase() : null,
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [mobileCoupon, setMobileCoupon] = useState(!!initialCoupon);
  const [step, setStep] = useState(-1);
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );
  // keyboard focus follows the coupon UI as controls swap (apply -> Remove,
  // remove -> input), so it never falls back to <body>
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    // the coupon UI exists twice (phone summary card + desktop sidebar): focus
    // whichever copy is actually on screen
    const el = [document.getElementById(`${id}-m`), document.getElementById(id)].find(
      (e): e is HTMLElement => !!e && e.offsetParent !== null,
    );
    el?.focus();
  });

  // a code applied while logged out (or as someone else) can stop applying when
  // the buyer changes: say so once, since the field may be off screen
  const notified = useRef<string | null>(null);
  const liveCourse = getCourseById(courseId, db);
  const sessionKey = session?.role === "student" ? session.userId : null;
  const processingNow = step >= 0;
  // only failures that depend on the buyer (first-course-only codes) get a toast;
  // a code that doesn't exist, expired or was switched off is explained by the
  // inline error next to the field. Never during pay(): it explains its own failure.
  const staleMsg = (() => {
    if (!hydrated || !applied || !sessionKey || !liveCourse || processingNow) return null;
    const forAnyone = validateCoupon(applied, liveCourse.id, null, db);
    const forBuyer = validateCoupon(applied, liveCourse.id, { userId: sessionKey }, db);
    return forAnyone.valid && !forBuyer.valid ? forBuyer.message : null;
  })();
  useEffect(() => {
    if (!staleMsg || !applied || !sessionKey) return;
    const key = `${sessionKey}:${applied}`;
    if (notified.current === key) return;
    notified.current = key;
    toast.info(`${applied} doesn't apply to this account`, { description: staleMsg });
  }, [staleMsg, applied, sessionKey]);

  const course = liveCourse;
  if (!course) return null;
  const stats = getCourseStats(course.id, db);
  const tutor = getTutor(course.tutorId, db);
  // coupons are checked for the person buying (first-purchase codes, etc.), so
  // a code applied while logged out is re-checked the moment someone logs in
  const who = session?.role === "student" ? { userId: session.userId } : null;
  const coupon = applied ? validateCoupon(applied, course.id, who, db) : null;
  const discount = coupon?.valid ? coupon.discount : 0;
  const total = course.price - discount;
  const processing = step >= 0;
  const user = session ? getUser(session.userId, db) : null;
  const access = getCourseAccess(session, course, db);

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setCouponError("Type a code first.");
    const r = validateCoupon(code, course.id, who, db);
    if (!r.valid) {
      setCouponError(r.message);
      return;
    }
    setCouponError(null);
    setApplied(r.coupon!.code);
    focusNext.current = "checkout-coupon-remove";
    toast.success("Coupon applied", {
      description: `You save ${formatINR(r.discount)}.`,
    });
  };

  const pay = () => {
    if (!session || processing) return;
    if (!agree) {
      setAgreeError(true);
      // move focus to the thing that needs fixing (the alert is read with it)
      document.getElementById("checkout-agree")?.focus();
      return;
    }
    setStep(0);
    timers.current = [
      window.setTimeout(() => setStep(1), 700),
      window.setTimeout(() => setStep(2), 1400),
      window.setTimeout(() => {
        try {
          const { order } = demo.checkout({
            userId: session.userId,
            courseId: course.id,
            couponCode: coupon?.valid ? applied! : undefined,
            method,
          });
          router.push(`/checkout/success?order=${order.id}`);
        } catch (err) {
          setStep(-1);
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Something went wrong on our side.";
          // a coupon that stopped working (used up, first-purchase only, switched
          // off in another tab): drop it, say why next to the field, focus it
          const live = applied
            ? validateCoupon(applied, course.id, { userId: session.userId }, getLiveDb())
            : null;
          if (live && !live.valid) {
            setApplied(null);
            setCode(applied ?? "");
            setCouponError(live.message);
            focusNext.current = "checkout-coupon";
            toast.error("That coupon can't be used", {
              description: `${live.message} Nothing was charged.`,
            });
            return;
          }
          toast.error("The demo payment didn't go through", {
            description: `${message} Nothing was charged.`,
          });
        }
      }, 2100),
    ];
  };

  // coupon + price breakdown only make sense when this person could actually buy
  const canBuy =
    (access.purchasable || processing) &&
    (!session ||
      (session.role === "student" && (!access.enrolled || processing)));
  const pending = !hydrated && !!session;
  const owned = !!session && access.enrolled && !processing;
  // the course's own tutor or an admin: never "not on sale", they get their own state
  const staff = !!session && (access.owner || access.admin) && !owned && !processing;
  // closed is about the course itself, not about who is looking
  const closed = course.status !== "published" && !processing && !owned && !staff;
  const archived = course.status === "archived";
  const statusLabel = course.status.replace("_", " ");
  const hints = workingCoupons(course.id, who?.userId, db);
  const buying = !!session && session.role === "student" && canBuy && !pending;
  // "try it as a student" should land on a real checkout: the default student
  // (Priya) when she doesn't own this course, otherwise another active student
  const buyer =
    [
      getUser(DEMO_STUDENT_ID, db),
      ...db.users.filter((u) => u.id !== DEMO_STUDENT_ID),
    ].find(
      (u) =>
        !!u &&
        u.role === "student" &&
        u.status === "active" &&
        !isEnrolled(u.id, course.id, db),
    ) ?? null;
  const buyerName = firstName(buyer?.name, "a student");
  const tryAsBuyer = () =>
    buyer ? loginAs("student", { userId: buyer.id }) : loginAs("student");
  const enrollment = owned
    ? getEnrollment(session.userId, course.id, db)
    : null;

  /* ---------------------------------------------------------------- coupon (sidebar + phone card) */
  const couponErr =
    couponError ?? (applied && coupon && !coupon.valid ? coupon.message : null);
  const renderCoupon = (sfx: "" | "-m") =>
    coupon?.valid ? (
      <div className="flex items-center justify-between gap-3 rounded-tag bg-mint/50 px-3 py-2.5 text-[14px]">
        <span className="min-w-0">
          <strong>{coupon.coupon?.code}</strong>{" "}
          <span className="text-forest">· {coupon.coupon?.description}</span>
        </span>
        <button
          type="button"
          id={`checkout-coupon-remove${sfx}`}
          aria-label={`Remove coupon ${coupon.coupon?.code ?? ""}`.trim()}
          disabled={processing}
          onClick={() => {
            focusNext.current = "checkout-coupon";
            setApplied(null);
            setCode("");
          }}
          className="shrink-0 rounded-full px-2 py-1 text-[13px] font-bold underline-offset-4 hf:underline"
        >
          Remove
        </button>
      </div>
    ) : (
      <form onSubmit={applyCoupon} noValidate>
        <label htmlFor={`checkout-coupon${sfx}`} className="text-[14px] font-bold">
          Coupon code
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={`checkout-coupon${sfx}`}
            value={code}
            disabled={processing}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setCouponError(null);
            }}
            placeholder={`e.g. ${hints[0] ?? "INBOX10"}`}
            autoComplete="off"
            aria-invalid={couponErr ? true : undefined}
            aria-describedby={`checkout-coupon-msg${sfx}`}
            className="h-11 w-full min-w-0 flex-1 rounded-tag bg-white px-3.5 text-[15px] font-semibold tracking-[0.04em] uppercase ring-1 ring-ink/[0.12] placeholder:font-medium placeholder:tracking-normal placeholder:text-ink/40 placeholder:normal-case focus:ring-2 focus:ring-blue focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-flame"
          />
          <Button type="submit" variant="primary" disabled={processing}>
            Apply
          </Button>
        </div>
        <p
          id={`checkout-coupon-msg${sfx}`}
          role={couponErr ? "alert" : undefined}
          className={clsx(
            "mt-1.5 text-[13px]",
            couponErr ? "font-semibold text-[#c13500]" : "text-ink/55",
          )}
        >
          {couponErr ?? couponHintLine(course.id, who?.userId, db)}
        </p>
      </form>
    );

  /* ---------------------------------------------------------------- summary (right column) */
  const summary = (
    <div className="rounded-card-lg bg-white p-5 shadow-soft md:p-6">
      <h2 className="t-app-h2">Order summary</h2>
      <div className="mt-4 flex gap-3.5">
        <div
          className={clsx(
            "relative size-[84px] shrink-0 overflow-hidden rounded-img",
            toneBg[course.tone],
          )}
        >
          <Image
            src={cropSrc(course.thumbnail, 1)}
            alt=""
            fill
            sizes="84px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 t-app-h3">{course.title}</p>
          <p className="mt-1 text-[13px] font-semibold text-ink/60">
            by {tutor?.name}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink/60">
            {stats.videos} lessons · {formatDuration(stats.totalSec)} ·{" "}
            {course.level}
          </p>
        </div>
      </div>

      {pending ? (
        // a student's demo purchases only exist after the store overlay: no seed
        // price or coupon form until we know whether they already own it
        <div className="mt-5 space-y-3 border-t border-ink/[0.07] pt-4" aria-hidden>
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <Skeleton className="h-11 rounded-tag" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="mt-2 h-9 w-1/2 rounded-full" />
        </div>
      ) : (
        <>
      {canBuy && (
        // phones + tablets get the coupon field in the top summary card (above
        // Pay); this copy is for the desktop sidebar
        <div className={clsx("mt-5 border-t border-ink/[0.07] pt-4", buying && "max-lg:hidden")}>
          {renderCoupon("")}
        </div>
      )}

      {canBuy ? (
        <dl className="mt-5 space-y-2.5 text-[14.5px] font-semibold">
          {course.compareAtPrice && (
            <div className="flex justify-between gap-3 text-ink/55">
              <dt>Original price</dt>
              <dd className="line-through">
                {formatINR(course.compareAtPrice)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt>Course price</dt>
            <dd>{formatINR(course.price)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between gap-3 text-forest">
              <dt>Coupon ({coupon?.coupon?.code})</dt>
              <dd>−{formatINR(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 text-ink/55">
            <dt>GST (18%, included)</dt>
            <dd>{formatINR(gstIncluded(total))}</dd>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-ink/[0.07] pt-3">
            <dt className="text-[16px] font-bold">Total today</dt>
            <dd className="font-display text-[2.25rem] leading-none font-black">
              {formatINR(total)}
            </dd>
          </div>
        </dl>
      ) : (
        <p
          className={clsx(
            "mt-5 flex items-start gap-2 rounded-tag px-3 py-2.5 text-[13.5px] font-semibold",
            owned
              ? "bg-mint/60 text-forest"
              : closed
                ? "bg-lilac/25 text-ink/80"
                : "bg-cream text-ink/75",
          )}
        >
          <Icon
            name={owned ? "check-circle" : closed ? "lock" : "info"}
            className="mt-px size-4 shrink-0"
          />
          {owned
            ? `In your library${enrollment ? ` since ${formatDate(enrollment.createdAt, "medium")}` : ""}. Nothing to pay.`
            : closed
              ? archived
                ? "Archived by the tutor, so it isn't for sale. People who own it keep access."
                : "Not published, so it isn't for sale."
              : course.status === "published"
                ? `Listed at ${formatINR(course.price)} for learners.`
                : `Listed at ${formatINR(course.price)}. It's ${statusLabel}, so learners can't buy it yet.`}
        </p>
      )}
      {canBuy && (
        <p className="mt-4 flex items-start gap-2 rounded-tag bg-cream px-3 py-2.5 text-[13px] font-semibold text-ink/70">
          <Icon name="shield" className="mt-px size-4 shrink-0 text-green" />
          {REFUND_LINE}
        </p>
      )}
        </>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- gates */
  let main: React.ReactNode;
  if (pending) {
    main = (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-28 rounded-card-lg" />
        <Skeleton className="h-72 rounded-card-lg" />
      </div>
    );
  } else if (staff && session) {
    const owner = access.owner;
    const first = firstName(user?.name, "");
    const live = course.status === "published";
    main = (
      <div className="rounded-card-lg bg-white shadow-soft">
        <EmptyState
          art="buddy"
          tone={owner ? "cyan" : "lilac"}
          title={
            owner
              ? `This one's yours${first ? `, ${first}` : ""}.`
              : "You're seeing checkout as an admin."
          }
          body={
            owner
              ? live
                ? `Learners pay ${formatINR(course.price)} here and unlock every lesson. You already have all of it, no payment needed.`
                : `Once it's published, learners pay ${formatINR(course.price)} here. Right now it's ${statusLabel}, so checkout stays closed for them.`
              : live
                ? `Learners pay ${formatINR(course.price)} here. Admins can open every lesson without buying, and grant access to anyone from the admin screen.`
                : `It's ${statusLabel}, so learners can't buy it yet. Review it from the admin screen.`
          }
          action={
            <>
              <Button
                href={owner ? `/tutor/courses/${course.id}/builder` : `/admin/courses/${course.id}`}
                icon={owner ? "edit" : "shield"}
              >
                {owner ? "Open in course studio" : "Open in admin"}
              </Button>
              <Button href={`/learn/${course.slug}`} variant="secondary" icon="play">
                Open the course
              </Button>
              {live && (
                <Button variant="ghost" icon="switch" onClick={tryAsBuyer} className="h-auto! min-h-11 max-w-full py-2.5 text-center leading-tight! whitespace-normal!">
                  Try checkout as {buyerName} (student demo)
                </Button>
              )}
            </>
          }
        />
      </div>
    );
  } else if (closed) {
    main = (
      <div className="rounded-card-lg bg-white shadow-soft">
        <EmptyState
          art="buddy"
          tone="lilac"
          title={
            archived
              ? "The tutor archived this course."
              : "This course isn't on sale."
          }
          body={
            archived
              ? "It's resting, so it can't be bought right now. People who already own it keep their access. Plenty of fresh ones in the library, though."
              : "It isn't published right now, so it can't be bought."
          }
          action={
            <>
              <Button href="/courses">Browse courses</Button>
              <Button href={`/courses/${course.slug}`} variant="secondary">
                Course page
              </Button>
            </>
          }
        />
      </div>
    );
  } else if (!session) {
    main = (
      <LoginPrompt
        next={`/checkout/${course.slug}`}
        title="Log in to unlock this course."
        body="Checkout needs an account so your course, progress and certificate have somewhere to live. In this demo, Priya's student account is one click away."
      />
    );
  } else if (session.role !== "student") {
    main = (
      <div className="rounded-card-lg bg-white shadow-soft">
        <EmptyState
          art="buddy"
          tone="cyan"
          title="Checkout is for learner accounts."
          body={`You're signed in to the ${session.role} demo. ${access.fullAccess ? "You can already open every lesson of this course." : ""} Switch to a student demo account to try buying it.`}
          action={
            <>
              <Button
                variant="accent"
                icon="switch"
                onClick={tryAsBuyer}
                className="h-auto! min-h-11 max-w-full py-2.5 text-center leading-tight! whitespace-normal!"
              >
                Try checkout as {buyerName} (student demo)
              </Button>
              {access.fullAccess && (
                <Button href={`/learn/${course.slug}`} variant="secondary">
                  Open the course
                </Button>
              )}
            </>
          }
        />
      </div>
    );
  } else if (access.enrolled && !processing) {
    const p = getCourseProgress(session.userId, course.id, db);
    main = (
      <div className="rounded-card-lg bg-white shadow-soft">
        <EmptyState
          art="buddies"
          tone="mint"
          title="You already own this one."
          body="No need to pay twice. Your progress is right where you left it."
          action={
            <>
              <Button
                href={`/learn/${course.slug}${p.resumeItemId ? `/${p.resumeItemId}` : ""}`}
                variant="accent"
                icon="play"
              >
                Continue learning
              </Button>
              <Button href="/dashboard/orders" variant="secondary">
                See my orders
              </Button>
            </>
          }
        />
      </div>
    );
  } else {
    main = (
      <div className="space-y-4">
        <section
          aria-labelledby="co-account"
          className="rounded-card-lg bg-white p-5 shadow-soft md:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="co-account" className="t-app-h2">
              <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-ink align-[3px] text-[14px] text-cream">
                1
              </span>
              Your account
            </h2>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                name={user?.name ?? "Learner"}
                src={user?.avatar}
                tone={user?.tone}
                size="md"
                decorative
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold">{user?.name}</p>
                <p className="truncate text-[13px] font-semibold text-ink/60">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={processing}
              onClick={() => logout()}
              className="rounded-full px-2 py-1 text-[13px] font-bold text-blue underline-offset-4 hf:underline"
            >
              Not you? Log out
            </button>
          </div>
        </section>

        <section
          aria-labelledby="co-pay"
          className="rounded-card-lg bg-white p-5 shadow-soft md:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="co-pay" className="t-app-h2">
              <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-ink align-[3px] text-[14px] text-cream">
                2
              </span>
              Payment method
            </h2>
            <Badge tone="butter" dot>
              Demo payment
            </Badge>
          </div>
          <p className="mt-2 text-[14px] text-ink/65">
            This is a demo: pick any method, no money moves and we never ask for
            card or bank details. In the real app, Razorpay opens here.
          </p>
          <fieldset className="mt-4" disabled={processing}>
            <legend className="sr-only">Choose a demo payment method</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m) => {
                const checked = method === m.value;
                return (
                  <label
                    key={m.value}
                    className={clsx(
                      "flex cursor-pointer items-start gap-3 rounded-card p-4 ring-1 transition-[box-shadow,background-color] duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue",
                      checked
                        ? "bg-butter ring-2 ring-ink"
                        : "bg-white ring-ink/[0.12] hf:ring-ink/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m.value}
                      checked={checked}
                      onChange={() => setMethod(m.value)}
                      className="sr-only"
                    />
                    <span
                      className={clsx(
                        "grid size-10 shrink-0 place-items-center rounded-full",
                        checked ? "bg-ink text-cream" : "bg-ink/[0.06]",
                      )}
                      aria-hidden
                    >
                      <Icon name={m.icon} className="size-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold">
                        {m.label}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink/60">
                        {m.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section
          aria-labelledby="co-confirm"
          className="rounded-card-lg bg-white p-5 shadow-soft md:p-6"
        >
          <h2 id="co-confirm" className="t-app-h2">
            <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-ink align-[3px] text-[14px] text-cream">
              3
            </span>
            Confirm and unlock
          </h2>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              id="checkout-agree"
              type="checkbox"
              checked={agree}
              disabled={processing}
              onChange={(e) => {
                setAgree(e.target.checked);
                setAgreeError(false);
              }}
              aria-invalid={agreeError || undefined}
              aria-describedby={agreeError ? "agree-err" : undefined}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
            />
            <span className="text-[14.5px] leading-snug font-semibold">
              I understand this is a demo purchase and agree to the{" "}
              <Link
                href="/terms"
                className="text-blue underline-offset-4 hf:underline"
              >
                terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue underline-offset-4 hf:underline"
              >
                privacy policy
              </Link>
              .
            </span>
          </label>
          {agreeError && (
            <p
              id="agree-err"
              role="alert"
              className="mt-1.5 text-[13px] font-semibold text-[#c13500]"
            >
              Tick the box to continue.
            </p>
          )}
          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="mt-5"
            loading={processing}
            onClick={pay}
            icon={processing ? undefined : "lock"}
          >
            {processing ? STEPS[step] : `Pay ${formatINR(total)} (demo)`}
          </Button>
          <p
            className="mt-2.5 text-center text-[13px] font-semibold text-ink/55"
            aria-live="polite"
          >
            {processing
              ? "Hang tight, this takes two seconds."
              : `Paying with ${PAYMENT_METHODS.find((m) => m.value === method)?.label}. Nothing is charged.`}
          </p>
        </section>
      </div>
    );
  }

  const heading = owned
    ? "Already yours"
    : staff
      ? access.owner
        ? "Your course"
        : "Admin view"
      : closed
        ? "Not on sale"
        : `Unlock ${course.title}`;
  const sub = owned
    ? `You own ${course.title}. No need to pay twice.`
    : staff
      ? course.status === "published"
        ? `${course.title} is on sale. Learners pay ${formatINR(course.price)} here.`
        : `${course.title} is ${statusLabel}, so learners can't check out yet.`
      : closed
      ? archived
        ? "The tutor archived this course, so checkout is closed."
        : "This course isn't published, so checkout is closed."
      : "One payment, lifetime access. This is a demo checkout: no real money moves.";

  return (
    <>
      <div className="mt-5 mb-8 md:mb-10">
        <Eyebrow tone={owned ? "green" : staff ? (access.owner ? "cyan" : "purple") : closed ? "purple" : "hotpink"}>
          Checkout
        </Eyebrow>
        {pending ? (
          <div aria-hidden>
            <Skeleton className="mt-eyebrow h-[clamp(2.5rem,2rem+2vw,3.75rem)] w-full max-w-[34rem] rounded-full" />
            <Skeleton className="mt-4 h-4 w-full max-w-[28rem] rounded-full" />
          </div>
        ) : (
          <>
            <h1 className="mt-eyebrow max-w-[20ch] t-display-m">{heading}</h1>
            <p className="mt-3 max-w-[36rem] t-body text-ink/70">{sub}</p>
          </>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        {buying && (
          // phones + tablets: what you're buying, the total and the coupon field,
          // all before the steps (so applying a code never means scrolling past Pay)
          <div className="rounded-card-lg bg-white p-3 pr-4 shadow-soft lg:hidden">
            <a
              href="#order-summary"
              className="-m-1 flex items-center gap-3 rounded-card p-1"
            >
              <span
                className={clsx(
                  "relative size-14 shrink-0 overflow-hidden rounded-img",
                  toneBg[course.tone],
                )}
              >
                <Image
                  src={cropSrc(course.thumbnail, 1)}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">
                  {course.title}
                </span>
                <span className="block text-[13px] font-semibold text-blue">
                  {discount > 0 ? `Coupon saves ${formatINR(discount)} · ` : ""}
                  See breakdown
                </span>
              </span>
              <span className="font-display text-[1.75rem] leading-none font-black">
                {formatINR(total)}
              </span>
            </a>
            <div className="mt-3 border-t border-ink/[0.07] pt-3">
              {mobileCoupon || coupon?.valid || couponErr ? (
                renderCoupon("-m")
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    focusNext.current = "checkout-coupon";
                    setMobileCoupon(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full py-1 text-[14px] font-bold text-blue underline-offset-4 hf:underline"
                >
                  <Icon name="ticket" className="size-4" />
                  Have a coupon?
                </button>
              )}
            </div>
          </div>
        )}
        <div className="min-w-0">{main}</div>
        <aside
          id="order-summary"
          aria-label="Order summary"
          className="min-w-0 scroll-mt-[calc(var(--header-offset)+16px)] lg:sticky lg:top-[calc(var(--header-offset)+8px)] lg:self-start"
        >
          {summary}
        </aside>
      </div>
    </>
  );
}
