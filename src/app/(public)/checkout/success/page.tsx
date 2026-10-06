import type { Metadata } from "next";
import { SiteShell } from "@/components/app";
import { CheckoutSuccess } from "@/components/catalog/CheckoutSuccess";
import { DemoSessionSeed } from "@/lib/demo/session-client";
import { getDemoCookieValue } from "@/lib/demo/session-server";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/checkout/success">) {
  const sp = await searchParams;
  const order = typeof sp.order === "string" ? sp.order : null;
  const cookie = await getDemoCookieValue();
  return (
    <DemoSessionSeed value={cookie}>
      <SiteShell>
        <CheckoutSuccess orderId={order} />
      </SiteShell>
    </DemoSessionSeed>
  );
}
