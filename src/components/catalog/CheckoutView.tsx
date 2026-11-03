import type { Course } from "@/lib/mock";
import { CheckoutClient } from "./CheckoutClient";

/** /checkout/[slug] body (server page for seeded courses, client fallback for demo-store ones). */
export function CheckoutView({ course, initialCoupon }: { course: Course; initialCoupon?: string }) {
  return (
    <div className="container-wide pb-[calc(var(--section-y)*0.5)]">
      {/* the heading lives in the client: it depends on the demo store (already owned, not on sale) */}
      <CheckoutClient courseId={course.id} initialCoupon={initialCoupon} />
    </div>
  );
}
