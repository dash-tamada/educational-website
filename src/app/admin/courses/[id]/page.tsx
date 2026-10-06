import type { Metadata } from "next";
import { getCourse } from "@/lib/mock";
import { getDemoSession } from "@/lib/demo/session-server";
import { CourseReview } from "@/components/admin/CourseReview";

/* Metadata runs before the layout's role gate: unpublished course titles are only
   put in the tab title for admins. */
export async function generateMetadata({
  params,
}: PageProps<"/admin/courses/[id]">): Promise<Metadata> {
  const session = await getDemoSession();
  if (session?.role !== "admin") return { title: "Course review" };
  const { id } = await params;
  return { title: getCourse(id)?.title ?? "Course review" };
}

/** Courses created in the demo store (ids like crs_d…) exist client-side only, so the client view resolves "not found". */
export default async function Page({
  params,
}: PageProps<"/admin/courses/[id]">) {
  const { id } = await params;
  return <CourseReview courseId={id} />;
}
