import type { Metadata } from "next";
import { AreaLayout } from "@/components/app/AreaLayout";

export const metadata: Metadata = {
  title: {
    default: "Student space",
    template: "%s · Student space | Tamada Media",
  },
  robots: { index: false },
};

/** Foundation-owned: guards the student role and renders the DashboardShell. Pages only render their content. */
export default function Layout({ children }: LayoutProps<"/dashboard">) {
  return <AreaLayout area="student">{children}</AreaLayout>;
}
