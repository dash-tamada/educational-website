import type { Metadata } from "next";
import { getCourseBySlug, getItem, itemTitle } from "@/lib/mock";
import { getDemoSession } from "@/lib/demo/session-server";
import { ItemView } from "@/components/learn/ItemView";

export async function generateMetadata({
  params,
}: PageProps<"/learn/[courseSlug]/[itemId]">): Promise<Metadata> {
  const { courseSlug, itemId } = await params;
  const course = getCourseBySlug(courseSlug);
  // The title is in the server HTML, so a lesson is only named to people who
  // can see it: everyone on a published course, the owner and admins on an
  // unreleased one. Archived courses show just the course name.
  // (Client-only drafts aren't in the seed: LearnShell titles those itself.)
  if (!course) return { title: { absolute: "Lesson | Tamada Media" } };
  if (course.status === "archived")
    return { title: { absolute: `${course.title} | Tamada Media` } };
  let suffix = "";
  if (course.status !== "published") {
    const session = await getDemoSession();
    if (session?.role !== "admin" && session?.userId !== course.tutorId)
      return {
        title: { absolute: "Course unavailable · Learning | Tamada Media" },
      };
    suffix = " (preview)";
  }
  const ctx = getItem(course.id, itemId);
  return {
    title: {
      absolute: ctx
        ? `${itemTitle(ctx.item)} · ${course.title}${suffix} | Tamada Media`
        : `${course.title}${suffix} | Tamada Media`,
    },
  };
}

export default async function Page({
  params,
}: PageProps<"/learn/[courseSlug]/[itemId]">) {
  const { itemId } = await params;
  return <ItemView itemId={itemId} />;
}
