import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Avatar, DemoPill, Icon, Rating } from "@/components/app";
import { Sparkle, Tag } from "@/components/decor/Bits";
import { toneBg } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import { formatDate, formatDuration, formatNumber, type CourseCardData, type ModuleItem } from "@/lib/mock";
import { HeroCta } from "./HeroCta";
import { DARK_TONES, heroText } from "./ui";

const BADGE_TONE = { BESTSELLER: "hotpink", NEW: "green", "JUST DROPPED": "blue" } as const;

/**
 * Course page hero: an inset panel in the course's own colour. Title + promise +
 * tutor + meta on the left, the free first video as a big poster on the right.
 */
const YELLOW_TONES = new Set<string>(["butter", "sun", "lime"]);

export function CourseHero({ data, freeItem }: { data: CourseCardData; freeItem: ModuleItem | null }) {
  const { course, tutor, category, stats } = data;
  const dark = DARK_TONES.has(course.tone);
  const freeLesson = freeItem?.type === "video" ? freeItem.lesson : null;
  const freeHref = freeItem ? `/learn/${course.slug}/${freeItem.id}` : null;

  return (
    <section
      aria-labelledby="course-title"
      data-field={dark ? "dark" : undefined}
      className={clsx("panel py-10 md:py-14 lg:py-16", toneBg[course.tone], heroText(course.tone))}
    >
      <Sparkle fill={dark ? "#ffcf3f" : "#ffffff"} className="pointer-events-none absolute top-8 right-[6%] hidden size-10 md:block" />
      <div className="container-x relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-12">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] font-bold">
              <li>
                <Link href="/courses" className="rounded-md underline-offset-4 hf:underline">
                  Courses
                </Link>
              </li>
              {category && (
                <li className="flex items-center gap-1">
                  <Icon name="chevron-right" className="size-3.5" />
                  <Link href={`/courses?category=${category.slug}`} className="rounded-md underline-offset-4 hf:underline">
                    {category.name}
                  </Link>
                </li>
              )}
            </ol>
          </nav>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {course.badge && <Tag tone={BADGE_TONE[course.badge]} className="tracking-[0.04em] uppercase">{course.badge}</Tag>}
            <Tag tone={dark ? "white" : "ink"}>{course.level}</Tag>
            <Tag tone={dark ? "ink" : "white"}>{course.language}</Tag>
          </div>

          <h1 id="course-title" className="t-display-l mt-4 max-w-[13ch] text-[clamp(2.5rem,1.4rem+4vw,5.25rem)]">
            {course.title}
          </h1>
          <p className="t-body-l mt-sub max-w-[36rem]">{course.promise}</p>

          {tutor && (
            <Link href={`/tutors/${tutor.slug}`} className="group mt-6 inline-flex items-center gap-3 rounded-full py-1 pr-3">
              <Avatar name={tutor.name} src={tutor.avatar} tone={tutor.tone} size="md" ring decorative />
              <span className="text-[15px] leading-tight">
                <span className="block font-bold underline-offset-4 group-hf:underline">By {tutor.name}</span>
                <span className="block text-[13px] font-semibold">{tutor.headline}</span>
              </span>
            </Link>
          )}

          <ul className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5 text-[14px] font-semibold">
            <li className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3 pl-2.5 text-ink">
              <Rating value={course.rating} count={course.reviewCount} size="sm" />
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Icon name="users" className="size-4" />
              {formatNumber(course.learners)} learners
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="size-4" />
              {stats.videos} lessons · {formatDuration(stats.totalSec)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Icon name="refresh" className="size-4" />
              Updated {formatDate(course.updatedAt)}
            </li>
            <li>
              {/* the light pill is butter: on butter / sun / lime heroes it would lose its shape */}
              <DemoPill tone={dark ? "dark" : "light"} className={clsx(!dark && YELLOW_TONES.has(course.tone) && "bg-white!")} />
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <HeroCta courseId={course.id} slug={course.slug} freeHref={freeHref} variant={dark ? "sun" : "ink"} />
            <a href="#curriculum" className="inline-flex items-center gap-1.5 rounded-full px-1 text-[15px] font-bold underline-offset-4 hf:underline">
              See what&apos;s inside
              <Icon name="arrow-down" className="size-4" strokeWidth={2.4} />
            </a>
          </div>
        </div>

        {freeHref && freeLesson ? (
          <Link href={freeHref} className="group hover-zoom-parent relative block overflow-hidden rounded-card-lg bg-ink shadow-photo" aria-label={`Watch the free first video: ${freeLesson.title}`}>
            <div className="relative aspect-[4/3] sm:aspect-video">
              <Image src={cropSrc(course.thumbnail, 3 / 4)} alt="" fill sizes="(min-width: 1024px) 500px, 100vw" preload className="hover-zoom object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" aria-hidden />
              <span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-[70%] sm:size-[72px] sm:-translate-y-1/2 place-items-center rounded-full bg-sun text-ink shadow-lift transition-[scale] duration-300 ease-spring group-hf:scale-110 md:size-20" aria-hidden>
                <Icon name="play" className="ml-1 size-8 fill-current" strokeWidth={1.5} />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag tone="sun" className="tracking-[0.04em] uppercase">
                    Free preview
                  </Tag>
                  <Tag tone="ink">{formatDuration(freeLesson.durationSec, "clock")}</Tag>
                </div>
                <p className="mt-2 font-heading text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-tight font-extrabold tracking-[-0.02em]">{freeLesson.title}</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-card-lg bg-ink shadow-photo">
            <Image src={cropSrc(course.thumbnail, 9 / 16)} alt="" fill sizes="(min-width: 1024px) 500px, 100vw" preload className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
