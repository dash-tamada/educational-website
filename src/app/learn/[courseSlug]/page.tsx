import { ResumeRedirect } from "@/components/learn/ResumeRedirect";

/** /learn/[courseSlug]: sends the learner to the item to resume (demo store aware) or the free preview. */
export default function Page() {
  return <ResumeRedirect />;
}
