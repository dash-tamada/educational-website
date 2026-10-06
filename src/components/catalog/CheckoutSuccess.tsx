"use client";

import Image from "next/image";
import clsx from "clsx";
import { Button, Icon, Skeleton, StatusPill } from "@/components/app";
import { ArrowButton, Eyebrow, HighlightBox, Sparkle } from "@/components/decor/Bits";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { Mascot } from "@/components/decor/Mascot";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { roleHome } from "@/lib/demo/session";
import { toneBg } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import { formatDate, formatINR, getCourseProgress, getFirstFreeItem, getTutor, getOrder, getUser, isEnrolled, type OrderRow } from "@/lib/mock";
import { firstName } from "@/lib/mock/extra/catalog";
import { LoginPrompt, StateCard } from "./CheckoutGate";

/**
 * /checkout/success?order=<id>: reads the order from the demo store.
 * Only the buyer (or an admin) sees the receipt; everyone else gets a gate.
 */
export function CheckoutSuccess({ orderId }: { orderId: string | null }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const order = orderId ? getOrder(orderId, db) : null;
  const next = `/checkout/success${orderId ? `?order=${encodeURIComponent(orderId)}` : ""}`;

  if (!session) {
    return (
      <Narrow>
        <LoginPrompt
          as="h1"
          next={next}
          title="Log in to see your order."
          body="Receipts live inside the account that paid. In this demo, Priya's student account is one click away."
        />
      </Narrow>
    );
  }

  if (!order && !hydrated) {
    return (
      <div className="container-x pb-section" aria-busy="true" aria-label="Loading your order">
        <Skeleton className="h-[360px] rounded-panel" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-card-lg" />
          <Skeleton className="h-64 rounded-card-lg" />
        </div>
      </div>
    );
  }

  const ordersHref = session.role === "student" ? "/dashboard/orders" : roleHome(session.role);
  const ordersLabel = session.role === "student" ? "My orders" : "Go to my dashboard";

  if (!order || !order.course) {
    return (
      <Narrow>
        <StateCard
          as="h1"
          title="We couldn't find that order."
          body={
            orderId
              ? "The link may be from another browser (demo orders live in this browser only), or the demo data was reset."
              : "This page needs an order link. You land here right after paying for a course."
          }
          action={
            <>
              <Button href="/courses">Browse courses</Button>
              <Button href={ordersHref} variant="secondary">
                {ordersLabel}
              </Button>
            </>
          }
        />
      </Narrow>
    );
  }

  const mine = session.userId === order.userId;
  if (!mine && session.role !== "admin") {
    const me = getUser(session.userId, db);
    return (
      <Narrow>
        <StateCard
          as="h1"
          art="buddy"
          tone="cyan"
          title="This order belongs to another account."
          body={`You're signed in as ${me?.name ?? "someone else"}. Receipts are only shown to the person who paid. Switch accounts to see it, or head to your own orders.`}
          action={
            <>
              <Button href="/courses">Browse courses</Button>
              <Button href={ordersHref} variant="secondary">
                {ordersLabel}
              </Button>
            </>
          }
        />
      </Narrow>
    );
  }

  return mine ? <BuyerView order={order} userId={session.userId} /> : <AdminView order={order} />;
}

