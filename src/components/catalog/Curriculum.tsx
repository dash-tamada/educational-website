"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Badge, Icon } from "@/components/app";
import { useDb } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { getCourseAccess, getItemAccessMap, type AccessResult } from "@/lib/access";
import { formatDuration, getCourseById, getCourseProgress, getCourseStats, getCurriculum, itemTitle, pad2, type Module, type ModuleItem } from "@/lib/mock";
import { SectionTitle } from "./ui";

const TYPE = {
  video: { icon: "play", chip: "bg-[#dfe8ff] text-blue", label: "Lesson" },
  quiz: { icon: "quiz", chip: "bg-sun text-ink", label: "Tiny test" },
  resource: { icon: "file", chip: "bg-mint text-forest", label: "Resource" },
} as const;

const FILE_LABEL: Record<string, string> = { pdf: "PDF", zip: "ZIP", sheet: "Sheet", template: "Template", link: "Link", audio: "Audio" };

/** Non-breaking space: "3 resources" / "1 hr 34 min" never split across lines. */
const NB = " ";
const nb = (s: string) => s.replace(/ /g, NB);
const plural = (n: number, word: string) => nb(`${n} ${word}${n === 1 ? "" : "s"}`);

function moduleSummary(m: Module) {
  const v = m.items.filter((i) => i.type === "video");
  const q = m.items.filter((i) => i.type === "quiz").length;
  const r = m.items.filter((i) => i.type === "resource").length;
  const sec = v.reduce((s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0), 0);
  return [plural(v.length, "video"), q && plural(q, "test"), r && plural(r, "resource"), nb(formatDuration(sec))].filter(Boolean).join(" · ");
}

function itemMeta(item: ModuleItem) {
  if (item.type === "video") return `${formatDuration(item.lesson.durationSec, "clock")}${item.lesson.hasCaptions ? " · captions" : ""}`;
  if (item.type === "quiz") {
    const n = item.quiz.questions.length;
    return `${plural(n, "question")} · ${nb(`pass mark ${item.quiz.passPercentage}%`)}${item.quiz.timeLimitMin ? ` · ${item.quiz.timeLimitMin}${NB}min` : ""}`;
  }
  const r = item.resource;
  return `${FILE_LABEL[r.fileType] ?? "File"}${r.sizeKb ? ` · ${r.sizeKb >= 1024 ? `${(r.sizeKb / 1024).toFixed(1)}${NB}MB` : `${r.sizeKb}${NB}KB`}` : ""}`;
}

/**
 * "Inside the course": modules -> items in their real order (tests sit between
 * videos), icons per type, durations, the free preview, locks from the shared
 * access rules (getItemAccessMap) and ticks for finished items.
 */
