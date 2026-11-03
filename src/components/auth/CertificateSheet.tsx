import { BrandMark } from "@/components/editorial";
import { formatDate } from "@/lib/mock";
import { FLAGSHIP } from "@/lib/content/site";

/* =============================================================================
   The certificate itself: cream paper, a hairline double frame, the logo, a
   condensed CERTIFIED AI FILMMAKER, the learner's name in Inter Tight, the
   course, the director's signature line, the mono code + issue date, a QR-style
   pattern and a small red seal. A container-query component: below 672px of its
   own width it stacks into a portrait card; from there up it is the landscape
   A4 sheet (sizes in cqw so it scales like paper and prints on one A4 landscape
   page; small print never drops under 10px). Server-safe. Print CSS lives in
   CertificateView (it keys on .cert-sheet / .cert-paper).
   ============================================================================= */

/** FNV-1a hash -> deterministic bits for the QR-like pattern. */
function bits(seed: string, n: number) {
  let h = 2166136261;
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i * 31;
    h = Math.imul(h, 16777619);
    out.push(((h >>> 7) & 3) === 0 || ((h >>> 13) & 5) === 1);
  }
  return out;
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" />
      <rect x="1" y="1" width="5" height="5" fill="#fffcf6" />
      <rect x="2" y="2" width="3" height="3" />
    </g>
  );
}

/** QR-style code pattern (decorative: the human-readable code is what verifies). */
export function CodePattern({ code, className }: { code: string; className?: string }) {
  const N = 21;
  const b = bits(code, N * N);
  const finder = (x: number, y: number) => x < 7 && y < 7;
  const inFinder = (x: number, y: number) => finder(x, y) || finder(N - 1 - x, y) || finder(x, N - 1 - y);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) if (!inFinder(x, y) && b[y * N + x]) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" />);
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className={className} role="img" aria-label={`Verification pattern for ${code}`}>
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fffcf6" />
      <g fill="#0b0b0b">
        {cells}
        <Finder x={0} y={0} />
        <Finder x={N - 7} y={0} />
        <Finder x={0} y={N - 7} />
      </g>
    </svg>
  );
}

