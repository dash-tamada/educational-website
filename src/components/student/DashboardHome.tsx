"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CourseCard,
  EmptyState,
  Icon,
  PageHeader,
  ProgressRing,
  StatGrid,
  StatTile,
  TabPanel,
  Tabs,
  toast,
} from "@/components/app";
import { toneBg, type Tone } from "@/lib/landing-data";
import { useDb, demo } from "@/lib/demo/store";
import {
  formatDuration,
  formatNumber,
  getCertificates,
  getCourseCard,
  getCourses,
  getStudentStats,
  isEnrolled,
  isWishlisted,
  itemTitle,
  plural,
  timeAgo,
  type Db,
} from "@/lib/mock";
import { ActivityCard } from "./ActivityCard";
import { CertificateCard } from "./CertificateCard";
import { ContinueHero } from "./ContinueHero";
import { DashboardSkeleton, Hydrated } from "./Hydrated";
import { PhoneScroller, ProgressRow } from "./PhoneRows";
import {
  BrowseTile,
  FlameIcon,
  GridFiller,
  IconDot,
  fillGridHide,
  SectionTitle,
  SeeAll,
  StreakStrip,
  TABS_GRID_SM,
  TILE_TIGHT,
} from "./bits";
import {
  courseState,
  dailyMinutes,
  firstName,
  getMyCourses,
  itemMeta,
  recommendations,
  shortItemLabel,
  tinyWins,
  upNext,
  type CourseState,
} from "./data";
import { useStudentPrefs, useStudentProfile } from "./prefs";
import { useMyWishlist, useWishlistRemove } from "./wishlist-actions";

type DashTab = CourseState | "wishlist";

export function DashboardHome() {
  return (
    <Hydrated fallback={<DashboardFallback />}>
      <DashboardHomeInner />
    </Hydrated>
  );
}

/** Skeleton with the REAL header: before the overlay applies, useDb() is the seed, so the greeting,
 *  description and badges come out exactly as the page will draw them (no jump when it lands). */
export function DashboardFallback() {
  const db = useDb();
  const profile = useStudentProfile();
  const empty = useMemo(
    () => getMyCourses(profile.uid, db).length === 0,
    [profile.uid, db],
  );
  return (
    <DashboardSkeleton
      header={
        <DashHeader uid={profile.uid} db={db} name={firstName(profile.name)} />
      }
      newLearner={empty}
    />
  );
}

