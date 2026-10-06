"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Icon } from "@/components/app";
import { useDb } from "@/lib/demo/store";
import { formatDate, getUser, type Db, type Profile } from "@/lib/mock";

/** Who suspended someone, when, and the internal note (from Profile.suspension). */
export function suspensionInfo(u: Profile, db: Db) {
  const rec = u.status === "suspended" ? u.suspension : undefined;
  if (!rec) return null;
  return {
    by: getUser(rec.by, db)?.name ?? "An admin",
    at: formatDate(rec.at, "medium"),
    note: rec.note.trim(),
  };
}

/** Notes used to live under this key before the store kept them; clear the leftovers once. */
function useDropLegacyNotes() {
  useEffect(() => {
    try {
      window.localStorage.removeItem("tm-admin-suspensions");
    } catch {
      /* storage blocked: nothing to clean */
    }
  }, []);
}

/** "Suspended by Admin · 5 Oct 2026" + the note, for a suspended person (drawer). */
export function SuspensionNote({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const db = useDb();
  useDropLegacyNotes();
  const u = getUser(userId, db);
  const info = u ? suspensionInfo(u, db) : null;
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-tag bg-[#ffe1d4] p-3 text-[14px] text-[#7a2200]",
        className,
      )}
    >
      <Icon name="lock" className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
      <div className="min-w-0">
        <p className="font-bold">
          {info ? `Suspended by ${info.by} · ${info.at}` : "Suspended"}
        </p>
        <p className="mt-0.5 font-medium break-words">
          {info ? (
            info.note ? (
              <>“{info.note}”</>
            ) : (
              "No note left."
            )
          ) : (
            "Suspended before this demo started, so there's no note on file."
          )}
        </p>
      </div>
    </div>
  );
}
