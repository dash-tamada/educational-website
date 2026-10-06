"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  BarChart,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  PageHeader,
  Select,
  StatGrid,
  StatTile,
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

type Status = Payout["status"];

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
                <span className="text-[13.5px] font-bold text-ink">
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
          cell: (p) => formatNumber(p.sales),
          sortValue: (p) => p.sales,
        },
        {
          key: "gross",
          header: "Gross",
          align: "right",
          minBox: 760,
          cell: (p) => formatINR(p.gross),
          sortValue: (p) => p.gross,
        },
        {
          key: "fee",
          header: "Platform fee",
          align: "right",
          minBox: 1000,
          cell: (p) => (
            <span className="whitespace-nowrap text-ink/60">−{formatINR(p.platformFee)}</span>
          ),
          sortValue: (p) => p.platformFee,
        },
        {
          key: "net",
          header: "Net payout",
          align: "right",
          cell: (p) => <span className="font-bold whitespace-nowrap">{formatINR(p.net)}</span>,
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
              <span className="block text-[13px] whitespace-nowrap">
                {formatDate(p.paidAt)}
                <span className="block font-mono text-[11.5px] text-ink/45">
                  {p.reference}
                </span>
              </span>
            ) : (
              <span className="text-[13px] text-ink/40">—</span>
            ),
          sortValue: (p) => p.paidAt ?? "",
        },
      ];
  const columns = fitColumns(allColumns, boxW);
  const { initialSort, sortKey } = pickSort(columns, { key: "net", dir: "desc" });

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Money"
        eyebrowTone="purple"
        title="Pay the people who teach."
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
            className="w-full sm:max-w-[230px] sm:min-w-[230px]"
            options={periods.map((p, i) => ({
              value: p,
              label: `${periodLabel(p)}${i === 0 ? " (projected)" : ""}`,
            }))}
          />
        }
      />
      <MoneyTabs current="payouts" />

      <StatGrid className="mb-6">
        <StatTile
          label="Gross sales"
          value={formatINR(gross, { compact: true })}
          tone="sun"
          icon="trend"
          hint={periodLabel(period)}
        />
        <StatTile
          label="Platform fee"
          value={formatINR(fee, { compact: true })}
          tone="lilac"
          icon="layers"
          hint={
            gross
              ? `${formatPercent((fee / gross) * 100, 1)} of gross`
              : "Nothing sold yet"
          }
        />
        <StatTile
          label="Net to tutors"
          value={formatINR(net, { compact: true })}
          tone="mint"
          icon="wallet"
          hint={plural(rows.length, "tutor")}
        />
        <StatTile
          label="On hold"
          value={held.length}
          tone={held.length ? "butter" : "white"}
          icon="lock"
          hint={
            held.length
              ? formatINR(held.reduce((s, p) => s + p.net, 0))
              : "Nothing held"
          }
        />
      </StatGrid>

      <div className="mb-6 grid gap-4 md:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Net payouts by month"
            description="What tutors took home over the last 12 months. October is a projection while the month runs."
          />
          <BarChart
            data={monthly}
            tone="green"
            highlight={
              periods.indexOf(period) >= 0 && periods.indexOf(period) < 12
                ? monthly.length - 1 - periods.indexOf(period)
                : undefined
            }
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="Net tutor payouts by month"
            height={220}
          />
        </Card>
        <Card tone="butter">
          <CardHeader as="h3" title="How payouts work" />
          <ol className="space-y-3 text-[14px] leading-snug">
            {[
              [
                "Scheduled",
                "The month is still running. Sales keep adding up.",
              ],
              [
                "Processing",
                "Month closed. Finance checks refunds, then sends the bank transfer.",
              ],
              [
                "Paid",
                "Money sent. The bank reference (UTR) is saved for the tutor.",
              ],
              [
                "On hold",
                "Something needs a look, like tax details or a dispute.",
              ],
            ].map(([t, b]) => (
              <li key={t}>
                <span className="font-bold">{t}.</span>{" "}
                <span className="opacity-80">{b}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

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
              variant="secondary"
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
              badge={<span className="text-[12px] font-semibold text-ink/55">net</span>}
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
      {isCurrent && (
        <p className="mt-3 t-small text-ink/55">
          This month is still running, so it can&apos;t be paid out yet.
        </p>
      )}

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
      <span className="block truncate text-[12px] font-semibold opacity-80">
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
