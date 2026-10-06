import type { Metadata } from "next";
import { getUser } from "@/lib/mock";
import { getDemoSession } from "@/lib/demo/session-server";
import { UserDetail } from "@/components/admin/UserDetail";

/* Metadata runs before the layout's role gate, so only an admin gets the person's
   name in the tab title. Everyone else sees a generic one (no data leaks). */
export async function generateMetadata({
  params,
}: PageProps<"/admin/users/[id]">): Promise<Metadata> {
  const session = await getDemoSession();
  if (session?.role !== "admin") return { title: "Person" };
  const { id } = await params;
  return { title: getUser(id)?.name ?? "Person not found" };
}

/** Unknown ids render an in-shell "not found" state (UserDetail) so the admin keeps their sidebar and context. */
export default async function Page({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  return <UserDetail userId={id} />;
}
