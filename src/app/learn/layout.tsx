import type { Metadata } from "next";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";
import { PathPrePaint } from "@/components/learn/PathPrePaint";

export const metadata: Metadata = {
  title: { default: "Learning", template: "%s · Learning | Tamada Media" },
  robots: { index: false },
};

/** The learn area: no SiteShell, no dashboard shell. The player draws its own focused top bar. */
export default async function LearnLayout({ children }: LayoutProps<"/learn">) {
  return (
    <DemoSessionSeed value={await getDemoCookieValue()}>
      <PathPrePaint />
      {children}
    </DemoSessionSeed>
  );
}
