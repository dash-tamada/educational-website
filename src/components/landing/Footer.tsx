"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { footerLinks } from "@/lib/landing-data";
import { ArrowButton } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { ScallopEdge } from "@/components/decor/Scallop";
import { TransitionLink } from "@/components/transition/RouteTransition";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { BrandLockup } from "./Header";
import { Parallax } from "@/components/motion/Parallax";

const LEGAL = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

/**
 * Minimal footer for task pages (checkout, auth forms, learn gates; MOBILE_SPEC F-04):
 * one row "© 2026 Tamada Media · Terms · Privacy · Help" with 44px-tall links, 24px
 * padding and the safe-area inset. <SiteShell footer="minimal"> renders it; checkout
 * pages get it automatically. Also exported for custom layouts (e.g. the auth layout).
 *   <MinimalFooter />                 on the cream canvas
 *   <MinimalFooter className="…" />
 */
export function MinimalFooter({ className }: { className?: string }) {
  const links = [...LEGAL, { label: "Help", href: "/contact" }];
  return (
    <footer className={clsx("container-x pt-6 pb-[max(24px,calc(var(--sab)+12px))]", className)}>
      <div className="flex flex-col items-center gap-x-4 gap-y-1 border-t-2 border-ink/8 pt-4 text-[14px] font-semibold text-ink/60 sm:flex-row sm:justify-between">
        <span className="flex min-h-11 items-center">© {new Date().getFullYear()} Tamada Media</span>
        <ul className="flex items-center gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <TransitionLink href={l.href} className="inline-flex min-h-11 items-center rounded-full px-3 hf:text-ink focus-visible:text-ink active:bg-ink/[0.05]">
                {l.label}
              </TransitionLink>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

// TODO: point these at the real Tamada Media profiles once the handles exist.
const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.2V8.8l5.3 3.2L10 15.2Z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 3.5h3l-6.6 7.5 7.8 9.5h-6.1l-4.8-5.9-5.5 5.9h-3l7.1-7.9L2 3.5h6.2l4.3 5.4 5.1-5.4Zm-1 15.3h1.7L7.5 5.1H5.7l10.9 13.7Z" />
      </svg>
    ),
  },
];

/** Giant two-colour wordmark letters (Maxima footer) with tiny characters on top. */
const WORD: { ch: string; color: string; rider?: "tami" | "buddy-a" | "buddy-b" }[] = [
  { ch: "t", color: "text-flame" },
  { ch: "a", color: "text-flame", rider: "buddy-a" },
  { ch: "m", color: "text-blue", rider: "tami" },
  { ch: "a", color: "text-flame" },
  { ch: "d", color: "text-blue" },
  { ch: "a", color: "text-flame", rider: "buddy-b" },
];

function Rider({ kind }: { kind: "tami" | "buddy-a" | "buddy-b" }) {
  // Positioned in em of the wordmark so they stay seated on the x-height at every size.
  if (kind === "tami")
    return (
      <span className="group absolute bottom-[0.585em] left-[0.27em] block w-[0.3em]">
        <Mascot interactive title="" className="w-full" style={{ transform: "rotate(-8deg)" }} />
      </span>
    );
  if (kind === "buddy-a")
    return (
      <span className="absolute bottom-[0.6em] left-[0.18em] block w-[0.17em]">
        <BlockBuddy body="#ff008c" head="#ffcf3f" hat="#2668fd" className="w-full" />
      </span>
    );
  return (
    <span className="absolute bottom-[0.6em] left-[0.2em] block w-[0.16em]">
      <BlockBuddy body="#00b351" head="#f780d4" wave className="w-full" />
    </span>
  );
}

/**
 * Purple Aardvark footer: the brand lockup (Tami + light logo) on the purple field,
 * then a white Maxima content panel with the mailing list,
 * four link columns (Learn, Teach, Company, Account; underline draw), pink social circles, and a giant
 * flame/blue "tamada" wordmark whose letters rise in (R6) with characters riding them.
 */
