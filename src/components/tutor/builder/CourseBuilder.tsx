"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { formatDuration, getCourseById, getCurriculum, plural, timeAgo, type Course, type Module } from "@/lib/mock";
import { demo } from "@/lib/demo/store";
import { Badge, Button, Card, EmptyState, Icon, Modal, PageHeader, Skeleton, StatusPill, StickyActionBar, TabPanel, Tabs, Tooltip, toast, useScrollHide } from "@/components/app";
import { useTutorContext } from "../shared";
import { CheckRow, Idx, LineIcon, RuleNote } from "../editorial";
import { CurriculumEditor } from "./CurriculumEditor";
import { DetailsPanel, PricingPanel, fieldErrors, type CourseFields } from "./SettingsPanels";
import { buildChecklist, firstVideo, manualFreeIds, normalize, reconcileFreePreview, stripUndefined, type CheckItem } from "./utils";

/* =============================================================================
   Course studio (design system v2): a small Mobius page head (status, mono save
   state, mono counts), underline section tabs, then the curriculum on the left and a
   sticky rail on the right: the ink readiness panel (Anton "7/9", the red submit CTA),
   the square-tick review checklist and the studio notes.
   ============================================================================= */

type Tab = "curriculum" | "details" | "pricing";

const TAB_LABEL: Record<Tab, string> = { curriculum: "Curriculum", details: "Details", pricing: "Pricing" };

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
          title={
            <>
              This course belongs to <em>another</em> tutor.
            </>
          }
          breadcrumbs={[
            { label: "Studio", href: "/tutor" },
            { label: "Courses", href: "/tutor/courses" },
            // an unpublished course's title is private to its tutor (matches generateMetadata)
            { label: course.status === "published" ? course.title : "Another tutor's course" },
          ]}
        />
        <div className="border-t border-fg">
          <EmptyState
            art="none"
            eyebrow="Read only"
            align="start"
            title="Only its tutor can edit it."
            body="You can edit your own courses in the studio. This one is still visible in the catalog if it's live."
            className="!px-0"
            action={
              <>
                <Button href="/tutor/courses">Your courses</Button>
                {course.status === "published" && (
                  <Button href={`/courses/${course.slug}`} variant="outline">
                    View in catalog
                  </Button>
                )}
              </>
            }
          />
        </div>
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
        title={
          <>
            We can&apos;t find that <em>course</em>.
          </>
        }
        description="Courses you create in the demo live in this browser. It may have been reset, or the link is from somewhere else."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses", href: "/tutor/courses" }, { label: "Not found" }]}
      />
      <div className="border-t border-fg">
        <EmptyState
          art="none"
          eyebrow="Nothing to edit"
          align="start"
          title="Pick one of your courses, or start a fresh draft."
          body="It takes about a minute: a title, a price and a cover, then the lessons."
          className="!px-0"
          action={
            <>
              <Button href="/tutor/courses" iconRight="arrow-right">
                Back to your courses
              </Button>
              <Button href="/tutor/courses/new" variant="outline" icon="plus">
                New course
              </Button>
            </>
          }
        />
      </div>
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

