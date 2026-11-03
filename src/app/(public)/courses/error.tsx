"use client";

import { CatalogError } from "@/components/catalog/CatalogError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogError error={error} retry={retry} title="The course page tripped over." body="Something broke while loading the course. Try again, and if it keeps happening, reset the demo data (it lives in this browser)." />;
}
