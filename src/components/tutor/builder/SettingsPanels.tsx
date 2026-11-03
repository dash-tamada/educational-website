"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { cropSrc } from "@/lib/img";
import { MOCK_NOW, MOCK_NOW_ISO, formatDate, formatINR, getCategories, type Coupon, type Course, type CourseLevel, type Db } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { COURSE_LANGUAGES, COURSE_LEVELS, GST_RATE, PRICE_MAX, PRICE_MIN, THUMBNAIL_PRESETS } from "@/lib/mock/extra/tutor";
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Icon, Input, Section, Segmented, Select, Switch, Textarea, toast } from "@/components/app";
import { EDITORIAL_TONES, Figure, Idx, MonoMeta, TonePalette, editorialTone, toneSurface } from "../editorial";
import { focusFirstInvalid } from "../shared";

/* =============================================================================
   Course studio: Details + Pricing tabs (design system v2). Mobius split sections
   (mono index + tiny caps label + note on the left, flat kit fields on the right),
   square cover presets, the editorial palette, a ruled price breakdown and a ruled
   list of coupon codes.
   ============================================================================= */

export type CourseFields = Pick<
  Course,
  "title" | "promise" | "description" | "categoryId" | "level" | "language" | "tags" | "outcomes" | "requirements" | "thumbnail" | "tone" | "hasCertificate" | "price" | "compareAtPrice"
>;

export function fieldErrors(f: CourseFields): Partial<Record<keyof CourseFields, string>> {
  const e: Partial<Record<keyof CourseFields, string>> = {};
  if (f.title.trim().length < 5) e.title = "At least 5 characters.";
  if (f.title.length > 80) e.title = "Keep it under 80 characters.";
  if (f.promise.length > 120) e.promise = "Keep it under 120 characters.";
  if (!Number.isInteger(f.price) || f.price < PRICE_MIN || f.price > PRICE_MAX) e.price = `Between ${formatINR(PRICE_MIN)} and ${formatINR(PRICE_MAX)}, whole rupees.`;
  if (f.compareAtPrice !== undefined && (f.compareAtPrice <= f.price || f.compareAtPrice > PRICE_MAX * 2)) e.compareAtPrice = "The original price must be higher than the price.";
  return e;
}

/** Tiny caps group label (matches the kit Field label). */
const LEGEND = "mb-2 text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] text-fg uppercase";

