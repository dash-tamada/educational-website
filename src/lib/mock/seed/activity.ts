import type {
  Certificate,
  Coupon,
  Enrollment,
  LessonComment,
  LessonProgress,
  Note,
  Notification,
  Order,
  PaymentProvider,
  Profile,
  Payout,
  QuizAttempt,
  Report,
  Review,
  TutorApplication,
  WishlistItem,
} from "../types";
import { COURSES_BASE, CURRICULA } from "./catalog";
import { DEMO_ADMIN_ID, DEMO_STUDENT_ID, DEMO_TUTOR_ID, PENDING_TUTOR_IDS, STUDENTS, TUTOR_PROFILES_BASE, USERS } from "./people";
import { COURSE_SALES, CURRENT_MONTH, LEDGER_FROM, MONTH_DAYS_SO_FAR, grossOf, monthRange } from "./sales";
import { PLAYER_THREADS } from "./qa-player";
import { daysAgo, rng, toIST } from "./util";

const r = rng(7741);
const others = STUDENTS.filter((s) => s.id !== DEMO_STUDENT_ID);
const published = COURSES_BASE.filter((c) => c.status === "published");
const sellable = COURSES_BASE.filter((c) => c.status === "published" || c.status === "archived");

const items = (courseId: string) => CURRICULA[courseId].flatMap((m) => m.items);
/** The one public course: everything learners buy, review, ask about and finish is on it. */
const FLAGSHIP = "crs_aifilm";
/** Whole days between an ISO timestamp and MOCK_NOW. */
const ageDays = (iso: string) => Math.floor((new Date("2026-10-05T10:30:00+05:30").getTime() - new Date(iso).getTime()) / 86_400_000);

