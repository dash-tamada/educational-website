"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  RadioGroup,
  Segmented,
  StatGrid,
  StatTile,
  Switch,
  Textarea,
  Tooltip,
  toast,
  useIsPhone,
  type MenuItem,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import {
  MOCK_NOW_ISO,
  formatDate,
  formatINR,
  formatNumber,
  getCouponImpact,
  getCoupons,
  getCourseById,
  getCourses,
  plural,
  type Coupon,
} from "@/lib/mock";
import {
  COMPACT_TABLE,
  COUPON_STATE_META,
  CompactFacts,
  MoneyTabs,
  PhoneRow,
  couponState,
  fitColumns,
  focusFirstInvalid,
  pickSort,
  smartDate,
  useAdminId,
  useBoxWidth,
  type FitColumn,
} from "./shared";

const discountLabel = (c: Pick<Coupon, "kind" | "value">) =>
  c.kind === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`;

const SCOPE_MIN_BOX = 1180;

export function CouponsView() {
  const db = useDb();
  const coupons = useMemo(() => getCoupons(db), [db]);
  // the wide table's default order (latest end date first), kept when the Runs column drops
  const sortedCoupons = useMemo(
    () => [...coupons].sort((a, b) => b.endsAt.localeCompare(a.endsAt)),
    [coupons],
  );
  const sp = useSearchParams();
  // /admin/coupons?new=1 (from the payments overview) opens the create dialog straight away
  const [editing, setEditing] = useState<Coupon | "new" | null>(
    sp.get("new") ? "new" : null,
  );
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [boxRef, boxW] = useBoxWidth();
  const router = useRouter();
  const closeEditor = () => {
    setEditing(null);
    // drop ?new=1 so a reload doesn't reopen the dialog
    if (sp.get("new")) router.replace("/admin/coupons", { scroll: false });
  };

  const live = coupons.filter((c) => couponState(c) === "live").length;
  const scheduled = coupons.filter(
    (c) => couponState(c) === "scheduled",
  ).length;
  const redemptions = coupons.reduce((s, c) => s + c.redemptions, 0);
  // platform-scale estimate, on the same scale as the redemptions tile
  const discountGiven = useMemo(
    () => getCouponImpact(db).reduce((s, c) => s + c.discount, 0),
    [db],
  );

  const toggle = (c: Coupon, v: boolean) => {
    demo.setCouponActive(c.id, v);
    toast.success(
      v ? `${c.code} is switched on.` : `${c.code} is switched off.`,
      {
        description: v
          ? undefined
          : "Nobody can apply it at checkout until you switch it back on.",
      },
    );
  };
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it by hand.");
    }
  };

  const actionsFor = (c: Coupon): MenuItem[] => [
    { label: "Edit", icon: "edit", onSelect: () => setEditing(c) },
    { label: "Copy code", icon: "copy", onSelect: () => copy(c.code) },
    {
      label: c.active ? "Switch off" : "Switch on",
      icon: c.active ? "eye-off" : "eye",
      onSelect: () => toggle(c, !c.active),
    },
    { divider: true },
    {
      label: "Delete",
      icon: "trash",
      danger: true,
      onSelect: () => setDeleting(c),
    },
  ];

  const compact = boxW != null && boxW < 700;
  const phone = useIsPhone();
  /** the "Applies to" column only fits in a wide box; otherwise scope rides under the discount */
  const scopeColumn = boxW == null || boxW >= SCOPE_MIN_BOX;
  const scopeLine = (c: Coupon) => {
    const names = c.courseIds
      ?.map((id) => getCourseById(id, db)?.title ?? id)
      .join(", ");
    return (
      <span
        className="block text-[12px] font-semibold text-ink/55"
        title={names}
      >
        {!c.courseIds
          ? "Every course"
          : c.courseIds.length === 1
            ? "1 course"
            : plural(c.courseIds.length, "course")}
        {names && <span className="sr-only">: {names}</span>}
      </span>
    );
  };
  const stateBadge = (c: Coupon) => {
    const m = COUPON_STATE_META[couponState(c)];
    return (
      <Badge tone={m.tone} dot size="sm">
        {m.label}
      </Badge>
    );
  };
  const codeChip = (c: Coupon) => (
    <span className="flex items-center gap-1.5">
      <span className="rounded-md bg-cream px-2 py-0.5 font-mono text-[14px] font-bold tracking-wide">
        {c.code}
      </span>
      <Tooltip label="Copy code">
        <button
          type="button"
          onClick={() => copy(c.code)}
          aria-label={`Copy ${c.code}`}
          className="hit grid size-7 place-items-center rounded-full text-ink/45 hf:bg-ink/[0.06] hf:text-ink"
        >
          <Icon name="copy" className="size-3.5" />
        </button>
      </Tooltip>
    </span>
  );
  const allColumns: FitColumn<Coupon>[] = compact
    ? [
        {
          key: "code",
          header: "Code",
          cell: (c) => (
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center justify-between gap-2">
                {codeChip(c)}
                <span className="text-right whitespace-nowrap">
                  <span className="block font-bold">{discountLabel(c)}</span>
                  {c.minAmount ? (
                    <span className="block text-[12px] font-semibold text-ink/55">
                      Min {formatINR(c.minAmount)}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="mt-1 line-clamp-1 text-[13px] text-ink/60">
                {c.description}
              </span>
              <CompactFacts>
                {stateBadge(c)}
                <span>
                  {formatNumber(c.redemptions)} / {formatNumber(c.maxRedemptions)} used
                </span>
                <span>Ends {smartDate(c.endsAt)}</span>
                <span
                  title={c.courseIds
                    ?.map((id) => getCourseById(id, db)?.title ?? id)
                    .join(", ")}
                >
                  {c.courseIds
                    ? plural(c.courseIds.length, "course")
                    : "Every course"}
                  {c.courseIds && (
                    <span className="sr-only">
                      :{" "}
                      {c.courseIds
                        .map((id) => getCourseById(id, db)?.title ?? id)
                        .join(", ")}
                    </span>
                  )}
                </span>
              </CompactFacts>
            </span>
          ),
          sortValue: (c) => c.code,
          searchValue: (c) => `${c.code} ${c.description}`,
        },
      ]
    : [
        {
          key: "code",
          header: "Code",
          cell: (c) => (
            <span className="flex min-w-[170px] flex-col">
              {codeChip(c)}
              <span className="mt-1 line-clamp-1 text-[13px] text-ink/60">
                {c.description}
              </span>
            </span>
          ),
          sortValue: (c) => c.code,
          searchValue: (c) => `${c.code} ${c.description}`,
        },
        {
          key: "discount",
          header: "Discount",
          cell: (c) => (
            <span className="whitespace-nowrap">
              <span className="block font-bold">{discountLabel(c)}</span>
              {c.minAmount ? (
                <span className="block text-[12px] font-semibold text-ink/55">
                  Min {formatINR(c.minAmount)}
                </span>
              ) : null}
              {!scopeColumn && scopeLine(c)}
            </span>
          ),
          sortValue: (c) => (c.kind === "percent" ? c.value * 10 : c.value),
        },
        {
          key: "scope",
          header: "Applies to",
          minBox: SCOPE_MIN_BOX,
          cell: (c) =>
            c.courseIds ? (
              <span
                className="line-clamp-2 min-w-[140px] text-[13px]"
                title={c.courseIds
                  .map((id) => getCourseById(id, db)?.title)
                  .join(", ")}
              >
                {c.courseIds.length <= 2
                  ? c.courseIds
                      .map((id) => getCourseById(id, db)?.title ?? id)
                      .join(", ")
                  : plural(c.courseIds.length, "course")}
              </span>
            ) : (
              <Badge tone="neutral" size="sm">
                Every course
              </Badge>
            ),
          sortValue: (c) => c.courseIds?.length ?? 999,
        },
        {
          key: "usage",
          header: "Used",
          width: "140px",
          cell: (c) => (
            <span className="block min-w-[110px]">
              <span className="text-[13px] font-bold whitespace-nowrap">
                {formatNumber(c.redemptions)}{" "}
                <span className="font-semibold text-ink/45">
                  / {formatNumber(c.maxRedemptions)}
                </span>
              </span>
              <ProgressBar
                value={(c.redemptions / Math.max(1, c.maxRedemptions)) * 100}
                size="sm"
                tone={c.redemptions >= c.maxRedemptions ? "flame" : "purple"}
                label={`${c.code} usage`}
                className="mt-1"
              />
            </span>
          ),
          sortValue: (c) => c.redemptions / Math.max(1, c.maxRedemptions),
        },
        {
          key: "window",
          header: "Runs",
          minBox: 900,
          cell: (c) => (
            <span className="text-[13px] whitespace-nowrap text-ink/75">
              {smartDate(c.startsAt)} – {smartDate(c.endsAt)}
            </span>
          ),
          sortValue: (c) => c.endsAt,
        },
        {
          key: "state",
          header: "State",
          cell: stateBadge,
          sortValue: (c) => couponState(c),
        },
        {
          key: "active",
          header: "On",
          cell: (c) => (
            <Switch
              hideLabel
              label={`${c.code} switched on`}
              checked={c.active}
              onChange={(v) => toggle(c, v)}
            />
          ),
          sortValue: (c) => (c.active ? 1 : 0),
        },
      ];
  const columns = fitColumns(allColumns, boxW);
  // rows arrive latest-ending first; the Runs arrow shows whenever that column fits
  const { initialSort, sortKey } = pickSort(columns, { key: "window", dir: "desc" });

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Money"
        eyebrowTone="purple"
        title="Small codes, happy carts."
        description="Create a code, choose how much it takes off, cap how many people can use it, and set when it runs."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Coupons" },
        ]}
        actions={
          <Button
            variant="accent"
            icon="plus"
            onClick={() => setEditing("new")}
          >
            New coupon
          </Button>
        }
      />
      <MoneyTabs current="coupons" />

      <StatGrid className="mb-6">
        <StatTile
          label="Live now"
          value={live}
          tone="mint"
          icon="ticket"
          hint={`${coupons.length} codes in total`}
        />
        <StatTile
          label="Scheduled"
          value={scheduled}
          tone="cyan"
          icon="calendar"
          hint={scheduled ? "Starting soon" : "Nothing queued"}
        />
        <StatTile
          label="Redemptions"
          value={formatNumber(redemptions)}
          tone="sun"
          icon="users"
          hint="All time, all codes"
        />
        <StatTile
          label="Discount given"
          value={formatINR(discountGiven, { compact: true })}
          tone="white"
          icon="wallet"
          hint="Estimated, all redemptions"
        />
      </StatGrid>

      <div ref={boxRef}>
      <DataTable<Coupon>
        key={sortKey}
        caption="Coupons"
        rows={sortedCoupons}
        columns={columns}
        getRowId={(c) => c.id}
        search={{ placeholder: "Search codes" }}
        pageSize={10}
        rowActions={actionsFor}
        // phones: the whole row opens the editor (desktop rows keep their inline controls)
        onRowClick={phone ? (c) => setEditing(c) : undefined}
        mobileRow={(c) => {
          const m = COUPON_STATE_META[couponState(c)];
          return (
            <PhoneRow
              title={<span className="font-mono tracking-wide">{c.code}</span>}
              lines={[
                c.description,
                [
                  <Badge key="s" tone={m.tone} dot>
                    {m.label}
                  </Badge>,
                  `${formatNumber(c.redemptions)}/${formatNumber(c.maxRedemptions)} used`,
                ],
                [
                  `Ends ${smartDate(c.endsAt)}`,
                  c.courseIds ? plural(c.courseIds.length, "course") : "Every course",
                  c.minAmount ? `min ${formatINR(c.minAmount)}` : null,
                ],
              ]}
              trailing={discountLabel(c)}
              badge={
                <Switch
                  hideLabel
                  label={`${c.code} switched on`}
                  checked={c.active}
                  onChange={(v) => toggle(c, v)}
                  className="max-sm:mt-0 [&_button]:mt-1"
                />
              }
            />
          );
        }}
        initialSort={initialSort}
        empty={{
          title: "No coupons yet.",
          body: "Make the first one. A small welcome discount works wonders.",
          action: (
            <Button size="sm" icon="plus" onClick={() => setEditing("new")}>
              New coupon
            </Button>
          ),
        }}
        dense={boxW != null && boxW < 1180}
        minWidth={compact ? 0 : 600}
        className={compact ? COMPACT_TABLE : undefined}
      />
      </div>
      <p className="mt-3 t-small text-ink/55">
        Codes are checked at checkout: on, inside their dates, not used up,
        valid for that course, and at or above any minimum price.
      </p>

      {editing && (
        <CouponForm
          key={editing === "new" ? "new" : editing.id}
          editing={editing}
          coupons={coupons}
          onClose={closeEditor}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        title={deleting ? `Delete ${deleting.code}?` : "Delete coupon"}
        description={
          deleting?.redemptions
            ? `It was used ${plural(deleting.redemptions, "time")}. Past orders keep their discount, but the code stops working. Switching it off keeps the history tidier.`
            : "It hasn't been used yet, so nothing else changes."
        }
        confirmLabel="Delete coupon"
        onConfirm={() => {
          if (!deleting) return;
          demo.deleteCoupon(deleting.id);
          toast(`${deleting.code} deleted.`);
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------- form */
const today = MOCK_NOW_ISO.slice(0, 10);
const plusDays = (iso: string, d: number) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() + d * 86_400_000)
    .toISOString()
    .slice(0, 10);

function CouponForm({
  editing,
  coupons,
  onClose,
}: {
  editing: Coupon | "new";
  coupons: Coupon[];
  onClose: () => void;
}) {
  const db = useDb();
  const adminId = useAdminId();
  const base = editing === "new" ? null : editing;
  const courses = useMemo(
    () =>
      getCourses({ status: "published", sort: "title", pageSize: 500 }, db)
        .items,
    [db],
  );
  const [code, setCode] = useState(base?.code ?? "");
  const [description, setDescription] = useState(base?.description ?? "");
  const [kind, setKind] = useState<Coupon["kind"]>(base?.kind ?? "percent");
  const [value, setValue] = useState(String(base?.value ?? 10));
  const [scope, setScope] = useState<"all" | "some">(
    base?.courseIds ? "some" : "all",
  );
  const [courseIds, setCourseIds] = useState<string[]>(base?.courseIds ?? []);
  const [max, setMax] = useState(String(base?.maxRedemptions ?? 500));
  const [starts, setStarts] = useState(base?.startsAt.slice(0, 10) ?? today);
  const [ends, setEnds] = useState(
    base?.endsAt.slice(0, 10) ?? plusDays(today, 30),
  );
  const [active, setActive] = useState(base?.active ?? true);
  const [minAmount, setMinAmount] = useState(
    base?.minAmount ? String(base.minAmount) : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clear = (k: string) => setErrors((e) => ({ ...e, [k]: "" }));

  const num = Number(value);
  const sample =
    (scope === "some" ? courses.find((c) => courseIds.includes(c.id)) : null) ??
    courses.find((c) => c.slug === "web-dev-from-zero") ??
    courses[0];
  const min = minAmount.trim() ? Number(minAmount) : 0;
  const sampleBelowMin = !!sample && min > 0 && sample.price < min;
  const sampleOff =
    sample && num > 0 && !sampleBelowMin
      ? kind === "percent"
        ? Math.round((sample.price * Math.min(num, 100)) / 100)
        : Math.min(num, sample.price)
      : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(c))
      errs.code = "4–16 letters or numbers, no spaces.";
    else if (coupons.some((x) => x.id !== base?.id && x.code === c))
      errs.code = "That code already exists.";
    if (description.trim().length < 6)
      errs.description =
        "Say what it's for, in a few words. Learners see this at checkout.";
    if (!Number.isFinite(num) || num <= 0)
      errs.value = "Enter a discount above zero.";
    else if (kind === "percent" && (num > 90 || !Number.isInteger(num)))
      errs.value = "Whole percentages up to 90%.";
    else if (kind === "flat" && num > 5000)
      errs.value = "Flat discounts top out at ₹5,000.";
    if (scope === "some" && !courseIds.length)
      errs.courses = "Pick at least one course, or choose “Every course”.";
    if (minAmount.trim()) {
      if (!Number.isInteger(min) || min < 1)
        errs.minAmount = "Whole rupees above zero, or leave it empty.";
      else if (min > 100_000) errs.minAmount = "That's above every course price.";
      else if (kind === "flat" && Number.isFinite(num) && min < num)
        errs.minAmount = `Set it to at least the ${formatINR(num)} discount, so no course goes below ₹0.`;
    }
    const m = Number(max);
    if (!Number.isInteger(m) || m < 1) errs.max = "At least 1 use.";
    else if (base && m < base.redemptions)
      errs.max = `It’s already been used ${formatNumber(base.redemptions)} times.`;
    if (!starts) errs.starts = "Pick a start date.";
    if (!ends) errs.ends = "Pick an end date.";
    else if (starts && ends < starts)
      errs.ends = "The end date comes before the start.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      focusFirstInvalid(e.currentTarget);
      return;
    }
    demo.upsertCoupon({
      ...(base ? { id: base.id } : {}),
      code: c,
      description: description.trim(),
      kind,
      value: num,
      courseIds: scope === "all" ? null : courseIds,
      minAmount: min > 0 ? min : undefined,
      maxRedemptions: m,
      redemptions: base?.redemptions ?? 0,
      startsAt: `${starts}T00:00:00+05:30`,
      endsAt: `${ends}T23:59:00+05:30`,
      active,
      createdBy: base?.createdBy ?? adminId,
    });
    toast.success(base ? `${c} saved.` : `${c} created.`, {
      description:
        starts > today
          ? `It goes live on ${formatDate(`${starts}T00:00:00+05:30`)}.`
          : active
            ? "Learners can use it at checkout right away."
            : "It's switched off for now.",
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={base ? `Edit ${base.code}` : "New coupon"}
      description="Every field is checked again at checkout, so a mistake here can't overcharge anyone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="coupon-form" icon="check">
            {base ? "Save coupon" : "Create coupon"}
          </Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Code"
            required
            error={errors.code || undefined}
            hint="Shown in capitals. Easy to say out loud is best."
          >
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                clear("code");
              }}
              placeholder="DIWALI25"
              maxLength={16}
              className="font-mono tracking-wide"
              autoFocus
            />
          </Field>
          <div>
            <p className="mb-1.5 text-[14px] font-bold">Discount type</p>
            <Segmented
              label="Discount type"
              value={kind}
              onChange={(v) => {
                setKind(v);
                clear("value");
              }}
              options={[
                { value: "percent", label: "Percentage" },
                { value: "flat", label: "Flat amount" },
              ]}
            />
          </div>
        </div>
        <Field
          label="Description"
          required
          error={errors.description || undefined}
        >
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clear("description");
            }}
            maxLength={120}
            showCount
            placeholder="Festive offer: 25% off everything"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={kind === "percent" ? "Percent off" : "Amount off"}
            required
            error={errors.value || undefined}
            hint={
              sample && sampleOff > 0
                ? `${sample.title}: ${formatINR(sample.price)} → ${formatINR(sample.price - sampleOff)}`
                : sample && sampleBelowMin
                  ? `${sample.title} (${formatINR(sample.price)}) is under the minimum, so it wouldn't apply.`
                  : undefined
            }
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={kind === "percent" ? 90 : 5000}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                clear("value");
              }}
              prefix={kind === "flat" ? "₹" : undefined}
              suffix={
                kind === "percent" ? (
                  <span className="pr-2 text-[15px] font-bold text-ink/55">
                    %
                  </span>
                ) : undefined
              }
            />
          </Field>
          <Field
            label="Usage limit"
            required
            error={errors.max || undefined}
            hint={
              base
                ? `Used ${formatNumber(base.redemptions)} times so far.`
                : "Total uses across everyone."
            }
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={max}
              onChange={(e) => {
                setMax(e.target.value);
                clear("max");
              }}
            />
          </Field>
          <Field label="Starts" required error={errors.starts || undefined}>
            <Input
              type="date"
              value={starts}
              onChange={(e) => {
                setStarts(e.target.value);
                clear("starts");
                clear("ends");
              }}
            />
          </Field>
          <Field
            label="Expires"
            required
            error={errors.ends || undefined}
            hint="Ends at 11:59 pm IST that day."
          >
            <Input
              type="date"
              value={ends}
              min={starts || undefined}
              onChange={(e) => {
                setEnds(e.target.value);
                clear("ends");
              }}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Minimum course price"
            optional
            error={errors.minAmount || undefined}
            hint={
              kind === "flat"
                ? "Stops a flat discount eating a cheap course. Empty means any price."
                : "The code only works on courses at or above this price."
            }
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                clear("minAmount");
              }}
              prefix="₹"
              placeholder="No minimum"
            />
          </Field>
        </div>

        <div>
          <RadioGroup
            label="Applies to"
            name="scope"
            orientation="horizontal"
            value={scope}
            onChange={(v) => {
              setScope(v);
              clear("courses");
            }}
            options={[
              {
                value: "all",
                label: "Every course",
                description: "Global code",
              },
              {
                value: "some",
                label: "Specific courses",
                description: "Pick from the catalogue",
              },
            ]}
            variant="cards"
          />
          {scope === "some" && (
            <div className="app-fade mt-3">
              <div
                data-invalid={errors.courses ? "true" : undefined}
                aria-describedby="coupon-courses-msg"
                className={clsx(
                  "app-scroll max-h-56 space-y-2.5 overflow-y-auto rounded-tag bg-cream p-3",
                  errors.courses && "ring-2 ring-flame",
                )}
                data-lenis-prevent=""
                role="group"
                aria-label="Courses this code works for"
              >
                {courses.map((c) => (
                  <Checkbox
                    key={c.id}
                    label={c.title}
                    description={formatINR(c.price)}
                    checked={courseIds.includes(c.id)}
                    onChange={(e) => {
                      setCourseIds((ids) =>
                        e.target.checked
                          ? [...ids, c.id]
                          : ids.filter((x) => x !== c.id),
                      );
                      clear("courses");
                    }}
                  />
                ))}
              </div>
              <p
                id="coupon-courses-msg"
                className={clsx(
                  "mt-1.5 text-[13px] font-semibold",
                  errors.courses ? "text-[#c13500]" : "text-ink/55",
                )}
                role={errors.courses ? "alert" : undefined}
              >
                {errors.courses ||
                  `${plural(courseIds.length, "course")} selected`}
              </p>
            </div>
          )}
        </div>

        <Switch
          label="Switched on"
          description="Off means nobody can use it, even inside its dates."
          checked={active}
          onChange={setActive}
        />
      </form>
    </Modal>
  );
}
