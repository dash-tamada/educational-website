"use client";

import { useId, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowLink, Eyebrow, GridLines, ParallaxPhoto, Photo, RedWords, SplitReveal } from "@/components/editorial";
import { COURSE_PAGE } from "@/lib/content/course";
import { DIRECTOR } from "@/lib/content/director";
import { TOOLS } from "@/lib/content/home";
import { getCourseAccess } from "@/lib/access";
import { cropSrc } from "@/lib/img";
import { formatDuration, formatNumber, getTutor } from "@/lib/mock";
import { courseFaqs } from "@/lib/mock/extra/catalog";
import Image from "next/image";
import { CertificateTeaser } from "./Certificate";
import { CourseCtas, PriceLockup } from "./Commerce";
import { courseFacts, isFlagship, useCourseState } from "./state";
import { PlayMark, SectionHead } from "./ui";

/* =============================================================================
   The course page's editorial sections (02, 03, 05-09, 11, final CTA + the FAQ for
   non-flagship courses). Grounds alternate: cream zone (with the purchase rail),
   then theatre / cream bands. Copy: src/lib/content/course.ts; live numbers from
   the demo store (useCourseState).
   ============================================================================= */

/* ---------------------------------------------------------------------------- 02 outcomes */
export function Outcomes({ courseId, index }: { courseId: string; index?: string }) {
  const { course } = useCourseState(courseId);
  if (!course || course.outcomes.length === 0) return null;
  const flagship = isFlagship(course);
  const st = COURSE_PAGE.outcomes.statement;
  return (
    <section aria-labelledby="outcomes-title">
      <Eyebrow index={index}>{flagship ? COURSE_PAGE.outcomes.label : "What you'll learn"}</Eyebrow>
      <SplitReveal as="h2" id="outcomes-title" className="t-statement-l mt-6 max-w-[26ch] md:mt-8">
        {flagship ? <RedWords text={st.text} red={st.red} /> : course.promise}
      </SplitReveal>
      <Reveal as="ol" stagger effect="fade" className="mt-10 grid border-t border-line-strong sm:grid-cols-2 sm:gap-x-[var(--grid-gap)] md:mt-14">
        {course.outcomes.map((o, i) => (
          <li key={o} className="grid grid-cols-[44px_1fr] items-baseline border-b border-line py-5 md:grid-cols-[52px_1fr] md:py-6">
            <span className="t-timecode text-red">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-heading text-[clamp(1.0625rem,0.98rem+0.4vw,1.3125rem)] leading-[1.25] font-medium tracking-[-0.02em]">{o}</span>
          </li>
        ))}
      </Reveal>
    </section>
  );
}

