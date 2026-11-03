"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  BarChart,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  PageHeader,
  Section,
  Select,
  StatusPill,
  toast,
  type MenuItem,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import {
  formatDate,
  formatINR,
  formatNumber,
  formatPercent,
  getPayouts,
  getUser,
  plural,
  type Payout,
} from "@/lib/mock";
import { Idx, MonoMeta } from "@/components/tutor/editorial";
import { WideSection } from "./ledgerKit";
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  MoneyTabs,
  PersonCell,
  PhoneRow,
  fitColumns,
  periodLabel,
  pickSort,
  smartDate,
  useBoxWidth,
  type FitColumn,
} from "./shared";

/* =============================================================================
   /admin/payouts (design system v2). The month's payout run is the page's one ink
   panel: net to tutors in Anton, gross / fee / held as figures, and the red "Mark
   paid" for every payable row. Then the 12-month trend, how a payout moves, and
   the per-tutor awards table (select rows to mark a few paid).
   ============================================================================= */

type Status = Payout["status"];

const STEPS: [Status, string, string][] = [
  ["scheduled", "Scheduled", "The month is still running. Sales keep adding up."],
  ["processing", "Processing", "Month closed. Finance checks refunds, then sends the bank transfer."],
  ["paid", "Paid", "Money sent. The bank reference (UTR) is saved for the tutor."],
  ["on_hold", "On hold", "Something needs a look, like tax details or a dispute."],
];

