"use client";

import { useEffect } from "react";
import { SiteShell, toast } from "@/components/app";
import { ArrowLink, Button, Eyebrow } from "@/components/editorial";
import { FLAGSHIP } from "@/lib/content/site";
import { demo } from "@/lib/demo/store";

/**
 * Error boundary UI for the public catalog routes (course, tutor, checkout).
 * Keeps the site header/footer, offers a retry and, since most demo-only glitches
 * come from stale browser data, a one-click demo reset.
 */
export function CatalogError({ error, retry, title, body }: { error: Error & { digest?: string }; retry: () => void; title: string; body: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <SiteShell>
      <section aria-labelledby="error-title" className="container-wide flex min-h-[60svh] flex-col justify-end pb-section">
        <Eyebrow index="500">Something broke</Eyebrow>
        <h1 id="error-title" className="t-headline-xl mt-8 max-w-[16ch]">
          {title}
        </h1>
        <p className="t-body-l mt-6 max-w-[36rem] text-muted">{body}</p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button onClick={() => retry()} arrow>
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              demo.reset();
              toast.success("Demo data reset", { description: "Everything is back to the starting sample data." });
              retry();
            }}
          >
            Reset demo data
          </Button>
          <span className="ml-2">
            <ArrowLink href={FLAGSHIP.href}>The course</ArrowLink>
          </span>
        </div>
      </section>
    </SiteShell>
  );
}
