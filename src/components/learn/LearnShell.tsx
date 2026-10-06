"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Avatar,
  Badge,
  Button,
  DemoPill,
  Drawer,
  DropdownMenu,
  Icon,
  ProgressRing,
  Skeleton,
  toast,
  isCoarse,
  useBottomUi,
  useIsPhone,
  useIsShortLandscape,
  useScrollHide,
  useScrolledPast,
} from "@/components/app";
import { BrandLockup } from "@/components/landing/Header";
import { Mascot } from "@/components/decor/Mascot";
import {
  flattenCurriculum,
  getCourse,
  getCourseProgress,
  getCurriculum,
  getTutor,
  getUser,
  isEnrolled,
  itemTitle,
  type Certificate,
} from "@/lib/mock";
import { getCourseAccess, getItemAccessMap } from "@/lib/access";
import { demo, getLiveDb, useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth, useDemoSession } from "@/lib/demo/session-client";
import { DEMO_USERS, roleHome } from "@/lib/demo/session";
import {
  LearnContext,
  courseTarget,
  learnHref,
  useLearn as useLearnSafe,
  type LearnContextValue,
  type LearnTab,
  type PlayerHandle,
} from "./context";
import { PathPanel } from "./PathPanel";
import { LearnEmpty } from "./LearnEmpty";
import { CompletionModal } from "./CompletionModal";
import { usePref } from "./usePref";
import { BuyButton } from "./BuyButton";

/* =============================================================================
   The learning player chrome: focused top bar, "Your path" sidebar (collapsible
   on desktop, a drawer on smaller screens), a mobile bottom bar with prev/next,
   and the course-completion celebration. Provides LearnContext to the stage.
   ============================================================================= */

/** Mirrors the "Hide your path" preference so the server renders it right. */
const PATH_COOKIE = "tm_learn_path";

