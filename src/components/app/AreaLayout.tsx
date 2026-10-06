import { getDemoClaim, getDemoCookieValue } from "@/lib/demo/session-server";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import type { Role } from "@/lib/mock/types";
import { DashboardShell } from "./DashboardShell";
import { LiveAreaGate } from "./LiveAreaGate";
import { RoleGate } from "./RoleGate";

/**
 * Server layout body for /dashboard, /tutor and /admin: reads the demo cookie,
 * seeds the client session (no hydration flash) and either renders the shell or
 * the friendly role gate.
 *   export default function Layout({ children }) { return <AreaLayout area="tutor">{children}</AreaLayout>; }
 * A cookie the seed can't confirm (a role granted in the client-side demo store,
 * e.g. an approved tutor application) is decided on the client by LiveAreaGate.
 */
export async function AreaLayout({ area, children }: { area: Role; children: React.ReactNode }) {
  const [raw, claim] = await Promise.all([getDemoCookieValue(), getDemoClaim()]);
  if (claim && !claim.verified) {
    return (
      <DemoSessionSeed value={raw}>
        <LiveAreaGate area={area} claim={{ role: claim.role, userId: claim.userId }}>
          {children}
        </LiveAreaGate>
      </DemoSessionSeed>
    );
  }
  const session = claim?.verified ? { role: claim.role, userId: claim.userId } : null;
  return (
    <DemoSessionSeed value={session ? raw : null}>
      {session?.role === area ? (
        <DashboardShell area={area}>{children}</DashboardShell>
      ) : (
        <RoleGate area={area} currentRole={session?.role ?? null} userId={session?.userId ?? null} />
      )}
    </DemoSessionSeed>
  );
}
