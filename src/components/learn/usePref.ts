"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readPref, writePref } from "./media";

/* Per-viewer player conveniences (volume, speed, autoplay, captions, sidebar)
   kept in localStorage. useSyncExternalStore keeps SSR + hydration on the
   fallback and swaps to the stored value right after, without effects. */

const subs = new Map<string, Set<() => void>>();
const cache = new Map<string, unknown>();

function subscribe(key: string, cb: () => void) {
  let set = subs.get(key);
  if (!set) subs.set(key, (set = new Set()));
  set.add(cb);
  return () => set!.delete(cb);
}

export function usePref<T>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    useCallback((cb) => subscribe(key, cb), [key]),
    () => {
      if (!cache.has(key)) cache.set(key, readPref(key, fallback));
      return cache.get(key) as T;
    },
    () => fallback,
  );
  const set = useCallback(
    (v: T) => {
      cache.set(key, v);
      writePref(key, v);
      subs.get(key)?.forEach((cb) => cb());
    },
    [key],
  );
  return [value, set];
}
