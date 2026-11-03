import Link from "next/link";
import clsx from "clsx";
import { ArrowIcon, BrandMark, Eyebrow, GridLines, Photo, RedWords } from "@/components/editorial";
import type { MediaKey } from "@/lib/media";
import { Timecode } from "./Timecode";

/* =============================================================================
   AUTH SPLIT (Marlowe). The auth pages (log in, sign up, reset, teach).
   Left (lg+): a full-height theatre panel, sticky while the form scrolls: a
   graded cinematic still, hairline thirds, the back link + a slate top row, a
   short quote from the director in the right third, a giant Anton line at the
   foot ("ROLL / CAMERA.") and a running mono timecode.
   Right: the cream panel: the logo, the switch link ("New here? Create an
   account"), an Inter Tight heading over the form, a tiny-caps legal row.
   Below lg: a compact dark band (logo, Back, the Anton line, the slate) above
   the form, so the form starts in the first screen on phones.

   <AuthSplit scene="login" eyebrow="Log in" title="Welcome back." intro="…"
              back={{ href: "/", label: "to site" }} topAction={<AuthSwitch … />}>
     <LoginForm next={next} />
   </AuthSplit>
   ============================================================================= */

export type AuthScene = "login" | "signup" | "forgot" | "tutor";

type SceneArt = {
  /** slate: scene + take */
  scene: string;
  take: string;
  /** the giant Anton line, one entry per line */
  lines: string[];
  red: string[];
  /** Anton size in cqw of the panel width (the longest line fills ~85%) */
  fit: number;
  quote: string;
  by: string;
  still: MediaKey;
  pos?: string;
  /** timecode the slate starts from (seconds) */
  start: number;
  /** brightness of the graded still (darker stills get more) */
  lift?: number;
};

const SCENES: Record<AuthScene, SceneArt> = {
  login: {
    scene: "10",
    take: "01",
    lines: ["Roll", "camera."],
    red: ["camera"],
    fit: 26,
    quote: "Every session starts the same way. Find the frame, check the light, then roll.",
    by: "Arjun Rao, Director",
    still: "director-on-set",
    pos: "42% 42%",
    start: 24 * 60 + 12,
  },
  signup: {
    scene: "10",
    take: "02",
    lines: ["Your first", "take starts", "here."],
    red: ["take"],
    fit: 17.5,
    quote: "You don't need a camera. You need a story worth a minute of someone's life.",
    by: "Arjun Rao, Director",
    still: "journal-sixty-seconds",
    pos: "50% 55%",
    start: 1,
    lift: 0.8,
  },
  forgot: {
    scene: "10",
    take: "03",
    lines: ["Cut.", "Go again."],
    red: ["again"],
    fit: 21.5,
    quote: "Every good take had a bad one before it. Reset, breathe, roll again.",
    by: "Arjun Rao, Director",
    still: "bts-projector",
    pos: "38% 55%",
    start: 3 * 60 + 33,
    lift: 0.68,
  },
  tutor: {
    scene: "12",
    take: "01",
    lines: ["Teach what", "you shoot."],
    red: ["shoot"],
    fit: 19.5,
    quote: "Finished work and the patience to explain it. That's the whole job description.",
    by: "Arjun Rao, Director",
    still: "bts-camera-rig",
    pos: "40% 40%",
    start: 12 * 60,
    lift: 0.72,
  },
};

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Help", href: "/contact" },
];

/** "SC 10 · TK 01" + a red REC dot + the running timecode (`clock` = the dot + timecode only). */
function Slate({ s, clock, className }: { s: SceneArt; clock?: boolean; className?: string }) {
  return (
    <p className={clsx("t-timecode flex items-center gap-3 whitespace-nowrap text-cream/70", className)} aria-hidden>
      {!clock && (
        <span>
          SC {s.scene} · TK {s.take}
        </span>
      )}
      <span className="flex items-center gap-2 text-cream">
        <span className="size-[7px] animate-pulse rounded-full bg-red" />
        <Timecode start={s.start} />
      </span>
    </p>
  );
}

function BackLink({ back, className }: { back: { href: string; label: string }; className?: string }) {
  return (
    <Link
      href={back.href}
      className={clsx("group t-label inline-flex min-h-11 items-center gap-2.5 text-cream/85 transition-colors hf:text-cream", className)}
    >
      <ArrowIcon dir="left" className="size-3.5 transition-[translate] duration-500 ease-expo group-hf:-translate-x-1" />
      <span>
        Back
        {back.label && <span className="max-sm:hidden"> {back.label}</span>}
      </span>
    </Link>
  );
}

