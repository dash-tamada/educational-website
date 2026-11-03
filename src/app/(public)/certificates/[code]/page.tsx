import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getCertificateByCode } from "@/lib/mock";
import { SiteShell } from "@/components/app";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";
import { CertificateHeading, CertificateView } from "@/components/auth/CertificateView";
import { CERT_CODE_RE, normaliseCode, safeDecode } from "@/lib/mock/extra/auth";
import { FLAGSHIP } from "@/lib/content/site";

/** "tm7qk4m2xd", "TM7QK4M2XD" and "tm 7qk4 m2xd" all mean TM-7QK4-M2XD. */
function canonicalCode(param: string) {
  const raw = safeDecode(param);
  const canonical = normaliseCode(raw);
  return { raw, canonical, tidy: CERT_CODE_RE.test(canonical) };
}

export async function generateMetadata({ params }: PageProps<"/certificates/[code]">): Promise<Metadata> {
  const { canonical } = canonicalCode((await params).code);
  const hit = getCertificateByCode(canonical);
  return {
    title: hit ? `${hit.user.name}: ${FLAGSHIP.certificateTitle}` : `Certificate ${canonical}`,
    description: hit
      ? `Verified Tamada Media certificate ${hit.certificate.code}: ${hit.user.name} completed ${hit.course.title}.`
      : "Check a Tamada Media certificate code against our records.",
    robots: { index: false },
  };
}

/**
 * Public verification page: a dark theatre page around the cream certificate.
 * Hand-typed codes (no dashes, lower case, spaces) redirect to the canonical URL
 * first, so a printout typed in by a verifier gets the same answer as the shared
 * link. The view is a client island so certificates issued in the demo store
 * (demo.issueCertificate) verify too; seeded codes render on the server pass.
 */
export default async function CertificatePage({ params }: PageProps<"/certificates/[code]">) {
  const { raw, canonical, tidy } = canonicalCode((await params).code);
  if (tidy && raw !== canonical) permanentRedirect(`/certificates/${canonical}`);
  return (
    <SiteShell flush headerLight>
      <div className="cert-print-wrap theatre relative isolate min-h-[100svh] pt-[calc(var(--header-offset)+var(--sat)+28px)] pb-section md:pt-[calc(var(--header-offset)+var(--sat)+48px)]">
        <div className="cert-print-flat container-wide relative">
          <CertificateHeading code={canonical} />
          <DemoSessionSeed value={await getDemoCookieValue()}>
            <CertificateView code={canonical} />
          </DemoSessionSeed>
        </div>
      </div>
    </SiteShell>
  );
}
