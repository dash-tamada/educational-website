"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, Icon, Skeleton } from "@/components/app";
import { ArrowButton, Eyebrow, Sparkle, Sticker } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { getCourseAccess } from "@/lib/access";
import { useDemoSession } from "@/lib/demo/session-client";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { getCourseBySlug, getTopCourses, getTutors, type Db } from "@/lib/mock";
import { CheckoutView } from "./CheckoutView";
import { CourseGrid } from "./CourseGrid";
import { CourseView } from "./CourseView";
import { TutorView } from "./TutorView";
import { SectionTitle } from "./ui";

/*
 * The server only knows the seed. Courses made in the tutor studio, tutors approved
 * by the admin demo, or status changes made in the demo store live in this browser.
 * So every /courses/[slug], /checkout/[slug] and /tutors/[slug] page renders one of
 * these resolvers (HTTP 200, no console 404): the server passes what it found in
 * the seed (`initial`, or null), the client re-resolves against the live store and
 * renders the real page, a skeleton while the store loads, or a friendly not-found.
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

/** Slugs only (ids are not public URLs, so /courses/crs_webdev stays a 404). */
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
      title="This course wandered off."
      body={
        slug
          ? `We couldn't find a course at “${slug.slice(0, 60)}”. It may have been renamed, unpublished, or it only existed in another browser's demo data.`
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
  return <Missing eyebrow="Checkout" title="Nothing to check out here." body="That course link doesn't match anything in the library. Pick a course first, then come back to pay (in demo money)." />;
}

export function TutorResolver({ slug, hasInitial }: { slug: string; hasInitial: boolean }) {
  const db = useDb();
  const hydrated = useStoreHydrated();
  const found = slug ? tutorBySlug(slug, db) : null;
  const tutor = found && found.role === "tutor" && found.status === "active" ? found : null;
  useDocTitle(tutor ? (hasInitial ? null : `${tutor.name}, tutor`) : hydrated && hasInitial ? "Tutor not found" : null);
  if (tutor) return <TutorView key={tutor.userId} tutor={tutor} />;
  if (!hydrated) return <PageSkeleton />;
  return <Missing eyebrow="Tutor not found" title="No tutor by that name." body="The profile may have moved, or this tutor isn't teaching on Tamada right now. Their courses might still be in the library." />;
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
  return (
    <div aria-busy="true" aria-label="Loading">
      {compact ? (
        <div className="container-x pt-6">
          <Skeleton className="h-4 w-56 rounded-full" />
          <Skeleton className="mt-8 h-14 w-full max-w-[34rem] rounded-full" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <Skeleton className="h-80 rounded-card-lg" />
            <Skeleton className="h-80 rounded-card-lg" />
          </div>
        </div>
      ) : (
        <>
          <div className="panel bg-white/60 py-10 md:py-14 lg:py-16">
            <div className="container-x grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
              <div className="space-y-4">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-16 w-full max-w-[30rem] rounded-full" />
                <Skeleton className="h-5 w-full max-w-[26rem] rounded-full" />
                <Skeleton className="h-12 w-60 rounded-full" />
              </div>
              <Skeleton className="aspect-video rounded-card-lg" />
            </div>
          </div>
          <div className="container-x grid gap-10 pt-10 pb-section md:pt-14 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-96 rounded-card-lg" />
            <Skeleton className="hidden h-96 rounded-card-lg lg:block" />
          </div>
        </>
      )}
    </div>
  );
}

function Missing({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const db = useDb();
  const top = getTopCourses(4, db);
  return (
    <>
      <section aria-labelledby="missing-title" className="panel bg-butter py-12 md:py-16 lg:py-20">
        <Sparkle fill="#ff008c" className="pointer-events-none absolute top-10 right-[10%] hidden size-9 md:block" />
        <div className="container-x relative grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <Eyebrow tone="hotpink">
              <Icon name="search" className="size-3.5" strokeWidth={2.6} />
              {eyebrow} · 404
            </Eyebrow>
            <h1 id="missing-title" className="t-display-l mt-eyebrow max-w-[13ch]">
              {title}
            </h1>
            <p className="t-body-l mt-sub max-w-[34rem] opacity-80">{body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ArrowButton href="/courses" variant="ink">
                Browse all courses
              </ArrowButton>
              <Button href="/" variant="secondary" size="lg">
                Back home
              </Button>
            </div>
          </div>
          <div className="relative mx-auto hidden w-[200px] md:block" aria-hidden>
            <Mascot title="" className="w-full" style={{ transform: "rotate(-8deg)" }} />
            <div className="absolute -top-4 -left-10">
              <Sticker tone="blue" size="sm" rotate={-6}>
                lost? same.
              </Sticker>
            </div>
          </div>
        </div>
      </section>
      {top.length > 0 && (
        <section aria-labelledby="missing-popular" className="container-x pt-10 pb-section md:pt-14">
          <SectionTitle kicker="While you're here" title="People are loving these" id="missing-popular" />
          <div className="mt-6">
            <CourseGrid courseIds={top.map((c) => c.id)} balanced />
          </div>
        </section>
      )}
    </>
  );
}
