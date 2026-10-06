"use client";

import { useMemo } from "react";
import { formatDate, formatINR, formatNumber, getOrders, getPayouts, type OrderRow, type Payout } from "@/lib/mock";
import { getPayoutAccount } from "@/lib/mock/extra/tutor";
import { Avatar, BarChart, Button, Card, CardHeader, DataTable, DescriptionList, EmptyState, Icon, PageHeader, ProgressBar, StatGrid, StatTile, StatusPill, Tooltip, toast, useIsPhone } from "@/components/app";
import { copyText, useTutorContext } from "./shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const periodLabel = (p: string, long = false, withYear = false) => {
  const [y, m] = p.split("-").map(Number);
  return long ? `${MONTHS[m - 1]} ${y}` : withYear ? `${MONTHS[m - 1]} ’${String(y).slice(2)}` : MONTHS[m - 1];
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

export function TutorEarnings() {
  const { userId, db, tutor, profile } = useTutorContext();
  // phones: 26 monthly rows are three screens; page them instead
  const phone = useIsPhone();
  const payouts = useMemo(() => getPayouts(userId, db).map(soFar), [userId, db]);
  const sales = useMemo(() => getOrders({ tutorId: userId, status: "paid", pageSize: 200 }, db).items, [userId, db]);
  const share = tutor?.revenueShare ?? 0.7;
  const account = getPayoutAccount(userId, tutor?.name ?? profile?.name ?? "tutor");

  const current = payouts.find((p) => p.status === "scheduled");
  const processing = payouts.find((p) => p.status === "processing" || p.status === "on_hold");
  const paid = payouts.filter((p) => p.status === "paid");
  const paidThisYear = paid.filter((p) => p.period.startsWith("2026")).reduce((s, p) => s + p.net, 0);
  const lifetime = payouts.reduce((s, p) => s + p.net, 0);
  const mtd = current?.net ?? 0;

  const header = (
    <PageHeader
      eyebrow="Earnings"
      eyebrowTone="green"
      title="Your earnings."
      description={`You keep ${Math.round(share * 100)}% of every sale after GST. Payouts land on the ${account.payoutDay}th of each month for the month before.`}
      breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Earnings" }]}
      actions={
        payouts.length > 0 && (
          <Button variant="secondary" icon="download" onClick={() => downloadCsv(payouts)}>
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
        <Card padding="lg">
          <EmptyState
            art="buddy"
            tone="mint"
            title="No earnings yet."
            body="Your first payout shows up here the month after your first sale. Publishing a course is step one."
            action={<Button href="/tutor/courses">Go to your courses</Button>}
          />
        </Card>
      </div>
    );

  // more than 12 months on the axis: add the year so "May" doesn't appear twice without context
  const withYear = payouts.length > 12;
  const chart = [...payouts].reverse().map((p) => ({
    label: p.status === "scheduled" ? `${periodLabel(p.period, false, withYear)} (so far)` : periodLabel(p.period, false, withYear),
    value: p.net,
  }));

  return (
    <div className="app-enter">
      {header}

      <StatGrid>
        <StatTile label="October so far" value={formatINR(mtd, { compact: true })} tone="mint" icon="trend" hint="your share, 5 days in" />
        <StatTile
          label={processing?.status === "on_hold" ? "On hold" : "Balance due"}
          value={formatINR(processing?.net ?? 0, { compact: true })}
          tone={processing?.status === "on_hold" ? "blush" : "sun"}
          icon="clock"
          hint={processing ? `${periodLabel(processing.period, true)} · ${processing.status === "on_hold" ? "on hold" : "processing"}` : "nothing in flight"}
        />
        <StatTile label="Paid out in 2026" value={formatINR(paidThisYear, { compact: true })} tone="cyan" icon="wallet" hint={`${paid.filter((p) => p.period.startsWith("2026")).length} payouts`} />
        <StatTile label="Lifetime earnings" value={formatINR(lifetime, { compact: true })} tone="lilac" icon="award" hint={`${formatNumber(payouts.reduce((s, p) => s + p.sales, 0))} sales`} />
      </StatGrid>

      <div className="mt-5 grid gap-4 md:gap-5 xl:grid-cols-3">
        <Card tone="forest" padding="lg" className="flex min-w-0 flex-col text-white xl:col-span-1">
          <p className="t-eyebrow text-mint">Next payout</p>
          <p className="mt-3 t-stat">{formatINR(processing?.net ?? mtd)}</p>
          <p className="mt-2 text-[14.5px] font-semibold text-white/85">
            {processing
              ? processing.status === "on_hold"
                ? `${periodLabel(processing.period, true)} is on hold. Our team will email you about the next step.`
                : `${periodLabel(processing.period, true)} sales · expected by ${account.payoutDay} October`
              : `October sales · expected by ${account.payoutDay} November`}
          </p>
          <div className="mt-5">
            <ProgressBar value={processing ? 80 : (DAY_OF_MONTH / DAYS_IN_OCT) * 100} tone="sun" track="dark" label="Payout progress" />
            <div className="mt-2 flex justify-between text-[12px] font-bold text-white/70">
              <span>Sales closed</span>
              <span>Bank transfer</span>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <DescriptionList
              className="[&_dd]:text-white [&_dd]:[overflow-wrap:anywhere] [&_dt]:text-white/70 [&>div]:border-white/15"
              items={[
                {
                  label: "Paid to",
                  value: `${account.bank} ••${account.last4}`,
                },
                { label: "Backup UPI", value: account.upi },
                { label: "PAN", value: account.panMasked },
              ]}
            />
          </div>
        </Card>

        <Card className="min-w-0 xl:col-span-2">
          <CardHeader title="Monthly earnings" description="Your share after GST and the platform fee." />
          <BarChart data={chart} tone="green" height={260} format={(n) => formatINR(n, { compact: true })} ariaLabel="Your earnings per month" highlight={chart.length - 2} />
        </Card>
      </div>

      <div className="mt-8 md:mt-10">
        <h2 className="mb-3 t-app-h2">Payouts</h2>
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
              sortValue: (p) => p.period,
              cell: (p) => (
                <span className="block whitespace-nowrap">
                  <span className="block font-bold">{periodLabel(p.period, true)}</span>
                  {p.status === "scheduled" && <span className="block text-[12px] font-semibold text-ink/50">so far, {DAY_OF_MONTH} days in</span>}
                  {/* the "Paid on" column is hidden on phones: keep the date and bank reference under the month */}
                  {p.paidAt && (
                    <span className="flex items-center gap-0.5 text-[12px] font-semibold text-ink/50 sm:hidden">
                      Paid {formatDate(p.paidAt, "short")}
                      {p.reference && <CopyRef reference={p.reference} small />}
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
              cell: (p) => formatNumber(p.sales),
            },
            {
              key: "gross",
              header: "Gross",
              align: "right",
              // with the sidebar open (lg) the row only fits month, sales, net, status and paid on
              hideBelow: "xl",
              sortValue: (p) => p.gross,
              cell: (p) => formatINR(p.gross),
            },
            {
              key: "fee",
              header: "Platform fee",
              align: "right",
              hideBelow: "xl",
              sortValue: (p) => p.platformFee,
              cell: (p) => <span className="text-ink/60">−{formatINR(p.platformFee)}</span>,
            },
            {
              key: "net",
              header: "You get",
              align: "right",
              sortValue: (p) => p.net,
              cell: (p) => (
                <span className="block">
                  <span className="font-bold">{formatINR(p.net)}</span>
                  {/* phones: the Status column is hidden, so the pill sits under the amount */}
                  <span className="mt-1 flex justify-end sm:hidden">
                    <StatusPill status={p.status} size="sm" />
                  </span>
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              hideBelow: "sm",
              sortValue: (p) => p.status,
              cell: (p) => <StatusPill status={p.status} size="sm" />,
            },
            {
              key: "ref",
              header: "Paid on",
              hideBelow: "sm",
              cell: (p) =>
                p.paidAt ? (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {/* fixed-width date so the copy buttons line up down the column */}
                    <span className="inline-block min-w-[6.5rem] tabular-nums">{formatDate(p.paidAt)}</span>
                    {p.reference && <CopyRef reference={p.reference} />}
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-ink/45">{p.status === "scheduled" ? "After month end" : "Pending"}</span>
                ),
            },
          ]}
        />
      </div>

      <div className="mt-8 md:mt-10">
        <h2 className="mb-3 t-app-h2">Recent sales</h2>
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
              sortValue: (o) => o.user?.name,
              searchValue: (o) => `${o.user?.name} ${o.number} ${o.course?.title}`,
              cell: (o) => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={o.user?.name ?? "Learner"} tone={o.user?.tone} size="sm" decorative />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{o.user?.name}</span>
                    <span className="block text-[12px] font-semibold text-ink/50">{o.number}<span className="sm:hidden"> · {formatDate(o.createdAt, "short")}</span></span>
                    <span className="block max-w-[180px] truncate text-[12px] font-semibold text-ink/50 sm:hidden">{o.course?.title}</span>
                  </span>
                </span>
              ),
            },
            {
              key: "course",
              header: "Course",
              hideBelow: "sm",
              sortValue: (o) => o.course?.title,
              cell: (o) => <span className="block max-w-[200px] truncate">{o.course?.title}</span>,
            },
            {
              key: "amount",
              header: "Paid",
              hideBelow: "sm",
              align: "right",
              sortValue: (o) => o.amount,
              cell: (o) => (
                <span className="block whitespace-nowrap">
                  {o.amount ? formatINR(o.amount) : <span className="text-ink/50">Grant</span>}
                  {/* the Coupon column shows from xl: below that the code rides under the amount */}
                  {o.couponCode && <span className="block font-mono text-[12px] font-bold text-ink/50 xl:hidden">{o.couponCode}</span>}
                </span>
              ),
            },
            {
              key: "share",
              header: "Your share",
              align: "right",
              sortValue: (o) => o.amount,
              cell: (o) => <span className="font-bold">{formatINR(Math.round((o.amount - o.tax) * share))}</span>,
            },
            {
              key: "coupon",
              header: "Coupon",
              hideBelow: "xl",
              cell: (o) => (o.couponCode ? <span className="rounded-[8px] bg-cream px-2 py-1 font-mono text-[12px] font-bold">{o.couponCode}</span> : <span className="text-ink/35">–</span>),
            },
            {
              key: "date",
              header: "Date",
              hideBelow: "sm",
              sortValue: (o) => o.createdAt,
              cell: (o) => <span className="whitespace-nowrap text-ink/60">{formatDate(o.createdAt, "short")}</span>,
            },
          ]}
        />
      </div>
      <p className="mt-6 text-[12.5px] font-semibold text-ink/45">Sample payouts and orders for the demo. No real money moves here.</p>
    </div>
  );
}

function CopyRef({ reference, className, small }: { reference: string; className?: string; small?: boolean }) {
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
        className={small ? "hit -my-1 ml-1 grid size-6 place-items-center rounded-full text-ink/55 hf:bg-ink/[0.06] hf:text-ink" : "hit grid size-8 place-items-center rounded-full text-ink/55 hf:bg-ink/[0.06] hf:text-ink"}
      >
        <Icon name="copy" className={small ? "size-3" : "size-3.5"} />
      </button>
    </Tooltip>
  );
}

function downloadCsv(payouts: Payout[]) {
  const rows = [
    ["Month", "Sales", "Gross (INR)", "Platform fee (INR)", "Net (INR)", "Status", "Paid on", "Reference"],
    ...payouts.map((p) => [p.period, p.sales, p.gross, p.platformFee, p.net, p.status, p.paidAt ? formatDate(p.paidAt, "numeric") : "", p.reference ?? ""]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
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
