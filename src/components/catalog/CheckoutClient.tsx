"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Icon, Skeleton, StickyActionBar, toast } from "@/components/app";
import { ArrowIcon, Button } from "@/components/editorial";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import { demo, getLiveDb, useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import { getCourseAccess } from "@/lib/access";
import { cropSrc } from "@/lib/img";
import { media } from "@/lib/media";
import { CHECKOUT, COURSE_PAGE } from "@/lib/content/course";
import {
  formatDate,
  formatINR,
  getEnrollment,
  getCourseById,
  getCourseProgress,
  getTutor,
  getUser,
  isEnrolled,
  validateCoupon,
  DEMO_STUDENT_ID,
  type Course,
  type Order,
} from "@/lib/mock";
import { PAYMENT_METHODS, REFUND_LINE, couponHintLine, firstName, gstIncluded, workingCoupons } from "@/lib/mock/extra/catalog";
import { LoginPrompt, StateCard } from "./CheckoutGate";
import { CouponForm } from "./course/Commerce";
import { courseFacts, isFlagship, splitTitle } from "./course/state";
import { MetaLine, MonoTag, Row } from "./course/ui";

const STEPS = ["Opening the demo payment…", "Pretending to talk to your bank…", "Unlocking your course…"];

/** Short mono code per method (the right edge of each ruled option). */
const METHOD_CODE: Partial<Record<Order["method"], string>> = { UPI: "UPI", Card: "Card", Netbanking: "NetB", Wallet: "Wallet" };

/**
 * Mock checkout (editorial). Two columns: the steps (account, demo payment method,
 * confirm + Pay) and the order summary poster card (still, Anton title, breakdown,
 * coupon, GST, total). Needs a demo student session; logged-out visitors get a login
 * prompt (or one click into the student demo). Pay runs a short fake processing
 * sequence, then demo.checkout() creates the paid order + enrollment and we go to
 * /checkout/success?order=<id>. No real payment details are ever collected.
 */
export function CheckoutClient({ courseId, initialCoupon }: { courseId: string; initialCoupon?: string }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const { session, loginAs, logout } = useDemoAuth();
  const router = useTransitionRouter();
  const [method, setMethod] = useState<Order["method"]>("UPI");
  const [code, setCode] = useState(initialCoupon?.toUpperCase() ?? "");
  const [applied, setApplied] = useState<string | null>(initialCoupon ? initialCoupon.toUpperCase() : null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const payRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  // keyboard focus follows the coupon UI as controls swap (apply -> Remove, remove -> input)
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    document.getElementById(id)?.focus();
  });

  // a code applied while logged out (or as someone else) can stop applying when the
  // buyer changes: say so once, since the field may be off screen
  const notified = useRef<string | null>(null);
  const liveCourse = getCourseById(courseId, db);
  const sessionKey = session?.role === "student" ? session.userId : null;
  const processingNow = step >= 0;
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
  const tutor = getTutor(course.tutorId, db);
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
    toast.success("Coupon applied", { description: `You save ${formatINR(r.discount)}.` });
  };

  const pay = () => {
    if (!session || processing) return;
    if (!agree) {
      setAgreeError(true);
      // move focus to the thing that needs fixing (the alert is read with it)
      const box = document.getElementById("checkout-agree");
      box?.focus();
      box?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setStep(0);
    timers.current = [
      window.setTimeout(() => setStep(1), 700),
      window.setTimeout(() => setStep(2), 1400),
      window.setTimeout(() => {
        try {
          const { order } = demo.checkout({ userId: session.userId, courseId: course.id, couponCode: coupon?.valid ? applied! : undefined, method });
          router.push(`/checkout/success?order=${order.id}`);
        } catch (err) {
          setStep(-1);
          const message = err instanceof Error && err.message ? err.message : "Something went wrong on our side.";
          // a coupon that stopped working (used up, first-purchase only, switched off in
          // another tab): drop it, say why next to the field, focus it
          const live = applied ? validateCoupon(applied, course.id, { userId: session.userId }, getLiveDb()) : null;
          if (live && !live.valid) {
            setApplied(null);
            setCode(applied ?? "");
            setCouponError(live.message);
            focusNext.current = "checkout-coupon";
            toast.error("That coupon can't be used", { description: `${live.message} Nothing was charged.` });
            return;
          }
          toast.error("The demo payment didn't go through", { description: `${message} Nothing was charged.` });
        }
      }, 2100),
    ];
  };

  // coupon + price breakdown only make sense when this person could actually buy
  const canBuy = (access.purchasable || processing) && (!session || (session.role === "student" && (!access.enrolled || processing)));
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
  // "try it as a student" should land on a real checkout: the default student (Priya)
  // when she doesn't own this course, otherwise another active student
  const buyer =
    [getUser(DEMO_STUDENT_ID, db), ...db.users.filter((u) => u.id !== DEMO_STUDENT_ID)].find(
      (u) => !!u && u.role === "student" && u.status === "active" && !isEnrolled(u.id, course.id, db),
    ) ?? null;
  const buyerName = firstName(buyer?.name, "a student");
  const tryAsBuyer = () => (buyer ? loginAs("student", { userId: buyer.id }) : loginAs("student"));
  const enrollment = owned ? getEnrollment(session.userId, course.id, db) : null;
  const couponErr = couponError ?? (applied && coupon && !coupon.valid ? coupon.message : null);
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === method)?.label;

  /* ---------------------------------------------------------------- coupon */
  const couponUi = coupon?.valid ? (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
      <p className="t-small min-w-0">
        <span className="font-mono font-medium tracking-[0.06em]">{coupon.coupon?.code}</span>
        <span className="text-muted"> · {coupon.coupon?.description}</span>
      </p>
      <button
        type="button"
        id="checkout-coupon-remove"
        aria-label={`Remove coupon ${coupon.coupon?.code ?? ""}`.trim()}
        disabled={processing}
        onClick={() => {
          focusNext.current = "checkout-coupon";
          setApplied(null);
          setCode("");
        }}
        className="link-draw t-label shrink-0"
      >
        Remove
      </button>
    </div>
  ) : (
    <CouponForm
      id="checkout-coupon"
      code={code}
      onCode={(v) => {
        setCode(v);
        setCouponError(null);
      }}
      onSubmit={applyCoupon}
      error={couponErr}
      hint={couponHintLine(course.id, who?.userId, db)}
      placeholder={hints[0] ?? "ARJUN15"}
      disabled={processing}
    />
  );

  /* ---------------------------------------------------------------- summary (poster card) */
  const summary = (
    <div className="theatre-night">
      <SummaryPoster course={course} tutorName={tutor?.name} />
      <div className="p-5 md:p-7">
        <MetaLine className="text-ash" items={summaryFacts(course, db)} />
        {pending ? (
          <div className="mt-6 space-y-3" aria-hidden>
            <Skeleton className="h-4 w-2/3 opacity-30" />
            <Skeleton className="h-11 opacity-20" />
            <Skeleton className="h-10 w-1/2 opacity-30" />
          </div>
        ) : canBuy ? (
          <>
            <div className="mt-6">{couponUi}</div>
            <dl className="mt-4">
              {course.compareAtPrice && <Row muted k="Launch price" v={<span className="line-through">{formatINR(course.compareAtPrice)}</span>} />}
              <Row k="Course price" v={formatINR(course.price)} />
              {discount > 0 && <Row k={`Coupon (${coupon?.coupon?.code})`} v={`−${formatINR(discount)}`} className="text-red-lite" />}
              <Row muted k="GST (18%, included)" v={formatINR(gstIncluded(total))} />
              <div className="flex items-end justify-between gap-4 pt-5">
                <dt className="t-label">Total today</dt>
                <dd className="font-display text-[clamp(2.75rem,2.2rem+1.6vw,3.75rem)] leading-[0.85]" aria-live="polite">
                  {formatINR(total)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="t-small mt-6 border-t border-line pt-5 text-cream/80">
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
        {canBuy && !pending && <p className="t-caption mt-5">{REFUND_LINE}</p>}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- main column */
  let main: React.ReactNode;
  if (pending) {
    main = (
      <div className="space-y-4 border-t border-fg pt-8" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  } else if (staff && session) {
    const owner = access.owner;
    const first = firstName(user?.name, "");
    const live = course.status === "published";
    main = (
      <StateCard
        slate={owner ? "Your course" : "Admin view"}
        title={owner ? `This one's yours${first ? `, ${first}` : ""}.` : "You're seeing checkout as an admin."}
        body={
          owner
            ? live
              ? `Learners pay ${formatINR(course.price)} here and unlock every lesson. You already have all of it.`
              : `Once it's published, learners pay ${formatINR(course.price)} here. Right now it's ${statusLabel}, so checkout stays closed for them.`
            : live
              ? `Learners pay ${formatINR(course.price)} here. Admins can open every lesson without buying, and grant access from the admin screen.`
              : `It's ${statusLabel}, so learners can't buy it yet. Review it from the admin screen.`
        }
        action={
          <>
            <Button href={owner ? `/tutor/courses/${course.id}/builder` : `/admin/courses/${course.id}`} variant="ink" arrow>
              {owner ? "Open in course studio" : "Open in admin"}
            </Button>
            <Button href={`/learn/${course.slug}`} variant="outline">
              Open the course
            </Button>
            {live && (
              <button type="button" onClick={tryAsBuyer} className="link-draw t-label">
                Try checkout as {buyerName} (student demo)
              </button>
            )}
          </>
        }
      />
    );
  } else if (closed) {
    main = (
      <StateCard
        slate="Not on sale"
        title={archived ? "The tutor archived this course." : "This course isn't on sale."}
        body={archived ? "It's resting, so it can't be bought right now. People who already own it keep their access." : "It isn't published right now, so it can't be bought."}
        action={
          <>
            <Button href="/" variant="ink" arrow>
              Back home
            </Button>
            <Button href={`/courses/${course.slug}`} variant="outline">
              Course page
            </Button>
          </>
        }
      />
    );
  } else if (!session) {
    main = (
      <LoginPrompt
        next={`/checkout/${course.slug}`}
        title="Log in to unlock the course."
        body={`Checkout needs an account so your course, progress and certificate have somewhere to live. In this demo, ${buyer ? `${buyerName}, a student who hasn't bought it yet,` : "a student account"} is one click away.`}
        demo={{ label: `Continue as ${buyerName} · demo`, onClick: tryAsBuyer }}
      />
    );
  } else if (session.role !== "student") {
    main = (
      <StateCard
        slate={`${session.role} demo`}
        title="Checkout is for learner accounts."
        body={`You're signed in to the ${session.role} demo. ${access.fullAccess ? "You can already open every lesson of this course. " : ""}Switch to a student demo account to try buying it.`}
        action={
          <>
            <Button onClick={tryAsBuyer} arrow className="max-sm:w-full">
              Try as {buyerName} · student demo
            </Button>
            {access.fullAccess && (
              <Button href={`/learn/${course.slug}`} variant="outline">
                Open the course
              </Button>
            )}
          </>
        }
      />
    );
  } else if (access.enrolled && !processing) {
    const p = getCourseProgress(session.userId, course.id, db);
    main = (
      <StateCard
        slate={`${p.percent}% watched`}
        title="You already own this one."
        body="No need to pay twice. Your progress is right where you left it."
        action={
          <>
            <Button href={`/learn/${course.slug}${p.resumeItemId ? `/${p.resumeItemId}` : ""}`} arrow>
              Continue learning
            </Button>
            <Button href="/dashboard/orders" variant="outline">
              See my orders
            </Button>
          </>
        }
      />
    );
  } else {
    main = (
      <ol className="border-t border-fg">
        {/* 01 account */}
        <Step n="01" id="co-account" title={CHECKOUT.steps.account}>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{user?.name}</p>
              <p className="t-small truncate text-muted">{user?.email}</p>
            </div>
            <button type="button" disabled={processing} onClick={() => logout()} className="link-draw t-label">
              Not you? Log out
            </button>
          </div>
        </Step>

        {/* 02 method */}
        <Step n="02" id="co-pay" title={CHECKOUT.steps.method} tag={<MonoTag tone="ink">{CHECKOUT.demo}</MonoTag>}>
          <p className="t-small mt-3 max-w-[34rem] text-muted">{CHECKOUT.demoNote}</p>
          <fieldset className="mt-6 border-t border-line" disabled={processing}>
            <legend className="sr-only">Choose a demo payment method</legend>
            {PAYMENT_METHODS.map((m) => {
              const checked = method === m.value;
              return (
                <label
                  key={m.value}
                  className={clsx(
                    "group grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-line py-4 pr-1 transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg sm:gap-x-5 sm:py-5",
                    checked ? "bg-fg/[0.035]" : "hf:bg-fg/[0.02]",
                  )}
                >
                  <input type="radio" name="method" value={m.value} checked={checked} onChange={() => setMethod(m.value)} className="sr-only" />
                  <span aria-hidden className={clsx("ml-0 grid size-[18px] place-items-center border transition-colors", checked ? "border-red" : "border-line-strong group-hf:border-fg")}>
                    <span className={clsx("block size-[10px] bg-red transition-[scale] duration-300 ease-expo", checked ? "scale-100" : "scale-0")} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-heading text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-tight font-semibold tracking-[-0.02em]">{m.label}</span>
                    <span className="t-small mt-0.5 block text-muted">{m.description}</span>
                  </span>
                  <span className={clsx("t-timecode", checked ? "text-red" : "text-muted")}>{METHOD_CODE[m.value] ?? m.value}</span>
                </label>
              );
            })}
          </fieldset>
        </Step>

        {/* 03 confirm */}
        <Step n="03" id="co-confirm" title={CHECKOUT.steps.confirm}>
          <label className="group mt-5 flex cursor-pointer items-start gap-3.5">
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
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={clsx(
                "mt-[2px] grid size-[18px] shrink-0 place-items-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg",
                agree ? "border-fg bg-fg text-surface" : agreeError ? "border-red" : "border-line-strong group-hf:border-fg",
              )}
            >
              {agree && <Icon name="check" className="size-3" strokeWidth={3} />}
            </span>
            <span className="t-small">
              I understand this is a demo purchase and agree to the{" "}
              <Link href="/terms" className="underline decoration-1 underline-offset-4">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline decoration-1 underline-offset-4">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {agreeError && (
            <p id="agree-err" role="alert" className="t-small mt-2 pl-8 text-red-deep">
              Tick the box to continue.
            </p>
          )}
          <button
            ref={payRef}
            type="button"
            onClick={pay}
            aria-busy={processing || undefined}
            disabled={processing}
            className="e-btn mt-7 disabled:opacity-100!"
            data-variant="red"
            data-size="lg"
            data-full=""
          >
            {processing ? (
              <span className="flex items-center gap-3">
                <span aria-hidden className="block size-[7px] animate-rec bg-white" />
                {STEPS[step]}
              </span>
            ) : (
              <>
                <Icon name="lock" className="size-[15px]" strokeWidth={1.8} />
                <span>Pay {formatINR(total)}</span>
                <ArrowIcon />
              </>
            )}
          </button>
          <p className="t-timecode mt-3 text-center text-muted" aria-live="polite">
            {processing ? "Hang tight, this takes two seconds" : `Paying with ${methodLabel} · demo · nothing is charged`}
          </p>
        </Step>
      </ol>
    );
  }

  const heading = owned ? "Already yours." : staff ? (access.owner ? "Your course." : "Admin view.") : closed ? "Not on sale." : "Checkout.";
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
        : "One payment, lifetime access. A demo checkout: no real money moves.";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link href={`/courses/${course.slug}`} className="t-label group inline-flex items-center gap-2.5">
          <ArrowIcon dir="left" className="size-3.5 transition-[translate] duration-500 ease-expo group-hf:-translate-x-1" />
          <span className="link-draw">Back to the course</span>
        </Link>
        <p className="t-timecode text-muted">
          {CHECKOUT.label} · {CHECKOUT.demo}
        </p>
      </div>
      {pending ? (
        <div aria-hidden className="mt-8">
          <Skeleton className="h-[clamp(2.75rem,1.2rem+5.2vw,7rem)] w-full max-w-[30rem]" />
          <Skeleton className="mt-5 h-4 w-full max-w-[26rem]" />
        </div>
      ) : (
        <div className="mt-8 md:mt-10">
          <h1 className="t-headline-xl">{heading}</h1>
          <p className="t-body-l mt-4 max-w-[38rem] text-muted">{sub}</p>
        </div>
      )}

      <div className="mt-10 grid gap-y-10 md:mt-14 lg:grid-cols-12 lg:gap-x-[var(--grid-gap)]">
        <aside aria-label="Order summary" className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <div className="lg:sticky lg:top-[calc(var(--header-offset)+24px)]">{summary}</div>
        </aside>
        <div className="min-w-0 lg:col-span-6 lg:row-start-1">{main}</div>
      </div>

      <ul className="t-label mt-16 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-6 text-muted md:mt-20">
        {CHECKOUT.trust.map((t, i) => (
          <li key={t} className="flex items-center gap-5">
            {i > 0 && <span aria-hidden className="block size-[5px] bg-red" />}
            {t}
          </li>
        ))}
      </ul>

      {buying && !processing && (
        <StickyActionBar watch={payRef} money={formatINR(total)} sub={`GST included · ${methodLabel} · demo`} label="Pay">
          <Button onClick={pay} size="sm" arrow>
            Pay
          </Button>
        </StickyActionBar>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- pieces */
function Step({ n, id, title, tag, children }: { n: string; id: string; title: string; tag?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <section aria-labelledby={id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3 border-b border-line py-8 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-x-4 md:py-10">
        <span className="t-timecode pt-[0.5em] text-red">{n}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={id} className="t-headline-m">
              {title}
            </h2>
            {tag}
          </div>
          {children}
        </div>
      </section>
    </li>
  );
}

function summaryFacts(course: Course, db: Parameters<typeof courseFacts>[1]) {
  const f = courseFacts(course, db);
  return [`${f.modules} modules${f.capstone ? " + capstone" : ""}`, `${f.lessons} lessons`, f.runtime, course.hasCertificate && "Certificate"];
}

/** The poster card head: still, scrim, Anton title lockup, who teaches it. */
function SummaryPoster({ course, tutorName }: { course: Course; tutorName?: string }) {
  const flagship = isFlagship(course);
  const img = flagship ? media(COURSE_PAGE.hero.poster) : { src: course.thumbnail, pos: undefined };
  const t = flagship ? { top: COURSE_PAGE.hero.titleTop, main: COURSE_PAGE.hero.title } : splitTitle(course.title);
  return (
    <div className="relative aspect-[16/11] overflow-hidden bg-charcoal sm:aspect-[16/10]">
      <Image src={cropSrc(img.src, 10 / 16)} alt="" fill preload sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover opacity-80" style={{ objectPosition: img.pos ?? "50% 50%" }} />
      <div aria-hidden className="scrim-b absolute inset-0" />
      <p className="t-timecode absolute top-4 left-5 text-cream/85 md:top-5 md:left-7">Order summary</p>
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <p className="t-label text-cream/75">{flagship ? COURSE_PAGE.hero.kicker.replace(/^Course 01 · /, "") : "Course"}{tutorName ? ` · ${tutorName}` : ""}</p>
        <p className="mt-2 font-display text-[clamp(2.5rem,1.6rem+3.2vw,4.5rem)] leading-[0.84] text-cream uppercase">
          {t.top && <span className="block text-[0.56em] leading-[0.9]">{t.top}</span>}
          <span className="block">{t.main}</span>
        </p>
      </div>
    </div>
  );
}
