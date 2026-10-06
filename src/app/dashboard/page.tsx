import type { Metadata } from "next";
import { DashboardHome } from "@/components/student/DashboardHome";

// The layout's "%s · Student space" template only applies to child segments, so spell it out here.
export const metadata: Metadata = {
  title: { absolute: "Dashboard · Student space | Tamada Media" },
};

export default function Page() {
  return <DashboardHome />;
}