export function Curriculum({ courseId }: { courseId: string }) {
  const db = useDb();
  const session = useDemoSession();
  const course = getCourseById(courseId, db);
  const modules = course ? getCurriculum(course.id, db) : [];
  const access = course ? getItemAccessMap(session, course, db) : {};
  const purchasable = course ? getCourseAccess(session, course, db).purchasable : false;
  const progress = course && session ? getCourseProgress(session.userId, course.id, db) : null;
  const done = new Set(progress?.completedItemIds ?? []);
  const resumeModule = progress?.resumeItemId ? modules.find((m) => m.items.some((i) => i.id === progress.resumeItemId))?.id : undefined;
  const [open, setOpen] = useState<Set<string>>(() => new Set([modules[0]?.id, resumeModule].filter(Boolean) as string[]));
  if (!course) return null;
  const stats = getCourseStats(course.id, db);
  const allOpen = modules.every((m) => open.has(m.id));

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section aria-labelledby="curriculum-title" id="curriculum">
      <SectionTitle
        kicker="The curriculum"
        title="Inside the course"
        id="curriculum-title"
        action={
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}
            className="rounded-full px-1 text-[14px] font-bold text-blue underline-offset-4 hf:underline"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        }
      />
      <p className="mt-3 text-[15px] font-semibold text-ink/65">
        {[
          plural(stats.modules, "module"),
          plural(stats.videos, "lesson"),
          stats.quizzes && plural(stats.quizzes, "tiny test"),
          stats.resources && plural(stats.resources, "resource"),
          nb(`${formatDuration(stats.totalSec, "long")} total`),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <ol className="mt-6 space-y-3">
        {modules.map((m) => {
          const isOpen = open.has(m.id);
          const panelId = `mod-${m.id}`;
          const modDone = m.items.length > 0 && m.items.every((i) => done.has(i.id));
          return (
            <li key={m.id} className="overflow-hidden rounded-card bg-white shadow-soft">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(m.id)}
                  className={clsx(
                    // inset focus ring: the rounded <li> clips anything drawn outside
                    "group flex w-full items-center gap-3 rounded-card px-4 py-4 text-left transition-colors hf:bg-cream/60 focus-visible:outline-offset-[-3px] md:gap-4 md:px-5",
                    isOpen && "rounded-b-none",
                  )}
                >
                  <span className={clsx("grid h-11 min-w-11 shrink-0 place-items-center rounded-[14px] px-1.5 font-display text-[24px] leading-none font-black", modDone ? "bg-green text-white" : "bg-ink text-cream")} aria-hidden>
                    {modDone ? <Icon name="check" className="size-5" strokeWidth={3} /> : pad2(m.position)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-app-h3 block">{m.title}</span>
                    <span className="mt-0.5 block text-[13px] font-semibold text-ink/55">{moduleSummary(m)}</span>
                  </span>
                  <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full bg-ink/[0.06] transition-[rotate,background-color] duration-300 ease-ui", isOpen && "rotate-180 bg-sun")} aria-hidden>
                    <Icon name="chevron-down" className="size-[18px]" strokeWidth={2.4} />
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-label={m.title} inert={!isOpen} className={clsx("grid transition-[grid-template-rows] duration-500 ease-expo", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  {m.summary && <p className="px-4 pb-3 text-[14px] text-ink/65 md:px-5 md:pl-[80px]">{m.summary}</p>}
                  <ol className="border-t border-ink/[0.06]">
                    {m.items.map((item) => (
                      <ItemRow key={item.id} item={item} slug={course.slug} access={access[item.id]} purchasable={purchasable} completed={done.has(item.id)} resume={progress?.resumeItemId === item.id && progress.percent > 0} />
                    ))}
                  </ol>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ItemRow({ item, slug, access, purchasable, completed, resume }: { item: ModuleItem; slug: string; access?: AccessResult; purchasable: boolean; completed: boolean; resume?: boolean }) {
  const t = TYPE[item.type];
  const allowed = !!access?.allowed;
  // the preview row wears its FREE tag for visitors (it's the one they can open)
  // and for the tutor/admin (so they know which lesson is public). A learner who
  // owns the course gains nothing from it; on an archived course nobody new can
  // open it, so no badge either.
  const free = allowed && access?.reason !== "enrolled" && item.type === "video" && item.lesson.isFreePreview;
  const freeBadge = (
    <Badge tone="sun" size="sm">
      FREE PREVIEW
    </Badge>
  );
  const lockedText = access?.reason === "gated" ? "Pass the test first" : purchasable ? "Unlock with course access" : "Owners only";
  const lockedSr = access?.reason === "gated" ? "Locked until you pass the test before it" : purchasable ? "Locked: unlock with course access" : "Locked: only people who own this course can open it";
  const watchNow = access?.reason === "free";
  const gating = item.type === "quiz" && item.quiz.isGating;
  const href = `/learn/${slug}/${item.id}`;
  const title = itemTitle(item);

  const body = (
    <>
      <span className={clsx("relative grid size-9 shrink-0 place-items-center rounded-full", t.chip)} aria-hidden>
        <Icon name={t.icon} className={clsx("size-4", item.type === "video" && "ml-0.5 fill-current")} strokeWidth={item.type === "video" ? 1.6 : 2.2} />
        {completed && (
          <span className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full bg-green text-white ring-2 ring-white">
            <Icon name="check" className="size-2.5" strokeWidth={3.4} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {item.type === "quiz" && <span className="t-micro tracking-[0.04em] text-ink/55 uppercase">{t.label}</span>}
          <span className={clsx("text-[15px] leading-snug font-semibold", allowed && "underline-offset-4 group-hf:underline")}>{title}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-ink/55">
          {itemMeta(item)}
          {/* phones: the badge rides in the meta line so the title keeps its width */}
          {free && <span className="sm:hidden">{freeBadge}</span>}
          {gating && (
            <Badge tone="butter" size="sm">
              Checkpoint
            </Badge>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold">
        {free && <span className="hidden sm:inline-flex">{freeBadge}</span>}
        {watchNow ? (
          <span className="hidden text-blue sm:inline">Watch now</span>
        ) : allowed ? (
          completed ? (
            <span className="text-forest">Done</span>
          ) : resume ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-hotpink px-2.5 py-1 text-[12.5px] text-white">
              <Icon name="play" className="size-3 fill-current" strokeWidth={1.6} />
              Resume
            </span>
          ) : (
            <span className="text-blue">Open</span>
          )
        ) : (
          <>
            {/* label only where the row has room: full-width tablets and wide desktops
                (the 1024-1279 main column is too narrow; titles would wrap three times) */}
            <span className="hidden text-ink/60 md:inline lg:hidden xl:inline">{lockedText}</span>
            <Icon name="lock" className="size-4 text-ink/55" />
            <span className="sr-only md:hidden lg:inline xl:hidden">{lockedSr}</span>
          </>
        )}
      </span>
    </>
  );

  const rowCls = clsx(
    "flex items-center gap-3 border-b border-ink/[0.06] px-4 py-3 last:border-b-0 focus-visible:outline-offset-[-3px] md:gap-4 md:px-5 md:pl-[80px]",
    item.type === "quiz" && "bg-butter/45",
  );
  return (
    <li className="[&:last-child>*]:rounded-b-card [&:last-child>*]:border-b-0">
      {allowed ? (
        <Link href={href} className={clsx(rowCls, "group transition-colors hf:bg-cream")} aria-label={watchNow ? `${title} (free preview, watch now)` : undefined}>
          {body}
        </Link>
      ) : (
        <div className={rowCls}>{body}</div>
      )}
    </li>
  );
}
