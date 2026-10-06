"use client";

import Link from "next/link";
import { EmptyState, Icon } from "@/components/app";
import { BlockBuddy } from "@/components/decor/BlockBuddy";
import { useDb } from "@/lib/demo/store";
import { getCategory, getTutorCourses } from "@/lib/mock";
import { CatalogCard } from "./CatalogCard";
import { SectionTitle } from "./ui";

/**
 * "Learn with <tutor>": the tutor's published courses (demo-store aware, so a
 * course the admin demo publishes shows up here), plus a "coming soon" card for
 * anything waiting in the review queue. Drafts stay private.
 */
export function TutorCourses({ tutorId, firstName }: { tutorId: string; firstName: string }) {
  const db = useDb();
  const published = getTutorCourses(tutorId, {}, db);
  const upcoming = getTutorCourses(tutorId, { all: true }, db)
    .filter((c) => c.status === "in_review")
    .slice(0, Math.max(1, 3 - (published.length % 3 || 3)));
  // "keep exploring" tiles so neither the 2-column (sm..lg) nor the 3-column (lg+)
  // grid ends on a lone orphan card
  const n = published.length + upcoming.length;
  const need2 = n > 1 && n % 2 === 1 ? 1 : 0;
  const need3 = n > 1 && n % 3 !== 0 ? 3 - (n % 3) : 0;
  const mainCat = published[0] ? getCategory(published[0].categoryId, db) : null;
  const fillers = Array.from({ length: Math.max(need2, need3) }, (_, i) => {
    const sm = i < need2;
    const lg = i < need3;
    return { i, className: ["hidden", sm && "sm:block", lg !== sm && (lg ? "lg:block" : "lg:hidden")].filter(Boolean).join(" ") };
  });

  return (
    <section aria-labelledby="tutor-courses">
      <SectionTitle
        kicker="Courses"
        title={`Learn with ${firstName}`}
        id="tutor-courses"
        action={
          published.length > 0 ? (
            <p className="text-[14px] font-semibold text-ink/60">
              {published.length === 1 ? "1 course · first video free" : `${published.length} courses · first video of each is free`}
            </p>
          ) : undefined
        }
      />
      {published.length === 0 && upcoming.length === 0 ? (
        <div className="mt-6 rounded-card-lg bg-white shadow-soft">
          <EmptyState title="First course loading…" body={`${firstName} is still filming. Check back soon.`} art="tami" />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((c) => (
            <li key={c.id}>
              <CatalogCard courseId={c.id} />
            </li>
          ))}
          {upcoming.map((c) => {
            const cat = getCategory(c.categoryId, db);
            return (
              <li key={c.id}>
                <article className="flex h-full min-h-[320px] flex-col rounded-card-lg bg-white/60 p-6 ring-2 ring-ink/10 ring-inset">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac px-3 py-1.5 text-[12.5px] font-bold">
                      <Icon name="clock" className="size-3.5" strokeWidth={2.4} />
                      Coming soon
                    </span>
                    <h3 className="t-chunky-card mt-4">{c.title}</h3>
                    <p className="mt-2 text-[15px] leading-snug text-ink/70">{c.promise}</p>
                  </div>
                  <div className="flex flex-1 items-end justify-center gap-3 py-6" aria-hidden>
                    <BlockBuddy body="#c9a8ff" head="#ffcf3f" hat="#2668fd" className="w-14" />
                    <BlockBuddy body="#ffcf3f" head="#f780d4" wave className="w-16" />
                  </div>
                  <p className="text-[13px] font-semibold text-ink/55">
                    {cat ? `${cat.name} · ` : ""}
                    {firstName} is putting the finishing touches on this one. It goes live once our review team signs it off.
                  </p>
                </article>
              </li>
            );
          })}
          {fillers.map(({ i, className }) => (
            <li key={`more-${i}`} className={className}>
              <ExploreTile
                variant={i}
                href={i === 0 && mainCat ? `/courses?category=${mainCat.slug}` : "/courses"}
                title={i === 0 && mainCat ? `More ${mainCat.name.toLowerCase()} rabbit holes` : "Every first video is free"}
                body={i === 0 && mainCat ? `Liked ${firstName}'s style? Other tutors teach ${mainCat.name.toLowerCase()} too. Their first videos are free as well.` : "Wander the whole library. Watch the first lesson of anything before you spend a rupee."}
                cta={i === 0 && mainCat ? `Browse ${mainCat.name}` : "Browse all courses"}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Filler tile that keeps the course grid's rows whole. */
function ExploreTile({ variant, href, title, body, cta }: { variant: number; href: string; title: string; body: string; cta: string }) {
  return (
    <article className={`group hover-lift relative flex h-full min-h-[320px] flex-col rounded-card-lg p-6 ${variant === 0 ? "bg-butter" : "bg-cyan"}`}>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold">
        <Icon name={variant === 0 ? "sparkles" : "play"} className="size-3.5" strokeWidth={2.4} />
        Keep exploring
      </span>
      <h3 className="t-chunky-card mt-4">
        <Link href={href} className="after:absolute after:inset-0 after:rounded-card-lg focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-4 focus-visible:after:outline-blue">
          {title}
        </Link>
      </h3>
      <p className="mt-2 text-[15px] leading-snug text-ink/75">{body}</p>
      <div className="flex flex-1 items-end justify-center gap-3 py-6" aria-hidden>
        {variant === 0 ? (
          <>
            <BlockBuddy body="#2668fd" head="#ffcf3f" wave className="w-14" />
            <BlockBuddy body="#ff008c" head="#a3f6f6" hat="#ffcf3f" className="w-12" />
          </>
        ) : (
          <BlockBuddy body="#ffcf3f" head="#ff008c" hat="#2668fd" wave className="w-16" />
        )}
      </div>
      <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-blue">
        {cta}
        <Icon name="arrow-right" className="size-4" strokeWidth={2.4} />
      </span>
    </article>
  );
}
