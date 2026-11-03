"use client";

import { useRef } from "react";
import Image from "next/image";
import clsx from "clsx";
import { Skeleton } from "@/components/app";
import { ArrowLink, Button, Eyebrow, GridLines, RedWords } from "@/components/editorial";
import { gsap, useGSAP } from "@/lib/gsap";
import { armEnter, markEntered, onPageReady, prefersReducedMotion } from "@/lib/motion";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { roleHome } from "@/lib/demo/session";
import { cropSrc } from "@/lib/img";
import { media } from "@/lib/media";
import { COURSE_PAGE, SUCCESS } from "@/lib/content/course";
import { formatDate, formatINR, getCertificates, getCourseProgress, getFirstFreeItem, getOrder, getTutor, getUser, isEnrolled, type OrderRow } from "@/lib/mock";
import { LoginPrompt, StateCard } from "./CheckoutGate";
import { CertificateTeaser } from "./course/Certificate";
import { isFlagship } from "./course/state";
import { MonoTag } from "./course/ui";

/* =============================================================================
   /checkout/success?order=<id>: the "premiere" moment. A dark theatre page: the
   order slate, a giant Anton line ("YOU'RE IN."), the red CTA into module 01 and
   the certificate teaser with the buyer's name on it; then the three next steps
   and a ruled receipt. Failed / pending / refunded / granted orders get honest
   copy (never a celebration for a payment that failed). Only the buyer (or an
   admin) sees the receipt; everyone else gets a gate.
   ============================================================================= */
export function CheckoutSuccess({ orderId }: { orderId: string | null }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const order = orderId ? getOrder(orderId, db) : null;
  const next = `/checkout/success${orderId ? `?order=${encodeURIComponent(orderId)}` : ""}`;

  if (!session) {
    return (
      <Gate>
        <LoginPrompt as="h1" next={next} title="Log in to see your order." body="Receipts live inside the account that paid. In this demo, Priya's student account is one click away." />
      </Gate>
    );
  }

  if (!order && !hydrated) {
    return (
      <Gate>
        <div aria-busy="true" aria-label="Loading your order">
          <Skeleton className="h-3 w-48 opacity-30" />
          <Skeleton className="mt-8 h-[clamp(5rem,12vw,11rem)] w-full max-w-[40rem] opacity-20" />
          <Skeleton className="mt-8 h-12 w-64 opacity-20" />
        </div>
      </Gate>
    );
  }

  const ordersHref = session.role === "student" ? "/dashboard/orders" : roleHome(session.role);
  const ordersLabel = session.role === "student" ? "My orders" : "Go to my dashboard";

  if (!order || !order.course) {
    return (
      <Gate>
        <StateCard
          as="h1"
          slate="Order not found"
          title="We couldn't find that order."
          body={
            orderId
              ? "The link may be from another browser (demo orders live in this browser only), or the demo data was reset."
              : "This page needs an order link. You land here right after paying for the course."
          }
          action={
            <>
              <Button href="/courses/ai-filmmaking" arrow>
                See the course
              </Button>
              <Button href={ordersHref} variant="outline">
                {ordersLabel}
              </Button>
            </>
          }
        />
      </Gate>
    );
  }

  const mine = session.userId === order.userId;
  if (!mine && session.role !== "admin") {
    const me = getUser(session.userId, db);
    return (
      <Gate>
        <StateCard
          as="h1"
          slate="Another account"
          title="This order belongs to someone else."
          body={`You're signed in as ${me?.name ?? "someone else"}. Receipts are only shown to the person who paid. Switch accounts to see it, or head to your own orders.`}
          action={
            <>
              <Button href="/courses/ai-filmmaking" arrow>
                See the course
              </Button>
              <Button href={ordersHref} variant="outline">
                {ordersLabel}
              </Button>
            </>
          }
        />
      </Gate>
    );
  }

  return mine ? <BuyerView order={order} userId={session.userId} /> : <AdminView order={order} />;
}

