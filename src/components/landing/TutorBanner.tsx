import Image from "next/image";
import { tutorPhotos } from "@/lib/landing-data";
import { ArrowButton, Blob, Eyebrow, Script } from "@/components/decor/Bits";
import { Reveal } from "@/components/motion/Reveal";

const photoPos = [
  "md:left-[54%] md:top-[8%] md:size-28",
  "md:left-[66%] md:top-[46%] md:size-24",
  "md:right-[4%] md:-top-[8%] md:size-32",
];

/** Krackerz's maroon "for recruiters, design educators…" partner banner, for tutors. */
export function TutorBanner() {
  return (
    <section id="tutors" className="scroll-mt-24 px-3 py-24 md:px-4 md:py-32">
      <Reveal className="relative mx-auto max-w-6xl overflow-visible rounded-[2rem] bg-maroon px-6 pt-14 pb-10 text-paper md:px-14 md:py-16">
        <Blob
          fill="#7a1620"
          variant={2}
          className="inset-x-0 bottom-0 h-1/2 w-full rounded-b-[2rem]"
        />
        <Eyebrow className="absolute -top-3 left-8 bg-tomato">
          Teach with us
        </Eyebrow>

        <div className="relative max-w-xl">
          <h2 className="font-display text-[clamp(1.25rem,3vw,2.2rem)] leading-[1.45] uppercase">
            <Script className="text-[1.4em] text-lime">for</Script> tutors,
            <br /> creators{" "}
            <Script className="text-[1.4em] text-lime">&amp;</Script> schools
          </h2>
          <p className="mt-4 max-w-md text-base font-medium text-paper/85">
            Upload your videos, organise them into modules, drop tests between
            lessons and get paid every time someone buys your course.
          </p>
          <ArrowButton href="/become-tutor" className="mt-7">
            Become a tutor
          </ArrowButton>
        </div>

        <div className="relative mt-10 flex gap-3 md:absolute md:inset-0 md:mt-0">
          {tutorPhotos.map((src, i) => (
            <div
              key={src}
              className={`relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-paper md:absolute ${photoPos[i]} ${i % 2 ? "rotate-6" : "-rotate-6"}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