/* ---------------------------------------------------------------------------- 03 who it's for */
export function Audience({ courseId, index }: { courseId: string; index?: string }) {
  const { course } = useCourseState(courseId);
  if (!course) return null;
  const flagship = isFlagship(course);
  const a = COURSE_PAGE.audience;
  const reqs = course.requirements.length ? course.requirements : ["Curiosity and a laptop. That's it."];
  return (
    <section aria-labelledby={flagship ? "audience-title" : undefined} aria-label={flagship ? undefined : a.before}>
      <SectionHead index={index} label={flagship ? a.label : a.before} title={flagship ? a.title : undefined} id="audience-title" />
      {flagship && (
        <Reveal as="ul" stagger effect="rise" y={24} className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 md:mt-12">
          {a.items.map((it, i) => (
            <li key={it.who} className="bg-surface p-6 md:p-8">
              <p className="t-timecode text-muted">For / {String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-6 font-heading text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-[1.05] font-semibold tracking-[-0.035em] md:mt-10">{it.who}</h3>
              <p className="t-small mt-3 max-w-[30rem] text-muted">{it.body}</p>
            </li>
          ))}
        </Reveal>
      )}
      <div className={clsx("grid gap-y-4", flagship ? "mt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-x-[var(--grid-gap)]" : "mt-6")}>
        {flagship && <h3 className="t-label pt-1">{a.before}</h3>}
        <ul className="border-t border-line">
          {reqs.map((r) => (
            <li key={r} className="t-body flex gap-4 border-b border-line py-3.5">
              <span aria-hidden className="mt-[0.55em] block h-px w-4 shrink-0 bg-fg" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------- 05 capstone */
export function Capstone({ index }: { index?: string }) {
  const c = COURSE_PAGE.capstone;
  return (
    <section aria-labelledby="capstone-title" className="theatre relative overflow-hidden">
      <GridLines stops={[50]} className="max-lg:hidden" />
      <div className="container-wide edit-grid relative gap-y-12 py-section">
        <div className="col-span-12 lg:col-span-6">
          <Eyebrow index={index}>{c.label}</Eyebrow>
          <h2 id="capstone-title" className="mt-8 font-display uppercase">
            <SplitReveal as="span" className="t-display-m block text-ash">
              {c.titleTop}
            </SplitReveal>
            <SplitReveal as="span" delay={0.08} className="t-display-xl block">
              {c.title}
            </SplitReveal>
          </h2>
          <p className="t-body-l mt-8 max-w-[34rem] text-cream/80">{c.body}</p>
          <figure className="mt-10 lg:mt-14 lg:max-w-[86%]">
            <ParallaxPhoto k={c.image} sizes="(min-width: 1024px) 44vw, 100vw" amount={8} className="aspect-[16/10]" />
            <figcaption className="t-timecode mt-3 text-ash">{c.caption}</figcaption>
          </figure>
        </div>
        <Reveal as="ol" stagger effect="rise" y={28} className="col-span-12 self-start border-t border-line-strong lg:col-span-6 lg:mt-[clamp(64px,9vw,136px)]">
          {c.steps.map((st, i) => (
            <li key={st.title} className="grid grid-cols-[80px_1fr] gap-x-4 border-b border-line py-6 sm:grid-cols-[120px_1fr] md:py-8">
              <p className={clsx("t-timecode pt-[0.35em]", i === c.steps.length - 1 ? "text-red-lite" : "text-ash")}>{st.when}</p>
              <div>
                <h3 className="font-heading text-[clamp(1.25rem,1.05rem+0.8vw,1.75rem)] leading-[1.1] font-semibold tracking-[-0.03em]">{st.title}</h3>
                <p className="t-small mt-2 max-w-[28rem] text-cream/65">{st.body}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------- 06 tools strip */
export function ToolsStrip({ index }: { index?: string }) {
  const names = TOOLS.rows.flatMap((r) => r.tool.split(" · "));
  const run = (hidden?: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {names.map((n) => (
        <li key={n} className="flex items-center whitespace-nowrap">
          <span className="font-heading text-[clamp(2.25rem,1.4rem+3.6vw,5.5rem)] leading-none font-semibold tracking-[-0.045em]">{n}</span>
          <span aria-hidden className="mx-[clamp(20px,3vw,48px)] block size-[clamp(8px,0.9vw,12px)] bg-red" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="tools-title" className="ground-cream-2 relative overflow-hidden">
      <div className="container-wide edit-grid gap-y-6 pt-[calc(var(--section-y)*0.7)] pb-10 md:pb-14">
        <div className="col-span-12 md:col-span-4">
          <Eyebrow index={index}>{COURSE_PAGE.tools.label}</Eyebrow>
        </div>
        <div className="col-span-12 md:col-span-8">
          <h2 id="tools-title" className="t-statement-m max-w-[38ch]">
            {COURSE_PAGE.tools.line}
          </h2>
        </div>
      </div>
      {/* the strip: a slow marquee (static and wrapped under reduced motion) */}
      <div className="border-y border-line py-7 md:py-10">
        <div className="flex w-max animate-marquee-slow motion-reduce:hidden">
          {run()}
          {run(true)}
        </div>
        <ul className="container-wide hidden flex-wrap gap-x-8 gap-y-3 motion-reduce:flex">
          {names.map((n) => (
            <li key={n} className="font-heading text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-none font-semibold tracking-[-0.04em]">
              {n}
            </li>
          ))}
        </ul>
      </div>
      <dl className="container-wide grid gap-x-[var(--grid-gap)] pt-8 pb-[calc(var(--section-y)*0.7)] sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.rows.map((r) => (
          <div key={r.tool} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-line py-3.5">
            <dt className="t-small min-w-0">
              <span className="font-semibold">{r.tool}</span>
              <span className="text-muted"> · {r.use}</span>
            </dt>
            <dd className="t-timecode text-muted">M{r.module}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------------------------------------------------------- 07 director */
export function DirectorBlock({ courseId, index }: { courseId: string; index?: string }) {
  const { course, db } = useCourseState(courseId);
  const tutor = course ? getTutor(course.tutorId, db) : null;
  if (!course || !tutor) return null;
  const isDirector = tutor.slug === DIRECTOR.slug;
  const d = COURSE_PAGE.director;
  const quote = isDirector ? d.quote : null;
  const href = isDirector ? d.cta.href : `/tutors/${tutor.slug}`;
  const facts = isDirector
    ? DIRECTOR.facts
    : [
        { value: tutor.reviewCount ? tutor.rating.toFixed(1) : "New", label: "Tutor rating" },
        { value: formatNumber(tutor.learners), label: "Learners" },
        { value: String(tutor.yearsTeaching), label: tutor.yearsTeaching === 1 ? "Year teaching" : "Years teaching" },
      ];
  const [first, ...rest] = tutor.name.split(" ");
  return (
    <section aria-labelledby="director-name" className="theatre relative overflow-hidden">
      <div className="container-wide edit-grid gap-y-10 py-section">
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          {isDirector ? (
            <ParallaxPhoto k={d.portrait} sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw" amount={7} className="aspect-[4/5]" />
          ) : tutor.avatar ? (
            <div className="media-frame relative aspect-[4/5]">
              <Image src={cropSrc(tutor.avatar, 5 / 4)} alt={`Portrait of ${tutor.name}`} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          ) : (
            <div className="grid aspect-[4/5] place-items-center border border-line-strong font-display text-[clamp(6rem,4rem+8vw,10rem)] leading-none" aria-hidden>
              {tutor.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")}
            </div>
          )}
        </div>
        <div className="col-span-12 flex flex-col md:col-span-6 lg:col-span-6 lg:col-start-7">
          <Eyebrow index={index}>{d.label}</Eyebrow>
          <h2 id="director-name" className="t-display-xl mt-8 font-display uppercase">
            <SplitReveal as="span" className="block">
              {first}
            </SplitReveal>
            {rest.length > 0 && (
              <SplitReveal as="span" delay={0.08} className="block">
                {rest.join(" ")}
              </SplitReveal>
            )}
          </h2>
          <p className="t-label mt-5 text-ash">{isDirector ? `${DIRECTOR.role} · ${DIRECTOR.city}` : `${tutor.headline}${tutor.city ? ` · ${tutor.city}` : ""}`}</p>
          {quote ? (
            <blockquote className="t-statement-m mt-10 max-w-[30ch] text-cream">
              &ldquo;
              <RedWords text={quote.text} red={quote.red ? [quote.red] : []} redClass="text-red-lite" />
              &rdquo;
            </blockquote>
          ) : null}
          <p className={clsx("t-body max-w-[34rem] text-cream/75", quote ? "mt-6" : "mt-10")}>{isDirector ? DIRECTOR.short : tutor.bio.split("\n")[0]}</p>
          <dl className="mt-10 grid grid-cols-3 border-t border-line-strong">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col-reverse border-r border-line py-5 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
                <dt className="t-label mt-2 text-ash">{f.label}</dt>
                <dd className="font-display text-[clamp(2.25rem,1.6rem+2.4vw,4rem)] leading-none">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10">
            <ArrowLink href={href} size="lg">
              {isDirector ? d.cta.label : `More about ${first}`}
            </ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------- 09 certificate */
export function CertificateSection({ courseId, index }: { courseId: string; index?: string }) {
  const { course, db } = useCourseState(courseId);
  if (!course || !course.hasCertificate) return null;
  const c = COURSE_PAGE.certificate;
  const tutor = getTutor(course.tutorId, db);
  const title = course.certificateTitle ?? course.title;
  return (
    <section aria-labelledby="certificate-title" className="theatre-night relative overflow-hidden">
      <div className="container-wide edit-grid items-center gap-y-12 py-section">
        <div className="col-span-12 lg:col-span-5">
          <Eyebrow index={index}>{c.label}</Eyebrow>
          <SplitReveal as="h2" id="certificate-title" className="t-headline-xl mt-8 max-w-[10ch]">
            {title}
          </SplitReveal>
          <p className="t-body-l mt-8 max-w-[30rem] text-cream/75">{c.body}</p>
          <div className="mt-8">
            <ArrowLink href={c.cta.href} size="lg">
              {c.cta.label}
            </ArrowLink>
          </div>
        </div>
        <Reveal effect="scale" className="col-span-12 lg:col-span-6 lg:col-start-7">
          <div aria-hidden>
            <CertificateTeaser title={title} name={c.sampleName} course={course.title} director={tutor?.name ?? DIRECTOR.name} code={c.sampleCode} />
          </div>
          <p className="t-timecode mt-4 text-ash">Sample · your name and a verify code go here</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------- 11 first lesson free */
export function FreeLesson({ courseId, index }: { courseId: string; index?: string }) {
  const s = useCourseState(courseId);
  const { course } = s;
  const lesson = s.free?.type === "video" ? s.free.lesson : null;
  if (!course || !lesson || course.status !== "published" || s.mode === "enrolled") return null;
  const f = COURSE_PAGE.free;
  return (
    <section aria-labelledby="free-title" data-ground="dark" className="relative isolate overflow-hidden bg-ink text-cream">
      <Link href={s.freeHref} className="group block" aria-label={`${f.title}: ${lesson.title}. Free, ${formatDuration(lesson.durationSec, "long")}.`}>
        <div className="absolute inset-0 -z-10">
          <Photo k={f.image} fill sizes="100vw" className="hover-zoom-parent" imgClassName="hover-zoom opacity-70" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
        </div>
        <div className="container-wide flex min-h-[78svh] flex-col justify-between gap-12 py-[calc(var(--section-y)*0.6)] md:min-h-[86svh]">
          <div className="flex items-start justify-between gap-6">
            <Eyebrow index={index} className="text-cream">
              {f.label}
            </Eyebrow>
            <p className="t-timecode text-cream/80">{formatDuration(lesson.durationSec, "clock")}</p>
          </div>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h2 id="free-title" className="t-display-xxl font-display uppercase">
                {f.title}
              </h2>
              <p className="t-statement-m mt-5 max-w-[30ch] text-cream/90">{lesson.title}</p>
              <p className="t-label mt-4 text-cream/70">{f.note}</p>
            </div>
            <PlayMark size="size-24 md:size-32" />
          </div>
        </div>
      </Link>
    </section>
  );
}

/* ---------------------------------------------------------------------------- final CTA */
export function FinalCta({ courseId }: { courseId: string }) {
  const s = useCourseState(courseId);
  const { course } = s;
  if (!course) return null;
  const f = COURSE_PAGE.final;
  const flagship = isFlagship(course);
  const facts = courseFacts(course, s.db);
  const owned = s.mode === "enrolled";
  return (
    <section aria-labelledby="final-title" className="theatre relative overflow-hidden border-b border-line">
      <div className="container-wide relative py-section">
        <p className="t-timecode text-ash">
          {flagship ? COURSE_PAGE.hero.kicker : course.title} · {facts.runtime}
        </p>
        <h2 id="final-title" className="t-display-xxl mt-8 max-w-[12ch] font-display uppercase">
          <SplitReveal as="span" className="block">
            {owned ? f.owned : <RedWords text={f.text} red={f.red} />}
          </SplitReveal>
        </h2>
        <div className="mt-12 flex flex-col gap-8 border-t border-line pt-8 lg:flex-row lg:items-end lg:justify-between">
          <PriceLockup courseId={courseId} />
          <CourseCtas courseId={courseId} full />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------- FAQ (non-flagship) */
/** Course-specific FAQ from the mock (on-sale answers follow the live status), FaqList look. */
export function CourseFaq({ courseId, index }: { courseId: string; index?: string }) {
  const s = useCourseState(courseId);
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  const { course, db, session } = s;
  if (!course) return null;
  const access = getCourseAccess(session, course, db);
  const tutor = getTutor(course.tutorId, db);
  const items = courseFaqs(course, courseFacts(course, db).stats, tutor, { learnerOwns: access.enrolled && !access.owner && !access.admin });
  return (
    <section aria-labelledby="cfaq-title" className="ground-cream relative">
      <div className="container-wide edit-grid gap-y-10 py-section">
        <div className="col-span-12 lg:col-span-4">
          <Eyebrow index={index}>FAQ</Eyebrow>
          <h2 id="cfaq-title" className="t-headline-m mt-6">
            Good to know.
          </h2>
        </div>
        <ul className="col-span-12 border-t border-line lg:col-span-8 lg:col-start-5">
          {items.map((f, i) => {
            const isOpen = open === i;
            const id = `${base}-${i}`;
            return (
              <li key={f.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`${id}-a`}
                    id={`${id}-q`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group grid w-full grid-cols-[28px_1fr] items-start gap-x-4 py-6 text-left sm:grid-cols-[44px_1fr] sm:gap-x-6"
                  >
                    <span aria-hidden className="faq-plus relative mt-[0.4em] block size-[18px]">
                      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                      <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                    </span>
                    <span className="font-heading text-[clamp(1.25rem,1rem+1vw,1.875rem)] leading-[1.1] font-semibold tracking-[-0.03em] transition-colors duration-300 group-hf:text-red">{f.q}</span>
                  </button>
                </h3>
                <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="faq-panel" data-open={isOpen ? "" : undefined} inert={!isOpen}>
                  <div>
                    <p className="t-body max-w-[36rem] pb-7 pl-[44px] text-muted sm:pl-[68px]">{f.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
