"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Icon } from "@/components/app";
import { getCourseAccess, getItemAccessMap, type AccessResult } from "@/lib/access";
import { COURSE_PAGE } from "@/lib/content/course";
import { formatDate, formatDuration, getCourseProgress, getCurriculum, itemTitle, pad2, type Module, type ModuleItem, type QuizItem } from "@/lib/mock";
import { courseFacts, isCapstone, isFlagship, useCourseState } from "./state";
import { MetaLine, MonoTag, SectionHead } from "./ui";

/* =============================================================================
   04 CURRICULUM (Mobius accordion). Each module is a ruled row: mono index 01..11,
   the Inter Tight title, lesson count + runtime, a plus that turns into a cross.
   Open: the module summary + its items in order with VIDEO / TEST / FILE tags, the
   FREE PREVIEW link, locks from the shared access rules, ticks for finished items.
   A gating test that closes a module sits BETWEEN modules as a TEST gate row.
   ============================================================================= */

const NB = " ";
const plural = (n: number, w: string) => `${n}${NB}${w}${n === 1 ? "" : "s"}`;
const TAG = { video: "Video", quiz: "Test", resource: "File" } as const;
const FILE_LABEL: Record<string, string> = { pdf: "PDF", zip: "ZIP", sheet: "Sheet", template: "Template", link: "Link", audio: "Audio" };

function moduleSec(m: Module) {
  return m.items.reduce((s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0), 0);
}

function itemMeta(item: ModuleItem) {
  if (item.type === "video") return formatDuration(item.lesson.durationSec, "clock");
  if (item.type === "quiz") return `${plural(item.quiz.questions.length, "question")} · pass ${item.quiz.passPercentage}%`;
  const r = item.resource;
  return `${FILE_LABEL[r.fileType] ?? "File"}${r.sizeKb ? ` · ${r.sizeKb >= 1024 ? `${(r.sizeKb / 1024).toFixed(1)}${NB}MB` : `${r.sizeKb}${NB}KB`}` : ""}`;
}

/** The gating test that closes a module (rendered as a gate row after it). */
const closingGate = (m: Module): QuizItem | null => {
  const last = m.items[m.items.length - 1];
  return last?.type === "quiz" && last.quiz.isGating ? last : null;
};

