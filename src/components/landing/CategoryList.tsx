import Link from "next/link";
import { categories } from "@/lib/landing-data";
import { HandNote } from "@/components/decor/Bits";
import { Mascot } from "@/components/decor/Mascot";
import { Reveal } from "@/components/motion/Reveal";

const hoverTones = [
  "hover:text-lime",
  "hover:text-yellow",
  "hover:text-cyan",
  "hover:text-paper",
  "hover:text-orange",
];

/** Aardvark's giant stacked genre list, as course categories. */
export function CategoryList() {
  return (
    <section className="px-2 md:px-4">
      <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-magenta px-4 py-20 text-center md:py-28">
        <HandNote className="absolute top-10 left-6 hidden w-48 text-left text-ink md:block lg:left-16">
          There&apos;s a course for every kind of curious
        </HandNote>
        <p className="font-heading text-lg font-bold">Choose from</p>
        <Reveal as="ul" stagger className="mt-2">
          {categories.map((c, i) => (
            <li key={c}>
              <Link
                href={`/courses?category=${encodeURIComponent(c.toLowerCase())}`}
                className={`inline-block font-heading text-[clamp(2.4rem,8.2vw,6.6rem)] leading-[0.98] font-extrabold tracking-[-0.045em] transition-[color,rotate,scale] duration-300 hover:scale-105 ${hoverTones[i % hoverTones.length]} ${i % 2 ? "hover:rotate-2" : "hover:-rotate-2"}`}
              >
                {c}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/courses"
              className="inline-block font-heading text-[clamp(2.4rem,8.2vw,6.6rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-paper transition-transform [-webkit-text-stroke:2px_#161616] hover:scale-105"
            >
              and more!
            </Link>
          </li>
        </Reveal>
        <Mascot
          className="mx-auto mt-8 size-16 animate-float [--r:-6deg]"
          wink
          title=""
        />
      </div>
    </section>
  );
}
