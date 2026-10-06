"use client";

import { CatalogCard, balanceClass } from "./CatalogCard";

/**
 * Grid of catalog cards (owned courses show progress, the rest a wishlist heart).
 * `balanced` hides trailing cards so neither the 2- nor the 3-column layout ends
 * on a lone orphan (pass one or two spare ids for that).
 */
export function CourseGrid({ courseIds, balanced = false, className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }: { courseIds: string[]; balanced?: boolean; className?: string }) {
  return (
    <ul className={className}>
      {courseIds.map((id, i) => (
        <li key={id} className={balanced ? balanceClass(i, courseIds.length) : undefined}>
          <CatalogCard courseId={id} />
        </li>
      ))}
    </ul>
  );
}
