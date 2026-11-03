"use client";

import { useMemo } from "react";
import clsx from "clsx";
import {
  formatDate,
  formatINR,
  formatNumber,
  getOrders,
  getPayouts,
  type OrderRow,
  type Payout,
} from "@/lib/mock";
import { getPayoutAccount } from "@/lib/mock/extra/tutor";
import {
  Avatar,
  BarChart,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  Section,
  StatusPill,
  Tooltip,
  toast,
  useIsPhone,
} from "@/components/app";
import { WideSection } from "@/components/admin/ledgerKit";
import { Figure, MonoMeta, RuledList, RuledRow } from "./editorial";
import { copyText, useTutorContext } from "./shared";

/* =============================================================================
   Tutor earnings, design system v2: the next payout is the page's one ink moment
   (Anton amount, transfer progress, bank in mono, three running totals on the
   right), a ruled breakdown strip under it, then Mobius sections: earnings by month
   (ink bars, the last closed month red), the payout history and recent sales as
   awards tables, and how payouts work as numbered ruled rows. Sample data.
   ============================================================================= */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const periodLabel = (p: string, long = false, withYear = false) => {
  const [y, m] = p.split("-").map(Number);
  return long
    ? `${MONTHS[m - 1]} ${y}`
    : withYear
      ? `${MONTHS[m - 1]} ’${String(y).slice(2)}`
      : MONTHS[m - 1];
};
const DAY_OF_MONTH = 5; // MOCK_NOW = 5 Oct
const DAYS_IN_OCT = 31;
/** The open month only has 5 days of sales so far: scale the projected payout row to month-to-date. */
const soFar = (p: Payout): Payout =>
  p.status === "scheduled"
    ? {
        ...p,
        sales: Math.round((p.sales * DAY_OF_MONTH) / DAYS_IN_OCT),
        gross: Math.round((p.gross * DAY_OF_MONTH) / DAYS_IN_OCT),
        platformFee: Math.round((p.platformFee * DAY_OF_MONTH) / DAYS_IN_OCT),
        net: Math.round((p.net * DAY_OF_MONTH) / DAYS_IN_OCT),
      }
    : p;

const money =
  "font-heading font-semibold tracking-[-0.015em] whitespace-nowrap tabular-nums";