const CREAM = "var(--color-cream)";

/** Opaque background of the element right above the footer when it is a full-bleed
 *  band (a .field); otherwise the cream canvas (inset .panel blocks sit on cream). */
function useAutoEdge(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [color, setColor] = useState(CREAM);
  useLayoutEffect(() => {
    const footer = ref.current;
    if (!enabled || !footer) return;
    const read = () => {
      let above = footer.previousElementSibling as HTMLElement | null;
      // <main> (SiteShell) wraps the page: look at its last rendered block
      while (above && above.lastElementChild && above.tagName === "MAIN") above = above.lastElementChild as HTMLElement;
      if (!above) return setColor(CREAM);
      const r = above.getBoundingClientRect();
      const bg = getComputedStyle(above).backgroundColor;
      const opaque = bg && !/^rgba\(.*,\s*0\)$/.test(bg) && bg !== "transparent";
      const fullBleed = r.width >= footer.getBoundingClientRect().width - 1;
      const touching = Math.abs(footer.getBoundingClientRect().top - r.bottom) < 2;
      setColor(opaque && fullBleed && touching ? bg : CREAM);
    };
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(footer.parentElement ?? footer);
    return () => ro?.disconnect();
  }, [ref, enabled]);
  return color;
}

export function Footer({
  edge = "var(--color-flame)",
  variant = "auto",
}: {
  /**
   * Colour of the scalloped bumps hanging into the purple: the colour of whatever sits
   * right above the footer. Landing: flame (the Final CTA continues). "auto" (SiteShell's
   * default) uses the last full-bleed .field's colour, else the cream canvas.
   */
  edge?: string;
  /** "full" = the purple footer; "minimal" = <MinimalFooter/>; "auto" (default) = minimal on
   *  task pages (/checkout/*), full everywhere else */
  variant?: "auto" | "full" | "minimal";
} = {}) {
  const pathname = usePathname() ?? "";
  const minimal = variant === "minimal" || (variant === "auto" && /^\/checkout(\/|$)/.test(pathname));
  if (minimal) return <MinimalFooter />;
  return <FullFooter edge={edge} />;
}

