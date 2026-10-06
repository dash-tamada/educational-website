import type { Metadata } from "next";
import { TutorAnalytics } from "@/components/tutor/TutorAnalytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <TutorAnalytics initialRange={typeof sp.range === "string" ? sp.range : undefined} initialCourse={typeof sp.course === "string" ? sp.course : undefined} />;
}
