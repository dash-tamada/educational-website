import type { Metadata } from "next";
import { Settings } from "@/components/student/Settings";

export const metadata: Metadata = { title: "Account" };

export default function Page() {
  return <Settings />;
}
