import type { Metadata } from "next";
import { AreaLayout } from "@/components/app/AreaLayout";

export const metadata: Metadata = {
  title: { default: "Admin control room", template: "%s · Admin control room | Tamada Media" },
  robots: { index: false },
};

/** Foundation-owned: guards the admin role and renders the DashboardShell. Pages only render their content. */
export default function Layout({ children }: LayoutProps<"/admin">) {
  return <AreaLayout area="admin">{children}</AreaLayout>;
}
