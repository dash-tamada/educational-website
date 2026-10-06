"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  BottomSheet,
  Button,
  Icon,
  LAND_QUERY,
  Modal,
  Switch,
  useIsPhone,
  useIsShortLandscape,
  type IconName,
} from "@/components/app";
import { formatDuration } from "@/lib/mock";
import type { PlayerHandle } from "./context";
import { consumeAutoplay, requestAutoplay } from "./media";
import { usePref } from "./usePref";

/* =============================================================================
   Accessible custom video player around a native <video>.
   - play/pause, seek bar (buffered + played + chapter ticks + hover time),
     -10s/+10s, volume/mute, speed 0.75-2x, captions toggle, fullscreen
   - keyboard (while the player or the bare page has focus, never on another
     control): Space/K play, ←/→ 5s, J/L 10s, ↑/↓ volume (player focused),
     F fullscreen, M mute, C captions, 0-9 jump. Single-character keys can be
     switched off in Playback settings (WCAG 2.1.4).
   - positions are saved on the LESSON's own timeline (the sample clip is
     usually shorter), so the dashboard's "7:40 in" and the player agree
   - resume from the saved position, autosave every 10s + on pause/leave,
     completes at 90% watched, autoplay-next countdown (videos only), graceful
     load errors
   - content protection idea: drifting email watermark, no download, no context menu
   - nothing below the frame waits for the clip's metadata (no layout shift)
   ============================================================================= */

export interface NextUp {
  title: string;
  href: string;
  kindLabel: string;
  /** only a next VIDEO autoplays after the countdown */
  isVideo: boolean;
  kind: "video" | "quiz" | "resource";
  locked: boolean;
  lockTitle?: string;
  lockBody?: string;
  lockHref?: string;
  lockCta?: string;
  /** instead of lockHref: a button action (e.g. switch to the student demo) */
  lockAction?: EndAction & { onClick: () => void };
  /** extra end-card actions shown beside the main lock CTA (e.g. Log in / Student demo) */
  lockExtra?: EndAction[];
}

export interface EndAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: IconName;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const COUNTDOWN = 5;

