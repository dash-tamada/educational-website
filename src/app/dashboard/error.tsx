"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button, EmptyState } from "@/components/app";

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
    <div className="app-enter border-t border-fg">
      <EmptyState
        art="none"
        align="start"
        eyebrow="Error · take two"
        className="px-0!"
        title="Well, that page didn't load."
        body="Something tripped over on our side. Try again, and if it keeps happening, resetting the demo data from your account menu usually fixes it."
        action={
          <>
            <Button variant="primary" icon="refresh" onClick={() => retry()}>
              Try again
            </Button>
            {pathname !== "/dashboard" && (
              <Button href="/dashboard" variant="outline">
                Back to dashboard
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}