export function LearnShell({
  courseSlug,
  initialCollapsed = false,
  children,
}: {
  courseSlug: string;
  /** from the tm_learn_path cookie: the first paint already matches the preference */
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const session = useDemoSession();
  const params = useParams<{ courseSlug: string; itemId?: string }>();
  const itemId = params?.itemId;
  const course = getCourse(courseSlug, db);
  const { loginAs } = useDemoAuth();

  const [pathOpen, setPathOpen] = useState(false);
  // SSR and hydration use the cookie's value, so a viewer who hid the aside
  // never sees it open and then jump shut (layout shift) on a hard load
  const [collapsed, setCollapsed] = usePref<boolean>(
    "path-collapsed",
    initialCollapsed,
  );
  useEffect(() => {
    // the pre-paint CSS (PathPrePaint) follows React from here on
    document.documentElement.dataset.learnPath = collapsed
      ? "collapsed"
      : "open";
    try {
      document.cookie = `${PATH_COOKIE}=${collapsed ? "collapsed" : "open"}; path=/learn; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked: the preference still lives in localStorage */
    }
  }, [collapsed]);
  const [tab, setTab] = useState<LearnTab>("overview");
  const [focusRequest, setFocusRequest] = useState<{
    tab: LearnTab;
    n: number;
  } | null>(null);
  const [completion, setCompletion] = useState<{
    open: boolean;
    cert: Certificate | null;
  }>({ open: false, cert: null });
  const player = useRef<PlayerHandle | null>(null);
  const celebrated = useRef(false);
  /** the one pending "focus the composer" request; consumed by takeFocus */
  const pendingFocus = useRef<{ tab: LearnTab; itemId: string } | null>(null);
  const fsHost = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [focusMode, setFocusModeState] = useState(false);
  const setFocusMode = useCallback((on: boolean) => setFocusModeState(on), []);

  // a request belongs to the item it was made on: moving on drops it
  useEffect(() => {
    if (pendingFocus.current && pendingFocus.current.itemId !== itemId)
      pendingFocus.current = null;
  }, [itemId]);

  // Fullscreen lives on a host that persists across items, so autoplay into the
  // next lesson stays fullscreen. While fullscreen, html's stable scrollbar
  // gutter would leave a strip on the right, so it is switched off.
  useEffect(() => {
    const root = document.documentElement;
    let saved: string | null = null;
    const onFs = () => {
      const on =
        !!fsHost.current && document.fullscreenElement === fsHost.current;
      setFullscreen(on);
      if (on) {
        saved ??= root.style.scrollbarGutter;
        root.style.scrollbarGutter = "auto";
      } else {
        if (saved !== null) {
          root.style.scrollbarGutter = saved;
          saved = null;
        }
        // Android: the landscape lock taken on entering fullscreen
        try {
          screen.orientation?.unlock?.();
        } catch {
          /* not supported */
        }
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      if (saved !== null) root.style.scrollbarGutter = saved;
    };
  }, []);
  const toggleFullscreen = useCallback((video?: HTMLVideoElement | null) => {
    const el = fsHost.current;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (el?.requestFullscreen)
      el.requestFullscreen()
        .then(() => {
          // phones (Android): turn the picture sideways, like a video app does
          if (!isCoarse()) return;
          const o = screen.orientation as ScreenOrientation & {
            lock?: (o: string) => Promise<void>;
          };
          o?.lock?.("landscape").catch(() => {});
        })
        .catch(() => {});
    // iPhone: element fullscreen is unsupported, the native player takes over
    else
      (
        video as
          | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
          | null
          | undefined
      )?.webkitEnterFullscreen?.();
  }, []);

  type Data = Omit<
    LearnContextValue,
    | "settled"
    | "takeFocus"
    | "asideOpen"
    | "fullscreen"
    | "toggleFullscreen"
    | "player"
    | "tab"
    | "setTab"
    | "focusRequest"
    | "requestFocus"
    | "openPath"
    | "showCompletion"
    | "afterProgress"
    | "tutorBrowsing"
    | "switchToStudent"
    | "focusMode"
    | "setFocusMode"
  >;
  const data = useMemo<Data | null>(() => {
    if (!course) return null;
    const modules = getCurriculum(course.id, db);
    const flat = flattenCurriculum(course.id, db);
    const courseAccess = getCourseAccess(session, course, db);
    const progress = session
      ? getCourseProgress(session.userId, course.id, db)
      : emptyProgress(flat.length);
    const tracking =
      !!session &&
      courseAccess.enrolled &&
      !courseAccess.owner &&
      !courseAccess.admin;
    return {
      course,
      tutor: getTutor(course.tutorId, db),
      db,
      modules,
      flat,
      session,
      profile: session ? getUser(session.userId, db) : null,
      courseAccess,
      accessMap: getItemAccessMap(session, course, db),
      progress: tracking ? progress : emptyProgress(flat.length),
      completed: new Set(tracking ? progress.completedItemIds : []),
      tracking,
      hydrated,
      certificate: session
        ? (db.certificates.find(
            (c) => c.userId === session.userId && c.courseId === course.id,
          ) ?? null)
        : null,
    };
  }, [course, db, session, hydrated]);
  const tracking = !!data?.tracking;

  const afterProgress = useCallback((): boolean => {
    if (!course || !session || !tracking) return false;
    const live = getLiveDb();
    if (getCourseProgress(session.userId, course.id, live).percent < 100)
      return false;
    const had = live.certificates.some(
      (c) => c.userId === session.userId && c.courseId === course.id,
    );
    if (had || celebrated.current) return false;
    celebrated.current = true;
    const cert = course.hasCertificate
      ? demo.issueCertificate(session.userId, course.id)
      : null;
    // the modal portals to <body>, which is hidden while the player is fullscreen
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setCompletion({ open: true, cert });
    return true;
  }, [course, session, tracking]);

  // checkout sells to learner accounts only: a tutor on someone else's course
  // is offered the student demo instead (and lands back on this item)
  const tutorBrowsing =
    session?.role === "tutor" && !!data && !data.courseAccess.owner;
  const courseId = course?.id;
  const switchToStudent = useCallback(() => {
    const owns =
      !!courseId &&
      isEnrolled(DEMO_USERS.student.userId, courseId, getLiveDb());
    loginAs("student");
    toast.success(`You're ${DEMO_USERS.student.name.split(" ")[0]} now`, {
      description: owns
        ? "The student demo. She's already in this course, so it's all yours."
        : "The student demo. Unlock the course to keep going.",
    });
  }, [loginAs, courseId]);

  // "Your path" show/hide by keyboard: the pressed button unmounts, so hand
  // focus to its counterpart (top-bar "Your path" <-> aside "Hide your path")
  const pathFocus = useRef<"show" | "hide" | null>(null);
  const setPathCollapsed = useCallback(
    (v: boolean) => {
      pathFocus.current = v ? "show" : "hide";
      setCollapsed(v);
    },
    [setCollapsed],
  );
  useEffect(() => {
    const want = pathFocus.current;
    if (!want) return;
    pathFocus.current = null;
    document
      .getElementById(want === "show" ? "learn-path-show" : "learn-path-hide")
      ?.focus({ preventScroll: true });
  }, [collapsed]);

  // Client-only drafts (made in the tutor builder) aren't in the seed, so the
  // server could only title them "Lesson": name them here once they resolve.
  const clientOnly = !!course && !getCourse(courseSlug);
  const currentTitle = (() => {
    const x = itemId ? data?.flat.find((f) => f.item.id === itemId) : null;
    return x ? itemTitle(x.item) : null;
  })();
  const wantTitle =
    clientOnly && course && data?.courseAccess.visible
      ? `${currentTitle ? `${currentTitle} · ` : ""}${course.title} (preview) | Tamada Media`
      : null;
  useEffect(() => {
    if (!wantTitle) return;
    const apply = () => {
      if (document.title !== wantTitle) document.title = wantTitle;
    };
    apply();
    // Next applies route metadata on navigation, possibly after this effect
    const mo = new MutationObserver(apply);
    mo.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => mo.disconnect();
  }, [wantTitle]);

  const requestFocus = useCallback(
    (t: LearnTab) => {
      pendingFocus.current = itemId ? { tab: t, itemId } : null;
      setTab(t);
      setFocusRequest((f) => ({ tab: t, n: (f?.n ?? 0) + 1 }));
    },
    [itemId],
  );
  const takeFocus = useCallback((t: LearnTab, id: string) => {
    const p = pendingFocus.current;
    if (!p || p.tab !== t || p.itemId !== id) return false;
    pendingFocus.current = null;
    return true;
  }, []);
  const ctx = useMemo<LearnContextValue | null>(
    () =>
      data && {
        ...data,
        settled: hydrated || !session,
        player,
        tab,
        setTab,
        focusRequest,
        requestFocus,
        takeFocus,
        openPath: () => setPathOpen(true),
        asideOpen: !collapsed,
        fullscreen,
        toggleFullscreen,
        showCompletion: () => setCompletion((c) => ({ ...c, open: true })),
        afterProgress,
        tutorBrowsing,
        switchToStudent,
        focusMode,
        setFocusMode,
      },
    [
      focusMode,
      setFocusMode,
      data,
      hydrated,
      session,
      tab,
      focusRequest,
      requestFocus,
      takeFocus,
      collapsed,
      fullscreen,
      toggleFullscreen,
      afterProgress,
      tutorBrowsing,
      switchToStudent,
    ],
  );

  if (!course || !data || !ctx) {
    if (!hydrated) return <ShellSkeleton collapsed={collapsed} />;
    return (
      <GoneScreen
        title="We couldn't find that course."
        body="It may have been renamed or unpublished. The library has plenty more rabbit holes."
      />
    );
  }
  // draft / in review / rejected / archived, and this person has no way in:
  // show nothing of the unreleased curriculum
  if (!data.courseAccess.visible) {
    if (!hydrated) return <ShellSkeleton collapsed={collapsed} />;
    return (
      <GoneScreen
        title="This course isn't available right now."
        body="It's not published at the moment, so its lessons are tucked away. The library has plenty more to dig into."
      />
    );
  }

  const flatIndex = itemId
    ? data.flat.findIndex((x) => x.item.id === itemId)
    : -1;
  const current = flatIndex >= 0 ? data.flat[flatIndex] : null;
  const cert = completion.cert ?? data.certificate;

  return (
    <LearnContext.Provider value={ctx}>
      <div className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[400] rounded-full bg-ink font-bold text-cream shadow-lift focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:h-10 focus:items-center focus:px-5"
        >
          Skip to lesson
        </a>
        <TopBar
          collapsed={collapsed}
          onTogglePath={() => {
            if (
              typeof window !== "undefined" &&
              window.matchMedia("(min-width: 1024px)").matches
            )
              setPathCollapsed(!collapsed);
            else setPathOpen(true);
          }}
          onShowCompletion={() => setCompletion({ open: true, cert })}
        />

        {/* bottom padding clears the floating lesson bar (--bottom-ui) below lg */}
        <div className="flex gap-4 px-3 pt-2 pb-[calc(var(--bottom-ui,0px)+24px)] sm:px-4 lg:gap-5 lg:px-5 lg:pb-6">
          {!collapsed && (
            <aside
              data-learn-aside
              className="app-fade hidden w-[320px] shrink-0 lg:block xl:w-[348px]"
              aria-label="Your path"
            >
              <div className="sticky top-[76px] h-[calc(100dvh-100px)] overflow-hidden rounded-card-lg bg-white shadow-soft">
                <PathPanel
                  currentItemId={itemId}
                  onCollapse={() => setPathCollapsed(true)}
                />
              </div>
            </aside>
          )}
          <main id="main" tabIndex={-1} className="min-w-0 flex-1">
            {/* fullscreen host: persists across items (see toggleFullscreen) */}
            <div
              ref={fsHost}
              className={clsx(
                fullscreen && "size-full overflow-hidden bg-black",
              )}
            >
              {children}
            </div>
          </main>
        </div>

        {/* Mobile / tablet: bottom bar with prev, path, next */}
        {current && (
          <LessonBar
            prevHref={
              current.prev ? learnHref(course.slug, current.prev.id) : null
            }
            nextHref={
              current.next ? learnHref(course.slug, current.next.id) : null
            }
            position={flatIndex + 1}
            total={data.flat.length}
            onOpenPath={() => setPathOpen(true)}
            away={focusMode}
          />
        )}

        {/* phones: a bottom sheet at the full detent; tablets: the side drawer */}
        <Drawer
          open={pathOpen}
          onClose={() => setPathOpen(false)}
          side="left"
          width={420}
          title="Your path"
          bodyClassName="flex flex-col"
          mobile="sheet"
        >
          <PathPanel
            currentItemId={itemId}
            inDrawer
            onNavigate={() => setPathOpen(false)}
          />
        </Drawer>

        <CompletionModal
          open={completion.open}
          onClose={() => setCompletion((c) => ({ ...c, open: false }))}
          course={course}
          certificate={cert}
          userId={session?.userId ?? null}
        />
      </div>
    </LearnContext.Provider>
  );
}

function GoneScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center gap-3 px-3 pt-[var(--sat)] sm:h-16 sm:px-4 lg:px-5">
        <Link
          href="/"
          aria-label="Tamada Media home"
          className="group tap flex shrink-0 items-center [--lw:92px]"
        >
          <BrandLockup sizes="92px" interactive />
        </Link>
        <span className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          icon="chevron-left"
          href="/courses"
        >
          All courses
        </Button>
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-16">
        <LearnEmpty
          title={title}
          body={body}
          action={
            <Button href="/courses" iconRight="arrow-right">
              Browse courses
            </Button>
          }
        />
      </main>
    </div>
  );
}

/** Where "Back" goes: courseTarget, or the learner's own course list. */
function backTarget(
  course: { id: string; slug: string; status: string },
  access: { owner: boolean; admin: boolean },
): { href: string; label: string } {
  return (
    courseTarget(course, access) ?? {
      href: "/dashboard/courses",
      label: "My courses",
    }
  );
}

function BarLink({
  href,
  icon,
  label,
}: {
  href: string | null;
  icon: "chevron-left" | "chevron-right";
  label: string;
}) {
  if (!href)
    return (
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-full text-cream/30"
      >
        <Icon name={icon} className="size-5" />
      </span>
    );
  return (
    <Link
      href={href}
      aria-label={label}
      className="tap grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hf:bg-white/20"
    >
      <Icon name={icon} className="size-5" strokeWidth={2.4} />
    </Link>
  );
}

