"use client";

import { useCallback } from "react";
import { toast } from "@/components/app";
import { demo, getLiveDb } from "@/lib/demo/store";
import { getWishlist, type Db } from "@/lib/mock";

/* =============================================================================
   Wishlist helpers shared by the dashboard tab and the wishlist page.

   Undo after a remove puts the exact row back in the demo store
   (demo.restoreWishlist: same id, same "saved" date), so every reader of the
   wishlist (catalog hearts, admin, sort by saved date) sees the original row.
   ============================================================================= */

export type WishlistRow = ReturnType<typeof getWishlist>[number];

/** The learner's wishlist, newest first. */
export function useMyWishlist(uid: string, db: Db): WishlistRow[] {
  return getWishlist(uid, db);
}

/**
 * Remove a course from the wishlist with a toast + Undo that restores the same
 * row. `afterRemove` runs right after the removal (use it to move keyboard
 * focus somewhere sensible).
 */
export function useWishlistRemove(uid: string) {
  return useCallback(
    (courseId: string, title: string, afterRemove?: () => void) => {
      const row = getLiveDb().wishlist.find((w) => w.userId === uid && w.courseId === courseId);
      if (!row) return;
      const snapshot = { ...row };
      demo.toggleWishlist(uid, courseId);
      afterRemove?.();
      toast({
        title: "Removed from your wishlist",
        description: title,
        action: {
          label: "Undo",
          onClick: () => {
            if (getLiveDb().wishlist.some((w) => w.userId === uid && w.courseId === courseId)) return;
            demo.restoreWishlist(snapshot);
            toast.success("Back on your wishlist", { description: title });
          },
        },
      });
    },
    [uid],
  );
}