/** The red seal: TAMADA MEDIA · CERTIFIED around a clapper slate. */
export function CertSeal({ className }: { className?: string }) {
  const ring = "TAMADA MEDIA · CERTIFIED · AI FILMMAKER · ";
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <path id="cert-seal-ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="#e3061b" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="#fffcf6" strokeOpacity=".55" strokeWidth=".8" />
      <circle cx="60" cy="60" r="35" fill="none" stroke="#fffcf6" strokeOpacity=".55" strokeWidth=".8" />
      <text fill="#fffcf6" fontSize="7.6" fontWeight="600" style={{ fontFamily: "var(--font-mono)" }}>
        {/* textLength = the ring's circumference: the phrase closes the circle exactly in any mono font */}
        <textPath href="#cert-seal-ring" textLength={2 * Math.PI * 44 - 1} lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>
      {/* clapper slate */}
      <g transform="translate(43 45)">
        <rect x="0" y="9" width="34" height="22" fill="#fffcf6" />
        <path d="M0 2 L33 -4 L34.4 3.2 L1.4 9.2 Z" fill="#fffcf6" />
        <path d="M6 1 l4 6.6 M14 -0.4 l4 6.6 M22 -1.8 l4 6.6" stroke="#e3061b" strokeWidth="3" />
        <path d="M4 16 h26 M4 21 h18 M4 26 h22" stroke="#e3061b" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/** A drawn signature (decorative; the printed name under the line is the record). */
function Signature({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 56" className={className} fill="none" aria-hidden>
      <path
        d="M6 46 C 12 32, 20 10, 29 7 C 34 5, 31 30, 28 46 M 16 31 C 24 29, 33 28, 41 29 C 49 30, 46 41, 53 39 C 59 37, 57 27, 63 29 C 69 31, 65 41, 72 39 C 79 37, 79 28, 85 30 C 91 32, 87 42, 95 40 C 103 38, 106 21, 113 23 C 119 25, 111 44, 121 42 C 131 40, 138 30, 149 32 C 156 33, 152 41, 160 39"
        stroke="#0b0b0b"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M38 50 C 78 46, 122 44, 174 41" stroke="#0b0b0b" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export interface CertificateData {
  code: string;
  learner: string;
  course: string;
  tutor: string;
  issuedAt: string;
  hours: number;
}

export function CertificateSheet({ data, className }: { data: CertificateData; className?: string }) {

  const signer = FLAGSHIP.director;
  return (
    <div className={["cert-sheet @container", className].filter(Boolean).join(" ")}>
      <article
        aria-label={`${FLAGSHIP.certificateTitle} certificate for ${data.learner}`}
        data-ground="light"
        className="cert-paper relative isolate overflow-hidden bg-paper text-ink @2xl:aspect-[1.414/1]"
      >
        {/* paper tooth: a faint warm vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 85% 75% at 50% 45%, transparent 55%, rgb(232 223 207 / 0.55) 100%)" }}
        />
        {/* hairline double frame */}
        <div aria-hidden className="pointer-events-none absolute inset-[10px] -z-10 border border-ink/70 @2xl:inset-[1.9cqw]" />
        <div aria-hidden className="pointer-events-none absolute inset-[15px] -z-10 border border-ink/25 @2xl:inset-[2.5cqw]" />

        <div className="flex h-full flex-col px-7 pt-8 pb-7 @2xl:px-[6.2cqw] @2xl:pt-[5cqw] @2xl:pb-[4.4cqw]">
          {/* top row */}
          <div className="flex items-start justify-between gap-4">
            <BrandMark tone="dark" lazy sizes="(min-width: 1024px) 140px, 96px" className="w-[88px] @2xl:w-[12.5cqw]" />
            <p className="text-right font-mono text-[10px] leading-snug tracking-[0.08em] text-ink/60 uppercase @2xl:text-[max(10px,1cqw)]">
              Certificate no.
              <span className="mt-[0.35em] block text-[12px] font-semibold tracking-[0.06em] text-ink @2xl:text-[max(12px,1.35cqw)]">{data.code}</span>
            </p>
          </div>

          {/* body */}
          <div className="mt-9 flex flex-1 flex-col items-center justify-center text-center @2xl:mt-[1.2cqw]">
            <p className="font-mono text-[10px] tracking-[0.18em] text-ink/60 uppercase @2xl:text-[max(10px,1.05cqw)]">Tamada Media · AI filmmaking school</p>
            <h2 className="mt-3 font-display text-[11.5cqw] leading-[0.88] tracking-[-0.003em] uppercase @2xl:mt-[1.4cqw] @2xl:text-[7.4cqw]">
              Certified AI <span className="whitespace-nowrap">filmmaker</span>
            </h2>
            <p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-ink/60 uppercase @2xl:mt-[2.6cqw] @2xl:text-[max(10px,1.1cqw)]">This certifies that</p>
            <p className="mt-2 max-w-full font-heading text-[9cqw] leading-[1.02] font-semibold tracking-[-0.045em] [overflow-wrap:anywhere] @2xl:mt-[0.8cqw] @2xl:text-[5.4cqw]">
              {data.learner}
            </p>
            <p className="mt-3 max-w-[34ch] text-[13px] leading-snug text-ink/70 @2xl:mt-[1.3cqw] @2xl:max-w-none @2xl:text-[max(11px,1.45cqw)]">
              completed every lesson, checkpoint and the capstone film of
              <span className="mt-[0.3em] block font-heading font-semibold tracking-[-0.02em] text-ink @2xl:text-[1.15em]">
                {data.course}
                <span className="font-normal text-ink/60"> · {data.hours}-hour course</span>
              </span>
            </p>
          </div>

          {/* signature · seal · issue */}
          <div className="mt-9 grid grid-cols-1 items-end gap-x-6 gap-y-7 @2xl:mt-[2.4cqw] @2xl:grid-cols-[1fr_auto_1fr] @2xl:gap-x-[3cqw]">
            <div className="max-w-[17em] text-[12px] @2xl:text-[max(11px,1.15cqw)]">
              <Signature className="-mb-[0.6em] ml-[-0.2em] w-[9.5em] @2xl:w-[13cqw]" />
              <p className="border-t border-ink/80 pt-[0.5em] font-semibold">{signer}, Director</p>
              <p className="text-ink/60">For Tamada Media</p>
            </div>
            <div className="order-first flex justify-center @2xl:order-none">
              <CertSeal className="w-[92px] @2xl:w-[10.5cqw]" />
            </div>
            <div className="flex items-end justify-between gap-4 text-[12px] @2xl:justify-end @2xl:gap-[1.4cqw] @2xl:text-right @2xl:text-[max(11px,1.15cqw)]">
              <div className="min-w-0">
                <p className="font-mono font-semibold tracking-[0.04em]">{formatDate(data.issuedAt, "long")}</p>
                <p className="text-ink/60">Date issued</p>
                <p className="mt-[0.5em] font-mono text-[max(10px,0.82em)] text-ink/60 [overflow-wrap:anywhere]">
                  tamada.demo/certificates/
                  <wbr />
                  <span className="whitespace-nowrap">{data.code}</span>
                </p>
              </div>
              <CodePattern code={data.code} className="w-[60px] shrink-0 @2xl:w-[7.2cqw]" />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
