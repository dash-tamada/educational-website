import type { Metadata } from "next";
import { NewCourseWizard } from "@/components/tutor/NewCourseWizard";

export const metadata: Metadata = { title: "New course" };

export default function Page() {
  return <NewCourseWizard />;
}
