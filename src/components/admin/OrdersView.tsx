"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  Donut,
  Drawer,
  EmptyState,
  PageHeader,
  Section,
  Select,
  StatGrid,
  StatTile,
  StatusPill,
  Tabs,
  toast,
  Field,
  Modal,
  Textarea,
  type MenuItem,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import {
  MOCK_NOW,
  REFUND_MAX_PROGRESS,
  REFUND_WINDOW_DAYS,
  formatDate,
  formatINR,
  formatNumber,
  getLedgerMonth,
  getLedgerSample,
  getOrders,
  getSalesBreakdown,
  isEnrolled,
  plural,
  timeAgo,
  type OrderRow,
} from "@/lib/mock";
import { Figure, Idx, MonoMeta, RuleNote } from "@/components/tutor/editorial";
import { RefundModal } from "./modals";
import { PanelLabel, WideSection } from "./ledgerKit";
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  CourseCell,
  MoneyTabs,
  PersonCell,
  PhoneRow,
  downloadCsv,
  fitColumns,
  pickSort,
  refundContext,
  smartDate,
  useAdminId,
  useBoxWidth,
  type FitColumn,
} from "./shared";

/* =============================================================================
   /admin/orders (design system v2): the order ledger. Four KPI tiles, the refund
   queue as a ruled list (policy flags as slates, red only when outside policy),
   payment methods, then the awards-style order table under status tabs. A row
   opens the order drawer ("ORDER TM-25073" receipt).
   ============================================================================= */

type StatusTab =
  | "all"
  | "paid"
  | "pending"
  | "failed"
  | "refunded"
  | "grant"
  | "refund_requests";
const TABS: StatusTab[] = [
  "all",
  "paid",
  "pending",
  "failed",
  "refunded",
  "grant",
  "refund_requests",
];
/** The same windows the sales ledger knows, so the table, its toolbar total and the
 *  sample note under it always describe one range. */
type Range = "7d" | "30d" | "12m" | "all";

/** IST calendar day ("2026-10-05"), the key the ledger windows use. */
const istDay = (iso: string) =>
  new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 10);
