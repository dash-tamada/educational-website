import type { Metadata } from "next";
import { SiteShell } from "@/components/app";
import { CourseResolver } from "@/components/catalog/StoreFallback";
import { getCourseAccess } from "@/lib/access";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue, getDemoSession } from "@/lib/demo/session-server";
import { SITE } from "@/lib/content/site";
import { getCourseBySlug, getCourseStats, getTutor, type Course } from "@/lib/mock";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCourseBySlug(slug);
  // never leak an unpublished title: anything this visitor can't see is "not found"
  const visible = !!c && (getCourseAccess(await getDemoSession(), c).visible || c.status === "archived");
  if (!c || !visible) return { title: "Course not found", robots: { index: false } };
  if (c.status !== "published") return { title: c.title, robots: { index: false } };
  return {
    title: c.title,
    description: `${c.promise} The first lesson is free.`,
    alternates: { canonical: `/courses/${c.slug}` },
    openGraph: { title: c.title, description: c.promise, images: [{ url: `${c.thumbnail}${c.thumbnail.includes("?") ? "&" : "?"}w=1200&h=630&fit=crop&auto=format` }] },
  };
}

/** schema.org Course for a published course (search engines, link previews). */
function courseJsonLd(c: Course) {
  const stats = getCourseStats(c.id);
  const tutor = getTutor(c.tutorId);
  const hours = Math.max(1, Math.round(stats.totalSec / 3600));
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.description || c.promise,
    image: c.thumbnail,
    inLanguage: "en",
    provider: { "@type": "Organization", name: SITE.name },
    ...(tutor ? { instructor: { "@type": "Person", name: tutor.name } } : {}),
    ...(c.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: c.rating, reviewCount: c.reviewCount, bestRating: 5 } } : {}),
    offers: { "@type": "Offer", category: "Paid", price: c.price, priceCurrency: c.currency, availability: "https://schema.org/InStock" },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${hours}H` },
    educationalCredentialAwarded: c.hasCertificate ? (c.certificateTitle ?? "Certificate of completion") : undefined,
  };
}

/**
 * Always HTTP 200: a slug the seed doesn't know (or can't show this visitor) may
 * still be a course in this browser's demo store (made or published in the
 * studio / admin demo). CourseResolver re-checks the live store on the client and
 * renders the page, or a friendly not-found once the store has loaded. Unknown
 * slugs carry noindex metadata. The page opens on the dark hero (flush).
 */
export default async function Page({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  const session = await getDemoSession();
  const known = !!course && (getCourseAccess(session, course).visible || course.status === "archived");
  const cookie = await getDemoCookieValue();

  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell flush headerLight>
        {course && known && course.status === "published" && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd(course)).replace(/</g, "\u003c") }} />
        )}
        <CourseResolver slug={slug} hasInitial={known} />
      </SiteShell>
    </DemoSessionSeed>
  );
}
