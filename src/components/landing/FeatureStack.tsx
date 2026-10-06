"use client";

import Image from "next/image";
import { cropSrc } from "@/lib/img";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { features, toneBg, toneHex, toneText } from "@/lib/landing-data";
import { gsap, useGSAP } from "@/lib/gsap";
import { ArrowButton, HighlightBox, SectionHead } from "@/components/decor/Bits";
import { ScallopBadge } from "@/components/decor/Scallop";
import { Mascot } from "@/components/decor/Mascot";
import { snappedIndex } from "./ScrollIndicator";

/** Sticky top of every folder (>=1024): header (~88px) + 24px breathing room. */
const STACK_TOP = 112;
/** Image drift inside its frame, in % of the frame height (each way). */
const DRIFT = 6;
/** A covered folder's copy is fully faded this many px before the incoming folder reaches it… */
const FADE_GAP = 16;
/** …over this much scroll. */
const FADE_LEN = 150;

const MQ_STACK = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const MQ_TABLET = "(min-width: 768px) and (max-width: 1023.98px) and (prefers-reduced-motion: no-preference)";
const MQ_PHONE = "(max-width: 767.98px) and (prefers-reduced-motion: no-preference)";

function TabIcon({ name }: { name: (typeof features)[number]["icon"] }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" aria-hidden>
      {name === "play" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="4" {...p} />
          <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "check" && (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M8 12.3l2.7 2.7L16 9.6" {...p} />
        </>
      )}
      {name === "chart" && <path d="M4 19V11M10 19V6M16 19v-5M21 19H3" {...p} />}
      {name === "tutor" && (
        <>
          <circle cx="12" cy="8" r="3.6" {...p} />
          <path d="M5 20c.8-3.8 3.6-5.6 7-5.6s6.2 1.8 7 5.6" {...p} />
        </>
      )}
    </svg>
  );
}

