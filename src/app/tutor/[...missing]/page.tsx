import { notFound } from "next/navigation";

/** Unknown studio URLs (e.g. /tutor/coursez) get the studio's own not-found, inside the shell. */
export default function Page() {
  notFound();
}
