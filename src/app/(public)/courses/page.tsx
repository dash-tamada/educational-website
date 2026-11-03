import { redirect } from "next/navigation";
import { FLAGSHIP } from "@/lib/content/site";

/**
 * One school, one flagship course: /courses goes straight to it. Any query string
 * (old catalogue links: ?q=, ?category=) is passed through untouched.
 */
export default async function Page({ searchParams }: PageProps<"/courses">) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.append(k, v);
    else if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
  }
  const q = qs.toString();
  redirect(q ? `${FLAGSHIP.href}?${q}` : FLAGSHIP.href);
}
