"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { formatDuration, getCourseById, getCurriculum, plural, timeAgo, type Course, type Module } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { Button, Card, CardHeader, EmptyState, Icon, Modal, PageHeader, Skeleton, StatusPill, StickyActionBar, TabPanel, Tabs, Tooltip, toast, useScrollHide } from "@/components/app";
import { useTutorContext } from "../shared";
import { CurriculumEditor } from "./CurriculumEditor";
import { DetailsPanel, PricingPanel, fieldErrors, type CourseFields } from "./SettingsPanels";
import { buildChecklist, firstVideo, manualFreeIds, normalize, reconcileFreePreview, stripUndefined, type CheckItem } from "./utils";

type Tab = "curriculum" | "details" | "pricing";

export function CourseBuilder({ courseId, initialTab }: { courseId: string; initialTab?: string }) {
  const { db, userId, hydrated } = useTutorContext();
  const course = getCourseById(courseId, db);

  if (!hydrated) return <BuilderSkeleton />;
  if (!course) return <CourseNotFound />;
  if (course.tutorId !== userId)
    return (
      <div className="app-enter">
        <PageHeader
          eyebrow="Course studio"
          eyebrowTone="green"
          title="This course belongs to another tutor."
          breadcrumbs={[
            { label: "Studio", href: "/tutor" },
            { label: "Courses", href: "/tutor/courses" },
            // an unpublished course's title is private to its tutor (matches generateMetadata)
            { label: course.status === "published" ? course.title : "Another tutor's course" },
          ]}
        />
        <Card padding="lg">
          <EmptyState
            art="buddy"
            tone="blush"
            title="Only its tutor can edit it."
            body="You can edit your own courses in the studio. This one is still visible in the catalog if it's live."
            action={
              <>
                <Button href="/tutor/courses">Your courses</Button>
                {course.status === "published" && (
                  <Button href={`/courses/${course.slug}`} variant="secondary">
                    View in catalog
                  </Button>
                )}
              </>
            }
          />
        </Card>
      </div>
    );
  return <BuilderInner key={course.id} course={course} initialModules={getCurriculum(course.id, db)} initialTab={initialTab} />;
}

/** Shared "no such course" screen (client-only drafts that were reset, unknown ids). */
export function CourseNotFound() {
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Course studio"
        eyebrowTone="green"
        title="We can't find that course."
        description="Courses you create in the demo live in this browser. It may have been reset, or the link is from somewhere else."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses", href: "/tutor/courses" }, { label: "Not found" }]}
      />
      <Card padding="lg">
        <EmptyState
          art="tami"
          title="Nothing to edit here."
          body="Pick one of your courses, or start a fresh draft. It takes about a minute."
          action={
            <>
              <Button href="/tutor/courses" iconRight="arrow-right">
                Back to your courses
              </Button>
              <Button href="/tutor/courses/new" variant="secondary" icon="plus">
                New course
              </Button>
            </>
          }
        />
      </Card>
    </div>
  );
}

function pickFields(c: Course): CourseFields {
  return {
    title: c.title,
    promise: c.promise,
    description: c.description,
    categoryId: c.categoryId,
    level: c.level,
    language: c.language,
    tags: c.tags,
    outcomes: c.outcomes,
    requirements: c.requirements,
    thumbnail: c.thumbnail,
    tone: c.tone,
    hasCertificate: c.hasCertificate,
    price: c.price,
    compareAtPrice: c.compareAtPrice,
  };
}

/* ----------------------------------------------------------------------------- autosave */
function useAutosave() {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const pending = useRef(new Map<string, () => void>());
  const timer = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (!pending.current.size) return;
    pending.current.forEach((fn) => fn());
    pending.current.clear();
    setState("saved");
    setSavedAt(Date.now());
  }, []);
  const schedule = useCallback(
    (key: string, fn: () => void) => {
      pending.current.set(key, fn);
      setState("saving");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 650);
    },
    [flush],
  );
  // never lose an edit: flush on unmount and before the tab closes
  useEffect(() => {
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [flush]);
  return { state, savedAt, schedule, flush };
}

