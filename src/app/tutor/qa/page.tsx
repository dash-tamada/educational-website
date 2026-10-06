import { redirect } from "next/navigation";

/** /tutor/qa is an alias of the Q&A inbox. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") p.set(k, v);
  redirect(`/tutor/questions${p.size ? `?${p}` : ""}`);
}
