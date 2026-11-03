"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  Button,
  DataTable,
  DescriptionList,
  Drawer,
  EmptyState,
  Field,
  Icon,
  PageHeader,
  Select,
  StatGrid,
  StatTile,
  StatusPill,
  Textarea,
  toast,
  Tooltip,
  type Column,
} from "@/components/app";
import { cropSrc } from "@/lib/img";
import { lessonPoster } from "@/lib/media";
import { FLAGSHIP } from "@/lib/content/site";
import { useDb, demo } from "@/lib/demo/store";
import {
  REFUND_MAX_PROGRESS,
  REFUND_WINDOW_DAYS,
  formatDate,
  formatINR,
  getOrders,
  getRefundEligibility,
  isEnrolled,
  timeAgo,
  type Db,
  type OrderRow,
} from "@/lib/mock";
import { Hydrated, TablePageSkeleton } from "./Hydrated";
import { BADGE_SM, TILE_TIGHT } from "./bits";
import type { Course } from "@/lib/mock";
import { useMinWidth } from "./hooks";
import {
  downloadInvoice,
  invoiceLabel,
  isGrant,
  providerLabel,
  TAX_LABEL,
} from "./invoice";
import { useStudentProfile } from "./prefs";

type StatusFilter =
  "all" | "paid" | "requested" | "refunded" | "grant" | "other";

const statusKey = (o: OrderRow) => (isGrant(o) ? "grant" : o.status);
const hasInvoice = (o: OrderRow) =>
  o.status !== "failed" && o.status !== "pending";
/** coupon savings: mono, muted (no green: red is the only accent) */
const SAVINGS = "font-mono text-[11px] tracking-[0.04em] uppercase text-muted";
/** the course still: the flagship uses its module-one poster */
const thumbOf = (c: Course) => (c.id === FLAGSHIP.id ? lessonPoster(1).src : c.thumbnail);

const HEADER = {
  eyebrow: "Student space",
  title: (
    <>
      Orders and <em>receipts</em>.
    </>
  ),
  description: "Every course you bought, with a GST invoice a click away.",
  breadcrumbs: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orders" },
  ],
};

/** Keep ?order= in the address bar in step with the drawer (shareable, and a reload reopens the same order). */
function syncOrderParam(number: string | null) {
  const url = new URL(window.location.href);
  if (number) url.searchParams.set("order", number);
  else url.searchParams.delete("order");
  const next = url.pathname + url.search + url.hash;
  if (
    next !==
    window.location.pathname + window.location.search + window.location.hash
  )
    window.history.replaceState(window.history.state, "", next);
}

/** The page's own skeleton (real header), shared by the store gate and the route's loading.tsx. */
export function OrdersFallback() {
  return <TablePageSkeleton header={<PageHeader {...HEADER} />} />;
}

export function Orders({ initialOrder }: { initialOrder?: string }) {
  return (
    <Hydrated fallback={<OrdersFallback />}>
      <OrdersInner initialOrder={initialOrder} />
    </Hydrated>
  );
}