export function PayoutsView() {
  const db = useDb();
  const all = useMemo(() => getPayouts(undefined, db), [db]);
  const periods = useMemo(
    () => [...new Set(all.map((p) => p.period))].sort().reverse(),
    [all],
  );
  const [period, setPeriod] = useState(periods[1] ?? periods[0] ?? "");
  const [bulk, setBulk] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [boxRef, boxW] = useBoxWidth();

  // biggest payout first, the same order the wide table sorts to
  const rows = useMemo(
    () =>
      all.filter((p) => p.period === period).sort((a, b) => b.net - a.net),
    [all, period],
  );
  const gross = rows.reduce((s, p) => s + p.gross, 0);
  const fee = rows.reduce((s, p) => s + p.platformFee, 0);
  const net = rows.reduce((s, p) => s + p.net, 0);
  const held = rows.filter((p) => p.status === "on_hold");
  const paidRows = rows.filter((p) => p.status === "paid");
  const monthly = useMemo(
    () =>
      // last 12 months only: month names stay unique (they key the bars)
      [...periods].slice(0, 12).reverse().map((per) => ({
        label: periodLabel(per, true).split(" ")[0],
        value: all
          .filter((p) => p.period === per)
          .reduce((s, p) => s + p.net, 0),
      })),
    [all, periods],
  );
  const isCurrent = period === periods[0];
  /** Only these can be marked paid. The month gate is absolute: nothing in the
   *  running month can be paid, whatever its status. Held rows need their hold
   *  released first, and a paid row keeps its original bank reference. */
  const isPayable = (p: Payout) =>
    !isCurrent && (p.status === "processing" || p.status === "scheduled");
  const payableAll = rows.filter(isPayable);
  const bulkRows = bulk ? rows.filter((p) => bulk.includes(p.id)) : [];
  const bulkPayable = bulkRows.filter(isPayable);
  const bulkHeld = bulkRows.filter((p) => p.status === "on_hold");
  const bulkPaid = bulkRows.filter((p) => p.status === "paid");

  const setStatus = (p: Payout, s: Status) => {
    demo.setPayoutStatus(p.id, s);
    const name = getUser(p.tutorId, db)?.name ?? "Tutor";
    const msg: Record<Status, string> = {
      paid: `Marked ${name}'s payout as paid.`,
      processing: `${name}'s payout is processing.`,
      on_hold: `${name}'s payout is on hold.`,
      scheduled: `${name}'s payout is scheduled.`,
    };
    toast.success(msg[s], {
      description:
        s === "paid"
          ? `${formatINR(p.net)} · a UTR reference was recorded.`
          : undefined,
    });
  };

  const actionsFor = (p: Payout): MenuItem[] => {
    const payable = isPayable(p);
    // a hint only ever explains why an item is disabled
    const payHint = payable
      ? undefined
      : p.status === "on_hold"
        ? "Release the hold first"
        : p.status === "paid"
          ? `Paid ${p.paidAt ? smartDate(p.paidAt) : ""}`.trim()
          : isCurrent
            ? "Month still running"
            : undefined;
    const canProcess = !isCurrent && p.status === "scheduled";
    return [
      ...(p.status !== "on_hold"
        ? [
            {
              label: withReason(
                "Mark processing",
                canProcess
                  ? undefined
                  : isCurrent && p.status !== "paid"
                    ? "Month still running"
                    : p.status === "processing"
                      ? "Already processing"
                      : undefined,
              ),
              icon: "refresh" as const,
              onSelect: () => setStatus(p, "processing"),
              disabled: !canProcess,
            },
          ]
        : []),
      {
        label: withReason("Mark paid", payHint),
        icon: "check-circle" as const,
        onSelect: () => setStatus(p, "paid"),
        disabled: !payable,
      },
      { divider: true },
      p.status === "on_hold"
        ? {
            label: "Release hold",
            icon: "unlock" as const,
            // in the running month a released payout goes back to adding up sales
            onSelect: () => setStatus(p, isCurrent ? "scheduled" : "processing"),
          }
        : {
            label: withReason(
              "Put on hold",
              p.status === "paid" ? "Already paid" : undefined,
            ),
            icon: "lock" as const,
            danger: true,
            onSelect: () => setStatus(p, "on_hold"),
            disabled: p.status === "paid",
          },
      { label: "Open tutor", icon: "user" as const, href: `/admin/users/${p.tutorId}` },
    ];
  };

  const compact = boxW != null && boxW < COMPACT_BOX;
  const allColumns: FitColumn<Payout>[] = compact
    ? [
        {
          key: "tutor",
          header: "Tutor",
          cell: (p) => (
            <span className="block min-w-0">
              <PersonCell
                user={getUser(p.tutorId, db)}
                href={`/admin/users/${p.tutorId}`}
                sub={`${plural(p.sales, "sale")} · gross ${formatINR(p.gross, { compact: true })}`}
              />
              <CompactFacts>
                <span className="font-heading text-[14px] font-semibold text-fg tabular-nums">
                  Net {formatINR(p.net)}
                </span>
                <StatusPill status={p.status} size="sm" />
                {p.paidAt && <span>Paid {smartDate(p.paidAt)}</span>}
              </CompactFacts>
            </span>
          ),
          sortValue: (p) => getUser(p.tutorId, db)?.name,
          searchValue: (p) => getUser(p.tutorId, db)?.name,
        },
      ]
    : [
        {
          key: "tutor",
          header: "Tutor",
          cell: (p) => (
            <span className="block max-w-[260px] min-w-[170px]">
              <PersonCell
                user={getUser(p.tutorId, db)}
                href={`/admin/users/${p.tutorId}`}
              />
            </span>
          ),
          sortValue: (p) => getUser(p.tutorId, db)?.name,
        },
        {
          key: "sales",
          header: "Sales",
          align: "right",
          cell: (p) => (
            <span className="font-mono text-[13px] tabular-nums">
              {formatNumber(p.sales)}
            </span>
          ),
          sortValue: (p) => p.sales,
        },
        {
          key: "gross",
          header: "Gross",
          align: "right",
          minBox: 760,
          cell: (p) => (
            <span className="font-mono text-[13px] whitespace-nowrap tabular-nums">
              {formatINR(p.gross)}
            </span>
          ),
          sortValue: (p) => p.gross,
        },
        {
          key: "fee",
          header: "Platform fee",
          align: "right",
          minBox: 1000,
          cell: (p) => (
            <span className="font-mono text-[13px] whitespace-nowrap text-muted tabular-nums">
              −{formatINR(p.platformFee)}
            </span>
          ),
          sortValue: (p) => p.platformFee,
        },
        {
          key: "net",
          header: "Net payout",
          align: "right",
          cell: (p) => (
            <span className="font-heading text-[16px] font-semibold tracking-[-0.015em] whitespace-nowrap tabular-nums">
              {formatINR(p.net)}
            </span>
          ),
          sortValue: (p) => p.net,
        },
        {
          key: "status",
          header: "Status",
          cell: (p) => <StatusPill status={p.status} size="sm" />,
          sortValue: (p) => p.status,
        },
        {
          key: "ref",
          header: "Paid",
          minBox: 880,
          cell: (p) =>
            p.paidAt ? (
              <span className="block font-mono text-[12px] whitespace-nowrap tabular-nums">
                {formatDate(p.paidAt)}
                <span className="block text-[10.5px] tracking-[0.04em] text-muted">
                  {p.reference}
                </span>
              </span>
            ) : (
              <span className="text-[13px] text-muted">—</span>
            ),
          sortValue: (p) => p.paidAt ?? "",
        },
      ];
  const columns = fitColumns(allColumns, boxW);
  const { initialSort, sortKey } = pickSort(columns, { key: "net", dir: "desc" });

  const payReason = isCurrent
    ? "This month is still running, so nothing can be paid out yet."
    : payableAll.length
      ? `${plural(payableAll.length, "payout")} ready · ${formatINR(payableAll.reduce((s, p) => s + p.net, 0))}`
      : held.length
        ? "Everything else is paid. Release the holds to pay them."
        : "Every payout this month is paid.";

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room · Money"
        title={
          <>
            Pay the people who <em>teach</em>.
          </>
        }
        description="Monthly tutor payouts after the platform fee. Payouts go out by the 10th of the following month."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Payouts" },
        ]}
        actions={
          <Select
            aria-label="Payout month"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setSelected([]);
            }}
            className="w-full sm:max-w-[240px] sm:min-w-[240px]"
            options={periods.map((p, i) => ({
              value: p,
              label: `${periodLabel(p)}${i === 0 ? " (projected)" : ""}`,
            }))}
          />
        }
      />
      <MoneyTabs current="payouts" />

      {/* the payout run: the page's one ink panel */}
      <Card
        variant="ink"
        padding="none"
        as="section"
        aria-labelledby="run-title"
        className="overflow-hidden"
      >
        <div className="grid lg:grid-cols-12">
          <div className="p-6 md:p-9 lg:col-span-7">
            <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.16em] text-cream/75 uppercase">
              <span className="font-mono text-[10.5px] tracking-[0.04em] text-red-lite">
                {isCurrent ? "REC" : "RUN"}
              </span>
              <span id="run-title">
                Payout run · {periodLabel(period)}
                {isCurrent ? " (projected)" : ""}
              </span>
            </p>
            <p className="t-display-xl mt-5 tabular-nums md:mt-7">
              {formatINR(net, { compact: true })}
            </p>
            <p className="mt-4 max-w-[46ch] text-[14.5px] leading-snug text-cream/75">
              Net to {plural(rows.length, "tutor")}
              {isCurrent
                ? ", still adding up while the month runs."
                : `, ${paidRows.length === rows.length && rows.length ? "all paid" : `${paidRows.length} of ${rows.length} paid so far`}.`}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                variant="red"
                icon="check-circle"
                disabled={payableAll.length === 0}
                aria-describedby="pay-reason"
                onClick={() => setBulk(payableAll.map((p) => p.id))}
              >
                Mark {payableAll.length} paid
              </Button>
              <p id="pay-reason" className="font-mono text-[11px] tracking-[0.06em] text-cream/65 uppercase">
                {payReason}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-1 border-t border-white/[0.14] sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1 lg:border-t-0 lg:border-l">
            {[
              { k: "Gross sales", v: formatINR(gross, { compact: true }), h: periodLabel(period, true) },
              {
                k: "Platform fee",
                v: formatINR(fee, { compact: true }),
                h: gross ? `${formatPercent((fee / gross) * 100, 1)} of gross` : "Nothing sold yet",
              },
              {
                k: "On hold",
                v: String(held.length),
                h: held.length ? formatINR(held.reduce((s, p) => s + p.net, 0)) : "Nothing held",
                alert: held.length > 0,
              },
            ].map((f, i) => (
              <div
                key={f.k}
                className="flex min-w-0 items-baseline justify-between gap-4 border-white/[0.14] px-6 py-4 max-sm:[&:not(:first-child)]:border-t sm:block sm:p-4 sm:[&:not(:first-child)]:border-l md:p-6 lg:flex lg:[&:not(:first-child)]:border-t lg:[&:not(:first-child)]:border-l-0"
              >
                <dt className="text-[10.5px] leading-[1.35] font-semibold tracking-[0.14em] text-cream/70 uppercase">
                  <span className="mr-2 font-mono tracking-[0.04em] text-red-lite" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {f.k}
                </dt>
                <dd className="min-w-0 text-right sm:mt-2 sm:text-left lg:mt-0 lg:text-right">
                  <span className="block font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.5rem)] leading-none tabular-nums">
                    {f.v}
                  </span>
                  <span
                    className={
                      f.alert
                        ? "mt-1.5 block truncate font-mono text-[11px] text-red-lite"
                        : "mt-1.5 block truncate font-mono text-[11px] text-cream/60"
                    }
                  >
                    {f.h}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <Section
          index="01"
          label="Trend"
          note="What tutors took home over the last 12 months. October is a projection while the month runs. The red bar is the month you're looking at."
          title="Net payouts by month"
        >
          <BarChart
            data={monthly}
            tone="ink"
            highlight={
              periods.indexOf(period) >= 0 && periods.indexOf(period) < 12
                ? monthly.length - 1 - periods.indexOf(period)
                : undefined
            }
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="Net tutor payouts by month"
            height={240}
          />
        </Section>

        <Section
          index="02"
          label="How it works"
          note="Every payout moves through the same four states."
          title="From sale to bank transfer"
        >
          <ol className="grid border-t border-fg sm:grid-cols-2">
            {STEPS.map(([s, t, b], i) => (
              <li
                key={s}
                className="flex gap-4 border-b border-line py-5 sm:odd:pr-8 sm:even:border-l sm:even:pl-8"
              >
                <Idx n={i + 1} className="mt-1" />
                <div className="min-w-0">
                  <StatusPill status={s} size="sm" />
                  <p className="t-small mt-2.5 text-fg/80">
                    <span className="sr-only">{t}: </span>
                    {b}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <WideSection
          index="03"
          label="Tutors"
          note={
            isCurrent
              ? "This month is still running, so it can't be paid out yet."
              : "Select rows to mark a few paid, or use the row menu to hold or release one."
          }
          title={`Payouts for ${periodLabel(period)}`}
          action={
            <MonoMeta as="span" className="text-fg">
              {plural(rows.length, "tutor")} · {formatINR(net)} net
            </MonoMeta>
          }
        >
          <div ref={boxRef}>
            <DataTable<Payout>
              key={sortKey}
              caption={`Payouts for ${periodLabel(period)}`}
              rows={rows}
              columns={columns}
              getRowId={(p) => p.id}
              pageSize={12}
              selectable
              selected={selected}
              onSelectedChange={setSelected}
              bulkNote={(ids) => {
                const picked = rows.filter((p) => ids.includes(p.id));
                if (picked.some(isPayable)) return null;
                return isCurrent
                  ? "Month still running"
                  : picked.some((p) => p.status === "on_hold") &&
                      picked.every((p) => p.status === "on_hold" || p.status === "paid")
                    ? "Release the hold first"
                    : "Already paid";
              }}
              bulkActions={(ids, _clear, meta) => {
                const payable = rows.filter((p) => ids.includes(p.id)).filter(isPayable).length;
                return (
                  <Button
                    size="sm"
                    variant="cream"
                    icon="check-circle"
                    onClick={() => setBulk(ids)}
                    disabled={payable === 0}
                    aria-describedby={payable === 0 ? meta?.noteId : undefined}
                  >
                    Mark {payable} paid
                  </Button>
                );
              }}
              rowActions={actionsFor}
              mobileRow={(p) => {
                const t = getUser(p.tutorId, db);
                return (
                  <PhoneRow
                    leading={t && <Avatar name={t.name} src={t.avatar} tone={t.tone} size="md" decorative />}
                    title={t?.name ?? "Deleted account"}
                    lines={[
                      [plural(p.sales, "sale"), `gross ${formatINR(p.gross, { compact: true })}`],
                      [<StatusPill key="s" status={p.status} />, p.paidAt && `Paid ${smartDate(p.paidAt)}`],
                    ]}
                    trailing={formatINR(p.net)}
                    badge={
                      <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
                        net
                      </span>
                    }
                  />
                );
              }}
              initialSort={initialSort}
              empty={{
                title: "No payouts for this month.",
                body: "Pick another month.",
              }}
              dense={boxW != null && boxW < 1000}
              minWidth={compact ? 0 : 600}
              className={compact ? COMPACT_TABLE : undefined}
            />
          </div>
        </WideSection>
      </div>

      <ConfirmDialog
        open={!!bulk}
        onClose={() => setBulk(null)}
        title={
          bulk ? `Mark ${plural(bulkPayable.length, "payout")} as paid?` : ""
        }
        description={
          bulk
            ? [
                `${formatINR(bulkPayable.reduce((s, p) => s + p.net, 0))} in total. Each gets a bank reference.`,
                skippedNote(bulkHeld, bulkPaid, db),
              ]
                .filter(Boolean)
                .join(" ")
            : undefined
        }
        confirmLabel={`Mark ${bulkPayable.length} paid`}
        onConfirm={() => {
          if (!bulk) return;
          const payable = rows.filter((p) => bulk.includes(p.id) && isPayable(p));
          payable.forEach((p) => demo.setPayoutStatus(p.id, "paid"));
          const skipped = bulk.length - payable.length;
          toast.success(`${plural(payable.length, "payout")} marked as paid.`, {
            description: skipped
              ? `${plural(skipped, "payout")} skipped (on hold or already paid).`
              : undefined,
          });
          setSelected([]);
        }}
      />
    </div>
  );
}

/** A menu label with the reason it's disabled on a second, smaller line (the row
 *  menu is narrow, and a side-by-side hint would truncate "Mark processing"). */
function withReason(label: string, reason?: string) {
  if (!reason) return label;
  return (
    <span className="block">
      <span className="block truncate">{label}</span>
      <span className="block truncate text-[12px] opacity-75">
        {reason}
      </span>
    </span>
  );
}

/** "Farhan Qureshi is on hold and 2 are already paid; they're skipped." */
function skippedNote(
  held: Payout[],
  paid: Payout[],
  db: ReturnType<typeof useDb>,
): string {
  if (!held.length && !paid.length) return "";
  const name = (p: Payout) => getUser(p.tutorId, db)?.name ?? "A tutor";
  const heldPart = held.length
    ? held.length === 1
      ? `${name(held[0])} is on hold`
      : `${held.length} are on hold`
    : "";
  const paidPart = paid.length
    ? `${paid.length} ${paid.length === 1 ? "is" : "are"} already paid`
    : "";
  const both = heldPart && paidPart;
  const skipped = held.length + paid.length;
  return `${[heldPart, paidPart].filter(Boolean).join(" and ")}; ${
    skipped === 1 && !both ? "it's" : "they're"
  } skipped.`;
}
