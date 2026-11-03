import clsx from "clsx";
import { BrandMark } from "@/components/editorial";

/* =============================================================================
   The certificate teaser: a cream "paper" with a hairline inner frame, the Anton
   title, the holder's name, the director's line and a verify code. Used on the
   course page (09) and on the checkout success screen (with the buyer's name).
   Purely presentational (server-safe). Decorative copy is aria-hidden by the
   caller when a real heading says the same thing.
   ============================================================================= */
export function CertificateTeaser({
  title,
  name,
  course,
  director,
  code,
  className,
}: {
  title: string;
  name: string;
  course: string;
  director: string;
  code: string;
  className?: string;
}) {
  return (
    <figure className={clsx("ground-cream relative aspect-[1.414/1] w-full overflow-hidden text-ink", className)}>
      {/* inner hairline frame */}
      <div className="absolute inset-[3.2%] border border-ink/25" aria-hidden />
      <div className="absolute inset-[5.2%] border border-ink/10" aria-hidden />
      <div className="absolute inset-[8%] flex flex-col justify-between [container-type:inline-size]">
        <div className="flex items-start justify-between gap-4">
          <BrandMark tone="dark" lazy sizes="120px" className="w-[clamp(44px,17cqw,112px)]" />
          <p className="font-mono text-[clamp(7px,1.9cqw,11px)] tracking-[0.12em] text-ink/60 uppercase">Certificate of completion</p>
        </div>
        <div>
          <p className="font-mono text-[clamp(7px,1.8cqw,11px)] tracking-[0.14em] text-ink/55 uppercase">This certifies that</p>
          <p className="mt-[1.2cqw] font-heading text-[clamp(14px,5.4cqw,34px)] leading-none font-semibold tracking-[-0.035em]">{name}</p>
          <p className="mt-[2.6cqw] font-display text-[clamp(22px,9.6cqw,64px)] leading-[0.86] uppercase">
            {title.split(" ").map((w, i, a) => (
              <span key={i} className={i === a.length - 1 ? "text-red" : undefined}>
                {w}
                {i < a.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
          <p className="mt-[1.6cqw] text-[clamp(8px,2.2cqw,13px)] leading-snug text-ink/70">for completing {course}</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-[clamp(10px,3cqw,18px)] leading-none font-medium tracking-[-0.02em] italic">{director}</p>
            <p className="mt-[1cqw] border-t border-ink/30 pt-[1cqw] font-mono text-[clamp(6px,1.6cqw,10px)] tracking-[0.12em] text-ink/55 uppercase">Director</p>
          </div>
          <div className="flex items-end gap-[2cqw]">
            <p className="text-right font-mono text-[clamp(6px,1.6cqw,10px)] leading-[1.5] tracking-[0.1em] text-ink/60 uppercase">
              Verify
              <br />
              {code}
            </p>
            <span aria-hidden className="grid size-[clamp(22px,8cqw,52px)] place-items-center bg-red font-display text-[clamp(8px,2.6cqw,16px)] leading-none text-white">
              TM
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
