"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { toneHex, type Tone } from "@/lib/landing-data";
import { formatCompact } from "@/lib/mock/format";

/* =============================================================================
   Lightweight SVG charts (no chart library). Rendered at the measured pixel
   width (crisp text), tooltips on hover AND keyboard focus (arrow keys), and a
   visually hidden data table for screen readers. Colours = palette tones.

     <BarChart data={series.map(p => ({ label: p.label, value: p.value }))} format={(n) => formatINR(n, { compact: true })} tone="blue" ariaLabel="Revenue by month" />
     <BarChart layout="horizontal" data={…} tone="green" format={(n) => `${n}%`} />
     <LineChart series={[{ name: "Signups", tone: "hotpink", data }]} area ariaLabel="Signups" />
     <Donut data={[{ label: "UPI", value: 62, tone: "green" }, …]} centerLabel="Orders" centerValue="123" />
     <Sparkline values={[3, 5, 4, 8, 9]} tone="green" />
   ============================================================================= */

export type Datum = { label: string; value: number };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) =>
      setW(Math.round(e.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * A "nice" value axis: 4 to 6 ticks on steps of 1 / 2 / 2.5 / 5 x 10^n, keeping the
 * smallest top that still fits the max (fewer ticks win a tie), so the tallest bar
 * fills most of the plot: 44.7L -> 50L (5 x 10L), 2.3L -> 2.5L (5 x 50k), 9 -> 10 (5 x 2).
 * Whole-number data never gets fractional ticks.
 */
function niceMax(max: number): { top: number; step: number; ticks: number } {
  if (!(max > 0)) return { top: 4, step: 1, ticks: 4 };
  const whole = Number.isInteger(max);
  // tiny counts (1-3): one tick per unit, so a single sale still fills the plot
  if (whole && max < 4) return { top: max, step: 1, ticks: max };
  let best = { top: Infinity, step: 1, ticks: 4 };
  for (let ticks = 4; ticks <= 6; ticks++) {
    const mag = Math.pow(10, Math.floor(Math.log10(max / ticks)));
    for (const scale of [mag, mag * 10]) {
      for (const m of [1, 2, 2.5, 5]) {
        const step = m * scale;
        if (whole && !Number.isInteger(Math.round(step * 1e6) / 1e6)) continue;
        const top = step * ticks;
        if (top >= max * (1 - 1e-9) && top < best.top * (1 - 1e-9)) best = { top, step, ticks };
      }
    }
  }
  return best;
}

const defaultFmt = (n: number) => formatCompact(n);

function SrTable({
  caption,
  rows,
  format,
}: {
  caption: string;
  rows: { label: string; values: { name: string; value: number }[] }[];
  format: (n: number) => string;
}) {
  const names = rows[0]?.values.map((v) => v.name) ?? [];
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            {names.map((n) => (
              <th key={n} scope="col">
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${i}-${r.label}`}>
              <th scope="row">{r.label}</th>
              {r.values.map((v) => (
                <td key={v.name}>{format(v.value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tip({
  x,
  y,
  title,
  lines,
  width,
}: {
  x: number;
  y: number;
  title: string;
  lines: { color: string; text: string }[];
  width: number;
}) {
  // Measure, then keep the bubble inside the plot: clamp horizontally, and flip it
  // below the point when there is no room above (tallest bar / peak near the top),
  // so it never covers the card header above the chart.
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const key = title + lines.map((l) => l.text).join("|");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
  }, [key]);
  const gap = 8;
  const left = Math.max(0, Math.min(x - size.w / 2, width - size.w));
  const below = y - gap - size.h < 0;
  const top = below ? y + gap + 4 : y - gap - size.h;
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-10 rounded-[12px] bg-ink px-2.5 py-1.5 text-[12px] leading-tight font-semibold whitespace-nowrap text-cream shadow-lift"
      style={{ left, top, visibility: size.w ? "visible" : "hidden" }}
      aria-hidden
    >
      <div className="opacity-75">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className="mt-0.5 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: l.color }}
          />
          {l.text}
        </div>
      ))}
    </div>
  );
}

/* x-axis label position: centred under its bar/point, but pinned inside the svg
   when that would spill past an edge (e.g. "4 Oct" under the last of 30 bars).
   Width is estimated (11px semibold ≈ 6.2px per glyph), no layout read needed. */
function axisLabelPos(cx: number, label: string, width: number): { x: number; textAnchor: "start" | "middle" | "end" } {
  const half = (String(label).length * 6.2) / 2;
  if (cx + half > width - 1) return { x: width - 1, textAnchor: "end" };
  if (cx - half < 1) return { x: 1, textAnchor: "start" };
  return { x: cx, textAnchor: "middle" };
}

/* ----------------------------------------------------------------------------- BarChart */
export function BarChart({
  data,
  tone = "blue",
  height = 240,
  format = defaultFmt,
  ariaLabel,
  layout = "vertical",
  highlight,
  className,
}: {
  data: Datum[];
  tone?: Tone;
  height?: number;
  format?: (n: number) => string;
  ariaLabel: string;
  layout?: "vertical" | "horizontal";
  /** index to emphasise (others get a lighter tone), e.g. the current month */
  highlight?: number;
  className?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  // keyboard focus on the plot: draw a ring on the active bar (visible even for zero values)
  const [kbd, setKbd] = useState(false);
  const color = toneHex[tone];
  const max = Math.max(0, ...data.map((d) => d.value));
  const { top, step, ticks } = niceMax(max);

  if (layout === "horizontal") {
    const rowH = 34;
    // Narrow containers (phones, small cards): each label gets its own full-width
    // line (up to two lines) above its bar, so long names like module titles stay
    // readable instead of being cut to ~110px.
    const stacked = width > 0 && width < 460;
    const labelW = Math.min(220, Math.max(110, width * 0.36));
    const valueW = 56;
    const barW = Math.max(10, width - labelW - valueW - 12);
    const barFill = (d: Datum, i: number) => (
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-expo"
        style={{
          width: `${max ? (d.value / (max || 1)) * 100 : 0}%`,
          background:
            highlight === undefined || highlight === i ? color : `${color}66`,
        }}
      />
    );
    return (
      <div
        ref={ref}
        className={clsx("relative w-full min-w-0 overflow-hidden", className)}
      >
        <figure aria-label={ariaLabel} className="m-0">
          {width > 0 &&
            (stacked ? (
              <ul className="space-y-3" aria-hidden>
                {data.map((d, i) => (
                  <li key={i} className="text-[13px]">
                    <span
                      className="line-clamp-2 font-semibold leading-snug text-ink/75"
                      title={d.label}
                    >
                      {d.label}
                    </span>
                    <span className="mt-1 flex items-center gap-3">
                      <span className="relative h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                        {barFill(d, i)}
                      </span>
                      <span
                        className="shrink-0 text-right font-bold tabular-nums"
                        style={{ minWidth: 44 }}
                      >
                        {format(d.value)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1.5" aria-hidden>
                {data.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-[13px]"
                    style={{ height: rowH - 6 }}
                  >
                    <span
                      className="truncate font-semibold text-ink/75"
                      style={{ width: labelW }}
                      title={d.label}
                    >
                      {d.label}
                    </span>
                    <span
                      className="relative h-3.5 overflow-hidden rounded-full bg-ink/[0.06]"
                      style={{ width: barW }}
                    >
                      {barFill(d, i)}
                    </span>
                    <span
                      className="shrink-0 text-right font-bold tabular-nums"
                      style={{ width: valueW }}
                    >
                      {format(d.value)}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          <SrTable
            caption={ariaLabel}
            rows={data.map((d) => ({
              label: d.label,
              values: [{ name: "Value", value: d.value }],
            }))}
            format={format}
          />
        </figure>
      </div>
    );
  }

  const padL = 44;
  const padB = 28;
  const padT = 10;
  const innerW = Math.max(0, width - padL - 4);
  const innerH = height - padB - padT;
  const slot = data.length ? innerW / data.length : 0;
  const bw = Math.max(4, Math.min(44, slot * 0.62));
  const every = Math.max(
    1,
    Math.ceil(data.length / Math.max(1, Math.floor(innerW / 46))),
  );
  // thin the x labels counting back from the anchor (the highlighted bar, else the
  // latest one) so the bar that matters ("This wk", the current month) keeps its label
  const labelAnchor = highlight !== undefined && highlight >= 0 && highlight < data.length ? highlight : data.length - 1;
  const showLabel = (i: number) => Math.abs(labelAnchor - i) % every === 0;
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const onBarMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / Math.max(1, r.width)) * data.length);
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const onBarKey = (e: React.KeyboardEvent) => {
    const n = data.length;
    if (e.key === "ArrowRight") setHover((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((i) => Math.max(0, (i ?? n) - 1));
    else if (e.key === "Home") setHover(0);
    else if (e.key === "End") setHover(n - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className={clsx("relative w-full min-w-0", className)}
      style={{ height }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="group"
          aria-label={ariaLabel}
          className="absolute inset-0 block overflow-visible"
        >
          {hover !== null && data[hover] && (
            <rect
              x={padL + slot * hover + Math.min(3, slot * 0.08)}
              y={padT}
              width={Math.max(0, slot - 2 * Math.min(3, slot * 0.08))}
              height={innerH}
              rx={10}
              fill="#161616"
              fillOpacity={0.045}
              aria-hidden
            />
          )}
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const v = step * i;
            return (
              <g key={i}>
                <line
                  x1={padL}
                  x2={width - 4}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="#161616"
                  strokeOpacity={i ? 0.07 : 0.18}
                  strokeDasharray={i ? "3 4" : undefined}
                />
                <text
                  x={padL - 8}
                  y={y(v)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-ink/65 text-[11px] font-semibold"
                >
                  {format(v)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x = padL + slot * i + (slot - bw) / 2;
            const h = Math.max(
              d.value > 0 ? 2 : 0,
              innerH - (y(d.value) - padT),
            );
            const dim = highlight !== undefined && highlight !== i;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={padT + innerH - h}
                  width={bw}
                  height={h}
                  rx={Math.min(8, bw / 2)}
                  fill={color}
                  fillOpacity={hover === i ? 1 : dim ? 0.4 : 0.92}
                  className="transition-[fill-opacity] duration-150"
                />
                {kbd && hover === i && (
                  <rect
                    x={x - 3}
                    y={padT + innerH - Math.max(h, 8) - 3}
                    width={bw + 6}
                    height={Math.max(h, 8) + 6}
                    rx={Math.min(10, bw / 2 + 3)}
                    fill="none"
                    stroke="#161616"
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
                {showLabel(i) && (
                  <text
                    {...axisLabelPos(padL + slot * i + slot / 2, d.label, width)}
                    y={height - 8}
                    className="fill-ink/65 text-[11px] font-semibold"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* ONE tab stop for the whole chart (roving focus, like LineChart): pointer position or
              Left/Right/Home/End picks the bar; the value is announced through the live region. */}
          {data.length > 0 && (
            <rect
              x={padL}
              y={padT}
              width={innerW}
              height={innerH}
              rx={12}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${ariaLabel}. Use left and right arrow keys to read values.`}
              onPointerMove={onBarMove}
              onPointerLeave={() => {
                if (!kbd) setHover(null);
              }}
              onFocus={(e) => {
                const visible = e.currentTarget.matches(":focus-visible");
                setKbd(visible);
                if (visible) setHover((i) => i ?? (highlight ?? data.length - 1));
              }}
              onBlur={() => {
                setKbd(false);
                setHover(null);
              }}
              onKeyDown={(e) => {
                setKbd(true);
                onBarKey(e);
              }}
              className="outline-none focus-visible:stroke-blue/60 focus-visible:stroke-[1.5]"
            />
          )}
        </svg>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {hover !== null && data[hover] ? `${data[hover].label}: ${format(data[hover].value)}` : ""}
      </span>
      {hover !== null && data[hover] && (
        <Tip
          x={padL + slot * hover + slot / 2}
          y={Math.min(y(data[hover].value), padT + innerH - 8) - (kbd ? 4 : 0)}
          title={data[hover].label}
          lines={[{ color, text: format(data[hover].value) }]}
          width={width}
        />
      )}
      <SrTable
        caption={ariaLabel}
        rows={data.map((d) => ({
          label: d.label,
          values: [{ name: "Value", value: d.value }],
        }))}
        format={format}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------- LineChart */
export type LineSeries = { name: string; tone: Tone; data: Datum[] };

export function LineChart({
  series,
  height = 240,
  format = defaultFmt,
  area,
  ariaLabel,
  legend = series.length > 1,
  className,
}: {
  series: LineSeries[];
  height?: number;
  format?: (n: number) => string;
  /** fill under the first series */
  area?: boolean;
  ariaLabel: string;
  legend?: boolean;
  className?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const labels = series[0]?.data.map((d) => d.label) ?? [];
  const n = labels.length;
  const max = Math.max(0, ...series.flatMap((s) => s.data.map((d) => d.value)));
  const { top, step, ticks } = niceMax(max);
  const padL = 44;
  const padR = 10;
  const padB = 28;
  const padT = 12;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padB - padT;
  const x = useCallback(
    (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1)),
    [innerW, n],
  );
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const every = Math.max(
    1,
    Math.ceil(n / Math.max(1, Math.floor(innerW / 52))),
  );
  // thin from the end so the latest point always keeps its label
  const showLabel = (i: number) => (n - 1 - i) % every === 0;

  const path = (d: Datum[]) =>
    d
      .map(
        (p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
      )
      .join(" ");
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - r.left;
    const i = Math.round((rel / Math.max(1, r.width)) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setIdx((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, (i ?? n) - 1));
    else if (e.key === "Home") setIdx(0);
    else if (e.key === "End") setIdx(n - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className={clsx("relative w-full min-w-0", className)}>
      {legend && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-ink/70">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-4 rounded-full"
                style={{ background: toneHex[s.tone] }}
                aria-hidden
              />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <div ref={ref} className="relative w-full min-w-0" style={{ height }}>
        {width > 0 && n > 0 && (
          <svg
            width={width}
            height={height}
            role="group"
            aria-label={ariaLabel}
            className="absolute inset-0 block overflow-visible"
          >
            <defs>
              <linearGradient
                id={`lg-${series[0].tone}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={toneHex[series[0].tone]}
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor={toneHex[series[0].tone]}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            {Array.from({ length: ticks + 1 }, (_, i) => {
              const v = step * i;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    x2={width - padR}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="#161616"
                    strokeOpacity={i ? 0.07 : 0.18}
                    strokeDasharray={i ? "3 4" : undefined}
                  />
                  <text
                    x={padL - 8}
                    y={y(v)}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-ink/65 text-[11px] font-semibold"
                  >
                    {format(v)}
                  </text>
                </g>
              );
            })}
            {labels.map(
              (l, i) =>
                showLabel(i) && (
                  <text
                    key={i}
                    {...axisLabelPos(x(i), l, width)}
                    y={height - 8}
                    className="fill-ink/65 text-[11px] font-semibold"
                  >
                    {l}
                  </text>
                ),
            )}
            {area && (
              <path
                d={`${path(series[0].data)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={`url(#lg-${series[0].tone})`}
              />
            )}
            {series.map((s) => (
              <path
                key={s.name}
                d={path(s.data)}
                fill="none"
                stroke={toneHex[s.tone]}
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {idx !== null && (
              <g>
                <line
                  x1={x(idx)}
                  x2={x(idx)}
                  y1={padT}
                  y2={padT + innerH}
                  stroke="#161616"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                />
                {series.map((s) => (
                  <circle
                    key={s.name}
                    cx={x(idx)}
                    cy={y(s.data[idx]?.value ?? 0)}
                    r={5}
                    fill="#fff"
                    stroke={toneHex[s.tone]}
                    strokeWidth={2.6}
                  />
                ))}
              </g>
            )}
            <rect
              x={padL}
              y={padT}
              width={innerW}
              height={innerH}
              rx={12}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${ariaLabel}. Use left and right arrow keys to read values.`}
              onPointerMove={onMove}
              onPointerLeave={() => setIdx(null)}
              onFocus={() => setIdx((i) => i ?? n - 1)}
              onBlur={() => setIdx(null)}
              onKeyDown={onKey}
              className="outline-none focus-visible:stroke-blue/60 focus-visible:stroke-[1.5]"
            />
          </svg>
        )}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {idx !== null && labels[idx] !== undefined
            ? `${labels[idx]}: ${series.map((s) => `${series.length > 1 ? `${s.name} ` : ""}${format(s.data[idx]?.value ?? 0)}`).join(", ")}`
            : ""}
        </span>
        {idx !== null && n > 0 && (
          <Tip
            x={x(idx)}
            y={Math.min(...series.map((s) => y(s.data[idx]?.value ?? 0)))}
            title={labels[idx]}
            lines={series.map((s) => ({
              color: toneHex[s.tone],
              text: `${series.length > 1 ? `${s.name}: ` : ""}${format(s.data[idx]?.value ?? 0)}`,
            }))}
            width={width}
          />
        )}
      </div>
      <SrTable
        caption={ariaLabel}
        rows={labels.map((l, i) => ({
          label: l,
          values: series.map((s) => ({
            name: s.name,
            value: s.data[i]?.value ?? 0,
          })),
        }))}
        format={format}
      />
    </div>
  );
}

/** Area chart = LineChart with area fill. */
export const AreaChart = (
  p: Omit<React.ComponentProps<typeof LineChart>, "area">,
) => <LineChart {...p} area />;

/* ----------------------------------------------------------------------------- Donut */
export function Donut({
  data,
  size = 180,
  thickness = 26,
  centerLabel,
  centerValue,
  format = (n: number) => String(n),
  legend = true,
  ariaLabel,
  className,
}: {
  data: { label: string; value: number; tone: Tone }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: React.ReactNode;
  format?: (n: number) => string;
  legend?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offsets = data.map((_, i) =>
    data.slice(0, i).reduce((sum, d) => sum + (d.value / total) * c, 0),
  );
  return (
    <div className={clsx("relative flex min-w-0 flex-wrap items-center gap-5", className)}>
      {/* scales down (never up) when the card is narrower than the ring */}
      <div className="relative shrink-0" style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={ariaLabel}
          className="block size-full -rotate-90 overflow-visible"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#161616"
            strokeOpacity={0.06}
            strokeWidth={thickness}
          />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const gap = data.length > 1 ? Math.min(3, len / 3) : 0;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={toneHex[d.tone]}
                strokeWidth={hover === i ? thickness + 4 : thickness}
                strokeDasharray={`${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`}
                strokeDashoffset={-offsets[i]}
                className="transition-[stroke-width] duration-150"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="t-stat text-[1.9rem]">
              {hover !== null ? format(data[hover].value) : centerValue}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-ink/60">
              {hover !== null ? data[hover].label : centerLabel}
            </div>
          </div>
        </div>
      </div>
      {legend && (
        /* the legend is its own container: under ~240px the % stacks under the value
           instead of running past the card edge */
        <ul className="@container min-w-0 flex-1 basis-[190px] space-y-2 text-[13.5px]">
          {data.map((d, i) => (
            <li
              key={i}
              className="flex items-center gap-2"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: toneHex[d.tone] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink/75">
                {d.label}
              </span>
              <span className="flex shrink-0 items-baseline justify-end gap-2 @max-[15rem]:flex-col @max-[15rem]:items-end @max-[15rem]:gap-0">
                <span className="font-bold tabular-nums">{format(d.value)}</span>
                <span className="w-10 text-right text-ink/65 tabular-nums @max-[15rem]:w-auto @max-[15rem]:text-[12px] @max-[15rem]:leading-tight">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------- Sparkline */
export function Sparkline({
  values,
  tone = "green",
  width = 96,
  height = 32,
  area = true,
  ariaLabel,
  className,
}: {
  values: number[];
  tone?: Tone;
  width?: number;
  height?: number;
  area?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map(
    (v, i) =>
      [
        (i / Math.max(1, values.length - 1)) * (width - 4) + 2,
        height - 3 - ((v - min) / span) * (height - 6),
      ] as const,
  );
  const d = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const color = toneHex[tone];
  return (
    <svg
      width={width}
      height={height}
      className={clsx("block overflow-visible", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {area && (
        <path
          d={`${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`}
          fill={color}
          fillOpacity={0.16}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.8}
        fill={color}
      />
    </svg>
  );
}