export function TutorEarnings() {
  const { userId, db, tutor, profile } = useTutorContext();
  // phones: 26 monthly rows are three screens; page them instead
  const phone = useIsPhone();
  const payouts = useMemo(
    () => getPayouts(userId, db).map(soFar),
    [userId, db],
  );
  const sales = useMemo(
    () =>
      getOrders({ tutorId: userId, status: "paid", pageSize: 200 }, db).items,
    [userId, db],
  );
  const share = tutor?.revenueShare ?? 0.7;
  const account = getPayoutAccount(
    userId,
    tutor?.name ?? profile?.name ?? "tutor",
  );

  const current = payouts.find((p) => p.status === "scheduled");
  const processing = payouts.find(
    (p) => p.status === "processing" || p.status === "on_hold",
  );
  const paid = payouts.filter((p) => p.status === "paid");
  const paid2026 = paid.filter((p) => p.period.startsWith("2026"));
  const paidThisYear = paid2026.reduce((s, p) => s + p.net, 0);
  const lifetime = payouts.reduce((s, p) => s + p.net, 0);
  const mtd = current?.net ?? 0;

  const header = (
    <PageHeader
      eyebrow="Tutor studio"
      title={
        <>
          Your <em>earnings</em>.
        </>
      }
      description={`You keep ${Math.round(share * 100)}% of every sale after GST. Payouts land on the ${account.payoutDay}th of each month for the month before.`}
      breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Earnings" }]}
      actions={
        payouts.length > 0 && (
          <Button
            variant="outline"
            icon="download"
            onClick={() => downloadCsv(payouts)}
          >
            Download statement
          </Button>
        )
      }
    />
  );

  if (payouts.length === 0)
    return (
      <div className="app-enter">
        {header}
        <div className="border-t border-fg">
          <EmptyState
            art="none"
            align="start"
            eyebrow="No payouts yet"
            title="No earnings yet."
            body="Your first payout shows up here the month after your first sale. Publishing a course is step one."
            action={
              <Button
                href="/tutor/courses"
                variant="outline"
                iconRight="arrow-right"
              >
                Go to your courses
              </Button>
            }
          />
        </div>
      </div>
    );

  // more than 12 months on the axis: add the year so "May" doesn't appear twice without context
  const withYear = payouts.length > 12;
  const chart = [...payouts].reverse().map((p) => ({
    label:
      p.status === "scheduled"
        ? `${periodLabel(p.period, false, withYear)} (so far)`
        : periodLabel(p.period, false, withYear),
    value: p.net,
  }));
  /** the payout the panel is about: the one in flight, else the month so far */
  const next = processing ?? current;
  const onHold = processing?.status === "on_hold";

  return (
    <div className="app-enter">
      {header}

      {/* ---------------------------------------------------------------- the payout panel */}
      <Card
        variant="ink"
        padding="none"
        as="section"
        aria-labelledby="next-payout-title"
        className="grid lg:grid-cols-12"
      >
        <div className="flex min-w-0 flex-col p-6 sm:p-8 lg:col-span-7 lg:p-10">
          <p
            id="next-payout-title"
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] font-semibold tracking-[0.16em] uppercase"
          >
            <span
              aria-hidden
              className="size-[6px] shrink-0 translate-y-[-1px] self-center bg-red"
            />
            <span>
              {onHold ? "On hold" : "Next payout"} ·{" "}
              {next ? periodLabel(next.period, true) : "October"}
            </span>
          </p>
          <p className="mt-6 t-display-l break-words sm:mt-8">
            {formatINR(processing?.net ?? mtd)}
          </p>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-snug text-cream/80">
            {processing
              ? onHold
                ? `${periodLabel(processing.period, true)} is on hold. Our team will email you about the next step.`
                : `${periodLabel(processing.period, true)} sales · expected by ${account.payoutDay} October.`
              : `October sales · expected by ${account.payoutDay} November.`}
          </p>
          <div className="mt-7">
            {/* the kit's dark track is for tinted panels; on ink it needs a light hairline */}
            <div
              role="progressbar"
              aria-label="Payout progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(
                processing ? 80 : (DAY_OF_MONTH / DAYS_IN_OCT) * 100,
              )}
              className="h-[3px] bg-white/15"
            >
              <div
                className="h-full bg-red"
                style={{
                  width: `${processing ? 80 : (DAY_OF_MONTH / DAYS_IN_OCT) * 100}%`,
                }}
              />
            </div>
            <div className="mt-2.5 flex justify-between font-mono text-[10.5px] tracking-[0.08em] text-ash uppercase">
              <span>Sales closed</span>
              <span>Bank transfer</span>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-white/10 pt-5 lg:mt-auto">
            <dl className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.06em] uppercase">
              <div className="flex gap-2">
                <dt className="text-ash">Paid to</dt>
                <dd className="[overflow-wrap:anywhere]">
                  {account.bank} ••{account.last4}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ash">Backup UPI</dt>
                <dd className="[overflow-wrap:anywhere] normal-case">
                  {account.upi}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ash">PAN</dt>
                <dd>{account.panMasked}</dd>
              </div>
            </dl>
            <Button
              href="/tutor/settings#payouts"
              variant="cream"
              size="sm"
              iconRight="arrow-right"
            >
              Payout details
            </Button>
          </div>
        </div>
        <dl className="grid min-w-0 border-t border-white/10 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1 lg:border-t-0 lg:border-l">
          {[
            {
              label: "October so far",
              value: formatINR(mtd, { compact: true }),
              hint: `Your share, ${DAY_OF_MONTH} days in`,
            },
            {
              label: "Paid out in 2026",
              value: formatINR(paidThisYear, { compact: true }),
              hint: `${paid2026.length} ${paid2026.length === 1 ? "payout" : "payouts"}`,
            },
            {
              label: "Lifetime earnings",
              value: formatINR(lifetime, { compact: true }),
              hint: `${formatNumber(payouts.reduce((s, p) => s + p.sales, 0))} sales`,
            },
          ].map((x, i) => (
            <div
              key={x.label}
              className={clsx(
                "flex min-w-0 items-start justify-between gap-4 p-5 sm:flex-col sm:p-6 lg:flex-row lg:items-center lg:p-7",
                i > 0 &&
                  "border-t border-white/10 sm:border-t-0 sm:border-l lg:border-t lg:border-l-0",
              )}
            >
              <dt className="flex items-baseline gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                <span className="font-mono text-[10.5px] font-medium tracking-[0.04em] text-red-lite">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {x.label}
              </dt>
              <dd className="text-right sm:text-left lg:text-right">
                <span className="block t-display-s">{x.value}</span>
                <span className="mt-1.5 block font-mono text-[10.5px] tracking-[0.06em] text-ash uppercase">
                  {x.hint}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* the ruled breakdown of that payout */}
      {next && (
        <div className="mt-8 md:mt-10">
          <MonoMeta>
            Breakdown · {periodLabel(next.period, true)}
            {next.status === "scheduled" && `, ${DAY_OF_MONTH} days in`}
          </MonoMeta>
          <div className="mt-3 grid grid-cols-2 border-y border-line border-t-fg md:grid-cols-4">
            <Figure
              className="py-5 pr-4"
              label="Sales"
              value={formatNumber(next.sales)}
            />
            <Figure
              className="border-l border-line py-5 pl-4 md:pl-6"
              label="Gross"
              value={formatINR(next.gross)}
            />
            <Figure
              className="border-t border-line py-5 pr-4 md:border-t-0 md:border-l md:pl-6"
              label="Platform fee"
              value={`−${formatINR(next.platformFee)}`}
            />
            <Figure
              className="border-t border-l border-line py-5 pl-4 md:border-t-0 md:pl-6"
              label="You get"
              value={formatINR(next.net)}
              strong
            />
          </div>
        </div>
      )}

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <Section
          index="01"
          label="Monthly"
          note="Your share after GST and the platform fee. The red bar is the last closed month."
          title="Earnings by month"
        >
          <BarChart
            data={chart}
            tone="ink"
            height={260}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="Your earnings per month"
            highlight={chart.length >= 2 ? chart.length - 2 : undefined}
          />
        </Section>

        <WideSection
          index="02"
          label="Payouts"
          note="One transfer per month. Copy a bank reference for your records."
          title="Payout history"
        >
          <DataTable<Payout>
            caption="Payouts"
            rows={payouts}
            getRowId={(p) => p.id}
            pageSize={phone ? 8 : 0}
            minWidth={340}
            columns={[
              {
                key: "period",
                header: "Month",
                mobile: "title",
                sortValue: (p) => p.period,
                cell: (p) => (
                  <span className="block whitespace-nowrap">
                    <span className="block font-semibold tracking-[-0.01em]">
                      {periodLabel(p.period, true)}
                    </span>
                    {p.status === "scheduled" && (
                      <MonoMeta as="span" className="block">
                        So far, {DAY_OF_MONTH} days in
                      </MonoMeta>
                    )}
                    {/* the "Paid on" column is hidden on phones: keep the date and bank reference under the month */}
                    {p.paidAt && (
                      <span className="flex items-center gap-0.5 font-mono text-[11px] tracking-[0.06em] text-muted uppercase sm:hidden">
                        Paid {formatDate(p.paidAt, "short")}
                        {p.reference && (
                          <CopyRef reference={p.reference} small />
                        )}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: "sales",
                header: "Sales",
                hideBelow: "sm",
                align: "right",
                sortValue: (p) => p.sales,
                cell: (p) => (
                  <span className="font-mono text-[13px] tabular-nums">
                    {formatNumber(p.sales)}
                  </span>
                ),
              },
              {
                key: "gross",
                header: "Gross",
                align: "right",
                // with the sidebar open (lg) the row only fits month, sales, net, status and paid on
                hideBelow: "xl",
                sortValue: (p) => p.gross,
                cell: (p) => (
                  <span className="font-mono text-[13px] tabular-nums">
                    {formatINR(p.gross)}
                  </span>
                ),
              },
              {
                key: "fee",
                header: "Platform fee",
                align: "right",
                hideBelow: "xl",
                sortValue: (p) => p.platformFee,
                cell: (p) => (
                  <span className="font-mono text-[13px] text-muted tabular-nums">
                    −{formatINR(p.platformFee)}
                  </span>
                ),
              },
              {
                key: "net",
                header: "You get",
                align: "right",
                mobile: "trailing",
                sortValue: (p) => p.net,
                cell: (p) => (
                  <span className="block">
                    <span className={clsx(money, "text-[15px]")}>
                      {formatINR(p.net)}
                    </span>
                    {/* phones: the Status column is hidden, so the status sits under the amount */}
                    <span className="mt-1 flex justify-end sm:hidden">
                      <StatusPill status={p.status} size="sm" variant="text" />
                    </span>
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                hideBelow: "sm",
                mobile: "hidden",
                sortValue: (p) => p.status,
                cell: (p) => (
                  <StatusPill status={p.status} size="sm" variant="text" />
                ),
              },
              {
                key: "ref",
                header: "Paid on",
                hideBelow: "sm",
                mobile: "hidden",
                cell: (p) =>
                  p.paidAt ? (
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {/* fixed-width date so the copy buttons line up down the column */}
                      <span className="inline-block min-w-[6.5rem] font-mono text-[12px] tracking-[0.04em] tabular-nums">
                        {formatDate(p.paidAt)}
                      </span>
                      {p.reference && <CopyRef reference={p.reference} />}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-muted">
                      {p.status === "scheduled" ? "After month end" : "Pending"}
                    </span>
                  ),
              },
            ]}
          />
        </WideSection>

        <WideSection
          index="03"
          label="Sales"
          note="Paid orders on your courses, newest first. Your share is after GST."
          title="Recent sales"
        >
          <DataTable<OrderRow>
            caption="Recent sales"
            rows={sales}
            getRowId={(o) => o.id}
            pageSize={8}
            minWidth={340}
            search={{ placeholder: "Search by learner, course or order" }}
            initialSort={{ key: "date", dir: "desc" }}
            empty={{
              title: "No sales yet.",
              body: "They'll show up here as soon as someone buys.",
            }}
            columns={[
              {
                key: "learner",
                header: "Learner",
                mobile: "title",
                sortValue: (o) => o.user?.name,
                searchValue: (o) =>
                  `${o.user?.name} ${o.number} ${o.course?.title}`,
                cell: (o) => (
                  <span className="flex items-center gap-3">
                    <Avatar
                      name={o.user?.name ?? "Learner"}
                      src={o.user?.avatar}
                      tone={o.user?.tone}
                      size="sm"
                      decorative
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold tracking-[-0.01em]">
                        {o.user?.name}
                      </span>
                      <span className="block font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                        {o.number}
                        <span className="sm:hidden">
                          {" "}
                          · {formatDate(o.createdAt, "short")}
                        </span>
                      </span>
                      <span className="block max-w-[180px] truncate text-[12.5px] text-muted sm:hidden">
                        {o.course?.title}
                      </span>
                    </span>
                  </span>
                ),
              },
              {
                key: "course",
                header: "Course",
                hideBelow: "sm",
                mobile: "hidden",
                sortValue: (o) => o.course?.title,
                cell: (o) => (
                  <span className="block max-w-[220px] truncate">
                    {o.course?.title}
                  </span>
                ),
              },
              {
                key: "amount",
                header: "Paid",
                hideBelow: "sm",
                mobile: "hidden",
                align: "right",
                sortValue: (o) => o.amount,
                cell: (o) => (
                  <span className="block font-mono text-[13px] whitespace-nowrap tabular-nums">
                    {o.amount ? (
                      formatINR(o.amount)
                    ) : (
                      <span className="text-muted">Grant</span>
                    )}
                    {/* the Coupon column shows from xl: below that the code rides under the amount */}
                    {o.couponCode && (
                      <span className="block text-[11px] tracking-[0.08em] text-muted uppercase xl:hidden">
                        {o.couponCode}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: "share",
                header: "Your share",
                align: "right",
                mobile: "trailing",
                sortValue: (o) => o.amount,
                cell: (o) => (
                  <span className={clsx(money, "text-[15px]")}>
                    {formatINR(Math.round((o.amount - o.tax) * share))}
                  </span>
                ),
              },
              {
                key: "coupon",
                header: "Coupon",
                hideBelow: "xl",
                mobile: "hidden",
                cell: (o) =>
                  o.couponCode ? (
                    <span className="inline-flex h-[24px] items-center px-2 font-mono text-[12px] font-semibold tracking-[0.08em] uppercase ring-1 ring-line-strong ring-inset">
                      {o.couponCode}
                    </span>
                  ) : (
                    <span className="text-muted">–</span>
                  ),
              },
              {
                key: "date",
                header: "Date",
                hideBelow: "sm",
                mobile: "hidden",
                sortValue: (o) => o.createdAt,
                cell: (o) => (
                  <span className="font-mono text-[12px] tracking-[0.04em] whitespace-nowrap text-muted uppercase">
                    {formatDate(o.createdAt, "short")}
                  </span>
                ),
              },
            ]}
          />
        </WideSection>

        <Section
          index="04"
          label="How it works"
          note="The same rhythm every month."
          title="From sale to bank"
        >
          <RuledList as="ol" label="How payouts work">
            <RuledRow
              index={1}
              title="Every sale counts toward its month."
              meta={`You keep ${Math.round(share * 100)}% of each sale after GST. The rest is the platform fee.`}
            />
            <RuledRow
              index={2}
              title="The month closes on its last day."
              meta="That month's sales add up to one payout. Until then this page shows the month so far."
            />
            <RuledRow
              index={3}
              title={`The transfer lands by the ${account.payoutDay}th.`}
              meta={`To ${account.bank} ••${account.last4}. If the bank transfer bounces, your backup UPI ID is used instead.`}
            />
            <RuledRow
              index={4}
              title="Every payout has a bank reference."
              meta="Copy it from the payout history, or download the full statement as a CSV."
            />
          </RuledList>
        </Section>
      </div>

      <p className="mt-14 border-t border-line pt-4 text-[12.5px] text-muted md:mt-20">
        Sample payouts and orders for the demo. No real money moves here.
      </p>
    </div>
  );
}

function CopyRef({
  reference,
  className,
  small,
}: {
  reference: string;
  className?: string;
  small?: boolean;
}) {
  return (
    <Tooltip label={`Copy ${reference}`} className={className}>
      <button
        type="button"
        aria-label={`Copy bank reference ${reference}`}
        onClick={async () => {
          const ok = await copyText(reference);
          if (ok) toast({ title: "Reference copied", description: reference });
          else toast(reference);
        }}
        className={clsx(
          "hit grid place-items-center text-muted transition-colors focus-visible:outline-2 focus-visible:outline-red hf:text-fg",
          small ? "-my-1 ml-1 size-6" : "size-8",
        )}
      >
        <Icon
          name="copy"
          strokeWidth={1.6}
          className={small ? "size-3" : "size-3.5"}
        />
      </button>
    </Tooltip>
  );
}

function downloadCsv(payouts: Payout[]) {
  const rows = [
    [
      "Month",
      "Sales",
      "Gross (INR)",
      "Platform fee (INR)",
      "Net (INR)",
      "Status",
      "Paid on",
      "Reference",
    ],
    ...payouts.map((p) => [
      p.period,
      p.sales,
      p.gross,
      p.platformFee,
      p.net,
      p.status,
      p.paidAt ? formatDate(p.paidAt, "numeric") : "",
      p.reference ?? "",
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tamada-payouts-statement.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Statement downloaded", {
      description: "tamada-payouts-statement.csv",
    });
  } catch {
    toast.error("Couldn't create the file in this browser.");
  }
}