/** Dark, flush page frame for the gates (the route opens on a dark ground). */
function Gate({ children }: { children: React.ReactNode }) {
  return (
    <section className="theatre relative min-h-[100svh] overflow-hidden">
      <GridLines stops={[50, 75]} className="top-[calc(var(--header-offset)+var(--sat))] max-lg:hidden" />
      <div className="container-wide relative flex min-h-[100svh] flex-col justify-center pt-[calc(var(--header-offset)+var(--sat)+40px)] pb-section">
        <div className="max-w-[46rem]">{children}</div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- order kind */
type OrderKind = "paid" | "grant" | "refunded" | "failed" | "pending";

/** What actually happened with this order (never celebrate a payment that failed). */
function orderKind(order: OrderRow): OrderKind {
  if (order.status === "refunded") return "refunded";
  if (order.status === "failed") return "failed";
  if (order.status === "pending") return "pending";
  if (order.provider === "admin" || order.method === "Grant") return "grant";
  return "paid";
}

const SLATE: Record<OrderKind, string> = {
  paid: "Order confirmed",
  grant: "A gift from the Tamada team",
  refunded: "Order refunded",
  failed: "Payment didn't go through",
  pending: "Waiting on the bank",
};

/* ----------------------------------------------------------------------------- buyer */
function BuyerView({ order, userId }: { order: OrderRow; userId: string }) {
  const db = useDb();
  const root = useRef<HTMLElement>(null);
  const course = order.course!;
  const tutor = getTutor(course.tutorId, db);
  const buyer = getUser(userId, db);
  const kind = orderKind(order);
  const unlocked = (kind === "paid" || kind === "grant") && isEnrolled(userId, course.id, db);
  const progress = getCourseProgress(userId, course.id, db);
  const free = getFirstFreeItem(course.id, db);
  const start = progress.resumeItemId ?? free?.id;
  const learnHref = `/learn/${course.slug}${start ? `/${start}` : ""}`;
  const freeHref = `/learn/${course.slug}${free ? `/${free.id}` : ""}`;
  const cert = getCertificates(userId, db).find((c) => c.courseId === course.id);
  const started = progress.percent > 0;

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      return onPageReady(() => {
        armEnter(el);
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(q("[data-sx-line]"), { autoAlpha: 0, yPercent: 105 }, { autoAlpha: 1, yPercent: 0, duration: 1.3, stagger: 0.1 }, 0.1)
          .fromTo(q("[data-sx-fade]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07 }, 0.45)
          .fromTo(q("[data-sx-cert]"), { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.5)
          .call(() => markEntered(q("[data-enter]")));
      });
    },
    { scope: root },
  );

  const hero = ((): { lines: string[]; red: string[]; body: string; primary: { href: string; label: string }; secondary: { href: string; label: string } } => {
    switch (kind) {
      case "refunded":
        return {
          lines: ["All", "sorted."],
          red: ["sorted"],
          body: `This order was refunded${order.refundedAt ? ` on ${formatDate(order.refundedAt, "medium")}` : ""}, so ${course.title} is locked again. The first lesson stays free whenever you want it.`,
          primary: { href: `/courses/${course.slug}`, label: "Back to the course" },
          secondary: { href: "/dashboard/orders", label: "My orders" },
        };
      case "failed":
        return {
          lines: ["Not this", "time."],
          red: ["time"],
          body: `No money moved and nothing was charged. ${course.title} is still locked; try again in a few seconds. The first lesson stays free either way.`,
          primary: { href: `/checkout/${course.slug}`, label: "Try again" },
          secondary: { href: freeHref, label: "Watch free lesson" },
        };
      case "pending":
        return {
          lines: ["Almost", "there."],
          red: ["there"],
          body: `Your bank hasn't confirmed this payment yet. Most clear in a few minutes. ${course.title} unlocks the moment it does; if it fails, no money moves.`,
          primary: { href: "/dashboard/orders", label: "Check my orders" },
          secondary: { href: freeHref, label: "Watch free lesson" },
        };
      case "grant":
        return {
          lines: ["It's", "yours."],
          red: ["yours"],
          body: `An admin gave you full access to ${course.title}. No payment: every lesson and checkpoint, yours for life.`,
          primary: { href: unlocked ? learnHref : `/courses/${course.slug}`, label: unlocked ? (started ? "Continue learning" : "Start module 01") : "Course page" },
          secondary: { href: "/dashboard", label: "Go to my dashboard" },
        };
      default:
        return {
          lines: ["You're", "in."],
          red: ["in"],
          body: `${course.title} is unlocked. Every lesson, every checkpoint, the capstone and the certificate: yours for life. Lights down. Press play.`,
          primary: { href: unlocked ? learnHref : `/courses/${course.slug}`, label: unlocked ? (started ? "Continue learning" : "Start module 01") : "Course page" },
          secondary: { href: "/dashboard", label: "Go to my dashboard" },
        };
    }
  })();
  const celebrate = kind === "paid" || kind === "grant";
  const poster = isFlagship(course) ? media(COURSE_PAGE.hero.poster) : { src: course.thumbnail, pos: undefined };

  return (
    <>
      <section ref={root} aria-labelledby="success-title" className="theatre relative isolate overflow-hidden">
        {/* the poster, far back and dim: the house lights going down */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image src={cropSrc(poster.src, 0.6)} alt="" fill preload sizes="100vw" className="object-cover opacity-25" style={{ objectPosition: poster.pos ?? "50% 50%" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
        </div>
        <GridLines stops={[50, 75]} className="top-[calc(var(--header-offset)+var(--sat))] max-lg:hidden" />
        <div className="container-wide edit-grid relative min-h-[100svh] items-end gap-y-12 pt-[calc(var(--header-offset)+var(--sat)+40px)] pb-[clamp(40px,8vh,96px)]">
          <div className="col-span-12 lg:col-span-7">
            <p data-sx-fade="" data-enter="" className="t-timecode flex flex-wrap items-center gap-x-3 gap-y-2 text-cream/85">
              <span aria-hidden className={clsx("block size-[7px]", kind === "failed" ? "bg-ash" : "animate-rec bg-red")} />
              {SLATE[kind]} · {order.number}
            </p>
            <h1 id="success-title" className="mt-8 font-display text-[clamp(5.5rem,2rem+15vw,15rem)] leading-[0.8] uppercase">
              {hero.lines.map((l) => (
                <span key={l} className="line-mask">
                  <span data-sx-line="" data-enter="" className="block">
                    <RedWords text={l} red={hero.red} />
                  </span>
                </span>
              ))}
            </h1>
            <p data-sx-fade="" data-enter="" className="t-body-l mt-8 max-w-[34rem] text-cream/80">
              {hero.body}
            </p>
            <div data-sx-fade="" data-enter="" className="mt-10 flex flex-wrap items-center gap-3 [&>*]:max-sm:w-full">
              <Button href={hero.primary.href} size="lg" arrow>
                {hero.primary.label}
              </Button>
              <Button href={hero.secondary.href} variant="outline" size="lg">
                {hero.secondary.label}
              </Button>
            </div>
          </div>
          {celebrate && course.hasCertificate && (
            <div className="col-span-12 sm:col-span-10 md:col-span-8 lg:col-span-5 lg:pb-4">
              <div className="rotate-[-2deg] motion-reduce:rotate-0">
                <div data-sx-cert="" data-enter="">
                <CertificateTeaser
                  title={course.certificateTitle ?? course.title}
                  name={buyer?.name ?? "You"}
                  course={course.title}
                  director={tutor?.name ?? "Arjun Rao"}
                  code={cert?.code ?? "Issued on completion"}
                />
                </div>
              </div>
              <p data-sx-fade="" data-enter="" className="t-timecode mt-5 text-ash">
                {cert ? "Already earned · verify it any time" : "Yours when you premiere your capstone"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* next steps + receipt */}
      <section aria-labelledby="next-title" className="theatre-night relative">
        <div className="container-wide edit-grid gap-y-14 py-section">
          <div className="col-span-12 lg:col-span-7">
            <Eyebrow index="02">{celebrate ? "What happens next" : "Good to know"}</Eyebrow>
            <h2 id="next-title" className="t-headline-l mt-6 max-w-[16ch]">
              {celebrate ? "From lesson one to your premiere." : kind === "failed" ? "Nothing was charged." : "The first lesson is still free."}
            </h2>
            {celebrate ? (
              <ol className="mt-10 grid border-t border-line-strong sm:grid-cols-3">
                {SUCCESS.next.map((st, i) => (
                  <li key={st.title} className="border-b border-line py-6 sm:border-r sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:border-r-0">
                    <p className="t-timecode text-red-lite">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-6 font-heading text-[1.25rem] leading-[1.1] font-semibold tracking-[-0.025em]">{st.title}</h3>
                    <p className="t-small mt-2 text-cream/65">{st.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="t-body-l mt-6 max-w-[34rem] text-cream/75">
                {kind === "failed"
                  ? "A failed payment never takes money. Card or UPI acting up? Pick another method on the checkout page: it's all demo money anyway."
                  : kind === "pending"
                    ? "Still pending after an hour? It usually means the bank dropped it. You can safely try again."
                    : "Changed your mind again? The course is a click away, and lesson one is open to everyone."}
              </p>
            )}
            <div className="mt-10">
              <ArrowLink href={kind === "failed" ? `/checkout/${course.slug}` : `/courses/${course.slug}`} size="lg">
                {kind === "failed" ? "Back to checkout" : "Back to the course page"}
              </ArrowLink>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <Receipt order={order} />
            <div className="mt-6">
              <ArrowLink href="/dashboard/orders">All my orders</ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ----------------------------------------------------------------------------- admin */
const PROVIDER_LABEL: Record<string, string> = { razorpay: "Razorpay", stripe: "Stripe", upi: "UPI", admin: "Admin grant" };

function adminSentence(order: OrderRow, kind: OrderKind): string {
  const who = order.user?.name ?? "A learner";
  const what = order.course!.title;
  const when = formatDate(order.createdAt, "medium");
  switch (kind) {
    case "failed":
      return `${who} tried to buy ${what} on ${when}, but the payment failed. Nothing was charged and no access was given.`;
    case "pending":
      return `${who} started paying for ${what} on ${when}. The payment is still pending with the bank.`;
    case "grant":
      return `${who} was granted ${what} by an admin on ${when}. No payment was taken.`;
    case "refunded":
      return `${who} bought ${what} on ${when}. It was refunded${order.refundedAt ? ` on ${formatDate(order.refundedAt, "medium")}` : ""}${order.refundReason ? ` (${order.refundReason.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())})` : ""}, so access was revoked.`;
    default:
      return `${who} bought ${what} on ${when}. Learners see a premiere here; you see the paperwork.`;
  }
}

function AdminView({ order }: { order: OrderRow }) {
  const kind = orderKind(order);
  const course = order.course!;
  return (
    <section aria-labelledby="admin-order" className="theatre relative min-h-[100svh]">
      <div className="container-wide edit-grid gap-y-12 pt-[calc(var(--header-offset)+var(--sat)+48px)] pb-section">
        <div className="col-span-12 lg:col-span-7">
          <Eyebrow>Admin view</Eyebrow>
          <h1 id="admin-order" className="t-headline-xl mt-8">
            Order {order.number}
          </h1>
          <p className="t-body-l mt-6 max-w-[40rem] text-cream/75">{adminSentence(order, kind)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={`/admin/orders?q=${encodeURIComponent(order.number)}`} arrow>
              Open in admin
            </Button>
            <Button href={`/courses/${course.slug}`} variant="outline">
              Course page
            </Button>
          </div>
          <dl className="mt-12 grid border-t border-line-strong sm:grid-cols-2 sm:gap-x-[var(--grid-gap)]">
            {[
              [kind === "grant" ? "Granted to" : "Buyer", order.user?.name ?? "Unknown"],
              ["Email", order.user?.email ?? "Unknown"],
              ["City", order.user?.city ?? "Unknown"],
              ["Provider", PROVIDER_LABEL[order.provider] ?? order.provider],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-line py-4">
                <dt className="t-label text-ash">{k}</dt>
                <dd className="mt-1.5 truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <Receipt order={order} audience="admin" />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- receipt */
const TOTAL_LABEL: Record<OrderKind, string> = {
  paid: "Total paid",
  grant: "Granted",
  refunded: "Refunded",
  failed: "Amount (not charged)",
  pending: "Amount due",
};

const RECEIPT_NOTE_ADMIN: Record<OrderKind, string> = {
  paid: "Demo payment: no money moved. In the real app the GST invoice goes to the learner's inbox.",
  grant: "Granted by an admin: nothing to pay, so there's no invoice.",
  refunded: "Demo refund: no money moved. In the real app it reaches the learner's account in 5 to 7 working days.",
  failed: "This demo payment failed, so the learner wasn't charged and no invoice was made.",
  pending: "Demo payment, still pending: the learner hasn't been charged yet.",
};

const RECEIPT_NOTE: Record<OrderKind, string> = {
  paid: "Demo payment: no money moved. In the real app a GST invoice lands in your inbox.",
  grant: "Granted by an admin: nothing to pay, so there's no invoice.",
  refunded: "Demo refund: no money moved. In the real app it reaches your account in 5 to 7 working days.",
  failed: "This demo payment failed, so nothing was charged and no invoice was made.",
  pending: "Demo payment, still pending: nothing has been charged yet.",
};

const STATUS_TAG: Record<OrderKind, string> = { paid: "Paid", grant: "Granted", refunded: "Refunded", failed: "Failed", pending: "Pending" };

function Receipt({ order, audience = "buyer" }: { order: OrderRow; audience?: "buyer" | "admin" }) {
  const kind = orderKind(order);
  const rows: [string, string][] = [
    ["Order", order.number],
    ["Date", formatDate(order.createdAt, "datetime")],
    kind === "grant" ? ["Access", "Granted by an admin"] : [kind === "failed" ? "Tried with" : kind === "pending" ? "Paying with" : "Paid with", `${order.method} (demo)`],
    ["Reference", order.providerRef],
  ];
  const price = kind === "grant" ? (order.course?.price ?? order.subtotal) : order.subtotal;
  return (
    <section aria-labelledby="receipt-title" className="border border-line-strong p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="receipt-title" className="t-label">
          {kind === "failed" || kind === "pending" ? "Payment details" : "Receipt"}
        </h2>
        <MonoTag tone={kind === "paid" || kind === "grant" ? "red" : "line"}>{STATUS_TAG[kind]}</MonoTag>
      </div>
      <dl className="mt-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5">
            <dt className="t-small shrink-0 text-muted">{k}</dt>
            <dd className="t-small min-w-0 truncate text-right font-mono tracking-[0.02em]">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-b border-line py-2.5">
          <dt className="t-small">Course price</dt>
          <dd className="t-small">{formatINR(price)}</dd>
        </div>
        {kind === "grant" && (
          <div className="flex justify-between gap-4 border-b border-line py-2.5">
            <dt className="t-small">Admin grant</dt>
            <dd className="t-small">−{formatINR(price)}</dd>
          </div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between gap-4 border-b border-line py-2.5">
            <dt className="t-small">Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
            <dd className="t-small">−{formatINR(order.discount)}</dd>
          </div>
        )}
        {order.tax > 0 && (
          <div className="flex justify-between gap-4 border-b border-line py-2.5 text-muted">
            <dt className="t-small">GST included</dt>
            <dd className="t-small">{formatINR(order.tax)}</dd>
          </div>
        )}
        <div className="flex items-end justify-between gap-4 pt-4">
          <dt className="t-label">{TOTAL_LABEL[kind]}</dt>
          <dd className={clsx("font-display text-[2.75rem] leading-[0.85]", kind === "failed" && "text-muted")}>{formatINR(order.amount)}</dd>
        </div>
      </dl>
      <p className="t-caption mt-5">{(audience === "admin" ? RECEIPT_NOTE_ADMIN : RECEIPT_NOTE)[kind]}</p>
    </section>
  );
}
