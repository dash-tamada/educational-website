/* =============================================================================
   Extra mock data + helpers for the public catalog area (catalog, course page,
   tutor profile, checkout). Deterministic, built on the foundation types and
   selectors; never mutates SEED_DB.
   ============================================================================= */

import type { Course, CourseLevel, Db, Order, Tutor } from "@/lib/mock/types";
import { REFUND_MAX_PROGRESS, REFUND_WINDOW_DAYS, SEED_DB, getCategory, getCourses, paginate, validateCoupon, type CourseSort, type CourseStats, type Page } from "@/lib/mock";
import { formatDuration, formatNumber } from "@/lib/mock/format";

/* ----------------------------------------------------------------------------- catalog query */
export const LEVELS: { value: string; label: CourseLevel }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all-levels", label: "All levels" },
];

export const PRICE_BUCKETS = [
  { value: "under-999", label: "Under ₹999", min: 0, max: 998 },
  { value: "999-1499", label: "₹999 to ₹1,499", min: 999, max: 1499 },
  { value: "1500-plus", label: "₹1,500 and up", min: 1500, max: Infinity },
] as const;

export const RATING_OPTIONS = [
  { value: "4.5", label: "4.5+" },
  { value: "4.8", label: "4.8+" },
] as const;

export const SORT_OPTIONS: { value: CourseSort; label: string }[] = [
  { value: "popular", label: "Most loved" },
  { value: "newest", label: "Fresh drops" },
  { value: "rating", label: "Highest rated" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
];

/** "Dr. Vikram Iyer" -> "Vikram" (honorifics dropped, for friendly copy). */
export const firstName = (name: string | null | undefined, fallback = "the tutor") =>
  (name ?? "").replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, "").trim().split(/\s+/)[0] || fallback;

/** "English + Hindi" -> ["English", "Hindi"] */
export const courseLanguages = (c: Course) => c.language.split(/\s*\+\s*|\s*,\s*/).filter(Boolean);

/** Languages taught across published courses, most common first. */
export function getCatalogLanguages(db: Db = SEED_DB): { value: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of db.courses) if (c.status === "published") for (const l of courseLanguages(c)) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ value: label.toLowerCase(), label, count }));
}

export interface CatalogQuery {
  q: string;
  category: string;
  levels: string[];
  price: string;
  langs: string[];
  rating: string;
  sort: CourseSort;
  page: number;
}

export const EMPTY_QUERY: CatalogQuery = { q: "", category: "", levels: [], price: "", langs: [], rating: "", sort: "popular", page: 1 };

