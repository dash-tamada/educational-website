import type { Metadata } from "next";
import { TutorSettings } from "@/components/tutor/TutorSettings";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <TutorSettings />;
}
