import type { Metadata } from "next";
import { UsersPage } from "@/components/admin/UsersView";

export const metadata: Metadata = { title: "People" };

export default function Page() {
  return <UsersPage />;
}