/**
 * The floating ink pill below lg: previous · Your path · next. It slides away
 * while the learner scrolls down (reading), comes back on any scroll up and at
 * the end of the page, hides with the on-screen keyboard (data-kbd-hide) and
 * during a test attempt (`away`). Its footprint is published as --bottom-ui, so
 * the content padding, toasts and scroll-padding clear it.
 */
function LessonBar({
  prevHref,
  nextHref,
  position,
  total,
  onOpenPath,
  away,
}: {
  prevHref: string | null;
  nextHref: string | null;
  position: number;
  total: number;
  onOpenPath: () => void;
  away: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const scrolledAway = useScrollHide({ after: 120, delta: 10 });
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const d = document.documentElement;
      setAtEnd(window.scrollY + window.innerHeight >= d.scrollHeight - 96);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  // the footprint stays reserved while it is merely scrolled away (no layout jump)
  useBottomUi("learn-bar", ref, !away);
  const hidden = away || (scrolledAway && !atEnd);
  return (
    <nav
      ref={ref}
      aria-label="Lesson navigation"
      aria-hidden={away || undefined}
      inert={away}
      data-hidden={hidden || undefined}
      data-kbd-hide=""
      className="bottom-bar fixed right-[max(12px,var(--sar))] bottom-[max(12px,var(--sab))] left-[max(12px,var(--sal))] z-30 lg:hidden [html[data-learn-immersive]_&]:pointer-events-none [html[data-learn-immersive]_&]:translate-y-[calc(100%+24px)] [html[data-learn-immersive]_&]:opacity-0"
    >
      <div className="mx-auto flex h-14 max-w-[560px] items-center gap-1 rounded-full bg-ink p-1.5 text-cream shadow-lift land:h-[52px]">
        <BarLink href={prevHref} icon="chevron-left" label="Previous item" />
        <button
          type="button"
          onClick={onOpenPath}
          className="tap flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-[14px] font-bold hf:bg-white/10"
          aria-haspopup="dialog"
        >
          <Icon name="layers" className="size-[18px]" />
          <span>Your path</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[12px] tabular-nums">
            {position}/{total}
          </span>
        </button>
        <BarLink href={nextHref} icon="chevron-right" label="Next item" />
      </div>
    </nav>
  );
}

function emptyProgress(total: number) {
  return {
    completedItemIds: [],
    completed: 0,
    total,
    percent: 0,
    resumeItemId: null,
    resumePositionSec: 0,
    lastActivityAt: null,
    passedQuizIds: [],
  };
}

/* ----------------------------------------------------------------------------- top bar */
function TopBar({
  collapsed,
  onTogglePath,
  onShowCompletion,
}: {
  collapsed: boolean;
  onTogglePath: () => void;
  onShowCompletion: () => void;
}) {
  const {
    course,
    progress,
    tracking,
    courseAccess,
    session,
    certificate,
    settled,
    tutorBrowsing,
  } = useLearnSafe();
  const back = backTarget(course, courseAccess);
  const previewing = courseAccess.owner || courseAccess.admin;
  const finished = tracking && progress.percent === 100;
  // short landscape (phones on their side): the bar slides away while the
  // learner scrolls down, so the video gets the whole screen
  const land = useIsShortLandscape();
  const phone = useIsPhone();
  const hidden = useScrollHide({ after: 56, enabled: land });
  const scrolled = useScrolledPast(4) && phone;
  return (
    <header
      data-learn-topbar=""
      data-hidden={hidden || undefined}
      data-scrolled={scrolled || undefined}
      className="app-topbar sticky top-0 z-40 bg-cream/90 pt-[var(--sat)] backdrop-blur-md max-sm:bg-cream"
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-5 land:h-14">
        <Link
          href="/"
          aria-label="Tamada Media home"
          className="group tap hidden shrink-0 items-center [--lw:92px] lg:flex"
        >
          <BrandLockup sizes="92px" interactive />
        </Link>
        {/* tablets only: on phones Back already leaves the player */}
        <Link
          href="/"
          aria-label="Tamada Media home"
          className="tap hidden size-11 shrink-0 place-items-center sm:grid lg:hidden"
        >
          <Mascot
            title=""
            className="w-7"
            style={{ transform: "rotate(-8deg)" }}
          />
        </Link>
        <span aria-hidden className="hidden h-7 w-px bg-ink/10 lg:block" />
        <Button
          variant="secondary"
          size="sm"
          icon="chevron-left"
          href={back.href}
          aria-label={back.label}
          className="max-md:w-9 max-md:px-0 coarse:max-md:w-11"
        >
          {/* icon-only below md, where the course title needs the room */}
          <span className="hidden md:inline">{back.label}</span>
        </Button>
        <div className="min-w-0 flex-1 pl-1">
          <p className="hidden t-micro whitespace-nowrap text-ink/65 uppercase lg:block">
            {previewing ? "Previewing" : "Now learning"}
          </p>
          <p className="truncate text-[15px] leading-tight font-bold lg:mt-0.5">
            {course.title}
          </p>
        </div>

        {/* the open aside carries its own pill at lg; collapsed, the bar shows it */}
        <span
          data-learn-pill={collapsed ? undefined : ""}
          className={clsx(
            "hidden",
            collapsed ? "lg:inline-flex" : "xl:inline-flex",
          )}
        >
          <DemoPill />
        </span>

        {/* Before the store overlay is in, draw what the seed says. A learner's
            ring shows at once (only its number may change); states that could
            still flip (a demo purchase) keep their footprint but stay invisible,
            so nothing in the bar moves when the overlay lands. */}
        {tracking ? (
          <div
            className={clsx(
              "flex shrink-0 items-center gap-2",
              // phones: the award button already says "done", give the title the room
              finished && "max-sm:hidden",
            )}
            title={`${progress.completed} of ${progress.total} items done`}
          >
            <ProgressRing
              value={progress.percent}
              size={40}
              stroke={5}
              tone="green"
              label="Course progress"
            >
              <span className="text-[11px] font-bold tabular-nums">
                {progress.percent}%
              </span>
            </ProgressRing>
            <span className="hidden min-w-[4.5rem] text-[13px] leading-tight font-bold md:block">
              {progress.percent === 100
                ? "All done"
                : `${progress.completed}/${progress.total} done`}
            </span>
          </div>
        ) : courseAccess.owner ? (
          <span className="hidden shrink-0 sm:inline-flex">
            <Badge tone="cyan" dot>
              Tutor preview
            </Badge>
          </span>
        ) : courseAccess.admin ? (
          <span className="hidden shrink-0 sm:inline-flex">
            <Badge tone="lilac" dot>
              Admin view
            </Badge>
          </span>
        ) : (
          // the in-video chip and the blue banner say it below lg
          <span
            className={clsx(
              "hidden shrink-0 lg:inline-flex",
              !settled && "invisible",
            )}
            aria-hidden={!settled || undefined}
          >
            <Badge tone={tutorBrowsing ? "cyan" : "blue"} dot>
              {tutorBrowsing ? "Tutor account" : "Free preview"}
            </Badge>
          </span>
        )}

        {finished && (
          <>
            <Button
              variant="sun"
              size="sm"
              icon="award"
              onClick={onShowCompletion}
              className="max-sm:hidden"
            >
              {certificate ? "Certificate" : "Finished"}
            </Button>
            <Button
              variant="sun"
              size="sm"
              iconOnly
              icon="award"
              onClick={onShowCompletion}
              aria-label={certificate ? "Your certificate" : "Course finished"}
              className="sm:hidden"
            />
          </>
        )}
        {courseAccess.purchasable && (
          <span
            className={clsx("shrink-0 max-md:hidden", !settled && "invisible")}
            aria-hidden={!settled || undefined}
          >
            <BuyButton size="sm" arrow={false} switchLabel="Student demo" />
          </span>
        )}

        <Button
          variant="secondary"
          size="sm"
          icon="panel-left"
          onClick={onTogglePath}
          aria-label={collapsed ? "Show your path" : "Your path"}
          // tablets: phones open "Your path" from the bottom bar it belongs to
          className="w-9 px-0 max-sm:hidden lg:hidden coarse:w-11"
        >
          <span className="sr-only">Your path</span>
        </Button>
        {/* always in the markup: before hydration the pre-paint CSS can show
            it for a viewer who hid the aside (see PathPrePaint) */}
        <span
          data-learn-show={collapsed ? undefined : ""}
          className={clsx("hidden shrink-0", collapsed && "lg:inline-flex")}
        >
          <Button
            id="learn-path-show"
            variant="secondary"
            size="sm"
            icon="panel-left"
            onClick={onTogglePath}
            aria-expanded={false}
          >
            Your path
          </Button>
        </span>

        {session ? (
          <AccountMenu />
        ) : (
          <Button
            size="sm"
            href={`/login?next=${encodeURIComponent(`/learn/${course.slug}`)}`}
          >
            Log in
          </Button>
        )}
      </div>
    </header>
  );
}

function AccountMenu() {
  const { session, profile } = useLearnSafe();
  const { logout } = useDemoAuth();
  if (!session || !profile) return null;
  const meta = DEMO_USERS[session.role];
  return (
    <DropdownMenu
      label="Account menu"
      width={260}
      triggerClassName="tap hit grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-soft hf:ring-2 hf:ring-ink/10"
      trigger={
        <Avatar
          name={profile.name}
          src={profile.avatar}
          tone={profile.tone}
          size="sm"
          decorative
        />
      }
      header={
        <div className="flex items-center gap-2.5">
          <Avatar
            name={profile.name}
            src={profile.avatar}
            tone={profile.tone}
            size="md"
            decorative
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{profile.name}</p>
            <p className="truncate text-[12px] text-ink/65">{profile.email}</p>
          </div>
        </div>
      }
      items={[
        { label: meta.area, icon: "home", href: roleHome(session.role) },
        ...(session.role === "student"
          ? [
              {
                label: "My courses",
                icon: "book" as const,
                href: "/dashboard/courses",
              },
            ]
          : []),
        { label: "Browse courses", icon: "search", href: "/courses" },
        { divider: true },
        {
          label: "Reset demo data",
          icon: "refresh",
          onSelect: () => {
            demo.reset();
            toast.success("Demo data reset", {
              description:
                "Progress, notes and answers are back to the sample data.",
            });
          },
        },
        {
          label: "Log out",
          icon: "logout",
          danger: true,
          onSelect: () => logout({ redirectTo: "/" }),
        },
      ]}
    />
  );
}

/* ----------------------------------------------------------------------------- skeleton */
export function ShellSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading the player">
      <div className="flex h-14 items-center gap-3 px-3 sm:h-16 sm:px-4 lg:px-5">
        <Mascot
          title=""
          className="hidden w-8 lg:block"
          style={{ transform: "rotate(-6deg)" }}
        />
        <Skeleton className="h-9 w-36 rounded-full" />
        <Skeleton className="h-5 flex-1 rounded-full sm:max-w-xs" />
        <Skeleton variant="circle" className="ml-auto size-10" />
      </div>
      <div className="flex gap-5 px-3 pt-2 sm:px-4 lg:px-5">
        <Skeleton
          className={clsx(
            "hidden h-[calc(100dvh-88px)] w-[320px] shrink-0 rounded-card-lg xl:w-[348px]",
            !collapsed && "lg:block",
          )}
        />
        <div className="min-w-0 flex-1">
          <StageSkeleton />
        </div>
      </div>
    </div>
  );
}

export function StageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px]" aria-hidden>
      <Skeleton className="aspect-video w-full rounded-card-lg" />
      <Skeleton className="mt-6 h-4 w-48 rounded-full" />
      <Skeleton className="mt-3 h-10 w-2/3 rounded-full" />
      <Skeleton variant="text" lines={2} className="mt-4 max-w-xl" />
    </div>
  );
}