/** One slanted, round-topped side of a folder tab (filled with currentColor). */
function TabSide({ flip, className }: { flip?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 56"
      preserveAspectRatio="none"
      className={clsx("h-full w-7 shrink-0", className)}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path
        d="M0 56 C6 56 8.5 53 10 48 L19.5 9 C21 3.5 23.5 0 28.5 0 L28.5 56 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Check() {
  return (
    <span
      aria-hidden
      className="mt-[0.1em] grid size-[1.35em] shrink-0 place-items-center rounded-full bg-sun text-ink"
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Phones (< 640px): ONE folder at a time. A sticky, horizontally scrollable row of
 * folder tabs sits on top of a snap row of the four folder bodies; swiping the
 * bodies moves the active tab (and scrolls it into view), tapping a tab slides to
 * its folder. While stuck it rides below the marketing header when that is shown.
 */
function PhoneTabs({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // keep the active tab in view (centred) when it changes
  useEffect(() => {
    const r = row.current;
    const tab = r?.children[active] as HTMLElement | undefined;
    if (!r || !tab || r.scrollWidth <= r.clientWidth) return;
    const left = tab.offsetLeft - (r.clientWidth - tab.offsetWidth) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    r.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  // stuck state (solid backing) + ride below the header while it is shown
  useEffect(() => {
    const w = wrap.current;
    const s = sentinel.current;
    if (!w || !s) return;
    const io = new IntersectionObserver(([e]) => w.toggleAttribute("data-stuck", !e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
    });
    io.observe(s);
    // mirror the Header's rule: shown near the top and on scroll up, hidden on scroll down
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      let shown = w.dataset.header !== "hidden";
      if (y < 80) shown = true;
      else if (Math.abs(y - last) > 6) shown = y < last;
      if (y < 80 || Math.abs(y - last) > 6) last = y;
      const header = document.querySelector<HTMLElement>("header.fixed");
      w.dataset.header = shown ? "shown" : "hidden";
      w.style.setProperty("--hdr", shown && header ? `${header.offsetHeight}px` : "0px");
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="mt-[calc(var(--gap-block)-9px)] h-px sm:hidden" />
      <div
        ref={wrap}
        className="sticky top-[calc(max(0px,var(--sat))+var(--hdr,0px))] z-20 -mx-gutter px-gutter pt-2 transition-[top,background-color] duration-500 ease-ui data-[stuck]:bg-cream sm:hidden"
      >
        <div
          ref={row}
          role="group"
          aria-label="Core features"
          className="no-scrollbar -mb-px flex items-end gap-1.5 overflow-x-auto overscroll-x-contain"
        >
          {features.map((f, i) => {
            const on = i === active;
            return (
              <button
                key={f.tab}
                type="button"
                aria-current={on ? "true" : undefined}
                aria-controls={`feature-body-${i + 1}`}
                onClick={() => onPick(i)}
                className={clsx(
                  "tap flex shrink-0 items-center gap-2 rounded-t-[18px] px-4 transition-[height,background-color,color] duration-300 ease-ui",
                  on ? clsx("h-12", toneBg[f.tone], toneText[f.tone]) : "h-11 bg-white text-ink/75",
                )}
              >
                <span style={on ? undefined : { color: toneHex[f.tone] }} className="flex">
                  <TabIcon name={f.icon} />
                </span>
                <span className="t-label whitespace-nowrap">{f.tab}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * Krackerz folder-tab stack, recoloured to Maxima fields (blue / green / flame /
 * purple). >=1024: every folder sticks at the SAME top and every body has the
 * SAME fixed height, so the incoming body covers the previous one completely and
 * only the earlier TABS stay visible, side by side in one row. While a folder is
 * being covered its content recedes (scale + fade + dim), and each photo drifts
 * inside its frame. Below 1024 and under reduced motion: a plain list of cards.
 */
export function FeatureStack() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Phones: the folder bodies are a snap row; the snapped one is the active tab.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (el.scrollWidth <= el.clientWidth + 2) return;
      const bodies = Array.from(el.querySelectorAll<HTMLElement>("[data-feat-article]"));
      // snappedIndex works on direct children; the articles are the only visible ones
      const i = snappedIndex(el);
      const kids = Array.from(el.children);
      const idx = bodies.indexOf(kids[i] as HTMLElement);
      if (idx >= 0) setActive(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const pick = useCallback((i: number) => {
    const el = list.current;
    const art = el?.querySelectorAll<HTMLElement>("[data-feat-article]")[i];
    if (!el || !art) return;
    const left = el.scrollLeft + art.getBoundingClientRect().left - el.getBoundingClientRect().left;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    setActive(i);
  }, []);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      const markers = gsap.utils.toArray<HTMLElement>("[data-feat-marker]", el);
      const imgs = gsap.utils.toArray<HTMLElement>("[data-feat-img]", el);
      const contents = gsap.utils.toArray<HTMLElement>("[data-feat-content]", el);
      const dims = gsap.utils.toArray<HTMLElement>("[data-feat-dim]", el);
      const bodies = gsap.utils.toArray<HTMLElement>("[data-feat-body]", el);
      const tabs = gsap.utils.toArray<HTMLElement>("[data-feat-tab]", el);
      const list = el.querySelector<HTMLElement>("[data-feat-list]")!;
      const k = (DRIFT / (100 + 2 * (DRIFT + 1))) * 100;

      // Desktop: the stack. Triggers are the in-flow (non-sticky) markers, so
      // ScrollTrigger measures natural positions even while folders are stuck.
      mm.add(MQ_STACK, () => {
        const bodyH = () => bodies[0]?.offsetHeight ?? 560;
        imgs.forEach((img, i) => {
          const next = markers[i + 1];
          gsap.fromTo(
            img,
            { yPercent: -k },
            {
              yPercent: k,
              ease: "none",
              scrollTrigger: {
                trigger: markers[i],
                start: "top bottom",
                endTrigger: next ?? list,
                end: next ? `top ${STACK_TOP}px` : "bottom top",
                scrub: true,
                invalidateOnRefresh: true,
                onToggle: (s) => (img.style.willChange = s.isActive ? "transform" : ""),
              },
            },
          );
        });
        // While folder i is being covered, each piece of its copy (title, every
        // bullet, CTA, photo) fades out JUST BEFORE the incoming folder reaches it:
        // its tab if the piece sits under that tab's column, else its body edge.
        // So wherever the user stops scrolling, nothing is ever sliced or sits
        // under a tab. The body itself only dims (it is covered cleanly).
        contents.forEach((content, i) => {
          const next = markers[i + 1];
          const body = bodies[i];
          const tab = tabs[i + 1];
          if (!next || !body) return;
          const pieces = gsap.utils.toArray<HTMLElement>("[data-feat-fade]", content);
          pieces.forEach((piece) => {
            // distance from the incoming marker to STACK_TOP at which the piece
            // must be fully gone (layout boxes only: transforms are ignored)
            const hitAt = () => {
              let oy = 0;
              for (let n: HTMLElement | null = piece; n && n !== body; n = n.offsetParent as HTMLElement | null) {
                oy += n.offsetTop;
              }
              const bottom = oy + piece.offsetHeight;
              const tabH = tab?.offsetHeight ?? 56;
              let underTab = false;
              if (tab) {
                const a = tab.getBoundingClientRect();
                const b = piece.getBoundingClientRect();
                underTab = b.left < a.right && b.right > a.left;
              }
              return (underTab ? tabH : 0) + bottom + FADE_GAP;
            };
            gsap.fromTo(
              piece,
              { opacity: 1, y: 0 },
              {
                opacity: 0,
                y: -18,
                ease: "power1.in",
                scrollTrigger: {
                  trigger: next,
                  start: () => `top ${STACK_TOP + hitAt() + FADE_LEN}px`,
                  end: () => `top ${STACK_TOP + hitAt()}px`,
                  scrub: true,
                  invalidateOnRefresh: true,
                  onToggle: (s) => (piece.style.willChange = s.isActive ? "transform, opacity" : ""),
                },
              },
            );
          });
          gsap.fromTo(
            dims[i],
            { opacity: 0 },
            {
              opacity: 0.28,
              ease: "none",
              scrollTrigger: {
                trigger: next,
                start: () => `top ${STACK_TOP + bodyH()}px`,
                end: `top ${STACK_TOP}px`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      });

      // Tablet / phone: plain cards, photos drift inside their frames.
      mm.add({ tablet: MQ_TABLET, phone: MQ_PHONE }, (ctx) => {
        const f = ctx.conditions?.tablet ? 1 : 0.6;
        imgs.forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -k * f },
            {
              yPercent: k * f,
              ease: "none",
              scrollTrigger: {
                trigger: img.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="section-y relative" aria-labelledby="features-title">
      <div className="container-x">
        <SectionHead
          eyebrow="Core features"
          title={
            <span id="features-title">
              Built to make it{" "}
              <HighlightBox tone="lime" rotate={-3}>
                click
              </HighlightBox>
            </span>
          }
          body="Everything you need to actually finish a course, not just start one."
        />

        <PhoneTabs active={active} onPick={pick} />

        <div
          ref={list}
          data-feat-list
          className={clsx(
            "mt-head",
            // phones: one folder body per view, swipe between them
            "max-sm:no-scrollbar max-sm:mt-0 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:overflow-x-auto max-sm:overscroll-x-contain",
          )}
          style={{
            ["--stack-top" as string]: `${STACK_TOP}px`,
            ["--tab-w" as string]: "min(260px, calc((100% + 72px) / 4))",
          }}
        >
          {features.map((f, i) => {
            const last = i === features.length - 1;
            return (
              <div key={f.tab} className="contents">
                {/* in-flow marker at the folder's natural top: anchor + scroll trigger */}
                <div
                  id={`feature-${i + 1}`}
                  data-feat-marker
                  aria-hidden
                  className="h-0 max-sm:hidden"
                  style={{ scrollMarginTop: STACK_TOP }}
                />
                <article
                  id={`feature-body-${i + 1}`}
                  data-feat-article
                  aria-labelledby={`feature-title-${i + 1}`}
                  className={clsx(
                    "max-sm:flex max-sm:w-full max-sm:shrink-0 max-sm:snap-start max-sm:snap-always max-sm:flex-col",
                    // the article box is click-through, so a later (stacked) folder
                    // never blocks the earlier tabs that stay visible in the row
                    "pointer-events-none relative lg:motion-safe:sticky lg:motion-safe:top-[var(--stack-top)]",
                    !last && "sm:mb-5 md:mb-8 lg:mb-20",
                  )}
                >
                  {/* tab row: transparent except this folder's own tab (phones: PhoneTabs) */}
                  <div className="flex h-12 max-sm:hidden lg:h-14">
                    <a
                      href={`#feature-${i + 1}`}
                      data-feat-tab
                      className="group pointer-events-auto relative flex h-full shrink-0 [transition:translate_.35s_var(--ease-spring),filter_.25s_var(--ease-ui)] hf:-translate-y-[3px] hf:brightness-110 after:absolute after:inset-x-0 after:top-full after:h-1 after:bg-current max-lg:ml-0! lg:w-[var(--tab-w)]"
                      style={{
                        color: toneHex[f.tone],
                        marginLeft: `calc(${i} * (var(--tab-w) - 24px))`,
                      }}
                    >
                      {i > 0 && <TabSide className="max-lg:hidden" />}
                      <span
                        aria-hidden
                        className={clsx(
                          "w-5 shrink-0 rounded-tl-[20px] bg-current",
                          i > 0 && "lg:hidden",
                        )}
                      />
                      <span className="-mx-px flex min-w-0 flex-1 items-center justify-center bg-current px-1 pt-0.5">
                        <span className="flex items-center gap-2 whitespace-nowrap text-white">
                          <TabIcon name={f.icon} />
                          <span className="link-draw t-label">{f.tab}</span>
                        </span>
                      </span>
                      <TabSide flip />
                    </a>
                  </div>

                  {/* body: fixed height on desktop so it fully covers the folder below */}
                  <div
                    data-feat-body
                    className={clsx(
                      "pointer-events-auto relative isolate overflow-hidden rounded-card text-white max-sm:flex-1 lg:h-[clamp(480px,calc(100svh-208px),580px)]",
                      i === 0 ? "rounded-tl-none" : "max-lg:rounded-tl-none",
                      toneBg[f.tone],
                    )}
                  >
                    <div
                      data-feat-content
                      className="grid h-full gap-6 p-5 sm:p-8 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:p-12"
                    >
                      {/* photo first on small screens, right column on desktop */}
                      <div data-feat-fade className="relative md:order-2 md:h-full">
                        <div className="hover-zoom-parent hover-lift h-full rounded-[20px] bg-white p-2 shadow-photo">
                          <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-ink/10 sm:aspect-[4/3] md:aspect-auto md:h-full md:min-h-[340px] lg:min-h-0">
                            <div
                              data-feat-img
                              className="absolute inset-x-0"
                              style={{ top: `-${DRIFT + 1}%`, height: `${100 + 2 * (DRIFT + 1)}%` }}
                            >
                              <Image
                                src={cropSrc(f.img, 1.1)}
                                alt=""
                                fill
                                sizes="(min-width: 1024px) 640px, (min-width: 640px) 90vw, 100vw"
                                className="hover-zoom object-cover"
                              />
                            </div>
                          </div>
                        </div>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute -top-4 -right-2 md:top-8 md:right-auto md:-left-6 lg:top-10 lg:-left-11"
                        >
                          <ScallopBadge
                            fill="#ffcf3f"
                            bumps={12}
                            className="size-[68px] md:size-[88px]"
                            style={{ transform: `rotate(${i % 2 ? 10 : -8}deg)` }}
                          >
                            <span className="grid h-full place-items-center">
                              {last ? (
                                <Mascot className="w-[56%]" title="" />
                              ) : (
                                <span className="font-display text-[26px] leading-none text-ink md:text-[34px]">
                                  0{i + 1}
                                </span>
                              )}
                            </span>
                          </ScallopBadge>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col md:order-1 lg:py-1">
                        <h3
                          id={`feature-title-${i + 1}`}
                          data-feat-fade
                          className="t-display-m max-w-[14ch]"
                        >
                          {f.title}
                        </h3>
                        <ul className="t-body-l mt-4 space-y-3 sm:mt-5 md:mt-6">
                          {f.bullets.map((b) => (
                            <li key={b} data-feat-fade className="flex gap-3">
                              <Check />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        <div data-feat-fade className="mt-6 w-fit max-sm:mt-auto max-sm:pt-6 sm:mt-7 md:mt-auto md:pt-8">
                          <ArrowButton href={f.cta.href} variant="paper">
                            {f.cta.label}
                          </ArrowButton>
                        </div>
                      </div>
                    </div>
                    {/* dims the folder while the next one covers it */}
                    <div
                      data-feat-dim
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-ink opacity-0"
                    />
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
