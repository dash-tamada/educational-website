import type { Metadata } from "next";
import { CoursesPage } from "@/components/admin/CoursesView";

export const metadata: Metadata = { title: "Courses" };

export default function Page() {
  return <CoursesPage />;
}
