import type { Metadata } from "next";
import { PaymentsView } from "@/components/admin/PaymentsView";

export const metadata: Metadata = { title: "Payments" };

/** Money overview: revenue, the GST / tutor / platform split, best sellers, coupons and the payout run. */
export default function Page() {
  return <PaymentsView />;
}
