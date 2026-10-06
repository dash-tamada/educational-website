import type { Metadata } from "next";
import { SiteShell } from "@/components/app";
import { CourseResolver } from "@/components/catalog/StoreFallback";
import { getCourseAccess } from "@/lib/access";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue, getDemoSession } from "@/lib/demo/session-server";
import { getCourseBySlug } from "@/lib/mock";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCourseBySlug(slug);
  // never leak an unpublished title: anything this visitor can't see is "not found"
  const visible = !!c && (getCourseAccess(await getDemoSession(), c).visible || c.status === "archived");
  if (!c || !visible) return { title: "Course not found", robots: { index: false } };
  if (c.status !== "published") return { title: c.title, robots: { index: false } };
  return {
    title: c.title,
    description: `${c.promise} The first video is free.`,
    openGraph: { title: c.title, description: c.promise, images: [{ url: `${c.thumbnail}${c.thumbnail.includes("?") ? "&" : "?"}w=1200&h=630&fit=crop&auto=format` }] },
  };
}

/**
 * Always HTTP 200: a slug the seed doesn't know (or can't show this visitor) may
 * still be a course in this browser's demo store (made or published in the
 * studio / admin demo). CourseResolver re-checks the live store on the client and
 * renders the page, or a friendly not-found once the store has loaded. Unknown
 * slugs carry noindex metadata.
 */
export default async function Page({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  const session = await getDemoSession();
  const known = !!course && (getCourseAccess(session, course).visible || course.status === "archived");
  const cookie = await getDemoCookieValue();

  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell>
        <CourseResolver slug={slug} hasInitial={known} />
      </SiteShell>
    </DemoSessionSeed>
  );
}