function OrdersInner({ initialOrder }: { initialOrder?: string }) {
  const db = useDb();
  const profile = useStudentProfile();
  const uid = profile.uid;
  const wide = useMinWidth(1280);
  const sm = useMinWidth(640);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  const all = useMemo(
    () => getOrders({ userId: uid, pageSize: 500 }, db).items,
    [uid, db],
  );
  const findOrder = (key: string | null) =>
    key
      ? (all.find(
          (o) => o.id === key || o.number.toLowerCase() === key.toLowerCase(),
        ) ?? null)
      : null;
  const [openId, setOpenId] = useState<string | null>(
    () => findOrder(initialOrder ?? null)?.id ?? null,
  );
  const open = all.find((o) => o.id === openId) ?? null;

  // a deep link to an order this learner doesn't have: say so and tidy the URL (once, even in strict mode)
  const warned = useRef(false);
  useEffect(() => {
    if (!initialOrder || warned.current) return;
    warned.current = true;
    if (!findOrder(initialOrder)) {
      toast.error(`We couldn't find order ${initialOrder}`, {
        description: "It may belong to another account. Here are all of yours.",
      });
      syncOrderParam(null);
    } else syncOrderParam(findOrder(initialOrder)!.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openOrder = (o: OrderRow) => {
    setOpenId(o.id);
    syncOrderParam(o.number);
  };
  const closeOrder = () => {
    setOpenId(null);
    syncOrderParam(null);
  };

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((o) => {
      const okStatus =
        status === "all"
          ? true
          : status === "grant"
            ? isGrant(o)
            : status === "requested"
              ? !!o.refundRequest
              : status === "other"
                ? !isGrant(o) &&
                  (o.status === "pending" || o.status === "failed")
                : !isGrant(o) && o.status === status;
      if (!okStatus) return false;
      if (!words.length) return true;
      const hay =
        `${o.number} ${o.providerRef} ${o.couponCode ?? ""} ${o.course?.title ?? ""} ${o.method}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [all, status, q]);

  const paid = all.filter((o) => o.status === "paid" && !isGrant(o));
  const spent = paid.reduce((s, o) => s + o.amount, 0);
  const saved = paid.reduce((s, o) => s + o.discount, 0);
  const requested = all.filter((o) => !!o.refundRequest).length;
  const buyer = {
    name: profile.name,
    email: profile.email,
    city: profile.city,
  };

  const invoice = (o: OrderRow) => {
    downloadInvoice(o, buyer);
    toast.success(
      isGrant(o) ? "Access confirmation downloaded" : "Invoice downloaded",
      { description: `${o.number} · sample document for the demo` },
    );
  };

  const statusCell = (o: OrderRow) => (
    <span className="inline-flex flex-col items-start gap-1">
      <StatusPill
        status={statusKey(o)}
        label={isGrant(o) ? "Gift" : undefined}
        size="sm"
        className={BADGE_SM}
      />
      {o.refundRequest && (
        <Badge size="sm" tone="butter" className={BADGE_SM}>
          Refund requested
        </Badge>
      )}
    </span>
  );

  const columns: Column<OrderRow>[] = [
    ...(wide
      ? [
          {
            key: "number",
            header: "Order",
            width: "136px",
            cell: (o: OrderRow) => (
              <div>
                <span className="font-mono text-[13px] font-medium whitespace-nowrap">
                  {o.number}
                </span>
                <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
                  {isGrant(o) ? "Gift" : o.method}
                </span>
              </div>
            ),
            sortValue: (o: OrderRow) => o.number,
          },
        ]
      : []),
    {
      key: "course",
      header: "Course",
      cell: (o) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative aspect-[16/10] w-[72px] shrink-0 overflow-hidden bg-ink max-sm:hidden">
            {o.course && <Image src={cropSrc(thumbOf(o.course), 10 / 16)} alt="" fill sizes="72px" className="object-cover" />}
          </span>
          <span className="min-w-0">
            <span className="line-clamp-2 font-medium tracking-[-0.01em]">
              {o.course?.title ?? "Removed course"}
            </span>
            {/* below xl the Order and Date columns fold into this cell */}
            {!wide && (
              <span className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] tracking-[0.04em] text-muted uppercase">
                <span className="font-mono whitespace-nowrap">{o.number}</span>
                <span className="whitespace-nowrap">
                  {formatDate(o.createdAt, "short")}
                </span>
                <span className="whitespace-nowrap">
                  {isGrant(o) ? "Gift" : o.method}
                </span>
              </span>
            )}
            {o.couponCode && (
              <span className={clsx("mt-1 block", SAVINGS)}>
                {o.couponCode} · saved {formatINR(o.discount)}
              </span>
            )}
            {!sm && <span className="mt-1.5 flex">{statusCell(o)}</span>}
          </span>
        </div>
      ),
      sortValue: (o) => o.course?.title ?? "",
    },
    ...(wide
      ? [
          {
            key: "date",
            header: "Date",
            width: "124px",
            cell: (o: OrderRow) => (
              <span className="font-mono text-[12.5px] whitespace-nowrap tabular-nums">
                {formatDate(o.createdAt)}
              </span>
            ),
            sortValue: (o: OrderRow) => o.createdAt,
          },
        ]
      : []),
    {
      key: "amount",
      header: "Amount",
      align: "right",
      width: "108px",
      cell: (o) => (
        <span className="font-mono text-[13.5px] font-medium whitespace-nowrap tabular-nums">
          {formatINR(o.amount)}
        </span>
      ),
      sortValue: (o) => o.amount,
    },
    {
      key: "status",
      header: "Status",
      width: "150px",
      hideBelow: "sm",
      cell: statusCell,
      sortValue: (o) => (o.refundRequest ? "refund-requested" : statusKey(o)),
    },
    {
      key: "invoice",
      header: <span className="sr-only">Invoice</span>,
      width: "56px",
      align: "right",
      hideBelow: "md",
      cell: (o) =>
        hasInvoice(o) ? (
          <Tooltip label={invoiceLabel(o)}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="download"
              aria-label={`${invoiceLabel(o)} for ${o.number}`}
              onClick={(e) => {
                e.stopPropagation();
                invoice(o);
              }}
            />
          </Tooltip>
        ) : null,
    },
  ];

  const filtered = status !== "all" || q.trim() !== "";

  return (
    <div className="app-enter">
      <PageHeader {...HEADER} />

      {all.length === 0 ? (
        <div className="border-t border-fg">
          <EmptyState
            art="none"
            align="start"
            eyebrow="00 orders"
            className="px-0!"
            title="No orders yet. Your wallet thanks you."
            body="When you buy the course, the receipt and a GST invoice land here. Until then, the first lesson is free."
            action={
              <>
                <Button href={FLAGSHIP.freeLessonHref} variant="red" icon="play">
                  Watch free lesson
                </Button>
                <Button href={FLAGSHIP.href} variant="outline">
                  Course page
                </Button>
              </>
            }
          />
        </div>
      ) : (
        <>
          <StatGrid className="mb-10 md:mb-12">
            <StatTile
              className={TILE_TIGHT}
              label="Total spent"
              value={formatINR(spent)}
              variant="ink"
              index="01"
              hint="GST included"
            />
            <StatTile
              className={TILE_TIGHT}
              label="Courses bought"
              value={paid.length}
              index="02"
              hint={
                all.some(isGrant)
                  ? `+ ${all.filter(isGrant).length} gifted`
                  : undefined
              }
            />
            <StatTile
              className={TILE_TIGHT}
              label="Saved with codes"
              value={formatINR(saved)}
              index="03"
              hint={
                saved
                  ? `on ${paid.filter((o) => o.discount > 0).length} of ${paid.length} orders`
                  : "try WELCOME10 at checkout"
              }
            />
            <StatTile
              className={TILE_TIGHT}
              label="Last purchase"
              value={
                paid[0] ? formatDate(paid[0].createdAt, "short") : "None yet"
              }
              index="04"
              hint={paid[0] ? timeAgo(paid[0].createdAt) : undefined}
            />
          </StatGrid>

          <DataTable
            caption="Your orders"
            className="[&_table]:table-fixed"
            rows={rows}
            getRowId={(o) => o.id}
            columns={columns}
            search={{ placeholder: "Search by order, course or code" }}
            searchValue={q}
            onSearchChange={setQ}
            mobileFilters="sheet"
            filterCount={status !== "all" ? 1 : 0}
            mobileRow={(o) => <OrderPhoneRow o={o} />}
            filters={
              <div className="w-full sm:w-52">
                <label
                  htmlFor="orders-status"
                  className="mb-1.5 block text-[14px] font-bold sm:sr-only"
                >
                  Status
                </label>
                <Select
                  id="orders-status"
                  selectSize="sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "paid", label: "Paid" },
                    {
                      value: "requested",
                      label: `Refund requested${requested ? ` (${requested})` : ""}`,
                    },
                    { value: "refunded", label: "Refunded" },
                    { value: "grant", label: "Gifts" },
                    { value: "other", label: "Pending / failed" },
                  ]}
                />
              </div>
            }
            initialSort={wide ? { key: "date", dir: "desc" } : undefined}
            key={wide ? "wide" : "narrow"}
            onRowClick={openOrder}
            rowActions={(o) => [
              {
                label: "View details",
                icon: "eye",
                onSelect: () => openOrder(o),
              },
              {
                label: invoiceLabel(o),
                icon: "download",
                onSelect: () => invoice(o),
                disabled: !hasInvoice(o),
              },
              ...(o.course && isEnrolled(uid, o.course.id, db)
                ? [
                    {
                      label: "Go to course",
                      icon: "play" as const,
                      href: `/learn/${o.course.slug}`,
                    },
                  ]
                : []),
            ]}
            pageSize={10}
            minWidth={sm ? 560 : 320}
            empty={{
              title: filtered ? "No orders match." : "No orders yet.",
              body: filtered
                ? "Nothing with that status or search. Clear the filters to see every order."
                : "When you buy a course, the receipt lands here.",
              action: filtered ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon="refresh"
                  onClick={() => {
                    setStatus("all");
                    setQ("");
                  }}
                >
                  Show all orders
                </Button>
              ) : (
                <Button href={FLAGSHIP.href} variant="outline" size="sm">
                  Course page
                </Button>
              ),
              art: "none",
            }}
          />
          <p className="mt-6 flex items-start gap-2.5 border-t border-line pt-4 t-small text-muted">
            <Icon name="info" className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
            <span>
              Changed your mind? Open an order to ask for a refund (within{" "}
              {REFUND_WINDOW_DAYS} days, under {REFUND_MAX_PROGRESS}% watched).
              Anything else, write to us from the{" "}
              <Link
                href="/contact"
                className="text-fg underline decoration-line-strong underline-offset-4 hf:text-red hf:decoration-red"
              >
                contact page
              </Link>{" "}
              with your order number.
            </span>
          </p>
        </>
      )}

      <Drawer
        open={!!open}
        onClose={closeOrder}
        eyebrow="Receipt"
        title={open ? `Order ${open.number}` : "Order"}
        description={open ? formatDate(open.createdAt, "datetime") : undefined}
        footer={
          open && (
            <>
              {hasInvoice(open) && (
                <Button
                  variant="primary"
                  icon="download"
                  onClick={() => invoice(open)}
                >
                  {isGrant(open) ? "Download confirmation" : "Download invoice"}
                </Button>
              )}
              {open.course && isEnrolled(uid, open.course.id, db) && (
                <Button
                  variant="outline"
                  href={`/learn/${open.course.slug}`}
                  iconRight="arrow-right"
                >
                  Go to course
                </Button>
              )}
            </>
          )
        }
      >
        {open && <OrderDetails key={open.id} o={open} db={db} />}
      </Drawer>
    </div>
  );
}

/** Phone list row (S-02): thumb, title, "TM-25565 · 30 Sep · UPI", amount with the status under it. */
function OrderPhoneRow({ o }: { o: OrderRow }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative size-12 shrink-0 overflow-hidden bg-ink">
        {o.course && <Image src={cropSrc(thumbOf(o.course), 1)} alt="" fill sizes="48px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] leading-snug font-medium">
          {o.course?.title ?? "Removed course"}
        </span>
        <span className="mt-1 block truncate font-mono text-[11px] tracking-[0.04em] text-muted uppercase">
          <span className="font-mono">{o.number}</span> ·{" "}
          {formatDate(o.createdAt, "short")} · {isGrant(o) ? "Gift" : o.method}
        </span>
        {o.couponCode && (
          <span className={clsx("mt-0.5 block truncate", SAVINGS)}>
            {o.couponCode} · saved {formatINR(o.discount)}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[14px] font-medium whitespace-nowrap tabular-nums">
          {formatINR(o.amount)}
        </span>
        <StatusPill
          status={statusKey(o)}
          label={isGrant(o) ? "Gift" : undefined}
          size="sm"
          className={BADGE_SM}
        />
        {o.refundRequest && (
          <Badge size="sm" tone="butter" className={BADGE_SM}>
            Refund asked
          </Badge>
        )}
      </span>
    </div>
  );
}

function OrderDetails({ o, db }: { o: OrderRow; db: Db }) {
  const grant = isGrant(o);
  return (
    <div className="space-y-5">
      {o.course && (
        <Link
          href={`/courses/${o.course.slug}`}
          className="group grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 border-y border-line py-3"
        >
          <span className="relative aspect-[16/10] overflow-hidden bg-ink">
            <Image src={cropSrc(thumbOf(o.course), 10 / 16)} alt="" fill sizes="96px" className="object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block font-heading text-[17px] leading-tight font-semibold tracking-[-0.02em] transition-colors group-hf:text-red">
              {o.course.title}
            </span>
            <span className="mt-1.5 block font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
              Lifetime access · {o.course.language}
            </span>
          </span>
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Status</span>
        <span className="flex flex-wrap justify-end gap-1.5">
          <StatusPill
            status={statusKey(o)}
            label={grant ? "Gift" : undefined}
          />
          {o.refundRequest && <Badge tone="butter">Refund requested</Badge>}
        </span>
      </div>
      {grant ? (
        <p className="border-l-2 border-fg py-1 pl-4 t-small text-muted">
          The Tamada team gave you this course. No payment was taken, and it
          stays yours.
        </p>
      ) : (
        <div className="border-y border-line py-4">
          <DescriptionList
            items={[
              { label: "Course price", value: formatINR(o.subtotal) },
              ...(o.discount
                ? [
                    {
                      label: `Discount${o.couponCode ? ` (${o.couponCode})` : ""}`,
                      value: (
                        <span className={SAVINGS}>
                          −{formatINR(o.discount)}
                        </span>
                      ),
                    },
                  ]
                : []),
              { label: "Taxable value", value: formatINR(o.amount - o.tax) },
              { label: TAX_LABEL, value: formatINR(o.tax) },
              {
                label: (
                  <span className="text-fg">
                    Total {o.status === "refunded" ? "refunded" : "paid"}
                  </span>
                ),
                value: (
                  <span className="t-display-s text-[1.5rem]">{formatINR(o.amount)}</span>
                ),
              },
            ]}
          />
        </div>
      )}
      <DescriptionList
        items={[
          {
            label: "Order number",
            value: <span className="font-mono">{o.number}</span>,
          },
          { label: "Payment method", value: grant ? "Gift" : o.method },
          { label: "Provider", value: providerLabel(o) },
          {
            label: "Reference",
            value: (
              <span className="font-mono text-[12.5px] break-all">
                {o.providerRef}
              </span>
            ),
          },
          ...(o.refundedAt
            ? [{ label: "Refunded on", value: formatDate(o.refundedAt) }]
            : []),
          ...(o.refundReason
            ? [{ label: "Refund reason", value: o.refundReason }]
            : []),
        ]}
      />
      {o.status === "failed" && (
        <p className="border-l-2 border-red py-1 pl-4 t-small text-red-deep">
          This payment didn&apos;t go through, so nothing was charged. You can
          try again from the course page.
        </p>
      )}
      {o.status === "pending" && (
        <p className="border-l-2 border-line-strong py-1 pl-4 t-small text-muted">
          Your bank is still confirming this one. It usually settles within an
          hour.
        </p>
      )}
      {o.status === "paid" && !grant && <RefundBlock o={o} db={db} />}
    </div>
  );
}

/** Ask for (or withdraw) a refund. Policy: within 7 days and under 25% watched, no certificate. */
function RefundBlock({ o, db }: { o: OrderRow; db: Db }) {
  const check = getRefundEligibility(o, db);
  const [formOpen, setFormOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const req = o.refundRequest;
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const requestRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  // where keyboard focus goes after the button that had it unmounts (send, withdraw, cancel)
  const pendingFocus = useRef<"status" | "request" | null>(null);
  useEffect(() => {
    if (!formOpen) return;
    reasonRef.current?.focus({ preventScroll: true });
    // keep the whole form (textarea + Send) clear of the drawer's sticky footer
    formRef.current?.scrollIntoView({ block: "nearest" });
  }, [formOpen]);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = target === "status" ? statusRef.current : requestRef.current;
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "nearest" });
  }, [req, formOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("Tell us a little about why (a few words is fine).");
      // focus the field with the problem, not the Send button
      requestAnimationFrame(() => reasonRef.current?.focus());
      return;
    }
    setBusy(true);
    setTimeout(() => {
      try {
        demo.requestRefund(o.id, reason);
        pendingFocus.current = "status";
        setFormOpen(false);
        setReason("");
        toast.success("Refund requested", {
          description:
            "We usually reply within two working days. You'll get a notification.",
        });
      } catch (err) {
        setError((err as Error).message);
        requestAnimationFrame(() => reasonRef.current?.focus());
      } finally {
        setBusy(false);
      }
    }, 350);
  };

  return (
    <section
      aria-labelledby={`refund-${o.id}`}
      className="border-t border-fg pt-4"
    >
      <h3
        id={`refund-${o.id}`}
        className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase"
      >
        <Icon name="refresh" className="size-4" strokeWidth={1.6} /> Refund
      </h3>
      {req ? (
        <>
          <p
            ref={statusRef}
            tabIndex={-1}
            className="mt-2 t-small focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
          >
            <span className="font-semibold">Refund requested</span> ·{" "}
            {formatDate(req.requestedAt)}
          </p>
          <p className="mt-1 t-small text-muted">&ldquo;{req.reason}&rdquo;</p>
          {req.outsidePolicy && (
            <p className="mt-3 border-l-2 border-red py-1 pl-3 text-[13px] leading-snug">
              Outside our usual policy: {req.outsidePolicy} The team will still
              take a look.
            </p>
          )}
          <p className="mt-2 t-small text-muted">
            We usually reply within two working days.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              pendingFocus.current = "request";
              demo.withdrawRefundRequest(o.id);
              toast({
                title: "Refund request withdrawn",
                description: `${o.number} stays yours.`,
              });
            }}
          >
            Withdraw request
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 t-small">{check.message}</p>
          {check.eligible && (
            <p className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-muted uppercase">
              {check.daysLeft} day{check.daysLeft === 1 ? "" : "s"} left ·{" "}
              {check.progress}% of the course watched
            </p>
          )}
          {o.refundDeclinedAt && (
            <p className="mt-3 border-l-2 border-line-strong py-1 pl-3 text-[13px] leading-snug text-muted">
              Your last request was declined on {formatDate(o.refundDeclinedAt)}
              {o.refundDeclineNote ? `: ${o.refundDeclineNote}` : "."}
            </p>
          )}
          {check.canRequest &&
            (formOpen ? (
              <form
                ref={formRef}
                onSubmit={submit}
                noValidate
                className="mt-3 scroll-mt-4 scroll-mb-32 space-y-3"
              >
                <Field
                  label="What went wrong?"
                  required
                  error={error}
                  hint={
                    check.eligible
                      ? "A sentence is plenty. It helps the tutor improve."
                      : "This is outside the usual policy, but you can still ask."
                  }
                >
                  <Textarea
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (error && e.target.value.trim().length >= 5)
                        setError(undefined);
                    }}
                    rows={3}
                    maxLength={500}
                    showCount
                    placeholder="The pace was too fast for a complete beginner."
                    ref={reasonRef}
                  />
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      pendingFocus.current = "request";
                      setFormOpen(false);
                      setError(undefined);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="red"
                    size="sm"
                    loading={busy}
                  >
                    Send request
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                ref={requestRef}
                size="sm"
                variant="outline"
                icon="refresh"
                className="mt-3"
                onClick={() => setFormOpen(true)}
              >
                Request a refund
              </Button>
            ))}
        </>
      )}
    </section>
  );
}
