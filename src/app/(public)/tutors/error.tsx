"use client";

import { CatalogError } from "@/components/catalog/CatalogError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogError error={error} retry={retry} title="That profile didn't load." body="Something broke while loading this profile. Try again, or reset the demo data if it keeps happening." />;
}
