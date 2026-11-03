"use client";

import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";
import { Icon, PageHeader, Section, Skeleton } from "@/components/app";
import { useDb } from "@/lib/demo/store";
import { getItemAccessMap } from "@/lib/access";
import { FLAGSHIP } from "@/lib/content/site";
import {
  formatDuration,
  formatNumber,
  getCertificates,
  getCourse,
  getCurriculum,
  getNotifications,
  getStudentStats,
  itemTitle,
  plural,
  timeAgo,
  type Course,
  type CourseProgress,
  type Db,
} from "@/lib/mock";
import { CertificateCard } from "./CertificateCard";
import { ContinueHero } from "./ContinueHero";
import { Hydrated } from "./Hydrated";
import { Caps, SeeAll, StreakStrip, idx } from "./bits";
import { courseState, dailyMinutes, firstName, getMyCourses, itemMeta, tinyWins, upNext } from "./data";
import { useStudentPrefs, useStudentProfile } from "./prefs";

/* =============================================================================
   Student dashboard, v2 "cinematic editorial":
     PageHeader (Back on set, Priya.)
     ContinueHero: the ink "now showing" poster (lesson still, Anton title, timecode, red CTA)
     Mobius split sections, a mono index + tiny caps label on the left, content on the right:
       01 The course     modules as a ruled list with thin red progress lines
       02 Next up        the next steps in order; checkpoint tests marked TEST, locks shown
       03 This week      streak as 14 square cells, weekly goal as a ruled block, numbers
       04 Activity       notifications and wins as ruled rows
       05 Certificate    the Certified AI Filmmaker sheet (specimen until it's issued)
   ============================================================================= */

export function DashboardHome() {
  return (
    <Hydrated fallback={<DashboardFallback />}>
      <DashboardHomeInner />
    </Hydrated>
  );
}

/** Skeleton with the REAL header: before the overlay applies, useDb() is the seed, so the greeting
 *  comes out exactly as the page will draw it (no jump when it lands). */
