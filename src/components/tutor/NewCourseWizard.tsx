"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import clsx from "clsx";
import { cropSrc } from "@/lib/img";
import { formatINR, getCategories, type CourseCardData, type CourseLevel, type Tone } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { COURSE_LANGUAGES, COURSE_LEVELS, GST_RATE, PRICE_MAX, PRICE_MIN, PRICE_PRESETS, THUMBNAIL_PRESETS } from "@/lib/mock/extra/tutor";
import { BottomSheet, Button, CourseCard, Field, Icon, Input, PageHeader, RadioGroup, Select, StickyActionBar, Textarea, UnsavedChangesGuard, toast } from "@/components/app";
import { Figure, SquareTick, TonePalette, editorialTone, pad2 } from "./editorial";
import { useTutorContext } from "./shared";

const STEPS = [
  { id: "basics", label: "Basics", hint: "Title and promise" },
  { id: "audience", label: "Audience", hint: "Level and language" },
  { id: "price", label: "Price", hint: "What it costs" },
  { id: "cover", label: "Cover", hint: "Image and colour" },
] as const;

interface Draft {
  title: string;
  promise: string;
  categoryId: string;
  level: CourseLevel;
  language: string;
  price: string;
  thumbnail: string;
  tone: Tone;
}

export function NewCourseWizard() {
  const { userId, db, tutor } = useTutorContext();
  const router = useTransitionRouter();
  const categories = useMemo(() => getCategories(db), [db]);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  /** phones: the live preview card lives in a bottom sheet */
  const [previewOpen, setPreviewOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [d, setD] = useState<Draft>({
    title: "",
    promise: "",
    categoryId: "",
    level: "Beginner",
    language: "English",
    price: "999",
    thumbnail: "",
    tone: "ink",
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const price = Number(d.price);
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (d.title.trim().length < 5) errors.title = d.title.trim() ? "A little longer, please: at least 5 characters." : "Give your course a working title. You can change it later.";
  else if (d.title.length > 80) errors.title = "Keep it under 80 characters.";
  if (d.promise.length > 120) errors.promise = "Keep the promise under 120 characters.";
  if (!d.categoryId) errors.categoryId = "Pick the shelf learners will find it on.";
  if (!d.price.trim() || !Number.isFinite(price)) errors.price = "Enter a price in rupees.";
  else if (price < PRICE_MIN || price > PRICE_MAX) errors.price = `Prices run from ${formatINR(PRICE_MIN)} to ${formatINR(PRICE_MAX)}.`;
  else if (!Number.isInteger(price)) errors.price = "Use whole rupees.";
  if (!d.thumbnail) errors.thumbnail = "Choose a cover image.";

  const stepFields: (keyof Draft)[][] = [["title", "promise", "categoryId"], ["level", "language"], ["price"], ["thumbnail"]];
  const stepValid = (i: number) => stepFields[i].every((f) => !errors[f]);
  const show = (f: keyof Draft) => (touched[f] ? errors[f] : undefined);

  const go = (i: number) => {
    setStep(i);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const next = () => {
    if (!stepValid(step)) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(stepFields[step].map((f) => [f, true])) }));
      // take keyboard and screen-reader users straight to the first thing to fix
      const first = stepFields[step].find((f) => errors[f]);
      requestAnimationFrame(() => {
        const el = first === "thumbnail" ? document.querySelector<HTMLElement>('input[name="thumbnail"]') : document.querySelector<HTMLElement>(`[data-field="${first}"]`);
        el?.focus();
      });
      return;
    }
    if (step < STEPS.length - 1) go(step + 1);
    else create();
  };
  const create = () => {
    if (!STEPS.every((_, i) => stepValid(i))) return;
    setCreating(true);
    const course = demo.createCourse(userId, {
      title: d.title.trim(),
      promise: d.promise.trim(),
      categoryId: d.categoryId,
      level: d.level,
      language: d.language,
      price,
      thumbnail: d.thumbnail,
      tone: d.tone,
      tags: [categories.find((c) => c.id === d.categoryId)?.name ?? "Course"],
    });
    toast.success("Draft created", { description: "Module 1 is ready. Add your first video next; everything saves as you go." });
    router.push(`/tutor/courses/${course.id}/builder`, { skipGuards: true });
  };

  const share = tutor?.revenueShare ?? 0.7;
  const exGst = Number.isFinite(price) ? Math.round(price / (1 + GST_RATE)) : 0;
  const youKeep = Math.round(exGst * share);

  const preview: CourseCardData = {
    course: {
      id: "preview",
      slug: "preview",
      tutorId: userId,
      categoryId: d.categoryId,
      title: d.title.trim() || "Your course title",
      promise: d.promise.trim() || "A one-line promise: what learners can do after the last lesson.",
      description: "",
      thumbnail: d.thumbnail || THUMBNAIL_PRESETS[0].src,
      tone: d.tone,
      level: d.level,
      language: d.language,
      price: Number.isFinite(price) && price > 0 ? price : 0,
      currency: "INR",
      status: "draft",
      tags: [],
      outcomes: [],
      requirements: [],
      rating: 0,
      reviewCount: 0,
      learners: 0,
      createdAt: "",
      updatedAt: "",
      hasCertificate: true,
    },
    tutor,
    category: categories.find((c) => c.id === d.categoryId) ?? null,
    stats: { modules: 4, videos: 16, quizzes: 3, resources: 2, items: 21, totalSec: 3 * 3600 + 20 * 60, freePreviews: 1 },
    firstFreeItemId: null,
  };

  return (
    <div className="app-enter">
      <UnsavedChangesGuard
        when={!!(d.title.trim() || d.promise.trim() || d.categoryId) && !creating}
        title="Leave this new course?"
        description="Nothing is saved until you create the draft on the last step. Leave now and your title and choices are gone."
        confirmLabel="Leave without creating"
      />
      <PageHeader
        eyebrow="New course"
        title={
          <>
            Start with a <em>title</em>.
          </>
        }
        description="Four quick steps and you're in the course studio. Nothing goes live until you send it for review."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses", href: "/tutor/courses" }, { label: "New course" }]}
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-14">
        <div className="min-w-0">
          {/* Stepper: a ruled row of four steps, mono counters */}
          <ol className="mb-10 grid grid-cols-4 border-t border-line max-sm:hidden md:mb-12" aria-label="Steps">
            {STEPS.map((s, i) => {
              const reachable = i <= step || STEPS.slice(0, i).every((_, j) => stepValid(j));
              const done = i < step && stepValid(i);
              const current = i === step;
              return (
                <li key={s.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => reachable && go(i)}
                    disabled={!reachable}
                    aria-current={current ? "step" : undefined}
                    className={clsx(
                      "tap group relative -mt-px flex w-full flex-col gap-3 border-t-2 pt-4 pr-3 pb-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red disabled:cursor-not-allowed",
                      current ? "border-red" : done ? "border-fg" : "border-transparent",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={clsx("font-mono text-[11px] tracking-[0.04em] tabular-nums", current ? "text-red-deep" : "text-muted")}>
                        {pad2(i + 1)}/{pad2(STEPS.length)}
                      </span>
                      {done && <SquareTick state="done" className="!size-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className={clsx("block truncate text-[11.5px] font-semibold tracking-[0.14em] uppercase", current || done ? "text-fg" : "text-muted", reachable && !current && "group-hf:text-fg")}>{s.label}</span>
                      <span className="mt-1 hidden truncate text-[13px] text-muted md:block">{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <form
            id="new-course-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            {/* phones: one mono line + a 4-segment progress bar instead of the stepper */}
            <div className="mb-6 sm:hidden">
              <p className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase tabular-nums">
                Step {pad2(step + 1)} / {pad2(STEPS.length)} · <span className="text-fg">{STEPS[step].label}</span>
              </p>
              <div className="mt-2.5 grid grid-cols-4 gap-1" role="progressbar" aria-label="Wizard progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].label}`}>
                {STEPS.map((s, i) => (
                  <span key={s.id} className={clsx("h-[3px] transition-colors duration-300", i < step ? "bg-fg" : i === step ? "bg-red" : "bg-line")} />
                ))}
              </div>
            </div>
            <div className="border-t border-fg pt-6 md:pt-8">
              <p className="t-label text-muted max-sm:hidden">
                <span className="font-mono tracking-[0.04em] text-red-deep">{pad2(step + 1)}</span>
                <span className="mx-2 opacity-40">/</span>
                {STEPS[step].label}
              </p>
              <h2 ref={headingRef} tabIndex={-1} className="mt-3 max-w-[22ch] font-heading text-[clamp(1.625rem,1.3rem+1.1vw,2.375rem)] leading-[1.04] font-semibold tracking-[-0.04em] focus:outline-none max-sm:mt-0">
                {["What are you teaching?", "Who is it for?", "What should it cost?", "Make it look the part."][step]}
              </h2>

              <div className="mt-8 flex max-w-[640px] flex-col gap-7">
                {step === 0 && (
                  <>
                    <Field label="Course title" required hint="Short and specific beats clever. Think: what would someone type into search?" error={show("title")}>
                      <Input
                        value={d.title}
                        onChange={(e) => set("title", e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                        data-field="title"
                        maxLength={90}
                        placeholder="e.g. AI Music Videos: From Track to Final Cut"
                        autoFocus
                      />
                    </Field>
                    <Field label="One-line promise" optional hint={`What can learners do after the last lesson? ${d.promise.length}/120`} error={show("promise")}>
                      <Textarea value={d.promise} onChange={(e) => set("promise", e.target.value)} rows={2} placeholder="Cut a finished 60-second AI short in a weekend." data-field="promise" />
                    </Field>
                    <Field label="Category" required error={show("categoryId")}>
                      <Select
                        value={d.categoryId}
                        onChange={(e) => {
                          set("categoryId", e.target.value);
                          setTouched((t) => ({ ...t, categoryId: true }));
                        }}
                        placeholder="Choose a category"
                        data-field="categoryId"
                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      />
                    </Field>
                  </>
                )}

                {step === 1 && (
                  <>
                    <RadioGroup
                      label="Level"
                      name="level"
                      variant="cards"
                      orientation="horizontal"
                      value={d.level}
                      onChange={(v) => set("level", v)}
                      options={COURSE_LEVELS.map((l) => ({ value: l.value, label: l.label, description: l.description }))}
                      className="[&>div>label]:min-w-[180px]"
                    />
                    <Field label="Teaching language" hint="The language you speak in the videos. Subtitles can come later.">
                      <Select value={d.language} onChange={(e) => set("language", e.target.value)} options={COURSE_LANGUAGES.map((l) => ({ value: l, label: l }))} />
                    </Field>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Field label="Price (incl. GST)" required hint={`Between ${formatINR(PRICE_MIN)} and ${formatINR(PRICE_MAX)}. Most first courses sell best at ₹799 to ₹1,499.`} error={show("price")}>
                      <Input
                        prefix="₹"
                        inputMode="numeric"
                        value={d.price}
                        onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))}
                        onBlur={() => setTouched((t) => ({ ...t, price: true }))}
                        data-field="price"
                        className="max-w-[240px]"
                      />
                    </Field>
                    <div role="group" aria-label="Price presets" className="-mt-3 flex flex-wrap gap-2">
                      {PRICE_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => set("price", String(p))}
                          aria-pressed={price === p}
                          className={clsx(
                            "tap h-9 px-3.5 font-mono text-[12.5px] tracking-[0.02em] tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red coarse:h-11 coarse:px-4",
                            price === p ? "bg-ink text-cream" : "ring-1 ring-line-strong ring-inset hf:bg-fg hf:text-surface",
                          )}
                        >
                          {formatINR(p)}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 border-y border-line min-[480px]:grid-cols-3">
                      <Figure className="py-5 min-[480px]:pr-5" label="Learner pays" value={Number.isFinite(price) ? formatINR(price) : "–"} />
                      <Figure className="border-line py-5 max-[479px]:border-t min-[480px]:border-l min-[480px]:px-5" label="Before 18% GST" value={formatINR(exGst)} />
                      <Figure
                        className="border-line py-5 max-[479px]:border-t min-[480px]:border-l min-[480px]:pl-5 [&>p:nth-child(2)]:text-red-deep"
                        label={`You keep · ${Math.round(share * 100)}%`}
                        value={formatINR(youKeep)}
                        strong
                      />
                    </div>
                    <p className="t-small -mt-2 text-muted">The first video is always free, so learners can try before they buy. Coupons and launch offers live in the course studio.</p>
                  </>
                )}

                {step === 3 && (
                  <>
                    <fieldset>
                      <legend className="mb-2 text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] text-fg uppercase">
                        Cover image <span className="text-red" aria-hidden>*</span>
                      </legend>
                      <p className="-mt-1 mb-4 text-[12.5px] leading-snug text-muted">Pick one for now. A custom cover upload comes with the real platform.</p>
                      <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:gap-3">
                        {THUMBNAIL_PRESETS.map((t, i) => {
                          const on = d.thumbnail === t.src;
                          return (
                            <label key={t.id} className="group relative block cursor-pointer">
                              <input
                                type="radio"
                                name="thumbnail"
                                value={t.src}
                                checked={on}
                                onChange={() => {
                                  setD((x) => ({ ...x, thumbnail: t.src, tone: x.thumbnail ? x.tone : editorialTone(t.tone) }));
                                  setTouched((x) => ({ ...x, thumbnail: true }));
                                }}
                                className="peer sr-only"
                              />
                              <span className={clsx("relative block aspect-[4/3] overflow-hidden bg-charcoal transition-[box-shadow] duration-200", on ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : "ring-1 ring-line ring-inset")}>
                                <Image src={cropSrc(t.src, 3 / 4)} alt="" fill sizes="(min-width: 768px) 160px, 30vw" className={clsx("object-cover transition-opacity duration-300", on ? "opacity-100" : "opacity-85 group-hf:opacity-100")} />
                                {on && (
                                  <span className="absolute top-0 right-0 grid size-7 place-items-center bg-ink text-cream" aria-hidden>
                                    <Icon name="check" className="size-3.5" strokeWidth={2.6} />
                                  </span>
                                )}
                              </span>
                              <span className="mt-2 flex items-baseline gap-2">
                                <span className="font-mono text-[10.5px] text-red-deep tabular-nums" aria-hidden>
                                  {pad2(i + 1)}
                                </span>
                                <span className={clsx("min-w-0 truncate font-mono text-[10.5px] tracking-[0.08em] uppercase", on ? "text-fg" : "text-muted")}>{t.label}</span>
                              </span>
                              <span className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-red" />
                            </label>
                          );
                        })}
                      </div>
                      {show("thumbnail") && (
                        <p role="alert" className="mt-3 flex items-start gap-2 text-[12.5px] leading-snug font-medium text-red-deep">
                          <span aria-hidden className="mt-[5px] size-[6px] shrink-0 bg-current" />
                          {errors.thumbnail}
                        </p>
                      )}
                    </fieldset>
                    <TonePalette legend="Card colour" hint="The ground your cover sits on in the catalog." value={d.tone} onChange={(t) => set("tone", t)} />
                  </>
                )}
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-fg pt-5 max-sm:hidden">
                {step > 0 ? (
                  <Button variant="ghost" icon="arrow-left" onClick={() => go(step - 1)}>
                    Back
                  </Button>
                ) : (
                  <Button variant="ghost" href="/tutor/courses">
                    Cancel
                  </Button>
                )}
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase tabular-nums max-md:hidden">
                    {pad2(step + 1)} / {pad2(STEPS.length)}
                  </span>
                  <Button type="submit" variant={step === STEPS.length - 1 ? "red" : "primary"} iconRight="arrow-right" loading={creating}>
                    {step === STEPS.length - 1 ? "Create draft and open studio" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
          {/* phones: the live preview collapses into a button + bottom sheet */}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="tap mt-8 flex min-h-16 w-full items-center gap-3.5 border-y border-line py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red sm:hidden"
          >
            <span className="relative block size-12 shrink-0 overflow-hidden bg-charcoal">
              <Image src={cropSrc(d.thumbnail || THUMBNAIL_PRESETS[0].src, 1)} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-[15.5px] font-semibold tracking-[-0.015em]">Preview card</span>
              <span className="block truncate font-mono text-[11px] tracking-[0.06em] text-muted uppercase">How it looks in the catalog</span>
            </span>
            <Icon name="eye" strokeWidth={1.6} className="size-5 shrink-0 text-muted" />
          </button>
        </div>

        <aside className="min-w-0 max-sm:hidden" aria-label="Live preview">
          <div className="xl:sticky xl:top-[88px]">
            <div className="mb-5 flex items-baseline justify-between gap-3 border-t border-fg pt-4">
              <p className="t-label">Live preview</p>
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
                <span aria-hidden className="size-[6px] rounded-full bg-red" />
                Catalog card
              </span>
            </div>
            <div inert className="max-w-[340px] max-xl:mx-auto">
              <CourseCard data={preview} headingLevel="h3" href="#" priority />
            </div>
            <p className="mt-4 text-[12.5px] leading-snug text-muted max-xl:text-center">How your card looks in the catalog. Lesson counts are placeholders until you build.</p>
          </div>
        </aside>
      </div>

      <BottomSheet open={previewOpen} onClose={() => setPreviewOpen(false)} title="Your catalog card" description="Lesson counts are placeholders until you build.">
        <div inert className="mx-auto max-w-[340px] pb-2">
          <CourseCard data={preview} headingLevel="h3" href="#" />
        </div>
      </BottomSheet>

      {/* phones: Back / Next stay under the thumb (and above the keyboard) */}
      <StickyActionBar
        show
        label="Wizard steps"
        title={`Step ${pad2(step + 1)} / ${pad2(STEPS.length)}`}
        sub={STEPS[step].hint}
      >
        {step > 0 ? (
          <Button variant="outline" iconOnly icon="arrow-left" aria-label="Back" onClick={() => go(step - 1)} className="size-12" />
        ) : (
          <Button variant="ghost" href="/tutor/courses" className="h-12 px-3">
            Cancel
          </Button>
        )}
        <Button type="submit" form="new-course-form" variant={step === STEPS.length - 1 ? "red" : "primary"} iconRight="arrow-right" loading={creating} className="h-12">
          {step === STEPS.length - 1 ? "Create draft" : "Next"}
        </Button>
      </StickyActionBar>
    </div>
  );
}
