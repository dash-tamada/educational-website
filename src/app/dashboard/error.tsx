"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button, Card, EmptyState } from "@/components/app";

/** Student area error boundary (the shell stays; only the page content is replaced). */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Card padding="none" className="app-enter">
      <EmptyState
        art="buddies"
        tone="blush"
        title="Well, that page didn't load."
        body="Something tripped over on our side. Try again, and if it keeps happening, resetting the demo data from your account menu usually fixes it."
        action={
          <>
            <Button variant="primary" icon="refresh" onClick={() => retry()}>
              Try again
            </Button>
            {pathname !== "/dashboard" && (
              <Button href="/dashboard" variant="secondary">
                Back to dashboard
              </Button>
            )}
          </>
        }
      />
    </Card>
  );
}
