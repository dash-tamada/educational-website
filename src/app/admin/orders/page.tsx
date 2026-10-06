import type { Metadata } from "next";
import { OrdersPage } from "@/components/admin/OrdersView";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersPage />;
}
