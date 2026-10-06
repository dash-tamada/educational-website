"use client";

import { CatalogError } from "@/components/catalog/CatalogError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogError error={error} retry={retry} title="Checkout hit a snag." body="Nothing was charged (it's demo money anyway). Try again, or reset the demo data if it keeps happening." />;
}
