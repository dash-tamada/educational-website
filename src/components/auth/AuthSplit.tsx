import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { Logo } from "@/components/landing/Header";
import { Eyebrow, Sparkle, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { DemoPill, Icon, ProgressBar } from "@/components/app";
import {
  getCourseBySlug,
  getCourseProgress,
  DEMO_STUDENT_ID,
  formatDuration,
} from "@/lib/mock";
import { cropSrc } from "@/lib/img";
import type { Tone } from "@/lib/landing-data";

/* =============================================================================
   Maxima split layout for the auth pages: an illustrated colour field (Tami,
   clouds, a tiny scene) on the left, the form column on the cream canvas on the
   right. Below 1024px the field becomes a banner above the form; on phones
   (< 640px) a compact band (logo, Back, the headline) so the form starts in the
   first screen. Short landscape phones get the split back: a sticky 5/12 field
   beside the form. The field is sticky on desktop so long forms scroll past a
   calm picture.
   ============================================================================= */

type Scene = "login" | "signup" | "forgot";

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Help", href: "/contact" },
];

/**
 * Field colours. The blobs are a local, slightly deeper variant of the shared
 * BlobSet tones: the big wave sits behind the heading copy on desktop, so it
 * stays dark enough for white text (WCAG AA) while the top-right lobe stays light.
 * [lobe (top right), wave (bottom), accents]
 */
const FIELD: Record<
  Scene,
  { bg: string; blobs: [string, string, string]; eyebrow: Tone }
> = {
  login: {
    bg: "bg-blue",
    blobs: ["#5b8dff", "#1d57e6", "#1748c4"],
    eyebrow: "sun",
  },
  // the deeper hotpink fill: at lg+ the heading copy sits on the field fill itself
  // (the wave is below it), and white body text needs it for 4.5:1
  signup: {
    bg: "bg-hotpink-deep",
    blobs: ["#ff3da6", "#bf0063", "#a30054"],
    eyebrow: "sun",
  },
  // same blue as /login: the route curtain for /forgot-password is the blue "Log in" disc
  forgot: {
    bg: "bg-blue",
    blobs: ["#5b8dff", "#1d57e6", "#1748c4"],
    eyebrow: "sun",
  },
};

export function FieldBlobs({
  colors: [lobe, wave, accent],
}: {
  colors: [string, string, string];
}) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      aria-hidden
    >
      <path
        d="M600 0 H1000 V330 C940 400 850 380 800 310 C750 240 680 250 630 180 C590 120 560 50 600 0 Z"
        fill={lobe}
      />
      <path
        d="M0 640 C120 560 230 690 380 640 C520 594 600 470 760 520 C880 558 940 640 1000 610 V1000 H0 Z"
        fill={wave}
      />
      <path
        d="M0 300 C70 260 150 290 170 360 C192 440 120 500 50 500 C30 500 12 495 0 490 Z"
        fill={accent}
      />
      <path
        d="M760 1000 C770 905 860 845 940 862 C968 868 988 878 1000 888 V1000 Z"
        fill={accent}
      />
    </svg>
  );
}