/* ----------------------------------------------------------------------------- details */
export function DetailsPanel({ fields, onChange, db }: { fields: CourseFields; onChange: (f: Partial<CourseFields>) => void; db: Db }) {
  const errors = fieldErrors(fields);
  const categories = useMemo(() => getCategories(db), [db]);
  const preset = THUMBNAIL_PRESETS.find((t) => t.src === fields.thumbnail);
  return (
    <div className="space-y-14 md:space-y-20">
      <Section index="01" label="The basics" note="What shows on your course card and at the top of the course page.">
        <div className="flex max-w-3xl flex-col gap-6">
          <Field label="Title" required error={errors.title}>
            <Input value={fields.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={90} />
          </Field>
          <Field label="One-line promise" hint={`What can learners do after the last lesson? ${fields.promise.length}/120`} error={errors.promise}>
            <Textarea value={fields.promise} onChange={(e) => onChange({ promise: e.target.value })} rows={2} />
          </Field>
          <Field label="Description" hint="Who it's for, what they'll build, how it's taught. Plain words win.">
            <Textarea value={fields.description} onChange={(e) => onChange({ description: e.target.value })} rows={6} maxLength={1200} showCount />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category">
              <Select value={fields.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Level">
              <Select value={fields.level} onChange={(e) => onChange({ level: e.target.value as CourseLevel })} options={COURSE_LEVELS.map((l) => ({ value: l.value, label: l.label }))} />
            </Field>
            <Field label="Language">
              <Select value={fields.language} onChange={(e) => onChange({ language: e.target.value })} options={COURSE_LANGUAGES.map((l) => ({ value: l, label: l }))} />
            </Field>
          </div>
          <TagInput label="Tags" hint="Up to 6. Helps search: tools, topics, exams." values={fields.tags} max={6} onChange={(tags) => onChange({ tags })} />
        </div>
      </Section>

      <Section index="02" label="What learners get" note="Shown as a checklist on the course page.">
        <div className="flex max-w-3xl flex-col gap-9">
          <ListEditor label="Learning outcomes" placeholder="e.g. Build a responsive portfolio site" values={fields.outcomes} onChange={(outcomes) => onChange({ outcomes })} max={8} />
          <ListEditor label="Requirements" placeholder="e.g. A laptop with Chrome" values={fields.requirements} onChange={(requirements) => onChange({ requirements })} max={5} />
          <div className="border-y border-line py-4">
            <Switch
              label="Certificate of completion"
              description="Learners get a verifiable certificate when they finish every lesson and pass every test."
              checked={fields.hasCertificate}
              onChange={(v) => onChange({ hasCertificate: v })}
            />
          </div>
        </div>
      </Section>

      <Section index="03" label="Cover and colour" note="The cover still sits on a frame in your card colour, on the course card and the course page.">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
          <figure className="min-w-0">
            <div className={clsx("p-2.5 transition-colors duration-200", toneSurface(fields.tone))}>
              <div className="relative aspect-[4/3] overflow-hidden bg-charcoal">
                {fields.thumbnail && <Image src={cropSrc(fields.thumbnail, 3 / 4)} alt="Current cover" fill sizes="320px" loading="eager" className="object-cover" />}
              </div>
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-3">
              <MonoMeta as="span">{preset?.label ?? "Custom cover"}</MonoMeta>
              <MonoMeta as="span">4:3 · {editorialToneLabel(fields.tone)}</MonoMeta>
            </figcaption>
          </figure>
          <div className="flex min-w-0 flex-col gap-7">
            <fieldset>
              <legend className={LEGEND}>Cover image</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
                {THUMBNAIL_PRESETS.map((t) => {
                  const on = fields.thumbnail === t.src;
                  return (
                    <label key={t.id} className="group relative block cursor-pointer" title={t.label}>
                      <input type="radio" name="cover" checked={on} onChange={() => onChange({ thumbnail: t.src })} className="peer sr-only" />
                      <span
                        className={clsx(
                          "relative block aspect-square overflow-hidden bg-charcoal transition-[box-shadow,opacity] duration-200",
                          on ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : "opacity-80 group-hf:opacity-100",
                        )}
                      >
                        <Image src={cropSrc(t.src, 1)} alt="" fill sizes="80px" loading="eager" className="object-cover" />
                        {on && (
                          <span className="absolute top-0 right-0 grid size-5 place-items-center bg-fg text-surface" aria-hidden>
                            <Icon name="check" className="size-3" strokeWidth={2.6} />
                          </span>
                        )}
                      </span>
                      <span className="sr-only">{t.label}</span>
                      <span className="pointer-events-none absolute inset-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red" />
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <TonePalette legend="Card colour" hint="Five editorial grounds. The red one is loud: keep it for the course you want seen." value={fields.tone} onChange={(tone) => onChange({ tone })} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function editorialToneLabel(t: Course["tone"]) {
  const e = editorialTone(t);
  return EDITORIAL_TONES.find((x) => x.value === e)?.label ?? "Sand";
}

function TagInput({ label, hint, values, onChange, max }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; max: number }) {
  const [draft, setDraft] = useState("");
  /** Add every comma-separated part (typed or pasted), de-duplicated, up to max. Returns the list. */
  const addParts = (parts: string[]) => {
    const next = [...values];
    for (const raw of parts) {
      const v = raw.replace(/\s+/g, " ").trim().slice(0, 24).trim();
      if (!v || next.length >= max || next.some((x) => x.toLowerCase() === v.toLowerCase())) continue;
      next.push(v);
    }
    if (next.length !== values.length) onChange(next);
    return next;
  };
  const add = () => {
    addParts(draft.split(","));
    setDraft("");
  };
  const onType = (value: string) => {
    if (!value.includes(",")) return setDraft(value);
    // "Vite, Testing, Jest": everything before the last comma becomes tags, the rest stays as the draft
    const parts = value.split(",");
    const rest = parts.pop() ?? "";
    const next = addParts(parts);
    setDraft(next.length >= max ? "" : rest.trimStart());
  };
  return (
    <div>
      <Field label={label} hint={hint}>
        <Input
          value={draft}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={add}
          disabled={values.length >= max}
          placeholder={values.length >= max ? "That's the maximum" : "Type a tag and press Enter"}
        />
      </Field>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${label} added`}>
          {values.map((t) => (
            <li key={t} className="inline-flex h-8 items-center gap-1 bg-ink pr-1 pl-3 font-mono text-[11.5px] tracking-[0.04em] text-cream uppercase">
              {t}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== t))} className="grid size-6 place-items-center transition-colors hf:bg-white/15 coarse:size-8" aria-label={`Remove tag ${t}`}>
                <Icon name="x" className="size-3.5" strokeWidth={1.8} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListEditor({ label, values, onChange, placeholder, max }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; max: number }) {
  return (
    <fieldset>
      <legend className={clsx(LEGEND, "flex w-full items-baseline justify-between gap-3")}>
        <span>{label}</span>
        <span className="font-mono text-[11px] font-normal tracking-normal text-muted tabular-nums">
          {values.length}/{max}
        </span>
      </legend>
      <ol className="flex flex-col gap-2">
        {values.map((v, i) => (
          <li key={i} className="flex items-center gap-3">
            <Idx n={i + 1} className="w-5" />
            <Input value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} placeholder={placeholder} aria-label={`${label} ${i + 1}`} maxLength={120} />
            <Button size="sm" variant="ghost" iconOnly icon="x" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(values.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ol>
      {values.length < max && (
        <Button size="sm" variant="outline" icon="plus" className="mt-3" onClick={() => onChange([...values, ""])}>
          Add {label === "Requirements" ? "a requirement" : "an outcome"}
        </Button>
      )}
    </fieldset>
  );
}

/* ----------------------------------------------------------------------------- pricing + coupons */
/** Same rules, in the same order, as validateCoupon at checkout, checked against the price being edited. */
function couponState(c: Coupon, price: number) {
  if (!c.active) return { label: "Off", tone: "neutral" as const, works: false };
  if (MOCK_NOW_ISO < c.startsAt) return { label: "Scheduled", tone: "butter" as const, works: false };
  if (MOCK_NOW_ISO > c.endsAt) return { label: "Expired", tone: "neutral" as const, works: false };
  if (c.redemptions >= c.maxRedemptions) return { label: "Used up", tone: "ink" as const, works: false };
  if (c.minAmount && price < c.minAmount) return { label: `Needs ${formatINR(c.minAmount)}+`, tone: "flame" as const, works: false };
  if (c.kind === "flat" && c.value >= price) return { label: "Too big for this price", tone: "flame" as const, works: false };
  return { label: "Live", tone: "mint" as const, works: true };
}

export function PricingPanel({
  course,
  fields,
  onChange,
  db,
  userId,
  revenueShare,
}: {
  course: Course;
  fields: CourseFields;
  onChange: (f: Partial<CourseFields>) => void;
  db: Db;
  userId: string;
  revenueShare: number;
}) {
  const errors = fieldErrors(fields);
  const [priceDraft, setPriceDraft] = useState(String(fields.price));
  const [compareDraft, setCompareDraft] = useState(fields.compareAtPrice ? String(fields.compareAtPrice) : "");
  const [del, setDel] = useState<Coupon | null>(null);
  const exGst = Math.round(fields.price / (1 + GST_RATE));
  const coupons = db.coupons
    .filter((c) => c.courseIds?.includes(course.id) || c.courseIds === null)
    .sort((a, b) => Number(b.createdBy === userId) - Number(a.createdBy === userId) || b.startsAt.localeCompare(a.startsAt));
  const liveCount = coupons.filter((c) => couponState(c, fields.price).works).length;

  return (
    <div className="space-y-14 md:space-y-20">
      <Section index="01" label="Price" note="One-time purchase, lifetime access. The first video is always free.">
        <div className="flex max-w-3xl flex-col gap-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Price (incl. GST)" required error={errors.price}>
              <Input
                prefix="₹"
                inputMode="numeric"
                value={priceDraft}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setPriceDraft(v);
                  onChange({ price: Number(v || 0) });
                }}
              />
            </Field>
            <Field label="Launch offer: original price" optional hint="Shown struck through next to the price. Leave empty for no offer." error={errors.compareAtPrice}>
              <Input
                prefix="₹"
                inputMode="numeric"
                value={compareDraft}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setCompareDraft(v);
                  onChange({ compareAtPrice: v ? Number(v) : undefined });
                }}
              />
            </Field>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-line border-y border-fg">
            {[
              ["Learner pays", formatINR(fields.price)],
              ["Before 18% GST", formatINR(exGst)],
              [`You keep · ${Math.round(revenueShare * 100)}%`, formatINR(Math.round(exGst * revenueShare))],
            ].map(([k, v], i) => (
              <div key={k} className="min-w-0 px-3 py-4 first:pl-0 sm:px-4">
                <dt className="sr-only">{k}</dt>
                <dd>
                  <Figure label={k} value={<span className={i === 2 ? "text-red-deep" : undefined}>{v}</span>} strong={i === 2} />
                </dd>
              </div>
            ))}
          </dl>
          {course.status === "published" && <p className="t-small text-muted">Price changes apply to new purchases only. People who already bought keep their access.</p>}
          {/* no verdict for a price that can't be saved anyway */}
          {!errors.price && <PriceContext db={db} courseId={course.id} categoryId={fields.categoryId} price={fields.price} />}
        </div>
      </Section>

      <Section
        index="02"
        label="Coupons"
        note="Great for launch week, your YouTube audience or a college club."
        title="Codes for this course"
        action={<MonoMeta as="span">{liveCount}/{coupons.length} work at {formatINR(fields.price)}</MonoMeta>}
      >
        <div className="grid gap-10 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-12">
          <div className="min-w-0">
            <p className="t-small mb-4 text-muted">Yours first, then platform-wide codes run by the Tamada team.</p>
            {coupons.length === 0 ? (
              <p className="t-small border-y border-line py-5 text-muted">No codes yet. Create one for your community or a launch week.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-fg">
                {coupons.map((c) => {
                  const st = couponState(c, fields.price);
                  const mine = c.createdBy === userId;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                      <span className="bg-cream-2 px-2.5 py-1.5 font-mono text-[13px] font-medium tracking-[0.06em] sm:min-w-[7.5rem] sm:text-center">{c.code}</span>
                      <Badge tone={st.tone} dot size="sm" className="max-sm:ml-auto sm:hidden">
                        {st.label}
                      </Badge>
                      <div className="min-w-0 max-sm:basis-full sm:flex-1">
                        <p className="font-heading text-[15px] font-semibold tracking-[-0.015em]">
                          {c.kind === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`}
                          <span className="font-sans text-[13px] font-normal tracking-normal text-muted"> · {c.courseIds === null ? "Platform-wide" : c.courseIds.length > 1 ? `${c.courseIds.length} courses` : "This course"}</span>
                        </p>
                        <MonoMeta className="mt-1">
                          {c.redemptions}/{c.maxRedemptions} used · until {formatDate(c.endsAt)}
                          {c.minAmount ? ` · ${formatINR(c.minAmount)}+ courses` : ""}
                          {c.firstPurchaseOnly ? " · first purchase only" : ""}
                        </MonoMeta>
                      </div>
                      <Badge tone={st.tone} dot size="sm" className="max-sm:hidden">
                        {st.label}
                      </Badge>
                      {mine ? (
                        <div className="flex items-center gap-1 max-sm:-ml-1">
                          <Switch
                            hideLabel
                            label={`${c.code} active`}
                            checked={c.active}
                            onChange={(v) => {
                              demo.setCouponActive(c.id, v);
                              toast(v ? `${c.code} switched on` : `${c.code} switched off`);
                            }}
                          />
                          <Button size="sm" variant="ghost" iconOnly icon="trash" aria-label={`Delete ${c.code}`} onClick={() => setDel(c)} />
                        </div>
                      ) : (
                        <MonoMeta as="span">Managed by admins</MonoMeta>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <CouponForm courseId={course.id} userId={userId} price={fields.price} existing={db.coupons.map((c) => c.code)} />
        </div>
      </Section>
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        tone="danger"
        title={`Delete ${del?.code}?`}
        description="Learners who already used it keep their discount. Nobody new can apply it."
        confirmLabel="Delete code"
        onConfirm={() => {
          if (!del) return;
          demo.deleteCoupon(del.id);
          toast.success(`${del.code} deleted`);
        }}
      />
    </div>
  );
}

function CouponForm({ courseId, userId, price, existing }: { courseId: string; userId: string; price: number; existing: string[] }) {
  const defaultEnd = new Date(MOCK_NOW.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("15");
  const [max, setMax] = useState("100");
  const [ends, setEnds] = useState(defaultEnd);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const today = MOCK_NOW_ISO.slice(0, 10);
  // the earliest end date the form accepts (an end date of today is rejected below)
  const tomorrow = new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const c = code.trim().toUpperCase();
    const v = Number(value);
    if (!/^[A-Z0-9]{4,16}$/.test(c)) errs.code = "4 to 16 letters or numbers, no spaces.";
    else if (existing.some((x) => x.toUpperCase() === c)) errs.code = "That code already exists. Try another.";
    if (kind === "percent" && (!Number.isInteger(v) || v < 5 || v > 90)) errs.value = "Between 5% and 90%.";
    if (kind === "flat" && (!Number.isInteger(v) || v < 50 || v >= price)) errs.value = `Between ₹50 and ${formatINR(price - 1)}.`;
    if (!Number.isInteger(Number(max)) || Number(max) < 1 || Number(max) > 10000) errs.max = "Between 1 and 10,000.";
    if (!ends || ends <= today) errs.ends = `Pick ${formatDate(`${tomorrow}T12:00:00+05:30`)} or later.`;
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstInvalid(formRef.current);
      return;
    }
    demo.upsertCoupon({
      code: c,
      description: kind === "percent" ? `${v}% off this course` : `${formatINR(v)} off this course`,
      kind,
      value: v,
      courseIds: [courseId],
      maxRedemptions: Number(max),
      redemptions: 0,
      startsAt: MOCK_NOW_ISO,
      endsAt: `${ends}T23:59:59+05:30`,
      active: true,
      createdBy: userId,
    });
    toast.success(`${c} is live`, { description: "Share it anywhere. It works at checkout right away." });
    setCode("");
  };

  return (
    <Card className="h-fit">
      <CardHeader as="h3" eyebrow="New code" title="Create a coupon" />
      <form ref={formRef} onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-1">
        <Field label="Code" required error={errors.code}>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} maxLength={16} placeholder="LAUNCH20" className="font-mono uppercase" />
        </Field>
        <div>
          <p id="coupon-discount-label" className="mb-2 text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] text-fg uppercase">
            Discount
          </p>
          <div className="flex items-start gap-2">
            <Segmented
              label="Discount type"
              size="sm"
              value={kind}
              onChange={(k) => {
                setKind(k);
                setValue(k === "percent" ? "15" : "200");
              }}
              options={[
                { value: "percent", label: "%" },
                { value: "flat", label: "₹" },
              ]}
              className="mt-1"
            />
            <Input
              inputMode="numeric"
              aria-label={kind === "percent" ? "Discount in percent" : "Discount in rupees"}
              aria-invalid={!!errors.value}
              aria-describedby={errors.value ? "coupon-value-err" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
              className="flex-1"
            />
          </div>
          {errors.value && (
            <p id="coupon-value-err" role="alert" className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug font-medium text-red-deep">
              <span aria-hidden className="mt-[5px] size-[6px] shrink-0 bg-current" />
              {errors.value}
            </p>
          )}
        </div>
        <Field label="Max uses" error={errors.max}>
          <Input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))} />
        </Field>
        <Field label="Ends on" error={errors.ends}>
          <Input type="date" value={ends} min={tomorrow} onChange={(e) => setEnds(e.target.value)} />
        </Field>
        <div className="border-t border-line pt-5 sm:col-span-2 2xl:col-span-1">
          <Button type="submit" icon="ticket">
            Create code
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** How the price sits next to published courses in the same category (sample catalog). */
function PriceContext({ db, courseId, categoryId, price }: { db: Db; courseId: string; categoryId: string; price: number }) {
  const peers = db.courses.filter((c) => c.status === "published" && c.id !== courseId && c.categoryId === categoryId).map((c) => c.price);
  const pool = peers.length >= 2 ? peers : db.courses.filter((c) => c.status === "published" && c.id !== courseId).map((c) => c.price);
  if (pool.length < 2) return null;
  const sorted = [...pool].sort((a, b) => a - b);
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  // even count: the mean of the two middle prices (rounded to the rupee)
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  const span = Math.max(1, hi - lo);
  const at = Math.min(100, Math.max(0, ((price - lo) / span) * 100));
  const medAt = Math.min(100, Math.max(0, ((median - lo) / span) * 100));
  const verdict =
    price < lo
      ? "Below everything similar. Learners may wonder what's missing."
      : price > hi
        ? "Above everything similar. Make sure the promise earns it."
        : price === hi
          ? "At the top of the range. Make sure the promise and the curriculum show why."
          : price === lo
            ? "At the bottom of the range. An easy yes for curious learners."
            : price < median
              ? "On the friendly side of similar courses."
              : price === median
                ? "Right in the middle of similar courses."
                : "On the premium side of similar courses.";
  return (
    <div className="border-t border-line pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="t-label">What similar courses charge</p>
        <MonoMeta as="span">
          {peers.length >= 2 ? `${sorted.length} in this category` : `${sorted.length} on Tamada`} · median {formatINR(median)}
        </MonoMeta>
      </div>
      <div className="relative mt-7 mb-3 h-px bg-line-strong">
        <span aria-hidden className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted" style={{ left: `${medAt}%` }} />
        <span aria-hidden className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 bg-red" style={{ left: `${at}%` }} />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted tabular-nums">
        <span>{formatINR(lo)}</span>
        <span>{formatINR(hi)}</span>
      </div>
      <p className="mt-4 font-heading text-[17px] leading-snug font-semibold tracking-[-0.02em]">
        {formatINR(price)}: <span className="font-normal text-fg/80">{verdict}</span>
      </p>
    </div>
  );
}
