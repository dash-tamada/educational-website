import { Avatar, Icon } from "@/components/app";
import { ArrowButton, Tag } from "@/components/decor/Bits";
import { formatNumber, type Tutor } from "@/lib/mock";
import { firstName } from "@/lib/mock/extra/catalog";
import { TutorCourseCount, TutorCourseLabel } from "./LiveCounts";
import { SectionTitle } from "./ui";

/** "Your guide for this rabbit hole": tutor summary linking to /tutors/[slug]. */
export function TutorCard({ tutor }: { tutor: Tutor }) {
  const first = firstName(tutor.name);
  return (
    <section aria-labelledby="tutor-title">
      <SectionTitle kicker="Your tutor" title="Your guide for this rabbit hole" id="tutor-title" />
      <div className="mt-6 rounded-card-lg bg-white p-5 shadow-soft md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={tutor.name} src={tutor.avatar} tone={tutor.tone} size="xl" decorative />
          <div className="min-w-0 flex-1">
            <h3 className="t-app-h2">{tutor.name}</h3>
            <p className="mt-1 text-[15px] font-semibold text-ink/65">
              {[tutor.headline, tutor.city].filter(Boolean).join(" · ")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] font-bold">
              <li className="inline-flex items-center gap-1.5">
                <Icon name="star" className="size-4 fill-tangerine text-tangerine" />
                {tutor.reviewCount ? `${tutor.rating.toFixed(1)} tutor rating` : "New tutor"}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="users" className="size-4 text-ink/55" />
                {formatNumber(tutor.learners)} learners
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="book" className="size-4 text-ink/55" />
                {/* live: the admin demo can publish another of this tutor's courses */}
                <TutorCourseCount tutorId={tutor.userId} /> <TutorCourseLabel tutorId={tutor.userId} lower />
              </li>
            </ul>
          </div>
        </div>
        <p className="t-body mt-5 line-clamp-5 whitespace-pre-line text-ink/80">{tutor.bio}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tutor.expertise.map((e) => (
            <Tag key={e} tone="butter">
              {e}
            </Tag>
          ))}
        </div>
        <div className="mt-6">
          <ArrowButton href={`/tutors/${tutor.slug}`} variant="ink" size="sm">
            {`See ${first}'s profile`}
          </ArrowButton>
        </div>
      </div>
    </section>
  );
}