export function Curriculum({ courseId, index }: { courseId: string; index?: string }) {
  const s = useCourseState(courseId);
  const { course, db, session } = s;
  const modules = course ? getCurriculum(course.id, db) : [];
  const access = course ? getItemAccessMap(session, course, db) : {};
  const purchasable = course ? getCourseAccess(session, course, db).purchasable : false;
  const progress = course && session ? getCourseProgress(session.userId, course.id, db) : null;
  const done = new Set(progress?.completedItemIds ?? []);
  const resumeModule = progress?.resumeItemId ? modules.find((m) => m.items.some((i) => i.id === progress.resumeItemId))?.id : undefined;
  const [open, setOpen] = useState<Set<string>>(() => new Set([resumeModule ?? modules[0]?.id].filter(Boolean) as string[]));
  if (!course) return null;
  const flagship = isFlagship(course);
  const facts = courseFacts(course, db);
  const allOpen = modules.length > 0 && modules.every((m) => open.has(m.id));
  const toggle = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-[calc(var(--header-offset)+16px)]">
      <SectionHead index={index} label={COURSE_PAGE.curriculum.label} title={flagship ? COURSE_PAGE.curriculum.title : "Inside the course"} id="curriculum-title" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-[34rem]">
          {flagship && <p className="t-body text-muted">{COURSE_PAGE.curriculum.note}</p>}
          <MetaLine
            className="mt-4 text-muted"
            items={[
              plural(facts.modules, "module") + (facts.capstone ? " + capstone" : ""),
              plural(facts.stats.videos, "video"),
              facts.stats.quizzes > 0 && plural(facts.stats.quizzes, "test"),
              facts.stats.resources > 0 && plural(facts.stats.resources, "file"),
              facts.runtime,
              `Updated ${formatDate(course.updatedAt, "short")}`,
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}
          aria-pressed={allOpen}
          className="link-draw t-label shrink-0"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <ol className="mt-8 border-t border-fg md:mt-10">
        {modules.map((m, mi) => {
          const isOpen = open.has(m.id);
          const gate = closingGate(m);
          const items = gate ? m.items.slice(0, -1) : m.items;
          const capstone = isCapstone(m);
          const lessons = m.items.filter((i) => i.type !== "quiz").length;
          const modDone = m.items.length > 0 && m.items.every((i) => done.has(i.id));
          const next = modules[mi + 1];
          const panelId = `mod-${m.id}`;
          return (
            <li key={m.id}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  id={`${panelId}-h`}
                  onClick={() => toggle(m.id)}
                  className="group grid w-full grid-cols-[34px_minmax(0,1fr)_20px] items-start gap-x-3 border-b border-line py-5 text-left focus-visible:outline-offset-[-2px] sm:grid-cols-[56px_minmax(0,1fr)_auto_22px] sm:gap-x-5 md:py-6"
                >
                  <span className={clsx("t-timecode pt-[0.4em]", capstone ? "text-red" : "text-muted")}>{modDone ? "✓" : pad2(m.position)}</span>
                  <span className="min-w-0">
                    <span className="block font-heading text-[clamp(1.1875rem,1rem+0.75vw,1.625rem)] leading-[1.15] font-semibold tracking-[-0.03em] transition-colors duration-300 group-hf:text-red">
                      {m.title}
                    </span>
                    <span className="t-timecode mt-2 block text-muted sm:hidden">
                      {plural(lessons, "lesson")} · {formatDuration(moduleSec(m)).toUpperCase()}
                    </span>
                  </span>
                  <span className="t-timecode hidden pt-[0.55em] whitespace-nowrap text-muted sm:block">
                    {plural(lessons, "lesson")} · {formatDuration(moduleSec(m)).toUpperCase()}
                  </span>
                  <span aria-hidden className="faq-plus relative mt-[0.45em] block size-[18px] sm:size-[20px]">
                    <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                    <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={`${panelId}-h`} className="faq-panel" data-open={isOpen ? "" : undefined} inert={!isOpen}>
                <div>
                  {m.summary && <p className="t-small pt-5 pb-1 text-muted sm:pl-[76px]">{m.summary}</p>}
                  <ol className="pt-2 pb-6 sm:pl-[76px]">
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        slug={course.slug}
                        access={access[item.id]}
                        purchasable={purchasable}
                        completed={done.has(item.id)}
                        resume={progress?.resumeItemId === item.id && progress.percent > 0}
                      />
                    ))}
                  </ol>
                </div>
              </div>
              {gate && (
                <GateRow
                  gate={gate}
                  slug={course.slug}
                  access={access[gate.id]}
                  passed={!!progress?.passedQuizIds.includes(gate.id)}
                  unlocks={next ? pad2(next.position) : null}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function lockedCopy(a: AccessResult | undefined, purchasable: boolean) {
  if (a?.reason === "gated") return { text: "Pass the test first", sr: "Locked until you pass the test before it" };
  if (purchasable) return { text: "Enroll to unlock", sr: "Locked: enroll to unlock" };
  return { text: "Owners only", sr: "Locked: only people who own this course can open it" };
}

function ItemRow({ item, slug, access, purchasable, completed, resume }: { item: ModuleItem; slug: string; access?: AccessResult; purchasable: boolean; completed: boolean; resume?: boolean }) {
  const allowed = !!access?.allowed;
  // the FREE tag is for visitors (the one row they can open) and for the tutor/admin
  const free = allowed && access?.reason !== "enrolled" && item.type === "video" && item.lesson.isFreePreview;
  const title = itemTitle(item);
  const locked = lockedCopy(access, purchasable);
  const href = `/learn/${slug}/${item.id}`;

  const body = (
    <>
      <MonoTag className="w-[52px] justify-center">{TAG[item.type]}</MonoTag>
      <span className="min-w-0">
        <span className={clsx("t-body block leading-snug", allowed && "transition-colors duration-300 group-hf:text-red")}>{title}</span>
        <span className="t-timecode mt-1 flex flex-wrap items-center gap-2 text-muted">
          {itemMeta(item)}
          {free && (
            <span className="sm:hidden">
              <MonoTag tone="red">Free preview</MonoTag>
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {free && (
          <span className="max-sm:hidden">
            <MonoTag tone="red">Free preview</MonoTag>
          </span>
        )}
        {allowed ? (
          completed ? (
            <span className="t-label inline-flex items-center gap-1.5 text-muted">
              <Icon name="check" className="size-3.5" strokeWidth={2.2} />
              Done
            </span>
          ) : resume ? (
            <MonoTag tone="solid">Resume</MonoTag>
          ) : (
            <span aria-hidden className="text-fg transition-[translate] duration-500 ease-expo group-hf:translate-x-1">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
                <path d="M1.5 8h12M9 3.5 13.5 8 9 12.5" />
              </svg>
            </span>
          )
        ) : (
          <>
            <span className="t-label hidden text-muted xl:inline">{locked.text}</span>
            <Icon name="lock" className="size-[15px] text-muted" strokeWidth={1.6} />
            <span className="sr-only xl:hidden">{locked.sr}</span>
          </>
        )}
      </span>
    </>
  );

  const row = "grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-line py-3.5 last:border-b-0 sm:gap-x-5";
  return (
    <li>
      {allowed ? (
        <Link href={href} className={clsx(row, "group focus-visible:outline-offset-[-2px]")} aria-label={free ? `${title} (free preview, watch now)` : undefined}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

/** A checkpoint test between two modules: TEST · title · pass mark · what it unlocks. */
function GateRow({ gate, slug, access, passed, unlocks }: { gate: QuizItem; slug: string; access?: AccessResult; passed: boolean; unlocks: string | null }) {
  const allowed = !!access?.allowed;
  const inner = (
    <>
      <MonoTag tone={passed ? "solid" : "ink"} className="w-[52px] justify-center">
        Test
      </MonoTag>
      <span className="min-w-0">
        <span className="t-small block font-medium">
          Checkpoint · {gate.quiz.title}
          <span className="sr-only">{passed ? " (passed)" : allowed ? "" : " (locked)"}</span>
        </span>
        <span className="t-timecode mt-1 block text-muted">
          {plural(gate.quiz.questions.length, "question")} · pass {gate.quiz.passPercentage}%{unlocks ? ` · unlocks module ${unlocks}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-muted">
        {passed ? <Icon name="check" className="size-4" strokeWidth={2} /> : !allowed ? <Icon name="lock" className="size-[15px]" strokeWidth={1.6} /> : null}
      </span>
    </>
  );
  const cls = "grid grid-cols-[34px_52px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-dashed border-line-strong py-3.5 sm:grid-cols-[56px_52px_minmax(0,1fr)_auto] sm:gap-x-5";
  const lead = <span aria-hidden className="h-px w-full bg-line-strong" />;
  return allowed ? (
    <Link href={`/learn/${slug}/${gate.id}`} className={clsx(cls, "group transition-colors hf:bg-fg/[0.03]")}>
      {lead}
      {inner}
    </Link>
  ) : (
    <div className={cls}>
      {lead}
      {inner}
    </div>
  );
}