function SaveIndicator({ state, savedAt }: { state: "idle" | "saving" | "saved"; savedAt: number | null }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, []);
  const ago = savedAt && now > savedAt ? Math.floor((now - savedAt) / 60_000) : 0;
  return (
    <span role="status" aria-live="polite" className={clsx("inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-bold transition-colors", state === "saving" ? "bg-butter text-[#6b5400]" : "bg-white text-ink/65 shadow-soft")}>
      {state === "saving" ? (
        <>
          <Icon name="refresh" className="size-3.5 animate-spin" strokeWidth={2.4} /> Saving…
        </>
      ) : (
        <>
          <Icon name="check" className="size-3.5 text-green" strokeWidth={3} />
          {state === "saved" ? (ago < 1 ? "Saved just now" : `Saved ${ago} min ago`) : "All changes saved"}
        </>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------------------- inner */
function BuilderInner({ course, initialModules, initialTab }: { course: Course; initialModules: Module[]; initialTab?: string }) {
  const { db, userId, tutor } = useTutorContext();
  const live = getCourseById(course.id, db) ?? course;
  // stripUndefined also cleans fields an older build stored as the store's "cleared" sentinel
  const [initial] = useState<Module[]>(() => normalize(course.id, stripUndefined(initialModules)));
  const [modules, setModulesState] = useState<Module[]>(initial);
  const [fields, setFields] = useState<CourseFields>(() => pickFields(course));
  const [tab, setTabState] = useState<Tab>(initialTab === "details" || initialTab === "pricing" ? initialTab : "curriculum");
  const [submitOpen, setSubmitOpen] = useState(false);
  /** phones: the page actions mirror into a sticky bar once the header buttons scroll away,
   *  and the section tabs stick under the (auto-hiding) top bar */
  const headerEnd = useRef<HTMLDivElement>(null);
  const topBarHidden = useScrollHide({ after: 56, delta: 8 });
  const save = useAutosave();
  const { schedule } = save;
  /** current order (for diffing), the last saved order (for undo) and the tutor's own free-preview opt-ins */
  const current = useRef(initial);
  const lastSaved = useRef(initial);
  const manualFree = useRef<Set<string> | null>(null);

  const setModules = useCallback(
    function apply(next: Module[], opts: { save?: boolean; quiet?: boolean } = {}) {
      if (!manualFree.current) manualFree.current = manualFreeIds(current.current);
      const clean = normalize(course.id, reconcileFreePreview(current.current, next, manualFree.current));
      current.current = clean;
      setModulesState(clean);
      if (opts.save === false) return;
      const before = lastSaved.current;
      lastSaved.current = clean;
      schedule("curriculum", () => demo.saveCurriculum(course.id, stripUndefined(clean)));
      // tell the tutor when the free preview moved to another video (and let them undo it)
      const was = firstVideo(before);
      const now = firstVideo(clean);
      if (opts.quiet || !now || !was || was.id === now.id) return;
      const old = clean.flatMap((m) => m.items).find((it) => it.id === was.id);
      toast({
        title: `${now.lesson.title || "The new first lesson"} is now the free preview.`,
        description: old?.type === "video" ? (old.lesson.isFreePreview ? `${was.lesson.title || "The old first lesson"} stays free too (you opted it in).` : `${was.lesson.title || "The old first lesson"} is no longer free.`) : undefined,
        tone: "info",
        duration: 7000,
        action: { label: "Undo", onClick: () => apply(before, { quiet: true }) },
      });
    },
    [course.id, schedule],
  );
  const setTab = (t: Tab) => {
    setTabState(t);
    // keep ?tab= in the URL so a reload (or a shared link) opens the same section
    try {
      const url = new URL(window.location.href);
      if (t === "curriculum") url.searchParams.delete("tab");
      else url.searchParams.set("tab", t);
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch {}
  };
  const updateFields = (patch: Partial<CourseFields>) => {
    const next = { ...fields, ...patch };
    setFields(next);
    const errs = fieldErrors(next);
    const valid = Object.fromEntries(Object.entries(next).filter(([k]) => !errs[k as keyof CourseFields])) as Partial<CourseFields>;
    if ("compareAtPrice" in patch && !errs.compareAtPrice) valid.compareAtPrice = next.compareAtPrice;
    save.schedule("course", () => demo.updateCourse(course.id, valid));
  };

  const checklist = useMemo(() => buildChecklist(fields, modules), [fields, modules]);
  // the header shows what's actually saved: an invalid title draft never reaches the store
  const titleInvalid = !!fieldErrors(fields).title;
  const shownTitle = (titleInvalid ? live.title : fields.title.trim()) || "Untitled course";
  const required = checklist.filter((c) => c.required);
  const ready = required.every((c) => c.ok);
  const stats = useMemo(() => {
    const all = modules.flatMap((m) => m.items);
    return {
      videos: all.filter((i) => i.type === "video").length,
      quizzes: all.filter((i) => i.type === "quiz").length,
      resources: all.filter((i) => i.type === "resource").length,
      secs: all.reduce((s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0), 0),
    };
  }, [modules]);
  const firstItem = modules.flatMap((m) => m.items)[0];
  const previewHref = firstItem ? `/learn/${live.slug}/${firstItem.id}` : undefined;
  const canSubmit = live.status === "draft" || live.status === "rejected";

  const submit = () => {
    save.flush();
    demo.submitForReview(course.id);
    setSubmitOpen(false);
    toast.success("Course sent to the review queue.", { description: "We'll let you know what happens next. Reviews take 2 to 3 working days." });
    // the Submit button is replaced by a disabled "In review" one: move focus to the new status banner
    // (after the modal has closed and handed focus back)
    window.setTimeout(() => document.getElementById("studio-status")?.focus(), 80);
  };

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Course studio"
        eyebrowTone="green"
        title={shownTitle}
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses", href: "/tutor/courses" }, { label: shownTitle }]}
        meta={
          <>
            <StatusPill status={live.status} />
            <SaveIndicator state={save.state} savedAt={save.savedAt} />
            {titleInvalid && (
              <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-[#ffe1d4] px-2.5 text-[12.5px] font-bold text-[#8a2600]">
                <Icon name="alert" className="size-3.5" strokeWidth={2.4} /> Title not saved: fix it in Details
              </span>
            )}
            <span className="text-[13px] font-semibold text-ink/55">
              {[plural(modules.length, "module"), plural(stats.videos, "lesson"), plural(stats.quizzes, "test"), stats.secs > 0 ? formatDuration(stats.secs) : null].filter(Boolean).join(" · ")}
            </span>
          </>
        }
        actions={
          <>
            {previewHref ? (
              <Button variant="secondary" icon="eye" href={previewHref} onClick={() => save.flush()}>
                Preview
              </Button>
            ) : (
              <Tooltip label="Add a lesson to preview">
                <Button variant="secondary" icon="eye" aria-disabled aria-describedby="preview-why" className="opacity-60">
                  Preview
                </Button>
                <span id="preview-why" className="sr-only">
                  Add a lesson to preview the course.
                </span>
              </Tooltip>
            )}
            {canSubmit ? (
              <Button variant="accent" icon="arrow-right" onClick={() => setSubmitOpen(true)}>
                Submit for review
              </Button>
            ) : live.status === "published" ? (
              <Button variant="primary" icon="external" href={`/courses/${live.slug}`}>
                View live page
              </Button>
            ) : live.status === "in_review" ? (
              <Button variant="sun" icon="clock" disabled>
                In review
              </Button>
            ) : null}
          </>
        }
      />

      <div ref={headerEnd} aria-hidden className="h-px" />

      <StatusBanner course={live} />

      <div
        className="sticky z-20 -mx-4 mb-3 bg-cream/[0.96] px-4 py-2 transition-[top] duration-300 ease-[var(--ease-ui)] sm:static sm:mx-0 sm:mb-4 sm:bg-transparent sm:p-0 md:mb-5"
        style={{ top: topBarHidden ? "var(--sat, 0px)" : "calc(56px + var(--sat, 0px))" }}
      >
      <Tabs
        label="Course studio sections"
        idBase="builder"
        value={tab}
        onChange={(t) => {
          setTab(t as Tab);
          // phones: a section switch from the stuck tab bar starts that section at its top
          const bar = headerEnd.current;
          if (bar && window.matchMedia("(max-width: 639.98px)").matches && bar.getBoundingClientRect().top < 0) {
            window.scrollTo({ top: window.scrollY + bar.getBoundingClientRect().top - 8 });
          }
        }}
        items={[
          { id: "curriculum", label: "Curriculum", count: modules.reduce((s, m) => s + m.items.length, 0) },
          { id: "details", label: "Details" },
          {
            id: "pricing",
            label: (
              <span>
                Pricing<span className="max-sm:hidden"> &amp; coupons</span>
              </span>
            ),
          },
        ]}
      />
      </div>

      <TabPanel id="curriculum" active={tab} idBase="builder">
        <div className="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <CurriculumEditor courseId={course.id} modules={modules} onChange={setModules} />
          </div>
          <aside className="flex min-w-0 flex-col gap-4 md:gap-5 xl:sticky xl:top-[88px] xl:self-start" aria-label="Review readiness">
            <Card>
              <CardHeader title="Review checklist" description={ready ? "Everything required is done." : `${required.filter((c) => !c.ok).length} required ${required.filter((c) => !c.ok).length === 1 ? "step" : "steps"} left.`} />
              <Checklist items={checklist} onJump={(t) => setTab(t)} compact />
              {canSubmit && (
                <Button fullWidth variant={ready ? "accent" : "secondary"} className="mt-4" icon="arrow-right" onClick={() => setSubmitOpen(true)}>
                  {ready ? "Submit for review" : "See what's missing"}
                </Button>
              )}
            </Card>
            <Card tone="butter">
              <p className="t-app-h3">How the builder works</p>
              <ul className="t-small mt-3 flex flex-col gap-2.5">
                <li className="flex gap-2 coarse:hidden">
                  <Icon name="drag" className="mt-0.5 size-4 shrink-0" /> Drag the handles to reorder modules and lessons, or move lessons between modules. Keyboard: Space, arrows, Space.
                </li>
                <li className="hidden gap-2 coarse:flex">
                  <Icon name="sort" className="mt-0.5 size-4 shrink-0" /> Tap a row to edit it. Tap Reorder above the curriculum to move lessons, tests and modules with the arrows.
                </li>
                <li className="flex gap-2">
                  <Icon name="play" className="mt-0.5 size-4 shrink-0" /> The first video is free by default. You can open more previews when it helps learners decide.
                </li>
                <li className="flex gap-2">
                  <Icon name="quiz" className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Use an item&apos;s <span aria-label="more actions">⋯</span> menu to insert a test right after it
                    <span className="[@media(hover:none)]:hidden"> (or hover between two items and hit +)</span>. Turn on gating to make it a checkpoint.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Icon name="check-circle" className="mt-0.5 size-4 shrink-0" /> Everything saves as you go.
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </TabPanel>
      <TabPanel id="details" active={tab} idBase="builder">
        <DetailsPanel fields={fields} onChange={updateFields} db={db} />
      </TabPanel>
      <TabPanel id="pricing" active={tab} idBase="builder">
        <PricingPanel course={live} fields={fields} onChange={updateFields} db={db} userId={userId} revenueShare={tutor?.revenueShare ?? 0.7} />
      </TabPanel>

      {/* phones: the header actions follow you down the page (hidden while typing) */}
      <StickyActionBar
        watch={headerEnd}
        keyboard="hide"
        label="Course actions"
        title={shownTitle}
        sub={
          <>
            {{ draft: "Draft", in_review: "In review", published: "Live", rejected: "Sent back", archived: "Archived" }[live.status]} ·{" "}
            {save.state === "saving" ? "Saving…" : "All changes saved"}
          </>
        }
      >
        {previewHref ? (
          <Button variant="secondary" iconOnly icon="eye" aria-label="Preview as a learner" href={previewHref} onClick={() => save.flush()} className="size-12" />
        ) : null}
        {canSubmit ? (
          <Button variant="accent" icon="arrow-right" onClick={() => setSubmitOpen(true)} className="h-12">
            Submit
          </Button>
        ) : live.status === "published" ? (
          <Button variant="primary" icon="external" href={`/courses/${live.slug}`} className="h-12">
            View live
          </Button>
        ) : live.status === "in_review" ? (
          <span className="inline-flex h-12 items-center gap-1.5 rounded-full bg-butter px-4 text-[14px] font-bold text-[#5a4600]">
            <Icon name="clock" className="size-4" strokeWidth={2.4} /> In review
          </span>
        ) : null}
      </StickyActionBar>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title={ready ? "Ready for review?" : "Almost there."}
        description={ready ? "A human on the Tamada team checks every course before it goes live. Usually 2 to 3 working days." : "Finish the required steps below, then send it in."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>
              {ready ? "Not yet" : "Keep editing"}
            </Button>
            <Button variant="accent" icon="arrow-right" disabled={!ready} onClick={submit}>
              Send to review
            </Button>
          </>
        }
      >
        <Checklist
          items={checklist}
          onJump={(t) => {
            setTab(t);
            setSubmitOpen(false);
          }}
        />
        {live.status === "rejected" && live.reviewNote && (
          <p className="mt-4 rounded-[16px] bg-[#ffe1d4] p-3 text-[13.5px] font-medium text-[#8a2600]">
            <span className="font-bold">Last review note:</span> {live.reviewNote}
          </p>
        )}
      </Modal>
    </div>
  );
}

function Checklist({ items, onJump, compact }: { items: CheckItem[]; onJump: (t: Tab) => void; compact?: boolean }) {
  const groups = [
    { title: "Required", list: items.filter((i) => i.required) },
    { title: "Recommended", list: items.filter((i) => !i.required) },
  ];
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="t-micro mb-2 text-ink/50 uppercase">{g.title}</p>
          <ul className="flex flex-col gap-2">
            {g.list.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <span
                  className={clsx("mt-px grid size-5 shrink-0 place-items-center rounded-full", c.ok ? "bg-green text-white" : c.required ? "bg-[#ffe1d4] text-[#c13500]" : "bg-ink/[0.08] text-ink/50")}
                  aria-hidden
                >
                  <Icon name={c.ok ? "check" : c.required ? "x" : "minus"} className="size-3" strokeWidth={3.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block text-[14px] leading-snug font-semibold", c.ok && "text-ink/60")}>
                    {c.label}
                    <span className="sr-only">{c.ok ? " (done)" : " (not done)"}</span>
                  </span>
                  {!c.ok && c.hint && !compact && <span className="mt-0.5 block text-[12.5px] font-medium text-ink/55">{c.hint}</span>}
                  {!c.ok && c.tab && (
                    <button type="button" onClick={() => onJump(c.tab!)} className="mt-0.5 block text-[12.5px] font-bold text-blue hf:underline coarse:-my-2 coarse:flex coarse:min-h-11 coarse:items-center coarse:text-[13.5px]">
                      Fix in {c.tab === "curriculum" ? "Curriculum" : c.tab === "details" ? "Details" : "Pricing"}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StatusBanner({ course }: { course: Course }) {
  const map = {
    rejected: { tone: "bg-[#ffe1d4] text-[#8a2600]", icon: "alert" as const, title: "Sent back by the review team", body: course.reviewNote ?? "A few changes are needed before this can go live.", extra: "Fix the notes, then submit again." },
    in_review: { tone: "bg-butter text-[#5a4600]", icon: "clock" as const, title: `In review since ${timeAgo(course.submittedAt ?? course.updatedAt)}`, body: "Edits you make now are included in the same review. We'll notify you when it's done.", extra: null },
    published: { tone: "bg-mint/70 text-forest", icon: "globe" as const, title: "Live in the catalog", body: "Edits save straight to the live course in this demo. Big changes (new modules, price) may be re-checked.", extra: null },
    archived: { tone: "bg-[#e7e0fb] text-indigo", icon: "inbox" as const, title: "Archived", body: "Hidden from the catalog. Enrolled learners keep access. Restore it from Your courses.", extra: null },
    draft: null,
  }[course.status];
  if (!map) return null;
  return (
    <div id="studio-status" tabIndex={-1} className={clsx("app-fade mb-5 flex items-start gap-3 rounded-card p-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue", map.tone)} role="status">
      <Icon name={map.icon} className="mt-0.5 size-5 shrink-0" strokeWidth={2.2} />
      <div className="min-w-0">
        <p className="text-[15px] font-bold">{map.title}</p>
        <p className="t-small mt-0.5">{map.body}</p>
        {map.extra && <p className="t-small mt-1 font-bold">{map.extra}</p>}
      </div>
    </div>
  );
}

function BuilderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the course studio">
      <Skeleton className="mb-4 h-4 w-56 rounded-full" />
      <Skeleton className="mb-3 h-7 w-32 rounded-full" />
      <Skeleton className="mb-8 h-14 w-[min(520px,90%)]" />
      <Skeleton className="mb-5 h-11 w-72 rounded-full" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-card bg-white p-4 shadow-soft">
              <Skeleton variant="row" />
              <div className="mt-4 flex flex-col gap-2">
                <Skeleton className="h-14 rounded-[18px]" />
                <Skeleton className="h-14 rounded-[18px]" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
