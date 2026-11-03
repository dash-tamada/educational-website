"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon, Button, Eyebrow, GridLines } from "@/components/editorial";
import { cropSrc } from "@/lib/img";
import { useDb } from "@/lib/demo/store";
import { formatDate, formatINR, formatNumber, getCourseStats, getTutor, getTutorCourses, getTutorReviews, timeAgo, type Tutor } from "@/lib/mock";
import { firstName } from "@/lib/mock/extra/catalog";
import { MetaLine, MonoTag, Stars } from "./course/ui";

/* =============================================================================
   /tutors/[slug] (editorial). Only reached for tutors other than the lead
   director (his slug redirects to /about): e.g. a tutor approved in the admin demo.
   Theatre hero (portrait or initials, Anton name, headline, ruled stats), then on
   cream: about + facts, the tutor's courses as ruled rows, reviews as ruled rows.
   Reads the live demo store, so studio edits and new reviews show here.
   ============================================================================= */
export function TutorView({ tutor: initial }: { tutor: Tutor }) {
  const db = useDb();
  const tutor = getTutor(initial.userId, db) ?? initial;
  const first = firstName(tutor.name);
  const courses = getTutorCourses(tutor.userId, {}, db);
  const lessons = courses.reduce((n, c) => n + getCourseStats(c.id, db).videos, 0);
  const initials = tutor.name
    .replace(/^Dr\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const stats = [
    { label: "Tutor rating", value: tutor.reviewCount ? tutor.rating.toFixed(1) : "New" },
    { label: "Learners", value: formatNumber(tutor.learners) },
    { label: courses.length === 1 ? "Course" : "Courses", value: String(courses.length) },
    { label: tutor.yearsTeaching === 1 ? "Year teaching" : "Years teaching", value: String(tutor.yearsTeaching) },
  ];
  const [nameA, ...nameB] = tutor.name.split(" ");

  return (
    <>
      <section aria-labelledby="tutor-name" className="theatre relative overflow-hidden">
        <GridLines stops={[50]} className="top-[calc(var(--header-offset)+var(--sat))] max-lg:hidden" />
        <div className="container-wide edit-grid relative items-end gap-y-10 pt-[calc(var(--header-offset)+var(--sat)+40px)] pb-[clamp(40px,7vh,80px)] lg:min-h-[86svh]">
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            {tutor.avatar ? (
              <div className="media-frame relative aspect-[4/5]">
                <Image src={cropSrc(tutor.avatar, 5 / 4)} alt={`Portrait of ${tutor.name}`} fill preload sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
            ) : (
              <div className="grid aspect-[4/5] place-items-center border border-line-strong" role="img" aria-label={`${tutor.name} (no photo yet)`}>
                <span aria-hidden className="font-display text-[clamp(6rem,4rem+8vw,10rem)] leading-none">
                  {initials}
                </span>
              </div>
            )}
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <Eyebrow>{tutor.city ? `Tutor · ${tutor.city}` : "Tutor"}</Eyebrow>
            <h1 id="tutor-name" className="t-display-xxl mt-8 font-display uppercase">
              <span className="block">{nameA}</span>
              {nameB.length > 0 && <span className="block">{nameB.join(" ")}</span>}
            </h1>
            <p className="t-statement-m mt-6 max-w-[30ch] text-cream/85">{tutor.headline}</p>
            <dl className="mt-10 grid grid-cols-2 border-t border-line-strong sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse border-b border-line py-4 pr-3 sm:border-r sm:border-b-0 sm:[&:not(:first-child)]:pl-4 sm:last:border-r-0">
                  <dt className="t-label mt-2 text-ash">{s.label}</dt>
                  <dd className="font-display text-[clamp(2.25rem,1.6rem+2vw,3.5rem)] leading-none">{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="t-caption mt-4">Sample figures for the demo.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-tutor" className="ground-cream relative">
        <div className="container-wide edit-grid gap-y-10 py-section">
          <div className="col-span-12 lg:col-span-4">
            <Eyebrow index="01">About</Eyebrow>
            <h2 id="about-tutor" className="t-headline-l mt-6">
              About {first}
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <p className="t-body-l whitespace-pre-line">{tutor.bio}</p>
            {tutor.expertise.length > 0 && <MetaLine className="mt-8 text-muted" items={tutor.expertise} />}
            <dl className="mt-10 border-t border-line">
              {[
                ["Teaches in", tutor.languages.join(", ") || "English"],
                ["On Tamada since", formatDate(tutor.joinedAt, "long")],
                ["Lessons published", `${lessons} video${lessons === 1 ? "" : "s"}`],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line py-4">
                  <dt className="t-label text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {tutor.socials.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3" aria-label={`${first} elsewhere`}>
                {tutor.socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="group t-label inline-flex items-center gap-2">
                      <span className="link-draw">{s.label}</span>
                      <ArrowIcon dir="up-right" className="size-3" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <TutorCourses tutorId={tutor.userId} first={first} />
      <TutorReviews tutorId={tutor.userId} first={first} />
    </>
  );
}

/** The tutor's published courses as ruled rows (poster, title, facts, price). */
function TutorCourses({ tutorId, first }: { tutorId: string; first: string }) {
  const db = useDb();
  const published = getTutorCourses(tutorId, {}, db);
  const upcoming = getTutorCourses(tutorId, { all: true }, db).filter((c) => c.status === "in_review");
  return (
    <section aria-labelledby="tutor-courses" className="ground-cream-2 relative">
      <div className="container-wide edit-grid gap-y-10 py-section">
        <div className="col-span-12 lg:col-span-4">
          <Eyebrow index="02">Courses</Eyebrow>
          <h2 id="tutor-courses" className="t-headline-l mt-6">
            Learn with {first}
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          {published.length === 0 && upcoming.length === 0 ? (
            <p className="t-body-l border-t border-line pt-6 text-muted">{first} is still filming. Check back soon.</p>
          ) : (
            <ul className="border-t border-fg">
              {published.map((c) => {
                const st = getCourseStats(c.id, db);
                return (
                  <li key={c.id}>
                    <Link href={`/courses/${c.slug}`} className="group grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-5 border-b border-line py-5 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:gap-x-8">
                      <div className="media-frame relative aspect-[4/3]">
                        <Image src={cropSrc(c.thumbnail, 3 / 4)} alt="" fill sizes="160px" className="hover-zoom object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading text-[clamp(1.25rem,1rem+0.9vw,1.875rem)] leading-[1.08] font-semibold tracking-[-0.03em] transition-colors group-hf:text-red">{c.title}</p>
                        <MetaLine className="mt-3 text-muted" items={[`${st.videos} lessons`, `★ ${c.rating.toFixed(1)}`, `${formatNumber(c.learners)} learners`]} />
                      </div>
                      <p className="col-start-2 mt-3 flex items-center gap-4 sm:col-start-3 sm:mt-0">
                        <span className="font-display text-[1.75rem] leading-none">{formatINR(c.price)}</span>
                        <ArrowIcon className="size-4 transition-[translate] duration-500 ease-expo group-hf:translate-x-1" />
                      </p>
                    </Link>
                  </li>
                );
              })}
              {upcoming.map((c) => (
                <li key={c.id} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-x-8">
                  <MonoTag className="w-fit">Coming soon</MonoTag>
                  <div>
                    <p className="font-heading text-[clamp(1.25rem,1rem+0.9vw,1.875rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-muted">{c.title}</p>
                    <p className="t-small mt-2 text-muted">In review. It goes live once the team signs it off.</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Reviews across the tutor's live courses (sample data) as ruled rows. */
function TutorReviews({ tutorId, first }: { tutorId: string; first: string }) {
  const db = useDb();
  const [shown, setShown] = useState(6);
  const focusFrom = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (focusFrom.current === null) return;
    const i = focusFrom.current;
    focusFrom.current = null;
    listRef.current?.querySelectorAll<HTMLElement>(":scope > li")[i]?.focus();
  });
  const all = getTutorReviews(tutorId, db).filter((r) => !r.hidden && r.course?.status === "published");
  const list = all.slice(0, shown);
  const avg = all.length ? all.reduce((n, r) => n + r.rating, 0) / all.length : 0;
  return (
    <section aria-labelledby="tutor-reviews" className="ground-cream relative">
      <div className="container-wide edit-grid gap-y-10 py-section">
        <div className="col-span-12 lg:col-span-4">
          <Eyebrow index="03">Reviews</Eyebrow>
          <h2 id="tutor-reviews" className="t-headline-l mt-6">
            What learners say about {first}
          </h2>
          {all.length > 0 && (
            <p className="mt-8 flex items-end gap-3">
              <span className="font-display text-[clamp(5rem,3rem+6vw,8rem)] leading-[0.8]">{avg.toFixed(1)}</span>
              <span className="pb-1.5">
                <Stars value={avg} className="text-red" size="size-4" />
                <span className="t-label mt-2 block text-muted">
                  <span className="sr-only">out of 5, </span>
                  {all.length} review{all.length === 1 ? "" : "s"}
                </span>
              </span>
            </p>
          )}
          <p className="t-caption mt-6">Sample reviews (demo data).</p>
        </div>
        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          {all.length === 0 ? (
            <p className="t-body-l border-t border-line pt-6 text-muted">No reviews yet. {first}&apos;s first learners are still busy learning.</p>
          ) : (
            <>
              <ul ref={listRef} className="border-t border-fg">
                {list.map((r) => (
                  <li key={r.id} tabIndex={-1} className="grid gap-x-8 gap-y-3 border-b border-line py-8 focus-visible:outline-offset-[-2px] md:grid-cols-[180px_minmax(0,1fr)]">
                    <div>
                      <p className="font-medium">{r.user?.name ?? "A learner"}</p>
                      <p className="t-timecode mt-2 text-muted">
                        {r.user?.city ? `${r.user.city} · ` : ""}
                        {timeAgo(r.createdAt)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <Stars value={r.rating} className="text-red" />
                      <span className="sr-only">{r.rating} out of 5 stars</span>
                      {r.title && <h3 className="mt-3 font-heading text-[1.375rem] leading-[1.15] font-semibold tracking-[-0.025em]">{r.title}</h3>}
                      <p className="t-body mt-2">{r.comment}</p>
                      <p className="t-small mt-3 text-muted">
                        on{" "}
                        <Link href={`/courses/${r.course.slug}`} className="link-draw text-fg">
                          {r.course.title}
                        </Link>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {shown < all.length && (
                <div className="mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      focusFrom.current = list.length;
                      setShown((n) => n + 6);
                    }}
                  >
                    Show more reviews ({all.length - shown} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
