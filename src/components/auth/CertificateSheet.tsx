import Image from "next/image";
import { Mascot } from "@/components/decor/Mascot";
import { ScallopBadge } from "@/components/decor/Scallop";
import { formatDate } from "@/lib/mock";

/** Intrinsic size of public/brand/tamada-media-logo-dark.png (kept local: Header is a client module). */
const LOGO = { w: 1665, h: 546 } as const;

/* =============================================================================
   The certificate itself. A container-query component: below 896px of its
   own width it stacks into a portrait card; from there up it becomes the
   landscape A4 sheet (sizes in cqw so it scales like paper, and prints on one
   A4 landscape page; small print never drops under 10px). Flat: no borders, colour blobs in the corners.
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
      <rect width="7" height="7" rx="1.6" />
      <rect x="1" y="1" width="5" height="5" rx="1.1" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" rx=".7" />
    </g>
  );
}

/** QR-style code pattern (decorative: the human-readable code is what verifies). */
export function CodePattern({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const N = 21;
  const b = bits(code, N * N);
  const finder = (x: number, y: number) => x < 7 && y < 7;
  const inFinder = (x: number, y: number) =>
    finder(x, y) || finder(N - 1 - x, y) || finder(x, N - 1 - y);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (!inFinder(x, y) && b[y * N + x])
        cells.push(
          <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" />,
        );
  return (
    <svg
      viewBox={`-1 -1 ${N + 2} ${N + 2}`}
      className={className}
      role="img"
      aria-label={`Verification pattern for ${code}`}
    >
      <rect x="-1" y="-1" width={N + 2} height={N + 2} rx="2" fill="#fff" />
      <g fill="#161616">
        {cells}
        <Finder x={0} y={0} />
        <Finder x={N - 7} y={0} />
        <Finder x={0} y={N - 7} />
      </g>
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

export function CertificateSheet({
  data,
  className,
}: {
  data: CertificateData;
  className?: string;
}) {
  const verifyUrl = `tamada.demo/certificates/${data.code}`;
  return (
    <div
      className={["cert-sheet @container", className].filter(Boolean).join(" ")}
    >
      <article
        aria-label={`Certificate of completion for ${data.learner}`}
        className="cert-paper relative isolate overflow-hidden rounded-card-lg bg-paper text-ink shadow-photo @4xl:aspect-[1.414/1] @4xl:rounded-[2.2cqw]"
      >
        {/* corner blobs */}
        <svg
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
          viewBox="0 0 1414 1000"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 0 H330 C300 90 210 120 140 170 C80 212 40 260 0 270 Z"
            fill="#ffcf3f"
          />
          <path
            d="M0 0 H190 C170 60 110 90 60 110 C30 122 12 130 0 134 Z"
            fill="#f9a220"
          />
          <path
            d="M1414 1000 H1200 C1215 935 1265 905 1320 880 C1365 860 1395 850 1414 846 Z"
            fill="#ff008c"
          />
          <path
            d="M1414 1000 H1330 C1340 970 1365 955 1390 945 C1400 941 1408 939 1414 938 Z"
            fill="#fd48f2"
          />
          <circle
            cx="1352"
            cy="380"
            r="30"
            fill="#2668fd"
            className="hidden @4xl:block"
          />
          <circle
            cx="70"
            cy="560"
            r="20"
            fill="#00b351"
            className="hidden @4xl:block"
          />
        </svg>
        {/* dotted inner frame */}
        <div
          className="pointer-events-none absolute inset-3 -z-10 rounded-[1.2rem] border-2 border-dashed border-ink/[0.12] @4xl:inset-[1.6cqw] @4xl:rounded-[1.4cqw]"
          aria-hidden
        />

        <div className="flex h-full flex-col px-6 pt-8 pb-7 @4xl:px-[6cqw] @4xl:pt-[4.6cqw] @4xl:pb-[4cqw]">
          {/* top row */}
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-center gap-[0.6em] text-[13px] @4xl:text-[1.3cqw]">
              <Mascot
                title=""
                className="w-[2.6em] shrink-0"
                style={{ transform: "rotate(-6deg)" }}
              />
              <Image
                src="/brand/tamada-media-logo-dark.png"
                alt="Tamada Media"
                width={LOGO.w}
                height={LOGO.h}
                sizes="160px"
                className="h-auto w-[7.6em]"
              />
            </span>
            <span className="text-right">
              <span className="block text-[10px] font-bold tracking-[0.12em] text-ink/65 uppercase @4xl:text-[max(10px,0.95cqw)]">
                Certificate no.
              </span>
              <span className="mt-1 block font-mono text-[13px] font-bold tracking-wide @4xl:text-[max(13px,1.35cqw)]">
                {data.code}
              </span>
            </span>
          </div>

          {/* body */}
          <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center @4xl:mt-[1.5cqw]">
            <p className="rounded-full bg-blue px-3 py-[7px] t-eyebrow text-white @4xl:px-[1.2cqw] @4xl:py-[0.6cqw] @4xl:text-[1.1cqw]">
              Certificate of completion
            </p>
            <p className="mt-5 text-[14px] font-semibold text-ink/65 @4xl:mt-[2cqw] @4xl:text-[1.5cqw]">
              This certifies that
            </p>
            <p className="mt-1 font-script text-[clamp(2.6rem,12cqw,4rem)] leading-[1.05] text-indigo @4xl:mt-[0.4cqw] @4xl:text-[6.4cqw]">
              {data.learner}
            </p>
            <p className="mt-2 text-[14px] font-semibold text-ink/65 @4xl:mt-[0.8cqw] @4xl:text-[1.5cqw]">
              has completed every lesson and test of
            </p>
            <h2 className="mt-3 max-w-[22ch] font-display text-[clamp(1.9rem,9cqw,2.6rem)] leading-[0.92] font-black uppercase @4xl:mt-[1.2cqw] @4xl:text-[4.4cqw]">
              {data.course}
            </h2>
            <p className="mt-3 text-[14px] font-semibold text-ink/65 @4xl:mt-[1.2cqw] @4xl:text-[1.45cqw]">
              a {data.hours}-hour video course on Tamada Media, taught by{" "}
              {data.tutor}
            </p>
          </div>

          {/* signatures, seal, verification */}
          <div className="mt-8 grid grid-cols-1 items-end gap-x-4 gap-y-6 @4xl:mt-[2cqw] @4xl:grid-cols-[1fr_auto_1fr] @4xl:gap-x-[3cqw]">
            <div className="text-[12px] @4xl:text-[max(11.5px,1.2cqw)]">
              <p className="font-script text-[2.1em] leading-none text-ink/85">
                {data.tutor}
              </p>
              <p className="mt-[0.4em] border-t-2 border-ink/80 pt-[0.4em] font-bold">
                {data.tutor}
              </p>
              <p className="text-ink/65">Course tutor</p>
            </div>
            <div className="order-first flex justify-center @4xl:order-none">
              <ScallopBadge
                fill="#ffcf3f"
                bumps={16}
                className="size-[104px] @4xl:size-[11cqw]"
              >
                <div className="flex h-full flex-col items-center justify-center">
                  <Mascot
                    title=""
                    className="w-[38%]"
                    style={{ transform: "rotate(-6deg)" }}
                  />
                  <span className="mt-[4%] text-[10px] font-black tracking-[0.12em] uppercase @4xl:text-[max(10px,0.95cqw)]">
                    Verified
                  </span>
                </div>
              </ScallopBadge>
            </div>
            <div className="flex items-end justify-between gap-3 text-left text-[12px] @4xl:justify-end @4xl:gap-[1.2cqw] @4xl:text-right @4xl:text-[max(11.5px,1.2cqw)]">
              <div className="min-w-0">
                <p className="font-bold">{formatDate(data.issuedAt, "long")}</p>
                <p className="text-ink/65">Date issued</p>
                <p className="mt-[0.5em] text-[max(10px,0.85em)] break-all text-ink/65">
                  {verifyUrl}
                </p>
              </div>
              <CodePattern
                code={data.code}
                className="w-[64px] shrink-0 @4xl:w-[7.5cqw]"
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
