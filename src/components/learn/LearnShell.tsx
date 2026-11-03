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
  INK_SURFACE,
  Skeleton,
  toast,
  isCoarse,
  useBottomUi,
  useIsPhone,
  useIsShortLandscape,
  useScrollHide,
  useScrolledPast,
} from "@/components/app";
import { BrandMark } from "@/components/editorial/BrandMark";
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
      {/* The theatre: ink ground, cream text, hairlines and context tokens flip
          (data-field="dark" lets on-dark: variants and the kit read it too). */}
      <div data-learn-shell="" data-field="dark" className="theatre min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[400] bg-cream text-[11px] font-semibold tracking-[0.16em] text-ink uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:h-10 focus:items-center focus:px-5"
        >
          Skip to lesson
        </a>
        <TopBar
          current={current}
          position={flatIndex + 1}
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

        {/* stage column + "Your path" on the right. Bottom padding clears the
            lesson bar (--bottom-ui) below lg. */}
        <div className="flex">
          <main
            id="main"
            tabIndex={-1}
            className="min-w-0 flex-1 px-3 pt-2 pb-[calc(var(--bottom-ui,0px)+40px)] focus:outline-none sm:px-5 sm:pt-5 lg:px-8 lg:pt-6 lg:pb-20"
          >
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
          {!collapsed && (
            <aside
              data-learn-aside
              className="app-fade hidden w-[340px] shrink-0 border-l border-line lg:block xl:w-[372px]"
              aria-label="Your path"
            >
              <div className="sticky top-[calc(3.5rem+var(--sat))] h-[calc(100dvh-3.5rem-var(--sat))] overflow-hidden">
                <PathPanel
                  currentItemId={itemId}
                  onCollapse={() => setPathCollapsed(true)}
                />
              </div>
            </aside>
          )}
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
          side="right"
          width={420}
          eyebrow={course.title}
          title="Your path"
          bodyClassName="flex flex-col"
          mobile="sheet"
          surface="ink"
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

/** "TM." — the player's own mark (the full logo sits in the top bar from lg). */
function TmMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "font-display text-[24px] leading-none tracking-[0.01em] text-fg",
        className,
      )}
    >
      TM<span className="text-red">.</span>
    </span>
  );
}

/** Home link: the light logo from lg, "TM." below. */
function HomeMark() {
  return (
    <Link
      href="/"
      aria-label="Tamada Media home"
      className="tap flex h-11 shrink-0 items-center"
    >
      <TmMark className="lg:hidden" />
      <BrandMark
        tone="light"
        sizes="104px"
        className="hidden w-[104px] lg:block"
      />
    </Link>
  );
}

