import type { Metadata } from "next";
import { Wishlist } from "@/components/student/Wishlist";

export const metadata: Metadata = { title: "Wishlist" };

export default function Page() {
  return <Wishlist />;
}
