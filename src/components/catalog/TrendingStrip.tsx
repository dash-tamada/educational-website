"use client";

import Image from "next/image";
import { useRef } from "react";
import Link from "next/link";
import { DemoPill, Icon } from "@/components/app";
import { toneBg } from "@/lib/landing-data";
import { cropSrc } from "@/lib/img";
import { useDemoSession } from "@/lib/demo/session-client";
import { getTutor, formatINR, formatNumber, isEnrolled, type Db } from "@/lib/mock";
import { getTrending } from "@/lib/mock/extra/catalog";
import { ScrollTrack } from "./mobile";

/** "Trending this week": blue strip of the five courses most people joined lately. */
export function TrendingStrip({ db }: { db: Db }) {
  const list = getTrending(5, db);
  const session = useDemoSession();
  const uid = session?.role === "student" ? session.userId : null;
  const rail = useRef<HTMLOListElement>(null);
  return (
    <section aria-labelledby="trending-title" data-field="dark" className="rounded-card-lg bg-blue p-4 pb-5 text-white md:p-6 md:pb-7">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="t-eyebrow text-sun">Hot right now</p>
          <h2 id="trending-title" className="t-chunky-card mt-2">
            Trending this week
          </h2>
        </div>
        <DemoPill tone="dark" />
      </div>
      <ol ref={rail} className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 no-scrollbar md:-mx-6 md:scroll-px-6 md:px-6 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
        {list.map((c, i) => {
          const tutor = getTutor(c.tutorId, db);
          return (
            <li key={c.id} className="w-[min(70vw,300px)] shrink-0 snap-start sm:w-[232px] xl:w-auto">
              <article className="group hover-lift relative flex h-full flex-col rounded-card bg-white p-2.5 pb-3.5 text-ink">
                <div className={`relative aspect-[16/10] overflow-hidden rounded-img ${toneBg[c.tone]}`}>
                  <Image src={cropSrc(c.thumbnail, 10 / 16)} alt="" fill sizes="232px" className="object-cover" />
                  <span className="absolute top-2 left-2 grid h-9 min-w-9 place-items-center rounded-full bg-sun px-2 font-display text-[22px] leading-none font-black">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="t-app-h3 mt-3 line-clamp-2 px-1">
                  <Link href={`/courses/${c.slug}`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-sun">
                    {c.title}
                  </Link>
                </h3>
                <p className="mt-1 truncate px-1 text-[13px] font-semibold text-ink/60">{tutor?.name}</p>
                <div className="mt-auto flex items-center justify-between gap-2 px-1 pt-3 text-[13px] font-bold">
                  <span className="inline-flex items-center gap-1 text-forest">
                    <Icon name="trend" className="size-4" strokeWidth={2.4} />+{formatNumber(c.weekly)} this week
                  </span>
                  {isEnrolled(uid, c.id, db) ? <span className="rounded-full bg-mint px-2 py-0.5 text-[12px] text-forest">Yours</span> : <span>{formatINR(c.price)}</span>}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
      {/* phones + tablets: where you are in the strip */}
      <ScrollTrack target={rail} tone="white" className="mx-auto mt-4 lg:hidden" />
    </section>
  );
}
