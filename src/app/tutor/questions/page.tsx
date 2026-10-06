import type { Metadata } from "next";
import { TutorQuestions } from "@/components/tutor/TutorQuestions";

export const metadata: Metadata = { title: "Learner questions" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <TutorQuestions initialFilter={str(sp.filter)} initialCourse={str(sp.course)} initialQuery={str(sp.q)} focusId={str(sp.focus)} />;
}
