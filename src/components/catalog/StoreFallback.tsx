"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Skeleton } from "@/components/app";
import { ArrowLink, Button, Eyebrow, GridLines } from "@/components/editorial";
import { getCourseAccess } from "@/lib/access";
import { FLAGSHIP } from "@/lib/content/site";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { getCourseBySlug, getTutors, type Db } from "@/lib/mock";
import { CheckoutView } from "./CheckoutView";
import { CourseView } from "./CourseView";
import { TutorView } from "./TutorView";

/*
 * The server only knows the seed. Courses made in the tutor studio, tutors approved
 * by the admin demo, or status changes made in the demo store live in this browser.
 * So every /courses/[slug], /checkout/[slug] and /tutors/[slug] page renders one of
 * these resolvers (HTTP 200, no console 404): the server passes what it found in
 * the seed (`hasInitial`), the client re-resolves against the live store and
 * renders the real page, a skeleton while the store loads, or a friendly not-found.
 * Course + tutor pages open flush on a dark ground; checkout sits on cream.
 */

const segment = (pathname: string, i: number) => {
  try {
    return decodeURIComponent(pathname.split("/")[i] ?? "");
  } catch {
    return "";
  }
};

/** The not-found metadata says "… not found"; once the store has the page, fix the tab title. */
function useDocTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const want = `${title} | Tamada Media`;
    const apply = () => {
      if (document.title !== want) document.title = want;
    };
    apply();
    // streamed metadata can land after this effect and put the server title back
    const mo = new MutationObserver(apply);
    mo.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, [title]);
}

/** Slugs only (ids are not public URLs, so /courses/crs_aifilm stays a 404). */
const tutorBySlug = (slug: string, db: Db) => getTutors(db).find((t) => t.slug === slug) ?? null;

/** A visible course for this viewer, from the live store (seed during SSR + hydration). */
function useVisibleCourse(slug: string) {
  const db = useDb();
  const session = useDemoSession();
  const hydrated = useStoreHydrated();
  const course = slug ? getCourseBySlug(slug, db) : null;
  const access = course ? getCourseAccess(session, course, db) : null;
  const show = !!course && !!access && (access.visible || course.status === "archived");
  return { course: show ? course : null, hydrated };
}

export function CourseResolver({ slug, hasInitial }: { slug: string; hasInitial: boolean }) {
  const { course, hydrated } = useVisibleCourse(slug);
  // the server found it in the seed: its page is the first paint; drop the doc title fix
  useDocTitle(course ? (hasInitial ? null : course.title) : hydrated && hasInitial ? "Course not found" : null);
  if (course) return <CourseView key={course.id} course={course} />;
  if (!hydrated) return <PageSkeleton />;
  return (
    <Missing
      eyebrow="Course not found"
      title="This reel is missing."
      body={
        slug
          ? `There's no course at “${slug.slice(0, 60)}”. It may have been renamed or unpublished, or it only existed in another browser's demo data.`
          : "We couldn't find that course."
      }
    />
  );
}

export function CheckoutResolver({ slug, hasInitial, coupon }: { slug: string; hasInitial: boolean; coupon?: string }) {
  const { course, hydrated } = useVisibleCourse(slug);
  useDocTitle(course ? (hasInitial ? null : `Checkout: ${course.title}`) : hydrated && hasInitial ? "Course not found" : null);
  if (course) return <CheckoutView key={course.id} course={course} initialCoupon={coupon} />;
  if (!hydrated) return <PageSkeleton compact />;
  return <Missing light eyebrow="Checkout" title="Nothing to check out here." body="That link doesn't match a course. Pick the course first, then come back to pay (in demo money)." />;
}

export function TutorResolver({ slug, hasInitial }: { slug: string; hasInitial: boolean }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const found = slug ? tutorBySlug(slug, db) : null;
  const tutor = found && found.role === "tutor" && found.status === "active" ? found : null;
  useDocTitle(tutor ? (hasInitial ? null : `${tutor.name}, tutor`) : hydrated && hasInitial ? "Tutor not found" : null);
  if (tutor) return <TutorView key={tutor.userId} tutor={tutor} />;
  if (!hydrated) return <PageSkeleton />;
  return <Missing eyebrow="Tutor not found" title="No one by that name." body="The profile may have moved, or this tutor isn't teaching at Tamada right now." />;
}

/* not-found.tsx boundaries (kept for any notFound() call): resolve from the URL */
export function CourseFallback() {
  return <CourseResolver slug={segment(usePathname(), 2)} hasInitial={false} />;
}
export function CheckoutFallback() {
  const sp = useSearchParams();
  return <CheckoutResolver slug={segment(usePathname(), 2)} hasInitial={false} coupon={sp.get("coupon")?.slice(0, 32) ?? undefined} />;
}
export function TutorFallback() {
  return <TutorResolver slug={segment(usePathname(), 2)} hasInitial={false} />;
}

/** Shown for a moment while this browser's demo store loads (only for slugs the seed doesn't know). */
function PageSkeleton({ compact }: { compact?: boolean }) {
  if (compact)
    return (
      <div className="container-wide pb-section" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-8 h-16 w-full max-w-[34rem]" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  return (
    <div aria-busy="true" aria-label="Loading">
      <section className="theatre relative min-h-[100svh]">
        <GridLines stops={[50]} className="top-[calc(var(--header-offset)+var(--sat))] max-lg:hidden" />
        <div className="container-wide relative flex min-h-[100svh] flex-col justify-end gap-8 pt-[calc(var(--header-offset)+var(--sat)+32px)] pb-12">
          <div className="skeleton h-3 w-48 opacity-30" />
          <div className="skeleton h-[clamp(5rem,12vw,11rem)] w-full max-w-[44rem] opacity-20" />
          <div className="skeleton h-12 w-full max-w-[28rem] opacity-20" />
        </div>
      </section>
    </div>
  );
}

/** Editorial not-found: dark and flush (course, tutor) or cream under the header (checkout). */
function Missing({ eyebrow, title, body, light }: { eyebrow: string; title: string; body: string; light?: boolean }) {
  return (
    <section aria-labelledby="missing-title" className={clsx("relative overflow-hidden", light ? "ground-cream" : "theatre")}>
      {!light && <GridLines stops={[50, 75]} className="top-[calc(var(--header-offset)+var(--sat))] max-lg:hidden" />}
      <div
        className={clsx(
          "container-wide relative flex flex-col justify-end",
          light ? "min-h-[60svh] pb-section" : "min-h-[100svh] pt-[calc(var(--header-offset)+var(--sat)+48px)] pb-[clamp(48px,10vh,120px)]",
        )}
      >
        <Eyebrow index="404">{eyebrow}</Eyebrow>
        <h1 id="missing-title" className="t-display-xxl mt-8 max-w-[11ch] font-display uppercase">
          {title}
        </h1>
        <p className={clsx("t-body-l mt-8 max-w-[34rem]", light ? "text-muted" : "text-cream/80")}>{body}</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Button href={FLAGSHIP.href} arrow>
            See the course
          </Button>
          <ArrowLink href="/" size="lg">
            Back home
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
