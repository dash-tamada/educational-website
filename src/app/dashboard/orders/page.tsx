import type { Metadata } from "next";
import { Orders } from "@/components/student/Orders";

export const metadata: Metadata = { title: "Orders" };

export default async function Page({
  searchParams,
}: PageProps<"/dashboard/orders">) {
  const { order } = await searchParams;
  const id = Array.isArray(order) ? order[0] : order;
  return <Orders key={id ?? "none"} initialOrder={id?.slice(0, 40)} />;
}