export function DashboardFallback() {
  const db = useDb();
  const profile = useStudentProfile();
  return (
    <div aria-busy="true" className="app-fade">
      <span className="sr-only" role="status">
        Loading your data
      </span>
      <DashHeader uid={profile.uid} db={db} name={firstName(profile.name)} />
      <Skeleton className="h-[480px] md:h-[460px] lg:h-[500px]" />
      <div className="mt-14 space-y-14 md:mt-16 md:space-y-16" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-5 border-t border-line-strong pt-5 lg:grid-cols-12 lg:gap-x-8">
            <div className="space-y-2.5 lg:col-span-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-3 lg:col-span-9">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-11" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Back on set, Priya." with today's nudge and two mono slates. */
function DashHeader({ uid, db, name }: { uid: string; db: Db; name: string }) {
  const enrolled = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const stats = useMemo(() => getStudentStats(uid, db), [uid, db]);
  const todayActive = stats.last14[stats.last14.length - 1];
  const main = enrolled.find((e) => courseState(e.progress) === "in_progress") ?? enrolled[0];
  return (
    <PageHeader
      eyebrow="Student space"
      rule={false}
      className="mb-6! sm:mb-8! md:mb-10!"
      title={
        enrolled.length ? (
          <>
            Back on <em>set</em>, {name}.
          </>
        ) : (
          <>
            Welcome to the <em>set</em>, {name}.
          </>
        )
      }
      description={
        enrolled.length && enrolled.every((e) => courseState(e.progress) === "completed")
          ? "Every lesson watched. Rewatch a favourite, or put your certificate where people can see it."
          : enrolled.length
          ? todayActive
            ? "You've already shown up today. Everything else is a bonus."
            : "One short lesson keeps the streak alive. Your next one is waiting below."
          : "The first lesson is free. Press play and this page fills up with your progress."
      }
      meta={
        enrolled.length ? (
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
            <span className="inline-flex items-center gap-2 text-fg">
              <span aria-hidden className={clsx("size-[6px]", stats.streakDays ? "bg-red" : "bg-line-strong")} />
              {stats.streakDays ? `${stats.streakDays}-day streak` : "No streak yet"}
            </span>
            {main && (
              <span>
                {main.progress.percent}% of {main.course.title.split(":")[0]}
              </span>
            )}
          </p>
        ) : undefined
      }
    />
  );
}

function DashboardHomeInner() {
  const db = useDb();
  const profile = useStudentProfile();
  const uid = profile.uid;
  const { prefs } = useStudentPrefs(uid);

  const enrolled = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const stats = useMemo(() => getStudentStats(uid, db), [uid, db]);
  const certs = useMemo(() => getCertificates(uid, db).filter((c) => !!c.course), [uid, db]);
  const week = useMemo(() => dailyMinutes(uid, db, 7), [uid, db]);
  const name = firstName(profile.name);

  const inProgress = enrolled.filter((e) => courseState(e.progress) === "in_progress");
  const notStarted = enrolled.filter((e) => courseState(e.progress) === "not_started");
  const resume = inProgress[0] ?? notStarted[0] ?? null;
  // the course the page is about: the one being watched, else the most recent
  const main = resume ?? enrolled[0] ?? null;
  const flagship = useMemo(() => getCourse(FLAGSHIP.id, db), [db]);

  const header = <DashHeader uid={uid} db={db} name={name} />;

  /* ------------------------------------------------------------------ brand-new learner */
  if (!enrolled.length) {
    return (
      <div className="app-enter">
        {header}
        <ContinueHero mode={{ kind: "new" }} db={db} />
        {flagship && (
          <div className="mt-14 md:mt-16">
            <Section
              index="01"
              label="The course"
              note={`${FLAGSHIP.lessons} lessons across ${FLAGSHIP.modules} modules and a capstone. Lesson one is free.`}
              title={flagship.title}
              action={<SeeAll href={FLAGSHIP.href}>Course page</SeeAll>}
            >
              <ModuleList uid={uid} db={db} course={flagship} progress={null} />
            </Section>
          </div>
        )}
      </div>
    );
  }

  const weeklyGoal = prefs.dailyGoal * prefs.goalDays;

  return (
    <div className="app-enter">
      {header}

      <ContinueHero mode={resume ? { kind: "resume", entry: resume } : { kind: "finished", entry: enrolled[0] }} db={db} />

      <div className="mt-14 space-y-14 md:mt-16 md:space-y-20">
        {main && (
          <Section
            index="01"
            label="The course"
            note={
              courseState(main.progress) === "completed"
                ? "Every module wrapped. Rewatch anything, any time."
                : `${main.progress.completed} of ${main.progress.total} done. Tests at the end of a module unlock the next one.`
            }
            title={main.course.title}
            action={<SeeAll href="/dashboard/courses">My courses</SeeAll>}
          >
            <ModuleList uid={uid} db={db} course={main.course} progress={main.progress} />
            {enrolled.length > 1 && (
              <p className="mt-5 t-small text-muted">
                Plus {plural(enrolled.length - 1, "more course")} in{" "}
                <Link href="/dashboard/courses" className="text-fg underline decoration-line-strong underline-offset-4 hf:decoration-red">
                  My courses
                </Link>
                .
              </p>
            )}
          </Section>
        )}

        <Section index="02" label="Next up" note="The next steps, in order. A locked step opens once you pass the test before it.">
          <NextUp uid={uid} db={db} />
        </Section>

        <Section index="03" label="This week" note={`Goal: ${prefs.dailyGoal} min a day, ${prefs.goalDays} days a week.`}>
          <ThisWeek stats={stats} week={week} weeklyGoal={weeklyGoal} />
        </Section>

        <Section index="04" label="Activity" note="Course news, replies and the small wins worth a high five.">
          <Activity uid={uid} db={db} />
        </Section>

        <Section index="05" label="Certificate" note="One per course, with a public page anyone can verify.">
          <CertificateTeaser uid={uid} db={db} learnerName={profile.name} certs={certs} main={main} />
        </Section>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- 01 modules */
function ModuleList({ uid, db, course, progress }: { uid: string; db: Db; course: Course; progress: CourseProgress | null }) {
  const modules = useMemo(() => getCurriculum(course.id, db), [course.id, db]);
  const access = useMemo(() => (progress ? getItemAccessMap({ userId: uid, role: "student" }, course, db) : null), [uid, course, db, progress]);
  const done = new Set(progress?.completedItemIds ?? []);
  const resumeId = progress?.resumeItemId ?? null;
  return (
    <ol className="border-b border-line">
      {modules.map((m) => {
        const total = m.items.length;
        const n = m.items.filter((i) => done.has(i.id)).length;
        const pct = total ? Math.round((n / total) * 100) : 0;
        const current = !!resumeId && m.items.some((i) => i.id === resumeId) && n < total;
        const first = m.items.find((i) => !done.has(i.id)) ?? m.items[0];
        const a = first && access ? access[first.id] : null;
        const locked = !!a && !a.allowed;
        const target = locked && a?.blockedBy ? a.blockedBy.id : first?.id;
        const href = target ? `/learn/${course.slug}/${target}` : `/courses/${course.slug}`;
        const runtime = m.items.reduce((s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0), 0);
        const status = !progress ? (m.position === 1 ? "Free" : "") : n === total && total ? "Done" : current ? "Now" : locked ? "Locked" : n ? "Started" : "";
        return (
          <li key={m.id} className="relative border-t border-line">
            {current && <span aria-hidden className="absolute top-0 bottom-0 -left-px w-[2px] bg-red max-lg:hidden" />}
            <Link
              href={href}
              aria-current={current ? "step" : undefined}
              className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3.5 transition-colors sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_3.5rem_4.5rem] sm:gap-x-4 lg:pl-3 hf:bg-fg/[0.03]"
            >
              <span className={clsx("font-mono text-[12px] tabular-nums", current ? "text-red-deep" : "text-muted")}>{idx(m.position)}</span>
              <span className="min-w-0">
                <span className={clsx("block truncate text-[15.5px] leading-snug tracking-[-0.01em]", current ? "font-semibold" : "font-medium", locked && "text-muted")}>{m.title}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase sm:hidden">
                  {n}/{total} · {formatDuration(runtime)}
                </span>
              </span>
              <span className="relative h-px bg-line-strong max-sm:hidden" aria-hidden>
                <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-right font-mono text-[11.5px] text-muted tabular-nums max-sm:hidden">
                {n}/{total}
              </span>
              <span
                className={clsx(
                  "flex items-center justify-end gap-1.5 text-right font-mono text-[10.5px] tracking-[0.08em] uppercase",
                  status === "Now" ? "text-red-deep" : status === "Done" ? "text-fg" : "text-muted",
                )}
              >
                {locked ? (
                  <Icon name="lock" className="size-3.5" strokeWidth={1.7} title="Locked" />
                ) : status === "Done" ? (
                  <Icon name="check" className="size-3.5" strokeWidth={2} />
                ) : null}
                <span className={clsx(locked && "max-sm:sr-only")}>{status || formatDuration(runtime)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------------------------------- 02 next up */
function NextUp({ uid, db }: { uid: string; db: Db }) {
  const next = useMemo(() => upNext(uid, db, 4, 4), [uid, db]);
  if (!next.length)
    return (
      <div className="border-t border-line pt-5">
        <p className="t-headline-m">All caught up.</p>
        <p className="mt-2 t-small text-muted">No lessons waiting. Rewatch a favourite, or go collect your certificate.</p>
      </div>
    );
  return (
    <ol className="border-b border-line">
      {next.map((n, i) => {
        const item = n.ctx.item;
        const meta = itemMeta(item);
        const locked = !n.access.allowed;
        const blocker = n.access.blockedBy;
        const href = `/learn/${n.course.slug}/${locked && blocker ? blocker.id : item.id}`;
        const quiz = item.type === "quiz" ? item.quiz : null;
        const lessonNo = n.ctx.module.items.findIndex((x) => x.id === item.id) + 1;
        const label = `M${idx(n.ctx.module.position)} · ${quiz ? "Test" : `L${idx(lessonNo)}`}`;
        return (
          <li key={item.id} className="border-t border-line">
            <Link href={href} className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1.5 py-4 transition-colors sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center hf:bg-fg/[0.03]">
              <span className="col-span-2 flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-muted uppercase sm:col-span-1 sm:col-start-1">
                {i === 0 && !locked && <span aria-hidden className="size-[6px] bg-red" />}
                {label}
              </span>
              <span className="min-w-0 max-sm:col-start-1 max-sm:row-start-2">
                <span className={clsx("block text-[16px] leading-snug font-medium tracking-[-0.01em] sm:text-[17px]", locked && "text-muted")}>{itemTitle(item)}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
                  {quiz && (
                    <span className={clsx("inline-flex h-[18px] items-center px-1.5 ring-1 ring-inset", quiz.isGating ? "text-red-deep ring-red/45" : "ring-line-strong")}>{quiz.isGating ? "Test · gate" : "Test"}</span>
                  )}
                  {locked ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="lock" className="size-3" strokeWidth={1.8} /> Pass {blocker ? `“${itemTitle(blocker)}”` : "the test"} first
                    </span>
                  ) : (
                    <span>{i === 0 && n.hasProgress ? "Resume · " : ""}{meta.detail}</span>
                  )}
                </span>
              </span>
              <Icon name={locked ? "lock" : "arrow-right"} className="size-4 shrink-0 text-muted transition-[translate,color] duration-500 ease-expo group-hf:translate-x-1 group-hf:text-red max-sm:col-start-2 max-sm:row-start-2 max-sm:mt-1" strokeWidth={1.7} />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------------------------------- 03 this week */
function ThisWeek({ stats, week, weeklyGoal }: { stats: ReturnType<typeof getStudentStats>; week: ReturnType<typeof dailyMinutes>; weeklyGoal: number }) {
  const weekTotal = week.reduce((s, d) => s + d.value, 0);
  const goalPct = Math.min(100, Math.round((weekTotal / Math.max(1, weeklyGoal)) * 100));
  const todayActive = stats.last14[stats.last14.length - 1];
  const peak = Math.max(1, ...week.map((d) => d.value), Math.round(weeklyGoal / 5));
  return (
    <div>
      <div className="grid gap-y-10 border-t border-line pt-5 md:grid-cols-2 md:gap-x-0">
        {/* streak */}
        <div className="min-w-0 md:pr-8">
          <Caps className="text-muted">Streak</Caps>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="t-display-l leading-[0.8]">{stats.streakDays}</span>
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">{stats.streakDays === 1 ? "day" : "days"} in a row</span>
          </p>
          <StreakStrip days={stats.last14} className="mt-6 max-w-[420px]" />
          <p className="mt-4 t-small text-muted">
            {todayActive ? "Today's cell is filled. Look at you go." : stats.streakDays ? "Watch one lesson today to keep the streak alive." : "Watch one lesson today to start a streak."}
          </p>
        </div>
        {/* weekly goal */}
        <div className="min-w-0 md:border-l md:border-line md:pl-8">
          <div className="flex items-baseline justify-between gap-4">
            <Caps className="text-muted">Weekly goal</Caps>
            <Link href="/dashboard/settings#goals" className="font-mono text-[11px] tracking-[0.06em] uppercase underline decoration-line-strong underline-offset-4 hf:text-red hf:decoration-red" aria-label="Edit weekly goal">
              Edit
            </Link>
          </div>
          <p className="mt-3 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="t-display-l font-display leading-[0.8]">{weekTotal}</span>
            <span className="text-[12px] tracking-[0.06em] text-muted uppercase">/ {weeklyGoal} min</span>
          </p>
          <div role="progressbar" aria-label="Weekly goal" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} className="relative mt-6 h-px bg-line-strong">
            <span className="absolute inset-y-[-1px] left-0 bg-red" style={{ width: `${goalPct}%` }} />
          </div>
          {/* seven days as hairline columns */}
          <div className="mt-5 grid grid-cols-7 border-l border-line" role="img" aria-label={`Minutes per day this week: ${week.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
            {week.map((d, i) => (
              <div key={d.key} className="flex h-[96px] flex-col justify-end border-r border-line px-1.5 text-center">
                <span className={clsx("mx-auto block w-2 sm:w-2.5", i === week.length - 1 ? "bg-red" : "bg-fg")} style={{ height: `${d.value ? Math.max(3, (d.value / peak) * 64) : 1}px`, opacity: d.value ? 1 : 0.25 }} />
                <span className={clsx("mt-2 font-mono text-[10px] tracking-[0.04em] uppercase", i === week.length - 1 ? "text-fg" : "text-muted")}>{d.label === "Today" ? "Tdy" : d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 t-small text-muted">{goalPct >= 100 ? "Goal hit. Anything more is a director's cut." : `${goalPct}% of this week's goal. ${Math.max(0, weeklyGoal - weekTotal)} min to go.`}</p>
        </div>
      </div>
      {/* numbers */}
      <dl className="mt-10 grid grid-cols-2 border-t border-l border-line sm:grid-cols-4">
        {[
          { k: "Minutes learned", v: formatNumber(stats.minutesLearned) },
          { k: "Lessons finished", v: formatNumber(stats.lessonsFinished) },
          { k: "Tests passed", v: formatNumber(stats.quizzesPassed) },
          { k: "Certificates", v: formatNumber(stats.certificates) },
        ].map((s, i) => (
          <div key={s.k} className="min-w-0 border-r border-b border-line p-4 sm:p-5">
            <dt className="flex items-baseline justify-between gap-2 text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
              <span className="min-w-0">{s.k}</span>
              <span className="font-mono font-medium tracking-[0.04em]" aria-hidden>
                {idx(i + 1)}
              </span>
            </dt>
            <dd className="mt-5 t-display-s text-[clamp(1.75rem,1.3rem+1.4vw,2.75rem)]">{s.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ----------------------------------------------------------------------------- 04 activity */
const KIND_LABEL: Record<string, string> = {
  course: "Course",
  quiz: "Test",
  order: "Order",
  review: "Review",
  question: "Q&A",
  system: "Tamada",
  application: "Tutor",
  payout: "Payout",
};

function Activity({ uid, db }: { uid: string; db: Db }) {
  const rows = useMemo(() => {
    const notes = getNotifications(uid, db)
      .slice(0, 5)
      .map((n) => ({ id: n.id, kind: KIND_LABEL[n.kind] ?? "News", title: n.title, body: n.body, at: n.createdAt, href: n.href, unread: !n.read }));
    const wins = tinyWins(uid, db, 3).map((w) => ({ id: w.id, kind: "Win", title: w.title, body: "", at: w.at, href: w.href, unread: false }));
    return [...notes, ...wins].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [uid, db]);
  if (!rows.length)
    return (
      <div className="border-t border-line pt-5">
        <p className="t-headline-m">Quiet on set.</p>
        <p className="mt-2 t-small text-muted">Finish a lesson or pass a test and it shows up here.</p>
      </div>
    );
  return (
    <ul className="border-b border-line">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase tabular-nums max-sm:col-span-2">
              {timeAgo(r.at)} <span className="sm:hidden">· {r.kind}</span>
            </span>
            <span className="min-w-0">
              <span className="flex items-start gap-2 text-[15px] leading-snug font-medium tracking-[-0.005em]">
                {r.unread && (
                  <span className="mt-[7px] size-[6px] shrink-0 bg-red" aria-label="Unread" />
                )}
                <span className="min-w-0">{r.title}</span>
              </span>
              {r.body && <span className="mt-1 line-clamp-1 block t-small text-muted">{r.body}</span>}
            </span>
            <span className="text-right font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase max-sm:hidden">{r.kind}</span>
          </>
        );
        const cls = "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_5rem] sm:items-baseline";
        return (
          <li key={r.id} className="border-t border-line">
            {r.href ? (
              <Link href={r.href} className={clsx(cls, "group transition-colors hf:bg-fg/[0.03] [&_.t-small]:group-hf:text-fg")}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------------------------------------------------------- 05 certificate */
function CertificateTeaser({
  uid,
  db,
  learnerName,
  certs,
  main,
}: {
  uid: string;
  db: Db;
  learnerName: string;
  certs: ReturnType<typeof getCertificates>;
  main: ReturnType<typeof getMyCourses>[number] | null;
}) {
  void uid;
  void db;
  const cert = certs[0];
  const left = main ? main.progress.total - main.progress.completed : 0;
  const href = main ? `/learn/${main.course.slug}/${main.progress.resumeItemId ?? ""}` : "/courses";
  return (
    <div className="grid items-start gap-8 border-t border-line pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10">
      <div className="min-w-0">
        <p className="t-statement-m max-w-[22ch] text-balance">
          {cert ? (
            <>
              You&apos;re a <span className="text-red">certified</span> AI filmmaker. Put it where people can see it.
            </>
          ) : (
            <>
              {plural(left, "step")} to go, then your name goes on <span className="text-red">this</span>.
            </>
          )}
        </p>
        <ul className="mt-6 border-b border-line font-mono text-[11px] tracking-[0.06em] uppercase">
          {["Public verification page", "PDF download", "Add to LinkedIn in one click"].map((t, i) => (
            <li key={t} className="flex gap-4 border-t border-line py-2.5">
              <span className="text-muted">{idx(i + 1)}</span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <SeeAll href="/dashboard/certificates">{cert ? `All certificates (${certs.length})` : "About certificates"}</SeeAll>
        </div>
      </div>
      {cert ? (
        <CertificateCard cert={cert} learnerName={learnerName} compact />
      ) : (
        main && main.course.hasCertificate !== false && (
          <CertificateCard preview={{ course: main.course, percent: main.progress.percent, left, href }} learnerName={learnerName} compact />
        )
      )}
    </div>
  );
}
