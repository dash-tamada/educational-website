import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/app";
import { CourseFallback } from "@/components/catalog/StoreFallback";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";

export const metadata: Metadata = { title: "Course not found", robots: { index: false } };

/** Unknown on the server: the client checks this browser's demo store before showing a 404. */
export default async function NotFound() {
  const cookie = await getDemoCookieValue();
  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell flush headerLight>
        <Suspense>
          <CourseFallback />
        </Suspense>
      </SiteShell>
    </DemoSessionSeed>
  );
}
