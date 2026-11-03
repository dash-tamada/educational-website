"use client";

import { useCallback } from "react";
import { toast } from "@/components/app";
import { demo, getLiveDb, useDb } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import { DEMO_STUDENT_ID, getUser, isEnrolled, isWishlisted } from "@/lib/mock";

/**
 * Wishlist hearts for public pages. Students save straight to the demo store;
 * logged-out visitors (and tutor/admin demos) get a toast with a one-click way in,
 * and that click also saves the course they tapped, so nobody has to tap twice.
 */
export function useWishlist() {
  const db = useDb();
  const { session, loginAs } = useDemoAuth();
  const uid = session?.role === "student" ? session.userId : null;
  const isSaved = useCallback((courseId: string) => isWishlisted(uid, courseId, db), [uid, db]);
  /** Owned courses never get a heart (see CatalogCard); this guards direct calls. */
  const isOwned = useCallback((courseId: string) => isEnrolled(uid, courseId, db), [uid, db]);

  const save = useCallback((userId: string, courseId: string, title: string, viaLogin: boolean) => {
    const live = getLiveDb();
    const who = viaLogin ? `${getUser(userId, live)?.name.split(" ")[0] ?? "The demo student"}'s` : "your";
    if (isEnrolled(userId, courseId, live)) {
      toast.info(viaLogin ? "Already in the library" : "You already own this one", {
        description: `${title} is in ${who} courses, so there's nothing to save.`,
      });
      return;
    }
    if (viaLogin && isWishlisted(userId, courseId, live)) {
      toast.success("Already saved", { description: `${title} was on ${who} wishlist.` });
      return;
    }
    const saved = demo.toggleWishlist(userId, courseId);
    if (saved) toast.success("Saved for later", { description: `${title} is on ${who} wishlist.` });
    else toast("Removed from your wishlist");
  }, []);

  const toggle = useCallback(
    (courseId: string, title: string) => {
      if (!session || session.role !== "student") {
        const loggedOut = !session;
        toast({
          title: loggedOut ? "Log in to save courses" : "Wishlists live in the student space",
          description: loggedOut
            ? "Or try it with Priya, the demo student. No password needed. We'll save this one for you."
            : "Switch to the student demo and we'll save this one for you.",
          tone: "info",
          duration: 7000,
          action: {
            label: loggedOut ? "Use demo" : "Switch to student",
            onClick: () => {
              loginAs("student");
              save(DEMO_STUDENT_ID, courseId, title, true);
            },
          },
        });
        return;
      }
      save(session.userId, courseId, title, false);
    },
    [session, loginAs, save],
  );
  return { isSaved, isOwned, toggle, canSave: !!uid };
}
