import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";

/**
 * Auth pages (login, signup, forgot-password, become-tutor) read the demo
 * session on the client (already logged in? pending application?). Seeding the
 * server-read cookie makes those islands render the right state on the very
 * first pass, without a logged-out flash.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoSessionSeed value={await getDemoCookieValue()}>
      {children}
    </DemoSessionSeed>
  );
}
