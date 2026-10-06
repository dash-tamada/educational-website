import clsx from "clsx";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

/**
 * Public inner pages (catalog, course, tutor profile, checkout, about, legal…):
 * the landing Header + <main> + Footer.
 *   <SiteShell>…</SiteShell>                      main starts below the fixed header
 *   <SiteShell flush headerLight>…</SiteShell>    content runs under the header (colour hero); white logo letters
 *   <SiteShell footer={false}>…</SiteShell>       no footer at all
 *   <SiteShell footer="minimal">…</SiteShell>     task pages: one 44px legal row (checkout gets it
 *                                                 automatically: footer={true} = "auto")
 *   <SiteShell footerEdge="var(--color-flame)">   colour of the footer's top bumps; default
 *                                                 "auto" = the last full-bleed .field's colour,
 *                                                 else the cream canvas
 *   <SiteShell loginNext={false}>                 header Log in / Sign up skip ?next=<this page>
 *                                                 (not-found pages)
 */
export function SiteShell({
  children,
  flush,
  headerLight,
  footer = true,
  footerEdge = "auto",
  loginNext = true,
  className,
}: {
  children: React.ReactNode;
  /** let the first section sit under the fixed header (it must add its own top padding) */
  flush?: boolean;
  headerLight?: boolean;
  /** true (default): the full footer, minimal on /checkout/*; "minimal": the one-row footer; false: none */
  footer?: boolean | "minimal";
  /** colour of the footer's scalloped top edge (CSS colour or "auto") */
  footerEdge?: string;
  /** header auth links return here after login (?next=); false on 404 pages */
  loginNext?: boolean;
  className?: string;
}) {
  return (
    <>
      <Header light={headerLight} loginNext={loginNext} />
      <main id="main" className={clsx(!flush && "pt-[calc(var(--header-offset)+8px)] md:pt-[calc(var(--header-offset)+24px)]", className)}>
        {children}
      </main>
      {footer && <Footer edge={footerEdge} variant={footer === "minimal" ? "minimal" : "auto"} />}
    </>
  );
}
