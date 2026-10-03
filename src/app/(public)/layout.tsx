/**
 * Smooth scroll, the route curtain and the reveal scanner live in the root layout
 * (src/app/layout.tsx) so they persist across every route group.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