export function VideoPlayer({
  sources,
  poster,
  title,
  label,
  chapters = [],
  nominalSec,
  expectedSec = 0,
  captionsAvailable,
  captionLines,
  watermark,
  badge,
  credit,
  resumeAt = 0,
  completed,
  onSave,
  onReach90,
  next,
  handleRef,
  fullscreen: fs,
  onToggleFullscreen,
}: {
  /** stream URLs in order of preference; later ones are tried on load errors */
  sources: string[];
  poster: string;
  title: string;
  label: string;
  chapters?: { atSec: number; title: string }[];
  /** the lesson's real length; saved positions live on this timeline */
  nominalSec: number;
  /** known length of the sample clip, so the frame's footer renders before metadata */
  expectedSec?: number;
  captionsAvailable: boolean;
  captionLines: string[];
  watermark: string;
  badge?: string | null;
  credit: string;
  /** saved spot, on the lesson's timeline (seconds into the real lesson) */
  resumeAt?: number;
  completed: boolean;
  /** (position, length) on the lesson's timeline */
  onSave?: (pos: number, dur: number) => void;
  onReach90?: (pos: number, dur: number) => void;
  next: NextUp | null;
  handleRef: React.RefObject<PlayerHandle | null>;
  /** the stage host (owned by the shell, so it survives lesson hops) is fullscreen */
  fullscreen: boolean;
  onToggleFullscreen: (video: HTMLVideoElement | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const video = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const lastSave = useRef(0);
  const reached = useRef(false);
  const scrubRef = useRef<number | null>(null);
  /** were the controls showing when this tap began? (touch: first tap only reveals them) */
  const tapRevealOnly = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [controls, setControls] = useState(true);
  const [menu, setMenu] = useState(false);
  const [osd, setOsd] = useState<{ n: number; text: string } | null>(null);
  // A ?t= link (a note) wins over the saved spot. The chip below the frame on
  // phones is drawn from the first render, so nothing shifts once metadata lands.
  const willResume = resumeAt > 5 && !searchParams.has("t");
  const [resumeChip, setResumeChip] = useState(willResume);
  const [frameChip, setFrameChip] = useState(false);
  const skipResume = useRef(false);
  const [hover, setHover] = useState<{ r: number } | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [srcIndex, setSrcIndex] = useState(0);
  const [keysOpen, setKeysOpen] = useState(false);
  /** phones: the settings open as a bottom sheet (in-frame while fullscreen) */
  const phone = useIsPhone();
  const land = useIsShortLandscape();
  const sheetMenu = phone && !fs;
  /**
   * Phones: the frame pins under the top bar while playing (read the tabs while
   * watching). On pause it stays put until the next scroll, so the picture never
   * jumps away from under the finger that paused it.
   */
  const [holdPin, setHoldPin] = useState(false);
  /** double-tap seek feedback (touch): side, total seconds, retrigger key */
  const [ripple, setRipple] = useState<{
    side: "l" | "r";
    sec: number;
    n: number;
  } | null>(null);
  const lastTap = useRef<{
    t: number;
    x: number;
    side: "l" | "m" | "r";
  } | null>(null);
  const singleTap = useRef<number | undefined>(undefined);
  const src = sources[Math.min(srcIndex, sources.length - 1)];
  /**
   * The frame's own size, not the viewport's: a phone in landscape is 740px+
   * wide but its frame is only ~400px. `compact`: the control row drops ±10s and
   * the volume slider. `short`: the settings menu opens as an in-frame sheet.
   */
  // null until measured: the server HTML (and first paint) fall back to the
  // viewport's sm breakpoint, which matches the frame on most screens, so the
  // switch after hydration rarely moves anything
  const [frame, setFrame] = useState<{
    compact: boolean | null;
    short: boolean;
  }>({ compact: null, short: false });
  /** share of the frame on screen (autoplay-next waits when it is mostly off) */
  const inView = useRef(1);

  const [volume, setVolume] = usePref<number>("volume", 0.9);
  const [muted, setMuted] = usePref<boolean>("muted", false);
  const [rate, setRate] = usePref<number>("rate", 1);
  const [captionsOn, setCaptionsOn] = usePref<boolean>("captions", false);
  const [autoplay, setAutoplay] = usePref<boolean>("autoplay", true);
  const [keysOn, setKeysOn] = usePref<boolean>("shortcuts", true);

  const dur = duration || 0;
  /** what the footer and the clock show: the real length once known, the expected one before */
  const shownDur = dur || expectedSec;
  const scale = dur && nominalSec ? dur / nominalSec : 0;
  const scaledChapters = scale
    ? chapters.map((c) => ({ ...c, at: c.atSec * scale }))
    : [];

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const next = { compact: r.width < 520, short: r.height < 340 };
      setFrame((f) =>
        f.compact === next.compact && f.short === next.short ? f : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(
      ([e]) => {
        inView.current = e?.intersectionRatio ?? 1;
        // short landscape with the frame filling the screen: immersive, the
        // floating lesson bar and the top bar step aside (LearnShell)
        document.documentElement.toggleAttribute(
          "data-learn-immersive",
          inView.current >= 0.6 && window.matchMedia(LAND_QUERY).matches,
        );
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
      document.documentElement.removeAttribute("data-learn-immersive");
    };
  }, []);
  const { compact, short } = frame;

  /* ---------------------------------------------------------------- phone pin */
  const pinned = phone && !land && !fs && (playing || holdPin);
  useEffect(() => {
    if (!holdPin) return;
    const drop = () => setHoldPin(false);
    window.addEventListener("scroll", drop, { passive: true, once: true });
    return () => window.removeEventListener("scroll", drop);
  }, [holdPin]);
  // the lesson tabs pin below the frame while it is pinned (--learn-pin)
  useEffect(() => {
    const root = document.documentElement;
    if (pinned) root.style.setProperty("--learn-pin", "56.25vw");
    else root.style.removeProperty("--learn-pin");
    return () => {
      root.style.removeProperty("--learn-pin");
    };
  }, [pinned]);

  /* ---------------------------------------------------------------- short landscape */
  // A phone on its side: bring the (now full-height) frame to the top of the
  // screen, so the picture fills it. Only when the learner hasn't scrolled into
  // the page themselves.
  useEffect(() => {
    const mq = window.matchMedia(LAND_QUERY);
    const go = () => {
      const el = wrap.current;
      if (!mq.matches)
        document.documentElement.removeAttribute("data-learn-immersive");
      if (!mq.matches || !el || document.fullscreenElement) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > top + 8) return;
      requestAnimationFrame(() => window.scrollTo({ top, behavior: "auto" }));
    };
    go();
    mq.addEventListener("change", go);
    return () => mq.removeEventListener("change", go);
  }, []);
  /** classes for: not measured yet (viewport fallback) / compact frame / roomy frame */
  const fit = (before: string, small: string, roomy: string) =>
    compact === null ? before : compact ? small : roomy;

  /* ---------------------------------------------------------------- media sync */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);
  useEffect(() => {
    if (video.current) video.current.playbackRate = rate;
  }, [rate]);

  const paint = useCallback(() => {
    const v = video.current;
    const t = track.current;
    if (!v || !t) return;
    const d = v.duration || 0;
    const r = scrubRef.current ?? (d ? v.currentTime / d : 0);
    t.style.setProperty("--played", String(Math.max(0, Math.min(1, r))));
  }, []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, paint]);

  /** clip seconds -> lesson seconds (positions are stored on the lesson's timeline) */
  const toLesson = useCallback(
    (sec: number, clipDur: number) =>
      nominalSec && clipDur ? (sec / clipDur) * nominalSec : sec,
    [nominalSec],
  );
  const save = useCallback(() => {
    const v = video.current;
    if (!v || !onSave || !v.duration || v.currentTime < 1) return;
    lastSave.current = performance.now();
    onSave(toLesson(v.currentTime, v.duration), nominalSec || v.duration);
  }, [onSave, toLesson, nominalSec]);
  const saveRef = useRef(save);
  useLayoutEffect(() => {
    saveRef.current = save;
  });

  // save when leaving the page or the lesson
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") saveRef.current();
    };
    const onPageHide = () => saveRef.current();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      saveRef.current();
    };
  }, []);

  /* ---------------------------------------------------------------- actions */
  const flash = useCallback((text: string) => {
    setOsd((o) => ({ n: (o?.n ?? 0) + 1, text }));
  }, []);
  useEffect(() => {
    if (!osd) return;
    const t = window.setTimeout(() => setOsd(null), 700);
    return () => window.clearTimeout(t);
  }, [osd]);

  const play = useCallback(() => {
    const v = video.current;
    if (!v) return;
    setEnded(false);
    setCountdown(null);
    v.play().catch(() => {
      /* autoplay blocked or source failed: the error/poster state handles it */
    });
  }, []);
  const pause = useCallback(() => video.current?.pause(), []);
  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) play();
    else v.pause();
  }, [play]);
  const seekTo = useCallback(
    (sec: number) => {
      const v = video.current;
      if (!v || !v.duration) return;
      v.currentTime = Math.max(0, Math.min(v.duration - 0.25, sec));
      setTime(v.currentTime);
      setEnded(false);
      setCountdown(null);
      paint();
    },
    [paint],
  );
  const seekBy = useCallback(
    (d: number) => {
      const v = video.current;
      if (!v) return;
      seekTo(v.currentTime + d);
      flash(d > 0 ? `+${d}s` : `${d}s`);
    },
    [seekTo, flash],
  );
  const changeVolume = (v: number) => {
    const nv = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
    setVolume(nv);
    if (nv > 0 && muted) setMuted(false);
  };
  const toggleMute = () => {
    setMuted(!muted);
    flash(muted ? "Sound on" : "Muted");
  };
  const toggleCaptions = () => {
    if (!captionsAvailable) return flash("No captions yet");
    setCaptionsOn(!captionsOn);
    flash(captionsOn ? "Captions off" : "Captions on");
  };
  /** dialogs portal to <body>, outside the fullscreen element: leave fullscreen first */
  const openKeys = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setMenu(false);
    setKeysOpen(true);
  }, []);
  const toggleFs = useCallback(
    () => onToggleFullscreen(video.current),
    [onToggleFullscreen],
  );

  /**
   * Bring the player on screen and give it focus: a chapter jump, a note's time
   * chip or "Start over" changes the video, so the learner should see it.
   */
  const revealPlayer = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      const r = el.getBoundingClientRect();
      const fully = r.top >= 64 && r.bottom <= window.innerHeight;
      if (!fully) {
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        el.scrollIntoView({
          block: "start",
          behavior: reduce ? "auto" : "smooth",
        });
      }
    }
    el.focus({ preventScroll: true });
  }, []);

  useImperativeHandle(
    handleRef,
    () => ({
      getTime: () => video.current?.currentTime ?? 0,
      getDuration: () => video.current?.duration || 0,
      seek: seekTo,
      play,
      pause,
      reveal: revealPlayer,
    }),
    [seekTo, play, pause, revealPlayer],
  );

  /* ---------------------------------------------------------------- controls visibility */
  const poke = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControls(false), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);
  const showControls =
    controls || !playing || menu || scrub !== null || ended || error;
  const barLive = showControls && !ended && !error;

  /* ---------------------------------------------------------------- menu */
  useEffect(() => {
    // the phone sheet manages its own focus and dismissal
    if (!menu || sheetMenu) return;
    requestAnimationFrame(() =>
      menuRef.current
        ?.querySelector<HTMLElement>('[aria-checked="true"]')
        ?.focus(),
    );
    const onDown = (e: PointerEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !menuBtn.current?.contains(e.target as Node)
      )
        setMenu(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [menu, sheetMenu]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ??
        [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.stopPropagation();
      setMenu(false);
      menuBtn.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") setMenu(false);
  };

  /* ---------------------------------------------------------------- keyboard */
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (
      t?.closest(
        "input, textarea, select, [contenteditable=true], [role=dialog], [role=menu]",
      )
    )
      return;
    if (document.querySelector('[aria-modal="true"]')) return;
    const inPlayer = !!t && !!wrap.current?.contains(t);
    // Only while the player, or nothing in particular (the page itself), has
    // focus: a key pressed on a link, tab or button elsewhere is that control's.
    const onPage =
      !t ||
      t === document.body ||
      t === document.documentElement ||
      t.id === "main";
    if (!inPlayer && !onPage) return;
    const onControl = !!t?.closest("button, a, [role=slider], [role=tab]");
    const v = video.current;
    if (!v) return;
    const k = e.key;
    // single-character shortcuts can be switched off (Playback settings)
    if (!keysOn && k.length === 1 && k !== " ") return;
    if ((k === " " || k === "Spacebar") && !onControl) {
      e.preventDefault();
      toggle();
    } else if (k === "k" || k === "K") toggle();
    else if (
      (k === "ArrowLeft" || k === "ArrowRight") &&
      !t?.closest("[role=slider], [role=tab]")
    ) {
      e.preventDefault();
      seekBy(k === "ArrowLeft" ? -5 : 5);
    } else if (k === "j" || k === "J") seekBy(-10);
    else if (k === "l" || k === "L") seekBy(10);
    else if (
      (k === "ArrowUp" || k === "ArrowDown") &&
      inPlayer &&
      !t?.closest("[role=slider]")
    ) {
      e.preventDefault();
      const nv = Math.max(
        0,
        Math.min(1, v.volume + (k === "ArrowUp" ? 0.1 : -0.1)),
      );
      changeVolume(nv);
      flash(`Volume ${Math.round(nv * 100)}%`);
    } else if (k === "f" || k === "F") toggleFs();
    else if (k === "m" || k === "M") toggleMute();
    else if (k === "c" || k === "C") toggleCaptions();
    else if (k === "?") {
      openKeys();
      return;
    } else if (/^[0-9]$/.test(k) && v.duration)
      seekTo((Number(k) / 10) * v.duration);
    else return;
    poke();
  };
  const keyRef = useRef(onKey);
  useLayoutEffect(() => {
    keyRef.current = onKey;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* ---------------------------------------------------------------- autoplay next */
  const [launching, setLaunching] = useState(false);
  const goNext = useCallback(() => {
    if (!next || next.locked) return;
    if (next.isVideo) requestAutoplay(next.href);
    setLaunching(true);
    router.push(next.href);
  }, [next, router]);
  /**
   * The learner is busy elsewhere: typing in a box, in a dialog, or scrolled
   * mostly away from the frame. Autoplay-next then waits on the end card
   * (Continue / Replay) instead of navigating away from a half-written question.
   */
  const busyElsewhere = useCallback(() => {
    const a = document.activeElement as HTMLElement | null;
    if (
      a &&
      !wrap.current?.contains(a) &&
      a.closest("input, textarea, select, [contenteditable=true]")
    )
      return true;
    if (document.querySelector('[aria-modal="true"], [role="dialog"]'))
      return true;
    if (!document.fullscreenElement && inView.current < 0.5) return true;
    return false;
  }, []);
  // 5, 4, 3, 2, 1 -> go (never renders a "0" state)
  useEffect(() => {
    if (countdown === null) return;
    const t = window.setTimeout(() => {
      if (busyElsewhere()) {
        setCountdown(null);
        return;
      }
      if (countdown <= 1) {
        setCountdown(null);
        goNext();
      } else setCountdown(countdown - 1);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [countdown, goNext, busyElsewhere]);
  // typing somewhere (Q&A, a reply, a note) stops a running countdown at once
  useEffect(() => {
    if (countdown === null) return;
    const onFocus = () => {
      if (busyElsewhere()) setCountdown(null);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [countdown, busyElsewhere]);

  /* ---------------------------------------------------------------- load errors */
  // Fall through to the next stream before giving up; the position is restored
  // on the new source's loadedmetadata (resumeAt or where the learner was).
  const fallbackFrom = useRef(0);
  const onLoadError = () => {
    const v = video.current;
    // idempotent: the same failure can be reported twice (event + mount replay)
    const failed = v ? sources.indexOf(v.getAttribute("src") ?? "") : -1;
    if (failed >= 0 && failed < srcIndex) return;
    if (srcIndex < sources.length - 1) {
      fallbackFrom.current = v && v.currentTime > 1 ? v.currentTime : 0;
      setSrcIndex(srcIndex + 1);
      setWaiting(true);
      return;
    }
    setError(true);
    setWaiting(false);
    setPlaying(false);
  };
  const errorRef = useRef(onLoadError);
  useLayoutEffect(() => {
    errorRef.current = onLoadError;
  });

  /* ---------------------------------------------------------------- 90% rule */
  const check90 = () => {
    const v = video.current;
    if (
      !v ||
      !v.duration ||
      reached.current ||
      completed ||
      // small tolerance: a seek to exactly 90% can land a few ms short
      v.currentTime / v.duration < 0.899
    )
      return false;
    reached.current = true;
    lastSave.current = performance.now();
    // toasts render outside the fullscreen element, so confirm it on screen too
    if (document.fullscreenElement && onReach90) flash("Lesson complete");
    onReach90?.(
      toLesson(Math.max(v.currentTime, v.duration * 0.9 + 0.05), v.duration),
      nominalSec || v.duration,
    );
    return true;
  };

  /* ---------------------------------------------------------------- media events */
  const updateBuffered = () => {
    const v = video.current;
    if (!v || !v.duration) return;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++)
      if (v.buffered.start(i) <= v.currentTime + 0.5)
        end = Math.max(end, v.buffered.end(i));
    setBuffered(end / v.duration);
  };
  const onLoadedMetadata = () => {
    const v = video.current;
    if (!v) return;
    setDuration(v.duration);
    v.volume = volume;
    v.muted = muted;
    v.playbackRate = rate;
    const carry = fallbackFrom.current;
    fallbackFrom.current = 0;
    const startAt = takeStartParam(v.duration, nominalSec);
    if (carry > 0 && carry < v.duration - 1) {
      v.currentTime = carry;
      setTime(carry);
    } else if (startAt !== null) {
      // ?t= from a note in another lesson: wins over the saved resume point
      v.currentTime = startAt;
      setTime(startAt);
      flash(`Your note at ${formatDuration(startAt, "clock")}`);
    } else if (willResume && !skipResume.current) {
      // the saved spot is on the lesson's timeline: scale it onto the clip
      const at = resumeClipStart(resumeAt, v.duration, nominalSec);
      if (at !== null) {
        v.currentTime = at;
        setTime(at);
        setFrameChip(true);
        window.setTimeout(() => setFrameChip(false), 7000);
      } else setResumeChip(false);
    }
    paint();
    if (consumeAutoplay(pathname)) play();
  };
  const onTimeUpdate = () => {
    const v = video.current;
    if (!v) return;
    setTime(v.currentTime);
    updateBuffered();
    if (!playing) paint();
    if (
      !check90() &&
      performance.now() - lastSave.current > 10_000 &&
      !v.paused
    )
      save();
  };
  const onEnded = () => {
    setPlaying(false);
    setEnded(true);
    save();
    // only a next video counts down; a test or a download waits for the learner
    if (next && !next.locked && next.isVideo && autoplay && !busyElsewhere())
      setCountdown(COUNTDOWN);
  };

  // The <video> starts loading while the HTML streams in, so its first events can
  // fire before React hydrates and attaches handlers: replay them once mounted.
  const metaRef = useRef(onLoadedMetadata);
  useLayoutEffect(() => {
    metaRef.current = onLoadedMetadata;
  });
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    queueMicrotask(() => {
      if (v.error) {
        errorRef.current();
        return;
      }
      if (v.readyState >= 1) metaRef.current();
    });
  }, []);

  /* ---------------------------------------------------------------- seek bar */
  const ratioAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || !r.width) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };
  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dur) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = ratioAt(e.clientX);
    scrubRef.current = r;
    setScrub(r);
    paint();
  };
  const onTrackMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = ratioAt(e.clientX);
    setHover({ r });
    if (scrubRef.current !== null) {
      scrubRef.current = r;
      setScrub(r);
      paint();
    }
  };
  const onTrackUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubRef.current === null) return;
    const r = ratioAt(e.clientX);
    scrubRef.current = null;
    setScrub(null);
    seekTo(r * dur);
  };
  const onTrackKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
      return;
    }
    const map: Record<string, number> = {
      ArrowLeft: -5,
      ArrowRight: 5,
      ArrowDown: -5,
      ArrowUp: 5,
      PageDown: -dur * 0.1,
      PageUp: dur * 0.1,
    };
    if (e.key in map) {
      e.preventDefault();
      seekTo(time + map[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      seekTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seekTo(dur - 1);
    }
  };
  const hoverT = hover ? hover.r * dur : 0;
  const hoverChapter = hover
    ? [...scaledChapters].reverse().find((c) => c.at <= hoverT)
    : undefined;
  const shownTime = scrub !== null ? scrub * dur : time;

  /* ---------------------------------------------------------------- touch taps */
  /**
   * Touch: one tap shows the controls (or plays / pauses once they're up);
   * a double tap on the left or right third jumps 10s back or forward, and
   * every further quick tap on that side adds another 10s (like a video app).
   * Single taps on the side thirds wait a beat to see whether a second follows.
   */
  const rippleAt = useRef(0);
  useEffect(() => () => window.clearTimeout(singleTap.current), []);
  useEffect(() => {
    if (!ripple) return;
    const t = window.setTimeout(() => setRipple(null), 700);
    return () => window.clearTimeout(t);
  }, [ripple]);
  const onTouchTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = box.width ? (e.clientX - box.left) / box.width : 0.5;
    const side = x < 1 / 3 ? "l" : x > 2 / 3 ? "r" : "m";
    const now = performance.now();
    const prev = lastTap.current;
    lastTap.current = { t: now, x, side };
    const reveal = tapRevealOnly.current;
    tapRevealOnly.current = false;
    const streak =
      side !== "m" && ripple?.side === side && now - rippleAt.current < 700;
    const double = side !== "m" && prev?.side === side && now - prev.t < 320;
    const v = video.current;
    if ((streak || double) && v && dur && !error && !ended) {
      window.clearTimeout(singleTap.current);
      singleTap.current = undefined;
      const d = side === "l" ? -10 : 10;
      seekTo(v.currentTime + d);
      rippleAt.current = now;
      setRipple((r) => ({
        side: side as "l" | "r",
        sec: streak && r ? r.sec + 10 : 10,
        n: (r?.n ?? 0) + 1,
      }));
      poke();
      return;
    }
    const act = () => {
      singleTap.current = undefined;
      if (reveal) return;
      if (!error && !ended) toggle();
    };
    window.clearTimeout(singleTap.current);
    if (side === "m" || !dur) act();
    else singleTap.current = window.setTimeout(act, 280);
  };

  /* ---------------------------------------------------------------- derived overlays */
  // crossfades between four fixed spots (opacity only: never a layout shift)
  const wmSpot = Math.floor(time / 20) % 4;
  const caption =
    captionsOn && captionsAvailable && started && captionLines.length
      ? captionLines[Math.floor(time / 5) % captionLines.length]
      : null;

  const restart = () => {
    skipResume.current = true;
    seekTo(0);
    setResumeChip(false);
    setFrameChip(false);
    // the chip unmounts with focus on it: keep the learner's place on the player
    revealPlayer();
  };

  /**
   * Playback settings. A popover above the gear on roomy frames; on short ones
   * (phones, landscape) an in-frame sheet that scrolls, with the speeds in one
   * row, so every option is reachable by touch. It stays inside the frame, so it
   * also works in fullscreen.
   */
  const renderMenu = (sheet: boolean) => (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Playback settings"
      onKeyDown={onMenuKey}
      data-lenis-prevent
      className={clsx(
        "app-fade bg-white text-ink",
        sheet
          ? "pointer-events-auto absolute inset-2 z-[9] overflow-y-auto overscroll-contain rounded-[18px] p-1.5 shadow-lift"
          : "absolute right-0 bottom-[calc(100%+8px)] z-10 w-56 rounded-[18px] p-1.5 shadow-lift",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate px-3 pt-1.5 pb-1 text-[11.5px] font-bold tracking-[0.04em] text-ink/65 uppercase">
          Playback speed
        </p>
        {sheet && (
          <button
            type="button"
            role="menuitem"
            aria-label="Shortcut list"
            title="Shortcut list"
            onClick={openKeys}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue hf:bg-butter"
          >
            Keys
            <kbd className="grid h-6 min-w-6 place-items-center rounded-[7px] bg-ink/[0.07] px-1.5 font-sans text-[12px] font-bold">
              ?
            </kbd>
          </button>
        )}
        {sheet && (
          <button
            type="button"
            role="menuitem"
            aria-label="Close playback settings"
            onClick={() => {
              setMenu(false);
              menuBtn.current?.focus({ preventScroll: true });
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue hf:bg-ink/[0.06]"
          >
            <Icon name="x" className="size-4" />
          </button>
        )}
      </div>
      <div
        className={clsx(
          "grid gap-1 px-1 pb-1",
          sheet ? "grid-cols-6" : "grid-cols-3",
        )}
      >
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            role="menuitemradio"
            aria-checked={rate === r}
            onClick={() => {
              setRate(r);
              flash(`${r}x speed`);
            }}
            className={clsx(
              "h-9 rounded-[12px] font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-blue",
              sheet ? "text-[12.5px]" : "text-[13.5px]",
              rate === r ? "bg-ink text-cream" : "hf:bg-butter",
            )}
          >
            {r}x
          </button>
        ))}
      </div>
      <div role="separator" className="my-1 h-px bg-ink/[0.07]" />
      <div className={clsx(sheet && "grid grid-cols-2 gap-x-1")}>
        <MenuSwitch
          checked={autoplay}
          onToggle={() => setAutoplay(!autoplay)}
          label={sheet ? "Autoplay" : "Autoplay next"}
        />
        <MenuSwitch
          checked={keysOn}
          onToggle={() => {
            setKeysOn(!keysOn);
            flash(keysOn ? "Shortcuts off" : "Shortcuts on");
          }}
          label={sheet ? "Shortcuts" : "Keyboard shortcuts"}
        />
      </div>
      {!sheet && (
        <button
          type="button"
          role="menuitem"
          onClick={openKeys}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-[12px] px-3 text-[14px] font-semibold outline-none focus-visible:bg-butter hf:bg-butter"
        >
          Shortcut list
          <kbd className="grid h-6 min-w-6 place-items-center rounded-[7px] bg-ink/[0.07] px-1.5 font-sans text-[12px] font-bold">
            ?
          </kbd>
        </button>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={wrap}
        className={clsx(
          "group/player relative w-full scroll-mt-20 overflow-hidden bg-ink text-white outline-none select-none",
          fs
            ? "h-full rounded-none"
            : [
                "aspect-video rounded-card-lg shadow-photo",
                // phones: edge to edge, straight under the top bar
                "max-sm:-mx-3 max-sm:-mt-2 max-sm:w-[calc(100%+1.5rem)] max-sm:max-w-none max-sm:scroll-mt-[calc(3.5rem+var(--sat))] max-sm:rounded-none max-sm:shadow-none",
                // short landscape: the whole screen, letterboxed
                "land:mx-[calc(50%-50vw)] land:mt-0 land:aspect-auto land:h-dvh land:w-screen land:max-w-none land:scroll-mt-0 land:rounded-none land:shadow-none",
                pinned &&
                  "max-sm:sticky max-sm:top-[calc(3.5rem+var(--sat))] max-sm:z-20",
              ],
          !showControls && "cursor-none",
        )}
        onPointerMove={poke}
        onPointerDown={poke}
        onFocus={poke}
        onContextMenu={(e) => e.preventDefault()}
        role="region"
        aria-label={`Video player: ${title}`}
        // a click on the picture focuses the player, so its shortcuts apply
        tabIndex={-1}
      >
        <video
          ref={video}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          className="absolute inset-0 size-full bg-black object-contain"
          onLoadedMetadata={onLoadedMetadata}
          onDurationChange={() =>
            video.current && setDuration(video.current.duration)
          }
          onTimeUpdate={onTimeUpdate}
          onProgress={updateBuffered}
          onPlay={() => {
            setPlaying(true);
            setHoldPin(false);
            setStarted(true);
            setEnded(false);
            setError(false);
            poke();
          }}
          onPause={() => {
            setPlaying(false);
            if (playing) setHoldPin(true);
            save();
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onSeeked={() => {
            paint();
            if (!check90()) save();
          }}
          onEnded={onEnded}
          onError={onLoadError}
        />

        {/* click / tap surface */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          // runs before the wrapper's poke(): remember whether the controls were
          // hidden when the finger landed (by pointerup they are already shown)
          onPointerDown={(e) => {
            tapRevealOnly.current = e.pointerType === "touch" && !showControls;
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "touch") return onTouchTap(e);
            // touch on a playing video with hidden controls: just reveal them
            if (tapRevealOnly.current) {
              tapRevealOnly.current = false;
              return;
            }
            if (!error && !ended) toggle();
          }}
          onDoubleClick={() => {
            // touch double-taps seek instead (see onTouchTap)
            if (lastTap.current && performance.now() - lastTap.current.t < 600)
              return;
            toggleFs();
          }}
        />

        {/* double-tap seek ripple (touch) */}
        {ripple && (
          <span
            key={ripple.n}
            aria-hidden
            className={clsx(
              "app-fade pointer-events-none absolute inset-y-0 z-[5] grid w-[38%] place-items-center bg-white/[0.12]",
              ripple.side === "l"
                ? "left-0 rounded-r-[50%]"
                : "right-0 rounded-l-[50%]",
            )}
          >
            <span className="flex flex-col items-center gap-1 text-[14px] font-bold tabular-nums">
              <Glyph
                name={ripple.side === "l" ? "back10" : "fwd10"}
                className="size-8"
              />
              {ripple.side === "l" ? "−" : "+"}
              {ripple.sec}s
            </span>
          </span>
        )}

        {/* watermark (content protection idea): four fixed spots that crossfade,
            so a seek or resume never moves anything. Phones get a smaller face
            and two lines rather than a truncated address. */}
        {WM_SPOTS.map((spot, i) => (
          <span
            key={spot}
            aria-hidden
            className={clsx(
              "pointer-events-none absolute z-[2] line-clamp-2 max-w-[46%] text-[9px] leading-tight font-semibold tracking-wide break-all text-white/25 transition-opacity duration-1000 sm:max-w-[44%] sm:text-[12px]",
              spot,
              wmSpot === i ? "opacity-100" : "opacity-0",
            )}
          >
            {watermark}
          </span>
        ))}

        {/* top gradient: label, title, sample-footage tag */}
        <div
          className={clsx(
            "pointer-events-none absolute inset-x-0 top-0 z-[3] bg-gradient-to-b from-black/65 to-transparent px-4 pt-3.5 pb-10 transition-opacity duration-300 sm:px-5 sm:pt-4",
            showControls || !started ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] uppercase backdrop-blur-sm">
              {label}
            </span>
            {badge && (
              <span
                className={clsx(
                  "rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-forest",
                  fit("max-sm:hidden", "hidden", ""),
                )}
              >
                {badge}
              </span>
            )}
            <span
              className="pointer-events-auto rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80"
              title={credit}
            >
              Sample footage
            </span>
          </div>
          <p
            className={clsx(
              "mt-2 line-clamp-1 max-w-[80%] text-[17px] font-bold",
              fit("max-sm:hidden", "hidden", ""),
            )}
          >
            {title}
          </p>
        </div>

        {/* big play button */}
        {/* hidden while the settings menu is open, so it never covers it */}
        {!playing && !ended && !error && !waiting && !menu && (
          <button
            type="button"
            onClick={play}
            aria-label={started ? "Play" : `Play ${title}`}
            className={clsx(
              "tap app-fade absolute left-1/2 z-[8] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-flame text-white shadow-lift transition-[scale] duration-300 ease-spring hf:scale-110",
              fit(
                "top-[42%] size-14 sm:top-1/2 sm:size-20",
                "top-[42%] size-14",
                "top-1/2 size-20",
              ),
            )}
          >
            <Glyph
              name="play"
              className={clsx(
                "ml-1",
                fit("size-7 sm:size-9", "size-7", "size-9"),
              )}
            />
          </button>
        )}

        {/* buffering */}
        {waiting && !error && (
          <span
            role="status"
            aria-label="Loading video"
            className="absolute top-1/2 left-1/2 z-[4] size-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-white/25 border-t-white"
          />
        )}

        {/* on-screen feedback */}
        {osd && (
          <span
            key={osd.n}
            aria-live="polite"
            className="app-fade pointer-events-none absolute top-[22%] left-1/2 z-[5] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-[14px] font-bold"
          >
            {osd.text}
          </span>
        )}

        {/* resumed chip (inside the frame from sm up) */}
        {frameChip && resumeChip && !ended && (
          <ResumeChip
            at={resumeAt}
            onRestart={restart}
            className="absolute bottom-[92px] left-4 z-[6] max-sm:hidden"
          />
        )}

        {/* captions (placeholder text until real caption files exist) */}
        {caption && (
          <p
            className={clsx(
              "pointer-events-none absolute inset-x-0 z-[3] mx-auto w-fit max-w-[86%] rounded-md bg-black/75 px-3 py-1.5 text-center text-[14px] leading-snug font-semibold transition-[bottom] sm:text-[17px]",
              showControls ? "bottom-[88px] sm:bottom-24" : "bottom-6",
              // phones: the big play button covers the middle while paused
              !playing && "max-sm:hidden",
            )}
          >
            <span className="mb-0.5 block text-[10px] font-bold tracking-[0.06em] text-white/60 uppercase">
              Sample captions
            </span>
            {caption}
          </p>
        )}

        {/* error state */}
        {error && (
          <div
            className="absolute inset-0 z-[7] grid place-items-center bg-cover bg-center p-4"
            style={{
              backgroundImage: `linear-gradient(rgb(22 22 22 / .72), rgb(22 22 22 / .82)), url(${poster})`,
            }}
          >
            <div className="max-w-sm text-center" role="alert">
              <p className="t-app-h2">This video didn&apos;t load.</p>
              <p className="mt-2 t-small text-white/75">
                The sample clip couldn&apos;t be reached. Check your connection
                and try again, or keep going with the next item.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  size="sm"
                  variant="sun"
                  icon="refresh"
                  onClick={() => {
                    setError(false);
                    if (srcIndex !== 0) setSrcIndex(0);
                    else video.current?.load();
                  }}
                >
                  Try again
                </Button>
                {next && !next.locked && (
                  <Button
                    size="sm"
                    variant="secondary"
                    href={next.href}
                    iconRight="arrow-right"
                  >
                    Skip to next
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* end card */}
        {ended && !error && (
          <div className="app-fade absolute inset-0 z-[7] grid place-items-center bg-ink/80 p-4 backdrop-blur-[2px] max-[419px]:p-3">
            <EndCard
              next={next}
              countdown={countdown}
              launching={launching}
              onPlayNow={goNext}
              onCancel={() => setCountdown(null)}
              onReplay={() => {
                seekTo(0);
                play();
              }}
            />
          </div>
        )}

        {/* settings sheet on short frames (above the bar and the big Play) */}
        {menu && short && !sheetMenu && renderMenu(true)}

        {/* control bar */}
        {/* The wrapper (and its gradient) never takes pointer events, so taps on the
            picture fall through to the tap surface; only the seek row and the
            buttons row are interactive, and only while the bar is shown. */}
        <div
          className={clsx(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[6] bg-gradient-to-t from-black/80 via-black/45 to-transparent transition-opacity duration-300",
            fit(
              "px-3 pt-6 pb-2.5 sm:px-4 sm:pt-10 sm:pb-3",
              "px-3 pt-6 pb-2.5",
              "px-4 pt-10 pb-3",
            ),
            barLive ? "opacity-100" : "opacity-0",
          )}
        >
          {/* seek */}
          <div
            ref={track}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(shownTime)}
            aria-valuetext={`${formatDuration(shownTime, "clock")} of ${formatDuration(dur, "clock")}`}
            onPointerDown={onTrackDown}
            onPointerMove={onTrackMove}
            onPointerUp={onTrackUp}
            onPointerCancel={() => {
              scrubRef.current = null;
              setScrub(null);
            }}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onTrackKey}
            className={clsx(
              "group/seek relative flex h-5 cursor-pointer touch-none items-center rounded-full focus-visible:outline-offset-2 focus-visible:outline-sun coarse:h-8",
              barLive && "pointer-events-auto",
            )}
            style={{ "--played": 0 } as React.CSSProperties}
          >
            <div
              className={clsx(
                "relative h-1.5 w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-150 group-hover/seek:h-2",
                // touch: a 4px track in a 32px zone, 6px while dragging
                scrub !== null ? "coarse:h-1.5" : "coarse:h-1",
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-white/35"
                style={{ width: `${buffered * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-flame"
                style={{ width: "calc(var(--played) * 100%)" }}
              />
              {scaledChapters.slice(1).map((c) => (
                <span
                  key={c.at}
                  aria-hidden
                  className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-ink/70"
                  style={{ left: `${(c.at / dur) * 100}%` }}
                />
              ))}
            </div>
            {/* the thumb rides a full-width layer moved by transform, so a
                seek (or the resume jump) is never a layout shift */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ transform: "translateX(calc(var(--played) * 100%))" }}
            >
              <span className="absolute top-1/2 left-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-[scale] group-hover/seek:scale-110 coarse:size-4" />
            </span>
            {hover && dur > 0 && (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-[calc(100%+8px)] -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold whitespace-nowrap text-ink shadow"
                style={{
                  left: `clamp(48px, ${hover.r * 100}%, calc(100% - 48px))`,
                }}
              >
                {hoverChapter ? `${hoverChapter.title} · ` : ""}
                {formatDuration(hoverT, "clock")}
              </span>
            )}
          </div>

          {/* buttons */}
          <div
            className={clsx(
              "mt-1 flex min-w-0 items-center",
              fit("gap-0.5 sm:gap-1", "gap-0.5", "gap-1"),
              barLive && "pointer-events-auto",
            )}
          >
            <CtrlButton
              label={playing ? "Pause (K)" : "Play (K)"}
              onClick={toggle}
            >
              <Glyph name={playing ? "pause" : "play"} />
            </CtrlButton>
            <CtrlButton
              label="Back 10 seconds (J)"
              onClick={() => seekBy(-10)}
              className={fit("max-sm:hidden", "hidden", "")}
            >
              <Glyph name="back10" />
            </CtrlButton>
            <CtrlButton
              label="Forward 10 seconds (L)"
              onClick={() => seekBy(10)}
              className={fit("max-sm:hidden", "hidden", "")}
            >
              <Glyph name="fwd10" />
            </CtrlButton>
            <div className="group/vol flex items-center">
              <CtrlButton
                label={muted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
                onClick={toggleMute}
              >
                <Glyph
                  name={
                    muted || volume === 0
                      ? "mute"
                      : volume < 0.5
                        ? "vol-low"
                        : "vol"
                  }
                />
              </CtrlButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
                className={clsx(
                  "mr-1 h-1 w-20 cursor-pointer accent-white",
                  fit("hidden sm:block", "hidden", "block"),
                )}
              />
            </div>
            <span
              className={clsx(
                "ml-1 font-semibold whitespace-nowrap tabular-nums",
                fit(
                  "text-[12.5px] sm:text-[13px]",
                  "text-[12.5px]",
                  "text-[13px]",
                ),
              )}
            >
              {formatDuration(shownTime, "clock")}{" "}
              <span className="text-white/55">
                / {formatDuration(shownDur, "clock")}
              </span>
            </span>
            <span className="flex-1" />
            <CtrlButton
              label={
                captionsAvailable
                  ? captionsOn
                    ? "Turn captions off (C)"
                    : "Turn captions on (C)"
                  : "No captions for this lesson yet"
              }
              onClick={toggleCaptions}
              pressed={captionsAvailable ? captionsOn : undefined}
              className={clsx(!captionsAvailable && "opacity-45")}
            >
              <Glyph name="cc" />
              {captionsOn && captionsAvailable && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-flame"
                />
              )}
            </CtrlButton>
            <div className="relative">
              <button
                ref={menuBtn}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label={`Playback settings, speed ${rate}x`}
                onClick={() => setMenu((m) => !m)}
                className="tap flex h-10 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold hf:bg-white/15 phone-s:px-2 coarse:h-11"
              >
                <Glyph name="cog" className="size-5" />
                <span className="tabular-nums">{rate}x</span>
              </button>
              {menu && !short && !sheetMenu && renderMenu(false)}
            </div>
            <CtrlButton
              label={fs ? "Exit full screen (F)" : "Full screen (F)"}
              onClick={toggleFs}
            >
              <Glyph name={fs ? "fs-exit" : "fs"} />
            </CtrlButton>
          </div>
        </div>
      </div>
      {/* phones: below the frame, from the first render (it goes once playback
          starts, which is always the learner's own tap) */}
      {resumeChip && !started && !ended && !fs && (
        <ResumeChip
          at={resumeAt}
          onRestart={restart}
          className="mt-2 w-fit sm:hidden"
        />
      )}
      {shownDur > 0 && nominalSec - shownDur > 5 && !fs && (
        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-snug font-semibold text-ink/65">
          <Icon name="info" className="mt-px size-3.5 shrink-0" />
          <span>
            Sample clip ({formatDuration(shownDur, "clock")}), shorter than the
            real {formatDuration(nominalSec, "clock")} lesson.
            {scaledNote(chapters.length > 0, !!onSave && willResume)}
          </span>
        </p>
      )}
      {sheetMenu && (
        <BottomSheet
          open={menu}
          onClose={() => setMenu(false)}
          title="Playback settings"
        >
          <p
            id="speed-label"
            className="text-[13px] font-bold tracking-[0.04em] text-ink/65 uppercase"
          >
            Speed
          </p>
          <div
            role="radiogroup"
            aria-labelledby="speed-label"
            className="mt-2 grid grid-cols-3 gap-2"
          >
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rate === r}
                onClick={() => {
                  setRate(r);
                  flash(`${r}x speed`);
                }}
                className={clsx(
                  "tap h-12 rounded-[14px] text-[16px] font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-blue",
                  rate === r ? "bg-ink text-cream" : "bg-cream",
                )}
              >
                {r === 1 ? "Normal" : `${r}x`}
              </button>
            ))}
          </div>
          <div className="mt-4 divide-y divide-ink/[0.07] border-t border-ink/[0.07]">
            <Switch
              className="py-3"
              checked={captionsAvailable && captionsOn}
              disabled={!captionsAvailable}
              onChange={() => toggleCaptions()}
              label="Captions"
              description={
                captionsAvailable
                  ? "Sample captions for now."
                  : "Not ready for this lesson yet."
              }
            />
            <Switch
              className="py-3"
              checked={autoplay}
              onChange={(v) => setAutoplay(v)}
              label="Autoplay next lesson"
              description="Counts down 5 seconds at the end of a video."
            />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-ink/65">
            Tip: double-tap the left or right of the video to jump 10 seconds.
          </p>
        </BottomSheet>
      )}
      <Modal
        open={keysOpen}
        onClose={() => setKeysOpen(false)}
        title="Keyboard shortcuts"
        description={
          keysOn
            ? "They work once you click the video (or the page around it), never while you type in a box. Switch the letter keys off in Playback settings."
            : "Letter and number keys are off. Turn them on in Playback settings; Space and the arrows still work while the player has focus."
        }
        size="sm"
      >
        <ShortcutList />
      </Modal>
    </>
  );
}

/**
 * `?t=<sec>` (a note's timestamp, linked from another lesson): read once, then
 * dropped from the URL so a reload resumes normally. A time past the end of the
 * (shorter) sample clip is scaled like the chapter jumps.
 */
function takeStartParam(dur: number, nominal: number): number | null {
  if (typeof window === "undefined" || !dur) return null;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("t");
  if (raw === null) return null;
  url.searchParams.delete("t");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  const t = Number(raw);
  if (!Number.isFinite(t) || t < 0) return null;
  const at = t < dur - 1 ? t : nominal ? (t / nominal) * dur : 0;
  return Math.max(0, Math.min(at, dur - 2));
}

/**
 * Where a saved spot (seconds into the real lesson) lands on the sample clip:
 * scaled like the chapter jumps, and never in the last 5 seconds. null when it
 * is too close to the start to be worth a jump.
 */
function resumeClipStart(
  lessonSec: number,
  clipDur: number,
  nominal: number,
): number | null {
  if (!clipDur || lessonSec <= 5) return null;
  const at = nominal ? (lessonSec / nominal) * clipDur : lessonSec;
  const clamped = Math.max(0, Math.min(at, clipDur - 5));
  return clamped >= 1 ? clamped : null;
}

/** " Chapter jumps and your saved spot are scaled to fit it." and friends */
function scaledNote(chapters: boolean, tracked: boolean) {
  if (chapters && tracked)
    return " Chapter jumps and your saved spot are scaled to fit it.";
  if (chapters) return " Chapter jumps are scaled to fit it.";
  if (tracked) return " Your saved spot is scaled to fit it.";
  return null;
}

/* Four watermark spots, clear of the label chips (top-left), the play button
   (centre) and the seek row. Phones: the upper half only, since the bar is
   ~75px of a ~200px frame; from sm up the frame is tall enough for the corners. */
const WM_SPOTS = [
  "top-[22%] right-[4%] text-right sm:top-[30%] sm:right-[5%]",
  "bottom-[54%] left-[4%] sm:bottom-[34%] sm:left-[5%]",
  "top-[22%] left-[4%] sm:top-[34%] sm:left-[5%]",
  "right-[4%] bottom-[54%] text-right sm:right-[5%] sm:bottom-[34%]",
];

function MenuSwitch({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex h-10 w-full items-center justify-between gap-3 rounded-[12px] px-3 text-[14px] font-semibold outline-none focus-visible:bg-butter hf:bg-butter"
    >
      {label}
      <span
        aria-hidden
        className={clsx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-green" : "bg-ink/20",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function ResumeChip({
  at,
  onRestart,
  className,
}: {
  at: number;
  onRestart: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "app-enter flex items-center gap-2 rounded-full bg-white py-1.5 pr-1.5 pl-3.5 text-[13px] font-semibold text-ink shadow-lift",
        className,
      )}
    >
      Picked up at {formatDuration(at, "clock")}
      <button
        type="button"
        onClick={onRestart}
        className="tap hit rounded-full bg-ink/[0.07] px-2.5 py-1 font-bold hf:bg-butter"
      >
        Start over
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------------------- end card */
/* The frame is only ~167-190px tall on 320-360px phones, so below 420px every
   card goes compact: smaller ring, one-line titles, small buttons. */
const END_LINK =
  "tap hit inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[13.5px] font-bold text-white underline-offset-2 hf:bg-white/10 hf:underline max-[419px]:h-8 max-[419px]:text-[13px]";
const END_BTN_XS =
  "hit max-[419px]:h-8 max-[419px]:gap-1 max-[419px]:px-3 max-[419px]:text-[13px]";

function EndCard({
  next,
  countdown,
  launching,
  onPlayNow,
  onCancel,
  onReplay,
}: {
  next: NextUp | null;
  countdown: number | null;
  launching: boolean;
  onPlayNow: () => void;
  onCancel: () => void;
  onReplay: () => void;
}) {
  if (next?.locked) {
    const extra = next.lockExtra ?? [];
    return (
      <div className="w-full max-w-md text-center">
        <p className="t-micro text-sun uppercase">
          {next.lockTitle ?? "That was the free preview"}
        </p>
        {/* Phones get a compact card: the 16:9 frame is only ~200px tall there. */}
        <p className="mt-1.5 line-clamp-2 text-[17px] leading-tight font-bold max-[419px]:mt-1 max-[419px]:line-clamp-1 max-[419px]:text-[15px] sm:mt-2 sm:line-clamp-none sm:t-app-h2">
          {next.lockBody ??
            "Liked it? There’s a lot more where that came from."}
        </p>
        <p className="mt-2 t-small text-white/75 max-sm:hidden">
          Up next: {next.title}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 max-[419px]:mt-2.5 sm:mt-4">
          {next.lockHref ? (
            <Button
              variant="accent"
              href={next.lockHref}
              iconRight="arrow-right"
              className={clsx(
                "max-sm:h-10 max-sm:px-4 max-sm:text-[14px]",
                END_BTN_XS,
              )}
            >
              {next.lockCta ?? "Unlock the course"}
            </Button>
          ) : next.lockAction ? (
            <Button
              variant="accent"
              icon={next.lockAction.icon}
              onClick={next.lockAction.onClick}
              className={clsx(
                "max-sm:h-10 max-sm:px-4 max-sm:text-[14px]",
                END_BTN_XS,
              )}
            >
              {next.lockAction.label}
            </Button>
          ) : null}
          {extra.map((a) =>
            a.href ? (
              <Button
                key={a.label}
                variant="secondary"
                href={a.href}
                icon={a.icon}
                className="max-sm:hidden"
              >
                {a.label}
              </Button>
            ) : (
              <Button
                key={a.label}
                variant="secondary"
                icon={a.icon}
                onClick={a.onClick}
                className="max-sm:hidden"
              >
                {a.label}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            icon="refresh"
            onClick={onReplay}
            className="text-white max-sm:hidden hf:bg-white/10"
          >
            Replay
          </Button>
        </div>
        {/* phones: the secondary actions as one row of small text buttons */}
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1 max-[419px]:mt-1 sm:hidden">
          {extra.map((a) =>
            a.href ? (
              <Link key={a.label} href={a.href} className={END_LINK}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={END_LINK}
              >
                {a.label}
              </button>
            ),
          )}
          <button type="button" onClick={onReplay} className={END_LINK}>
            <Icon name="refresh" className="size-3.5" strokeWidth={2.4} />
            Replay
          </button>
        </div>
      </div>
    );
  }
  if (!next)
    return (
      <div className="max-w-md text-center">
        <p className="t-app-h2 max-[419px]:text-[17px]">
          That&apos;s the last item in the course.
        </p>
        <p className="mt-2 t-small text-white/75 max-[419px]:hidden">
          Mark anything you skipped as done to wrap it up.
        </p>
        <div className="mt-4 flex justify-center max-[419px]:mt-2.5">
          <Button
            variant="secondary"
            icon="refresh"
            onClick={onReplay}
            className={END_BTN_XS}
          >
            Replay
          </Button>
        </div>
      </div>
    );
  const r = 22;
  const c = 2 * Math.PI * r;
  // a test or a download never starts on its own: say what the button does
  const go =
    next.kind === "quiz"
      ? { label: "Start the test", icon: "quiz" as const }
      : next.kind === "resource"
        ? { label: "Open", icon: "file" as const }
        : {
            label: countdown !== null ? "Play now" : "Continue",
            icon: "play" as const,
          };
  return (
    <div className="flex max-w-md flex-col items-center text-center">
      {countdown !== null && (
        <span
          className="relative grid size-16 place-items-center max-[419px]:size-11"
          aria-hidden
        >
          <svg viewBox="0 0 64 64" className="size-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="rgb(255 255 255 / .2)"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="#ffcf3f"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (countdown / COUNTDOWN)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute font-display text-[26px] leading-none max-[419px]:text-[18px]">
            {countdown}
          </span>
        </span>
      )}
      <p
        className={clsx(
          "t-micro text-sun uppercase",
          countdown !== null && "mt-3 max-[419px]:mt-1.5",
        )}
        aria-live="polite"
      >
        {launching
          ? "Starting…"
          : countdown !== null
            ? `Up next in ${countdown}`
            : "Up next"}{" "}
        · {next.kindLabel}
      </p>
      <p className="mt-1.5 line-clamp-2 t-app-h2 max-[419px]:mt-1 max-[419px]:line-clamp-1 max-[419px]:text-[16px]">
        {next.title}
      </p>
      {launching ? (
        <span
          aria-hidden
          className="mt-4 size-8 animate-spin rounded-full border-4 border-white/25 border-t-sun max-[419px]:mt-2"
        />
      ) : (
        <div className="mt-4 flex flex-wrap justify-center gap-2 max-[419px]:mt-2">
          <Button
            variant="sun"
            icon={go.icon}
            onClick={onPlayNow}
            className={END_BTN_XS}
          >
            {go.label}
          </Button>
          {countdown !== null ? (
            <Button
              variant="secondary"
              onClick={onCancel}
              className={END_BTN_XS}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="secondary"
              icon="refresh"
              onClick={onReplay}
              className={END_BTN_XS}
            >
              Replay
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------- shortcuts */
export const SHORTCUTS: [string, string][] = [
  ["Space / K", "Play or pause"],
  ["← / →", "Back or forward 5s"],
  ["J / L", "Back or forward 10s"],
  ["↑ / ↓", "Volume (player focused)"],
  ["F", "Full screen"],
  ["M", "Mute"],
  ["C", "Captions"],
  ["0 – 9", "Jump to 0–90%"],
  ["?", "Show this list"],
  ["Enter", "Play or pause (seek bar focused)"],
];

export function ShortcutList({ className }: { className?: string }) {
  return (
    <dl
      className={clsx(
        "grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13.5px]",
        className,
      )}
    >
      {SHORTCUTS.map(([k, v]) => (
        <div key={k} className="contents">
          <dt>
            <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[7px] bg-white px-1.5 font-sans text-[12px] font-bold shadow-soft ring-1 ring-ink/[0.06]">
              {k}
            </kbd>
          </dt>
          <dd className="self-center font-semibold text-ink/75">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------------------- bits */
function CtrlButton({
  label,
  onClick,
  children,
  className,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={clsx(
        "tap relative grid size-10 shrink-0 place-items-center rounded-full hf:bg-white/15 phone-s:size-10 coarse:size-11",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Glyph({
  name,
  className = "size-[22px]",
}: {
  name:
    | "play"
    | "pause"
    | "vol"
    | "vol-low"
    | "mute"
    | "fs"
    | "fs-exit"
    | "cc"
    | "back10"
    | "fwd10"
    | "cog";
  className?: string;
}) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {name === "play" && (
        <path
          d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z"
          fill="currentColor"
        />
      )}
      {name === "pause" && (
        <>
          <rect
            x="6"
            y="4.5"
            width="4"
            height="15"
            rx="1.3"
            fill="currentColor"
          />
          <rect
            x="14"
            y="4.5"
            width="4"
            height="15"
            rx="1.3"
            fill="currentColor"
          />
        </>
      )}
      {(name === "vol" || name === "vol-low" || name === "mute") && (
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
      )}
      {name === "vol" && (
        <path
          d="M15.5 8.5a5 5 0 0 1 0 7M18.3 6a8.6 8.6 0 0 1 0 12"
          {...stroke}
        />
      )}
      {name === "vol-low" && <path d="M15.5 8.5a5 5 0 0 1 0 7" {...stroke} />}
      {name === "mute" && <path d="m16 9.5 5 5M21 9.5l-5 5" {...stroke} />}
      {name === "fs" && (
        <path
          d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"
          {...stroke}
        />
      )}
      {name === "fs-exit" && (
        <path
          d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20"
          {...stroke}
        />
      )}
      {name === "cc" && (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="3" {...stroke} />
          <path
            d="M10.5 10.3a2.3 2.3 0 1 0 0 3.4M17 10.3a2.3 2.3 0 1 0 0 3.4"
            {...stroke}
          />
        </>
      )}
      {name === "cog" && (
        <>
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            {...stroke}
          />
          <circle cx="12" cy="12" r="3" {...stroke} />
        </>
      )}
      {(name === "back10" || name === "fwd10") && (
        <>
          <path
            d={
              name === "back10"
                ? "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v3.5H8"
                : "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v3.5H16"
            }
            {...stroke}
          />
          <text
            x="12"
            y="15.2"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="800"
            fill="currentColor"
            fontFamily="system-ui, sans-serif"
          >
            10
          </text>
        </>
      )}
    </svg>
  );
}
