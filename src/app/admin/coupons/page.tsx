import type { Metadata } from "next";
import { CouponsView } from "@/components/admin/CouponsView";

export const metadata: Metadata = { title: "Coupons" };

export default function Page() {
  return <CouponsView />;
}