/* ============================================================================= coupons */
export const COUPONS: Coupon[] = [
  { id: "cpn_welcome", code: "WELCOME10", description: "10% off your first course", kind: "percent", value: 10, courseIds: null, firstPurchaseOnly: true, maxRedemptions: 5000, redemptions: 412, startsAt: daysAgo(330), endsAt: daysAgo(-180), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_inbox", code: "INBOX10", description: "Newsletter readers: 10% off", kind: "percent", value: 10, courseIds: null, maxRedemptions: 3000, redemptions: 216, startsAt: daysAgo(330), endsAt: daysAgo(-90), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_diwali", code: "DIWALI25", description: "Festive offer: 25% off AI Filmmaking", kind: "percent", value: 25, courseIds: null, maxRedemptions: 2000, redemptions: 0, startsAt: daysAgo(-10), endsAt: daysAgo(-25), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_arjun", code: "ARJUN15", description: "Arjun's community code: 15% off AI Filmmaking", kind: "percent", value: 15, courseIds: ["crs_aifilm"], maxRedemptions: 500, redemptions: 212, startsAt: daysAgo(200), endsAt: daysAgo(-60), active: true, createdBy: DEMO_TUTOR_ID },
  { id: "cpn_flat200", code: "FLAT200", description: "₹200 off any course of ₹999 or more", kind: "flat", value: 200, courseIds: null, minAmount: 999, maxRedemptions: 1000, redemptions: 431, startsAt: daysAgo(120), endsAt: daysAgo(-30), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_premiere", code: "PREMIERE30", description: "Launch week: 30% off AI Filmmaking", kind: "percent", value: 30, courseIds: ["crs_aifilm"], maxRedemptions: 300, redemptions: 300, startsAt: daysAgo(330), endsAt: daysAgo(323), active: false, createdBy: DEMO_ADMIN_ID },
];
/** A coupon that was actually live `days` days ago (or none), for generated orders. */
function couponOn(days: number, rr: { chance: (p: number) => boolean; pick: <T>(a: readonly T[]) => T }, p = 0.28): string | undefined {
  if (!rr.chance(p)) return undefined;
  const at = daysAgo(days);
  const live = COUPONS.filter((c) => c.code !== "DIWALI25" && c.startsAt <= at && at <= c.endsAt).map((c) => c.code);
  return live.length ? rr.pick(live) : undefined;
}

/* ============================================================================= lesson Q&A threads (data) */
/* Declared up here so the learners who asked can be enrolled (and have progress) below. */
type Thread = { course: string; item: string; user: string; days: number; q: string; a?: string; aDays?: number; likes?: number };
const THREADS: Thread[] = [
  { course: FLAGSHIP, item: "af-1-1", user: "u_s003", days: 40, q: "Can I really make a whole film without shooting a single frame?", a: "Yes. Everything in the capstone is generated: stills, motion, voices, music. What you bring is the direction: the story, the shot choices and the cut. That's what this course is really about.", aDays: 39, likes: 12 },
  { course: FLAGSHIP, item: "af-1-3", user: "u_s015", days: 31, q: "Roughly how much did the short in lesson 1 cost in credits?", a: "About ₹1,600 across image, video and voice tools, plus a lot of free-tier testing. The credit planner in this module shows the shot-by-shot split.", aDays: 31, likes: 7 },
  { course: FLAGSHIP, item: "af-2-2", user: "u_s021", days: 27, q: "Can I write the script in Malayalam and still prompt in English?", a: "Absolutely. Write the story in the language you think in, then translate only the shot list into prompts. Dialogue can stay Malayalam right through to the voice module.", aDays: 26, likes: 15 },
  { course: FLAGSHIP, item: "af-4-2", user: DEMO_STUDENT_ID, days: 10, q: "When should the camera move, and when should it stay locked off?", a: "Move when something changes for the character, or when the audience needs to discover something. Stay locked off when you want them to sit with a moment. If you can't say why it moves, lock it off.", aDays: 9, likes: 9 },
  { course: FLAGSHIP, item: "af-5-3", user: "u_s030", days: 2, q: "The motion brush moves the whole background along with my character. How do I keep the background still?", likes: 3 },
  { course: FLAGSHIP, item: "af-6-2", user: "u_s044", days: 1, q: "Can I use a photo of myself as the reference for my lead character?", likes: 1 },
  { course: FLAGSHIP, item: "af-7-3", user: "u_s012", days: 0, q: "Is there a way to lip-sync a song rather than dialogue, for a music-video style shot?", likes: 4 },
  { course: FLAGSHIP, item: "af-3-2", user: "u_s009", days: 14, q: "Midjourney or Flux for style frames? My results look very different.", a: "Different strengths. I reach for Midjourney when I want mood and texture, Flux when I need precise composition or readable text. Pick one per film so the look stays consistent.", aDays: 13, likes: 11 },
  { course: FLAGSHIP, item: "af-5-4", user: "u_s036", days: 3, q: "My character's hands keep melting in the close-up. Reroll or cut around it?", likes: 2 },
  { course: FLAGSHIP, item: "af-2-3", user: "u_s018", days: 60, q: "Should every line of the shot list already be a full prompt, or just notes?", a: "Notes first: shot size, action, mood. Turn them into full prompts only once the look is locked in module 3, otherwise you rewrite everything twice.", aDays: 58, likes: 19 },
  { course: FLAGSHIP, item: "af-4-3", user: "u_s026", days: 22, q: "How do I get a neon-noir look without it looking like every other AI video?", a: "Ground it in a real place and a real light source: a sodium streetlight, a shop sign, rain on a window. Then hold back on saturation in the grade. Restraint is what makes it feel filmed.", aDays: 21, likes: 8 },
  { course: FLAGSHIP, item: "af-5-2", user: "u_s040", days: 6, q: "In your comparison, which model handled faces best?", a: "For close-ups that day, Veo held faces most steadily and Kling gave the best physical motion. It changes with every update, which is why the lesson teaches you how to compare, not who wins.", aDays: 5, likes: 6 },
  { course: FLAGSHIP, item: "af-6-1", user: "u_s047", days: 4, q: "How many reference images should a character sheet have?", a: "Three to six: front, three-quarter, profile and a couple of expressions. Any more and the model starts averaging them into someone else.", aDays: 4, likes: 5 },
  { course: FLAGSHIP, item: "af-7-1", user: "u_s005", days: 12, q: "Can I clone my own voice and use it in Hindi if I recorded the sample in English?", a: "Many tools can, with an accent. For the most natural Hindi, record a minute of Hindi too. And it's your own voice, so consent is easy.", aDays: 12, likes: 24 },
  { course: FLAGSHIP, item: "af-8-2", user: "u_s028", days: 5, q: "Any good free source for ambience if I don't want to generate it?", a: "The pack in this module has 200 room tones and effects, royalty-free. Freesound is great too, just check each clip's licence.", aDays: 5, likes: 3 },
  { course: FLAGSHIP, item: "af-9-2", user: "u_s016", days: 18, q: "My 60-second cut runs 1:40. How do I decide what goes?", a: "Watch it without sound: any shot you don't miss, cut. Then listen without picture and cut any line that repeats what the image already says.", aDays: 17, likes: 10 },
  { course: FLAGSHIP, item: "af-9-3", user: "u_s034", days: 9, q: "Do I need the paid Studio version of Resolve for this module?", a: "No. The free version covers everything here. Studio only matters for some noise reduction and exports above 4K.", aDays: 8, likes: 13 },
  { course: FLAGSHIP, item: "af-10-3", user: "u_s020", days: 7, q: "Do I need to disclose AI if only the music was generated?", a: "Platform labels focus on realistic visuals, but I credit the tools in the description anyway. It costs nothing and your audience trusts you more for it.", aDays: 7, likes: 9 },
  { course: FLAGSHIP, item: "af-10-2", user: "u_s038", days: 11, q: "What export settings do you use for Instagram Reels?", a: "1080x1920, H.264, around 16 Mbps, AAC audio at 320 kbps. The release checklist has presets for every platform.", aDays: 10, likes: 7 },
  { course: FLAGSHIP, item: "af-11-1", user: "u_s050", days: 3, q: "For the capstone, do titles and credits count inside the 60 seconds?", a: "Keep them outside: the story gets the full minute. Add up to ten seconds of credits at the end.", aDays: 2, likes: 2 },
];

/* ============================================================================= orders + enrollments */
export const ORDERS: Order[] = [];
export const ENROLLMENTS: Enrollment[] = [];

const METHODS: Order["method"][] = ["UPI", "UPI", "UPI", "Card", "Card", "Netbanking", "Wallet"];
type Rng = ReturnType<typeof rng>;
const providerFor = (m: Order["method"], rr: Rng = r): PaymentProvider => (m === "UPI" ? "upi" : m === "Card" ? (rr.chance(0.2) ? "stripe" : "razorpay") : "razorpay");
const ref = (p: PaymentProvider, rr: Rng = r) =>
  p === "admin" ? `GRANT-${rr.int(1000, 9999)}` : `${p === "stripe" ? "pi_" : "pay_"}${Array.from({ length: 14 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"[rr.int(0, 54)]).join("")}`;

function priceWith(courseId: string, price: number, code?: string) {
  const cp = COUPONS.find((c) => c.code === code);
  if (!cp || (cp.courseIds && !cp.courseIds.includes(courseId)) || (cp.minAmount && price < cp.minAmount)) return { discount: 0 };
  const discount = cp.kind === "percent" ? Math.round((price * cp.value) / 100) : Math.min(cp.value, price);
  return { discount };
}

let orderSeq = 24610;
function addOrder(o: {
  userId: string;
  courseId: string;
  days: number;
  status?: Order["status"];
  method?: Order["method"];
  coupon?: string;
  grant?: boolean;
  refundReason?: string;
}, rr: Rng = r) {
  const course = COURSES_BASE.find((c) => c.id === o.courseId)!;
  const method = o.grant ? "Grant" : (o.method ?? rr.pick(METHODS));
  const provider: PaymentProvider = o.grant ? "admin" : providerFor(method, rr);
  const subtotal = o.grant ? 0 : course.price;
  const { discount } = o.grant ? { discount: 0 } : priceWith(course.id, course.price, o.coupon);
  const amount = subtotal - discount;
  const createdAt = daysAgo(o.days, rr.int(8, 23), rr.int(0, 59));
  const status = o.status ?? "paid";
  const order: Order = {
    id: `ord_${orderSeq}`,
    number: `TM-${orderSeq}`,
    userId: o.userId,
    courseId: o.courseId,
    subtotal,
    discount,
    amount,
    tax: Math.round(amount - amount / 1.18),
    currency: "INR",
    provider,
    providerRef: ref(provider, rr),
    method,
    status,
    couponCode: discount ? o.coupon : undefined,
    createdAt,
    refundedAt: status === "refunded" ? daysAgo(Math.max(0, o.days - rr.int(1, 5)), 12) : undefined,
    refundReason: status === "refunded" ? (o.refundReason ?? "Bought the wrong course") : undefined,
  };
  orderSeq += rr.int(1, 9);
  ORDERS.push(order);
  if (status === "paid" || status === "refunded") {
    ENROLLMENTS.push({
      id: `enr_${order.id.slice(4)}`,
      userId: o.userId,
      courseId: o.courseId,
      source: o.grant ? "admin_grant" : "purchase",
      orderId: order.id,
      createdAt,
      revokedAt: order.refundedAt,
    });
  }
  return order;
}

/* Priya's purchase (the demo student): her card was declined, a few minutes later UPI went through,
   both with Arjun's community code. */
const priyaFailed = addOrder({ userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, days: 46, status: "failed", method: "Card", coupon: "ARJUN15" });
const priyaFilm = addOrder({ userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, days: 46, method: "UPI", coupon: "ARJUN15" });
priyaFailed.createdAt = toIST(new Date(new Date(priyaFilm.createdAt).getTime() - 7 * 60_000));

/* ~70 sample orders since launch, growing towards the present (none before the publish date:
   anything that would land earlier joins the launch-week rush instead). */
const weightByCourse = sellable.map((c) => (c.status === "archived" ? 2 : Math.max(3, Math.round(c.learners / 400))));
for (let i = 0; i < 70; i++) {
  // month 0 (Oct) .. 11 (Nov last year); more recent months are busier
  const month = r.weighted([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [6, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
  let days = month === 0 ? r.int(0, 4) : month * 30 + r.int(-12, 12) - 5;
  const course = r.weighted(sellable, weightByCourse);
  const pub = course.publishedAt ? ageDays(course.publishedAt) : 0;
  if (pub && days > pub - 1) days = pub - 1 - r.int(0, 6);
  const roll = r.next();
  const status: Order["status"] = roll < 0.05 ? "refunded" : roll < 0.08 ? "failed" : roll < 0.1 && days < 6 ? "pending" : "paid";
  addOrder({
    userId: r.pick(others).id,
    courseId: course.id,
    days: Math.max(0, days),
    status,
    coupon: couponOn(Math.max(0, days), r),
    refundReason: r.pick(["Not enough time to start right now", "Expected live classes", "Accidental purchase by a family member", "Tool credits cost more than I can spend right now"]),
  });
}
/* Two admin grants (a scholarship and a support goodwill gesture). */
addOrder({ userId: "u_s007", courseId: FLAGSHIP, days: 33, grant: true });
addOrder({ userId: "u_s023", courseId: FLAGSHIP, days: 71, grant: true });
/* Nobody buys a course they already own: a random pick that landed on an existing owner goes to
   another learner who had joined by then (separate rng, so the rest of the seed doesn't shift). */
{
  const rd = rng(2718);
  const owned = new Set<string>();
  for (const o of [...ORDERS].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (o.userId === DEMO_STUDENT_ID) {
      owned.add(`${o.userId}|${o.courseId}`);
      continue;
    }
    if (owned.has(`${o.userId}|${o.courseId}`)) {
      for (let tries = 0; tries < 80; tries++) {
        const u = rd.pick(others);
        if (owned.has(`${u.id}|${o.courseId}`) || u.joinedAt > o.createdAt) continue;
        o.userId = u.id;
        const enr = ENROLLMENTS.find((e) => e.orderId === o.id);
        if (enr) enr.userId = u.id;
        break;
      }
    }
    if (o.status === "paid" || o.status === "pending") owned.add(`${o.userId}|${o.courseId}`);
  }
}
/* Everyone who asked a question under a paid lesson bought that course first (free-preview askers didn't need to). */
const isFreeItem = (courseId: string, itemId: string) => items(courseId).some((x) => x.id === itemId && x.type === "video" && x.lesson.isFreePreview);
const ASKERS = new Set<string>();
{
  const rq = rng(5150);
  for (const t of THREADS) {
    if (t.user === DEMO_STUDENT_ID || isFreeItem(t.course, t.item)) continue;
    ASKERS.add(`${t.user}|${t.course}`);
    if (ENROLLMENTS.some((e) => e.userId === t.user && e.courseId === t.course && !e.revokedAt)) continue;
    const course = COURSES_BASE.find((c) => c.id === t.course)!;
    const pubDays = course.publishedAt ? Math.floor((new Date("2026-10-05").getTime() - new Date(course.publishedAt).getTime()) / 86_400_000) : 365;
    const days = Math.min(Math.max(t.days + 2, pubDays - 1), t.days + rq.int(9, 30));
    addOrder({ userId: t.user, courseId: t.course, days, coupon: couponOn(days, rq, 0.25) }, rq);
  }
}
ORDERS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
/* Human order numbers follow time (oldest = lowest). */
ORDERS.forEach((o, i) => (o.number = `TM-${24610 + (ORDERS.length - i) * 7 + (i % 5)}`));
/* The two open refund requests for the admin queue are picked once the demo tutor's ledger is complete
   (see "refund requests" near the end): every recent flagship sale only exists from then on. */

/* ============================================================================= progress, attempts, notes */
export const LESSON_PROGRESS: LessonProgress[] = [];
export const QUIZ_ATTEMPTS: QuizAttempt[] = [];

function complete(courseId: string, itemId: string, days: number, durationSec = 600) {
  LESSON_PROGRESS.push({
    id: `lp_${itemId}_${DEMO_STUDENT_ID}`,
    userId: DEMO_STUDENT_ID,
    courseId,
    itemId,
    lastPositionSec: durationSec,
    completed: true,
    completedAt: daysAgo(days, 21, 15),
    updatedAt: daysAgo(days, 21, 15),
  });
}
function attempt(courseId: string, itemId: string, days: number, score: number, passMark: number, correctIdx?: number[]) {
  const quizItem = items(courseId).find((x) => x.id === itemId);
  if (!quizItem || quizItem.type !== "quiz") return;
  const qs = quizItem.quiz.questions;
  const answers: QuizAttempt["answers"] = {};
  const results = qs.map((q, i) => {
    const correct = correctIdx ? correctIdx.includes(i) : i < Math.round((score / 100) * qs.length);
    if (q.type === "short") answers[q.id] = correct ? (q.acceptedAnswers?.[0] ?? "") : "not sure";
    else answers[q.id] = q.options.filter((o) => (correct ? o.isCorrect : !o.isCorrect)).slice(0, q.type === "multiple" ? 3 : 1).map((o) => o.id);
    return { questionId: q.id, correct };
  });
  QUIZ_ATTEMPTS.push({
    id: `qa_${itemId}_${QUIZ_ATTEMPTS.length + 1}`,
    userId: DEMO_STUDENT_ID,
    courseId,
    quizId: quizItem.quiz.id,
    itemId,
    score,
    passed: score >= passMark,
    answers,
    results,
    createdAt: daysAgo(days, 22, 0),
  });
}

/* AI Filmmaking: modules 1-4 done (every video, resource and quiz), module 5's first lesson done,
   and the current lesson af-5-2 resumes at 7:40. The last five days are a streak (days 0-4, nothing on day 5). */
{
  const course = FLAGSHIP;
  // spread the early lessons from day 44 (two days after buying) to day 12
  const early = items(course).filter((it) => {
    const [, m, i] = it.id.split("-").map(Number);
    return it.type !== "quiz" && (m < 4 || (m === 4 && i === 1));
  });
  early.forEach((it, k) => {
    complete(course, it.id, 44 - Math.round((k * 32) / Math.max(1, early.length - 1)), it.type === "video" ? it.lesson.durationSec : 0);
  });
  const dur = (id: string) => {
    const it = items(course).find((x) => x.id === id);
    return it?.type === "video" ? it.lesson.durationSec : 0;
  };
  complete(course, "af-4-2", 10, dur("af-4-2"));
  complete(course, "af-4-3", 4, dur("af-4-3"));
  complete(course, "af-4-4", 3, 0);
  complete(course, "af-5-1", 1, dur("af-5-1"));
  attempt(course, "af-1-5", 36, 50, 70, [0, 1]);
  attempt(course, "af-1-5", 35, 75, 70, [0, 1, 3]);
  attempt(course, "af-2-5", 24, 100, 60);
  attempt(course, "af-4-5", 2, 80, 70, [0, 1, 2, 3]);
  LESSON_PROGRESS.push({
    id: `lp_af-5-2_${DEMO_STUDENT_ID}`,
    userId: DEMO_STUDENT_ID,
    courseId: course,
    itemId: "af-5-2",
    lastPositionSec: 460,
    completed: false,
    updatedAt: daysAgo(0, 8, 40),
  });
}

export const NOTES: Note[] = [
  { id: "note_1", userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, itemId: "af-2-2", atSec: 312, text: "60s beat sheet: hook 0-5s, want 5-20s, obstacle 20-45s, turn 45-60s.", createdAt: daysAgo(31, 21, 40) },
  { id: "note_2", userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, itemId: "af-3-2", atSec: 645, text: "Name the craft, not the vibe: lens + film stock + light source + era. Drop 'cinematic, 8K'.", createdAt: daysAgo(20, 22, 5) },
  { id: "note_3", userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, itemId: "af-4-1", atSec: 420, text: "Wide = context, 35mm = honest, 85mm = intimate. Pick the lens for the feeling.", createdAt: daysAgo(12, 21, 0) },
  { id: "note_4", userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, itemId: "af-4-2", atSec: 380, text: "Move the camera only when something changes. Slow push-in = a realisation landing.", createdAt: daysAgo(10, 21, 5) },
  { id: "note_5", userId: DEMO_STUDENT_ID, courseId: FLAGSHIP, itemId: "af-5-2", atSec: 410, text: "Kling for physical motion, Veo for faces. Test the hero shot on both before spending credits.", createdAt: daysAgo(0, 8, 35) },
];

/* ============================================================================= reviews */
/* Ratings, reviewers, dates and helpful votes come from the shared rng `r` (keep its call order: every section
   below draws from the same stream). The words are assigned afterwards, without `r`, so each course reads like
   its own learners wrote it:
   - comments come from that course's own pool (each course reads like its own learners wrote it),
     topped up with general lines that fit any course; nothing repeats inside one tutor's courses;
   - 3 stars and below get honest, critical comments; about half the 4-star reviews get a mild "good, but";
     5-star reviews never carry a complaint;
   - titles come from the rating bucket, and a tutor reply always matches the review it answers. */
const COURSE_LINES: Record<string, string[]> = {
  crs_aifilm: [
    "Made my first 60-second short in the capstone. My family thought I'd hired a crew.",
    "The camera-language module changed how I prompt. My shots finally look directed, not generated.",
    "Lens, movement, light: once Arjun explained the why, the models started listening.",
    "The Veo vs Kling vs Runway lesson alone saved me thousands in wasted credits.",
    "Style frames before video credits. Obvious once you hear it, and my budget thanks me.",
    "Character sheets fixed my biggest problem: my lead finally looks like the same person in every shot.",
    "The lip-sync lesson is gold. My Malayalam dialogue scene actually holds up in close-up.",
    "I never thought about sound. Module 8 made my short feel twice as expensive.",
    "Cutting AI footage in Resolve with J and L cuts hides every seam. Brilliant module.",
    "The grading lesson tied shots from three different models into one film.",
    "Arjun teaches like a director, not a tool demo. That's the difference.",
    "The credit planner sheet keeps my generations on budget. Every shot has a job now.",
    "My first brand client came from the capstone short I posted on Reels.",
    "The rights and disclosure lesson made me confident pitching AI work to clients.",
    "Loglines that survive the edit: my scripts are tighter and my films are shorter, in a good way.",
    "Watched the free pipeline lesson twice and bought the course that night. No regrets.",
  ],
};
/** General praise that fits any course. */
const UNIVERSAL_LINES = [
  "Clear, short lessons and no fluff. I finished it in two weekends.",
  "The tests between videos kept me honest. I actually remember this stuff.",
  "Worth every rupee. The free first video sold me and the rest delivered.",
  "Loved the pace. I could watch a lesson on the metro and practise at night.",
  "Explained like a friend would, not like a textbook.",
  "I tried YouTube for months. This was the first time it all clicked in order.",
  "The resources and cheat sheets alone are worth it.",
  "The Q&A under each lesson was a lifesaver. Got a reply within a day.",
  "Perfect for beginners. Nothing assumed, nothing skipped.",
  "Every module builds on the last one. Nothing feels random.",
  "Bite-sized lessons that respect your time.",
  "I watched the free first lesson twice and bought it the same night.",
  "Good production quality, clear audio, no filler.",
  "Already recommended it to my cousin and two friends.",
  "Wish I had found this a year ago.",
  "Great structure. I always knew what was coming next.",
  "Practical, warm and to the point.",
  "Watched it on my phone on the bus every day. Works perfectly on mobile.",
  "The tutor's energy keeps you going even on lazy days.",
  "Pause, practise, come back. The lessons are built for exactly that.",
  "Honestly better than courses that cost five times more.",
  "I liked that I could ask questions under each lesson and get real answers.",
  "Great energy from the tutor and genuinely useful examples from India.",
  "My confidence went up a lot, and it shows.",
];
/** Praise that only makes sense for working adults (not for school students or hobby courses). */
const WORK_LINES = [
  "Practical from lesson one. I used something from it at work the next day.",
  "Finished it during my notice period. Walked into the new job more confident.",
  "Did it after office hours, one lesson a night. Very doable.",
  "My team lead noticed the difference within a month.",
];
const WORK_CATEGORIES = new Set(["cat_film", "cat_ads"]);
type Critique = { text: string; reply: string };
/** "Good, but" lines for some 4-star reviews, each with the reply a tutor would actually write. */
const MILD_LINES: Critique[] = [
  { text: "Solid basics. I wanted a little more depth at the end, hoping for a part two.", reply: "Thank you! A part two with more depth is already on my list." },
  { text: "Good course overall. A couple of lessons could be shorter, but the content is solid.", reply: "Fair point. I'm trimming the longer lessons in the next update." },
  { text: "Audio was a bit low in one module, but the teaching is excellent.", reply: "Thanks for flagging the audio. That module has been re-mastered and should sound much better now." },
  { text: "Really helpful. I'd love a few more practice exercises in the later modules.", reply: "Noted! Extra practice sheets are going into the last two modules this month." },
  { text: "Great content. The pace picks up quite a bit in the middle, so take it slow.", reply: "Good advice for everyone. I'm adding a short recap lesson before that jump." },
  { text: "Clear teaching. A downloadable summary per module would be a nice extra.", reply: "Love this idea. Module summaries are coming with the next update." },
  { text: "Loved most of it. The last module felt a little rushed compared to the rest.", reply: "Thanks for the honest note. I'm re-recording the final module to slow it down." },
  { text: "Very practical. One or two examples felt dated, but the ideas hold up.", reply: "Thank you! Updating those examples is on my list for this quarter." },
  { text: "Good value. I'd have liked the tests to explain wrong answers in more detail.", reply: "Great suggestion. I've expanded the explanations on every test question." },
];
/** 3 stars and below: course-specific complaints first, then general ones. */
const COURSE_CRITIQUES: Record<string, Critique[]> = {
  crs_aifilm: [
    { text: "Great teaching, but the tool credits add up fast. Budget more than you think for the capstone.", reply: "Fair point. I've added a free-tier-only route through the capstone to the credit planner." },
    { text: "A couple of interface walkthroughs are already out of date because the tools update so often.", reply: "Thanks for flagging it. The image-to-video lessons were re-recorded this month, and I note the tool version on every walkthrough now." },
    { text: "I wanted more on anime and stylised looks. The course leans towards live-action realism.", reply: "Good note. A stylised-looks lesson is going into module 3 in the next update." },
  ],
};
const CRITIQUES: Critique[] = [
  { text: "Good content, but a few lessons drag. Could be tighter.", reply: "Thanks for the honest feedback. I'm re-recording the longer lessons this month." },
  { text: "Decent course. I expected more practice exercises for the price.", reply: "Fair criticism. A new practice workbook is now in module 2 for everyone enrolled." },
  { text: "The explanations are clear, but some resource links were outdated.", reply: "Sorry about that! Every link has been checked and fixed this week." },
  { text: "Fine for beginners. If you already know the basics, skip the first module.", reply: "Good tip for others. I'll mark the first module as optional for experienced learners." },
  { text: "I liked it, but I wanted more worked examples before the tests.", reply: "Thanks, noted. I've added a worked example before each test." },
];
const REVIEW_TITLES = {
  high: ["Exactly what I needed", "Finally clicked", "Highly recommend", "Loved it", "Worth every rupee", "Clear and practical", "So glad I bought this", "Brilliant course"],
  good: ["Really useful", "Great value", "Solid course", "Very helpful", "Clear and practical"],
  mild: ["Good, a few gaps", "Very good overall", "Solid, could be tighter"],
  low: ["Good, not perfect", "Decent, could be tighter", "Mixed feelings"],
} as const;
const THANKS_REPLIES = [
  "Thank you so much! Post your short in the Q&A, I'd love to see it.",
  "This made my day. Keep shooting, the next module gets even more fun.",
  "So glad it helped. A part two is in the works!",
  "Love hearing this. Thank you for taking the time to write it.",
  "That's exactly why I made this course. Proud of you!",
  "Thanks! Don't skip the capstone, that's where it all comes together.",
  "Reading this with my morning chai. Thank you, truly.",
];

export const REVIEWS: Review[] = [];
for (const c of COURSES_BASE.filter((x) => x.learners > 0)) {
  const n = Math.min(28, Math.max(6, Math.round(c.learners / 130)));
  const reviewers = r.shuffle(others).slice(0, n);
  const target = c.rating;
  reviewers.forEach((u, i) => {
    const roll = r.next();
    const rating = target >= 4.8 ? (roll < 0.85 ? 5 : roll < 0.98 ? 4 : 3) : target >= 4.6 ? (roll < 0.76 ? 5 : roll < 0.95 ? 4 : 3) : roll < 0.55 ? 5 : roll < 0.85 ? 4 : roll < 0.97 ? 3 : 2;
    const days = r.int(1, Math.max(2, Math.min(300, c.publishedAt ? Math.round((new Date("2026-10-05").getTime() - new Date(c.publishedAt).getTime()) / 86_400_000) - 2 : 30)));
    REVIEWS.push({
      id: `rev_${c.id.slice(4)}_${i + 1}`,
      userId: u.id,
      courseId: c.id,
      rating,
      // the words (title, comment, reply) are written below; these draws only decide whether there is one
      title: r.chance(0.6) ? "-" : undefined,
      comment: "",
      createdAt: daysAgo(days, r.int(9, 23)),
      reply: r.chance(0.3) ? { body: r.pick(THANKS_REPLIES), createdAt: daysAgo(Math.max(0, days - 1), 10) } : undefined,
      helpful: r.int(0, 42),
    });
  });
}
{
  const tutorOf = Object.fromEntries(COURSES_BASE.map((c) => [c.id, c.tutorId]));
  const catOf = Object.fromEntries(COURSES_BASE.map((c) => [c.id, c.categoryId]));
  const wr = rng(5113); // wording only; never touches `r`
  const counters = new Map<string, number>();
  const tick = (key: string, len: number) => {
    const k = counters.get(key) ?? 0;
    counters.set(key, k + 1);
    return k % len;
  };
  const usedByTutor = new Map<string, Set<string>>();
  const usedAnywhere = new Set<string>();
  // first choice: a line no other course has used yet; then one this tutor has not used
  const choose = <T,>(list: readonly T[], text: (x: T) => string, used: Set<string>) =>
    list.find((x) => !used.has(text(x)) && !usedAnywhere.has(text(x))) ?? list.find((x) => !used.has(text(x)));
  const rotate = <T,>(list: readonly T[], k: number) => [...list.slice(k % list.length), ...list.slice(0, k % list.length)];
  // Per course: two of its own lines, then one general line, so the first page reads specific but varied.
  const praise = new Map<string, string[]>();
  const praiseFor = (courseId: string) => {
    let list = praise.get(courseId);
    if (!list) {
      const own = wr.shuffle(COURSE_LINES[courseId] ?? []);
      const general = wr.shuffle([...UNIVERSAL_LINES, ...(WORK_CATEGORIES.has(catOf[courseId]) ? WORK_LINES : [])]);
      list = [];
      while (own.length || general.length) list.push(...own.splice(0, 2), ...general.splice(0, 1));
      praise.set(courseId, list);
    }
    return list;
  };
  // newest first: the reviews people see first get the most specific lines
  const ordered = [...REVIEWS].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  for (const rev of ordered) {
    const tutorId = tutorOf[rev.courseId];
    const used = usedByTutor.get(tutorId) ?? new Set<string>();
    usedByTutor.set(tutorId, used);
    let tone: keyof typeof REVIEW_TITLES = rev.rating === 5 ? "high" : "good";
    let critique: Critique | undefined;
    if (rev.rating <= 3) {
      critique = choose([...(COURSE_CRITIQUES[rev.courseId] ?? []), ...CRITIQUES], (x) => x.text, used);
      tone = "low";
    } else if (rev.rating === 4 && tick(`${rev.courseId}:four`, 2) === 0) {
      critique = choose(rotate(MILD_LINES, tick("mild", MILD_LINES.length)), (x) => x.text, used);
      if (critique) tone = "mild";
    }
    const pool = praiseFor(rev.courseId);
    const comment = critique?.text ?? choose(pool, (x) => x, used) ?? pool[tick(`${rev.courseId}:spill`, pool.length)];
    used.add(comment);
    usedAnywhere.add(comment);
    rev.comment = comment;
    // rotated per tutor: the tutor profile lists all their courses together
    if (rev.title) rev.title = REVIEW_TITLES[tone][tick(`${tutorId}:${tone}`, REVIEW_TITLES[tone].length)];
    if (rev.reply) rev.reply.body = critique?.reply ?? THANKS_REPLIES[(tick(`${tutorId}:thanks`, THANKS_REPLIES.length) + [...tutorId].reduce((s, ch) => s + ch.charCodeAt(0), 0)) % THANKS_REPLIES.length];
  }
}
/* A review about a product rather than the course (someone reviewed their gear order here): the target of report rpt_1. */
REVIEWS.push({
  id: "rev_offtopic_1",
  userId: "u_s037",
  courseId: FLAGSHIP,
  rating: 4,
  title: "Good kit",
  comment: "The ring light and tripod clamp arrived well packed and work great. Delivery took a week though.",
  createdAt: daysAgo(2, 20, 40),
  helpful: 0,
});

/* Every review is written by someone who owns the course: their purchase predates the review.
   The ratings, dates and words above came from `r`; this pass uses its own rng, so nothing else
   shifts. A reviewer who never bought the course (and joined early enough) buys it a few days to a
   few weeks before reviewing; a reviewer who can't (refunded / pending, joined too late) hands the
   review to a learner who already owns the course, or to another learner who buys it first. */
{
  const rv = rng(6061);
  const DAY = 86_400_000;
  const NOW = new Date("2026-10-05T10:30:00+05:30").getTime();
  const ageOf = (iso: string) => Math.floor((NOW - new Date(iso).getTime()) / DAY);
  // the demo tutor's ledger window (LEDGER_FROM..now) is complete to the unit: these purchases land before it
  const windowAge = ageOf(`${LEDGER_FROM}T00:00:00+05:30`);
  const userById = new Map(STUDENTS.map((u) => [u.id, u]));
  const reviewed = new Set(REVIEWS.map((x) => `${x.userId}|${x.courseId}`));
  const ownsBefore = (userId: string, courseId: string, iso: string) =>
    ENROLLMENTS.some((e) => e.userId === userId && e.courseId === courseId && !e.revokedAt && e.createdAt < iso);
  const hasHistory = (userId: string, courseId: string) =>
    ORDERS.some((o) => o.userId === userId && o.courseId === courseId) || ENROLLMENTS.some((e) => e.userId === userId && e.courseId === courseId);
  /** a purchase age (days ago) that lands before the review, after publishing and after joining; null if impossible */
  const buyAge = (userId: string, courseId: string, reviewAge: number) => {
    const course = COURSES_BASE.find((c) => c.id === courseId)!;
    const user = userById.get(userId);
    if (!user) return null;
    const pubAge = course.publishedAt ? ageOf(course.publishedAt) - 1 : 365;
    const joinAge = ageOf(user.joinedAt) - 1;
    let min = reviewAge + 2;
    if (course.tutorId === DEMO_TUTOR_ID) min = Math.max(min, windowAge + 2);
    const max = Math.min(pubAge, joinAge);
    if (max < min) return null;
    return Math.min(max, min + rv.int(1, 40));
  };
  const buy = (rev: Review, userId: string, days: number) => {
    addOrder({ userId, courseId: rev.courseId, days, coupon: couponOn(days, rv, 0.25) }, rv);
  };
  for (const rev of [...REVIEWS].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
    if (rev.userId === DEMO_STUDENT_ID || ownsBefore(rev.userId, rev.courseId, rev.createdAt)) continue;
    const reviewAge = ageOf(rev.createdAt);
    // 1) the original author buys it first
    if (!hasHistory(rev.userId, rev.courseId)) {
      const days = buyAge(rev.userId, rev.courseId, reviewAge);
      if (days !== null) {
        buy(rev, rev.userId, days);
        continue;
      }
    }
    // 1b) the author bought it, just after the drawn review date: the review comes a little later
    const mine = ENROLLMENTS.find((e) => e.userId === rev.userId && e.courseId === rev.courseId && !e.revokedAt);
    if (mine && ageOf(mine.createdAt) >= 4) {
      const days = Math.max(1, ageOf(mine.createdAt) - rv.int(2, Math.min(20, ageOf(mine.createdAt) - 1)));
      rev.createdAt = daysAgo(days, rv.int(9, 23));
      if (rev.reply) rev.reply.createdAt = daysAgo(Math.max(0, days - 1), 10);
      continue;
    }
    reviewed.delete(`${rev.userId}|${rev.courseId}`);
    // 2) a learner who already owns it and hasn't reviewed it
    const owners = ENROLLMENTS.filter(
      (e) =>
        e.courseId === rev.courseId &&
        !e.revokedAt &&
        e.createdAt < rev.createdAt &&
        e.userId !== DEMO_STUDENT_ID &&
        userById.has(e.userId) &&
        !reviewed.has(`${e.userId}|${rev.courseId}`),
    );
    if (owners.length) {
      rev.userId = rv.pick(owners).userId;
      reviewed.add(`${rev.userId}|${rev.courseId}`);
      continue;
    }
    // 3) another learner with no history in this course buys it first
    const fresh = rv
      .shuffle(others)
      .find((u) => !hasHistory(u.id, rev.courseId) && !reviewed.has(`${u.id}|${rev.courseId}`) && buyAge(u.id, rev.courseId, reviewAge) !== null);
    if (fresh) {
      rev.userId = fresh.id;
      buy(rev, fresh.id, buyAge(fresh.id, rev.courseId, reviewAge)!);
    }
    reviewed.add(`${rev.userId}|${rev.courseId}`);
  }
}
REVIEWS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ============================================================================= wishlist */
/* Filled at the very end of the seed (once every buyer is known): only learners who never bought a
   course wishlist it. */
export const WISHLIST: WishlistItem[] = [];

/* ============================================================================= certificates */
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () => `TM-${Array.from({ length: 4 }, () => ALPHA[r.int(0, ALPHA.length - 1)]).join("")}-${Array.from({ length: 4 }, () => ALPHA[r.int(0, ALPHA.length - 1)]).join("")}`;
const hours = (courseId: string) =>
  Math.max(1, Math.round(items(courseId).reduce((s, it) => s + (it.type === "video" ? it.lesson.durationSec : 0), 0) / 3600));
/** Public pages (certificate check, terms, contact form) link to these two codes: they must keep resolving. */
const PUBLIC_SAMPLE_CODES = ["TM-7QK4-M2XD", "TM-3HNP-8RVA"];

/* 14 graduates (Priya is still in module 5): learners who bought at least 75 days ago, never asked a
   question that is still their in-progress lesson, and aren't asking for a refund. Each finished
   25-60 days after buying. */
export const CERTIFICATES: Certificate[] = (() => {
  const orderOf = new Map(ORDERS.map((o) => [o.id, o]));
  const seen = new Set<string>();
  const pool = ENROLLMENTS.filter((e) => {
    const key = `${e.userId}|${e.courseId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return (
      e.userId !== DEMO_STUDENT_ID &&
      !e.revokedAt &&
      e.courseId === FLAGSHIP &&
      ageDays(e.createdAt) >= 75 &&
      !ASKERS.has(key) &&
      !(e.orderId && orderOf.get(e.orderId)?.refundRequest)
    );
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const n = Math.min(14, pool.length);
  return Array.from({ length: n }, (_, i) => {
    const e = pool[Math.floor((i * pool.length) / n)];
    return {
      id: `cert_${i + 1}`,
      code: PUBLIC_SAMPLE_CODES[i] ?? code(),
      userId: e.userId,
      courseId: e.courseId,
      issuedAt: daysAgo(Math.max(1, ageDays(e.createdAt) - r.int(25, 60)), 20),
      hours: hours(e.courseId),
    };
  });
})();

/* ============================================================================= other learners' progress */
/*
 * Priya's progress is hand-written above. Everyone else gets deterministic progress from a
 * separate rng (so nothing else in the seed shifts):
 * - certificate holders finished every item (quizzes passed) before the certificate was issued,
 *   and their enrollment carries completedAt;
 * - Q&A askers reached the lesson they asked about (it's their in-progress lesson);
 * - refunded or refund-requested purchases stay under the 25% refund threshold;
 * - everyone else is somewhere between "bought it, not started" and "nearly done" (never 100%
 *   without a certificate).
 */
{
  const rp = rng(31337);
  const DAY = 86_400_000;
  const NOW = new Date("2026-10-05T10:30:00+05:30").getTime();
  const ageOf = (iso: string) => Math.max(0, Math.floor((NOW - new Date(iso).getTime()) / DAY));
  const lastActive = new Map(STUDENTS.map((u) => [u.id, ageOf(u.lastActiveAt)]));
  const orderById = new Map(ORDERS.map((o) => [o.id, o]));
  const minus = (iso: string, minutes: number) => {
    const d = new Date(new Date(iso).getTime() - minutes * 60_000 + 330 * 60_000);
    const p2 = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00+05:30`;
  };

  const processed = new Set<string>();
  for (const e of ENROLLMENTS) {
    if (e.userId === DEMO_STUDENT_ID || processed.has(`${e.userId}|${e.courseId}`)) continue;
    processed.add(`${e.userId}|${e.courseId}`);
    const flat = items(e.courseId);
    if (!flat.length) continue;
    const cert = CERTIFICATES.find((c) => c.userId === e.userId && c.courseId === e.courseId);
    const order = e.orderId ? orderById.get(e.orderId) : undefined;
    const thread = THREADS.find((t) => t.user === e.userId && t.course === e.courseId);
    const start = ageOf(e.createdAt);

    let done: number; // items fully completed, in order
    let endDays: number; // days ago of the last activity
    let inProgress = true; // leave the next video half-watched
    if (cert) {
      done = flat.length;
      endDays = ageOf(cert.issuedAt);
      inProgress = false;
      e.completedAt = minus(cert.issuedAt, 2);
    } else if (e.revokedAt || order?.refundRequest) {
      done = Math.floor(flat.length * rp.next() * 0.18);
      endDays = Math.max(ageOf(e.revokedAt ?? order!.refundRequest!.requestedAt), Math.min(start, start - 1));
    } else if (thread) {
      const at = flat.findIndex((x) => x.id === thread.item);
      done = Math.max(0, at);
      endDays = Math.min(start, thread.days);
    } else if (rp.chance(start < 4 ? 0.5 : 0.12)) {
      done = 0; // bought it, hasn't pressed play yet
      endDays = start;
      inProgress = false;
    } else {
      const f = start < 4 ? rp.next() * 0.15 : start < 21 ? 0.08 + rp.next() * 0.4 : 0.12 + rp.next() * 0.8;
      done = Math.min(flat.length - 1, Math.max(1, Math.round(flat.length * f)));
      endDays = Math.min(start, Math.max(lastActive.get(e.userId) ?? 0, rp.int(0, Math.min(start, 45))));
    }
    endDays = Math.max(0, Math.min(endDays, start));

    const span = Math.max(0, start - endDays);
    for (let i = 0; i < done; i++) {
      const it = flat[i];
      const days = Math.round(start - (span * (i + 1)) / Math.max(1, done));
      let at = daysAgo(Math.max(endDays, days), rp.int(7, 22), rp.int(0, 59));
      // a certificate is issued after the last item, never before
      if (cert && at > minus(cert.issuedAt, 5)) at = minus(cert.issuedAt, 5 + (done - i) * 9);
      if (it.type === "quiz") {
        const qs = it.quiz.questions;
        const n = qs.length || 1;
        const need = Math.ceil((it.quiz.passPercentage / 100) * n);
        const triesLeft = it.quiz.maxAttempts === 0 ? 3 : it.quiz.maxAttempts;
        const attemptsList: number[] = [];
        if (triesLeft > 1 && rp.chance(0.22)) attemptsList.push(Math.max(0, need - rp.int(1, 2)));
        attemptsList.push(rp.int(need, n));
        attemptsList.forEach((correctCount, k) => {
          const correctIdx = rp.shuffle(qs.map((_, qi) => qi)).slice(0, correctCount);
          const score = Math.round((correctCount / n) * 100);
          const results = qs.map((q, qi) => ({ questionId: q.id, correct: correctIdx.includes(qi) }));
          const answers: QuizAttempt["answers"] = {};
          qs.forEach((q, qi) => {
            const ok = correctIdx.includes(qi);
            if (q.type === "short") answers[q.id] = ok ? (q.acceptedAnswers?.[0] ?? "") : "not sure";
            else answers[q.id] = q.options.filter((o) => (ok ? o.isCorrect : !o.isCorrect)).slice(0, q.type === "multiple" ? 3 : 1).map((o) => o.id);
          });
          QUIZ_ATTEMPTS.push({
            id: `qa_${it.id}_${e.userId}_${k + 1}`,
            userId: e.userId,
            courseId: e.courseId,
            quizId: it.quiz.id,
            itemId: it.id,
            score,
            passed: score >= it.quiz.passPercentage,
            answers,
            results,
            createdAt: k < attemptsList.length - 1 ? minus(at, rp.int(20, 90)) : at,
          });
        });
      } else {
        LESSON_PROGRESS.push({
          id: `lp_${it.id}_${e.userId}`,
          userId: e.userId,
          courseId: e.courseId,
          itemId: it.id,
          lastPositionSec: it.type === "video" ? it.lesson.durationSec : 0,
          completed: true,
          completedAt: at,
          updatedAt: at,
        });
      }
    }
    const next = flat[done];
    if (inProgress && next?.type === "video") {
      const at = daysAgo(endDays, rp.int(7, 22), rp.int(0, 59));
      LESSON_PROGRESS.push({
        id: `lp_${next.id}_${e.userId}`,
        userId: e.userId,
        courseId: e.courseId,
        itemId: next.id,
        lastPositionSec: Math.round(next.lesson.durationSec * (0.1 + rp.next() * 0.65)),
        completed: false,
        updatedAt: at,
      });
    }
  }
}

/* ============================================================================= lesson Q&A */
const TUTOR_OF = Object.fromEntries(COURSES_BASE.map((c) => [c.id, c.tutorId]));
export const COMMENTS: LessonComment[] = THREADS.flatMap((t, i) => {
  const q: LessonComment = { id: `cmt_${i + 1}`, courseId: t.course, itemId: t.item, userId: t.user, body: t.q, createdAt: daysAgo(t.days, r.int(9, 22)), parentId: null, resolved: !!t.a, likes: t.likes ?? 0 };
  if (!t.a) return [q];
  return [q, { id: `cmt_${i + 1}_a`, courseId: t.course, itemId: t.item, userId: TUTOR_OF[t.course], body: t.a, createdAt: daysAgo(t.aDays ?? t.days, r.int(9, 22)), parentId: q.id, likes: Math.round((t.likes ?? 0) * 0.8) }];
});
/* A spam reply under the free-preview Q&A (anyone can comment there): the target of report rpt_2. */
COMMENTS.push({
  id: "cmt_spam_1",
  courseId: FLAGSHIP,
  itemId: "af-1-1",
  userId: "u_s049",
  body: "Free unlimited Veo and Kling credits!! DM me on Telegram for the generator link, limited slots.",
  createdAt: daysAgo(0, 8, 5),
  parentId: "cmt_1",
  likes: 0,
});

/* Older answered threads first written for the player (ids "xcmt_*"). An asker on a paid
   lesson must have been enrolled before asking; when the original author wasn't, a learner
   who was (never the demo student, never a suspended account) asks instead. Free-preview
   questions can come from anyone. */
{
  const flatOf = new Map(Object.entries(CURRICULA).map(([id, mods]) => [id, mods.flatMap((m) => m.items)]));
  const suspended = new Set(STUDENTS.filter((s) => s.status === "suspended").map((s) => s.id));
  const enrolledBefore = (userId: string, courseId: string, iso: string) =>
    ENROLLMENTS.some((e) => e.userId === userId && e.courseId === courseId && !e.revokedAt && e.createdAt < iso);
  const used = new Map<string, Set<string>>(); // courseId -> askers already used
  PLAYER_THREADS.forEach((t, i) => {
    const id = `xcmt_${i + 1}`;
    const askedAt = daysAgo(t.days, 10 + (i % 9));
    const item = flatOf.get(t.course)?.find((x) => x.id === t.item);
    const free = item?.type === "video" && item.lesson.isFreePreview;
    const seen = used.get(t.course) ?? new Set<string>();
    let asker = t.user;
    if (!free && !enrolledBefore(asker, t.course, askedAt)) {
      const pool = [...new Set(ENROLLMENTS.filter((e) => e.courseId === t.course && !e.revokedAt && e.createdAt < daysAgo(t.days + 2)).map((e) => e.userId))]
        .filter((u) => u.startsWith("u_s") && !suspended.has(u) && u !== DEMO_STUDENT_ID)
        .sort();
      const fresh = pool.filter((u) => !seen.has(u));
      const from = fresh.length ? fresh : pool;
      if (from.length) asker = from[(i * 7 + t.days) % from.length];
    }
    seen.add(asker);
    used.set(t.course, seen);
    COMMENTS.push(
      { id, courseId: t.course, itemId: t.item, userId: asker, body: t.q, createdAt: askedAt, parentId: null, resolved: true, likes: t.likes },
      { id: `${id}_a`, courseId: t.course, itemId: t.item, userId: TUTOR_OF[t.course] ?? t.tutor, body: t.a, createdAt: daysAgo(Math.max(0, t.days - 1), 11 + (i % 8)), parentId: id, likes: Math.round(t.likes * 0.7) },
    );
    if (t.follow) {
      const by = t.follow[0] === t.user ? asker : t.follow[0];
      COMMENTS.push({ id: `${id}_f`, courseId: t.course, itemId: t.item, userId: by, body: t.follow[1], createdAt: daysAgo(Math.max(0, t.days - 1), 20), parentId: id, likes: 1 });
    }
  });
}

/* ============================================================================= tutor applications */
const APPS: Omit<TutorApplication, "id" | "name" | "email" | "city">[] = [
  { userId: PENDING_TUTOR_IDS[0], subject: "Sound design and AI scoring", categoryId: "cat_film", experience: "Sound designer on Hindi web series for 8 years. Scores indie shorts with AI music tools and real stems.", sampleUrl: "https://example.com/samples/sound-design-breakdown", why: "Most AI shorts sound like a stock library. I can teach learners to design sound that makes generated footage feel shot.", plannedCourse: "Sound for AI Films: Foley, Ambience and Score", status: "pending", submittedAt: daysAgo(1, 19, 20) },
  { userId: PENDING_TUTOR_IDS[1], subject: "Anime and stylised AI shorts", categoryId: "cat_film", experience: "2D animator turned AI artist. Makes anime-style shorts followed by 400k people across Instagram and YouTube.", sampleUrl: "https://example.com/samples/anime-short-breakdown", why: "Learners keep asking for stylised looks. I can teach consistent anime characters and motion without the uncanny feel.", plannedCourse: "Anime-Style Shorts with AI", status: "pending", submittedAt: daysAgo(2, 22, 5) },
  { userId: PENDING_TUTOR_IDS[2], subject: "Colour grading for AI footage", categoryId: "cat_film", experience: "Freelance colourist in Lucknow. Grades music videos and ads in DaVinci Resolve.", sampleUrl: "https://example.com/samples/grading-lesson-shot-matching", why: "Footage from different models never matches. Grading is how it becomes one film, and most creators skip it.", plannedCourse: "Grade It Like Cinema: Resolve for AI Footage", status: "pending", submittedAt: daysAgo(3, 11, 40), history: [{ submittedAt: daysAgo(13, 10, 5), status: "changes_requested", decidedAt: daysAgo(10, 16, 30), decidedBy: DEMO_ADMIN_ID, decisionNote: "Your reel is gorgeous, but a reel doesn't show us how you teach. Could you add a 3-minute lesson video, say matching two shots from different models, and a rough outline?" }] },
  { userId: PENDING_TUTOR_IDS[3], subject: "Tamil and Telugu dialogue and lip-sync", categoryId: "cat_film", experience: "Dubbing director for Tamil and Telugu films for 9 years.", sampleUrl: "https://example.com/samples/regional-lip-sync-lesson", why: "Regional-language dialogue is where AI lip-sync struggles most. I can show learners how to cast, direct and sync voices in Tamil and Telugu.", plannedCourse: "Regional Voices: Tamil and Telugu Dialogue for AI Films", status: "pending", submittedAt: daysAgo(4, 16, 15) },
  { userId: PENDING_TUTOR_IDS[4], subject: "AI product films and ads", categoryId: "cat_ads", experience: "Creative producer at a Bengaluru D2C agency. Ships 20+ AI product spots a month.", sampleUrl: "https://example.com/samples/product-film-breakdown", why: "Brands want AI ads now, and creators need to keep a product exactly on-brand in every frame. I do it every day.", plannedCourse: "AI Product Films That Clients Approve", status: "pending", submittedAt: daysAgo(5, 8, 50) },
  { userId: PENDING_TUTOR_IDS[5], subject: "AI music videos for indie artists", categoryId: "cat_musicvideo", experience: "Directed 30+ music videos for indie artists in Mumbai, the last ten made almost entirely with AI.", sampleUrl: "https://example.com/samples/indie-music-video", why: "Indie musicians can't afford shoots. I can teach creators to make music videos that artists actually release.", plannedCourse: "Music Videos on an Indie Budget", status: "pending", submittedAt: daysAgo(6, 21, 0) },
  { userId: DEMO_TUTOR_ID, subject: "AI filmmaking (lead director)", categoryId: "cat_film", experience: "Directed ads, music videos and short films for a decade. Has made AI shorts since the first image-to-video models.", sampleUrl: "https://example.com/samples/arjun-rao-showreel", why: "I want to teach the director's half of AI filmmaking: story, shots and the cut, not just the buttons.", plannedCourse: "AI Filmmaking: Prompt to Premiere", status: "approved", submittedAt: daysAgo(638), decidedAt: daysAgo(635), decidedBy: DEMO_ADMIN_ID, decisionNote: "Outstanding reel and a clear plan. Welcome aboard: this becomes the flagship." },
  { userId: "u_s052", subject: "Celebrity face-swap ads", categoryId: "cat_ads", experience: "Makes viral face-swap videos of film stars for brand pages.", sampleUrl: "https://example.com/samples/faceswap-reel", why: "Celebrity face-swap ads get huge views and brands pay well for them.", plannedCourse: "Celebrity Face-Swap Ads", status: "rejected", submittedAt: daysAgo(40), decidedAt: daysAgo(37), decidedBy: DEMO_ADMIN_ID, decisionNote: "We don't teach content that uses real people's faces or voices without their consent. Thanks for applying." },
  { userId: "u_s058", subject: "AI moments for wedding films", categoryId: "cat_film", experience: "Wedding filmmaker in Indore for 5 years. Adds AI title sequences and dream shots to her films.", sampleUrl: "https://example.com/samples/wedding-film-stills", why: "Wedding films are a huge market in India, and AI scenes are what couples now ask for.", plannedCourse: "AI Moments for Wedding Films", status: "changes_requested", submittedAt: daysAgo(15), decidedAt: daysAgo(12), decidedBy: DEMO_ADMIN_ID, decisionNote: "Love the idea! Please share a 3-minute sample lesson video (not just stills) so we can see your teaching style." },
];
/* The course outline each applicant sketched (TutorApplication.courseOutline), by applicant. */
const APP_OUTLINES: Record<string, string[]> = {
  [PENDING_TUTOR_IDS[0]]: ["Listening like a sound designer: what each shot needs", "Ambience and room tone that glue AI shots together", "Foley for generated footage: footsteps, cloth, props", "Briefing AI music tools and editing the stems", "Mixing for phones, YouTube and festival screens"],
  [PENDING_TUTOR_IDS[1]]: ["An anime character sheet the models can follow", "Style frames: cel shading, line weight and palettes", "Motion that reads as animation, not video", "Lip-sync and expressions for stylised faces", "A 30-second anime opening, start to finish"],
  [PENDING_TUTOR_IDS[2]]: ["Why AI shots never match out of the box", "Balancing: exposure, white balance and contrast", "Shot matching across Veo, Kling and Runway clips", "Building a look from a style bible", "Skin tones, LUTs and delivering for Reels and YouTube"],
  [PENDING_TUTOR_IDS[3]]: ["Casting voices for Tamil and Telugu characters", "Writing dialogue that syncs: syllables and mouth shapes", "Directing AI voice performances in regional languages", "Lip-sync passes and fixing the frames that slip", "Subtitles and dubbing for pan-India releases"],
  [PENDING_TUTOR_IDS[4]]: ["Reading a brand brief and a brand book", "Product consistency: packs, labels and logos", "Macro, splash and turntable hero shots", "Cut-downs for every placement", "Pricing and rights for AI ad work"],
  [PENDING_TUTOR_IDS[5]]: ["Turning a track into a treatment", "Beat maps and shot timing", "Performance shots and vocal lip-sync", "Lyric moments and dream sequences", "Releasing with the artist: cuts, covers and credits"],
  u_s058: ["What couples ask for: AI title sequences and dream shots", "Matching AI shots to real wedding footage", "Consent and likeness when you use couples' photos", "Story-led highlight edits", "Pricing AI add-ons in your packages"],
};
/* The rest of each applicant's wizard answers (years, languages, website, payout), by applicant. */
const APP_EXTRAS: Record<string, Pick<TutorApplication, "years" | "languages" | "website" | "payout">> = {
  [PENDING_TUTOR_IDS[0]]: { years: "7+", languages: ["Hindi", "English"], website: "https://example.com/ishaan-sound", payout: { country: "IN", method: "UPI", gst: "no" } },
  [PENDING_TUTOR_IDS[1]]: { years: "3-7", languages: ["English", "Hindi"], website: "https://example.com/arnav-animates", payout: { country: "IN", method: "Bank transfer (NEFT/IMPS)", gst: "unsure" } },
  [PENDING_TUTOR_IDS[2]]: { years: "1-3", languages: ["English", "Hindi"], website: "https://example.com/pranav-grades", payout: { country: "IN", method: "UPI", gst: "no" } },
  [PENDING_TUTOR_IDS[3]]: { years: "7+", languages: ["Tamil", "Telugu", "English"], payout: { country: "IN", method: "Bank transfer (NEFT/IMPS)", gst: "no" } },
  [PENDING_TUTOR_IDS[4]]: { years: "3-7", languages: ["English", "Hindi", "Kannada"], website: "https://example.com/dev-makes-ads", payout: { country: "AE", method: "Bank transfer" } },
  [PENDING_TUTOR_IDS[5]]: { years: "1-3", languages: ["English", "Hindi"], payout: { country: "IN", method: "UPI", gst: "yes", gstin: "27AAPFU0939F1ZV" } },
  [DEMO_TUTOR_ID]: { years: "7+", languages: ["English", "Hindi", "Kannada"], website: "https://example.com/arjun-rao-films", payout: { country: "IN", method: "Bank transfer (NEFT/IMPS)", gst: "yes", gstin: "29AAKCA2291M1Z4" } },
  u_s052: { years: "1-3", languages: ["English"], payout: { country: "IN", method: "UPI", gst: "no" } },
  u_s058: { years: "3-7", languages: ["Hindi"], website: "https://example.com/trisha-weddings", payout: { country: "IN", method: "UPI", gst: "unsure" } },
};
export const TUTOR_APPLICATIONS: TutorApplication[] = APPS.map((a, i) => {
  const p = USERS.find((x) => x.id === a.userId);
  const courseOutline = APP_OUTLINES[a.userId];
  return { id: `app_${i + 1}`, name: p?.name ?? "Applicant", email: p?.email ?? "", city: p?.city ?? "", ...a, ...APP_EXTRAS[a.userId], ...(courseOutline ? { courseOutline } : {}) };
});

/* ============================================================================= payouts */
/* A tutor's month = the sum of their courses' sales in the sales ledger (sales.ts),
   so payouts, tutor analytics, per-course revenue and the platform revenue series
   (admin) all tell one story:
     gross = units x price x COUPON_FACTOR / 1.18 (ex-GST), net = gross x revenueShare.
   One row per month since the tutor's first sale. October (the open month) is
   "scheduled" and holds the FULL-MONTH projection (month-to-date x 31/5; screens
   prorate it back with x 5/31). September is "processing".
   Older months are "paid" on the 10th of the following month, which is the rule
   the tutor earnings page states. */
export const PAYOUTS: Payout[] = [];
{
  const rp = rng(4242);
  const shareOf = (tutorId: string) => TUTOR_PROFILES_BASE.find((t) => t.userId === tutorId)?.revenueShare ?? 0.7;
  const rows = Object.values(COURSE_SALES);
  const tutorIds = Array.from(new Set(rows.map((x) => x.tutorId)));
  const project = (v: number) => (v * 31) / MONTH_DAYS_SO_FAR;
  for (const tutorId of tutorIds) {
    const mine = rows.filter((x) => x.tutorId === tutorId);
    const first = mine.reduce((m, x) => (x.from.slice(0, 7) < m ? x.from.slice(0, 7) : m), CURRENT_MONTH);
    for (const period of monthRange(first, CURRENT_MONTH)) {
      const open = period === CURRENT_MONTH;
      const units = mine.reduce((s, x) => s + (x.months[period] ?? 0), 0);
      const grossMtd = mine.reduce((s, x) => s + grossOf(x.price, x.months[period] ?? 0), 0);
      if (!units && !open) continue;
      const gross = Math.round(open ? project(grossMtd) : grossMtd);
      const net = Math.round(gross * shareOf(tutorId));
      const status: Payout["status"] = open ? "scheduled" : period === "2026-09" ? "processing" : "paid";
      const [y, m] = period.split("-").map(Number);
      const payDay = m === 12 ? `${y + 1}-01-10` : `${y}-${String(m + 1).padStart(2, "0")}-10`;
      PAYOUTS.push({
        id: `pay_${tutorId.slice(2)}_${period}`,
        tutorId,
        period,
        gross,
        platformFee: gross - net,
        net,
        status,
        sales: open ? Math.round(project(units)) : units,
        paidAt: status === "paid" ? `${payDay}T11:${String(rp.int(0, 4) * 10).padStart(2, "0")}:00+05:30` : undefined,
        reference: status === "paid" ? `UTR${rp.int(100000000, 999999999)}` : undefined,
      });
    }
  }
}

/* ============================================================================= notifications */
/* The demo tutor's bell matches his live data: the unanswered count comes from the
   Q&A threads and the "new review" quotes his actual newest 5-star review. */
const arjunOpen = THREADS.filter((t) => !t.a && TUTOR_OF[t.course] === DEMO_TUTOR_ID);
const arjunOpenWhere = (() => {
  const byCourse = new Map<string, Set<number>>();
  for (const t of arjunOpen) {
    const set = byCourse.get(t.course) ?? new Set<number>();
    set.add(Number(t.item.split("-")[1]));
    byCourse.set(t.course, set);
  }
  const parts = [...byCourse.entries()].map(([courseId, mods]) => {
    const title = COURSES_BASE.find((c) => c.id === courseId)!.title;
    const list = [...mods].sort((a, b) => a - b);
    return `${title} (module${list.length > 1 ? "s" : ""} ${list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]})`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] ?? "your courses";
})();
const arjunReview = REVIEWS.find((x) => x.rating === 5 && TUTOR_OF[x.courseId] === DEMO_TUTOR_ID && x.userId !== DEMO_STUDENT_ID);

export const NOTIFICATIONS: Notification[] = [
  { id: "ntf_p1", userId: DEMO_STUDENT_ID, kind: "question", title: "Arjun answered your question", body: "\"Move when something changes for the character…\"", href: "/learn/ai-filmmaking/af-4-2", createdAt: daysAgo(9, 11), read: true },
  { id: "ntf_p2", userId: DEMO_STUDENT_ID, kind: "course", title: "Fresh lesson in AI Filmmaking", body: "Arjun re-recorded \"Veo, Kling and Runway, side by side\" in module 5 with the latest model versions.", href: "/learn/ai-filmmaking/af-5-2", createdAt: daysAgo(1, 18), read: false },
  { id: "ntf_p3", userId: DEMO_STUDENT_ID, kind: "order", title: "You're in: AI Filmmaking", body: "Payment received. Your first lesson is waiting, and so is your 60-second short.", href: "/learn/ai-filmmaking", createdAt: priyaFilm.createdAt, read: true },
  { id: "ntf_p4", userId: DEMO_STUDENT_ID, kind: "quiz", title: "Checkpoint ahead", body: "Pass the image-to-video checkpoint to unlock module 6 of AI Filmmaking.", href: "/learn/ai-filmmaking/af-5-5", createdAt: daysAgo(0, 8), read: false },
  { id: "ntf_p5", userId: DEMO_STUDENT_ID, kind: "system", title: "Diwali offer starts soon", body: "DIWALI25 gives 25% off from 15 October. Tell a friend who keeps asking how you make your films.", href: "/courses/ai-filmmaking", createdAt: daysAgo(2, 10), read: true },
  { id: "ntf_a1", userId: DEMO_TUTOR_ID, kind: "question", title: `${arjunOpen.length} unanswered question${arjunOpen.length === 1 ? "" : "s"}`, body: `Learners are waiting on ${arjunOpenWhere}.`, href: "/tutor/questions", createdAt: daysAgo(0, 9), read: false },
  { id: "ntf_a2", userId: DEMO_TUTOR_ID, kind: "course", title: "AI Ads & Brand Films (bonus) is in review", body: "Our team usually replies within 3 working days.", href: "/tutor/courses", createdAt: daysAgo(2, 18, 25), read: false },
  { id: "ntf_a3", userId: DEMO_TUTOR_ID, kind: "review", title: "New 5-star review", body: `"${arjunReview?.comment ?? "Made my first 60-second short in the capstone. My family thought I'd hired a crew."}"`, href: "/tutor/analytics", createdAt: arjunReview?.createdAt ?? daysAgo(1, 21), read: true },
  { id: "ntf_a4", userId: DEMO_TUTOR_ID, kind: "payout", title: "September payout is processing", body: "Expected in your bank account by 10 October.", href: "/tutor/earnings", createdAt: daysAgo(4, 10), read: true },
  { id: "ntf_ad1", userId: DEMO_ADMIN_ID, kind: "application", title: "6 tutor applications waiting", body: "Oldest one was submitted 6 days ago.", href: "/admin/tutors", createdAt: daysAgo(0, 9, 30), read: false },
  { id: "ntf_ad2", userId: DEMO_ADMIN_ID, kind: "course", title: "1 course awaiting review", body: "AI Ads & Brand Films (bonus).", href: "/admin/courses", createdAt: daysAgo(2, 18, 30), read: false },
  // + one "Refund requested" per open request, added at the end of the seed (refund story)
  { id: "ntf_ad4", userId: DEMO_ADMIN_ID, kind: "system", title: "DIWALI25 goes live in 10 days", body: "Check the coupon settings before it starts.", href: "/admin/coupons", createdAt: daysAgo(3, 12), read: true },
];

/* ============================================================================= reports (moderation) */
export const REPORTS: Report[] = [
  { id: "rpt_1", kind: "review", targetId: "rev_offtopic_1", courseId: FLAGSHIP, reporterId: "u_s010", reason: "Review is about a gear order, not the course", status: "open", createdAt: daysAgo(1, 13) },
  { id: "rpt_2", kind: "comment", targetId: "cmt_spam_1", courseId: FLAGSHIP, reporterId: "u_s002", reason: "Spam link in reply", status: "open", createdAt: daysAgo(0, 9) },
  { id: "rpt_3", kind: "course", targetId: FLAGSHIP, courseId: FLAGSHIP, reporterId: "u_s031", reason: "Thinks a lesson's example short uses copyrighted film music", status: "resolved", createdAt: daysAgo(17, 16) },
  { id: "rpt_4", kind: "comment", targetId: "cmt_10", courseId: FLAGSHIP, reporterId: "u_s045", reason: "Looks like an ad for a prompt pack", status: "dismissed", createdAt: daysAgo(55, 10) },
];

/* ============================================================================= the demo tutor's complete recent ledger */
/*
 * The orders table above is a browsable sample. For the demo tutor (Arjun) it is
 * made COMPLETE from LEDGER_FROM (26 Sep) to MOCK_NOW: every sale the sales ledger
 * counts for those days has an order row, so his "Recent sales" list, the October
 * figure on his earnings page and his analytics agree to the unit.
 * Buyers are existing learners who don't own the course yet, plus new learners
 * who signed up that week (LEDGER_BUYERS, ids u_n001...). Separate rng: nothing
 * else in the seed shifts.
 */
export const LEDGER_BUYERS: Profile[] = [];
{
  const rl = rng(8080);
  const NOW = new Date("2026-10-05T10:30:00+05:30").getTime();
  const DAY = 86_400_000;
  const istDate = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);
  const daysBack = (dateKey: string) => Math.round((Date.UTC(2026, 9, 5) - new Date(`${dateKey}T00:00:00Z`).getTime()) / DAY);
  // anyone who ever had the course (refunds included) is skipped: their old progress rows would clash
  const owned = new Set(ENROLLMENTS.map((e) => `${e.userId}|${e.courseId}`));
  for (const o of ORDERS) if (o.status === "pending") owned.add(`${o.userId}|${o.courseId}`);
  const usedInWindow = new Set<string>();
  const FIRST_N = ["Advait", "Mira", "Reyansh", "Kiara", "Atharv", "Navya", "Shaurya", "Prisha", "Krish", "Anvi", "Darsh", "Myra", "Arjit", "Avni", "Parth", "Ishita", "Rudra", "Tanya", "Kian", "Sana", "Veer", "Aditi", "Laksh", "Charvi", "Om", "Jiya", "Neil", "Ritika", "Hriday", "Mahika", "Samar", "Nitya", "Agastya", "Keya", "Dhruv", "Amaira", "Ekansh", "Suhani", "Vedant", "Inaya"];
  const LAST_N = ["Bose", "Kapadia", "Kamath", "Ahuja", "Rathore", "Dutta", "Sood", "Pandey", "Bhatt", "Krishnan", "Jain", "Wadhwa", "Ghosh", "Murthy", "Arora", "Prasad", "Tiwari", "Mathur", "Dsouza", "Kohli"];
  const CITIES_N = ["Bengaluru", "Pune", "Hyderabad", "Chennai", "Mumbai", "Delhi", "Kochi", "Indore", "Jaipur", "Coimbatore", "Mysuru", "Nagpur", "Kolkata", "Ahmedabad", "Lucknow"];
  const TONES_N = ["sun", "aqua", "magenta", "tangerine", "lilac", "mint", "cyan", "bubblegum", "blue", "butter"] as const;
  const newBuyer = (dateKey: string): Profile => {
    const i = LEDGER_BUYERS.length;
    const first = FIRST_N[i % FIRST_N.length];
    const last = LAST_N[(i * 7 + Math.floor(i / FIRST_N.length)) % LAST_N.length];
    const back = daysBack(dateKey) + rl.int(0, 3);
    const sameDay = back === daysBack(dateKey);
    const p: Profile = {
      id: `u_n${String(i + 1).padStart(3, "0")}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i >= FIRST_N.length ? i : ""}@${rl.pick(["gmail.com", "outlook.com", "yahoo.in", "proton.me"])}`,
      role: "student",
      tutorStatus: "none",
      status: "active",
      city: rl.pick(CITIES_N),
      tone: TONES_N[i % TONES_N.length],
      joinedAt: daysAgo(back, sameDay ? 6 : rl.int(7, 22), rl.int(0, 59)),
      lastActiveAt: daysAgo(daysBack(dateKey), 23, 0),
    };
    LEDGER_BUYERS.push(p);
    return p;
  };
  const pool = STUDENTS.filter((s) => s.id !== DEMO_STUDENT_ID && s.status === "active");
  const added: Order[] = [];
  for (const sales of Object.values(COURSE_SALES).filter((x) => x.tutorId === DEMO_TUTOR_ID)) {
    for (const [dateKey, units] of Object.entries(sales.days).sort()) {
      if (dateKey < LEDGER_FROM) continue;
      const sample = ORDERS.filter((o) => o.courseId === sales.courseId && o.status === "paid" && istDate(o.createdAt) === dateKey);
      // more sample rows than the ledger has sales that day: move the extras just before the window
      sample.slice(units).forEach((o, k) => {
        o.createdAt = daysAgo(daysBack(LEDGER_FROM) + 1 + k, 20, 15);
        const e = ENROLLMENTS.find((x) => x.orderId === o.id);
        if (e) e.createdAt = o.createdAt;
      });
      for (let n = sample.length; n < units; n++) {
        const candidates = pool.filter((u) => !owned.has(`${u.id}|${sales.courseId}`) && !usedInWindow.has(u.id) && istDate(u.joinedAt) < dateKey);
        const buyer = candidates.length && rl.chance(0.45) ? rl.pick(candidates) : newBuyer(dateKey);
        usedInWindow.add(buyer.id);
        owned.add(`${buyer.id}|${sales.courseId}`);
        const order = addOrder(
          { userId: buyer.id, courseId: sales.courseId, days: daysBack(dateKey), method: rl.pick(METHODS), coupon: rl.chance(0.22) ? rl.pick(["WELCOME10", "ARJUN15", "ARJUN15"]) : undefined },
          rl,
        );
        added.push(order);
      }
    }
  }
  // a little early progress for the new buyers (first videos of module 1)
  for (const o of added) {
    const e = ENROLLMENTS.find((x) => x.orderId === o.id);
    if (!e || rl.chance(0.45)) continue;
    const flat = items(o.courseId);
    const start = new Date(o.createdAt).getTime();
    let t = start;
    const k = rl.int(1, 3);
    for (let i = 0; i < flat.length && i <= k; i++) {
      const it = flat[i];
      if (it.type !== "video") break;
      t = Math.min(NOW - 5 * 60_000, t + rl.int(20, 300) * 60_000);
      const at = new Date(t + 330 * 60_000).toISOString().slice(0, 19) + "+05:30";
      const last = i === k;
      LESSON_PROGRESS.push({
        id: `lp_${it.id}_${o.userId}`,
        userId: o.userId,
        courseId: o.courseId,
        itemId: it.id,
        lastPositionSec: last ? Math.round(it.lesson.durationSec * (0.15 + rl.next() * 0.5)) : it.lesson.durationSec,
        completed: !last,
        completedAt: last ? undefined : at,
        updatedAt: at,
      });
    }
  }
  ORDERS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ORDERS.forEach((o, i) => (o.number = `TM-${24610 + (ORDERS.length - i) * 7 + (i % 5)}`));
}

/* ============================================================================= refund requests */
/* Two open refund requests, both on the flagship and both from recent buyers who bought 2 to 6 days
   before asking (inside the refund window) and never pressed play (their reasons say so). */
{
  const asked = [daysAgo(1, 14, 50), daysAgo(0, 9, 10)];
  const fits = (o: Order, at: string) => {
    const gap = (new Date(at).getTime() - new Date(o.createdAt).getTime()) / 86_400_000;
    return gap >= 2 && gap <= 6;
  };
  const started = (o: Order) => LESSON_PROGRESS.some((p) => p.userId === o.userId && p.courseId === o.courseId) || QUIZ_ATTEMPTS.some((a) => a.userId === o.userId && a.courseId === o.courseId);
  const candidates = ORDERS.filter(
    (o) =>
      o.courseId === FLAGSHIP &&
      o.status === "paid" &&
      o.provider !== "admin" &&
      o.amount > 0 &&
      o.userId !== DEMO_STUDENT_ID &&
      !ASKERS.has(`${o.userId}|${o.courseId}`) &&
      !CERTIFICATES.some((c) => c.userId === o.userId && c.courseId === o.courseId),
  );
  const pick = (at: string, not?: Order) =>
    candidates.find((o) => o !== not && o.userId !== not?.userId && fits(o, at) && !started(o)) ?? candidates.find((o) => o !== not && o.userId !== not?.userId && fits(o, at));
  const first = pick(asked[0]);
  if (first) first.refundRequest = { reason: "My agency just enrolled the whole team in an in-house AI video workshop, so I won't need this. Haven't started it.", requestedAt: asked[0] };
  // the reason is written by the refund story below, from this learner's own orders
  const second = pick(asked[1], first);
  if (second) second.refundRequest = { reason: "", requestedAt: asked[1] };
  // anyone who asks hasn't really started: drop the odd early-progress row the ledger pass gave them
  for (const o of [first, second]) {
    if (!o) continue;
    for (let i = LESSON_PROGRESS.length - 1; i >= 0; i--) if (LESSON_PROGRESS[i].userId === o.userId && LESSON_PROGRESS[i].courseId === o.courseId) LESSON_PROGRESS.splice(i, 1);
  }
}

/* ============================================================================= coupon coherence */
/* WELCOME10 is first-purchase only (Coupon.firstPurchaseOnly). The generators above hand it out at
   random, so a returning buyer's WELCOME10 order is relabelled INBOX10: the same 10% site-wide, so the
   discount, amount and every revenue figure stay exactly as generated. */
{
  const firstOnly = new Set(COUPONS.filter((c) => c.firstPurchaseOnly).map((c) => c.code));
  const sameDeal = COUPONS.find((c) => c.code === "INBOX10")!;
  const byUser = new Map<string, Order[]>();
  for (const o of ORDERS) byUser.set(o.userId, [...(byUser.get(o.userId) ?? []), o]);
  for (const list of byUser.values()) {
    let bought = false;
    for (const o of [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (o.couponCode && firstOnly.has(o.couponCode) && bought) o.couponCode = sameDeal.code;
      if ((o.status === "paid" || o.status === "refunded") && o.amount > 0) bought = true;
    }
  }
}

/* ============================================================================= refund story */
/* Runs last, when orders, owners and numbers are final. Each open refund request
   gets a reason that matches the learner's own orders (no "charged twice" without
   a second charge) and its own admin notification, so the bell, the refund queue
   and the sidebar badge always tell the same story. */
{
  const titleOf = (id: string) => COURSES_BASE.find((c) => c.id === id)?.title ?? "this course";
  const open = ORDERS.filter((o) => o.status === "paid" && o.refundRequest).sort((a, b) => a.refundRequest!.requestedAt.localeCompare(b.refundRequest!.requestedAt));
  open.forEach((o, i) => {
    const req = o.refundRequest!;
    if (!req.reason) {
      // a second course bought within a few hours: "meant to buy only the other one"
      const at = new Date(o.createdAt).getTime();
      const sibling = ORDERS.find((x) => x !== o && x.userId === o.userId && x.status === "paid" && x.amount > 0 && Math.abs(new Date(x.createdAt).getTime() - at) < 3 * 3_600_000);
      const late = Number(new Date(at + 330 * 60_000).toISOString().slice(11, 13)) < 6;
      req.reason = sibling
        ? `I only meant to buy ${titleOf(sibling.courseId)}${late ? " last night" : ""} and ended up getting this one too. Haven't opened it yet.`
        : "Bought this by mistake and haven't opened it yet. Could you refund it, please?";
    }
    // same wording as demo.requestRefund(), so seeded and demo-made requests read alike
    const who = [...STUDENTS, ...LEDGER_BUYERS].find((u) => u.id === o.userId)?.name ?? "A learner";
    NOTIFICATIONS.push({
      id: i === 0 ? "ntf_ad3" : `ntf_ad_rf${i + 1}`,
      userId: DEMO_ADMIN_ID,
      kind: "order",
      title: "Refund requested",
      body: `${who} asked for a refund on ${o.number} (${titleOf(o.courseId)}).`,
      href: "/admin/orders",
      createdAt: toIST(new Date(new Date(req.requestedAt).getTime() + 2 * 60_000)),
      read: false,
    });
  });
}

/* ============================================================================= wishlist (filled last) */
/* Learners who never bought (or were refunded from) a published course, saving it for later. Runs after
   the ledger and refund passes, so nobody wishlists a course they own. Separate rng: nothing else shifts. */
{
  const rw = rng(9091);
  const touched = new Set([...ENROLLMENTS.map((e) => `${e.userId}|${e.courseId}`), ...ORDERS.filter((o) => o.status === "pending").map((o) => `${o.userId}|${o.courseId}`)]);
  for (const c of published) {
    const pubAge = c.publishedAt ? ageDays(c.publishedAt) - 1 : 120;
    const fans = rw.shuffle(STUDENTS.filter((u) => u.id !== DEMO_STUDENT_ID && u.status === "active" && !touched.has(`${u.id}|${c.id}`))).slice(0, 24);
    fans.forEach((u) => {
      WISHLIST.push({ id: `wl_${WISHLIST.length + 1}`, userId: u.id, courseId: c.id, createdAt: daysAgo(rw.int(1, Math.min(120, pubAge)), rw.int(9, 23), rw.int(0, 59)) });
    });
  }
  WISHLIST.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
