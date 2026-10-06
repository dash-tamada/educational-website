import type { Metadata } from "next";
import { TutorEarnings } from "@/components/tutor/TutorEarnings";

export const metadata: Metadata = { title: "Earnings" };

export default function Page() {
  return <TutorEarnings />;
}
