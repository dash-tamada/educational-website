"use client";

import { useEffect } from "react";
import { Button, EmptyState, SiteShell, toast } from "@/components/app";
import { demo } from "@/lib/demo/store";

/**
 * Error boundary UI for the public catalog area (catalog, course, tutor, checkout).
 * Keeps the site header/footer, offers a retry and, since most demo-only glitches
 * come from stale browser data, a one-click demo reset.
 */
export function CatalogError({ error, retry, title, body }: { error: Error & { digest?: string }; retry: () => void; title: string; body: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <SiteShell>
      <div className="container-x pb-section">
        <div className="app-enter rounded-card-lg bg-white shadow-soft">
          <EmptyState
            art="buddies"
            tone="blush"
            title={title}
            body={body}
            action={
              <>
                <Button variant="primary" icon="refresh" onClick={() => retry()}>
                  Try again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    demo.reset();
                    toast.success("Demo data reset", { description: "Everything is back to the starting sample data." });
                    retry();
                  }}
                >
                  Reset demo data
                </Button>
                <Button href="/courses" variant="ghost">
                  All courses
                </Button>
              </>
            }
          />
        </div>
      </div>
    </SiteShell>
  );
}