/** The giant Anton line (red word), sized to the panel through container query units. */
function AntonLines({ s, className, style }: { s: SceneArt; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={clsx("font-display leading-[0.84] tracking-[-0.005em] uppercase", className)} style={style}>
      {s.lines.map((l) => (
        <span key={l} className="block whitespace-nowrap">
          <RedWords text={l} red={s.red} />
        </span>
      ))}
    </p>
  );
}

/** The grade every auth still gets: black-and-white, a touch of contrast, kept dark for cream type
    (a filter on the still's wrapper; `lift` brightens the darker stills a little). */
function GradedStill({ s, sizes, preload }: { s: SceneArt; sizes: string; preload?: boolean }) {
  return (
    <div className="absolute inset-0" style={{ filter: `grayscale(1) contrast(1.12) brightness(${s.lift ?? 0.62})` }}>
      <Photo k={s.still} fill sizes={sizes} preload={preload} alt="" pos={s.pos} />
    </div>
  );
}

export function AuthSplit({
  scene,
  eyebrow,
  title,
  intro,
  topAction,
  back = { href: "/", label: "to site" },
  wide,
  children,
}: {
  scene: AuthScene;
  /** tiny caps over the heading, e.g. "Log in" */
  eyebrow: string;
  /** Inter Tight page heading (the h1) */
  title: React.ReactNode;
  intro?: React.ReactNode;
  /** top right of the form column, e.g. <AuthSwitch prompt="New here?" … /> */
  topAction?: React.ReactNode;
  /** where "Back" goes (the course a visitor came from…); label is the tail shown from sm, e.g. "to course" */
  back?: { href: string; label: string };
  /** a wider form column (the tutor application) */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const s = SCENES[scene];
  return (
    <div
      className={clsx(
        "ground-cream min-h-dvh lg:grid",
        wide ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
      )}
    >
      {/* ------------------------------------------------------------------ desktop: the theatre panel */}
      <aside
        aria-label="Tamada Media"
        className="theatre @container hidden overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col"
      >
        <div className="absolute inset-0 -z-10">
          <GradedStill s={s} sizes="50vw" preload />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgb(11 11 11 / 0.92) 0%, rgb(11 11 11 / 0.55) 34%, rgb(11 11 11 / 0.08) 62%, rgb(11 11 11 / 0.55) 100%), radial-gradient(ellipse 80% 70% at 50% 40%, transparent 40%, rgb(11 11 11 / 0.5) 100%)",
            }}
          />
        </div>
        <GridLines bleed stops={[100 / 3, 200 / 3]} />

        <div className="relative z-10 grid h-full grid-cols-3 grid-rows-[auto_1fr_auto_auto] pt-[max(20px,var(--sat))]">
          <div className="px-8 xl:px-10">
            <BackLink back={back} className="whitespace-nowrap" />
          </div>
          <div className="col-start-3 flex justify-end px-8 pt-3.5 xl:px-10">
            <Slate s={s} clock />
          </div>

          <figure className={clsx("row-start-2 self-center px-6 xl:px-8 [@media(max-height:760px)]:hidden", wide ? "col-span-2 col-start-2" : "col-start-3")}>
            <blockquote className="t-body max-w-[19rem] text-cream/90">&ldquo;{s.quote}&rdquo;</blockquote>
            <figcaption className="t-label mt-4 text-ash">{s.by}</figcaption>
          </figure>

          <div className="col-span-3 row-start-3 px-8 pb-6 xl:px-10">
            <AntonLines s={s} style={{ fontSize: `min(${s.fit}cqw, ${s.fit * 0.72}dvh)` }} />
          </div>

          <div className="col-span-3 row-start-4 flex items-center justify-between gap-4 border-t border-line bg-ink px-8 py-4 xl:px-10">
            <p className="t-label whitespace-nowrap text-ash">
              Tamada Media<span className="max-xl:hidden"> · AI filmmaking school</span>
            </p>
            <p className="t-timecode whitespace-nowrap text-ash" aria-hidden>
              SC {s.scene} · TK {s.take} · 24 FPS
            </p>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ below lg: the dark band */}
      <header className="theatre overflow-hidden lg:hidden">
        <div className="absolute inset-0 -z-10">
          <GradedStill s={s} sizes="100vw" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_11_11/0.94),rgb(11_11_11/0.45)_70%,rgb(11_11_11/0.7))]" />
        </div>
        <div className="px-gutter pt-[max(10px,var(--sat))] pb-5 sm:pb-7">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="block w-[104px] py-2 sm:w-[118px]" aria-label="Tamada Media home">
              <BrandMark tone="light" sizes="118px" preload />
            </Link>
            <BackLink back={back} className="-mr-1" />
          </div>
          <p className="mt-8 font-display text-[clamp(2.5rem,1.4rem+6vw,4.25rem)] leading-[0.86] tracking-[-0.005em] text-balance uppercase sm:mt-12 land:hidden">
            <RedWords text={s.lines.join(" ")} red={s.red} />
          </p>
          <Slate s={s} className="mt-5 sm:mt-6 land:mt-3" />
        </div>
      </header>

      {/* ------------------------------------------------------------------ the cream panel */}
      <main
        id="main"
        tabIndex={-1}
        className="flex min-w-0 flex-col px-gutter pt-4 pb-[max(1.25rem,calc(var(--sab)+0.75rem))] outline-none lg:min-h-dvh lg:px-12 lg:pt-7 xl:px-16"
      >
        <div className="hidden min-h-11 items-center justify-between gap-4 lg:flex">
          <Link href="/" className="block w-[116px]" aria-label="Tamada Media home">
            <BrandMark tone="dark" sizes="116px" />
          </Link>
          {topAction && <div className="ml-auto text-right">{topAction}</div>}
        </div>

        <div className={clsx("mx-auto flex w-full flex-1 flex-col justify-center pt-5 pb-12 sm:pt-8 lg:py-14", wide ? "max-w-[620px]" : "max-w-[440px]")}>
          {/* phones + tablets: the switch link shares the eyebrow row */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Eyebrow index={s.scene} className="whitespace-nowrap">
              {eyebrow}
            </Eyebrow>
            {topAction && <div className="-my-2 text-right lg:hidden">{topAction}</div>}
          </div>
          <h1 className="mt-5 font-heading text-[clamp(2.25rem,1.7rem+2.2vw,3.5rem)] leading-[0.98] font-bold tracking-[-0.045em] text-balance">
            {title}
          </h1>
          {intro && <p className="t-body mt-4 max-w-[36ch] text-muted">{intro}</p>}
          <div className="mt-9 sm:mt-10">{children}</div>
        </div>

        <footer
          className={clsx(
            "mx-auto flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3",
            wide ? "max-w-[620px]" : "max-w-[440px]",
          )}
        >
          <span className="t-label text-muted">
            © 2026<span className="max-sm:hidden"> Tamada Media</span>
          </span>
          <nav aria-label="Legal" className="-mr-2 flex items-center">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="t-label inline-flex min-h-11 items-center px-2 text-muted transition-colors hf:text-fg">
                <span className="link-draw">{l.label}</span>
              </Link>
            ))}
          </nav>
        </footer>
      </main>
    </div>
  );
}

/** Top-right switch: "New here?  CREATE AN ACCOUNT →". */
export function AuthSwitch({ prompt, label, href }: { prompt: string; label: string; href: string }) {
  return (
    <p className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5">
      <span className="t-small text-muted max-sm:hidden">{prompt}</span>
      <Link href={href} className="group t-label inline-flex min-h-11 items-center gap-2 text-fg">
        <span className="link-draw whitespace-nowrap">{label}</span>
        <ArrowIcon className="size-3.5 shrink-0 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" />
      </Link>
    </p>
  );
}

/* ----------------------------------------------------------------------------- bits */
/** "or" divider between the email form and the other ways in: a hairline with tiny caps. */
export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="t-label my-7 flex items-center gap-4 text-muted" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Small "Continue with Google" glyph (official colours). */
export function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

/** A ruled note above a form (where you'll land, a session that already exists…): hairlines + a red marker. */
export function AuthNote({ children, className, live }: { children: React.ReactNode; className?: string; live?: boolean }) {
  return (
    <div aria-live={live ? "polite" : undefined} className={clsx("app-fade flex gap-3 border-y border-line py-3.5 text-[14px] leading-snug", className)}>
      <span aria-hidden className="mt-[6px] size-[7px] shrink-0 bg-red" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
