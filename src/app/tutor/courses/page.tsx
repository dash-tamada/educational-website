import type { Metadata } from "next";
import { CoursesList } from "@/components/tutor/CoursesList";

export const metadata: Metadata = { title: "Your courses" };

export default async function Page({ searchParams }: PageProps<"/tutor/courses">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "all";
  return <CoursesList initialQuery={q} initialStatus={status} />;
}
