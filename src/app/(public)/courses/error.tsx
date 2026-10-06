"use client";

import { CatalogError } from "@/components/catalog/CatalogError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogError error={error} retry={retry} title="Well, the library tripped over." body="Something broke while loading the courses. Try again, and if it keeps happening, reset the demo data (it lives in this browser)." />;
}
