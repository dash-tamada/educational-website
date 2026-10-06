"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { BarChart, Card, CardHeader, Segmented } from "@/components/app";
import type { Db } from "@/lib/mock";
import { dailyMinutes, weeklyMinutes } from "./data";

/** Weekly learning activity: minutes per day (this week) or per week (last 8). */
export function ActivityCard({
  uid,
  db,
  weeklyGoal,
  className,
}: {
  uid: string;
  db: Db;
  weeklyGoal: number;
  className?: string;
}) {
  const [range, setRange] = useState<"week" | "weeks">("week");
  // From xl the card sits beside "Up next" and stretches to its height: the chart takes whatever
  // room is left (210 to 380px) instead of leaving a white band above the summary.
  const box = useRef<HTMLDivElement>(null);
  const [chartH, setChartH] = useState(210);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () =>
      setChartH(Math.round(Math.min(380, Math.max(210, el.clientHeight))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const days = useMemo(() => dailyMinutes(uid, db, 7), [uid, db]);
  const weeks = useMemo(() => weeklyMinutes(uid, db, 8), [uid, db]);
  const data = range === "week" ? days : weeks;
  const total = days.reduce((s, d) => s + d.value, 0);
  const activeDays = days.filter((d) => d.value > 0).length;
  const best = weeks.reduce((m, w) => Math.max(m, w.value), 0);
  const avgWeek = Math.round(
    weeks.slice(0, -1).reduce((s, w) => s + w.value, 0) /
      Math.max(1, weeks.length - 1),
  );

  return (
    <Card className={clsx("flex flex-col", className)}>
      <CardHeader
        title="Your learning week"
        description={
          range === "week"
            ? "Minutes of lessons and quizzes, day by day."
            : "Minutes per week, the last eight weeks."
        }
        action={
          <Segmented
            label="Activity range"
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: "week", label: "7 days" },
              { value: "weeks", label: "8 weeks" },
            ]}
          />
        }
      />
      {/* the box grows into spare height (flex-1); the chart is absolutely placed inside it, so its
          own height never feeds back into the box's size */}
      <div
        ref={box}
        className="relative mb-5 min-h-[210px] flex-1 xl:min-h-[240px]"
      >
        {data.every((d) => d.value === 0) && (
          <p className="absolute inset-x-0 top-[38%] z-10 mx-auto w-fit max-w-[90%] rounded-full bg-white px-4 py-2 text-center text-[13.5px] font-bold shadow-soft">
            {range === "week"
              ? "No minutes yet this week. One lesson lights this up."
              : "Nothing logged yet. Your first lesson starts the chart."}
          </p>
        )}
        <BarChart
          key={range}
          data={data.map((d) => ({ label: d.label, value: d.value }))}
          tone={range === "week" ? "hotpink" : "blue"}
          highlight={data.length - 1}
          height={chartH}
          className="absolute! inset-x-0 top-0"
          format={(n) => `${Math.round(n)} min`}
          ariaLabel={
            range === "week"
              ? "Minutes learned per day, last 7 days"
              : "Minutes learned per week, last 8 weeks"
          }
        />
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-card bg-cream p-3 md:gap-3 md:p-4">
        {(range === "week"
          ? [
              { k: "This week", v: `${total} min` },
              { k: "Active days", v: `${activeDays} of 7` },
              {
                k: "Goal",
                v: `${Math.min(100, Math.round((total / Math.max(1, weeklyGoal)) * 100))}%`,
              },
            ]
          : [
              { k: "Best week", v: `${best} min` },
              { k: "Avg week", v: `${avgWeek} min` },
              { k: "Goal", v: `${weeklyGoal} min` },
            ]
        ).map((s) => (
          <div key={s.k} className="min-w-0 text-center">
            <dt className="truncate text-[12px] font-bold tracking-[0.02em] text-ink/70 uppercase">
              {s.k}
            </dt>
            <dd className="mt-1 font-heading text-[19px] leading-none font-extrabold tracking-[-0.02em] md:text-[22px]">
              {s.v}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