/** Mono save state: a small square (filled = saved, hollow + spinner = saving). */
function SaveIndicator({ state, savedAt }: { state: "idle" | "saving" | "saved"; savedAt: number | null }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, []);
  const ago = savedAt && now > savedAt ? Math.floor((now - savedAt) / 60_000) : 0;
  return (
    <span role="status" aria-live="polite" className="inline-flex h-[23px] items-center gap-2 font-mono text-[10.5px] font-medium tracking-[0.08em] whitespace-nowrap text-muted uppercase">
      {state === "saving" ? (
        <>
          <Icon name="refresh" className="size-3 animate-spin text-fg" strokeWidth={2} /> Saving…
        </>
      ) : (
        <>
          <span aria-hidden className="size-[6px] bg-fg" />
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
  const requiredDone = required.filter((c) => c.ok).length;
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

  const counts = [plural(modules.length, "module"), plural(stats.videos, "lesson"), plural(stats.quizzes, "test"), stats.resources ? plural(stats.resources, "file") : null, stats.secs > 0 ? formatDuration(stats.secs) : null].filter(Boolean) as string[];

  return (
    <div className="app-enter">
      <PageHeader
        size="sm"
        eyebrow="Course studio"
        title={shownTitle}
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Courses", href: "/tutor/courses" }, { label: shownTitle }]}
        meta={
          <>
            <StatusPill status={live.status} />
            <SaveIndicator state={save.state} savedAt={save.savedAt} />
            <span aria-hidden className="mx-1 h-3.5 w-px bg-line-strong max-sm:hidden" />
            {titleInvalid && (
              <Badge tone="flame" dot>
                Title not saved: fix it in Details
              </Badge>
            )}
            <span className="font-mono text-[10.5px] leading-[23px] tracking-[0.08em] text-muted uppercase tabular-nums">
              {counts.map((c, i) => (
                <Fragment key={c}>
                  <span className="whitespace-nowrap">
                    {c}
                    {i < counts.length - 1 && <span aria-hidden className="pl-1.5 opacity-50">·</span>}
                  </span>{" "}
                </Fragment>
              ))}
            </span>
          </>
        }
        actions={
          <>
            {previewHref ? (
              <Button variant="outline" icon="eye" href={previewHref} onClick={() => save.flush()}>
                Preview
              </Button>
            ) : (
              <Tooltip label="Add a lesson to preview">
                <Button variant="outline" icon="eye" aria-disabled aria-describedby="preview-why" className="opacity-50">
                  Preview
                </Button>
                <span id="preview-why" className="sr-only">
                  Add a lesson to preview the course.
                </span>
              </Tooltip>
            )}
            {canSubmit ? (
              // xl + Curriculum: the readiness rail beside the curriculum carries THE red submit CTA
              <Button variant="red" icon="arrow-right" onClick={() => setSubmitOpen(true)} className={tab === "curriculum" ? "xl:hidden" : undefined}>
                Submit for review
              </Button>
            ) : live.status === "published" ? (
              <Button variant="ink" icon="external" href={`/courses/${live.slug}`}>
                View live page
              </Button>
            ) : live.status === "in_review" ? (
              <Button variant="outline" icon="clock" disabled>
                In review
              </Button>
            ) : null}
          </>
        }
      />

      <div ref={headerEnd} aria-hidden className="h-px" />

      <StatusBanner course={live} />

      <div
        className="sticky z-20 -mx-4 mb-6 bg-cream px-4 py-1 transition-[top] duration-300 ease-[var(--ease-ui)] sm:static sm:mx-0 sm:bg-transparent sm:p-0 md:mb-9"
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
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10 2xl:gap-14">
          <div className="min-w-0">
            <CurriculumEditor courseId={course.id} modules={modules} onChange={setModules} />
          </div>
          <aside className="flex min-w-0 flex-col gap-8 xl:top-[88px] xl:self-start [@media(min-width:80rem)_and_(min-height:821px)]:sticky" aria-label="Review readiness">
            <ReadinessPanel
              course={live}
              done={requiredDone}
              total={required.length}
              ready={ready}
              canSubmit={canSubmit}
              onSubmit={() => setSubmitOpen(true)}
            />
            <section aria-labelledby="checklist-title" className="border-t border-fg pt-4">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h2 id="checklist-title" className="t-label">
                  Review checklist
                </h2>
                <span className="font-mono text-[11px] text-muted tabular-nums">
                  {checklist.filter((c) => c.ok).length}/{checklist.length}
                </span>
              </div>
              <Checklist items={checklist} onJump={(t) => setTab(t)} compact />
            </section>
            <StudioNotes />
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
          <Button variant="outline" iconOnly icon="eye" aria-label="Preview as a learner" href={previewHref} onClick={() => save.flush()} className="size-12" />
        ) : null}
        {canSubmit ? (
          <Button variant="red" icon="arrow-right" onClick={() => setSubmitOpen(true)} className="h-12">
            Submit
          </Button>
        ) : live.status === "published" ? (
          <Button variant="ink" icon="external" href={`/courses/${live.slug}`} className="h-12">
            View live
          </Button>
        ) : live.status === "in_review" ? (
          <span className="inline-flex h-12 items-center gap-2 px-3 font-mono text-[11px] tracking-[0.08em] uppercase">
            <span aria-hidden className="size-[6px] ring-1 ring-current ring-inset" /> In review
          </span>
        ) : null}
      </StickyActionBar>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        surface="ink"
        eyebrow={`Submit for review · ${requiredDone}/${required.length} required`}
        title={ready ? "Ready for review?" : "Almost there."}
        description={ready ? "A human on the Tamada team checks every course before it goes live. Usually 2 to 3 working days." : "Finish the required steps below, then send it in."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>
              {ready ? "Not yet" : "Keep editing"}
            </Button>
            <Button variant="red" icon="arrow-right" disabled={!ready} onClick={submit}>
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
          <RuleNote tone="red" label="Last review note" className="mt-5">
            {live.reviewNote}
          </RuleNote>
        )}
      </Modal>
    </div>
  );
}

/* ----------------------------------------------------------------------------- readiness (the ink moment) */
function ReadinessPanel({
  course,
  done,
  total,
  ready,
  canSubmit,
  onSubmit,
}: {
  course: Course;
  done: number;
  total: number;
  ready: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  const left = total - done;
  return (
    <Card variant="ink" padding="none" className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="t-label text-muted">Review readiness</p>
        <StatusPill status={course.status} size="sm" />
      </div>
      <p className="mt-6 flex items-baseline gap-3">
        <span className="sr-only">
          {done} of {total} required steps done.
        </span>
        <span className="t-stat tabular-nums" aria-hidden>
          {done}/{total}
        </span>
        <span className="t-display-s text-muted" aria-hidden>
          {ready ? "Ready" : "Done"}
        </span>
      </p>
      <div className="mt-4 flex gap-[3px]" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={clsx("h-[3px] flex-1", i < done ? (ready ? "bg-red" : "bg-cream") : "bg-white/15")} />
        ))}
      </div>
      <p className="t-small mt-4 text-muted">
        {course.status === "in_review" ? (
          <span className="font-mono text-[11px] tracking-[0.06em] uppercase">
            Sent {timeAgo(course.submittedAt ?? course.updatedAt)} · <span className="whitespace-nowrap">reviews take 2 to 3 days</span>
          </span>
        ) : course.status === "published" ? (
          "Live in the catalog. Edits save straight to the course."
        ) : course.status === "archived" ? (
          "Archived. Restore it from Your courses to sell it again."
        ) : ready ? (
          "Everything required is done. Send it to the review team."
        ) : (
          `${left} required ${left === 1 ? "step" : "steps"} left before you can submit.`
        )}
      </p>
      {canSubmit && (
        <Button fullWidth variant={ready ? "red" : "cream"} className="mt-5" iconRight="arrow-right" onClick={onSubmit}>
          {ready ? "Submit for review" : "See what's missing"}
        </Button>
      )}
    </Card>
  );
}

