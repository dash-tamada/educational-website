import type { Metadata } from "next";
import clsx from "clsx";
import { Header } from "@/components/landing/Header";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { ArrowButton, BlobSet, Eyebrow, type BlobTone, type BtnVariant } from "@/components/decor/Bits";
import type { Tone } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: "Coming soon",
  robots: { index: false },
};

/** Route -> accent field (matches the route curtain's destination colour). */
type Field = {
  label: string;
  bg: string;
  title: string;
  body: string;
  eyebrow: Tone;
  button: BtnVariant;
  blob?: BlobTone;
  dark: boolean;
};

const FIELDS: Record<string, Field> = {
  login: { label: "Log in", bg: "bg-blue", title: "text-white", body: "text-white/85", eyebrow: "sun", button: "paper", blob: "blue", dark: true },
  signup: { label: "Sign up", bg: "bg-hotpink", title: "text-white", body: "text-white/90", eyebrow: "sun", button: "paper", dark: true },
  courses: { label: "Courses", bg: "bg-sun", title: "text-ink", body: "text-ink/75", eyebrow: "blue", button: "pink", blob: "sun", dark: false },
  "become-tutor": { label: "Become a tutor", bg: "bg-green", title: "text-mint", body: "text-white/90", eyebrow: "white", button: "forest", blob: "green", dark: true },
  admin: { label: "Admin", bg: "bg-purple", title: "text-white", body: "text-white/80", eyebrow: "white", button: "paper", blob: "purple", dark: true },
};

const fallback = (label: string): Field => ({
  label,
  bg: "bg-flame",
  title: "text-butter",
  body: "text-white/90",
  eyebrow: "white",
  button: "paper",
  blob: "flame",
  dark: true,
});

// Temporary stand-in for routes built in later milestones (login, catalog, dashboards…).
// The entrance uses the data-reveal API, which waits for the route curtain to reveal.
export default async function ComingSoon({ params }: PageProps<"/[...soon]">) {
  const { soon } = await params;
  const key = decodeURIComponent(soon[0] ?? "").toLowerCase();
  const f = FIELDS[key] ?? fallback(key.replace(/-/g, " ") || "This page");

  return (
    <>
      <Header light={f.dark} />
      <main
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
            <Eyebrow tone={f.eyebrow}>{f.label}</Eyebrow>
          </div>
          <h1 data-reveal="lines" className={clsx("t-display-xxl mt-eyebrow", f.title)}>
            Coming soon
          </h1>
          <p data-reveal="rise" data-reveal-delay="0.15" className={clsx("t-body-l mt-sub max-w-[30rem]", f.body)}>
            We&apos;re still building this part of Tamada Media. Check back
            shortly, or start with a free first video.
          </p>
          <div data-reveal="rise" data-reveal-delay="0.25" className="mt-cta flex flex-wrap justify-center gap-3">
            <ArrowButton href="/" variant={f.button}>
              Back home
            </ArrowButton>
          </div>
        </div>
      </main>
    </>
  );
}
