import type { Tone } from "@/lib/tone";
import { PageHeader, type Crumb } from "./PageHeader";
import { Card } from "./Card";
import { EmptyState } from "./Display";
import { Button } from "./Button";
import { SiteShell } from "./SiteShell";

/* Temporary page bodies so every route in the manifest renders while the page
   agents build their areas. Replace the whole page.tsx; don't extend these. */

export function BeingBuilt({
  title,
  eyebrow,
  eyebrowTone,
  description,
  breadcrumbs,
  note = "This page is being built. The data, shell and navigation around it already work.",
}: {
  title: string;
  eyebrow?: string;
  eyebrowTone?: Tone;
  description?: string;
  breadcrumbs?: Crumb[];
  note?: string;
}) {
  return (
    <div className="app-enter">
      <PageHeader title={title} eyebrow={eyebrow} eyebrowTone={eyebrowTone} description={description} breadcrumbs={breadcrumbs} />
      <Card>
        <EmptyState art="none" eyebrow="In production" title="Under construction." body={note} />
      </Card>
    </div>
  );
}

export function PublicBeingBuilt({ title, eyebrow, description }: { title: string; eyebrow?: string; description?: string }) {
  return (
    <SiteShell>
      <div className="container-x pb-section app-enter">
        <PageHeader title={title} eyebrow={eyebrow} description={description} />
        <Card>
          <EmptyState
            art="none"
            eyebrow="In production"
            title="Under construction."
            body="This page is being built. Meanwhile, the first video of every course is free."
            action={<Button href="/" variant="outline">Back home</Button>}
          />
        </Card>
      </div>
    </SiteShell>
  );
}