function FullFooter({ edge }: { edge: string }) {
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const auto = useAutoEdge(ref, edge === "auto");
  const edgeColor = edge === "auto" ? auto : edge;

  return (
    <footer ref={ref} data-field="dark" className="field bg-purple text-ink">
      {/* whatever sits above (landing: the flame Final CTA; inner pages: the cream
          canvas) continues as bumps into the purple */}
      <ScallopEdge placement="inside-top" color={edgeColor} />

      <div className="px-inset pt-[calc(var(--scallop)/2+var(--panel-inset))] pb-inset">
        {/* brand row on the purple field: the official lockup (light logo) with
            the promise beside it, on the same inner edge as the white panel */}
        <div className="flex flex-col gap-4 px-[max(24px,calc(var(--gutter)-var(--panel-inset)),calc(50%-var(--container)/2))] pt-6 pb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 md:pt-8 md:pb-10">
          <TransitionLink
            href="/"
            aria-label="Tamada Media home"
            className="group tap inline-flex self-start py-2 [--lw:136px] sm:self-auto md:[--lw:164px] lg:[--lw:188px]"
          >
            <BrandLockup light interactive loading="lazy" sizes="(min-width: 1024px) 188px, (min-width: 768px) 164px, 136px" />
          </TransitionLink>
          <p className="max-w-[24rem] text-[15px] leading-snug font-medium text-white/80 sm:text-right md:text-base">
            Video courses from real tutors. The first video of every course is
            free.
          </p>
        </div>

        <div className="rounded-card-lg bg-white px-[max(24px,calc(var(--gutter)-var(--panel-inset)),calc(50%-var(--container)/2))] pt-10 pb-6 md:pt-14 md:pb-8">
          <div className="grid gap-12 xl:grid-cols-12 xl:gap-10">
            {/* mailing list */}
            <div className="xl:col-span-5">
              <h2 className="t-chunky-card">Join our mailing list</h2>
              <p className="mt-2 text-[15px] font-medium text-ink/70">
                New courses on the 1st of every month. No spam, promise.
              </p>
              {/* UI only for now: wired to the email provider in a later milestone */}
              <form
                className="mt-5 flex max-w-[30rem] flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
              >
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email address"
                  className="h-12 w-full min-w-0 rounded-full sm:w-auto sm:flex-1 bg-cream px-5 text-[16px] font-medium text-ink outline-none placeholder:text-ink/45 focus-visible:ring-3 focus-visible:ring-blue md:h-[52px]"
                />
                <ArrowButton type="submit" variant="pink">
                  {sent ? "You're in" : "Subscribe"}
                </ArrowButton>
              </form>
              <p aria-live="polite" className="mt-2 min-h-5 text-[13px] font-semibold text-green">
                {sent ? "Thanks! Check your inbox on the 1st." : ""}
              </p>
            </div>

            {/* link columns */}
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-[repeat(4,auto)] sm:justify-between xl:col-span-7 xl:pl-8">
              {footerLinks.map((col) => (
                <div key={col.title}>
                  <h2 className="t-eyebrow text-ink/70">{col.title}</h2>
                  {/* phones: each link is a 44px row (touch target); from sm the airy desktop list */}
                  <ul className="mt-2 sm:mt-4 sm:space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label} className="max-sm:flex max-sm:min-h-11 max-sm:items-center">
                        <TransitionLink
                          href={l.href}
                          className="link-draw text-[17px] font-semibold text-ink/80 sm:whitespace-nowrap transition-colors duration-200 ease-ui hover:text-ink max-sm:py-2.5"
                        >
                          {l.label}
                        </TransitionLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4">
                <h2 className="t-eyebrow text-ink/70">Follow along</h2>
                <ul className="mt-4 flex gap-3">
                  {SOCIALS.map((s) => (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Tamada Media on ${s.label}`}
                        className="hover-icon tap grid size-12 place-items-center rounded-full bg-blush text-blue [&>svg]:size-[22px]"
                      >
                        {s.icon}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          {/* giant wordmark */}
          <p
            aria-hidden
            data-reveal-stagger="card"
            className="mt-20 flex justify-center font-heading text-[min(24vw,368px)] leading-[0.8] font-extrabold tracking-[-0.03em] [font-variation-settings:'opsz'_96,'wdth'_100] select-none md:mt-28"
          >
            {WORD.map((l, i) => (
              <span key={i} className={clsx("relative inline-block", l.color)}>
                {/* gentle per-letter depth: letters start 12px apart (alternating) and
                    settle onto one baseline exactly when the page bottom is reached,
                    so the resting state is always aligned. Off on phones. */}
                <Parallax
                  as="span"
                  y={[i % 2 ? 12 : -12, 0]}
                  end="bottom bottom"
                  trigger="footer"
                  mobile={0}
                  innerClassName="relative"
                >
                  {l.ch}
                  {l.rider && <Rider kind={l.rider} />}
                </Parallax>
              </span>
            ))}
          </p>

          <div className="mt-8 flex flex-col gap-3 border-t-2 border-ink/8 pt-6 pb-[var(--sab)] text-[13.5px] font-medium text-ink/60 max-sm:gap-0 md:flex-row md:items-center md:justify-between md:pb-0">
            <span>© {new Date().getFullYear()} Tamada Media. Made for learners, by learners.</span>
            <ul className="flex gap-6">
              {LEGAL.map((l) => (
                <li key={l.href} className="max-sm:flex max-sm:min-h-11 max-sm:items-center">
                  <TransitionLink href={l.href} className="link-draw hover:text-ink max-sm:py-3">
                    {l.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
