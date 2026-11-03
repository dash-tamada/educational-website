"use client";

import type { Role } from "@/lib/mock/types";
import { getUser } from "@/lib/mock";
import { useDb, useStoreHydrated } from "@/lib/demo/store";
import { DashboardShell } from "./DashboardShell";
import { RoleGate } from "./RoleGate";

/* =============================================================================
   LiveAreaGate: AreaLayout renders this when the tm_demo cookie names a role the
   seed doesn't know for that user (e.g. `tutor:u_s046` after an admin approved
   Bhavya's tutor application in the demo store, or a user created client-side).
   The server can't see the store, so the decision waits for the client overlay:
   a short "opening" slate (mono caps + a thin red line), then the shell (store
   agrees) or the RoleGate.
   ============================================================================= */

export function LiveAreaGate({ area, claim, children }: { area: Role; claim: { role: Role; userId: string }; children: React.ReactNode }) {
  const hydrated = useStoreHydrated();
  const db = useDb();

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center px-4" role="status" aria-live="polite">
        <div className="app-fade flex w-48 flex-col items-start gap-3">
          <p className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.1em] text-ink/70 uppercase">
            <span aria-hidden className="size-[6px] animate-rec rounded-full bg-red" />
            Opening your space…
          </p>
          <span aria-hidden className="block h-px w-full overflow-hidden bg-line">
            <span className="block h-full w-1/3 animate-pulse bg-red" />
          </span>
        </div>
      </div>
    );
  }

  const user = getUser(claim.userId, db);
  const live = !!user && user.role === claim.role;
  if (live && claim.role === area) return <DashboardShell area={area}>{children}</DashboardShell>;
  return <RoleGate area={area} currentRole={live ? claim.role : null} userId={live ? claim.userId : null} />;
}
