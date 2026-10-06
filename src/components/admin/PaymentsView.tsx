"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  BarChart,
  Button,
  Card,
  CardHeader,
  Donut,
  EmptyState,
  Icon,
  PageHeader,
  Segmented,
  StatGrid,
  StatTile,
  type IconName,
} from "@/components/app";
import { useDb } from "@/lib/demo/store";
import {
  formatINR,
  formatNumber,
  getCouponImpact,
  getOrders,
  getPayouts,
  getPlatformSeries,
  getPlatformStats,
  getSalesBreakdown,
  plural,
  timeAgo,
  type Coupon,
  type Payout,
} from "@/lib/mock";
import {
  COUPON_STATE_META,
  MoneyTabs,
  STRETCH,
  couponState,
  periodLabel,
  useBoxWidth,
  type CouponState,
} from "./shared";

/* =============================================================================
   /admin/payments: the money overview. Revenue trend, where a rupee goes,
   what sells, which coupons work, and the state of the payout run. Orders,
   coupons and payouts each have their own page behind the Money tabs.
   ============================================================================= */

type Range = "7d" | "30d" | "12m";
type PayoutStatus = Payout["status"];
/** the last closed month: the stat tiles and the split both describe it */
const SPLIT_PERIOD = "2026-09";

export function PaymentsView() {
  const db = useDb();
  const [range, setRange] = useState<Range>("12m");
  const stats = useMemo(() => getPlatformStats(db), [db]);
  const series = useMemo(() => getPlatformSeries(range), [range]);
  const monthly = range === "12m";
  // The last monthly point is October month-to-date: label it "so far" instead of dropping it.
  const revenue = series.revenue.map((p, i, arr) => ({
    label: monthly && i === arr.length - 1 ? `${p.label} so far` : p.label,
    value: p.value,
  }));
  const fullRevenue = monthly ? series.revenue.slice(0, -1) : series.revenue;
  const rangeTotal = fullRevenue.reduce((s, p) => s + p.value, 0);
  const rangeLabel =
    range === "7d"
      ? "last 7 days"
      : range === "30d"
        ? "last 30 days"
        : "last 12 full months";

  // September split, from the September payout run so it reconciles with Payouts:
  // tutors get their net, Tamada the platform fee, and GST is what's left of the sales.
  const sep = stats.monthlyRevenue;
  const sepRun = useMemo(
    () => getPayouts(undefined, db).filter((p) => p.period === SPLIT_PERIOD),
    [db],
  );
  const sepGross = sepRun.reduce((s, p) => s + p.gross, 0);
  const sepTutors = sepRun.reduce((s, p) => s + p.net, 0);
  const sepPlatform = sepRun.reduce((s, p) => s + p.platformFee, 0);
  const sepGst = Math.max(0, sep - sepGross);
  const shares = sepRun
    .filter((p) => p.gross > 0)
    .map((p) => Math.round((p.net / p.gross) * 100));
  const lo = shares.length ? Math.min(...shares) : 70;
  const hi = shares.length ? Math.max(...shares) : 70;
  const shareRange = lo === hi ? `${lo}%` : `${lo}–${hi}%`;

  const orders = useMemo(
    () => getOrders({ status: "all", pageSize: 100_000 }, db).items,
    [db],
  );
  // Category split, best sellers and coupon impact come from the full sales
  // ledger, so they sit on the same scale as the revenue tiles and chart.
  const sepSales = useMemo(
    () => getSalesBreakdown({ by: "category", range: "month" }, db),
    [db],
  );
  const byCategory = sepSales.rows.map((r) => ({
    label: r.label,
    value: r.revenue,
  }));
  const topCourses = useMemo(
    () =>
      getSalesBreakdown({ by: "course", range: "all", limit: 6 }, db).rows.map(
        (r) => ({
          id: r.id,
          title: r.label,
          sales: r.enrollments,
          revenue: r.revenue,
        }),
      ),
    [db],
  );

  const coupons = useMemo(
    () =>
      getCouponImpact(db)
        .map((c) => ({
          coupon: c.coupon,
          state: couponState(c.coupon),
          redemptions: c.redemptions,
          discount: c.discount,
        }))
        .sort(
          (a, b) =>
            Number(b.state === "live") - Number(a.state === "live") ||
            b.redemptions - a.redemptions,
        ),
    [db],
  );
  const liveCoupons = coupons.filter((c) => c.state === "live").length;

  const payouts = useMemo(() => getPayouts(undefined, db), [db]);
  const periods = useMemo(
    () => [...new Set(payouts.map((p) => p.period))].sort().reverse(),
    [payouts],
  );
  // The current month is still running, so the "run" to watch is the last closed month.
  const runPeriod = periods[1] ?? periods[0];
  const run = payouts.filter((p) => p.period === runPeriod);
  const runNet = run.reduce((s, p) => s + p.net, 0);
  const runBy = (s: PayoutStatus) => run.filter((p) => p.status === s);

  const recentRefunds = useMemo(
    () =>
      orders
        .filter((o) => o.status === "refunded" && o.refundedAt)
        .sort((a, b) => (b.refundedAt ?? "").localeCompare(a.refundedAt ?? ""))
        .slice(0, 3),
    [orders],
  );

  return (
    <div className="app-enter">
      <PageHeader

        eyebrow="Money"
        eyebrowTone="purple"
        title="Where the money goes."
        description="Revenue, the split between tax, tutors and Tamada, what sells, and which codes pull their weight."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Payments" },
        ]}
        actions={
          <>
            <Button
              href="/admin/orders"
              variant="accent"
              iconRight="arrow-right"
            >
              All orders
            </Button>
            <Button href="/admin/coupons?new=1" variant="secondary" icon="plus">
              New coupon
            </Button>
          </>
        }
      />
      <MoneyTabs current="overview" />

      <StatGrid className="mb-4 md:mb-6">
        <StatTile
          label="Revenue · Sep"
          value={formatINR(sep, { compact: true })}
          tone="mint"
          icon="wallet"
          delta={stats.revenueDelta}
          hint="vs August · GST incl. · sample analytics"
        />
        <StatTile
          label="Tamada keeps · Sep"
          value={formatINR(sepPlatform, { compact: true })}
          tone="lilac"
          icon="layers"
          hint={
            <>
              after GST and tutor shares{" "}
              <span className="whitespace-nowrap">({shareRange})</span>
            </>
          }
        />
        <StatTile
          label="Refunds to check"
          value={stats.refundRequests}
          tone={stats.refundRequests ? "blush" : "white"}
          icon="refresh"
          hint={
            stats.refundRequests ? "Learners waiting on you" : "Nobody waiting"
          }
          href="/admin/orders?status=refund_requests"
        />
        <StatTile
          label="Live coupons"
          value={liveCoupons}
          tone="sun"
          icon="ticket"
          hint={`${plural(coupons.length, "code")} in total`}
          href="/admin/coupons"
        />
      </StatGrid>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        <Card
          as="section"
          className="xl:col-span-2"
          aria-labelledby="rev-title"
        >
          <CardHeader
            id="rev-title"
            title="Revenue"
            description={`${formatINR(rangeTotal, { compact: true })} over the ${rangeLabel}.${monthly ? ` October so far: ${formatINR(stats.monthToDateRevenue, { compact: true })}.` : ""}`}
            action={
              <Segmented
                label="Revenue range"
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "7d", label: "7 days" },
                  { value: "30d", label: "30 days" },
                  { value: "12m", label: "12 months" },
                ]}
              />
            }
          />
          <BarChart
            data={revenue}
            tone="green"
            highlight={monthly ? revenue.length - 2 : revenue.length - 1}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel={`Revenue, ${rangeLabel}`}
            height={300}
          />
        </Card>

        <Card as="section" aria-labelledby="split-title">
          <CardHeader
            id="split-title"
            title="Where September went"
            description={`${formatINR(sep, { compact: true })} in sales, split three ways.`}
          />
          <Donut
            data={[
              { label: "Tutors", value: sepTutors, tone: "green" },
              { label: "Tamada", value: sepPlatform, tone: "purple" },
              { label: "GST", value: sepGst, tone: "sun" },
            ]}
            centerLabel="sales"
            centerValue={formatINR(sep, { compact: true })}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="September revenue split between tutors, Tamada and GST"
          />
          <p className="mt-4 t-small text-ink/60">
            Prices include 18% GST. Each tutor gets their share ({shareRange}) of
            what&apos;s left, paid by the 10th. Matches the September payout
            run.{" "}
            <Link
              href="/admin/payouts"
              className="font-bold text-ink underline-offset-2 hf:underline"
            >
              See payouts
            </Link>
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 lg:grid-cols-2">
        <Card as="section" aria-labelledby="cat-title">
          <CardHeader
            id="cat-title"
            title="What sells, by category"
            description={`${sepSales.label}: ${formatINR(sepSales.total.revenue, { compact: true })} from ${plural(sepSales.total.enrollments, "sale")}, the same sales as the tiles above.`}
          />
          {byCategory.length ? (
            <BarChart
              data={byCategory}
              layout="horizontal"
              tone="blue"
              format={(n) => formatINR(n, { compact: true })}
              ariaLabel={`Revenue by category, ${sepSales.label}`}
            />
          ) : (
            <EmptyState
              compact
              art="buddy"
              title="No sales yet."
              body="Sales show up here by category."
            />
          )}
        </Card>

        <Card as="section" aria-labelledby="best-title">
          <CardHeader
            id="best-title"
            title="Best sellers"
            description="All time, by revenue (GST incl.)."
            action={
              <Button
                href="/admin/courses?tab=all"
                size="sm"
                variant="ghost"
                iconRight="arrow-right"
              >
                Courses
              </Button>
            }
          />
          {topCourses.length ? (
            <ol className="space-y-3.5">
              {topCourses.map((c, i) => (
                <li key={c.id} className="tap relative flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center font-display text-[22px] leading-none font-black text-ink/35">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/admin/courses/${c.id}`}
                        className={clsx("truncate text-[15px] font-bold underline-offset-2 hf:underline", STRETCH)}
                      >
                        {c.title}
                      </Link>
                      <span className="shrink-0 text-[14px] font-bold tabular-nums">
                        {formatINR(c.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
                        <div
                          className="h-full rounded-full bg-green"
                          style={{
                            width: `${(c.revenue / (topCourses[0]?.revenue || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-[5.75rem] shrink-0 text-right text-[12.5px] font-semibold whitespace-nowrap text-ink/55">
                        {plural(c.sales, "sale")}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              compact
              art="tami"
              title="Nothing sold yet."
              body="The first paid order lands here."
            />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-5">
        <Card
          as="section"
          padding="none"
          className="overflow-hidden xl:col-span-3"
          aria-labelledby="codes-title"
        >
          <div className="p-5 pb-0 md:p-6 md:pb-0">
            <CardHeader
              id="codes-title"
              title="Coupons at work"
              description="Live codes first. Discount given is estimated from every redemption, all time."
              action={
                <Button
                  href="/admin/coupons"
                  size="sm"
                  variant="ghost"
                  iconRight="arrow-right"
                >
                  Manage
                </Button>
              }
            />
          </div>
          {coupons.length ? (
            <CouponPerformance rows={coupons} />
          ) : (
            <EmptyState
              compact
              art="buddy"
              title="No coupons yet."
              body="Create one for the next festival sale."
              action={
                <Button href="/admin/coupons?new=1" size="sm" icon="plus">
                  New coupon
                </Button>
              }
            />
          )}
        </Card>

        <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 md:gap-6 xl:col-span-2 xl:grid-cols-1">
          <Card as="section" aria-labelledby="run-title">
            <CardHeader
              id="run-title"
              title="Payout run"
              description={
                runPeriod
                  ? `${periodLabel(runPeriod)} · ${formatINR(runNet, { compact: true })} to ${plural(run.length, "tutor")}`
                  : "No payouts yet."
              }
              action={
                <Button
                  href="/admin/payouts"
                  size="sm"
                  variant="ghost"
                  iconRight="arrow-right"
                >
                  Payouts
                </Button>
              }
            />
            <ul className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    s: "processing",
                    label: "Processing",
                    icon: "clock",
                    tone: "bg-butter",
                  },
                  {
                    s: "paid",
                    label: "Paid",
                    icon: "check-circle",
                    tone: "bg-mint",
                  },
                  {
                    s: "on_hold",
                    label: "On hold",
                    icon: "lock",
                    tone: "bg-[#ffe1d4]",
                  },
                  {
                    s: "scheduled",
                    label: "Scheduled",
                    icon: "calendar",
                    tone: "bg-cyan",
                  },
                ] as {
                  s: PayoutStatus;
                  label: string;
                  icon: IconName;
                  tone: string;
                }[]
              ).map((x) => {
                const list = runBy(x.s);
                return (
                  <li
                    key={x.s}
                    className={clsx(
                      "min-w-0 rounded-tag px-3 py-2.5",
                      list.length ? x.tone : "bg-cream text-ink/50",
                    )}
                  >
                    <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-bold">
                      <Icon name={x.icon} className="size-3.5 shrink-0" />
                      <span className="truncate">{x.label}</span>
                    </p>
                    <p className="mt-1 font-display text-[24px] leading-none font-black">
                      {list.length}
                    </p>
                    <p className="mt-1 truncate text-[12px] font-semibold opacity-70">
                      {list.length
                        ? formatINR(
                            list.reduce((s, p) => s + p.net, 0),
                            { compact: true },
                          )
                        : "none"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card as="section" aria-labelledby="refunds-title">
            <CardHeader
              id="refunds-title"
              as="h3"
              title="Latest refunds"
              action={
                <Button
                  href="/admin/orders?status=refunded"
                  size="sm"
                  variant="ghost"
                  iconRight="arrow-right"
                >
                  All
                </Button>
              }
            />
            {recentRefunds.length ? (
              <ul className="divide-y divide-ink/[0.07]">
                {recentRefunds.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold">
                        {o.user?.name ?? "A learner"}
                      </p>
                      <p className="truncate text-[13px] font-medium text-ink/55">
                        {o.number} · {o.refundedAt ? timeAgo(o.refundedAt) : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-bold tabular-nums">
                      −{formatINR(o.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small text-ink/60">
                No refunds yet. Happy learners.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- coupons at work */
type CouponRow = {
  coupon: Coupon;
  state: CouponState;
  redemptions: number;
  discount: number;
};

/**
 * Coupon performance. A four-column table when its card is wide enough; below
 * 560px each code becomes a two-line row, so no number is ever cut at the edge.
 */
function CouponPerformance({ rows }: { rows: CouponRow[] }) {
  const [ref, width] = useBoxWidth();
  const stacked = width != null && width < 560;
  const totalUsed = rows.reduce((s, c) => s + c.redemptions, 0);
  const totalGiven = rows.reduce((s, c) => s + c.discount, 0);
  const off = (c: Coupon) =>
    c.kind === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`;
  const badge = (state: CouponState) => (
    <Badge tone={COUPON_STATE_META[state].tone} dot size="sm">
      {COUPON_STATE_META[state].label}
    </Badge>
  );
  const chip = (c: Coupon) => (
    <span className="rounded-md bg-cream px-2 py-0.5 font-mono text-[13.5px] font-bold tracking-wide">
      {c.code}
    </span>
  );

  return (
    <div ref={ref}>
      {stacked ? (
        <>
          <ul
            className="divide-y divide-ink/[0.07] border-t border-ink/[0.07]"
            aria-label="Coupon performance"
          >
            {rows.map(({ coupon: c, state, discount, redemptions }) => (
              <li key={c.id} className="px-5 py-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {chip(c)}
                  <span className="text-[13px] font-semibold text-ink/55">
                    {off(c)}
                  </span>
                  <span className="ml-auto">{badge(state)}</span>
                </p>
                <p className="mt-1.5 text-[13.5px] text-ink/70 tabular-nums">
                  <span className="font-bold text-ink">
                    {formatNumber(redemptions)}
                  </span>{" "}
                  / {formatNumber(c.maxRedemptions)} used ·{" "}
                  {discount ? (
                    <>
                      <span className="font-bold text-ink">
                        {formatINR(discount)}
                      </span>{" "}
                      given
                    </>
                  ) : (
                    "no discount given yet"
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-ink/[0.07] bg-cream/60 px-5 py-3 text-[13.5px] font-bold tabular-nums">
            <span>Total</span>
            <span>
              {formatNumber(totalUsed)} used · {formatINR(totalGiven)} given
            </span>
          </p>
        </>
      ) : (
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full text-left text-[14px]">
            <caption className="sr-only">Coupon performance</caption>
            <thead>
              <tr className="border-y border-ink/[0.07] bg-cream/60 text-[12px] font-bold tracking-wide text-ink/55 uppercase">
                <th scope="col" className="px-5 py-2.5 md:pl-6">
                  Code
                </th>
                <th scope="col" className="px-3 py-2.5">
                  State
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Used
                </th>
                <th scope="col" className="px-5 py-2.5 text-right md:pr-6">
                  Discount given
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.07]">
              {rows.map(({ coupon: c, state, discount, redemptions }) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 whitespace-nowrap md:pl-6">
                    {chip(c)}
                    <span className="ml-2 text-[13px] font-semibold text-ink/55">
                      {off(c)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{badge(state)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                    <span className="font-bold">
                      {formatNumber(redemptions)}
                    </span>
                    <span className="text-ink/45">
                      {" "}
                      / {formatNumber(c.maxRedemptions)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold whitespace-nowrap tabular-nums md:pr-6">
                    {discount ? (
                      formatINR(discount)
                    ) : (
                      <span className="font-medium text-ink/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/[0.07] bg-cream/60 text-[13.5px] font-bold">
                <th
                  scope="row"
                  colSpan={2}
                  className="px-5 py-3 text-left md:pl-6"
                >
                  Total
                </th>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(totalUsed)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums md:pr-6">
                  {formatINR(totalGiven)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