function StudioNotes() {
  const notes: { icon: Parameters<typeof LineIcon>[0]["name"]; body: React.ReactNode; className?: string }[] = [
    { icon: "drag", className: "flex coarse:hidden", body: "Drag the handles to reorder modules and lessons, or move lessons between modules. Keyboard: Space, arrows, Space." },
    { icon: "sort", className: "hidden coarse:flex", body: "Tap a row to edit it. Tap Reorder above the curriculum to move lessons, tests and modules with the arrows." },
    { icon: "play", body: "The first video is free by default. You can open more previews when it helps learners decide." },
    {
      icon: "quiz",
      body: (
        <>
          Use an item&apos;s <span aria-label="more actions">⋯</span> menu to insert a test right after it
          <span className="[@media(hover:none)]:hidden"> (or hover between two items and hit +)</span>. Turn on gating to make it a checkpoint.
        </>
      ),
    },
    { icon: "check-circle", body: "Everything saves as you go." },
  ];
  return (
    <details className="group border-t border-fg">
      <summary className="tap flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="t-label">How the builder works</span>
        <Icon name="plus" strokeWidth={1.6} className="size-4 transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <ol className="divide-y divide-line border-t border-line pb-1">
        {notes.map((n, i) => (
          <li key={i} className={clsx("gap-3 py-3 text-[13.5px] leading-snug text-fg/80", n.className ?? "flex")}>
            <Idx n={i + 1} className="mt-[3px]" />
            <span className="min-w-0 flex-1">{n.body}</span>
            <LineIcon name={n.icon} tone="muted" className="size-4" />
          </li>
        ))}
      </ol>
    </details>
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
          <p className="mt-2 flex items-baseline justify-between border-b border-line pb-2 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
            <span>{g.title}</span>
            <span className="tabular-nums">
              {g.list.filter((c) => c.ok).length}/{g.list.length}
            </span>
          </p>
          <ul className="divide-y divide-line">
            {g.list.map((c) => (
              <CheckRow
                key={c.id}
                state={c.ok ? "done" : c.required ? "fail" : "todo"}
                hint={!c.ok && c.hint && !compact ? c.hint : undefined}
                action={
                  !c.ok && c.tab ? (
                    <Button variant="arrow" size="sm" onClick={() => onJump(c.tab!)} className="!min-h-0 text-[13px] coarse:!min-h-11">
                      Fix in {TAB_LABEL[c.tab]}
                    </Button>
                  ) : undefined
                }
              >
                {c.label}
              </CheckRow>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StatusBanner({ course }: { course: Course }) {
  const map = {
    rejected: { tone: "red" as const, icon: "alert" as const, title: "Sent back by the review team", body: course.reviewNote ?? "A few changes are needed before this can go live.", extra: "Fix the notes, then submit again." },
    in_review: { tone: "ink" as const, icon: "clock" as const, title: `In review since ${timeAgo(course.submittedAt ?? course.updatedAt)}`, body: "Edits you make now are included in the same review. We'll notify you when it's done.", extra: null },
    published: { tone: "ink" as const, icon: "globe" as const, title: "Live in the catalog", body: "Edits save straight to the live course in this demo. Big changes (new modules, price) may be re-checked.", extra: null },
    archived: { tone: "quiet" as const, icon: "inbox" as const, title: "Archived", body: "Hidden from the catalog. Enrolled learners keep access. Restore it from Your courses.", extra: null },
    draft: null,
  }[course.status];
  if (!map) return null;
  return (
    <div id="studio-status" tabIndex={-1} role="status" className="app-fade mb-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red md:mb-9">
      <RuleNote tone={map.tone} icon={map.icon} label={map.title}>
        {map.body}
        {map.extra && <span className="mt-1 block font-semibold text-fg">{map.extra}</span>}
      </RuleNote>
    </div>
  );
}

function BuilderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the course studio">
      <Skeleton className="mb-4 h-3 w-56" />
      <Skeleton className="mb-8 h-12 w-[min(520px,90%)]" />
      <Skeleton className="mb-9 h-10 w-72" />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-t border-fg pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-2/3" />
              <div className="mt-5 flex flex-col divide-y divide-line">
                <Skeleton className="my-3 h-10" />
                <Skeleton className="my-3 h-10" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
