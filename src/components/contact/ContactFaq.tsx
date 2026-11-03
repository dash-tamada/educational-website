import Link from "next/link";
import { CONTACT_FAQ } from "@/lib/content/contact";
import { ArrowLink, Eyebrow } from "@/components/editorial";

/* =============================================================================
   CONTACT FAQ-LITE. Cream-2. Four quick answers in a 2 x 2 hairline grid (no
   accordion: they are short), each with an optional link, and "All questions →".
   Server component.
   ============================================================================= */
export function ContactFaq() {
  const f = CONTACT_FAQ;
  return (
    <section aria-labelledby="contact-faq-title" className="ground-cream-2 relative">
      <div className="container-wide edit-grid gap-y-12 py-section">
        <div className="col-span-12 flex flex-col justify-between gap-8 lg:col-span-3">
          <div>
            <Eyebrow index="03">{f.label}</Eyebrow>
            <h2 id="contact-faq-title" className="t-headline-m mt-6">
              {f.title}
            </h2>
          </div>
          <div>
            <ArrowLink href={f.more.href} size="lg">
              {f.more.label}
            </ArrowLink>
          </div>
        </div>
        <dl data-reveal-stagger="rise" className="col-span-12 grid border-t border-line sm:grid-cols-2 lg:col-span-8 lg:col-start-5">
          {f.items.map((it, i) => (
            <div key={it.q} className={`border-b border-line py-8 ${i % 2 ? "sm:border-l sm:pl-8" : "sm:pr-8"}`}>
              <dt className="font-heading text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-[1.1] font-semibold tracking-[-0.03em]">{it.q}</dt>
              <dd className="t-body mt-4 text-muted">
                {it.a}
                {"link" in it && it.link && (
                  <>
                    {" "}
                    <Link href={it.link.href} className="link-draw text-fg">
                      {it.link.label}
                    </Link>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