export function AuthSplit({
  scene,
  eyebrow,
  title,
  body,
  topAction,
  back = { href: "/", label: "to site" },
  children,
}: {
  scene: Scene;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  /** right side of the form column's top row, e.g. "New here? Sign up" */
  topAction?: React.ReactNode;
  /** where "Back" goes (e.g. the course a visitor came from); label is the tail shown from sm, e.g. "to course" */
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const f = FIELD[scene];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] land:grid land:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ------------------------------------------------------------------ colour field */}
      {/* top / left padding clear the notch and status bar (viewport-fit: cover) */}
      <div className="p-inset pt-[max(var(--panel-inset),var(--sat))] lg:sticky lg:top-0 lg:h-dvh land:sticky land:top-0 land:h-dvh land:pl-[max(var(--panel-inset),var(--sal))]">
        <section
          data-field="dark"
          aria-label="Welcome"
          className={clsx(
            "relative isolate flex h-full flex-col overflow-clip rounded-[clamp(1.75rem,3.5vw,3.5rem)] px-5 pt-4 pb-6 text-white phone-s:px-4 sm:px-8 sm:pb-7 md:pb-10 land:px-6 land:pt-4 land:pb-5 lg:px-10 lg:pt-8 lg:pb-10 xl:px-12 lg:[@media(max-height:760px)]:pt-6 lg:[@media(max-height:760px)]:pb-7",
            f.bg,
          )}
        >
          <FieldBlobs colors={f.blobs} />
          <Cloud
            size="m"
            delay={-8}
            className="absolute top-[22%] -right-6 -z-10 opacity-90 max-sm:top-auto max-sm:-right-10 max-sm:bottom-3 lg:top-[14%] lg:right-[8%] lg:[@media(max-height:760px)]:hidden land:hidden"
          />

          <div className="flex items-center justify-between gap-3">
            <Logo light preload />
            <Link
              href={back.href}
              className="tap inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-bold text-ink shadow-soft transition-colors coarse:h-11 hf:bg-butter"
            >
              <Icon name="arrow-left" className="size-4" strokeWidth={2.4} />
              <span>
                Back
                {back.label && (
                  <span className="hidden sm:inline land:hidden">
                    {" "}
                    {back.label}
                  </span>
                )}
              </span>
            </Link>
          </div>

          {/* lg:mt-6 keeps the eyebrow clear of the logo row, lg:pb-8 keeps the copy clear
              of the scene (Tami and the sparkle reach above the scene box) */}
          {/* phones: no eyebrow and no body copy (the headline says it, the form is the point) */}
          <div className="relative mt-5 flex flex-1 flex-col justify-center sm:mt-8 lg:mt-6 lg:pb-8 lg:[@media(max-height:760px)]:pb-6 land:mt-4">
            <div className="app-enter max-w-[30rem] pr-14 sm:pr-24 lg:max-w-[34rem] lg:pr-0 land:pr-14">
              <div className="max-sm:hidden">
                <Eyebrow tone={f.eyebrow}>{eyebrow}</Eyebrow>
              </div>
              {/* capped so the highlighted second line ("curious human.") stays on one line in
                  the column; at lg it also scales with the viewport height, so on short
                  laptop screens copy + scene still fit the sticky field */}
              <h1 className="t-display-l text-[clamp(1.625rem,15.15vw-22.7px,2.25rem)] sm:mt-eyebrow sm:text-[clamp(2.5rem,1.2rem+3.6vw,4.25rem)] lg:text-[max(2.25rem,min(clamp(2.5rem,1.2rem+3.6vw,4.25rem),8.5dvh))] land:text-[clamp(1.75rem,3.6vw,2.125rem)]">
                {title}
              </h1>
              <p className="mt-sub t-body-l text-white max-sm:sr-only land:sr-only">
                {body}
              </p>
            </div>
            {/* phones / tablets: Tami peeks in beside the heading */}
            <div
              className="pointer-events-none absolute top-0 right-0 w-[48px] sm:top-1 sm:w-[88px] lg:hidden land:w-[52px]"
              aria-hidden
            >
              <Mascot
                title=""
                className="w-full animate-float"
                style={{ transform: "rotate(8deg)" }}
              />
            </div>
          </div>

          {/* the small cloud belongs to the scene, not the field: on tall fields the scene
              reserves a strip above itself for it, so it can never land on the copy */}
          <div className="relative hidden lg:block land:hidden [@media(min-height:860px)]:pt-16">
            <Cloud
              size="s"
              delay={-3}
              flip
              className="absolute top-0 left-[3%] -z-10 hidden [@media(min-height:860px)]:block"
            />
            <SceneArt scene={scene} />
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ form column */}
      <main
        id="main"
        className="flex min-w-0 flex-col px-gutter pt-3 pb-[max(1.5rem,calc(var(--sab)+0.75rem))] sm:pt-4 sm:pb-8 lg:px-10 lg:pt-8 xl:px-16 land:pt-4 land:pr-[max(var(--gutter),var(--sar))]"
      >
        {topAction && (
          <div className="mx-auto flex w-full max-w-[480px] justify-end text-[14px] font-semibold text-ink/70 coarse:min-h-11 coarse:items-center">
            {topAction}
          </div>
        )}
        <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center pt-3 pb-6 sm:py-6 md:py-10 land:pt-3">
          {children}
        </div>
        {/* touch: the legal links are 44px-tall targets (the row stays one line from 360px) */}
        <footer className="mx-auto flex w-full max-w-[480px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-ink/[0.08] pt-5 text-[13px] font-semibold text-ink/70 coarse:pt-2">
          <span>© 2026 Tamada Media</span>
          <nav
            aria-label="Legal"
            className="flex items-center gap-4 coarse:-mr-2.5 coarse:gap-0"
          >
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="link-draw hf:text-ink coarse:inline-flex coarse:min-h-11 coarse:items-center coarse:rounded-full coarse:px-2.5 coarse:active:bg-ink/[0.05]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </footer>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------------------- scenes */
function SceneArt({ scene }: { scene: Scene }) {
  if (scene === "login") return <LoginScene />;
  if (scene === "signup") return <SignupScene />;
  return <ForgotScene />;
}

