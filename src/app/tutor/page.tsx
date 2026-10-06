import type { Metadata } from "next";
import { TutorOverview } from "@/components/tutor/TutorOverview";

export const metadata: Metadata = { title: { absolute: "Studio · Tutor studio | Tamada Media" } };

export default function Page() {
  return <TutorOverview />;
}
