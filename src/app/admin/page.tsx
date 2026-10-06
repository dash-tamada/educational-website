import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/Overview";

/* This page shares a segment with the layout that defines the "%s · Admin control
   room" template, so the template doesn't apply here: spell the title out. */
export const metadata: Metadata = {
  title: { absolute: "Control room · Admin control room | Tamada Media" },
};

export default function Page() {
  return <AdminOverview />;
}
