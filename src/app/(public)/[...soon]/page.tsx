import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/app/SiteShell";
import { Button, Eyebrow, GridLines } from "@/components/editorial";
import { FLAGSHIP } from "@/lib/content/site";

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
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

const SOON: Record<string, Soon> = {
  faq: {
    label: "FAQ",
    title: "Help centre",
    body: "The full help centre is still being written. The questions people ask most (free first lesson, tool costs, access, certificates) are already answered on the home page.",
    primary: { label: "Read the top questions", href: "/#faq" },
    secondary: { label: "Ask us directly", href: "/contact" },
  },
  community: {
    label: "Community",
    title: "Community",
    body: "A place to share cuts, swap prompts and find collaborators in your city. We are building it with our first cohort, so it opens soon.",
    primary: { label: "See the course", href: FLAGSHIP.href },
    secondary: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
  },
  shop: {
    label: "Shop",
    title: "Studio shop",
    body: "Prompt books, LUT packs and slate tees are on the drawing board. Until then, the best thing we have is a free first lesson.",
    primary: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
    secondary: { label: "Back home", href: "/" },
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

export default async function ComingSoon({ params }: PageProps<"/[...soon]">) {
  const f = resolve((await params).soon);
  if (!f) notFound();

  return (
    <SiteShell flush headerLight>
      <section className="theatre relative flex min-h-[100svh] items-end overflow-hidden">
        <GridLines stops={[25, 75]} className="max-lg:hidden" />
        <div className="container-wide relative w-full pt-[calc(var(--header-offset)+var(--sat)+48px)] pb-[clamp(56px,10vh,120px)]">
          <div data-reveal="fade">
            <Eyebrow>{f.label}: coming soon</Eyebrow>
          </div>
          <h1 data-reveal="lines" className="t-display-hero mt-8 max-w-[10ch]">
            {f.title}
          </h1>
          <div className="mt-10 flex flex-col gap-8 lg:ml-[25%] lg:flex-row lg:items-end lg:justify-between">
            <p data-reveal="rise" className="t-body-l max-w-[32rem] text-cream/85">
              {f.body}
            </p>
            <div data-reveal="rise" data-reveal-delay="0.1" className="flex flex-wrap gap-3">
              <Button href={f.primary.href}>{f.primary.label}</Button>
              {f.secondary && (
                <Button href={f.secondary.href} variant="outline">
                  {f.secondary.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
