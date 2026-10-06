"use client";

import { useCallback, useEffect } from "react";
import { hasLikedComment, type LessonComment } from "@/lib/mock";
import { demo, getLiveDb } from "@/lib/demo/store";

/*
 * "Helpful" likes and reports for the lesson Q&A.
 *
 * Every Q&A row (including the older "xcmt_*" sample threads, which the seed
 * now owns) is a demo-store row, so likes go through demo.likeComment /
 * unlikeComment and reports through demo.addReport. The tutor inbox and
 * /admin/reports see both.
 *
 * Earlier versions of the player kept some likes and reports in this browser
 * (localStorage "tm-learn-likes-<user>" / "tm-learn-reports-<user>"). Once the
 * store overlay is in, those are moved into the store and the keys dropped.
 */

const PREFIX = "tm-learn-";
const keyFor = (ns: "likes" | "reports", userId: string) =>
  `${PREFIX}${ns}-${userId}`;

function takeLegacy(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    window.localStorage.removeItem(key);
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

type Likeable = Pick<LessonComment, "id" | "likes" | "likedBy">;

/**
 * `ready`: the store overlay is in (legacy local likes/reports migrate then).
 */
export function useCommentLikes(userId: string | null, ready: boolean) {
  useEffect(() => {
    if (!ready || !userId) return;
    const likes = takeLegacy(keyFor("likes", userId));
    const reports = takeLegacy(keyFor("reports", userId));
    if (!likes.length && !reports.length) return;
    const live = getLiveDb();
    for (const id of likes) {
      const c = live.comments.find((x) => x.id === id);
      if (c && !hasLikedComment(c, userId)) demo.likeComment(id, userId);
    }
    for (const id of reports) {
      const c = live.comments.find((x) => x.id === id);
      if (c)
        demo.addReport({
          kind: "comment",
          targetId: id,
          courseId: c.courseId,
          reporterId: userId,
          reason: "Reported by a learner",
        });
    }
  }, [ready, userId]);

  const isLiked = useCallback(
    (c: Likeable) => hasLikedComment(c, userId),
    [userId],
  );
  const count = useCallback((c: Likeable) => c.likes, []);
  /** flips the viewer's like; returns whether it is now liked */
  const toggle = useCallback(
    (c: Likeable) => {
      if (!userId) return false;
      if (hasLikedComment(c, userId)) {
        demo.unlikeComment(c.id, userId);
        return false;
      }
      demo.likeComment(c.id, userId);
      return true;
    },
    [userId],
  );
  return { isLiked, count, toggle };
}
