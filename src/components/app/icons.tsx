import clsx from "clsx";

/* =============================================================================
   App icon set: 24px stroke icons (2px, round caps), currentColor. Decorative by
   default (aria-hidden); pass `title` to make one meaningful.
     <Icon name="home" />   <Icon name="bell" className="size-5" />
   ============================================================================= */

const P: Record<string, React.ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  book: <path d="M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h9.5" />,
  heart: <path d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4c0 5.3-7.5 9.7-7.5 9.7z" />,
  award: (
    <>
      <circle cx="12" cy="9.5" r="5" />
      <path d="m9 13.8-1.5 6.7L12 18l4.5 2.5-1.5-6.7" />
    </>
  ),
  receipt: <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.2-1.5 1.2-2-1.5L6 20.5zM9 8h6M9 11.5h6M9 15h3.5" />,
  settings: (
    <>
      {/* 8-tooth cog (distinct from "sun", which is a circle with rays) */}
      <path d="M17.92 10.17 20.13 10.35v3.3l-2.21.18-.44 1.06 1.44 1.7-2.33 2.33-1.7-1.44-1.06.44-.18 2.21h-3.3l-.18-2.21-1.06-.44-1.7 1.44-2.33-2.33 1.44-1.7-.44-1.06-2.21-.18v-3.3l2.21-.18.44-1.06-1.44-1.7 2.33-2.33 1.7 1.44 1.06-.44.18-2.21h3.3l.18 2.21 1.06.44 1.7-1.44 2.33 2.33-1.44 1.7z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.9" />
      <path d="M4.6 20.2c.9-3.7 3.9-5.9 7.4-5.9s6.5 2.2 7.4 5.9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.8 19.5c.7-3.2 3.2-5.2 6.2-5.2s5.5 2 6.2 5.2M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.6 14.6c2 .6 3.3 2.4 3.7 4.9" />
    </>
  ),
  chart: <path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6.5" />,
  trend: <path d="M3.5 16.5 9 11l4 4 7.5-7.5M15 7.5h5.5V13" />,
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5h13V8h-13A2.5 2.5 0 0 1 4 7.5z" />
      <circle cx="16" cy="13.8" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  chat: <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" />,
  grid: <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-up": <path d="m6 14.5 6-6 6 6" />,
  "chevrons-left": <path d="m12 6-6 6 6 6M18 6l-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.3 2.6 2.6 5-5.3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 7.6-1.8" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  "play-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.2 8.8v6.4l5.1-3.2z" fill="currentColor" />
    </>
  ),
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  file: <path d="M7 3.5h7l4.5 4.5v12.5H7zM14 3.5V8h4.5M9.5 13h6M9.5 16.5h4" />,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  upload: <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14" />,
  quiz: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="m8 9 1.4 1.4L12 7.8M8 15l1.4 1.4L12 13.8M14 9.5h2.5M14 15.5h2.5" />
    </>
  ),
  logout: <path d="M14.5 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8M10 12h10M16.5 8.5 20 12l-3.5 3.5" />,
  switch: <path d="M4 8h13.5M14 4.5 17.5 8 14 11.5M20 16H6.5M10 12.5 6.5 16l3.5 3.5" />,
  layers: <path d="m12 4 8.5 4.5L12 13 3.5 8.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5" />,
  tag: (
    <>
      <path d="M4 4h7.5l8.5 8.5-7.5 7.5L4 11.5z" />
      <circle cx="8.3" cy="8.3" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  ticket: <path d="M4 7.5h16v3a1.5 1.5 0 0 0 0 3v3H4v-3a1.5 1.5 0 0 0 0-3zM14 7.5v9" />,
  flag: <path d="M5.5 20.5V4.5M5.5 5h11l-2 3.5 2 3.5h-11" />,
  shield: <path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6zM9 12l2.2 2.2L15.5 10" />,
  star: <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  "eye-off": <path d="M4 4l16 16M10 6c.6-.2 1.3-.3 2-.3 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 7.4A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M10 10.2a2.8 2.8 0 0 0 3.8 3.8" />,
  edit: <path d="M14.5 5.5 18.5 9.5M4.5 19.5l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z" />,
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  "more-v": (
    <>
      <circle cx="12" cy="5.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.2V19l-3.6-1.8v-4.5z" />,
  sort: <path d="M7.5 4.5v15M4 16l3.5 3.5L11 16M16.5 19.5v-15M13 8l3.5-3.5L20 8" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.5H15" />,
  "arrow-up": <path d="M12 19.5v-15M6 10.5l6-6 6 6" />,
  "arrow-down": <path d="M12 4.5v15M6 13.5l6 6 6-6" />,
  "arrow-right": <path d="M4.5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19.5 12h-14M11 6l-6 6 6 6" />,
  sparkles: <path d="M10 3.5c.7 3.9 2.1 5.3 6 6-3.9.7-5.3 2.1-6 6-.7-3.9-2.1-5.3-6-6 3.9-.7 5.3-2.1 6-6zM17.5 14c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  alert: <path d="M12 4 21 19.5H3zM12 10v4.5M12 17v.2" />,
  copy: <path d="M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4" />,
  share: (
    <>
      <circle cx="17.5" cy="5.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
      <path d="m8.7 10.8 6.6-4M8.7 13.2l6.6 4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </>
  ),
  drag: (
    <>
      {[7, 12, 17].map((y) => (
        <g key={y}>
          <circle cx="9" cy={y} r="1.4" fill="currentColor" stroke="none" />
          <circle cx="15" cy={y} r="1.4" fill="currentColor" stroke="none" />
        </g>
      ))}
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="6" width="12.5" height="12" rx="2.5" />
      <path d="m16 10.5 4.5-2.5v8l-4.5-2.5" />
    </>
  ),
  note: <path d="M5.5 4.5h13v10l-5 5h-8zM13.5 19.5v-5h5" />,
  inbox: <path d="M4 13.5 6.5 5h11l2.5 8.5V19H4zM4 13.5h4.5l1 2h5l1-2H20" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  "panel-left": (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  /* category icons */
  code: <path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 5l-3 14" />,
  pen: <path d="M4.5 19.5 6 14 15.5 4.5l4 4L10 18zM13.5 6.5l4 4" />,
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <path d="M9 7.5V5.5h6v2M3.5 12.5h17" />
    </>
  ),
  music: (
    <>
      <path d="M9 17.5V5.5l10-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z" />
      <circle cx="12" cy="13" r="3.3" />
    </>
  ),
  pot: <path d="M4 10.5h16M5.5 10.5V17a2.5 2.5 0 0 0 2.5 2.5h8a2.5 2.5 0 0 0 2.5-2.5v-6.5M9 7c0-1.5 1-2.5 3-2.5s3 1 3 2.5M2.5 10.5h2M19.5 10.5h2" />,
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </>
  ),
  spark: <path d="M12 3.5c.9 5 3.5 7.6 8.5 8.5-5 .9-7.6 3.5-8.5 8.5-.9-5-3.5-7.6-8.5-8.5 5-.9 7.6-3.5 8.5-8.5z" />,
};

export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P) as IconName[];

/** A passed base size utility (size-4, !size-[18px]) replaces the default size-5.
    Variant sizes (md:size-6) keep it: variants are emitted after base utilities and win.
    clsx can't de-duplicate Tailwind classes, and Tailwind emits size-5 AFTER size-3/3.5/4
    in the stylesheet, so a smaller override used to lose and every icon rendered at 20px. */
const HAS_SIZE = /(?:^|\s)!?size-/;

export function Icon({
  name,
  className,
  title,
  strokeWidth = 2,
  ...rest
}: {
  name: IconName | string;
  className?: string;
  /** gives the icon an accessible name (role="img"); without it the icon is decorative (aria-hidden) */
  title?: string;
  strokeWidth?: number;
} & Omit<React.SVGProps<SVGSVGElement>, "name" | "className" | "title" | "strokeWidth" | "children" | "ref">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
      strokeWidth={strokeWidth}
      className={clsx(!(className && HAS_SIZE.test(className)) && "size-5", "shrink-0", className)}
    >
      {P[name] ?? P.spark}
    </svg>
  );
}