const TODAY = istDay(MOCK_NOW.toISOString());
function windowStart(range: Range): string | null {
  if (range === "all") return null;
  if (range === "12m") {
    const [y, m] = TODAY.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 - 11, 1));
    return d.toISOString().slice(0, 10);
  }
  const n = range === "7d" ? 7 : 30;
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) - (n - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const statusOf = (o: OrderRow) => (o.provider === "admin" ? "grant" : o.status);

/** Slates beside an order's status: a refund ask (red alert) or an earlier decline (quiet). */
function RefundFlags({ o, size = "sm" }: { o: OrderRow; size?: "sm" | "md" }) {
  if (o.status !== "paid") return null;
  if (o.refundRequest)
    return (
      <Badge tone="flame" size={size} dot>
        Refund asked
      </Badge>
    );
  if (o.refundDeclinedAt)
    return (
      <Badge tone="neutral" size={size}>
        Refund declined
      </Badge>
    );
  return null;
}

export function OrdersPage() {
  const sp = useSearchParams();
  const raw = sp.get("status") ?? "all";
  const tab: StatusTab = (TABS as string[]).includes(raw)
    ? (raw as StatusTab)
    : "all";
  const q = sp.get("q") ?? "";
  return <OrdersView key={q} tab={tab} initialQ={q} />;
}

function OrdersView({ tab, initialQ }: { tab: StatusTab; initialQ: string }) {
  const db = useDb();
  const adminId = useAdminId();
  const [q, setQ] = useState(initialQ);
  const [range, setRange] = useState<Range>("all");
  const [view, setView] = useState<string | null>(null);
  const [refund, setRefund] = useState<OrderRow | null>(null);
  const [decline, setDecline] = useState<OrderRow | null>(null);
  const [grant, setGrant] = useState<OrderRow | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [boxRef, boxW] = useBoxWidth();
  const wide = boxW == null || boxW >= 1080;

  const all = useMemo(
    () => getOrders({ status: "all", pageSize: 100_000 }, db).items,
    [db],
  );
  const requests = useMemo(
    () => all.filter((o) => o.status === "paid" && o.refundRequest),
    [all],
  );
  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = {
      all: all.length,
      paid: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      grant: 0,
      refund_requests: requests.length,
    };
    for (const o of all) c[statusOf(o)]++;
    return c;
  }, [all, requests]);

  const rows = useMemo(() => {
    const cutoff = windowStart(range);
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((o) => {
      if (
        tab === "refund_requests"
          ? !(o.status === "paid" && o.refundRequest)
          : tab !== "all" && statusOf(o) !== tab
      )
        return false;
      if (cutoff && istDay(o.createdAt) < cutoff) return false;
      if (!words.length) return true;
      const hay =
        `${o.number} ${o.user?.name} ${o.user?.email} ${o.course?.title} ${o.providerRef} ${o.couponCode ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [all, tab, range, q]);

  const paid = useMemo(
    () => all.filter((o) => o.status === "paid" && o.provider !== "admin"),
    [all],
  );
  const refunded = all.filter((o) => o.status === "refunded");
  const refundRate =
    paid.length + refunded.length
      ? (refunded.length / (paid.length + refunded.length)) * 100
      : 0;
  // Money tiles use the full sales ledger (they agree with Payments and the
  // Overview); the refund rate and payment methods describe the order sample below.
  const ledger30 = useMemo(
    () => getSalesBreakdown({ by: "course", range: "30d" }, db).total,
    [db],
  );
  const ledgerMonth = useMemo(() => getLedgerMonth(db), [db]);
  const sample = useMemo(() => getLedgerSample(range, db), [range, db]);
  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of paid) m[o.method] = (m[o.method] ?? 0) + o.amount;
    return Object.entries(m)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [paid]);
  const paidTotal = paid.reduce((s, o) => s + o.amount, 0);

  const actionsFor = (o: OrderRow): MenuItem[] => [
    { label: "View order", icon: "eye", onSelect: () => setView(o.id) },
    { label: "Open learner", icon: "user", href: `/admin/users/${o.userId}` },
    { divider: true },
    {
      label: "Grant access",
      icon: "unlock",
      onSelect: () => setGrant(o),
      disabled: isEnrolled(o.userId, o.courseId, db),
      hint: isEnrolled(o.userId, o.courseId, db) ? "Has it" : undefined,
    },
    {
      label: "Issue refund",
      icon: "refresh",
      danger: true,
      onSelect: () => setRefund(o),
      disabled: o.status !== "paid" || o.provider === "admin",
    },
  ];

  const compact = boxW != null && boxW < COMPACT_BOX;
  const amountOf = (o: OrderRow) =>
    o.provider === "admin" ? "₹0" : formatINR(o.amount);
  // Course needs a 760px box and Date 880px; when they drop, their facts move into
  // the Order and Amount cells so a 768 tablet still shows what was bought and when.
  const showCourse = boxW == null || boxW >= 760;
  const showDate = boxW == null || boxW >= 880;
  const allColumns: FitColumn<OrderRow>[] = compact
    ? [
        {
          key: "number",
          header: "Order",
          cell: (o) => (
            <span className="block min-w-0">
              <span className="flex items-baseline justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setView(o.id)}
                  className="font-mono text-[13px] font-medium tracking-[0.04em] whitespace-nowrap underline-offset-[3px] hf:underline"
                >
                  {o.number}
                </button>
                <span className="font-heading font-semibold whitespace-nowrap tabular-nums">
                  {amountOf(o)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">
                {o.user?.name ?? "Deleted account"} ·{" "}
                {o.course?.title ?? "Removed course"}
              </span>
              <CompactFacts>
                <StatusPill status={statusOf(o)} size="sm" />
                {o.status === "paid" && (o.refundRequest || o.refundDeclinedAt) && <RefundFlags o={o} />}
                <span>{smartDate(o.createdAt)}</span>
              </CompactFacts>
            </span>
          ),
          sortValue: (o) => o.number,
          searchValue: (o) => o.number,
        },
      ]
    : [
        {
          key: "number",
          header: "Order",
          cell: (o) => (
            <button
              type="button"
              onClick={() => setView(o.id)}
              className="text-left"
            >
              <span className="block font-mono text-[13px] font-medium tracking-[0.04em] whitespace-nowrap underline-offset-[3px] hf:underline">
                {o.number}
              </span>
              {!showCourse ? (
                // the Course column doesn't fit: say what was bought right here
                <span className="block max-w-[200px] truncate text-[12.5px] text-muted">
                  {o.course?.title ?? "Removed course"}
                </span>
              ) : (
                wide && (
                  <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.04em] text-muted">
                    {o.providerRef.slice(0, 18)}
                  </span>
                )
              )}
            </button>
          ),
          sortValue: (o) => o.number,
        },
        {
          key: "learner",
          header: "Learner",
          cell: (o) => (
            <span className="block max-w-[220px]">
              <PersonCell user={o.user} href={`/admin/users/${o.userId}`} />
            </span>
          ),
          sortValue: (o) => o.user?.name,
        },
        {
          key: "course",
          header: "Course",
          minBox: 760,
          cell: (o) => (
            <span className="line-clamp-2 min-w-[140px] text-fg/85">
              {o.course?.title ?? "Removed course"}
            </span>
          ),
          sortValue: (o) => o.course?.title,
        },
        {
          key: "amount",
          header: "Amount",
          align: "right",
          cell: (o) => (
            <span className="whitespace-nowrap">
              <span className="block font-heading text-[15px] font-semibold tracking-[-0.01em] tabular-nums">
                {amountOf(o)}
              </span>
              {o.couponCode && (
                <span className="block font-mono text-[10.5px] tracking-[0.04em] text-muted">
                  {o.couponCode} −{formatINR(o.discount)}
                </span>
              )}
              {!showDate && (
                <span className="block font-mono text-[10.5px] tracking-[0.04em] text-muted">
                  {smartDate(o.createdAt)}
                </span>
              )}
            </span>
          ),
          sortValue: (o) => o.amount,
        },
        {
          key: "method",
          header: "Method",
          minBox: 1080,
          cell: (o) => <span className="text-muted">{o.method}</span>,
          sortValue: (o) => o.method,
        },
        {
          key: "date",
          header: "Date",
          minBox: 880,
          cell: (o) => (
            <span className="font-mono text-[12px] tracking-[0.02em] whitespace-nowrap text-muted tabular-nums">
              {formatDate(o.createdAt)}
            </span>
          ),
          sortValue: (o) => o.createdAt,
        },
        {
          key: "status",
          header: "Status",
          cell: (o) => (
            <span className="flex flex-col items-start gap-1">
              <StatusPill status={statusOf(o)} size="sm" />
              <RefundFlags o={o} />
            </span>
          ),
          sortValue: (o) => statusOf(o),
        },
      ];
  const columns = fitColumns(allColumns, boxW);
  // rows arrive newest first; the Date arrow shows whenever that column fits
  const { initialSort, sortKey } = pickSort(
    columns,
    { key: "date", dir: "desc" },
    { key: "number", dir: "desc" },
  );

  const closeDecline = () => {
    setDecline(null);
    setDeclineNote("");
  };
  const href = (t: StatusTab) =>
    t === "all" ? "/admin/orders" : `/admin/orders?status=${t}`;
  const viewing = view ? (all.find((o) => o.id === view) ?? null) : null;
  const shownPaid = rows
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.amount, 0);

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room · Money"
        title={
          <>
            Every <em>order</em>, one ledger.
          </>
        }
        description="Purchases, refunds and free grants in one place. Every amount includes 18% GST."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Orders" },
        ]}
        actions={
          <Button
            variant="outline"
            icon="download"
            onClick={() =>
              downloadCsv(
                "tamada-orders.csv",
                [
                  "number",
                  "learner",
                  "email",
                  "course",
                  "subtotal",
                  "discount",
                  "amount",
                  "gst",
                  "method",
                  "provider_ref",
                  "status",
                  "date",
                ],
                rows.map((o) => [
                  o.number,
                  o.user?.name,
                  o.user?.email,
                  o.course?.title,
                  o.subtotal,
                  o.discount,
                  o.amount,
                  o.tax,
                  o.method,
                  o.providerRef,
                  statusOf(o),
                  o.createdAt.slice(0, 10),
                ]),
              )
            }
          >
            Export CSV
          </Button>
        }
      />
      <MoneyTabs current="orders" />

      <StatGrid>
        <StatTile
          index="01"
          label="Sales · last 30 days"
          value={formatINR(ledger30.revenue, { compact: true })}
          hint={`${plural(ledger30.enrollments, "sale")} · full ledger, GST incl.`}
          href="/admin/payments"
        />
        <StatTile
          index="02"
          label={`Average sale · ${ledgerMonth.label.slice(0, 3)}`}
          value={formatINR(ledgerMonth.averageOrder)}
          hint={`across ${plural(ledgerMonth.sales, "sale")}, after coupons`}
        />
        <StatTile
          index="03"
          label="Refund rate"
          value={`${refundRate.toFixed(1)}%`}
          hint={`${refunded.length} refunded in the sample`}
        />
        <StatTile
          index="04"
          label="Pending payments"
          value={formatNumber(counts.pending)}
          href="/admin/orders?status=pending"
          hint={
            counts.pending ? "Usually UPI timeouts" : "Nothing stuck right now"
          }
        />
      </StatGrid>

      <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
        <Section
          id="refunds"
          index="01"
          label="Refunds"
          note={`Policy: within ${REFUND_WINDOW_DAYS} days of buying, under ${REFUND_MAX_PROGRESS}% done, no certificate. You still make the call.`}
          title={
            requests.length ? (
              <>
                {plural(requests.length, "refund")} to check
              </>
            ) : (
              "Refunds to check"
            )
          }
        >
          {requests.length ? (
            <ol
              aria-label="Refund requests"
              className="divide-y divide-line border-y border-line border-t-fg"
            >
              {requests.map((o, i) => (
                <RefundRow
                  key={o.id}
                  o={o}
                  index={i + 1}
                  onDecline={() => setDecline(o)}
                  onRefund={() => setRefund(o)}
                  onView={() => setView(o.id)}
                />
              ))}
            </ol>
          ) : (
            <EmptyState
              compact
              align="start"
              art="none"
              eyebrow="Queue empty"
              title="No refund requests."
              body="When a learner asks for a refund, it lands here first."
              className="border-t border-fg px-0!"
            />
          )}
        </Section>

        <Section
          index="02"
          label="Methods"
          note={`Paid orders in the sample (${plural(paid.length, "order")}), by value.`}
          title="How people pay"
        >
          <Donut
            data={byMethod.map(({ label, value }) => ({
              label,
              value,
              tone: "ink",
            }))}
            centerLabel="paid, sample"
            centerValue={formatINR(paidTotal, { compact: true })}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="Paid order value in the sample, by payment method"
            className="gap-8 md:gap-12"
          />
        </Section>

        <WideSection
          id="ledger"
          index="03"
          label="Ledger"
          note={
            <span className="flex flex-col items-start gap-2">
              <Badge tone="neutral" size="sm">
                {sample.short}
              </Badge>
              <span>{sample.note}</span>
            </span>
          }
          title="All orders"
          action={
            <MonoMeta as="span" className="text-fg">
              {plural(rows.length, "order")} · {formatINR(shownPaid)} paid
            </MonoMeta>
          }
        >
          <Tabs
            label="Order status"
            value={tab}
            className="mb-6"
            items={[
              { id: "all", label: "All", count: counts.all, href: href("all") },
              { id: "paid", label: "Paid", count: counts.paid, href: href("paid") },
              {
                id: "pending",
                label: "Pending",
                count: counts.pending,
                href: href("pending"),
              },
              {
                id: "failed",
                label: "Failed",
                count: counts.failed,
                href: href("failed"),
              },
              {
                id: "refunded",
                label: "Refunded",
                count: counts.refunded,
                href: href("refunded"),
              },
              {
                id: "grant",
                label: "Admin grant",
                count: counts.grant,
                href: href("grant"),
              },
              {
                id: "refund_requests",
                label: "Refund asked",
                count: counts.refund_requests,
                href: href("refund_requests"),
              },
            ]}
          />

          <div ref={boxRef}>
            <DataTable<OrderRow>
              key={sortKey}
              caption="Orders"
              rows={rows}
              columns={columns}
              getRowId={(o) => o.id}
              search={{ placeholder: "Order no., learner, course or coupon" }}
              searchValue={q}
              onSearchChange={setQ}
              mobileFilters="sheet"
              filterCount={range === "all" ? 0 : 1}
              filters={
                // phones: this sits in the Filters sheet, full width under a visible label
                <label className="flex flex-col gap-1.5 max-sm:w-full">
                  <span className="text-[11.5px] font-semibold tracking-[0.12em] uppercase sm:sr-only">
                    Date range
                  </span>
                  <Select
                    selectSize="sm"
                    value={range}
                    onChange={(e) => setRange(e.target.value as Range)}
                    className="sm:max-w-[160px] sm:min-w-[160px]"
                    options={[
                      { value: "7d", label: "Last 7 days" },
                      { value: "30d", label: "Last 30 days" },
                      { value: "12m", label: "Last 12 months" },
                      { value: "all", label: "All time" },
                    ]}
                  />
                </label>
              }
              pageSize={12}
              rowActions={actionsFor}
              onRowClick={(o) => setView(o.id)}
              mobileRow={(o) => (
                <PhoneRow
                  title={<span className="font-mono text-[14px] tracking-[0.03em]">{o.number}</span>}
                  lines={[
                    `${o.user?.name ?? "Deleted account"} · ${o.course?.title ?? "Removed course"}`,
                    [
                      <StatusPill key="s" status={statusOf(o)} />,
                      o.status === "paid" &&
                        (o.refundRequest || o.refundDeclinedAt) && (
                          <RefundFlags key="r" o={o} size="md" />
                        ),
                      smartDate(o.createdAt),
                    ],
                  ]}
                  trailing={amountOf(o)}
                />
              )}
              initialSort={initialSort}
              empty={{
                title: "No orders here.",
                body: "Try another status or a wider date range.",
              }}
              dense={!wide}
              minWidth={compact ? 0 : 600}
              className={compact ? COMPACT_TABLE : undefined}
            />
          </div>
        </WideSection>
      </div>

      <OrderDrawer
        order={viewing}
        onClose={() => setView(null)}
        onRefund={(o) => setRefund(o)}
        onGrant={(o) => setGrant(o)}
      />
      <RefundModal order={refund} onClose={() => setRefund(null)} />
      <Modal
        open={!!decline}
        onClose={closeDecline}
        size="sm"
        eyebrow={decline ? `Refund · ${decline.number}` : "Refund"}
        title="Decline this refund?"
        description={
          decline
            ? `${decline.user?.name} keeps ${decline.course?.title} and the order stays paid. The request leaves the queue.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={closeDecline}>
              Cancel
            </Button>
            <Button type="submit" form="decline-form">
              Decline request
            </Button>
          </>
        }
      >
        <form
          id="decline-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!decline) return;
            const first = decline.user?.name?.split(" ")[0] ?? "The learner";
            demo.declineRefund(decline.id, declineNote);
            toast.info(`Refund for ${decline.number} declined.`, {
              description: declineNote.trim()
                ? `${first} sees your message in their orders and notifications.`
                : `${first} gets our standard “we couldn’t approve this” note.`,
            });
            closeDecline();
          }}
        >
          <Field
            label="Message to the learner"
            optional
            hint="Shown in their orders and notifications. Leave it empty to send our standard note."
          >
            <Textarea
              rows={4}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              maxLength={400}
              showCount
              placeholder="e.g. You’ve finished most of the course, so it’s outside our refund policy. Stuck somewhere? Reply and we’ll help."
            />
          </Field>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!grant}
        onClose={() => setGrant(null)}
        title="Grant access to this course?"
        description={
          grant
            ? `${grant.user?.name} gets ${grant.course?.title} for free. A ₹0 admin-grant order is added; this ${grant.status} order stays as it is.`
            : undefined
        }
        confirmLabel="Grant access"
        onConfirm={() => {
          if (!grant) return;
          demo.grantCourse(grant.userId, grant.courseId, adminId);
          toast.success(`${grant.user?.name} now has ${grant.course?.title}.`);
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------- refund queue row */
function RefundRow({
  o,
  index,
  onDecline,
  onRefund,
  onView,
}: {
  o: OrderRow;
  index: number;
  onDecline: () => void;
  onRefund: () => void;
  onView: () => void;
}) {
  const db = useDb();
  const ctx = refundContext(o, db);
  return (
    <li className="grid gap-x-8 gap-y-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:py-6">
      <div className="flex min-w-0 gap-4">
        <Idx n={index} className="mt-[7px] w-5" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="t-app-h3">{o.user?.name ?? "A learner"}</span>
            <button
              type="button"
              onClick={onView}
              className="font-mono text-[11.5px] tracking-[0.06em] text-muted uppercase underline-offset-[3px] hf:text-fg hf:underline"
            >
              {o.number} · {formatINR(o.amount)}
            </button>
          </p>
          <p className="t-small mt-0.5 truncate text-muted">{o.course?.title}</p>

          <blockquote className="mt-4 border-l border-line-strong pl-4">
            <p className="font-heading text-[16px] leading-snug font-medium tracking-[-0.015em] [overflow-wrap:anywhere]">
              “{o.refundRequest?.reason}”
            </p>
            <MonoMeta className="mt-1.5">
              Asked {timeAgo(o.refundRequest!.requestedAt)} · bought{" "}
              {smartDate(o.createdAt)} (
              {ctx.boughtDaysAgo === 0
                ? "today"
                : `${plural(ctx.boughtDaysAgo, "day")} ago`}
              ) · {ctx.progress}% done
            </MonoMeta>
          </blockquote>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {ctx.insidePolicy && (
              <Badge tone="mint" size="sm" dot>
                Inside policy
              </Badge>
            )}
            {ctx.outsideWindow && (
              <Badge tone="flame" size="sm" dot>
                Outside {REFUND_WINDOW_DAYS}-day window
              </Badge>
            )}
            {ctx.progress >= REFUND_MAX_PROGRESS && (
              <Badge tone="flame" size="sm" dot>
                {ctx.progress}% done
              </Badge>
            )}
            {ctx.certificate && (
              <Badge tone="flame" size="sm" dot>
                Certificate earned
              </Badge>
            )}
          </div>
          {ctx.policyNote && (
            <RuleNote tone="red" className="mt-3.5">
              {ctx.policyNote}
            </RuleNote>
          )}
        </div>
      </div>
      <div className="flex gap-2 max-md:pl-9 max-sm:pl-0 max-sm:[&>*]:flex-1 md:w-[176px] md:flex-col md:justify-center">
        <Button size="sm" variant="danger" icon="refresh" onClick={onRefund}>
          Issue refund
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------------------- drawer */
function OrderDrawer({
  order: o,
  onClose,
  onRefund,
  onGrant,
}: {
  order: OrderRow | null;
  onClose: () => void;
  onRefund: (o: OrderRow) => void;
  onGrant: (o: OrderRow) => void;
}) {
  const db = useDb();
  const enrolled = o ? isEnrolled(o.userId, o.courseId, db) : false;
  const totalLabel = o
    ? o.status === "failed"
      ? "Amount (not charged)"
      : o.status === "pending"
        ? "Amount (awaiting confirmation)"
        : o.status === "refunded"
          ? "Charged, then refunded"
          : "Total charged"
    : "";
  return (
    <Drawer
      open={!!o}
      onClose={onClose}
      width={480}
      eyebrow={o ? `Order ${o.number}` : "Order"}
      title={o ? (o.course?.title ?? "Removed course") : "Order"}
      description={o ? formatDate(o.createdAt, "datetime") : undefined}
      footer={
        o && (
          <>
            {!enrolled && (
              <Button
                size="sm"
                variant="outline"
                icon="unlock"
                onClick={() => onGrant(o)}
              >
                Grant access
              </Button>
            )}
            {o.status === "paid" && o.provider !== "admin" && (
              <Button
                size="sm"
                variant="danger"
                icon="refresh"
                onClick={() => onRefund(o)}
              >
                Issue refund
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      {o && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <Figure
              label={totalLabel}
              value={
                <span className={o.status === "failed" ? "text-muted line-through" : undefined}>
                  {formatINR(o.amount)}
                </span>
              }
              strong
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status={statusOf(o)} />
              {enrolled ? (
                <Badge tone="mint">Has access</Badge>
              ) : (
                <Badge tone="neutral">No access</Badge>
              )}
            </div>
          </div>

          <section>
            <PanelLabel>Learner</PanelLabel>
            <PersonCell
              user={o.user}
              href={`/admin/users/${o.userId}`}
              size="md"
            />
          </section>
          <section>
            <PanelLabel>Course</PanelLabel>
            <CourseCell
              course={o.course}
              href={o.course ? `/admin/courses/${o.course.id}` : undefined}
              sub={
                o.course ? `List price ${formatINR(o.course.price)}` : undefined
              }
              wide
            />
          </section>
          <section>
            <PanelLabel>Payment</PanelLabel>
            {o.status === "failed" && (
              <RuleNote tone="red" className="mb-4">
                Payment failed at {providerName(o)}, so the learner wasn&apos;t
                charged.
              </RuleNote>
            )}
            {o.status === "pending" && (
              <RuleNote className="mb-4">
                Awaiting confirmation from {providerName(o)}. Nothing is
                charged until it clears.
              </RuleNote>
            )}
            <DescriptionList
              className="border-t border-fg pt-3"
              items={[
                { label: "Subtotal", value: formatINR(o.subtotal) },
                {
                  label: o.couponCode ? `Coupon ${o.couponCode}` : "Discount",
                  value: o.discount ? `−${formatINR(o.discount)}` : "—",
                },
                { label: "GST included (18%)", value: formatINR(o.tax) },
                { label: "Method", value: o.method },
                { label: "Provider", value: providerName(o) },
                {
                  label: "Reference",
                  value: (
                    <span className="font-mono text-[12px] break-all">
                      {o.providerRef}
                    </span>
                  ),
                },
              ]}
            />
          </section>
          {(o.refundRequest || o.refundedAt || o.refundDeclinedAt) && (
            <section>
              <PanelLabel>Refund</PanelLabel>
              <RuleNote tone={o.refundRequest ? "red" : "ink"}>
                <div className="space-y-2">
                  {o.refundRequest && (
                    <p>
                      Asked {timeAgo(o.refundRequest.requestedAt)}: “
                      {o.refundRequest.reason}”
                    </p>
                  )}
                  {o.refundDeclinedAt && (
                    <p className="break-words">
                      <span className="font-semibold text-fg">
                        {o.refundRequest ? "An earlier request was" : "Request"}{" "}
                        declined {formatDate(o.refundDeclinedAt, "medium")}
                      </span>
                      {o.refundDeclineNote ? (
                        <>: “{o.refundDeclineNote}”</>
                      ) : (
                        ". Our standard note was sent to the learner."
                      )}
                    </p>
                  )}
                  {o.refundedAt && (
                    <p>
                      Refunded {formatDate(o.refundedAt, "datetime")}.{" "}
                      {o.refundReason}
                    </p>
                  )}
                </div>
              </RuleNote>
            </section>
          )}
          <p className="text-[13px] text-muted">
            Need the learner&apos;s other orders?{" "}
            <Link
              href={`/admin/users/${o.userId}`}
              className="font-medium text-fg underline underline-offset-[3px] hf:text-red-deep"
            >
              Open their profile
            </Link>
          </p>
        </div>
      )}
    </Drawer>
  );
}

function providerName(o: OrderRow) {
  return o.provider === "admin"
    ? "Admin grant"
    : o.provider === "upi"
      ? "UPI"
      : o.provider[0].toUpperCase() + o.provider.slice(1);
}
