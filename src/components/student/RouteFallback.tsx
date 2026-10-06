"use client";

import { usePathname } from "next/navigation";
import { CertificatesFallback } from "./Certificates";
import { DashboardFallback } from "./DashboardHome";
import { MyCoursesFallback } from "./MyCourses";
import { OrdersFallback } from "./Orders";
import { SettingsFallback } from "./Settings";
import { WishlistFallback } from "./Wishlist";

/**
 * The skeleton for whichever student page is loading, picked by path. The dashboard-level
 * loading.tsx is the boundary React uses when you move between sibling pages without a
 * prefetch (dev, slow networks), so it has to draw the destination's own structure and
 * real header rather than a generic one.
 */
export function StudentRouteFallback() {
  const path = usePathname() ?? "/dashboard";
  const seg = path.replace(/\/+$/, "").split("/")[2] ?? "";
  switch (seg) {
    case "courses":
      return <MyCoursesFallback />;
    case "wishlist":
      return <WishlistFallback />;
    case "certificates":
      return <CertificatesFallback />;
    case "orders":
      return <OrdersFallback />;
    case "settings":
      return <SettingsFallback />;
    default:
      return <DashboardFallback />;
  }
}
