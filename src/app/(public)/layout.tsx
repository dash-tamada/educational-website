import { SmoothScroll } from "@/components/motion/SmoothScroll";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SmoothScroll>{children}</SmoothScroll>;
}