/** "Hey, Priya." greeting with today's nudge, streak + course badges and Browse courses. */
function DashHeader({ uid, db, name }: { uid: string; db: Db; name: string }) {
  const enrolled = useMemo(() => getMyCourses(uid, db), [uid, db]);
  const stats = useMemo(() => getStudentStats(uid, db), [uid, db]);
  const counts = { in_progress: 0, completed: 0, not_started: 0 } as Record<
    CourseState,
    number
  >;
  for (const e of enrolled) counts[courseState(e.progress)]++;
  const todayActive = stats.last14[stats.last14.length - 1];
  return (
    <PageHeader
      eyebrow="Student space"
      eyebrowTone="hotpink"
      title={`Hey, ${name}. What are we learning today?`}
      description={
        enrolled.length
          ? todayActive
            ? "You've already shown up today. Everything else is a bonus."
            : "One short lesson keeps the streak alive. Your next one is waiting below."
          : "Every course starts with a free lesson. Pick one and press play."
      }
      meta={
        enrolled.length ? (
          <>
            <Badge tone={stats.streakDays ? "flame" : "neutral"}>
              <FlameIcon className="size-3.5" lit={stats.streakDays > 0} />
              {stats.streakDays
                ? `${stats.streakDays}-day streak`
                : "No streak yet"}
            </Badge>
            <Badge tone="white">
              {counts.in_progress
                ? `${plural(counts.in_progress, "course")} on the go`
                : `${plural(counts.not_started || enrolled.length, "course")} ready to start`}
            </Badge>
          </>
        ) : undefined
      }
      actions={
        enrolled.length ? (
          // phones: the top bar search and the More sheet already carry "browse"; the first
          // screen keeps room for the Continue button instead
          <Button
            href="/courses"
            variant="secondary"
            icon="search"
            className="max-sm:hidden"
          >
            Browse courses
          </Button>
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
  const savedAll = useMyWishlist(uid, db);
  // bought courses keep their wishlist row; they already sit in the course tabs, so this tab lists what's left to buy
  const wishlist = useMemo(
    () => savedAll.filter((w) => !isEnrolled(uid, w.course.id, db)),
    [savedAll, uid, db],
  );
  const certs = useMemo(
    () => getCertificates(uid, db).filter((c) => !!c.course),
    [uid, db],
  );
  const next = useMemo(() => upNext(uid, db), [uid, db]);
  const wins = useMemo(() => tinyWins(uid, db), [uid, db]);
  const week = useMemo(() => dailyMinutes(uid, db, 7), [uid, db]);

  const weeklyGoal = prefs.dailyGoal * prefs.goalDays;
  const weekTotal = week.reduce((s, d) => s + d.value, 0);
  const goalPct = Math.min(
    100,
    Math.round((weekTotal / Math.max(1, weeklyGoal)) * 100),
  );
  const todayActive = stats.last14[stats.last14.length - 1];
  const activeDays = stats.last14.filter(Boolean).length;

  const groups = useMemo(() => {
    const g: Record<CourseState, typeof enrolled> = {
      in_progress: [],
      completed: [],
      not_started: [],
    };
    for (const e of enrolled) g[courseState(e.progress)].push(e);
    return g;
  }, [enrolled]);
  const resume = groups.in_progress[0] ?? groups.not_started[0] ?? null;
  // The fortnight card is sun, unless the hero next to it is already yellow (one accent per screen).
  // Then it goes mint while stacked (above the blush/cyan tiles) and blush from xl (above the mint tile).
  const fortnightTone: "sun" | "alt" =
    resume && (resume.course.tone === "sun" || resume.course.tone === "butter")
      ? "alt"
      : "sun";

  // only the learner's explicit pick is state; the default follows the live data
  const defaultTab: DashTab = groups.in_progress.length
    ? "in_progress"
    : groups.not_started.length
      ? "not_started"
      : groups.completed.length
        ? "completed"
        : "wishlist";
  const [picked, setPicked] = useState<DashTab | null>(null);
  const available = (t: DashTab) =>
    t !== "not_started" || groups.not_started.length > 0;
  const tab: DashTab = picked && available(picked) ? picked : defaultTab;
  const name = firstName(profile.name);

  const header = <DashHeader uid={uid} db={db} name={name} />;

  /* ------------------------------------------------------------------ brand-new learner */
  if (!enrolled.length) {
    return (
      <div className="app-enter">
        {header}
        <Card padding="none" className="overflow-hidden">
          <EmptyState
            art="tami"
            tone="blush"
            title="Your dashboard is waiting for its first rabbit hole."
            body="Press play on any course and this page fills up with your progress, streaks and tiny wins."
            action={<NewLearnerActions uid={uid} db={db} />}
          />
        </Card>
        <Recommended
          uid={uid}
          priorityFirst
          phoneList
          className="mt-10 md:mt-12"
        />
      </div>
    );
  }

  return (
    <div className="app-enter">
      {header}

      {/* ------------------------------------------------------------------ hero + fortnight */}
      <div className="grid gap-4 md:gap-5 xl:grid-cols-3">
        {resume ? (
          <ContinueHero entry={resume} db={db} className="xl:col-span-2" />
        ) : (
          <section
            aria-labelledby="all-done"
            className="relative flex min-w-0 flex-col justify-center overflow-hidden rounded-card-lg bg-mint p-6 md:p-8 xl:col-span-2"
          >
            <p className="flex items-center gap-2 t-label">
              <Icon name="award" className="size-[18px]" /> Everything finished
            </p>
            <h2 id="all-done" className="mt-3 max-w-[20ch] t-chunky-card">
              You finished every course you own. Show-off.
            </h2>
            <p className="mt-3 max-w-[48ch] t-body text-ink/75">
              Grab your certificates, then pick the next rabbit hole. We saved a
              few ideas below.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                href="/dashboard/certificates"
                variant="primary"
                icon="award"
              >
                My certificates
              </Button>
              <Button href="/courses" variant="secondary">
                Find a new course
              </Button>
            </div>
          </section>
        )}

        {/* The sun card leads with the two-week strip and the weekly goal (the streak number lives in the stat tiles).
            It is a container: narrow (beside the hero) it stacks; full width it goes to two, then three columns. */}
        <section
          aria-labelledby="fortnight-title"
          className={clsx(
            "@container min-w-0 rounded-card-lg p-5 md:p-6",
            fortnightTone === "alt" ? "bg-mint xl:bg-blush" : "bg-sun",
          )}
        >
          <div className="flex h-full flex-col gap-5 @[560px]:grid @[560px]:grid-cols-[minmax(0,1fr)_280px] @[560px]:gap-x-10 @[560px]:gap-y-4 @[900px]:grid-cols-[minmax(0,1fr)_280px_240px]">
            <div className="min-w-0 @[560px]:col-start-1 @[560px]:row-start-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="fortnight-title" className="t-label text-ink/80">
                    This fortnight
                  </h2>
                  <p className="mt-1 t-stat">
                    {activeDays}{" "}
                    <span className="text-[0.55em]">of 14 days</span>
                  </p>
                </div>
                <FlameIcon
                  className="size-9 shrink-0 @[560px]:hidden"
                  lit={stats.streakDays > 0}
                />
              </div>
              <p className="mt-2 t-small text-ink/80">
                {todayActive
                  ? "Today's box is ticked. Look at you go."
                  : stats.streakDays
                    ? "Watch one lesson today to keep your streak alive."
                    : "Watch one lesson today to start a streak."}
              </p>
            </div>
            <StreakStrip
              days={stats.last14}
              tone={fortnightTone}
              className="@[560px]:col-start-2 @[560px]:row-span-2 @[560px]:row-start-1 @[560px]:self-center @[900px]:row-span-1"
            />
            <div className="mt-auto flex items-center gap-3.5 rounded-card bg-white/60 p-3 @[560px]:col-start-1 @[560px]:row-start-2 @[560px]:mt-0 @[560px]:max-w-[300px] @[900px]:col-start-3 @[900px]:row-start-1 @[900px]:self-center">
              <ProgressRing
                value={goalPct}
                size={58}
                stroke={7}
                tone="ink"
                label="Weekly goal progress"
              />
              <div className="min-w-0">
                <p className="text-[15px] font-bold">Weekly goal</p>
                <p className="t-small text-ink/80">
                  {weekTotal} of {weeklyGoal} min ·{" "}
                  <Link
                    href="/dashboard/settings#goals"
                    className="font-bold underline decoration-ink/40 underline-offset-2 hf:decoration-ink"
                    aria-label="Edit weekly goal"
                  >
                    Edit
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ stats */}
      <StatGrid className="mt-4 md:mt-5">
        <StatTile
          className={TILE_TIGHT}
          label="Minutes learned"
          value={formatNumber(stats.minutesLearned)}
          tone="blush"
          icon="clock"
          hint="across every course"
        />
        <StatTile
          className={TILE_TIGHT}
          label="Lessons finished"
          value={formatNumber(stats.lessonsFinished)}
          tone="cyan"
          icon="play-circle"
          hint={plural(stats.quizzesPassed, "quiz passed", "quizzes passed")}
        />
        <StatTile
          className={TILE_TIGHT}
          label="Current streak"
          value={`${stats.streakDays}d`}
          tone="butter"
          icon="spark"
          hint={
            stats.streakDays
              ? "days in a row, today included"
              : "one lesson starts it"
          }
        />
        <StatTile
          className={TILE_TIGHT}
          label="Courses completed"
          value={stats.coursesCompleted}
          tone="mint"
          icon="award"
          hint={plural(stats.certificates, "certificate")}
          href="/dashboard/certificates"
        />
      </StatGrid>

      {/* ------------------------------------------------------------------ your courses */}
      <section aria-labelledby="your-courses" className="mt-10 md:mt-12">
        <SectionTitle
          id="your-courses"
          title="Your courses"
          description="Pick up where you left off, or revisit the ones you smashed."
          action={<SeeAll href="/dashboard/courses">All my courses</SeeAll>}
        />
        <Tabs
          label="Course groups"
          idBase="dash-courses"
          className={TABS_GRID_SM}
          value={tab}
          onChange={(v) => setPicked(v as DashTab)}
          items={[
            {
              id: "in_progress",
              label: "In progress",
              count: groups.in_progress.length,
            },
            {
              id: "completed",
              label: "Completed",
              count: groups.completed.length,
            },
            ...(groups.not_started.length
              ? [
                  {
                    id: "not_started",
                    label: "Not started",
                    count: groups.not_started.length,
                  },
                ]
              : []),
            { id: "wishlist", label: "Wishlist", count: wishlist.length },
          ]}
        />
        {(["in_progress", "completed", "not_started"] as const).map((k) => (
          <TabPanel
            key={k}
            id={k}
            active={tab}
            idBase="dash-courses"
            className="mt-4 md:mt-5"
          >
            {groups[k].length ? (
              <>
              {/* phones: compact continue rows (S-01); from sm: the progress card grid */}
              <ul className="space-y-2.5 sm:hidden">
                {groups[k].slice(0, 3).map((e) => (
                  <li key={e.course.id}>
                    <ProgressRow e={e} />
                  </li>
                ))}
              </ul>
              <div className="grid gap-4 max-sm:hidden sm:grid-cols-2 xl:grid-cols-3">
                {groups[k].slice(0, 3).map((e, i) => {
                  const card = getCourseCard(e.course.id, db);
                  return card ? (
                    <CourseCard
                      key={e.course.id}
                      data={card}
                      variant="progress"
                      progress={e.progress}
                      ctaLabel={k === "in_progress" ? "Continue" : undefined}
                      statusLabel={
                        k === "in_progress" && e.progress.percent === 0
                          ? "Just started"
                          : undefined
                      }
                      className={i === 2 ? "sm:max-xl:hidden" : undefined}
                    />
                  ) : null;
                })}
                <TabFiller kind={k} n={groups[k].length} uid={uid} db={db} />
              </div>
              </>
            ) : (
              <Card padding="none">
                <EmptyState
                  compact
                  art="buddy"
                  tone="cyan"
                  title={
                    k === "completed"
                      ? "No finished courses yet."
                      : "Nothing here right now."
                  }
                  body={
                    k === "completed"
                      ? "Finish every lesson and quiz in a course and it lands here, with a certificate."
                      : "Courses you start will show up here."
                  }
                  action={
                    <Button
                      href="/dashboard/courses"
                      variant="secondary"
                      size="sm"
                    >
                      See all my courses
                    </Button>
                  }
                />
              </Card>
            )}
            {groups[k].length > 2 && (
              <p
                className={clsx(
                  "mt-4 text-center",
                  groups[k].length === 3 && "max-sm:hidden xl:hidden",
                )}
              >
                <SeeAll
                  href={`/dashboard/courses?status=${k === "in_progress" ? "in-progress" : k === "not_started" ? "not-started" : "completed"}`}
                >
                  See all {groups[k].length}
                </SeeAll>
              </p>
            )}
          </TabPanel>
        ))}
        <TabPanel
          id="wishlist"
          active={tab}
          idBase="dash-courses"
          className="mt-4 md:mt-5"
        >
          <WishlistTab
            uid={uid}
            db={db}
            rows={wishlist}
            ownedCount={savedAll.length - wishlist.length}
          />
        </TabPanel>
      </section>

      {/* ------------------------------------------------------------------ activity + up next */}
      <div className="mt-10 grid gap-4 md:mt-12 md:gap-5 xl:grid-cols-5">
        <ActivityCard
          uid={uid}
          db={db}
          weeklyGoal={weeklyGoal}
          className="xl:col-span-3"
        />
        <Card className="xl:col-span-2">
          <CardHeader
            title="Up next"
            description="Your next few steps, in order."
          />
          {next.length ? (
            // grouped by course (upNext keeps each course's steps together), so the course name is shown
            // once and never has to share a truncated line with the lesson label
            <div className="-mx-2 space-y-3">
              {groupByCourse(next).map((g) => (
                <div key={g.course.id}>
                  <p
                    id={`up-next-${g.course.id}`}
                    className="flex min-w-0 items-center gap-2 px-2 text-[12px] font-bold tracking-[0.03em] text-ink/70 uppercase"
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        "size-2 shrink-0 rounded-full",
                        toneBg[g.course.tone],
                      )}
                    />
                    <span className="truncate">{g.course.title}</span>
                  </p>
                  <ol
                    aria-labelledby={`up-next-${g.course.id}`}
                    className="mt-1 space-y-1"
                  >
                    {g.items.map((n) => {
                      const meta = itemMeta(n.ctx.item);
                      const locked = !n.access.allowed;
                      const blocker = n.access.blockedBy;
                      const href = `/learn/${n.course.slug}/${locked && blocker ? blocker.id : n.ctx.item.id}`;
                      const video =
                        n.ctx.item.type === "video" ? n.ctx.item.lesson : null;
                      const left =
                        n.isResume && video
                          ? timeLeft(
                              uid,
                              n.course.id,
                              n.ctx.item.id,
                              video.durationSec,
                              db,
                            )
                          : null;
                      return (
                        <li key={n.ctx.item.id}>
                          <Link
                            href={href}
                            className="group flex items-start gap-3 rounded-[18px] p-2 transition-colors duration-150 focus-visible:bg-cream hf:bg-cream"
                          >
                            <IconDot
                              icon={locked ? "lock" : meta.icon}
                              tone={
                                locked
                                  ? "white"
                                  : n.ctx.item.type === "quiz"
                                    ? "sun"
                                    : n.isResume
                                      ? "hotpink"
                                      : "cyan"
                              }
                              className={locked ? "bg-ink/[0.06]" : undefined}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-bold tracking-[0.03em] text-ink/70 uppercase">
                                {shortItemLabel(n.ctx.label)}
                              </span>
                              <span className="mt-0.5 block text-[15px] leading-snug font-bold">
                                {itemTitle(n.ctx.item)}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-ink/70">
                                {locked ? (
                                  <Badge size="sm" tone="neutral">
                                    <Icon name="lock" className="size-3" /> Pass
                                    the checkpoint first
                                  </Badge>
                                ) : (
                                  <>
                                    {n.isResume &&
                                      (n.fresh ||
                                        n.hasProgress ||
                                        meta.kind !== "Checkpoint") && (
                                        <Badge size="sm" tone="blush">
                                          {n.fresh
                                            ? "Start here"
                                            : n.hasProgress
                                              ? "Resume"
                                              : "Next"}
                                        </Badge>
                                      )}
                                    {meta.kind === "Checkpoint" && (
                                      <Badge size="sm" tone="butter">
                                        Checkpoint
                                      </Badge>
                                    )}
                                    <span>{left ?? meta.detail}</span>
                                  </>
                                )}
                              </span>
                            </span>
                            <Icon
                              name="chevron-right"
                              className="mt-3 size-4 shrink-0 text-ink/40 transition-colors group-hf:text-ink"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              art="buddies"
              tone="mint"
              title="All caught up."
              body="No lessons waiting. Start something new?"
              action={
                <Button href="/courses" size="sm" variant="secondary">
                  Browse courses
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ wins + certificates */}
      <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Tiny wins"
            description="Small things you did that deserve a high five."
          />
          {wins.length ? (
            <ul className="space-y-3.5 md:grid md:grid-cols-2 md:space-y-0 md:gap-x-6 md:gap-y-3.5 xl:block xl:space-y-3.5">
              {wins.map((w) => (
                <li key={w.id} className="flex items-start gap-3">
                  <IconDot icon={w.icon} tone={w.tone} size="sm" />
                  <div className="min-w-0 pt-0.5">
                    {w.href ? (
                      <Link
                        href={w.href}
                        className="text-[14.5px] leading-snug font-semibold hf:underline hf:decoration-ink/30 hf:underline-offset-2"
                      >
                        {w.title}
                      </Link>
                    ) : (
                      <p className="text-[14.5px] leading-snug font-semibold">
                        {w.title}
                      </p>
                    )}
                    <p className="mt-0.5 text-[12.5px] font-semibold text-ink/70">
                      {timeAgo(w.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-small text-ink/70">
              Finish a lesson or pass a quiz and your wins start stacking up
              here.
            </p>
          )}
          {wins.length < 4 && <UpForGrabs uid={uid} className="mt-5" />}
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="Recent certificates"
            description={
              certs.length
                ? "Proof you did the thing."
                : "Finish a course to earn your first one."
            }
            action={
              certs.length ? (
                <SeeAll href="/dashboard/certificates">All certificates</SeeAll>
              ) : undefined
            }
          />
          {certs.length ? (
            <>
              {/* two side by side once each paper card gets ~234px (the meta row wraps beside the seal) */}
              {/* with a single certificate, "closest to your next one" takes the second column instead of leaving it empty */}
              {/* phones with 2+: a swipe row, so two paper sheets don't stack into a screen and a half */}
              {certs.length > 1 && (
                <PhoneScroller label="Recent certificates" bleed={20}>
                  {certs.slice(0, 2).map((c) => (
                    <li key={c.id} className="w-[76vw] max-w-[300px]">
                      <CertificateCard
                        cert={c}
                        learnerName={profile.name}
                        compact
                        className="h-full"
                      />
                    </li>
                  ))}
                </PhoneScroller>
              )}
              <div
                className={clsx(
                  "@container",
                  certs.length > 1 && "max-sm:hidden",
                )}
              >
                <div className="grid gap-3 @[480px]:grid-cols-2 @[480px]:gap-4">
                  {certs.slice(0, 2).map((c) => (
                    <CertificateCard
                      key={c.id}
                      cert={c}
                      learnerName={profile.name}
                      compact
                    />
                  ))}
                  {certs.length === 1 && (
                    <AlmostThere
                      uid={uid}
                      limit={2}
                      heading="Closest to your next one"
                      className="mt-2 @[480px]:mt-0"
                    />
                  )}
                </div>
              </div>
              {certs.length > 1 && (
                <AlmostThere
                  uid={uid}
                  limit={1}
                  heading="Closest to your next one"
                  className="mt-5"
                />
              )}
            </>
          ) : (
            <AlmostThere uid={uid} />
          )}
        </Card>
      </div>

      <Recommended uid={uid} className="mt-10 md:mt-12" />
    </div>
  );
}

/** Consecutive Up next steps of the same course, kept in order. */
function groupByCourse<
  T extends { course: { id: string; tone: Tone; title: string } },
>(rows: T[]) {
  const out: { course: T["course"]; items: T[] }[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.course.id === r.course.id) last.items.push(r);
    else out.push({ course: r.course, items: [r] });
  }
  return out;
}

/** "9 min left" for the video the learner is part-way through. */
function timeLeft(
  uid: string,
  courseId: string,
  itemId: string,
  durationSec: number,
  db: Db,
) {
  const p = db.lessonProgress.find(
    (x) => x.userId === uid && x.courseId === courseId && x.itemId === itemId,
  );
  const pos = p && !p.completed ? Math.min(p.lastPositionSec, durationSec) : 0;
  if (pos < 15) return null;
  return `${formatDuration(Math.max(60, durationSec - pos), "long")} left`;
}

function NewLearnerActions({ uid, db }: { uid: string; db: Db }) {
  // the most popular course with a free first lesson (stable: not tied to the picks below)
  const [pick] = useState(() => recommendations(uid, db, 1).cards[0]);
  return (
    <>
      <Button href="/courses" variant="accent" iconRight="arrow-right">
        Browse courses
      </Button>
      {pick?.firstFreeItemId && (
        <Button
          href={`/learn/${pick.course.slug}/${pick.firstFreeItemId}`}
          variant="secondary"
          icon="play"
        >
          Try a free lesson
        </Button>
      )}
    </>
  );
}

/** Wishlist preview inside "Your courses": remove shows a toast with Undo and keeps keyboard focus on the grid. */
function WishlistTab({
  uid,
  db,
  rows,
  ownedCount,
}: {
  uid: string;
  db: Db;
  rows: ReturnType<typeof useMyWishlist>;
  ownedCount: number;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const remove = useWishlistRemove(uid);
  const shown = rows.slice(0, 3);

  if (!rows.length)
    return (
      <Card padding="none">
        <EmptyState
          compact
          art="tami"
          tone="blush"
          title={
            ownedCount
              ? "You bought everything you saved."
              : "Nothing saved yet."
          }
          body={
            ownedCount
              ? "Every course on your wishlist is already yours. Go window-shop the library for the next one."
              : "Go window-shop the library and tap the heart on anything that looks fun."
          }
          action={
            <>
              <Button href="/courses" variant="secondary" size="sm">
                Browse courses
              </Button>
              {ownedCount > 0 && (
                <Button href="/dashboard/wishlist" variant="ghost" size="sm">
                  Open my wishlist
                </Button>
              )}
            </>
          }
        />
      </Card>
    );

  const onRemove = (w: (typeof rows)[number], i: number) =>
    remove(w.course.id, w.course.title, () => {
      // after React re-renders, land on the heart that slid into this slot (or the previous one, or the tab)
      requestAnimationFrame(() => {
        const hearts = [
          ...(grid.current?.querySelectorAll<HTMLButtonElement>(
            "button[aria-pressed]",
          ) ?? []),
        ].filter((b) => b.offsetParent);
        (
          hearts[i] ??
          hearts[i - 1] ??
          document.getElementById("dash-courses-tab-wishlist")
        )?.focus();
      });
    });

  return (
    <div ref={grid}>
      {/* phones: compact row cards with the heart (S-01) */}
      <ul className="space-y-2.5 sm:hidden">
        {shown.map((w, i) => {
          const card = getCourseCard(w.course.id, db);
          return card ? (
            <li key={w.id}>
              <CourseCard
                data={card}
                variant="compact"
                wishlisted
                onToggleWishlist={() => onRemove(w, i)}
              />
            </li>
          ) : null;
        })}
      </ul>
      <div className="grid gap-4 max-sm:hidden sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((w, i) => {
          const card = getCourseCard(w.course.id, db);
          return card ? (
            <CourseCard
              key={w.id}
              data={card}
              wishlisted
              className={i === 2 ? "sm:max-xl:hidden" : undefined}
              onToggleWishlist={() => onRemove(w, i)}
            />
          ) : null;
        })}
        <GridFiller
          n={shown.length}
          tone="blush"
          title="Window-shop some more?"
          body="Every course in the library has a free first lesson. Save the ones that look fun."
          cta="Browse courses"
          href="/courses"
        />
      </div>
      {(rows.length > 2 || ownedCount > 0) && (
        <p
          className={clsx(
            "mt-4 text-center",
            rows.length === 3 && !ownedCount && "max-sm:hidden xl:hidden",
          )}
        >
          <SeeAll href="/dashboard/wishlist">
            {ownedCount
              ? "See the whole wishlist"
              : `See the whole wishlist (${rows.length})`}
          </SeeAll>
        </p>
      )}
    </div>
  );
}

/** Wins still on the table (fills the card for newer learners and gives them a next step). */
function UpForGrabs({ uid, className }: { uid: string; className?: string }) {
  const db = useDb();
  const stats = getStudentStats(uid, db);
  const ideas = [
    stats.lessonsFinished === 0 && {
      icon: "play-circle" as const,
      text: "Finish your first lesson",
    },
    stats.quizzesPassed === 0 && {
      icon: "quiz" as const,
      text: "Pass your first quiz",
    },
    stats.streakDays < 3 && {
      icon: "spark" as const,
      text: "Keep a 3-day streak going",
    },
    stats.coursesCompleted === 0 && {
      icon: "award" as const,
      text: "Finish a course, earn a certificate",
    },
    stats.minutesLearned < 300 && {
      icon: "clock" as const,
      text: "Hit 5 hours of learning",
    },
  ].filter(
    (
      x,
    ): x is {
      icon: "play-circle" | "quiz" | "spark" | "award" | "clock";
      text: string;
    } => !!x,
  );
  if (!ideas.length) return null;
  return (
    <div className={clsx("rounded-card bg-cream p-4", className)}>
      <p className="text-[12px] font-bold tracking-[0.06em] text-ink/70 uppercase">
        Up for grabs
      </p>
      <ul className="mt-2.5 space-y-2">
        {ideas.slice(0, 3).map((i) => (
          <li
            key={i.text}
            className="flex items-center gap-2.5 text-[14px] font-semibold text-ink/80"
          >
            <Icon name={i.icon} className="size-4 shrink-0 text-ink/55" />
            {i.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Closest-to-done courses (used when there are no certificates yet). */
function AlmostThere({
  uid,
  limit = 3,
  heading,
  className,
}: {
  uid: string;
  limit?: number;
  heading?: string;
  className?: string;
}) {
  const db = useDb();
  const list = getMyCourses(uid, db)
    .filter(
      (e) => e.progress.percent < 100 && e.course.hasCertificate !== false,
    )
    .sort((a, b) => b.progress.percent - a.progress.percent)
    .slice(0, limit);
  if (!list.length)
    return heading ? null : (
      <EmptyState
        compact
        art="tami"
        tone="sun"
        title="No certificates yet."
        body="Every finished course comes with one."
      />
    );
  return (
    <div className={className}>
      {heading && (
        <p className="mb-2.5 text-[12px] font-bold tracking-[0.06em] text-ink/70 uppercase">
          {heading}
        </p>
      )}
      <ul className="space-y-3">
        {list.map((e) => (
          <li
            key={e.course.id}
            className="flex items-center gap-3 rounded-[18px] bg-cream p-3"
          >
            <ProgressRing
              value={e.progress.percent}
              size={48}
              stroke={6}
              tone="green"
              label={`${e.course.title} progress`}
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[15px] leading-snug font-bold">
                {e.course.title}
              </p>
              <p className="text-[13px] font-semibold text-ink/70">
                {plural(e.progress.total - e.progress.completed, "item")} to
                your certificate
              </p>
            </div>
            <Button
              href={`/learn/${e.course.slug}/${e.progress.resumeItemId ?? ""}`}
              size="sm"
              variant="secondary"
              iconOnly
              icon="arrow-right"
              aria-label={`Continue ${e.course.title}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Picked for you". The set is chosen once per visit (from courses the learner neither owns nor saved),
 * so tapping a heart only flips that heart: the card stays put and focus stays on the button.
 */
function Recommended({
  uid,
  className,
  priorityFirst,
  phoneList = false,
}: {
  uid: string;
  className?: string;
  priorityFirst?: boolean;
  /** phones: a vertical list instead of the swipe row */
  phoneList?: boolean;
}) {
  const db = useDb();
  const [picks] = useState(() => {
    const r = recommendations(uid, db, 4);
    return { ids: r.cards.map((c) => c.course.id), because: r.because };
  });
  const owned = new Set(getMyCourses(uid, db).map((e) => e.course.id));
  const cards = picks.ids
    .filter((id) => !owned.has(id))
    .map((id) => getCourseCard(id, db))
    .filter((c): c is NonNullable<typeof c> => !!c);
  if (!cards.length) return null;
  const toggle = (card: (typeof cards)[number]) => {
    const saved = demo.toggleWishlist(uid, card.course.id);
    toast(
      saved
        ? {
            title: "Saved to your wishlist",
            description: card.course.title,
            tone: "success",
          }
        : {
            title: "Removed from your wishlist",
            description: card.course.title,
          },
    );
  };
  return (
    <section aria-labelledby="recs" className={clsx(className)}>
      <SectionTitle
        id="recs"
        title="Picked for you"
        description={
          picks.because.length
            ? `Because you're into ${picks.because.join(" and ")}. Every one has a free first lesson.`
            : "Popular with learners like you. Every one has a free first lesson."
        }
        action={<SeeAll href="/courses">Browse all</SeeAll>}
      />
      {/* phones: compact cards. A learner with courses gets a swipe row (one card + the next
          peeking); a brand-new learner, for whom these ARE the page, gets a plain list. */}
      {phoneList ? (
        <ul className="space-y-2.5 sm:hidden">
          {cards.map((card) => (
            <li key={card.course.id}>
              <CourseCard
                data={card}
                variant="compact"
                wishlisted={isWishlisted(uid, card.course.id, db)}
                onToggleWishlist={() => toggle(card)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <PhoneScroller label="Picked for you">
          {cards.map((card) => (
            <li key={card.course.id} className="w-[82vw] max-w-[340px]">
              <CourseCard
                data={card}
                variant="compact"
                className="h-full"
                wishlisted={isWishlisted(uid, card.course.id, db)}
                onToggleWishlist={() => toggle(card)}
              />
            </li>
          ))}
        </PhoneScroller>
      )}
      <div className="grid gap-4 max-sm:hidden sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => (
          <CourseCard
            key={card.course.id}
            data={card}
            priority={priorityFirst && i === 0}
            className={fillGridHide(i, cards.length, {
              filler: cards.length % 2 === 1,
            })}
            wishlisted={isWishlisted(uid, card.course.id, db)}
            onToggleWishlist={() => toggle(card)}
          />
        ))}
        <BrowseTile
          show={cards.length % 2 === 1}
          count={getCourses({ pageSize: 1 }, db).total}
        />
      </div>
    </section>
  );
}

/**
 * Fills the gap a short tab leaves in the course grid (1 card: the rest of the row; 2 cards: the
 * third slot from xl). In progress / Completed point at the library; Not started offers a free lesson.
 */
function TabFiller({
  kind,
  n,
  uid,
  db,
}: {
  kind: CourseState;
  n: number;
  uid: string;
  db: Db;
}) {
  const [pick] = useState(() => recommendations(uid, db, 1).cards[0]);
  if (kind === "not_started" && pick?.firstFreeItemId)
    return (
      <GridFiller
        n={n}
        tone="cyan"
        eyebrow="Your next free lesson"
        title={pick.course.title}
        body={`${pick.tutor?.name ?? "A Tamada tutor"} · try the first lesson free, no card needed.`}
        cta="Watch free lesson"
        icon="play"
        href={`/learn/${pick.course.slug}/${pick.firstFreeItemId}`}
      />
    );
  return kind === "completed" ? (
    <GridFiller
      n={n}
      tone="mint"
      title="Finished one? Start another."
      body="Every course starts with a free lesson, so the next rabbit hole costs nothing to try."
      cta="Find your next course"
      href="/courses"
    />
  ) : (
    <GridFiller
      n={n}
      tone="butter"
      title="Room for one more."
      body="Short lessons, quizzes between videos, and a free first lesson on every course."
      cta="Find your next course"
      href="/courses"
    />
  );
}
