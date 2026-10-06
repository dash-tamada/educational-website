import type { Metadata } from "next";
import { AreaLayout } from "@/components/app/AreaLayout";

export const metadata: Metadata = {
  title: { default: "Tutor studio", template: "%s · Tutor studio | Tamada Media" },
  robots: { index: false },
};

/** Foundation-owned: guards the tutor role and renders the DashboardShell. Pages only render their content. */
export default function Layout({ children }: LayoutProps<"/tutor">) {
  return <AreaLayout area="tutor">{children}</AreaLayout>;
}
