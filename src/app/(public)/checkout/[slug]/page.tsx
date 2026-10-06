import type { Metadata } from "next";
import { SiteShell } from "@/components/app";
import { CheckoutResolver } from "@/components/catalog/StoreFallback";
import { getCourseAccess } from "@/lib/access";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue, getDemoSession } from "@/lib/demo/session-server";
import { getCourseBySlug } from "@/lib/mock";

/** Same visibility rule as the course page: drafts / in-review stay private (archived shows "not on sale"). */
async function visibleCourse(slug: string) {
  const course = getCourseBySlug(slug);
  if (!course) return null;
  const access = getCourseAccess(await getDemoSession(), course);
  return access.visible || course.status === "archived" ? course : null;
}

export async function generateMetadata({ params }: PageProps<"/checkout/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await visibleCourse(slug);
  return { title: course ? `Checkout: ${course.title}` : "Course not found", robots: { index: false } };
}

/** Always HTTP 200: CheckoutResolver also looks in this browser's demo store (studio-made or newly published courses). */
export default async function Page({ params, searchParams }: PageProps<"/checkout/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const course = await visibleCourse(slug);
  const coupon = typeof sp.coupon === "string" ? sp.coupon.slice(0, 32) : undefined;
  const cookie = await getDemoCookieValue();

  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell>
        <CheckoutResolver slug={slug} hasInitial={!!course} coupon={coupon} />
      </SiteShell>
    </DemoSessionSeed>
  );
}
