import type { Metadata } from "next";
import { TutorsView } from "@/components/admin/TutorsView";

export const metadata: Metadata = { title: "Tutor applications" };

export default function Page() {
  return <TutorsView />;
}
