"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  BarChart,
  Button,
  Card,
  Donut,
  EmptyState,
  PageHeader,
  Section,
  Segmented,
  StatGrid,
  StatTile,
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
import { Idx, MonoMeta } from "@/components/tutor/editorial";
import { CodeSlate, PanelLabel, WideSection } from "./ledgerKit";
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
   /admin/payments (design system v2): the money overview as a Mobius ledger.
   KPIs, then numbered sections: revenue trend, where a rupee goes, what sells,
   best sellers (awards table), coupons at work, and the payout run (the page's
   one ink panel). Orders, coupons and payouts each have their own page behind
   the Money tabs.
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
        eyebrow="Control room · Money"
        title={
          <>
            Where the <em>money</em> goes.
          </>
        }
        description="Revenue, the split between tax, tutors and Tamada, what sells, and which codes pull their weight."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Payments" },
        ]}
        actions={
          <>
            <Button href="/admin/coupons?new=1" variant="outline" icon="plus">
              New coupon
            </Button>
            <Button href="/admin/orders" variant="red" iconRight="arrow-right">
              All orders
            </Button>
          </>
        }
      />
      <MoneyTabs current="overview" />

      <StatGrid>
        <StatTile
          index="01"
          label="Revenue · Sep"
          value={formatINR(sep, { compact: true })}
          delta={stats.revenueDelta}
          hint="vs August · GST incl. · sample analytics"
        />
        <StatTile
          index="02"
          label="Tamada keeps · Sep"
          value={formatINR(sepPlatform, { compact: true })}
          hint={
            <>
              after GST and tutor shares{" "}
              <span className="whitespace-nowrap">({shareRange})</span>
            </>
          }
        />
        <StatTile
          index="03"
          label="Refunds to check"
          value={stats.refundRequests}
          hint={
            stats.refundRequests ? "Learners waiting on you" : "Nobody waiting"
          }
          href="/admin/orders?status=refund_requests"
        />
        <StatTile
          index="04"
          label="Live coupons"
          value={liveCoupons}
          hint={`${plural(coupons.length, "code")} in total`}
          href="/admin/coupons"
        />
      </StatGrid>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <Section
          index="01"
          label="Revenue"
          note={`${formatINR(rangeTotal, { compact: true })} over the ${rangeLabel}.${monthly ? ` October so far: ${formatINR(stats.monthToDateRevenue, { compact: true })}.` : ""}`}
          title="Sales, GST included"
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
        >
          <BarChart
            data={revenue}
            tone="ink"
            highlight={monthly ? revenue.length - 2 : revenue.length - 1}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel={`Revenue, ${rangeLabel}`}
            height={300}
          />
        </Section>

        <Section
          index="02"
          label="The split"
          note={
            <>
              Prices include 18% GST. Each tutor gets their share ({shareRange})
              of what&apos;s left, paid by the 10th. Matches the September
              payout run.
            </>
          }
          title="Where September went"
          action={
            <Button href="/admin/payouts" variant="arrow" size="sm">
              See payouts
            </Button>
          }
        >
          <Donut
            data={[
              { label: "Tutors", value: sepTutors, tone: "ink" },
              { label: "Tamada", value: sepPlatform, tone: "hotpink" },
              { label: "GST", value: sepGst, tone: "ink" },
            ]}
            centerLabel="sales"
            centerValue={formatINR(sep, { compact: true })}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="September revenue split between tutors, Tamada and GST"
            className="gap-8 md:gap-12"
          />
        </Section>

        <Section
          index="03"
          label="Categories"
          note={`${sepSales.label}: ${formatINR(sepSales.total.revenue, { compact: true })} from ${plural(sepSales.total.enrollments, "sale")}, the same sales as the tiles above.`}
          title="What sells, by category"
        >
          {byCategory.length ? (
            <BarChart
              data={byCategory}
              layout="horizontal"
              tone="ink"
              format={(n) => formatINR(n, { compact: true })}
              ariaLabel={`Revenue by category, ${sepSales.label}`}
            />
          ) : (
            <EmptyState
              compact
              align="start"
              art="none"
              eyebrow="No sales"
              title="No sales yet."
              body="Sales show up here by category."
            />
          )}
        </Section>

        <WideSection
          index="04"
          label="Best sellers"
          note="All time, by revenue (GST incl.)."
          title="The top of the bill"
          action={
            <Button href="/admin/courses?tab=all" variant="arrow" size="sm">
              All courses
            </Button>
          }
        >
          {topCourses.length ? (
            <ol aria-label="Best sellers" className="border-t border-fg">
              <li
                aria-hidden
                className="hidden grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,14rem)_7rem_8rem] items-center gap-6 border-b border-line py-3 text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase md:grid"
              >
                <span>No.</span>
                <span>Course</span>
                <span>Share of the top</span>
                <span className="text-right">Sales</span>
                <span className="text-right">Revenue</span>
              </li>
              {topCourses.map((c, i) => (
                <li
                  key={c.id}
                  className="group relative grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 transition-colors hf:bg-cream-2/60 md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,14rem)_7rem_8rem] md:gap-6 md:py-5"
                >
                  <Idx n={i + 1} />
                  <Link
                    href={`/admin/courses/${c.id}`}
                    className={clsx(
                      "min-w-0 font-heading text-[16px] leading-snug font-semibold tracking-[-0.02em] underline-offset-[3px] hf:underline md:text-[18px]",
                      STRETCH,
                    )}
                  >
                    {c.title}
                  </Link>
                  <span className="font-heading text-[15px] font-semibold whitespace-nowrap tabular-nums md:hidden">
                    {formatINR(c.revenue, { compact: true })}
                  </span>
                  <span className="col-span-2 col-start-2 flex items-center gap-3 md:col-span-1 md:col-start-auto">
                    <span className="h-[3px] min-w-0 flex-1 bg-line">
                      <span
                        className={clsx("block h-full", i === 0 ? "bg-red" : "bg-fg")}
                        style={{
                          width: `${(c.revenue / (topCourses[0]?.revenue || 1)) * 100}%`,
                        }}
                      />
                    </span>
                    <MonoMeta as="span" className="md:hidden">
                      {plural(c.sales, "sale")}
                    </MonoMeta>
                  </span>
                  <span className="hidden text-right font-mono text-[13px] tabular-nums md:block">
                    {formatNumber(c.sales)}
                  </span>
                  <span className="hidden text-right font-heading text-[17px] font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums md:block">
                    {formatINR(c.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              compact
              align="start"
              art="none"
              eyebrow="Nothing sold"
              title="Nothing sold yet."
              body="The first paid order lands here."
            />
          )}
        </WideSection>

        <WideSection
          index="05"
          label="Coupons"
          note="Live codes first. Discount given is estimated from every redemption, all time."
          title="Coupons at work"
          action={
            <Button href="/admin/coupons" variant="arrow" size="sm">
              Manage coupons
            </Button>
          }
        >
          {coupons.length ? (
            <CouponPerformance rows={coupons} />
          ) : (
            <EmptyState
              compact
              align="start"
              art="none"
              eyebrow="No codes"
              title="No coupons yet."
              body="Create one for the next festival sale."
              action={
                <Button href="/admin/coupons?new=1" size="sm" icon="plus">
                  New coupon
                </Button>
              }
            />
          )}
        </WideSection>

        <Section
          index="06"
          label="Payout run"
          note={
            runPeriod
              ? "The last closed month. The running month keeps adding up until it closes."
              : undefined
          }
          title={runPeriod ? periodLabel(runPeriod) : "No payouts yet"}
          action={
            <Button href="/admin/payouts" variant="arrow" size="sm">
              Payouts
            </Button>
          }
        >
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-12">
            <Card variant="ink" padding="lg" as="section" aria-label="Payout run">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-cream/70 uppercase">
                Net to {plural(run.length, "tutor")}
              </p>
              <p className="t-display-l mt-3 tabular-nums">
                {formatINR(runNet, { compact: true })}
              </p>
              <ul className="mt-8 grid grid-cols-2 border-t border-l border-white/[0.14]">
                {(
                  [
                    { s: "processing", label: "Processing" },
                    { s: "paid", label: "Paid" },
                    { s: "on_hold", label: "On hold" },
                    { s: "scheduled", label: "Scheduled" },
                  ] as { s: PayoutStatus; label: string }[]
                ).map((x) => {
                  const list = runBy(x.s);
                  return (
                    <li
                      key={x.s}
                      className="min-w-0 border-r border-b border-white/[0.14] p-3.5"
                    >
                      <p className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-cream/70 uppercase">
                        <span
                          aria-hidden
                          className={clsx(
                            "size-[6px] shrink-0",
                            x.s === "on_hold" && list.length
                              ? "bg-red-lite"
                              : list.length
                                ? "bg-cream"
                                : "ring-1 ring-cream/50 ring-inset",
                          )}
                        />
                        <span className="truncate">{x.label}</span>
                      </p>
                      <p className="mt-2.5 font-display text-[30px] leading-none tabular-nums">
                        {list.length}
                      </p>
                      <p className="mt-1.5 truncate font-mono text-[11px] tracking-[0.04em] text-cream/65">
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

            <section aria-labelledby="refunds-title" className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <PanelLabel as="h3" className="mb-0">
                  <span id="refunds-title">Latest refunds</span>
                </PanelLabel>
                <Link
                  href="/admin/orders?status=refunded"
                  className="text-[13px] font-medium underline-offset-[3px] hf:underline coarse:inline-flex coarse:min-h-11 coarse:items-center"
                >
                  All refunds
                </Link>
              </div>
              {recentRefunds.length ? (
                <ul className="mt-3 divide-y divide-line border-y border-line border-t-fg">
                  {recentRefunds.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                          {o.user?.name ?? "A learner"}
                        </p>
                        <MonoMeta className="truncate">
                          {o.number} · {o.refundedAt ? timeAgo(o.refundedAt) : ""}
                        </MonoMeta>
                      </div>
                      <span className="shrink-0 font-heading text-[15px] font-semibold tabular-nums">
                        −{formatINR(o.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-small mt-3 border-t border-fg pt-3 text-muted">
                  No refunds yet. Happy learners.
                </p>
              )}
            </section>
          </div>
        </Section>
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
 * Coupon performance, awards-table style. A four-column table when its box is wide
 * enough; below 560px each code becomes a two-line ruled row, so no number is ever cut.
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

  return (
    <div ref={ref}>
      {stacked ? (
        <>
          <ul
            className="divide-y divide-line border-t border-fg"
            aria-label="Coupon performance"
          >
            {rows.map(({ coupon: c, state, discount, redemptions }) => (
              <li key={c.id} className="py-3.5">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <CodeSlate code={c.code} />
                  <span className="text-[13px] text-muted">{off(c)}</span>
                  <span className="ml-auto">{badge(state)}</span>
                </p>
                <p className="mt-2 font-mono text-[12px] tracking-[0.02em] text-muted tabular-nums">
                  <span className="text-fg">{formatNumber(redemptions)}</span> /{" "}
                  {formatNumber(c.maxRedemptions)} used ·{" "}
                  {discount ? (
                    <>
                      <span className="text-fg">{formatINR(discount)}</span> given
                    </>
                  ) : (
                    "no discount given yet"
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-fg py-3 font-mono text-[12px] tracking-[0.04em] uppercase tabular-nums">
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
              <tr className="border-t border-b border-t-fg border-b-line text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
                <th scope="col" className="py-3 pr-3 font-semibold">
                  Code
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  State
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Used
                </th>
                <th scope="col" className="py-3 pl-3 text-right font-semibold">
                  Discount given
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ coupon: c, state, discount, redemptions }) => (
                <tr key={c.id}>
                  <td className="py-4 pr-3 whitespace-nowrap">
                    <CodeSlate code={c.code} />
                    <span className="ml-3 text-[13px] text-muted">{off(c)}</span>
                  </td>
                  <td className="px-3 py-4">{badge(state)}</td>
                  <td className="px-3 py-4 text-right font-mono text-[13px] whitespace-nowrap tabular-nums">
                    {formatNumber(redemptions)}
                    <span className="text-muted">
                      {" "}
                      / {formatNumber(c.maxRedemptions)}
                    </span>
                  </td>
                  <td className="py-4 pl-3 text-right font-heading text-[15px] font-semibold whitespace-nowrap tabular-nums">
                    {discount ? (
                      formatINR(discount)
                    ) : (
                      <span className="font-normal text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-fg font-mono text-[12px] tracking-[0.04em] uppercase">
                <th scope="row" colSpan={2} className="py-3.5 pr-3 text-left font-semibold">
                  Total
                </th>
                <td className="px-3 py-3.5 text-right tabular-nums">
                  {formatNumber(totalUsed)}
                </td>
                <td className="py-3.5 pl-3 text-right font-heading text-[15px] font-semibold tracking-normal normal-case tabular-nums">
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
