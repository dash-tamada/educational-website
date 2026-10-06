import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteShell, Icon } from "@/components/app";
import { Eyebrow, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Cloud } from "@/components/decor/Cloud";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { NotFoundSearch } from "@/components/auth/NotFoundSearch";
import { FieldBlobs } from "@/components/auth/AuthSplit";
import { getCourses, getTopCourses, getTutor } from "@/lib/mock";
import { cropSrc } from "@/lib/img";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const linksFor = (n: number) => [
  {
    href: "/courses",
    label: "Browse courses",
    body: `${n} courses, first video free`,
    icon: "search" as const,
    tone: "bg-sun",
  },
  {
    href: "/",
    label: "Back home",
    body: "Start from the top",
    icon: "home" as const,
    tone: "bg-cyan",
  },
  {
    href: "/become-tutor",
    label: "Teach on Tamada",
    body: "Turn your thing into a course",
    icon: "video" as const,
    tone: "bg-mint",
  },
  {
    href: "/contact",
    label: "Tell a human",
    body: "Report a broken link",
    icon: "chat" as const,
    tone: "bg-blush",
  },
];

export default function NotFound() {
  const top = getTopCourses(3);
  const LINKS = linksFor(getCourses({ pageSize: 1 }).total);
  // loginNext={false}: logging in from a 404 should not bounce back to the 404
  return (
    <SiteShell flush headerLight loginNext={false}>
      <section
        aria-labelledby="nf-title"
        data-field="dark"
        className="panel bg-blue text-white"
      >
        {/* a deeper local take on BlobSet "blue": the wave sits behind the body copy
            and the search, so it must stay dark enough for white text (5.9:1) */}
        <FieldBlobs colors={["#3f78ff", "#1d57e6", "#1748c4"]} />
        <Cloud
          size="m"
          delay={-6}
          className="absolute top-[22%] left-[4%] -z-10 hidden md:block"
        />
        <Cloud
          size="s"
          delay={-2}
          flip
          className="absolute top-[30%] right-[6%] -z-10"
        />

        <div className="relative container-narrow flex flex-col items-center pt-[calc(var(--header-offset)+40px)] pb-16 text-center md:pt-[calc(var(--header-offset)+56px)] md:pb-24">
          <Eyebrow tone="sun">Error 404</Eyebrow>
          <p
            className="mt-6 flex items-center justify-center font-display text-[clamp(7rem,4rem+16vw,15rem)] leading-[0.8] font-black text-butter"
            aria-hidden
          >
            <span>4</span>
            <span className="relative mx-[0.04em] inline-block w-[0.62em]">
              <span className="group block">
                <Mascot
                  interactive
                  wink
                  title=""
                  className="w-full animate-float"
                  style={{ transform: "rotate(-10deg)" }}
                />
              </span>
            </span>
            <span>4</span>
          </p>
          <h1 id="nf-title" className="mt-6 max-w-[14ch] t-display-l">
            This page wandered off.
          </h1>
          <p className="mt-sub max-w-[32rem] t-body-l text-white">
            The link might be old, mistyped, or the course moved. Tami checked
            behind the sofa. Nothing.
          </p>
          <div className="mt-8 flex w-full justify-center">
            <NotFoundSearch />
          </div>
          <div
            className="pointer-events-none absolute bottom-6 left-[2%] hidden w-[54px] lg:block"
            aria-hidden
          >
            <BlockBuddy
              body="#ffcf3f"
              head="#ff008c"
              hat="#00b351"
              className="w-full"
            />
          </div>
          <div
            className="pointer-events-none absolute right-0 bottom-10 hidden lg:block"
            aria-hidden
          >
            <Sticker tone="sun" size="sm" rotate={8}>
              lost? same.
            </Sticker>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="nf-links"
        className="container-x pt-12 pb-section md:pt-16"
      >
        <h2 id="nf-links" className="t-app-h2">
          Try one of these instead
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group hover-lift flex h-full items-center gap-4 rounded-card-lg bg-white p-4 shadow-soft"
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${l.tone}`}
                  aria-hidden
                >
                  <Icon name={l.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block t-app-h3">{l.label}</span>
                  <span className="mt-0.5 block t-small text-ink/70">
                    {l.body}
                  </span>
                </span>
                <Icon
                  name="arrow-right"
                  className="size-4 shrink-0 text-ink/40 transition-colors group-hf:text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 t-app-h2">Popular right now</h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {top.map((c) => (
            <li key={c.id}>
              <Link
                href={`/courses/${c.slug}`}
                className="group hover-lift flex h-full gap-3 rounded-card-lg bg-white p-3 shadow-soft lg:gap-4"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-img lg:size-20">
                  <Image
                    src={cropSrc(c.thumbnail, 1)}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0 py-1">
                  <span className="block t-app-h3">{c.title}</span>
                  <span className="mt-1 block t-small text-ink/70">
                    {getTutor(c.tutorId)?.name}
                  </span>
                  <span className="mt-2 inline-flex rounded-full bg-sun px-2 py-1 t-micro whitespace-nowrap">
                    First video free
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
