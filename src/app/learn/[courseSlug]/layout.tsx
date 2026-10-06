import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCourseBySlug } from "@/lib/mock";
import { getDemoSession } from "@/lib/demo/session-server";
import { LearnShell } from "@/components/learn/LearnShell";

export async function generateMetadata({
  params,
}: LayoutProps<"/learn/[courseSlug]">): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  // Titles ship in the server HTML (tabs, history): never name an unreleased
  // course to someone who can't open it. Archived ones keep their name for the
  // learners still in them; the owner and admins always see the real name.
  // (Client-only drafts aren't in the seed: LearnShell titles those itself.)
  if (!course) return { title: "Course" };
  if (course.status === "published" || course.status === "archived")
    return { title: course.title };
  const session = await getDemoSession();
  if (session?.role === "admin" || session?.userId === course.tutorId)
    return { title: `${course.title} (preview)` };
  return { title: "Course unavailable" };
}

/**
 * Player chrome (top bar + "Your path" sidebar) for one course. It persists while
 * the learner moves between items, so the sidebar keeps its scroll and nothing
 * flashes. Courses are resolved on the client from the demo store too, so a draft
 * created in the tutor builder (client-only ids) can be previewed here.
 */
export default async function CourseLearnLayout({
  children,
  params,
}: LayoutProps<"/learn/[courseSlug]">) {
  const { courseSlug } = await params;
  // "Hide your path" is mirrored into this cookie by LearnShell, so the first
  // paint already has the aside in the right state (no layout shift)
  const collapsed =
    (await cookies()).get("tm_learn_path")?.value === "collapsed";
  return (
    <LearnShell courseSlug={courseSlug} initialCollapsed={collapsed}>
      {children}
    </LearnShell>
  );
}
