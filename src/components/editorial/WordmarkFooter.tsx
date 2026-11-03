import Link from "next/link";
import clsx from "clsx";
import { COPYRIGHT, LEGAL, NAV, NEWSLETTER, SITE, SOCIALS } from "@/lib/content/site";
import { Newsletter } from "./Newsletter";
import { LiveClock } from "./LiveClock";

/* =============================================================================
   WordmarkFooter (Mobius footer, Marlowe ink). Server component.
   Giant TAMADA MEDIA® wordmark across the width with © years at its top-right,
   then newsletter | index | social | legal in big Inter Tight links, then the
   bottom line (copyright · credit). The fixed LiveClock sits on the bottom line's
   right end from 640px up; phones get an inline copy.

   <WordmarkFooter />                 full footer (ink)
   <WordmarkFooter variant="minimal" /> one legal row for task pages (checkout)
   ============================================================================= */

const years = `© ${SITE.founded}–${String(new Date().getFullYear()).slice(-2)}`;

export function WordmarkFooter({ variant = "full", className }: { variant?: "full" | "minimal"; className?: string }) {
  if (variant === "minimal") return <MinimalFooterRow className={className} />;
  return (
    <footer className={clsx("theatre relative overflow-hidden", className)}>
      <div className="container-wide pt-[clamp(72px,10vw,150px)] pb-[max(26px,calc(var(--sab)+18px))]">
        {/* Years + wordmark */}
        <div className="flex items-end justify-between gap-6 pb-[clamp(12px,2vw,28px)]">
          <p className="t-label text-muted">{SITE.tagline}</p>
          <p className="t-statement-m shrink-0">{years}</p>
        </div>
        <div className="footer-wordmark-box">
          <p className="sr-only">{SITE.name}</p>
          <p aria-hidden className="footer-wordmark t-wordmark select-none">
            Tamada&nbsp;Media<sup className="text-red">®</sup>
          </p>
        </div>

        {/* Columns */}
        <div className="edit-grid mt-[clamp(56px,7vw,110px)] gap-y-12">
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <p className="t-label text-muted">Newsletter</p>
            <p className="t-statement-m mt-4 max-w-[24rem]">{NEWSLETTER.title}</p>
            <p className="t-small mt-3 max-w-[24rem] text-muted">{NEWSLETTER.body}</p>
            <Newsletter />
          </div>
          <FooterCol title="Index" className="col-span-6 md:col-span-3 lg:col-start-6 lg:col-span-2" links={[{ label: "Home", href: "/" }, ...NAV]} />
          <FooterCol title="Social" className="col-span-6 md:col-span-3 lg:col-span-2" links={SOCIALS.map((s) => ({ ...s, external: true }))} />
          <FooterCol title="Legal" className="col-span-12 md:col-span-6 lg:col-span-3 md:col-start-7 lg:col-start-10" links={[...LEGAL]} />
        </div>

        {/* Bottom line */}
        <div className="mt-[clamp(56px,7vw,110px)] flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:gap-8 sm:pr-[220px]">
          <p className="t-label text-muted">{COPYRIGHT}</p>
          <p className="t-label text-muted">
            <span className="text-cream">Made in {SITE.city.split(",")[0]}</span> · for Indian filmmakers
          </p>
          <LiveClock inline className="text-cream sm:hidden" />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  className,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="t-label text-muted">{title}</p>
      <ul className="mt-5 grid gap-1.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="footer-link">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="footer-link">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Task pages (checkout): one hairline row "© 2026 Tamada Media · Terms · Privacy · Help". */
export function MinimalFooterRow({ className }: { className?: string }) {
  const links = [...LEGAL.slice(0, 2), { label: "Help", href: "/contact" }];
  return (
    <footer className={clsx("container-wide pt-6 pb-[max(24px,calc(var(--sab)+12px))]", className)}>
      <div className="flex flex-col items-center gap-x-6 gap-y-1 border-t border-line pt-4 sm:flex-row sm:justify-between">
        <span className="t-label flex min-h-11 items-center text-muted">© {new Date().getFullYear()} {SITE.name}</span>
        <ul className="flex items-center gap-5">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="t-label link-draw inline-flex min-h-11 items-center text-muted hf:text-fg">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
