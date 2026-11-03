import clsx from "clsx";
import { SiteHeader } from "@/components/editorial/SiteHeader";
import { WordmarkFooter } from "@/components/editorial/WordmarkFooter";
import { LiveClock } from "@/components/editorial/LiveClock";
import { ShellFooter } from "@/components/editorial/ShellFooter";

/**
 * The PUBLIC site shell (home, course, films, director, journal, contact, legal,
 * checkout, 404): editorial SiteHeader + <main> + WordmarkFooter + LiveClock
 * (src/components/editorial). Every public page renders through this.
 *   <SiteShell>…</SiteShell>                      main starts below the fixed header
 *   <SiteShell flush headerLight>…</SiteShell>    content runs under the header (dark hero);
 *                                                 headerLight = SSR hint "the page opens on a
 *                                                 dark ground" (the header then follows the
 *                                                 ground under it live)
 *   <SiteShell footer={false}>…</SiteShell>       no footer at all
 *   <SiteShell footer="minimal">…</SiteShell>     task pages: one legal row (checkout gets it
 *                                                 automatically through footer={true})
 *   <SiteShell clock={false}>                     no fixed clock (default: off with the minimal footer)
 *   <SiteShell loginNext={false}>                 header Log in skips ?next=<this page> (404s)
 *   footerEdge                                    legacy (v1 scallop colour), ignored
 */
export function SiteShell({
  children,
  flush,
  headerLight,
  footer = true,
  clock,
  loginNext = true,
  className,
  before,
}: {
  children: React.ReactNode;
  /** let the first section sit under the fixed header (it must add its own top padding) */
  flush?: boolean;
  /** the page opens on a dark ground (SSR hint for the header tone) */
  headerLight?: boolean;
  /** true (default): the full footer ("minimal" on /checkout/* is decided by the page); "minimal": one row; false: none */
  footer?: boolean | "minimal";
  /** fixed live clock (default true, false with the minimal footer) */
  clock?: boolean;
  /** @deprecated v1 scalloped footer edge colour (ignored) */
  footerEdge?: string;
  /** header Log in returns here after login (?next=); false on 404 pages */
  loginNext?: boolean;
  className?: string;
  /** rendered before the header (e.g. the home intro) */
  before?: React.ReactNode;
}) {
  return (
    <>
      {before}
      <SiteHeader initialGround={headerLight ? "dark" : "light"} loginNext={loginNext} />
      <main id="main" tabIndex={-1} className={clsx(!flush && "pt-[calc(var(--header-offset)+var(--sat)+8px)] md:pt-[calc(var(--header-offset)+var(--sat)+24px)]", className)}>
        {children}
      </main>
      {/* footer={true}: full footer + clock, or the minimal row on /checkout/* (ShellFooter) */}
      {footer === true && <ShellFooter clock={clock ?? true} />}
      {footer === "minimal" && <WordmarkFooter variant="minimal" />}
      {footer !== true && clock && <LiveClock />}
    </>
  );
}
