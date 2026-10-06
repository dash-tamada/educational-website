"use client";

import { CourseCard } from "@/components/app";
import { useDb } from "@/lib/demo/store";
import { useDemoSession } from "@/lib/demo/session-client";
import { getCourseCard, getCourseProgress, isEnrolled } from "@/lib/mock";
import { useWishlist } from "./hooks";

const BADGE_BG: Record<string, string> = {
  BESTSELLER: "bg-hotpink-deep text-white",
  NEW: "bg-green text-ink",
  "JUST DROPPED": "bg-blue text-white",
};

/**
 * A catalog CourseCard that knows who is looking. For a course the demo student
 * already owns it switches to the progress card ("56% done" / "Done", Continue,
 * no price, no FREE PREVIEW, no heart), so owned and unowned courses never look
 * the same. Everyone else gets the catalog card with a working wishlist heart.
 *
 * `compact` renders the phone row card (CourseCard variant="compact": 112x70 thumb,
 * 2-line title, tutor · rating · price, Free tag, 44px heart) and adds the course
 * badge (BESTSELLER / NEW / JUST DROPPED) on the thumbnail, like the big card.
 */
export function CatalogCard({ courseId, priority, headingLevel, compact = false }: { courseId: string; priority?: boolean; headingLevel?: "h2" | "h3"; compact?: boolean }) {
  const db = useDb();
  const session = useDemoSession();
  const { isSaved, toggle } = useWishlist();
  const data = getCourseCard(courseId, db);
  if (!data) return null;
  const uid = session?.role === "student" ? session.userId : null;
  const owned = !!uid && isEnrolled(uid, data.course.id, db);
  if (compact) {
    const badge = !owned ? data.course.badge : undefined;
    return (
      <div className="relative">
        {owned ? (
          <CourseCard data={data} variant="compact" progress={getCourseProgress(uid!, data.course.id, db)} priority={priority} headingLevel={headingLevel} />
        ) : (
          <CourseCard
            data={data}
            variant="compact"
            priority={priority}
            headingLevel={headingLevel}
            wishlisted={isSaved(data.course.id)}
            onToggleWishlist={() => toggle(data.course.id, data.course.title)}
          />
        )}
        {badge && (
          // sits on the thumbnail's top-left corner (the card is 10px padded, thumb 70px tall)
          <span className={`pointer-events-none absolute top-[14px] left-[14px] inline-flex h-5 items-center rounded-full px-1.5 text-[12px] leading-none font-bold uppercase ${BADGE_BG[badge] ?? "bg-white text-ink"}`}>
            {badge}
          </span>
        )}
      </div>
    );
  }
  if (owned) {
    return <CourseCard data={data} variant="progress" progress={getCourseProgress(uid!, data.course.id, db)} priority={priority} headingLevel={headingLevel} />;
  }
  return <CourseCard data={data} priority={priority} headingLevel={headingLevel} wishlisted={isSaved(data.course.id)} onToggleWishlist={() => toggle(data.course.id, data.course.title)} />;
}

/**
 * Hide trailing cards so the last row is never a lone orphan:
 * one column (phones) shows up to `mobileMax`, two columns (sm..lg) an even
 * count, three columns (lg+) a multiple of three. Returns the li class for item i.
 */
export function balanceClass(i: number, n: number, mobileMax = 3): string {
  const sm = n < 2 ? n : n - (n % 2);
  const lg = n < 3 ? n : n - (n % 3);
  const onBase = i < Math.min(n, mobileMax);
  const onSm = i < sm;
  const onLg = i < lg;
  return [
    onBase ? "" : "hidden",
    onSm === onBase ? "" : onSm ? "sm:block" : "sm:hidden",
    onLg === onSm ? "" : onLg ? "lg:block" : "lg:hidden",
  ]
    .filter(Boolean)
    .join(" ");
}
