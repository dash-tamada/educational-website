import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell, Skeleton } from "@/components/app";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";
import { getCategory } from "@/lib/mock";
import { resolveCategorySlug } from "@/lib/mock/extra/catalog";

export async function generateMetadata({ searchParams }: PageProps<"/courses">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const slug = typeof sp.category === "string" ? resolveCategorySlug(sp.category) : "";
  const cat = slug ? getCategory(slug) : null;
  return {
    title: q ? `“${q}” courses` : cat ? `${cat.name} courses` : "Courses",
    description: "Browse short video courses from Indian tutors. The first video of every course is free.",
  };
}

export default async function Page() {
  const cookie = await getDemoCookieValue();
  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell>
        <CatalogHero />
        <Suspense fallback={<CatalogFallback />}>
          <CatalogBrowser />
        </Suspense>
      </SiteShell>
    </DemoSessionSeed>
  );
}

function CatalogFallback() {
  return (
    <div className="container-x pt-10 pb-section md:pt-14" aria-busy="true" aria-label="Loading courses">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-36 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
