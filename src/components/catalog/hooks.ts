"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/app";
import { demo, getLiveDb, useDb, useStoreHydrated } from "@/lib/demo/store";
import { useDemoAuth } from "@/lib/demo/session-client";
import { DEMO_STUDENT_ID, getUser, isEnrolled, isWishlisted } from "@/lib/mock";
import { parseCatalogQuery, resolveCategorySlug, serializeCatalogQuery, type CatalogQuery } from "@/lib/mock/extra/catalog";

/**
 * Catalog filters live in the URL (/courses?q=…&category=…). Reading goes through
 * useSearchParams; writing uses the native history API, which Next.js syncs with
 * useSearchParams, so filtering is instant (no server round trip) and shareable.
 */
export function useCatalogQuery() {
  const sp = useSearchParams();
  const db = useDb();
  const hydrated = useStoreHydrated();
  const raw = sp.get("category");
  const query = useMemo(() => {
    const q = parseCatalogQuery(new URLSearchParams(sp.toString()));
    // "exam prep", "Coding", unknown values: resolve to the real slug or drop it
    return { ...q, category: resolveCategorySlug(q.category, db) };
  }, [sp, db]);

  // inbound links with a non-canonical category get a tidy, shareable URL
  // (after the store overlay, so a category created in the admin demo survives)
  useEffect(() => {
    if (!hydrated || raw === null || raw === query.category) return;
    const qs = serializeCatalogQuery(query);
    window.history.replaceState(null, "", qs ? `/courses?${qs}` : "/courses");
  }, [hydrated, raw, query]);

  const setQuery = useCallback((patch: Partial<CatalogQuery>, opts: { push?: boolean } = {}) => {
    const parsed = parseCatalogQuery(new URLSearchParams(window.location.search));
    const current = { ...parsed, category: resolveCategorySlug(parsed.category, getLiveDb()) };
    const next: CatalogQuery = { ...current, ...patch };
    // any change other than paging starts from the first page again
    if (!("page" in patch)) next.page = 1;
    const qs = serializeCatalogQuery(next);
    const url = qs ? `/courses?${qs}` : "/courses";
    if (opts.push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);
  return { query, setQuery };
}

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
