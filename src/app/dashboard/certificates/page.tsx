import type { Metadata } from "next";
import { Certificates } from "@/components/student/Certificates";

export const metadata: Metadata = { title: "Certificates" };

export default function Page() {
  return <Certificates />;
}
