import type { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";
import { SiteShell } from "@/components/app";
import { TutorResolver } from "@/components/catalog/StoreFallback";
import { DIRECTOR } from "@/lib/content/director";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";
import { getTutor } from "@/lib/mock";

export async function generateMetadata({ params }: PageProps<"/tutors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = getTutor(slug);
  if (!t || t.role !== "tutor" || t.status !== "active") return { title: "Tutor not found", robots: { index: false } };
  return { title: `${t.name}, tutor`, description: `${t.headline}. Courses and reviews from ${t.name} on Tamada Media.` };
}

/**
 * Always HTTP 200: a slug the seed doesn't know may be a tutor approved in this
 * browser's admin demo. TutorResolver checks the live store on the client.
 * The lead director's profile IS the director page: /tutors/arjun-rao -> /about.
 */
export default async function Page({ params }: PageProps<"/tutors/[slug]">) {
  const { slug } = await params;
  const tutor = getTutor(slug);
  const known = !!tutor && tutor.role === "tutor" && tutor.status === "active";
  if (known && tutor.slug === DIRECTOR.slug) redirect("/about");
  // /tutors/u_xyz (an id) -> the one canonical profile URL
  if (known && tutor.slug !== slug) permanentRedirect(`/tutors/${tutor.slug}`);
  const cookie = await getDemoCookieValue();

  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell flush headerLight>
        <TutorResolver slug={slug} hasInitial={known} />
      </SiteShell>
    </DemoSessionSeed>
  );
}
