import { Button, Card, EmptyState, PageHeader } from "@/components/app";

/** The tutor studio's 404: stays inside the studio shell with a way back. */
export function StudioNotFound() {
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Tutor studio"
        eyebrowTone="green"
        title="We can't find that page."
        description="The link may be old, or the course was created in another browser. Demo drafts live only where you made them."
        breadcrumbs={[{ label: "Studio", href: "/tutor" }, { label: "Not found" }]}
      />
      <Card padding="lg">
        <EmptyState
          art="tami"
          title="Tami looked everywhere."
          body="Head back to your courses, or start a fresh draft. Titles first, lessons later."
          action={
            <>
              <Button href="/tutor/courses" iconRight="arrow-right">
                Your courses
              </Button>
              <Button href="/tutor" variant="secondary">
                Studio home
              </Button>
            </>
          }
        />
      </Card>
    </div>
  );
}
