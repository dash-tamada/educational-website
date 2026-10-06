"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useTransitionRouter } from "@/components/transition/RouteTransition";
import clsx from "clsx";
import { toneBg } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import { formatINR, getCategories, type CourseCardData, type CourseLevel, type Tone } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { CARD_TONES, COURSE_LANGUAGES, COURSE_LEVELS, GST_RATE, PRICE_MAX, PRICE_MIN, PRICE_PRESETS, THUMBNAIL_PRESETS } from "@/lib/mock/extra/tutor";
import { BottomSheet, Button, Card, CourseCard, Field, Icon, Input, PageHeader, RadioGroup, Select, StickyActionBar, Textarea, UnsavedChangesGuard, toast } from "@/components/app";
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
    tone: "sun",
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
        eyebrowTone="green"
        title="Start with a title."
        description="Four quick steps and you're in the course studio. Nothing goes live until you send it for review."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses", href: "/tutor/courses" }, { label: "New course" }]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
        <div className="min-w-0">
          {/* Stepper */}
          <ol className="mb-4 grid grid-cols-4 gap-2 max-sm:hidden" aria-label="Steps">
            {STEPS.map((s, i) => {
              const reachable = i <= step || STEPS.slice(0, i).every((_, j) => stepValid(j));
              const done = i < step && stepValid(i);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => reachable && go(i)}
                    disabled={!reachable}
                    aria-current={i === step ? "step" : undefined}
                    className={clsx(
                      "tap flex w-full flex-col gap-2 rounded-[18px] p-2.5 text-left max-sm:px-2 transition-colors sm:flex-row sm:items-center sm:p-3",
                      i === step ? "bg-ink text-cream" : "bg-white shadow-soft hf:bg-butter disabled:opacity-60 disabled:hf:bg-white",
                    )}
                  >
                    <span
                      className={clsx(
                        "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                        i === step ? "bg-sun text-ink" : done ? "bg-green text-white" : "bg-cream text-ink",
                      )}
                      aria-hidden
                    >
                      {done ? <Icon name="check" className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-bold sm:text-[14px]">{s.label}</span>
                      <span className={clsx("hidden truncate text-[12px] font-semibold md:block", i === step ? "text-cream/60" : "text-ink/50")}>{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <Card padding="lg">
            <form id="new-course-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <p className="t-micro text-ink/50 uppercase max-sm:hidden">
                Step {step + 1} of {STEPS.length}
              </p>
              {/* phones: one line + a 4-segment progress bar instead of the stepper chips */}
              <div className="mb-4 sm:hidden">
                <p className="text-[13px] font-bold text-ink/60">
                  Step {step + 1} of {STEPS.length} · <span className="text-ink">{STEPS[step].label}</span>
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1.5" role="progressbar" aria-label="Wizard progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].label}`}>
                  {STEPS.map((s, i) => (
                    <span key={s.id} className={clsx("h-1.5 rounded-full transition-colors duration-300", i < step ? "bg-green" : i === step ? "bg-ink" : "bg-ink/10")} />
                  ))}
                </div>
              </div>
              <h2 ref={headingRef} tabIndex={-1} className="t-app-h2 mt-1 focus:outline-none">
                {["What are you teaching?", "Who is it for?", "What should it cost?", "Make it look the part."][step]}
              </h2>

              <div className="mt-5 flex flex-col gap-5">
                {step === 0 && (
                  <>
                    <Field label="Course title" required hint="Short and specific beats clever. Think: what would someone type into search?" error={show("title")}>
                      <Input
                        value={d.title}
                        onChange={(e) => set("title", e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                        data-field="title"
                        maxLength={90}
                        placeholder="e.g. Excel Formulas for Office Heroes"
                        autoFocus
                      />
                    </Field>
                    <Field label="One-line promise" optional hint={`What can learners do after the last lesson? ${d.promise.length}/120`} error={show("promise")}>
                      <Textarea value={d.promise} onChange={(e) => set("promise", e.target.value)} rows={2} placeholder="Build and publish your first website in a weekend." data-field="promise" />
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
                      className="[&>div>label]:min-w-[200px]"
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
                    <div role="group" aria-label="Price presets" className="-mt-2 flex flex-wrap gap-2">
                      {PRICE_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => set("price", String(p))}
                          aria-pressed={price === p}
                          className={clsx("tap h-9 rounded-full px-3.5 text-[14px] font-bold transition-colors coarse:h-11 coarse:px-4", price === p ? "bg-ink text-cream" : "bg-cream hf:bg-butter")}
                        >
                          {formatINR(p)}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3 rounded-[20px] bg-mint/50 p-4 sm:grid-cols-3">
                      <Money label="Learner pays" value={Number.isFinite(price) ? formatINR(price) : "–"} />
                      <Money label="Price before 18% GST" value={formatINR(exGst)} />
                      <Money label={`You keep (${Math.round(share * 100)}%)`} value={formatINR(youKeep)} strong />
                    </div>
                    <p className="t-small -mt-2 text-ink/60">The first video is always free, so learners can try before they buy. Coupons and launch offers live in the course studio.</p>
                  </>
                )}

                {step === 3 && (
                  <>
                    <fieldset>
                      <legend className="mb-2 text-[14px] font-bold">
                        Cover image <span className="text-flame" aria-hidden>*</span>
                      </legend>
                      <p className="t-small -mt-1 mb-3 text-ink/60">Pick one for now. A custom cover upload comes with the real platform.</p>
                      <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:gap-3">
                        {THUMBNAIL_PRESETS.map((t) => {
                          const on = d.thumbnail === t.src;
                          return (
                            <label key={t.id} className={clsx("group relative block cursor-pointer overflow-hidden rounded-[16px] ring-offset-2 transition-shadow", on ? "ring-3 ring-ink" : "ring-0 hf:ring-2 hf:ring-ink/30")}>
                              <input
                                type="radio"
                                name="thumbnail"
                                value={t.src}
                                checked={on}
                                onChange={() => {
                                  setD((x) => ({ ...x, thumbnail: t.src, tone: x.thumbnail ? x.tone : t.tone }));
                                  setTouched((x) => ({ ...x, thumbnail: true }));
                                }}
                                className="peer sr-only"
                              />
                              <span className="relative block aspect-[4/3] bg-ink/10">
                                <Image src={cropSrc(t.src, 3 / 4)} alt="" fill sizes="(min-width: 768px) 160px, 30vw" className="object-cover" />
                              </span>
                              <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-full bg-white/90 px-2 py-1 text-center text-[12px] font-bold">{t.label}</span>
                              {on && (
                                <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink text-cream" aria-hidden>
                                  <Icon name="check" className="size-3.5" strokeWidth={3} />
                                </span>
                              )}
                              <span className="pointer-events-none absolute inset-0 rounded-[16px] peer-focus-visible:outline-3 peer-focus-visible:-outline-offset-3 peer-focus-visible:outline-blue" />
                            </label>
                          );
                        })}
                      </div>
                      {show("thumbnail") && (
                        <p role="alert" className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-[#c13500]">
                          <Icon name="alert" className="size-3.5" strokeWidth={2.4} />
                          {errors.thumbnail}
                        </p>
                      )}
                    </fieldset>
                    <TonePicker value={d.tone} onChange={(t) => set("tone", t)} />
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.07] pt-5 max-sm:hidden">
                {step > 0 ? (
                  <Button variant="ghost" icon="arrow-left" onClick={() => go(step - 1)}>
                    Back
                  </Button>
                ) : (
                  <Button variant="ghost" href="/tutor/courses">
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant={step === STEPS.length - 1 ? "accent" : "primary"} iconRight="arrow-right" loading={creating}>
                  {step === STEPS.length - 1 ? "Create draft and open studio" : "Next"}
                </Button>
              </div>
            </form>
          </Card>
          {/* phones: the live preview collapses into a button + bottom sheet */}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="tap mt-3 flex min-h-14 w-full items-center gap-3 rounded-card bg-white py-2 pr-4 pl-2 text-left shadow-soft sm:hidden"
          >
            <span className={clsx("relative block h-10 w-16 shrink-0 overflow-hidden rounded-[10px]", toneBg[d.tone])}>
              <Image src={cropSrc(d.thumbnail || THUMBNAIL_PRESETS[0].src, 10 / 16)} alt="" fill sizes="64px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Preview card</span>
              <span className="block truncate text-[13px] font-semibold text-ink/55">How it looks in the catalog</span>
            </span>
            <Icon name="eye" className="size-5 shrink-0 text-ink/55" />
          </button>
        </div>

        <aside className="min-w-0 max-sm:hidden" aria-label="Live preview">
          <div className="xl:sticky xl:top-[88px]">
            <p className="t-micro mb-2 text-ink/50 uppercase max-xl:text-center">Live preview</p>
            <div inert className="mx-auto max-w-[340px]">
              <CourseCard data={preview} headingLevel="h3" href="#" priority />
            </div>
            <p className="t-small mt-3 text-center text-ink/55">How your card looks in the catalog. Lesson counts are placeholders until you build.</p>
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
        title={`Step ${step + 1} of ${STEPS.length}`}
        sub={STEPS[step].hint}
      >
        {step > 0 ? (
          <Button variant="secondary" iconOnly icon="arrow-left" aria-label="Back" onClick={() => go(step - 1)} className="size-12" />
        ) : (
          <Button variant="ghost" href="/tutor/courses" className="h-12 px-3">
            Cancel
          </Button>
        )}
        <Button type="submit" form="new-course-form" variant={step === STEPS.length - 1 ? "accent" : "primary"} iconRight="arrow-right" loading={creating} className="h-12">
          {step === STEPS.length - 1 ? "Create draft" : "Next"}
        </Button>
      </StickyActionBar>
    </div>
  );
}

function Money({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[12.5px] font-bold text-forest/70">{label}</p>
      <p className={clsx("mt-1 font-heading leading-none font-extrabold tracking-[-0.02em] text-forest", strong ? "text-[26px]" : "text-[20px]")}>{value}</p>
    </div>
  );
}

/** Card colour swatches (radio group). */
export function TonePicker({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-bold">Card colour</legend>
      <div className="flex flex-wrap gap-2">
        {CARD_TONES.map((t) => (
          <label key={t.value} className="relative cursor-pointer" title={t.label}>
            <input type="radio" name="tone" value={t.value} checked={value === t.value} onChange={() => onChange(t.value)} className="peer sr-only" />
            <span
              className={clsx(
                "grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-white transition-shadow peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
                toneBg[t.value],
                value === t.value ? "ring-3 ring-ink" : "ring-1 ring-ink/10",
              )}
            >
              {value === t.value && <Icon name="check" className={clsx("size-4", ["blue", "green", "indigo", "purple", "hotpink"].includes(t.value) ? "text-white" : "text-ink")} strokeWidth={3} />}
            </span>
            <span className="sr-only">{t.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
