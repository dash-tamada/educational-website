import type { Metadata } from "next";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { Header } from "@/components/landing/Header";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { ArrowButton, BlobSet, Eyebrow, type BlobTone, type BtnVariant } from "@/components/decor/Bits";
import type { Tone } from "@/lib/landing-data";

/**
 * "Coming soon" stand-ins for the few public URLs that are linked but not built
 * yet. Only the slugs listed in SOON render here; every other unknown URL is a
 * real 404 (src/app/not-found.tsx). Add a slug here when you link to a page that
 * does not exist yet, and remove it when the real route lands.
 */
type Soon = {
  label: string;
  title: string;
  body: string;
  /** field + text colours (one bold field per screen) */
  bg: string;
  heading: string;
  copy: string;
  eyebrow: Tone;
  blob?: BlobTone;
  dark: boolean;
  primary: { label: string; href: string; variant: BtnVariant };
  secondary?: { label: string; href: string; variant: BtnVariant };
};

const SOON: Record<string, Soon> = {
  faq: {
    label: "FAQ",
    title: "Help centre",
    body: "The full help centre is still being written. The questions people ask most (free first videos, tests, refunds, certificates) are already answered on the home page.",
    bg: "bg-blue",
    heading: "text-white",
    copy: "text-white/85",
    eyebrow: "sun",
    blob: "blue",
    dark: true,
    primary: { label: "Read the top questions", href: "/#faq", variant: "paper" },
    secondary: { label: "Ask us directly", href: "/contact", variant: "sun" },
  },
  community: {
    label: "Community",
    title: "Community",
    body: "A place to swap notes, share projects and find study buddies in your city. We are building it with our first learners, so it opens soon.",
    bg: "bg-green",
    heading: "text-mint",
    copy: "text-white/90",
    eyebrow: "white",
    blob: "green",
    dark: true,
    primary: { label: "Browse courses", href: "/courses", variant: "paper" },
    secondary: { label: "Start free", href: "/signup", variant: "forest" },
  },
  shop: {
    label: "Shop",
    title: "Merch shop",
    body: "Tami tees, sticker sheets and desk notebooks are on the drawing board. Until then, the best thing we sell is a free first video.",
    bg: "bg-hotpink",
    heading: "text-white",
    copy: "text-white/90",
    eyebrow: "sun",
    dark: true,
    primary: { label: "Watch a free lesson", href: "/courses", variant: "paper" },
    secondary: { label: "Back home", href: "/", variant: "sun" },
  },
};

/** Prerender the known slugs; anything else is a 404 without running the page. */
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(SOON).map((slug) => ({ soon: [slug] }));
}

function resolve(soon: string[]): Soon | null {
  if (soon.length !== 1) return null;
  const key = decodeURIComponent(soon[0] ?? "").toLowerCase();
  return Object.hasOwn(SOON, key) ? SOON[key] : null;
}

export async function generateMetadata({ params }: PageProps<"/[...soon]">): Promise<Metadata> {
  const s = resolve((await params).soon);
  return { title: s ? `${s.title}: coming soon` : "Page not found", robots: { index: false } };
}

// The entrance uses the data-reveal API, which waits for the route curtain to reveal.
export default async function ComingSoon({ params }: PageProps<"/[...soon]">) {
  const f = resolve((await params).soon);
  if (!f) notFound();

  return (
    <>
      <Header light={f.dark} />
      <main
        id="main"
        data-field={f.dark ? "dark" : undefined}
        className={clsx("field grid min-h-dvh place-items-center overflow-hidden", f.bg)}
      >
        {f.blob && <BlobSet tone={f.blob} parallax={false} />}

        <Cloud size="l" delay={-6} className="absolute top-[16%] left-[-40px] -z-10 md:top-[20%] md:left-[6%]" />
        <Cloud size="m" delay={-12} flip className="absolute top-[12%] right-[-20px] -z-10 md:top-[26%] md:right-[8%]" />
        <Cloud size="s" delay={-3} className="absolute right-[12%] bottom-[12%] -z-10 md:right-[20%] md:bottom-[16%]" />

        <div className="container-narrow relative flex flex-col items-center pt-[calc(var(--header-offset)+24px)] pb-section text-center">
          <div data-reveal="pop" className="group w-[120px] md:w-[160px]">
            <Mascot interactive title="" className="w-full animate-float" style={{ transform: "rotate(-6deg)" }} />
          </div>
          <div data-reveal="pop" data-reveal-delay="0.1" className="mt-8">
            <Eyebrow tone={f.eyebrow}>{f.label}: coming soon</Eyebrow>
          </div>
          <h1 data-reveal="lines" className={clsx("t-display-xxl mt-eyebrow", f.heading)}>
            {f.title}
          </h1>
          <p data-reveal="rise" data-reveal-delay="0.15" className={clsx("t-body-l mt-sub max-w-[32rem]", f.copy)}>
            {f.body}
          </p>
          <div data-reveal="rise" data-reveal-delay="0.25" className="mt-cta flex flex-wrap justify-center gap-3">
            <ArrowButton href={f.primary.href} variant={f.primary.variant}>
              {f.primary.label}
            </ArrowButton>
            {f.secondary && (
              <ArrowButton href={f.secondary.href} variant={f.secondary.variant}>
                {f.secondary.label}
              </ArrowButton>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
