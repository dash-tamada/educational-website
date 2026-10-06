import { StudentRouteFallback } from "@/components/student/RouteFallback";

/** The destination page's own skeleton (real header and layout), picked by path. Each page also has its own loading.tsx. */
export default function Loading() {
  return <StudentRouteFallback />;
}
