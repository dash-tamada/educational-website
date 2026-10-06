"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  Donut,
  Drawer,
  EmptyState,
  PageHeader,
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
import { RefundModal } from "./modals";
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
  const wide = boxW == null || boxW >= 1160;

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
  const sample = useMemo(
    () =>
      getLedgerSample(range, db),
    [range, db],
  );
  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of paid) m[o.method] = (m[o.method] ?? 0) + o.amount;
    return Object.entries(m)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [paid]);
  const methodTones = {
    UPI: "green",
    Card: "blue",
    Netbanking: "tangerine",
    Wallet: "hotpink",
  } as const;

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
                  className="font-bold whitespace-nowrap underline-offset-2 hf:underline"
                >
                  {o.number}
                </button>
                <span className="font-bold whitespace-nowrap">
                  {amountOf(o)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink/70">
                {o.user?.name ?? "Deleted account"} ·{" "}
                {o.course?.title ?? "Removed course"}
              </span>
              <CompactFacts>
                <StatusPill status={statusOf(o)} size="sm" />
                {o.refundRequest && o.status === "paid" && (
                  <Badge tone="flame" size="sm">
                    Refund asked
                  </Badge>
                )}
                {!o.refundRequest && o.refundDeclinedAt && o.status === "paid" && (
                  <Badge tone="neutral" size="sm">
                    Refund declined
                  </Badge>
                )}
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
              <span className="block font-bold whitespace-nowrap underline-offset-2 hf:underline">
                {o.number}
              </span>
              {!showCourse ? (
                // the Course column doesn't fit: say what was bought right here
                <span className="block max-w-[200px] truncate text-[12.5px] font-semibold text-ink/60">
                  {o.course?.title ?? "Removed course"}
                </span>
              ) : (
                wide && (
                  <span className="block font-mono text-[11.5px] text-ink/45">
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
            <span className="line-clamp-2 min-w-[140px]">
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
              <span className="block font-bold">{amountOf(o)}</span>
              {o.couponCode && (
                <span className="block text-[11.5px] font-semibold text-ink/50">
                  {o.couponCode} −{formatINR(o.discount)}
                </span>
              )}
              {!showDate && (
                <span className="block text-[11.5px] font-semibold text-ink/50">
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
          minBox: 1120,
          cell: (o) => <span className="text-ink/75">{o.method}</span>,
          sortValue: (o) => o.method,
        },
        {
          key: "date",
          header: "Date",
          minBox: 880,
          cell: (o) => (
            <span className="whitespace-nowrap text-ink/75">
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
              {o.refundRequest && o.status === "paid" && (
                <Badge tone="flame" size="sm">
                  Refund asked
                </Badge>
              )}
              {!o.refundRequest && o.refundDeclinedAt && o.status === "paid" && (
                <Badge tone="neutral" size="sm">
                  Refund declined
                </Badge>
              )}
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

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Money"
        eyebrowTone="purple"
        title="Money moving through the club."
        description="Purchases, refunds and free grants in one place. Every amount includes 18% GST."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Orders" },
        ]}
        actions={
          <Button
            variant="secondary"
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

      <StatGrid className="mb-6">
        <StatTile
          label="Sales · last 30 days"
          value={formatINR(ledger30.revenue, { compact: true })}
          tone="mint"
          icon="wallet"
          hint={`${plural(ledger30.enrollments, "sale")} · full ledger, GST incl.`}
          href="/admin/payments"
        />
        <StatTile
          label={`Average sale · ${ledgerMonth.label.slice(0, 3)}`}
          value={formatINR(ledgerMonth.averageOrder)}
          tone="sun"
          icon="receipt"
          hint={`across ${plural(ledgerMonth.sales, "sale")}, after coupons`}
        />
        <StatTile
          label="Refund rate"
          value={`${refundRate.toFixed(1)}%`}
          tone="lilac"
          icon="refresh"
          hint={`${refunded.length} refunded in the sample`}
        />
        <StatTile
          label="Pending payments"
          value={formatNumber(counts.pending)}
          tone="white"
          icon="clock"
          href="/admin/orders?status=pending"
          hint={
            counts.pending ? "Usually UPI timeouts" : "Nothing stuck right now"
          }
        />
      </StatGrid>

      <div className="mb-6 grid gap-4 md:gap-6 xl:grid-cols-3">
        <Card
          as="section"
          className="xl:col-span-2"
          aria-labelledby="refunds-title"
        >
          <CardHeader
            id="refunds-title"
            title="Refunds to check"
            description={
              requests.length
                ? `Learners who asked for their money back. Policy: within ${REFUND_WINDOW_DAYS} days of buying, under ${REFUND_MAX_PROGRESS}% done, no certificate. You still make the call.`
                : undefined
            }
          />
          {requests.length ? (
            <ul className="divide-y divide-ink/[0.07]">
              {requests.map((o) => {
                const ctx = refundContext(o, db);
                return (
                <li
                  key={o.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-bold">
                        {o.user?.name}
                      </span>
                      <span className="text-[13px] font-semibold text-ink/55">
                        {o.number} · {formatINR(o.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate t-small text-ink/65">
                      {o.course?.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral" size="sm">
                        Bought {smartDate(o.createdAt)} ·{" "}
                        {ctx.boughtDaysAgo === 0
                          ? "today"
                          : `${plural(ctx.boughtDaysAgo, "day")} ago`}
                      </Badge>
                      <Badge
                        tone={ctx.progress >= REFUND_MAX_PROGRESS ? "flame" : "neutral"}
                        size="sm"
                      >
                        {ctx.progress}% done
                      </Badge>
                      {ctx.outsideWindow && (
                        <Badge tone="flame" size="sm" dot>
                          Outside {REFUND_WINDOW_DAYS}-day window
                        </Badge>
                      )}
                      {ctx.certificate && (
                        <Badge tone="flame" size="sm" dot>
                          Certificate earned
                        </Badge>
                      )}
                      {ctx.insidePolicy && (
                        <Badge tone="mint" size="sm" dot>
                          Inside policy
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 rounded-tag bg-butter px-3 py-2 t-small">
                      “{o.refundRequest?.reason}” · asked{" "}
                      {timeAgo(o.refundRequest!.requestedAt)}
                    </p>
                    {ctx.policyNote && (
                      <p className="mt-1.5 text-[13px] font-semibold text-[#9a2c00]">
                        {ctx.policyNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 max-sm:[&>*]:flex-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="max-sm:bg-cream"
                      onClick={() => setDecline(o)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="refresh"
                      onClick={() => setRefund(o)}
                    >
                      Issue refund
                    </Button>
                  </div>
                </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              art="buddy"
              tone="mint"
              title="No refund requests."
              body="When a learner asks for a refund, it lands here first."
            />
          )}
        </Card>
        <Card as="section" aria-labelledby="methods-title">
          <CardHeader
            id="methods-title"
            title="How people pay"
            description={`Paid orders in the sample (${plural(paid.length, "order")}), by value.`}
          />
          <Donut
            data={byMethod.map(({ label, value }) => ({
              label,
              value,
              tone: methodTones[label as keyof typeof methodTones] ?? "lilac",
            }))}
            centerLabel="paid, sample"
            centerValue={formatINR(
              paid.reduce((s, o) => s + o.amount, 0),
              { compact: true },
            )}
            format={(n) => formatINR(n, { compact: true })}
            ariaLabel="Paid order value in the sample, by payment method"
          />
        </Card>
      </div>

      <Tabs
        label="Order status"
        value={tab}
        className="mb-4"
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
          <span className="text-[14px] font-bold sm:sr-only">Date range</span>
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
        toolbar={
          <span className="text-[13px] font-semibold text-ink/55">
            {plural(rows.length, "order")} ·{" "}
            {formatINR(
              rows
                .filter((o) => o.status === "paid")
                .reduce((s, o) => s + o.amount, 0),
            )}{" "}
            paid
          </span>
        }
        pageSize={12}
        rowActions={actionsFor}
        onRowClick={(o) => setView(o.id)}
        mobileRow={(o) => (
          <PhoneRow
            title={o.number}
            lines={[
              `${o.user?.name ?? "Deleted account"} · ${o.course?.title ?? "Removed course"}`,
              [
                <StatusPill key="s" status={statusOf(o)} />,
                o.refundRequest && o.status === "paid" && (
                  <Badge key="r" tone="flame">
                    Refund asked
                  </Badge>
                ),
                !o.refundRequest && o.refundDeclinedAt && o.status === "paid" && (
                  <Badge key="d" tone="neutral">
                    Refund declined
                  </Badge>
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
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 t-small text-ink/60">
        <Badge tone="neutral" size="sm">
          {sample.short}
        </Badge>
        <span>{sample.note}</span>
      </p>

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
        title="Decline this refund?"
        description={
          decline
            ? `${decline.user?.name} keeps ${decline.course?.title} and the order stays paid. The request leaves the queue.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeDecline}>
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
  return (
    <Drawer
      open={!!o}
      onClose={onClose}
      width={460}
      title={o ? `Order ${o.number}` : "Order"}
      description={o ? formatDate(o.createdAt, "datetime") : undefined}
      footer={
        o && (
          <>
            {!enrolled && (
              <Button
                size="sm"
                variant="secondary"
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
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={statusOf(o)} />
            {enrolled ? (
              <Badge tone="mint">Has access</Badge>
            ) : (
              <Badge tone="neutral">No access</Badge>
            )}
          </div>
          <div className="rounded-card bg-cream p-4">
            <PersonCell
              user={o.user}
              href={`/admin/users/${o.userId}`}
              size="md"
            />
          </div>
          <div>
            <CourseCell
              course={o.course}
              href={o.course ? `/admin/courses/${o.course.id}` : undefined}
              sub={
                o.course ? `List price ${formatINR(o.course.price)}` : undefined
              }
              wide
            />
          </div>
          <section>
            <h3 className="mb-2 t-app-h3">Payment</h3>
            {o.status === "failed" && (
              <p className="mb-3 rounded-tag bg-[#ffe1d4] px-3 py-2 text-[14px] font-semibold text-[#8a2600]">
                Payment failed at {providerName(o)}, so the learner wasn&apos;t
                charged.
              </p>
            )}
            {o.status === "pending" && (
              <p className="mb-3 rounded-tag bg-butter px-3 py-2 text-[14px] font-semibold">
                Awaiting confirmation from {providerName(o)}. Nothing is
                charged until it clears.
              </p>
            )}
            <DescriptionList
              items={[
                { label: "Subtotal", value: formatINR(o.subtotal) },
                {
                  label: o.couponCode ? `Coupon ${o.couponCode}` : "Discount",
                  value: o.discount ? `−${formatINR(o.discount)}` : "—",
                },
                { label: "GST included (18%)", value: formatINR(o.tax) },
                {
                  label: (
                    <span className="font-bold text-ink">
                      {o.status === "failed"
                        ? "Amount (not charged)"
                        : o.status === "pending"
                          ? "Amount (awaiting confirmation)"
                          : o.status === "refunded"
                            ? "Charged, then refunded"
                            : "Total charged"}
                    </span>
                  ),
                  value: (
                    <span
                      className={
                        o.status === "failed"
                          ? "text-[16px] text-ink/50 line-through"
                          : "text-[16px]"
                      }
                    >
                      {formatINR(o.amount)}
                    </span>
                  ),
                },
                { label: "Method", value: o.method },
                { label: "Provider", value: providerName(o) },
                {
                  label: "Reference",
                  value: (
                    <span className="font-mono text-[12.5px] break-all">
                      {o.providerRef}
                    </span>
                  ),
                },
              ]}
            />
          </section>
          {(o.refundRequest || o.refundedAt || o.refundDeclinedAt) && (
            <section className="rounded-card bg-butter p-4">
              <h3 className="t-app-h3">Refund</h3>
              {o.refundRequest && (
                <p className="mt-2 t-small">
                  Asked {timeAgo(o.refundRequest.requestedAt)}: “
                  {o.refundRequest.reason}”
                </p>
              )}
              {o.refundDeclinedAt && (
                <p className="mt-2 t-small break-words">
                  <span className="font-bold">
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
                <p className="mt-2 t-small">
                  Refunded {formatDate(o.refundedAt, "datetime")}.{" "}
                  {o.refundReason}
                </p>
              )}
            </section>
          )}
          <p className="text-[13px] text-ink/50">
            Need the learner&apos;s other orders?{" "}
            <Link
              href={`/admin/users/${o.userId}`}
              className="font-bold text-ink underline-offset-2 hf:underline"
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