/** "Pick up where you left off": Priya's real resume point from the mock data. */
function LoginScene() {
  const course = getCourseBySlug("web-dev-from-zero");
  const progress = course
    ? getCourseProgress(DEMO_STUDENT_ID, course.id)
    : null;
  return (
    <div className="relative flex items-end gap-4 xl:gap-6">
      <div className="w-[110px] shrink-0 xl:w-[180px] lg:[@media(max-height:760px)]:w-[96px]!">
        <div className="group">
          <Mascot
            interactive
            title=""
            className="w-full"
            style={{ transform: "rotate(-6deg)" }}
          />
        </div>
      </div>
      {course && progress && (
        <div
          className="mb-3 w-full max-w-[330px] min-w-0 rounded-card bg-white p-3 text-ink shadow-photo"
          style={{ transform: "rotate(2deg)" }}
        >
          <div className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-img xl:size-16">
              <Image
                src={cropSrc(course.thumbnail, 1)}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="t-micro text-ink/70 uppercase">
                Where you left off
              </p>
              <p className="mt-1 line-clamp-2 t-app-h3">{course.title}</p>
              <p className="mt-0.5 t-small text-ink/70">
                Module 04 ·{" "}
                {formatDuration(progress.resumePositionSec, "clock")} in
              </p>
            </div>
          </div>
          <ProgressBar
            value={progress.percent}
            tone="blue"
            size="sm"
            className="mt-3"
            label="Course progress"
            showValue
          />
          <div className="mt-2 flex justify-end">
            <DemoPill />
          </div>
        </div>
      )}
      {/* sits above the scene box: dropped on short screens where there is no air for it */}
      <Sparkle
        className="absolute -top-6 left-[46%] w-7 [@media(max-height:760px)]:hidden"
        fill="#ffcf3f"
      />
    </div>
  );
}

function SignupScene() {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-end gap-2">
        <BlockBuddy
          body="#ffcf3f"
          head="#2668fd"
          hat="#fd4401"
          wave
          className="w-[46px] xl:w-[64px] lg:[@media(max-height:760px)]:w-[40px]!"
        />
        <div className="w-[116px] xl:w-[170px] lg:[@media(max-height:760px)]:w-[96px]!">
          <div className="group">
            <Mascot
              interactive
              title=""
              className="w-full"
              style={{ transform: "rotate(-4deg)" }}
            />
          </div>
        </div>
        <BlockBuddy
          body="#3b308f"
          head="#a7eb98"
          className="w-[42px] xl:w-[58px] lg:[@media(max-height:760px)]:w-[36px]!"
        />
      </div>
      <div className="mb-6 ml-auto flex flex-col items-end gap-3">
        <Sticker tone="sun" size="sm" rotate={-6}>
          1st video free
        </Sticker>
        <Sticker tone="white" size="sm" rotate={5}>
          + certificate
        </Sticker>
      </div>
    </div>
  );
}

function ForgotScene() {
  return (
    <div className="relative flex items-end gap-6">
      <div className="w-[140px] xl:w-[160px] lg:[@media(max-height:760px)]:w-[104px]!">
        <Mascot
          wink
          title=""
          className="w-full"
          style={{ transform: "rotate(-8deg)" }}
        />
      </div>
      <div className="mb-8">
        <Sticker tone="sun" size="sm" rotate={-5} lines={2}>
          happens to the best of us
        </Sticker>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- bits */
/** "or" divider between the email form and social / demo options. */
export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div
      className="my-5 flex items-center gap-3 text-[13px] font-bold text-ink/70 uppercase"
      role="separator"
      aria-label={label}
    >
      <span className="h-px flex-1 bg-ink/[0.1]" />
      {label}
      <span className="h-px flex-1 bg-ink/[0.1]" />
    </div>
  );
}

/** Small "Continue with Google" glyph (official colours). */
export function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z"
      />
    </svg>
  );
}