function GoneScreen({ title, body }: { title: string; body: string }) {
  return (
    <div data-field="dark" className="theatre flex min-h-dvh flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-line px-3 pt-[var(--sat)] sm:px-5 lg:px-8">
        <HomeMark />
        <span className="flex-1" />
        <Button variant="ghost" size="sm" icon="arrow-left" href="/courses">
          All courses
        </Button>
      </header>
      <main id="main" className="grid flex-1 items-center px-3 pb-16 sm:px-5 lg:px-8">
        <LearnEmpty
          title={title}
          body={body}
          eyebrow="404 · Off the reel"
          action={
            <Button href="/courses" variant="red" iconRight="arrow-right">
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
  dir,
}: {
  href: string | null;
  dir: "prev" | "next";
}) {
  const icon = dir === "prev" ? "arrow-left" : "arrow-right";
  const word = dir === "prev" ? "Prev" : "Next";
  const inner = (
    <>
      {dir === "prev" && <Icon name={icon} className="size-4" strokeWidth={1.8} />}
      <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">
        {word}
      </span>
      {dir === "next" && <Icon name={icon} className="size-4" strokeWidth={1.8} />}
    </>
  );
  const cls = clsx(
    "flex h-full min-w-[84px] shrink-0 items-center gap-2 px-4",
    dir === "next" ? "justify-end" : "justify-start",
  );
  if (!href)
    return (
      <span aria-hidden className={clsx(cls, "text-fg/25")}>
        {inner}
      </span>
    );
  return (
    <Link
      href={href}
      aria-label={dir === "prev" ? "Previous item" : "Next item"}
      className={clsx(cls, "tap text-fg hf:text-red-lite active:bg-white/[0.06]")}
    >
      {inner}
    </Link>
  );
}

/**
 * The bottom bar below lg: previous · Your path · next, flush to the screen
 * edge like a player transport. It slides away while the learner scrolls down
 * (reading), comes back on any scroll up and at the end of the page, hides with
 * the on-screen keyboard (data-kbd-hide) and during a test attempt (`away`). Its
 * footprint is published as --bottom-ui, so the content padding, toasts and
 * scroll-padding clear it.
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
      data-field="dark"
      className={clsx(
        INK_SURFACE,
        "bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-line-strong pr-[var(--sar)] pb-[var(--sab)] pl-[var(--sal)] lg:hidden [html[data-learn-immersive]_&]:pointer-events-none [html[data-learn-immersive]_&]:translate-y-[calc(100%+24px)] [html[data-learn-immersive]_&]:opacity-0",
      )}
    >
      {/* course position as a hairline along the top edge */}
      <span
        aria-hidden
        className="absolute top-[-1px] left-0 h-px bg-red"
        style={{ width: `${(position / Math.max(1, total)) * 100}%` }}
      />
      <div className="mx-auto flex h-14 max-w-[720px] items-stretch divide-x divide-line land:h-12">
        <BarLink href={prevHref} dir="prev" />
        <button
          type="button"
          onClick={onOpenPath}
          className="tap flex min-w-0 flex-1 items-center justify-center gap-2.5 px-3 hf:text-red-lite active:bg-white/[0.06]"
          aria-haspopup="dialog"
        >
          <Icon name="layers" className="size-4 shrink-0" strokeWidth={1.7} />
          <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">
            Your path
          </span>
          <span className="font-mono text-[11.5px] text-muted tabular-nums">
            {String(position).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>
        </button>
        <BarLink href={nextHref} dir="next" />
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

/** "MODULE 05 / LESSON 02" -> "Module 05 · Lesson 02" (mono caps in the bar). */
const slateLabel = (label: string) => label.replace(" / ", " · ");

/* ----------------------------------------------------------------------------- top bar */
function TopBar({
  current,
  position,
  collapsed,
  onTogglePath,
  onShowCompletion,
}: {
  current: { label: string } | null;
  position: number;
  collapsed: boolean;
  onTogglePath: () => void;
  onShowCompletion: () => void;
}) {
  const {
    course,
    flat,
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
      className="app-topbar sticky top-0 z-40 border-b border-line bg-ink/[0.94] pt-[var(--sat)] backdrop-blur-md max-sm:bg-ink"
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
        <HomeMark />
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-line-strong max-sm:hidden" />

        {/* what's playing: course in tiny caps, module · lesson in mono */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10.5px] leading-tight font-semibold tracking-[0.16em] text-muted uppercase sm:text-[11px]">
            {previewing && (
              <span className="text-red-lite">
                {courseAccess.owner ? "Tutor preview" : "Admin view"} ·{" "}
              </span>
            )}
            {course.title}
          </p>
          <p className="mt-1 flex min-w-0 items-baseline gap-2 font-mono text-[11px] leading-tight tracking-[0.06em] text-fg uppercase tabular-nums sm:text-[11.5px]">
            <span className="truncate">
              {current ? slateLabel(current.label) : "Your path"}
            </span>
            {current && (
              <span className="shrink-0 text-muted max-sm:hidden">
                {String(position).padStart(2, "0")}/
                {String(flat.length).padStart(2, "0")}
              </span>
            )}
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
          <DemoPill tone="dark" />
        </span>

        {/* Before the store overlay is in, draw what the seed says. A learner's
            figure shows at once (only its number may change); states that could
            still flip (a demo purchase) keep their footprint but stay invisible,
            so nothing in the bar moves when the overlay lands. */}
        {tracking ? (
          <p
            className={clsx(
              "flex shrink-0 items-baseline gap-2 font-mono text-[11.5px] tracking-[0.04em] tabular-nums",
              // phones: the award button already says "done", give the title the room
              finished && "max-sm:hidden",
            )}
            title={`${progress.completed} of ${progress.total} items done`}
          >
            <span className="text-fg">{progress.percent}%</span>
            <span className="text-muted max-md:hidden">
              {progress.percent === 100
                ? "ALL DONE"
                : `${progress.completed}/${progress.total} DONE`}
            </span>
            <span className="sr-only">course progress</span>
          </p>
        ) : courseAccess.owner || courseAccess.admin ? null : (
          // the in-video chip and the preview strip say it below lg
          <span
            className={clsx(
              "hidden shrink-0 lg:inline-flex",
              !settled && "invisible",
            )}
            aria-hidden={!settled || undefined}
          >
            <Badge tone={tutorBrowsing ? "neutral" : "butter"} dot>
              {tutorBrowsing ? "Tutor account" : "Free preview"}
            </Badge>
          </span>
        )}

        {finished && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon="award"
              onClick={onShowCompletion}
              className="max-sm:hidden"
            >
              {certificate ? "Certificate" : "Finished"}
            </Button>
            <Button
              variant="outline"
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
            <BuyButton
              size="sm"
              arrow={false}
              label="Unlock the full course"
              switchLabel="Student demo"
            />
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          icon="layers"
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
            variant="outline"
            size="sm"
            icon="layers"
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
            variant="outline"
            href={`/login?next=${encodeURIComponent(`/learn/${course.slug}`)}`}
          >
            Log in
          </Button>
        )}

        <span aria-hidden className="h-6 w-px shrink-0 bg-line-strong max-sm:hidden" />
        <Button
          variant="ghost"
          size="sm"
          icon="x"
          href={back.href}
          aria-label={`Exit to ${back.label.replace(/^Back to /, "").toLowerCase()}`}
          title={back.label}
          className="-mr-1.5 max-md:w-9 max-md:px-0 coarse:max-md:w-11"
        >
          <span className="hidden md:inline">Exit</span>
        </Button>
      </div>

      {/* course progress: one red line along the bar's bottom edge */}
      {tracking && (
        <span
          aria-hidden
          className="absolute bottom-[-1px] left-0 h-[2px] bg-red transition-[width] duration-700 ease-expo"
          style={{ width: `${progress.percent}%` }}
        />
      )}
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
      triggerClassName="tap hit grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-line-strong transition-shadow hf:ring-fg"
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
            <p className="truncate text-[14px] font-semibold">{profile.name}</p>
            <p className="truncate text-[12px] text-muted">{profile.email}</p>
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
    <div
      data-learn-shell=""
      data-field="dark"
      className="theatre min-h-dvh"
      aria-busy="true"
      aria-label="Loading the player"
    >
      <div className="flex h-14 items-center gap-3 border-b border-line px-3 sm:px-5 lg:px-6">
        <TmMark />
        <div className="min-w-0 flex-1 space-y-1.5 pl-2">
          <Skeleton className="h-2.5 w-48 max-w-full" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <Skeleton variant="circle" className="size-9" />
      </div>
      <div className="flex">
        <div className="min-w-0 flex-1 px-3 pt-2 sm:px-5 sm:pt-5 lg:px-8 lg:pt-6">
          <StageSkeleton />
        </div>
        <div
          className={clsx(
            "hidden h-[calc(100dvh-56px)] w-[340px] shrink-0 border-l border-line p-6 xl:w-[372px]",
            !collapsed && "lg:block",
          )}
          aria-hidden
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-[2px] w-full" />
          <div className="mt-8 space-y-5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px]" aria-hidden>
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="mt-7 h-3 w-48" />
      <Skeleton className="mt-4 h-11 w-2/3" />
      <Skeleton variant="text" lines={2} className="mt-5 max-w-xl" />
    </div>
  );
}