function Narrow({ children }: { children: React.ReactNode }) {
  return <div className="container-x pb-section">{<div className="mx-auto max-w-[760px]">{children}</div>}</div>;
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

const HERO_BG: Record<OrderKind, string> = {
  paid: "bg-sun",
  grant: "bg-sun",
  refunded: "bg-cyan",
  failed: "bg-blush",
  pending: "bg-butter",
};

/* ----------------------------------------------------------------------------- buyer */
function BuyerView({ order, userId }: { order: OrderRow; userId: string }) {
  const db = useDb();
  const course = order.course!;
  const tutor = getTutor(course.tutorId, db);
  const kind = orderKind(order);
  const unlocked = (kind === "paid" || kind === "grant") && isEnrolled(userId, course.id, db);
  // only ever the viewer's own progress (this is the buyer)
  const progress = getCourseProgress(userId, course.id, db);
  const free = getFirstFreeItem(course.id, db);
  const start = progress.resumeItemId ?? free?.id;
  const learnHref = `/learn/${course.slug}${start ? `/${start}` : ""}`;
  const freeHref = `/learn/${course.slug}${free ? `/${free.id}` : ""}`;
  const first = firstName(tutor?.name);
  const startLabel = progress.percent > 0 ? "Continue learning" : "Start learning";

  const hero = (() => {
    switch (kind) {
      case "refunded":
        return {
          eyebrow: { tone: "blue" as const, icon: "refresh", text: "Order refunded" },
          title: (
            <>
              All <HighlightBox tone="hotpink">sorted.</HighlightBox>
            </>
          ),
          body: `This order was refunded${order.refundedAt ? ` on ${formatDate(order.refundedAt, "medium")}` : ""}, so ${course.title} is locked again. The first video is still free whenever you want it.`,
          actions: (
            <>
              <ArrowButton href={`/courses/${course.slug}`} variant="ink">
                Back to the course
              </ArrowButton>
              <Button href="/dashboard/orders" variant="secondary" size="lg">
                My orders
              </Button>
            </>
          ),
        };
      case "failed":
        return {
          eyebrow: { tone: "flame" as const, icon: "alert", text: "Payment didn't go through" },
          title: (
            <>
              Not this <HighlightBox tone="sun">time.</HighlightBox>
            </>
          ),
          body: `No money moved and nothing was charged. ${course.title} is still locked, but you can try again in a few seconds, and the first video stays free either way.`,
          actions: (
            <>
              <ArrowButton href={`/checkout/${course.slug}`} variant="ink">
                Try again
              </ArrowButton>
              {free && (
                <Button href={freeHref} variant="secondary" size="lg" icon="play">
                  Watch the free video
                </Button>
              )}
            </>
          ),
        };
      case "pending":
        return {
          eyebrow: { tone: "blue" as const, icon: "clock", text: "Waiting on the bank" },
          title: (
            <>
              Almost <HighlightBox tone="hotpink">there.</HighlightBox>
            </>
          ),
          body: `Your bank hasn't confirmed this payment yet. Most clear in a few minutes. ${course.title} unlocks the moment it does, and if it fails, no money moves.`,
          actions: (
            <>
              <ArrowButton href="/dashboard/orders" variant="ink">
                Check my orders
              </ArrowButton>
              {free && (
                <Button href={freeHref} variant="secondary" size="lg" icon="play">
                  Watch the free video
                </Button>
              )}
            </>
          ),
        };
      case "grant":
        return {
          eyebrow: { tone: "blue" as const, icon: "sparkles", text: "A gift from the Tamada team" },
          title: (
            <>
              It&apos;s <HighlightBox tone="hotpink">yours.</HighlightBox>
            </>
          ),
          body: `An admin gave you full access to ${course.title}. No payment, every lesson and tiny test, yours for life.`,
          actions: (
            <>
              <ArrowButton href={unlocked ? learnHref : `/courses/${course.slug}`} variant="ink" icon={unlocked ? "play" : undefined}>
                {unlocked ? startLabel : "Course page"}
              </ArrowButton>
              <Button href="/dashboard" variant="secondary" size="lg">
                Go to my dashboard
              </Button>
            </>
          ),
        };
      default:
        return {
          eyebrow: { tone: "blue" as const, icon: "check", text: "Order confirmed" },
          title: (
            <>
              You&apos;re <HighlightBox tone="hotpink">in.</HighlightBox>
            </>
          ),
          body: `${course.title} is unlocked. Every lesson, every tiny test, yours for life. Time to press play.`,
          actions: (
            <>
              <ArrowButton href={unlocked ? learnHref : `/courses/${course.slug}`} variant="ink" icon={unlocked ? "play" : undefined}>
                {unlocked ? startLabel : "Course page"}
              </ArrowButton>
              <Button href="/dashboard" variant="secondary" size="lg">
                Go to my dashboard
              </Button>
            </>
          ),
        };
    }
  })();

  const strip =
    kind === "refunded"
      ? "Changed your mind again? The course is a click away."
      : kind === "failed"
        ? "Card or UPI acting up? Pick another method on the checkout page. It's all demo money anyway."
        : kind === "pending"
          ? "Still pending after an hour? It usually means the bank dropped it. You can safely try again."
          : `Stuck on a lesson? Ask under the video and ${first} replies.`;

  return (
    <>
      <section aria-labelledby="success-title" className={clsx("panel py-12 md:py-16 lg:py-20", HERO_BG[kind])}>
        <Sparkle fill="#ff008c" className="pointer-events-none absolute top-10 left-[8%] hidden size-8 md:block" />
        <Sparkle fill="#2668fd" className="pointer-events-none absolute right-[12%] bottom-12 size-10" />
        <Sparkle fill="#ffffff" className="pointer-events-none absolute top-16 right-[30%] hidden size-6 md:block" />
        <div className="container-x relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="app-enter">
            <Eyebrow tone={hero.eyebrow.tone}>
              <Icon name={hero.eyebrow.icon} className="size-3.5" strokeWidth={2.8} />
              {hero.eyebrow.text}
            </Eyebrow>
            <h1 id="success-title" className="t-display-l mt-eyebrow">
              {hero.title}
            </h1>
            <p className="t-body-l mt-sub max-w-[32rem]">{hero.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">{hero.actions}</div>
          </div>
          <div className="relative hidden items-end gap-2 md:flex" aria-hidden>
            {kind === "failed" || kind === "pending" ? (
              <>
                <BlockBuddy body="#2668fd" head="#ffcf3f" className="w-16" />
                <Mascot title="" className="w-32" style={{ transform: "rotate(-4deg)" }} />
              </>
            ) : (
              <>
                <BlockBuddy body="#2668fd" head="#ff008c" wave className="w-16" />
                <Mascot title="" className="w-36" style={{ transform: "rotate(6deg)" }} />
                <BlockBuddy body="#00b351" head="#ffcf3f" hat="#ff008c" wave className="w-14" />
              </>
            )}
          </div>
        </div>
      </section>

      <div className="container-x grid gap-4 pt-8 pb-section md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
        <section aria-labelledby="next-title" className="rounded-card-lg bg-white p-5 shadow-soft md:p-7">
          <CourseLine order={order} tutorName={tutor?.name} id="next-title" />
          {unlocked && (
            <ol className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { icon: "play-circle", tone: "bg-[#dfe8ff] text-blue", t: "Watch at your pace", b: "Short lessons. Progress saves itself." },
                { icon: "quiz", tone: "bg-butter", t: "Pass the tiny tests", b: "They unlock the next module." },
                { icon: "award", tone: "bg-mint text-forest", t: "Collect your certificate", b: "Finish everything, get a verifiable code." },
              ].map((s, i) => (
                <li key={s.t} className="flex items-start gap-3 rounded-card bg-cream p-4 sm:block lg:flex xl:block">
                  <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full", s.tone)} aria-hidden>
                    <Icon name={s.icon} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="t-app-h3 sm:mt-3 lg:mt-0 xl:mt-3">
                      {i + 1}. {s.t}
                    </p>
                    <p className="mt-1 text-[13.5px] text-ink/70">{s.b}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {(kind === "failed" || kind === "pending") && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              <li className="flex items-start gap-3 rounded-card bg-cream p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-forest" aria-hidden>
                  <Icon name="shield" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="t-app-h3">Nothing was charged</p>
                  <p className="mt-1 text-[13.5px] text-ink/70">{kind === "failed" ? "A failed payment never takes money." : "If the bank drops it, the hold is released."}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-card bg-cream p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dfe8ff] text-blue" aria-hidden>
                  <Icon name="play-circle" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="t-app-h3">The first video is free</p>
                  <p className="mt-1 text-[13.5px] text-ink/70">Watch it while you wait. No payment needed.</p>
                </div>
              </li>
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-butter px-4 py-3.5">
            <p className="min-w-0 flex-1 text-[14px] font-semibold">{strip}</p>
            <Button href={kind === "failed" ? `/checkout/${course.slug}` : `/courses/${course.slug}`} variant="secondary" size="sm">
              {kind === "failed" ? "Back to checkout" : "Course page"}
            </Button>
          </div>
        </section>

        <Receipt order={order} footer={<Button href="/dashboard/orders" variant="ghost" fullWidth icon="receipt" className="mt-3">All my orders</Button>} />
      </div>
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
      return `${who} bought ${what} on ${when}. Learners see a celebration here; you see the paperwork.`;
  }
}

function AdminView({ order }: { order: OrderRow }) {
  const db = useDb();
  const course = order.course!;
  const tutor = getTutor(course.tutorId, db);
  const kind = orderKind(order);
  return (
    <div className="container-x pb-section">
      <div className="mb-8">
        <Eyebrow tone="purple">
          <Icon name="shield" className="size-3.5" strokeWidth={2.6} />
          Admin view
        </Eyebrow>
        <h1 className="t-display-m mt-eyebrow">Order {order.number}</h1>
        <p className="t-body mt-3 max-w-[40rem] text-ink/70">{adminSentence(order, kind)}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button href={`/admin/orders?q=${encodeURIComponent(order.number)}`} icon="shield">
            Open in admin
          </Button>
          <Button href={`/courses/${course.slug}`} variant="secondary">
            Course page
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
        <section aria-labelledby="admin-course" className="rounded-card-lg bg-white p-5 shadow-soft md:p-7">
          <CourseLine order={order} tutorName={tutor?.name} id="admin-course" />
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              [kind === "grant" ? "Granted to" : "Buyer", order.user?.name ?? "Unknown"],
              ["Email", order.user?.email ?? "Unknown"],
              ["City", order.user?.city ?? "Unknown"],
              ["Provider", PROVIDER_LABEL[order.provider] ?? order.provider],
            ].map(([k, v]) => (
              <div key={k} className="rounded-card bg-cream px-4 py-3">
                <dt className="text-[12.5px] font-bold text-ink/60">{k}</dt>
                <dd className="mt-0.5 truncate text-[15px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <Receipt order={order} audience="admin" />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- shared bits */
function CourseLine({ order, tutorName, id }: { order: OrderRow; tutorName?: string; id: string }) {
  const course = order.course!;
  return (
    <div className="flex gap-4">
      <div className={clsx("relative size-24 shrink-0 overflow-hidden rounded-img", toneBg[course.tone])}>
        <Image src={cropSrc(course.thumbnail, 1)} alt="" fill sizes="96px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <h2 id={id} className="t-app-h2">
          {course.title}
        </h2>
        {tutorName && <p className="mt-1 text-[14px] font-semibold text-ink/65">with {tutorName}</p>}
      </div>
    </div>
  );
}

const TOTAL_LABEL: Record<OrderKind, string> = {
  paid: "Total paid",
  grant: "Granted",
  refunded: "Refunded",
  failed: "Amount (not charged)",
  pending: "Amount due",
};

/** Same notes from the admin's side: it's the learner's inbox and account, not theirs. */
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

function Receipt({ order, footer, audience = "buyer" }: { order: OrderRow; footer?: React.ReactNode; audience?: "buyer" | "admin" }) {
  const kind = orderKind(order);
  const rows: [string, string][] = [
    ["Order number", order.number],
    ["Date", formatDate(order.createdAt, "datetime")],
    kind === "grant"
      ? ["Access", "Granted by an admin"]
      : [kind === "failed" ? "Tried with" : kind === "pending" ? "Paying with" : "Paid with", `${order.method} (demo)`],
    ["Reference", order.providerRef],
  ];
  return (
    <section aria-labelledby="receipt-title" className="rounded-card-lg bg-white p-5 shadow-soft md:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 id="receipt-title" className="t-app-h2">
          {kind === "failed" || kind === "pending" ? "Payment details" : "Receipt"}
        </h2>
        <StatusPill status={kind === "grant" ? "grant" : order.status} />
      </div>
      <dl className="mt-4 space-y-2.5 text-[14px] font-semibold">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink/60">{k}</dt>
            <dd className="min-w-0 truncate text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-4 space-y-2.5 border-t border-ink/[0.07] pt-4 text-[14px] font-semibold">
        <div className="flex justify-between gap-4">
          <dt>Course price</dt>
          <dd>{kind === "grant" ? formatINR(order.course?.price ?? order.subtotal) : formatINR(order.subtotal)}</dd>
        </div>
        {kind === "grant" && (
          <div className="flex justify-between gap-4 text-forest">
            <dt>Admin grant</dt>
            <dd>−{formatINR(order.course?.price ?? order.subtotal)}</dd>
          </div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between gap-4 text-forest">
            <dt>Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
            <dd>−{formatINR(order.discount)}</dd>
          </div>
        )}
        {order.tax > 0 && (
          <div className="flex justify-between gap-4 text-ink/60">
            <dt>GST included</dt>
            <dd>{formatINR(order.tax)}</dd>
          </div>
        )}
        <div className="flex items-end justify-between gap-4 border-t border-ink/[0.07] pt-3">
          <dt className="text-[16px] font-bold">{TOTAL_LABEL[kind]}</dt>
          <dd className={clsx("font-display text-[2rem] leading-none font-black", kind === "failed" && "text-ink/45")}>{formatINR(order.amount)}</dd>
        </div>
      </dl>
      <p className={clsx("mt-4 rounded-tag px-3 py-2.5 text-[13px] font-semibold", kind === "failed" ? "bg-blush text-[#8a0a4c]" : "bg-butter text-[#6b5400]")}>{(audience === "admin" ? RECEIPT_NOTE_ADMIN : RECEIPT_NOTE)[kind]}</p>
      {footer}
    </section>
  );
}
