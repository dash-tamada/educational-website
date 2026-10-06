import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/mock";
import { getDemoSession } from "@/lib/demo/session-server";
import { CourseBuilder } from "@/components/tutor/builder/CourseBuilder";

export async function generateMetadata({ params }: PageProps<"/tutor/courses/[id]/builder">): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return { title: id.startsWith("crs_d") ? "Course studio" : "Course not found" };
  // Draft titles are private: only the course's own tutor (or an admin) sees it in the tab title.
  // Demo drafts ("crs_d…") only exist in the browser, so the server can't know their title anyway.
  const session = await getDemoSession();
  const canSee = session?.role === "admin" || (session?.role === "tutor" && session.userId === course.tutorId);
  return { title: canSee ? `Course studio: ${course.title}` : "Course studio" };
}

/* Courses created in the demo store (ids "crs_d…") only exist client-side, so the
   builder reads them from useDb(); unknown seed ids render the studio's not-found. */
export default async function Page({ params, searchParams }: PageProps<"/tutor/courses/[id]/builder">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!getCourseById(id) && !id.startsWith("crs_d")) notFound();
  return <CourseBuilder courseId={id} initialTab={typeof sp.tab === "string" ? sp.tab : undefined} />;
}
