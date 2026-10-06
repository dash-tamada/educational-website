import { MyCoursesFallback } from "@/components/student/MyCourses";

/** This page's own skeleton (its real header and layout), so in-area navigation never flashes another page's structure. */
export default function Loading() {
  return <MyCoursesFallback />;
}
