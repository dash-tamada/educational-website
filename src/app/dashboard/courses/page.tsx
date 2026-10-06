import type { Metadata } from "next";
import {
  MyCourses,
  type CourseFilter,
  type CourseSortKey,
} from "@/components/student/MyCourses";

export const metadata: Metadata = { title: "My courses" };

const FILTERS: CourseFilter[] = [
  "all",
  "in-progress",
  "completed",
  "not-started",
];
const SORTS: CourseSortKey[] = ["recent", "progress", "title", "enrolled"];
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Page({
  searchParams,
}: PageProps<"/dashboard/courses">) {
  const sp = await searchParams;
  const status = one(sp.status) as CourseFilter;
  const sort = one(sp.sort) as CourseSortKey;
  return (
    <MyCourses
      key={`${status}|${sort}|${one(sp.q)}`}
      initialFilter={FILTERS.includes(status) ? status : "all"}
      initialQuery={one(sp.q).slice(0, 80)}
      initialSort={SORTS.includes(sort) ? sort : "recent"}
    />
  );
}