/** "Exam Prep" / "exam prep" / "exam_prep" -> "exam-prep" (slug-shaped, not yet resolved). */
export const normalizeCategoryParam = (v: string | null | undefined) =>
  (v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

/**
 * Inbound ?category= -> the canonical category slug, or "" when nothing matches.
 * Accepts slugs and names in any case ("Exam Prep", "exam%20prep", "Coding"),
 * so old links and the landing's name-based links still land on the right shelf.
 */
export function resolveCategorySlug(value: string, db: Db = SEED_DB): string {
  if (!value) return "";
  const norm = normalizeCategoryParam(value);
  const hit =
    getCategory(norm, db) ??
    getCategory(value.trim(), db) ??
    db.categories.find((c) => normalizeCategoryParam(c.name) === norm || c.name.toLowerCase() === value.trim().toLowerCase()) ??
    null;
  return hit?.slug ?? "";
}

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const SORTS = new Set(SORT_OPTIONS.map((s) => s.value));

/** URLSearchParams (or a plain record from the server) -> a clean query. */
export function parseCatalogQuery(sp: URLSearchParams | Record<string, string | string[] | undefined>): CatalogQuery {
  const get = (k: string) => {
    if (sp instanceof URLSearchParams) return sp.get(k);
    const v = sp[k];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };
  const sort = get("sort") as CourseSort | null;
  const page = Number(get("page"));
  return {
    q: (get("q") ?? "").slice(0, 80),
    category: normalizeCategoryParam(get("category")),
    levels: list(get("level")).filter((l) => LEVELS.some((x) => x.value === l)),
    price: PRICE_BUCKETS.some((b) => b.value === get("price")) ? get("price")! : "",
    langs: list(get("lang")),
    rating: RATING_OPTIONS.some((r) => r.value === get("rating")) ? get("rating")! : "",
    sort: sort && SORTS.has(sort) ? sort : "popular",
    page: Number.isFinite(page) && page > 1 ? Math.floor(page) : 1,
  };
}

/** Query -> "q=python&category=coding" (defaults left out, stable key order). */
export function serializeCatalogQuery(q: CatalogQuery): string {
  const p = new URLSearchParams();
  if (q.q.trim()) p.set("q", q.q.trim());
  if (q.category) p.set("category", q.category);
  if (q.levels.length) p.set("level", q.levels.join(","));
  if (q.price) p.set("price", q.price);
  if (q.langs.length) p.set("lang", q.langs.join(","));
  if (q.rating) p.set("rating", q.rating);
  if (q.sort !== "popular") p.set("sort", q.sort);
  if (q.page > 1) p.set("page", String(q.page));
  return p.toString();
}

/** Number of narrowing filters (search and sort excluded). */
export const activeFilterCount = (q: CatalogQuery) =>
  (q.category ? 1 : 0) + q.levels.length + (q.price ? 1 : 0) + q.langs.length + (q.rating ? 1 : 0);

/**
 * The catalog search: foundation getCourses (search, category, level, rating, sort)
 * plus the language + price-range filters the catalog adds. `page` acts as
 * "pages loaded" for the load-more grid, so it returns the first page * pageSize rows.
 */
export function searchCatalog(q: CatalogQuery, db: Db = SEED_DB, pageSize = 12): Page<Course> & { shown: number } {
  const levels = q.levels.map((v) => LEVELS.find((l) => l.value === v)!.label);
  // an unknown category never filters to zero: it is ignored (the UI drops it from the URL)
  const category = resolveCategorySlug(q.category, db);
  const base = {
    category: category || undefined,
    level: levels.length ? levels : undefined,
    minRating: q.rating ? Number(q.rating) : undefined,
    sort: q.sort,
    pageSize: 999,
  };
  const all = getCourses(base, db).items;
  // text search (foundation: title, promise, tags, tutor, category, level) OR the
  // teaching language, so "hindi" finds the courses taught in Hindi
  const text = q.q.trim();
  const textHits = text ? new Set(getCourses({ ...base, search: text }, db).items.map((c) => c.id)) : null;
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const langHit = (c: Course) => courseLanguages(c).some((l) => words.includes(l.toLowerCase()));
  const bucket = PRICE_BUCKETS.find((b) => b.value === q.price);
  const filtered = all.filter((c) => {
    if (textHits && !textHits.has(c.id) && !langHit(c)) return false;
    if (bucket && (c.price < bucket.min || c.price > bucket.max)) return false;
    if (q.langs.length && !courseLanguages(c).some((l) => q.langs.includes(l.toLowerCase()))) return false;
    return true;
  });
  const shown = Math.min(filtered.length, q.page * pageSize);
  return { ...paginate(filtered, 1, Math.max(pageSize, shown)), shown };
}

export const POPULAR_SEARCHES = ["python", "guitar", "money", "photography", "JEE", "Excel"];

/* ----------------------------------------------------------------------------- trending */
/** Deterministic "joined this week" figure per course (sample data). */
export function weeklyLearners(c: Course): number {
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Math.round(c.learners * (0.025 + (h % 30) / 1000)) + 6;
}

/** Published courses ranked by learners who joined this week. */
export function getTrending(n = 5, db: Db = SEED_DB): (Course & { weekly: number })[] {
  return db.courses
    .filter((c) => c.status === "published")
    .map((c) => ({ ...c, weekly: weeklyLearners(c) }))
    .sort((a, b) => b.weekly - a.weekly)
    .slice(0, n);
}

/* ----------------------------------------------------------------------------- course page */
export function whatsIncluded(course: Course, stats: CourseStats) {
  return [
    { icon: "video", text: `${formatDuration(stats.totalSec, "long")} of on-demand video` },
    { icon: "play-circle", text: `${stats.videos} bite-sized lessons` },
    ...(stats.quizzes ? [{ icon: "quiz", text: `${stats.quizzes} tiny tests to lock it in` }] : []),
    ...(stats.resources ? [{ icon: "download", text: `${stats.resources} downloadable resource${stats.resources === 1 ? "" : "s"}` }] : []),
    { icon: "chat", text: "Q&A with the tutor under every lesson" },
    ...(course.hasCertificate ? [{ icon: "award", text: "Certificate you can verify online" }] : []),
    { icon: "globe", text: `Taught in ${course.language}` },
    { icon: "clock", text: "Lifetime access, phone or laptop" },
  ];
}

const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Course-specific FAQ (answers use the course's own numbers). */
export function courseFaqs(course: Course, stats: CourseStats, tutor: Tutor | null, viewer: { learnerOwns?: boolean } = {}) {
  const first = firstName(tutor?.name);
  const onSale = course.status === "published";
  const archived = course.status === "archived";
  // a learner who owns a course that has left the catalogue: no review-queue talk
  const offShelfOwner = !onSale && !archived && !!viewer.learnerOwns;
  if (offShelfOwner) {
    return [
      {
        q: "What do I get?",
        a: `${n(stats.videos, "video lesson")} (${formatDuration(stats.totalSec, "long")} in total)${stats.quizzes ? `, ${n(stats.quizzes, "tiny test")}` : ""}${stats.resources ? `, ${n(stats.resources, "downloadable resource")}` : ""} and a Q&A thread under every lesson.`,
      },
      {
        q: "Why isn't it in the catalogue?",
        a: "It's off the shelf for now, so new learners can't buy it. You already own it, so nothing changes for you.",
      },
      {
        q: "Will I keep access?",
        a: "Yes. Your lessons, progress, notes and any certificate stay right where they are.",
      },
      {
        q: "Can I watch on my phone?",
        a: "Yes. Lessons are short and work on phone, tablet and laptop. Your progress syncs, so you can start on the metro and finish on the sofa.",
      },
    ];
  }
  return [
    {
      q: "What do I get?",
      a: `${n(stats.videos, "video lesson")} (${formatDuration(stats.totalSec, "long")} in total)${stats.quizzes ? `, ${n(stats.quizzes, "tiny test")}` : ""}${stats.resources ? `, ${n(stats.resources, "downloadable resource")}` : ""} and a Q&A thread under every lesson where ${first} answers questions.`,
    },
    onSale
      ? {
          q: "Is the first video really free?",
          a: "Yes. The first video of every course is open to everyone, no account and no card needed. Watch it, see if the vibe fits, then decide.",
        }
      : archived
        ? {
            q: "Can I still buy it?",
            a: `Not right now. ${first} archived this course, so it's off the shelf. People who already own it keep full access, progress and certificates included.`,
          }
        : {
            q: "When can learners buy it?",
            a: "Once it's published. Until then only its tutor and the Tamada team can open this page, and the free first video stays private too.",
          },
    {
      q: "How long do I have access?",
      a: "For as long as the course exists. One payment, lifetime access, including any lessons the tutor adds or re-records later.",
    },
    {
      q: "Can I watch on my phone?",
      a: "Yes. Lessons are short and work on phone, tablet and laptop. Your progress syncs, so you can start on the metro and finish on the sofa.",
    },
    {
      q: "Do I get a certificate?",
      a: course.hasCertificate
        ? "Yes. Finish every lesson and pass the tests and you get a certificate with a code anyone can verify on our site."
        : "Not for this one. It's a quick, practical course, so we skipped the certificate.",
    },
    onSale
      ? {
          q: "What if it's not for me?",
          a: `Ask for a refund within ${REFUND_WINDOW_DAYS} days of buying, as long as you've watched less than ${REFUND_MAX_PROGRESS}% of the course. No awkward questions.`,
        }
      : archived
        ? {
            q: "I own it. Will it disappear?",
            a: "No. Archived just means it's not for sale any more. Your lessons, notes and certificate stay right where they are.",
          }
        : {
            q: "Will buyers keep access?",
            a: "Yes, lifetime access once it's live. Lessons added or re-recorded later are included too.",
          },
  ];
}

/** Review-form placeholders that fit the course's subject (category id -> headline, body). */
const REVIEW_HINTS: Record<string, [string, string]> = {
  cat_coding: ["e.g. Finally get Flexbox", "What did you build after the course?"],
  cat_design: ["e.g. My palettes stopped clashing", "What did you design after the course?"],
  cat_business: ["e.g. VLOOKUP no longer scares me", "What got easier at work?"],
  cat_music: ["e.g. Played my first full song", "What can you play now?"],
  cat_languages: ["e.g. Spoke up in the meeting", "What feels easier to say now?"],
  cat_photography: ["e.g. My phone photos look planned", "What did you shoot after the course?"],
  cat_exam: ["e.g. Rotational motion finally clicked", "Which topic stopped being scary?"],
  cat_cooking: ["e.g. Crispy dosas on the first try", "What did you cook after the course?"],
  cat_creator: ["e.g. Published episode one", "What did you make after the course?"],
  cat_life: ["e.g. Started my first SIP", "What changed after the course?"],
};
export const reviewHints = (course: Course | null | undefined): [string, string] =>
  (course && REVIEW_HINTS[course.categoryId]) || ["e.g. Finally clicked", "What did you make or do after the course?"];

/** "3,184 learners" */
export const learnersLabel = (n: number) => `${formatNumber(n)} learner${n === 1 ? "" : "s"}`;

/* ----------------------------------------------------------------------------- tutor profile */
/** Hand-note line per tutor slug (sample copy). */
export const TUTOR_NOTES: Record<string, string> = {
  "arjun-rao": "ships a side project every month, mostly for fun",
  "meera-shah": "has strong opinions about the colour beige",
  "kabir-das": "learnt guitar from YouTube at 14. now makes better YouTube",
  "nisha-menon": "will happily explain SIPs at a wedding",
  "sana-iqbal": "shoots everything on a three-year-old phone",
  "vikram-iyer": "draws molecules on napkins. every single time",
  "rhea-kapoor": "recorded her first podcast in a cupboard full of quilts",
  "farhan-qureshi": "knows every Excel shortcut and will tell you",
  "tara-fernandes": "turned nervous speakers into confident ones for 9 years",
  "lakshmi-raman": "grinds her own sambar powder every Sunday",
};

/* ----------------------------------------------------------------------------- checkout */
export const PAYMENT_METHODS: { value: Order["method"]; label: string; description: string; icon: string }[] = [
  { value: "UPI", label: "UPI", description: "GPay, PhonePe, Paytm or any UPI app", icon: "spark" },
  { value: "Card", label: "Debit or credit card", description: "Visa, Mastercard, RuPay", icon: "wallet" },
  { value: "Netbanking", label: "Netbanking", description: "All major Indian banks", icon: "briefcase" },
  { value: "Wallet", label: "Wallet", description: "Paytm, Amazon Pay, Mobikwik", icon: "receipt" },
];

/**
 * Coupon codes that would work on this course right now for this buyer (for the
 * "demo codes" hint). With a userId, first-purchase-only codes drop out for
 * returning buyers; logged out, every generally valid code is listed.
 */
export function workingCoupons(courseId: string, userId: string | null | undefined, db: Db = SEED_DB): string[] {
  return db.coupons
    .filter((c) => c.active && validateCoupon(c.code, courseId, { userId: userId ?? null }, db).valid)
    .sort((a, b) => Number(!!b.courseIds) - Number(!!a.courseIds) || a.code.localeCompare(b.code))
    .map((c) => c.code)
    .slice(0, 3);
}

/**
 * The "Demo codes that work here" line. Logged out, first-purchase-only codes are
 * labelled, because every demo account has already bought something and the code
 * would fail right after login.
 */
export function couponHintLine(courseId: string, userId: string | null | undefined, db: Db = SEED_DB): string {
  const codes = workingCoupons(courseId, userId, db);
  if (!codes.length) return "No demo coupons apply to this course right now.";
  const label = (code: string) => {
    const c = db.coupons.find((x) => x.code === code);
    return !userId && c?.firstPurchaseOnly ? `${code} (first course only)` : code;
  };
  return `Demo codes that work here: ${codes.map(label).join(", ")}`;
}

/** Refund promise shown at checkout, built from the shared policy constants. */
export const REFUND_LINE = `Lifetime access. ${REFUND_WINDOW_DAYS}-day refund if you've watched less than ${REFUND_MAX_PROGRESS}%.`;

/* ----------------------------------------------------------------------------- related courses */
/** Category slugs that tend to interest the same person (from the fit quiz's first question, plus cooking with life skills). */
const SIBLING_GROUPS: string[][] = [
  ["coding", "design"],
  ["creator", "photography", "music"],
  ["business", "life-skills", "cooking"],
  ["exam-prep", "languages"],
];

const hashOf = (s: string) => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * "If you like this, try…": published courses ranked by same category, then same
 * tutor, then a sibling category, then popularity rotated per course (so pages
 * with no close matches don't all suggest the same trio). `excludeIds` drops
 * courses the viewer already owns.
 */
export function relatedFor(course: Course, excludeIds: readonly string[] = [], n = 4, db: Db = SEED_DB): Course[] {
  const skip = new Set([course.id, ...excludeIds]);
  const slugOf = new Map(db.categories.map((c) => [c.id, c.slug]));
  const mySlug = slugOf.get(course.categoryId) ?? "";
  const siblings = new Set(SIBLING_GROUPS.filter((g) => g.includes(mySlug)).flat());
  siblings.delete(mySlug);
  const pool = db.courses.filter((c) => c.status === "published" && !skip.has(c.id));
  // popularity order, then rotated by a per-course offset: deterministic, but different per page
  const byPop = [...pool].sort((a, b) => b.learners - a.learners || a.id.localeCompare(b.id));
  const shift = byPop.length ? hashOf(course.id) % byPop.length : 0;
  const popRank = new Map([...byPop.slice(shift), ...byPop.slice(0, shift)].map((c, i) => [c.id, i]));
  const tier = (c: Course) =>
    c.categoryId === course.categoryId ? 0 : c.tutorId === course.tutorId ? 1 : siblings.has(slugOf.get(c.categoryId) ?? "") ? 2 : 3;
  return pool
    .sort((a, b) => tier(a) - tier(b) || (tier(a) < 3 ? b.learners - a.learners : 0) || popRank.get(a.id)! - popRank.get(b.id)!)
    .slice(0, n);
}

/** GST included in an inclusive price (18%). */
export const gstIncluded = (amount: number) => Math.round(amount - amount / 1.18);

/* ----------------------------------------------------------------------------- fit quiz */
export interface FitQuestion {
  id: string;
  q: string;
  options: { label: string; tags: string[] }[];
}
/** "What should I learn?" quiz: each answer votes for category slugs. */
export const FIT_QUIZ: FitQuestion[] = [
  {
    id: "mood",
    q: "Pick the sentence that sounds most like you.",
    options: [
      { label: "I want to build something on a screen", tags: ["coding", "design"] },
      { label: "I want to make stuff people watch or hear", tags: ["creator", "photography", "music"] },
      { label: "I want my money and career sorted", tags: ["business", "life-skills"] },
      { label: "I have an exam or a big conversation coming up", tags: ["exam-prep", "languages"] },
    ],
  },
  {
    id: "time",
    q: "How much time can you give it each week?",
    options: [
      { label: "An hour, tops", tags: ["life-skills", "cooking", "languages"] },
      { label: "Two or three evenings", tags: ["design", "music", "photography", "creator"] },
      { label: "I'm going all in", tags: ["coding", "exam-prep", "business"] },
    ],
  },
  {
    id: "style",
    q: "Your ideal lesson ends with…",
    options: [
      { label: "Something I made", tags: ["coding", "design", "cooking", "music"] },
      { label: "Something I finally understand", tags: ["exam-prep", "life-skills", "business"] },
      { label: "Something I can post", tags: ["creator", "photography", "languages"] },
    ],
  },
];

/**
 * Quiz result for a viewer: the best published match they don't own yet
 * (`pick`), and the overall best match (`top`). When every good match is owned,
 * `pick` is null and `top` is the owned course to resume.
 */
export function recommendForViewer(
  answers: Record<string, number>,
  excludeIds: readonly string[] = [],
  db: Db = SEED_DB,
): { pick: Course | null; top: Course | null } {
  const ranked = rankFromQuiz(answers, db);
  const top = ranked[0] ?? null;
  const skip = new Set(excludeIds);
  // only fall back to courses that still fit what they want to do (the first
  // answer): "build something on a screen" never ends at a chemistry course
  const wants = FIT_QUIZ[0].options[answers[FIT_QUIZ[0].id]]?.tags ?? null;
  const catSlug = new Map(db.categories.map((c) => [c.id, c.slug]));
  const pick =
    ranked.find((c) => !skip.has(c.id) && (!wants || wants.includes(catSlug.get(c.categoryId) ?? ""))) ?? null;
  return { pick, top };
}

function quizScores(answers: Record<string, number>) {
  const score = new Map<string, number>();
  FIT_QUIZ.forEach((q, i) => {
    const opt = q.options[answers[q.id]];
    // the first question (what you want to do) counts double
    if (opt) for (const t of opt.tags) score.set(t, (score.get(t) ?? 0) + (i === 0 ? 2 : 1));
  });
  return score;
}

function rankFromQuiz(answers: Record<string, number>, db: Db): Course[] {
  const score = quizScores(answers);
  const catSlug = new Map(db.categories.map((c) => [c.id, c.slug]));
  return db.courses
    .filter((c) => c.status === "published")
    .sort(
      (a, b) =>
        (score.get(catSlug.get(b.categoryId) ?? "") ?? 0) - (score.get(catSlug.get(a.categoryId) ?? "") ?? 0) ||
        b.rating - a.rating ||
        b.learners - a.learners,
    );
}

/** Best-matching published course for a set of quiz answers (option index per question). */
export function recommendFromQuiz(answers: Record<string, number>, db: Db = SEED_DB): Course | null {
  const score = new Map<string, number>();
  FIT_QUIZ.forEach((q, i) => {
    const opt = q.options[answers[q.id]];
    // the first question (what you want to do) counts double
    if (opt) for (const t of opt.tags) score.set(t, (score.get(t) ?? 0) + (i === 0 ? 2 : 1));
  });
  const catSlug = new Map(db.categories.map((c) => [c.id, c.slug]));
  const pub = db.courses.filter((c) => c.status === "published");
  return (
    [...pub].sort(
      (a, b) =>
        (score.get(catSlug.get(b.categoryId) ?? "") ?? 0) - (score.get(catSlug.get(a.categoryId) ?? "") ?? 0) ||
        b.rating - a.rating ||
        b.learners - a.learners,
    )[0] ?? null
  );
}

