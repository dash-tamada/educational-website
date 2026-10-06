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
import { COURSES_BASE, CURRICULA, courseBySlug } from "./catalog";
import { DEMO_ADMIN_ID, DEMO_STUDENT_ID, DEMO_TUTOR_ID, PENDING_TUTOR_IDS, STUDENTS, TUTOR_PROFILES_BASE } from "./people";
import { COURSE_SALES, CURRENT_MONTH, LEDGER_FROM, MONTH_DAYS_SO_FAR, grossOf, monthRange } from "./sales";
import { PLAYER_THREADS } from "./qa-player";
import { daysAgo, rng, toIST } from "./util";

const r = rng(7741);
const others = STUDENTS.filter((s) => s.id !== DEMO_STUDENT_ID);
const published = COURSES_BASE.filter((c) => c.status === "published");
const sellable = COURSES_BASE.filter((c) => c.status === "published" || c.status === "archived");

const items = (courseId: string) => CURRICULA[courseId].flatMap((m) => m.items);

/* ============================================================================= coupons */
export const COUPONS: Coupon[] = [
  { id: "cpn_welcome", code: "WELCOME10", description: "10% off your first course", kind: "percent", value: 10, courseIds: null, firstPurchaseOnly: true, maxRedemptions: 5000, redemptions: 1284, startsAt: daysAgo(365), endsAt: daysAgo(-180), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_inbox", code: "INBOX10", description: "Newsletter readers: 10% off any course", kind: "percent", value: 10, courseIds: null, maxRedemptions: 3000, redemptions: 642, startsAt: daysAgo(420), endsAt: daysAgo(-90), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_diwali", code: "DIWALI25", description: "Festive offer: 25% off everything", kind: "percent", value: 25, courseIds: null, maxRedemptions: 2000, redemptions: 0, startsAt: daysAgo(-10), endsAt: daysAgo(-25), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_arjun", code: "ARJUN15", description: "Arjun's community code for his coding courses", kind: "percent", value: 15, courseIds: ["crs_webdev", "crs_python"], maxRedemptions: 500, redemptions: 212, startsAt: daysAgo(200), endsAt: daysAgo(-60), active: true, createdBy: DEMO_TUTOR_ID },
  { id: "cpn_flat200", code: "FLAT200", description: "₹200 off any course of ₹999 or more", kind: "flat", value: 200, courseIds: null, minAmount: 999, maxRedemptions: 1000, redemptions: 431, startsAt: daysAgo(120), endsAt: daysAgo(-30), active: true, createdBy: DEMO_ADMIN_ID },
  { id: "cpn_exam", code: "BOARDS20", description: "Board-exam season: 20% off exam prep", kind: "percent", value: 20, courseIds: ["crs_chem", "crs_jee"], maxRedemptions: 800, redemptions: 800, startsAt: daysAgo(240), endsAt: daysAgo(170), active: false, createdBy: DEMO_ADMIN_ID },
];

/* ============================================================================= lesson Q&A threads (data) */
/* Declared up here so the learners who asked can be enrolled (and have progress) below. */
type Thread = { course: string; item: string; user: string; days: number; q: string; a?: string; aDays?: number; likes?: number };
const THREADS: Thread[] = [
  { course: "crs_webdev", item: "wd-1-1", user: "u_s003", days: 40, q: "Is a domain name the same thing as a website? I keep mixing these up.", a: "Great question! The domain is the address (like a house number), the website is the house. You can move a site to a new address any time.", aDays: 39, likes: 12 },
  { course: "crs_webdev", item: "wd-1-2", user: "u_s015", days: 31, q: "Live Server extension isn't opening my page in the browser. I'm on Windows 11.", a: "Right-click index.html and choose 'Open with Live Server'. If nothing happens, check that the folder (not just the file) is open in VS Code.", aDays: 31, likes: 7 },
  { course: "crs_webdev", item: "wd-2-2", user: DEMO_STUDENT_ID, days: 33, q: "When should I use gap vs margin between flex items?", a: "Use gap almost always: it only adds space between items, never on the outer edges. Margin is for spacing an element from things outside the flex container.", aDays: 32, likes: 9 },
  { course: "crs_webdev", item: "wd-2-3", user: "u_s021", days: 20, q: "Can grid and flexbox be used on the same page?", a: "Absolutely. Grid for the page layout, flexbox for the small rows inside it is a classic combo.", aDays: 19, likes: 15 },
  { course: "crs_webdev", item: "wd-4-2", user: "u_s030", days: 2, q: "What's the difference between a function declaration and an arrow function? Does it matter for beginners?", likes: 3 },
  { course: "crs_webdev", item: "wd-4-3", user: "u_s044", days: 1, q: "My for loop prints undefined at the end of the list. What am I doing wrong?", likes: 1 },
  { course: "crs_webdev", item: "wd-5-3", user: "u_s012", days: 0, q: "How do I save the to-do list so it stays after I refresh the page?", likes: 4 },
  { course: "crs_python", item: "py-2-2", user: "u_s009", days: 14, q: "read_csv gives me a UnicodeDecodeError on the rainfall file.", a: "Try pd.read_csv(path, encoding='latin-1'). Some government CSVs aren't saved as UTF-8.", aDays: 13, likes: 11 },
  { course: "crs_python", item: "py-2-3", user: "u_s036", days: 3, q: "Is pivot_table just groupby with extra steps?", likes: 2 },
  { course: "crs_money", item: "mn-3-2", user: "u_s018", days: 60, q: "Is it better to do one big SIP or split across three funds?", a: "For most beginners one or two diversified index funds is plenty. More funds often means more overlap, not more safety.", aDays: 58, likes: 19 },
  { course: "crs_money", item: "mn-4-2", user: "u_s026", days: 22, q: "I'm a freelancer. Does the new regime still make sense for me?", a: "Often yes, but it depends on your deductions. Run both calculations with the sheet from module 1 and pick the lower tax.", aDays: 21, likes: 8 },
  { course: "crs_guitar", item: "gt-1-3", user: "u_s040", days: 6, q: "My G chord buzzes on the high E string. Any tips?", a: "Arch your ring finger more and press right behind the fret. Buzzing is normal for the first week!", aDays: 5, likes: 6 },
  { course: "crs_guitar", item: "gt-2-2", user: "u_s047", days: 4, q: "How fast should I be strumming before moving on?", a: "Comfortable at 70 bpm with no stops. Speed comes later.", aDays: 4, likes: 5 },
  { course: "crs_chem", item: "ch-3-3", user: "u_s005", days: 12, q: "How do I quickly decide the limiting reagent in MCQs?", a: "Divide moles of each reactant by its coefficient. The smallest number is your limiting reagent. Takes 10 seconds.", aDays: 12, likes: 24 },
  { course: "crs_chem", item: "ch-5-2", user: "u_s028", days: 5, q: "Why doesn't adding water change the pH of a buffer much?", likes: 3 },
  { course: "crs_photo", item: "ph-2-3", user: "u_s016", days: 18, q: "North-facing or east-facing window for portraits?", a: "North-facing gives soft, even light all day. East is gorgeous in the morning only.", aDays: 17, likes: 10 },
  { course: "crs_excel", item: "xl-2-2", user: "u_s034", days: 9, q: "XLOOKUP isn't available in my office's Excel 2016. Alternative?", a: "INDEX + MATCH does the same job in older versions. I've added a bonus video on it to this module.", aDays: 8, likes: 13 },
  { course: "crs_english", item: "en-4-1", user: "u_s020", days: 7, q: "How long should my 'tell me about yourself' answer be?", a: "Aim for 60 to 90 seconds. Practise with a timer.", aDays: 7, likes: 9 },
  { course: "crs_kitchen", item: "sk-2-2", user: "u_s038", days: 11, q: "Batter didn't rise in Shimla winters even after 18 hours. Help!", a: "Keep it in the oven with only the light on, and add a pinch of methi seeds while grinding. Should work within 12 hours.", aDays: 10, likes: 7 },
  { course: "crs_jee", item: "jp-2-2", user: "u_s042", days: 3, q: "When friction is static, how do I know its direction?", likes: 2 },
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

/* Priya's purchases (the demo student). */
const priyaWeb = addOrder({ userId: DEMO_STUDENT_ID, courseId: "crs_webdev", days: 46, method: "UPI", coupon: "ARJUN15" });
const priyaColour = addOrder({ userId: DEMO_STUDENT_ID, courseId: "crs_colour", days: 162, method: "Card" });
const priyaMoney = addOrder({ userId: DEMO_STUDENT_ID, courseId: "crs_money", days: 205, method: "UPI", coupon: "WELCOME10" });
const priyaGuitar = addOrder({ userId: DEMO_STUDENT_ID, courseId: "crs_guitar", days: 12, method: "UPI" });
addOrder({ userId: DEMO_STUDENT_ID, courseId: "crs_python", days: 5, grant: true });
void priyaWeb;
void priyaGuitar;

/* ~120 orders spread over 12 months, growing towards the present. */
const weightByCourse = sellable.map((c) => (c.status === "archived" ? 2 : Math.max(3, Math.round(c.learners / 400))));
for (let i = 0; i < 116; i++) {
  // month 0 (Oct) .. 11 (Nov last year); more recent months are busier
  const month = r.weighted([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [6, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
  const days = month === 0 ? r.int(0, 4) : month * 30 + r.int(-12, 12) - 5;
  let course = r.weighted(sellable, weightByCourse);
  const pub = course.publishedAt ? Math.round((new Date("2026-10-05").getTime() - new Date(course.publishedAt).getTime()) / 86_400_000) : 0;
  if (course.status === "archived" && days < 50) course = r.pick(published);
  if (pub && days > pub) course = courseBySlug("excel-for-work");
  const roll = r.next();
  const status: Order["status"] = roll < 0.05 ? "refunded" : roll < 0.08 ? "failed" : roll < 0.1 && days < 6 ? "pending" : "paid";
  const coupon = r.chance(0.28) ? r.pick(["WELCOME10", "FLAT200", "ARJUN15", "BOARDS20"]) : undefined;
  addOrder({
    userId: r.pick(others).id,
    courseId: course.id,
    days: Math.max(0, days),
    status,
    coupon,
    refundReason: r.pick(["Bought the wrong course", "Duplicate payment", "Course level too advanced", "Accidental purchase by family member"]),
  });
}
/* A couple of admin grants (scholarships / support). */
addOrder({ userId: "u_s007", courseId: "crs_chem", days: 33, grant: true });
addOrder({ userId: "u_s023", courseId: "crs_english", days: 71, grant: true });
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
    addOrder({ userId: t.user, courseId: t.course, days: Math.min(Math.max(t.days + 2, pubDays - 1), t.days + rq.int(9, 30)), coupon: rq.chance(0.25) ? "WELCOME10" : undefined }, rq);
  }
}
ORDERS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
/* Human order numbers follow time (oldest = lowest). */
ORDERS.forEach((o, i) => (o.number = `TM-${24610 + (ORDERS.length - i) * 7 + (i % 5)}`));
/* Two open refund requests for the admin queue. */
{
  const chem = ORDERS.find((o) => o.courseId === "crs_chem" && o.status === "paid" && o.provider !== "admin" && !ASKERS.has(`${o.userId}|${o.courseId}`));
  if (chem) chem.refundRequest = { reason: "Already covered in my coaching classes, bought by mistake.", requestedAt: daysAgo(1, 14, 50) };
  const other = ORDERS.find((o) => o.status === "paid" && o.provider !== "admin" && o.courseId !== "crs_chem" && o.userId !== DEMO_STUDENT_ID && !ASKERS.has(`${o.userId}|${o.courseId}`));
  // the reason is written at the end of the seed, once this learner's final orders are known
  if (other) other.refundRequest = { reason: "", requestedAt: daysAgo(0, 9, 10) };
}

/* Completion for Priya's finished courses. */
for (const e of ENROLLMENTS) {
  if (e.userId !== DEMO_STUDENT_ID) continue;
  if (e.orderId === priyaColour.id) e.completedAt = daysAgo(112, 22, 10);
  if (e.orderId === priyaMoney.id) e.completedAt = daysAgo(151, 21, 30);
}

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

/* Web Dev From Zero: modules 1-3 done, module 4 halfway (current lesson wd-4-2 at 7:40). */
{
  const course = "crs_webdev";
  const all = items(course);
  let d = 44;
  for (const it of all) {
    const [, m, i] = it.id.split("-").map(Number);
    if (m > 4 || (m === 4 && i >= 2)) break;
    if (it.type === "quiz") continue;
    complete(course, it.id, Math.max(2, d), it.type === "video" ? it.lesson.durationSec : 0);
    d -= 3;
  }
  // the last few sessions were recent: a 5-day streak (days 0-4, guitar on day 3)
  for (const [itemId, days] of [["wd-3-3", 4], ["wd-3-4", 2], ["wd-4-1", 1]] as const) {
    const p = LESSON_PROGRESS.find((x) => x.itemId === itemId);
    if (p) p.completedAt = p.updatedAt = daysAgo(days, 21, 20);
  }
  attempt(course, "wd-1-5", 38, 50, 70, [0, 1]);
  attempt(course, "wd-1-5", 37, 75, 70, [0, 1, 3]);
  attempt(course, "wd-2-4", 24, 100, 60);
  LESSON_PROGRESS.push({
    id: `lp_wd-4-2_${DEMO_STUDENT_ID}`,
    userId: DEMO_STUDENT_ID,
    courseId: course,
    itemId: "wd-4-2",
    lastPositionSec: 460,
    completed: false,
    updatedAt: daysAgo(0, 8, 40),
  });
}
/* Guitar: two videos done, third in progress. */
complete("crs_guitar", "gt-1-1", 10, 470);
complete("crs_guitar", "gt-1-2", 9, 550);
LESSON_PROGRESS.push({ id: `lp_gt-1-3_${DEMO_STUDENT_ID}`, userId: DEMO_STUDENT_ID, courseId: "crs_guitar", itemId: "gt-1-3", lastPositionSec: 250, completed: false, updatedAt: daysAgo(3, 20, 5) });
/* Colour + Money: everything finished, every quiz passed. */
for (const [course, start] of [["crs_colour", 158], ["crs_money", 200]] as const) {
  let d = start;
  for (const it of items(course)) {
    if (it.type === "quiz") attempt(course, it.id, d, 100, it.quiz.passPercentage);
    else complete(course, it.id, d, it.type === "video" ? it.lesson.durationSec : 0);
    d -= course === "crs_colour" ? 3 : 3;
  }
}

export const NOTES: Note[] = [
  { id: "note_1", userId: DEMO_STUDENT_ID, courseId: "crs_webdev", itemId: "wd-2-1", atSec: 312, text: "Padding is INSIDE the border, margin is outside. Draw the box if confused.", createdAt: daysAgo(36, 21, 40) },
  { id: "note_2", userId: DEMO_STUDENT_ID, courseId: "crs_webdev", itemId: "wd-2-2", atSec: 645, text: "justify-content = main axis, align-items = cross axis. flex-direction flips them!", createdAt: daysAgo(33, 22, 5) },
  { id: "note_3", userId: DEMO_STUDENT_ID, courseId: "crs_webdev", itemId: "wd-3-2", atSec: 420, text: "clamp(min, preferred, max) for font sizes. Try clamp(1rem, 2.5vw, 1.5rem).", createdAt: daysAgo(19, 21, 0) },
  { id: "note_4", userId: DEMO_STUDENT_ID, courseId: "crs_webdev", itemId: "wd-4-2", atSec: 380, text: "Functions should do ONE thing. Name them with a verb: getTotal, showMenu.", createdAt: daysAgo(0, 8, 35) },
  { id: "note_5", userId: DEMO_STUDENT_ID, courseId: "crs_money", itemId: "mn-3-2", atSec: 505, text: "Starting at 24 vs 34 with ₹2,000/month: almost 2.5x the corpus at 60. Start the SIP now.", createdAt: daysAgo(180, 22, 30) },
];

/* ============================================================================= reviews */
/* Ratings, reviewers, dates and helpful votes come from the shared rng `r` (keep its call order: every section
   below draws from the same stream). The words are assigned afterwards, without `r`, so each course reads like
   its own learners wrote it:
   - comments come from that course's own pool (web vs Python, chemistry vs JEE physics never share lines),
     topped up with general lines that fit any course; nothing repeats inside one tutor's courses;
   - 3 stars and below get honest, critical comments; about half the 4-star reviews get a mild "good, but";
     5-star reviews never carry a complaint;
   - titles come from the rating bucket, and a tutor reply always matches the review it answers. */
const COURSE_LINES: Record<string, string[]> = {
  crs_webdev: [
    "I shipped my first portfolio site. Recruiters actually opened it!",
    "Finally understand Flexbox. The diagrams are gold.",
    "The to-do list project tied everything together nicely.",
    "Debugging tips in the JavaScript module saved me hours.",
    "The way JavaScript is introduced, one tiny program at a time, is perfect.",
    "Mobile-first finally makes sense. My site looks right on my phone now.",
    "Deployed my site for free in module 6 and sent the link to my whole family.",
    "The box model lesson explained why my layouts kept jumping.",
    "Arjun answers like a senior dev who actually wants you to get it.",
    "The checkpoint tests caught every gap in my understanding. Annoying, but right.",
    "Clear explanations of the boring setup stuff everyone else skips.",
    "Grid for real layouts was the lesson I didn't know I needed.",
    "I had given up on two bootcamp trials. This one I finished.",
    "Git in 15 minutes sounded impossible. It took me 20, and I get it now.",
  ],
  crs_python: [
    "pandas finally makes sense. I cleaned our office sales sheet in ten minutes.",
    "The IPL project was the first time data felt fun.",
    "Cleaning messy CSVs is half my job now, and this lesson nailed it.",
    "Group by and pivot explained with cricket data. Perfect for my brain.",
    "Went from copy-pasting code to understanding what each line does.",
    "The choosing-the-right-chart lesson made my reports so much clearer.",
    "Loved that every lesson ends with a notebook you can run yourself.",
    "No stats degree needed, exactly as promised.",
    "Seaborn in one lesson. My manager thinks I took a month-long course.",
    "The practice datasets (UPI, rainfall, IPL) are such a good touch.",
  ],
  crs_colour: [
    "I now explain my colour choices to clients instead of guessing.",
    "The chai stall rebrand case study was brilliant.",
    "The contrast module should be mandatory for every designer.",
    "My client decks look calmer and more expensive now.",
    "The palette exercises are addictive. I do one every morning.",
    "The 60-30-10 rule fixed my posters overnight.",
    "Loved the lesson on colour in Indian design traditions. Examples that finally feel like home.",
    "I redid my portfolio colours after module 2. Got two replies the next week.",
    "The 50 ready palettes file lives pinned in my Figma now.",
    "Designing for colour blindness opened my eyes, literally.",
  ],
  crs_guitar: [
    "Played my first full song on day 19. My family was shocked.",
    "The chord switching drill is magic. Fingers finally listen.",
    "Kabir is strict in the best way. The practice tracker kept me going.",
    "The D DU UDU pattern unlocked half the songs I wanted to play.",
    "My fingertips hurt and I am still smiling.",
    "The F chord cheat saved my motivation in week three.",
    "Short daily drills that fit between college and tuition.",
  ],
  crs_money: [
    "Started my first SIP after module 3. No more money anxiety.",
    "The tax slab lesson explained more than my CA did.",
    "Shared the budget sheet with my whole family WhatsApp group.",
    "Explained insurance without trying to sell me anything. Rare.",
    "My parents watched the tax lessons with me. Big family win.",
    "The emergency fund lesson alone was worth the price.",
    "I track every rupee now and it does not feel like a chore.",
    "Index funds vs active funds, finally explained without jargon.",
    "The 50-30-20 budget, Indian edition, actually works on a fresher's salary.",
    "Got my first credit card after the credit score lesson, and I pay it in full every month.",
    "The compounding lesson made me start investing at 23 instead of 'someday'.",
    "Nisha never makes you feel silly for not knowing this stuff.",
  ],
  crs_photo: [
    "My Instagram grid looks intentional now. Friends keep asking for edits.",
    "The window light portraits lesson changed how I see my own home.",
    "Sana's presets are lovely, but learning to edit myself was the real win.",
    "My food photos finally look like the food tastes.",
    "The composition drills made my travel photos so much better.",
    "Learnt more about light in a week than in two years of scrolling.",
    "Editing lessons are calm and clear. No preset upselling.",
    "Harsh noon sun used to ruin my photos. Not any more.",
    "Leading lines in old city streets: I spent a whole Sunday in Chandni Chowk practising.",
    "The five-slider edit is now my default. Takes a minute per photo.",
    "Shooting people without making it weird was surprisingly helpful.",
    "Made a twelve-frame photo essay of my nani's kitchen. Proudest thing I've made.",
  ],
  crs_chem: [
    "Mole concept finally makes sense. Scored 92 in my unit test.",
    "The visual explanations are perfect for board revision.",
    "The previous-year JEE questions at the end were excellent practice.",
    "Vikram sir explains the why, not just the formula.",
    "IUPAC naming finally feels logical instead of memorised.",
    "The tests after each topic feel exactly like exam questions.",
    "My coaching notes make more sense after these visuals.",
    "Equilibrium chapter in one evening. Did not think that was possible.",
    "Doubts under each lesson get answered properly, with diagrams.",
    "VSEPR with clay balls! I'll never forget those shapes now.",
    "Atomic structure as a stadium is the best analogy I've ever heard.",
    "Limiting reagent problems take me 30 seconds now.",
    "Enthalpy as a bank account. Thermodynamics stopped scaring me.",
    "Great for droppers who need a fresh way to see old topics.",
    "pH and buffers finally clicked thanks to the seesaw picture.",
  ],
  crs_jee: [
    "Projectile motion was my weakest chapter. Not any more.",
    "The animations make Newton's laws feel obvious.",
    "Short videos are perfect for revision between mock tests.",
    "Free-body diagram drills improved my accuracy a lot.",
    "Scored my best ever in the last mock. This course helped.",
    "Friction problems that trap toppers trapped me too, until this lesson.",
    "Reading motion graphs in seconds is not an exaggeration.",
    "Rolling motion explained so cleanly. My coaching notes never managed that.",
    "The relative motion tricks save me minutes in every mock.",
    "The previous-year problems with full solutions are gold.",
    "Moment of inertia without tears. Accurate title.",
  ],
  crs_podcast: [
    "Recorded my first episode in a cupboard. It sounds great!",
    "Launched with three episodes, just like Rhea suggested.",
    "The mic placement trick alone fixed my echo.",
    "Practical tips on editing fast, so you actually publish every week.",
    "The cover art and show notes lessons were a nice surprise.",
    "Got my first 100 listeners in five weeks with the launch plan.",
  ],
  crs_excel: [
    "XLOOKUP and pivots save me an hour every Monday.",
    "My manager now asks me to build the team dashboards.",
    "Best Excel course for office work, full stop.",
    "Finally understand pivot tables well enough to teach my team.",
    "The keyboard shortcuts sheet is taped to my monitor.",
    "SUMIFS finally makes sense. Month-end reports take half the time.",
    "Real office examples, not textbook nonsense.",
    "Built a sales dashboard my boss now opens every Monday.",
    "Short, focused lessons I could watch at lunch.",
    "Absolute vs relative references: the dollar signs make sense at last.",
    "Slicers made our weekly sales review so much quicker.",
    "Went from 'kind of good at Excel' to the actual Excel person in my office.",
    "Charts your manager will actually read: accurate. Mine reads them now.",
    "The practice workbook is full of realistic, messy data. Loved it.",
    "IF, AND, OR with real reports instead of toy examples. Big difference.",
  ],
  crs_tally: [
    "Our month-end closing is faster because of the GST lessons.",
    "Set up my dad's shop in TallyPrime over one weekend.",
    "Voucher entries finally make sense. The practice set is excellent.",
    "GSTR-1 basics explained better than my accountant's office ever did.",
    "Ledgers and groups explained simply. Very easy to follow.",
    "HSN codes used to confuse me completely. Not any more.",
    "Short and practical. Exactly what a small business owner needs.",
  ],
  crs_english: [
    "I stopped translating in my head. Interviews feel so much easier.",
    "The 2-minute daily habit is simple and it works.",
    "I spoke up in a meeting for the first time in months.",
    "The mirror practice sounded silly but it works.",
    "My interview answers feel natural now, not memorised.",
    "Gentle teaching. I never felt judged for my mistakes.",
    "'Tell me about yourself' used to freeze me. I cracked my campus interview.",
    "The disagreeing politely lesson is gold for client calls.",
    "Small talk that doesn't feel small: I actually enjoy team lunches now.",
    "Stress and pauses made my presentations so much clearer.",
    "Tara's 30-day prompts kept me speaking every single day.",
    "Phone calls used to make me sweat. Now I volunteer for them.",
    "The pronunciation lessons are about being understood, not faking an accent. Loved that.",
  ],
  crs_kitchen: [
    "My dosas are finally crispy. Amma approved!",
    "The cold-weather fermentation tips worked in a Delhi winter.",
    "My sambar tastes like my grandmother's now. Almost.",
    "Saved my weeknights in the hostel. One batter, five dinners.",
    "Clear measurements, no 'add as required' confusion.",
    "My flatmates now request the coconut chutney every Sunday.",
    "Tempering done right changed every dal I make.",
    "Rasam in 20 minutes is now a weekly ritual in our house.",
    "Made gunpowder podi in my Bengaluru flat. My Tamil neighbour asked for the recipe.",
    "Lakshmi teaches like family. Patient and precise.",
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
const WORK_CATEGORIES = new Set(["cat_coding", "cat_business", "cat_languages", "cat_design", "cat_life"]);
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
  crs_excel: [
    { text: "Good for beginners, but I wanted Power Query and macros too. Felt too basic for me.", reply: "Thanks for the honest review. An advanced course with Power Query is in the works." },
    { text: "I'm on Excel 2016 at the office, so the XLOOKUP lessons were not much use to me.", reply: "Sorry about that! There's now a bonus video on INDEX + MATCH for older versions in module 2." },
    { text: "The dashboard module is great, but the first two modules move very slowly.", reply: "Fair point. I've added chapter markers so you can skip ahead through the basics." },
  ],
  crs_photo: [
    { text: "Nice lessons, but almost everything assumes an iPhone. The Android steps were thin.", reply: "Fair point. I've added Android walkthroughs to the settings and editing lessons." },
  ],
  crs_colour: [
    { text: "Lovely theory, but I wanted more hands-on critique of my own palettes.", reply: "Thank you for this. Monthly palette critiques in the Q&A start next month." },
  ],
  crs_python: [
    { text: "Good intro, but the jump from loops to pandas felt sudden for a complete beginner.", reply: "Thanks for telling me. I've added a bridge lesson on lists and dicts before pandas." },
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
  "Thank you so much! Post your progress in the Q&A, I'd love to see it.",
  "This made my day. Keep practising, the next module gets even more fun.",
  "So glad it helped. A part two is in the works!",
  "Love hearing this. Thank you for taking the time to write it.",
  "That's exactly why I made this course. Proud of you!",
  "Thanks! Don't skip the practice files, that's where it really sticks.",
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
REVIEWS.push(
  { id: "rev_priya_colour", userId: DEMO_STUDENT_ID, courseId: "crs_colour", rating: 5, title: "Changed how I see colour", comment: "I'm learning to code, but this made my side projects look ten times better. The contrast module is excellent.", createdAt: daysAgo(110, 22), helpful: 14, reply: { body: "Priya, this is lovely. Code + colour is a superpower combination!", createdAt: daysAgo(109, 11) } },
  { id: "rev_priya_money", userId: DEMO_STUDENT_ID, courseId: "crs_money", rating: 5, title: "Money anxiety: gone", comment: "Set up my emergency fund and first SIP while doing the course. Nisha explains things so calmly.", createdAt: daysAgo(150, 21), helpful: 22 },
);
/* A review posted on the wrong course (it describes South Indian Kitchen): the target of report rpt_1. */
REVIEWS.push({
  id: "rev_photo_offtopic",
  userId: "u_s037",
  courseId: "crs_photo",
  rating: 4,
  title: "Tasty stuff",
  comment: "My sambar finally tastes like amma's, and the overnight dosa batter tip saved my Sunday. The tadka module alone is worth it.",
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
    addOrder({ userId, courseId: rev.courseId, days, coupon: rv.chance(0.25) ? rv.pick(["WELCOME10", "FLAT200"]) : undefined }, rv);
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
export const WISHLIST: WishlistItem[] = [
  ...["crs_photo", "crs_chem", "crs_podcast", "crs_english"].map((courseId, i) => ({
    id: `wl_priya_${i + 1}`,
    userId: DEMO_STUDENT_ID,
    courseId,
    createdAt: daysAgo(3 + i * 6, 23, 10),
  })),
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `wl_${i + 1}`,
    userId: r.pick(others).id,
    courseId: r.pick(published).id,
    createdAt: daysAgo(r.int(1, 120)),
  })),
];

/* ============================================================================= certificates */
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () => `TM-${Array.from({ length: 4 }, () => ALPHA[r.int(0, ALPHA.length - 1)]).join("")}-${Array.from({ length: 4 }, () => ALPHA[r.int(0, ALPHA.length - 1)]).join("")}`;
const hours = (courseId: string) =>
  Math.max(1, Math.round(items(courseId).reduce((s, it) => s + (it.type === "video" ? it.lesson.durationSec : 0), 0) / 3600));

export const CERTIFICATES: Certificate[] = [
  { id: "cert_priya_colour", code: "TM-7QK4-M2XD", userId: DEMO_STUDENT_ID, courseId: "crs_colour", issuedAt: daysAgo(112, 22, 12), hours: hours("crs_colour") },
  { id: "cert_priya_money", code: "TM-3HNP-8RVA", userId: DEMO_STUDENT_ID, courseId: "crs_money", issuedAt: daysAgo(151, 21, 32), hours: hours("crs_money") },
  ...Array.from({ length: 14 }, (_, i) => {
    const e = ENROLLMENTS.filter((x) => x.userId !== DEMO_STUDENT_ID && !x.revokedAt)[i * 3 + 1];
    return {
      id: `cert_${i + 1}`,
      code: code(),
      userId: e.userId,
      courseId: e.courseId,
      issuedAt: daysAgo(Math.max(1, Math.round((new Date("2026-10-05").getTime() - new Date(e.createdAt).getTime()) / 86_400_000) - r.int(5, 20)), 20),
      hours: hours(e.courseId),
    };
  }),
];

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
  courseId: "crs_webdev",
  itemId: "wd-1-1",
  userId: "u_s049",
  body: "Get every course 90% off at cheap-courses dot xyz!! DM me on Telegram for the link, limited slots.",
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
  { userId: PENDING_TUTOR_IDS[0], subject: "Kathak for beginners", categoryId: "cat_music", experience: "Trained Kathak dancer for 14 years, teach weekend batches of 20 kids and adults in Kolkata.", sampleUrl: "https://example.com/samples/kathak-tatkar-intro", why: "Most online dance classes skip the basics. I want to teach footwork and expressions properly, step by step.", plannedCourse: "Kathak Foundations: Tatkar to Your First Piece", status: "pending", submittedAt: daysAgo(1, 19, 20) },
  { userId: PENDING_TUTOR_IDS[1], subject: "Data structures for interviews", categoryId: "cat_coding", experience: "SDE-2 at a fintech, have taken 150+ interviews and mentor juniors on DSA.", sampleUrl: "https://example.com/samples/dsa-patterns-notes", why: "Interview prep content is either too theoretical or just memorised answers. I teach patterns.", plannedCourse: "DSA Patterns for Placements", status: "pending", submittedAt: daysAgo(2, 22, 5) },
  { userId: PENDING_TUTOR_IDS[2], subject: "Watercolour landscapes", categoryId: "cat_design", experience: "Freelance illustrator, run watercolour workshops at cafés in Lucknow.", sampleUrl: "https://example.com/samples/watercolour-sky-wash-lesson", why: "Watercolour feels scary to most people. I can make it relaxing and doable with cheap supplies.", plannedCourse: "Watercolour Weekends", status: "pending", submittedAt: daysAgo(3, 11, 40), history: [{ submittedAt: daysAgo(13, 10, 5), status: "changes_requested", decidedAt: daysAgo(10, 16, 30), decidedBy: DEMO_ADMIN_ID, decisionNote: "Your paintings are gorgeous, but a portfolio doesn't show us how you teach. Could you add a 3-minute lesson video, say a simple sky wash, and a rough outline?" }] },
  { userId: PENDING_TUTOR_IDS[3], subject: "Spoken Tamil", categoryId: "cat_languages", experience: "School teacher for 9 years, teach Tamil to colleagues who moved to Chennai.", sampleUrl: "https://example.com/samples/everyday-tamil-lesson", why: "Lots of people move to Chennai for work and struggle with everyday Tamil. I want to help them feel at home.", plannedCourse: "Everyday Tamil in 21 Days", status: "pending", submittedAt: daysAgo(4, 16, 15) },
  { userId: PENDING_TUTOR_IDS[4], subject: "Home workouts", categoryId: "cat_life", experience: "ACE-certified trainer, 6 years coaching working professionals online.", sampleUrl: "https://example.com/samples/home-strength-intro", why: "People quit gyms. Twenty-minute routines at home are what actually stick.", plannedCourse: "20-Minute Home Strength", status: "pending", submittedAt: daysAgo(5, 8, 50) },
  { userId: PENDING_TUTOR_IDS[5], subject: "UPSC essay writing", categoryId: "cat_exam", experience: "Cleared UPSC Mains twice, mentor aspirants on essay and ethics papers.", sampleUrl: "https://example.com/samples/upsc-essay-structure", why: "Essay is the most underrated paper. Structure and practice can add 20+ marks.", plannedCourse: "UPSC Essay: Structure That Scores", status: "pending", submittedAt: daysAgo(6, 21, 0) },
  { userId: "u_lakshmi", subject: "South Indian home cooking", categoryId: "cat_cooking", experience: "Recipe developer for two food brands, cooking for 20+ years.", sampleUrl: "https://example.com/samples/lakshmi-kitchen", why: "I want young people living alone to cook food that tastes like home.", plannedCourse: "South Indian Kitchen", status: "approved", submittedAt: daysAgo(305), decidedAt: daysAgo(301), decidedBy: DEMO_ADMIN_ID, decisionNote: "Lovely sample, clear plan. Welcome aboard!" },
  { userId: "u_rhea", subject: "Podcasting", categoryId: "cat_creator", experience: "Producer of three podcasts with 200+ episodes.", sampleUrl: "https://example.com/samples/podcast-reel", why: "Everyone has a show in them. I can make starting painless.", plannedCourse: "Start a Podcast", status: "approved", submittedAt: daysAgo(334), decidedAt: daysAgo(331), decidedBy: "u_ops_karan", decisionNote: "Strong portfolio. Approved." },
  { userId: "u_s052", subject: "Crypto trading signals", categoryId: "cat_business", experience: "Trading crypto for 2 years.", sampleUrl: "https://example.com/samples/crypto-signals", why: "I want to share my winning trades.", plannedCourse: "10x Crypto Signals", status: "rejected", submittedAt: daysAgo(40), decidedAt: daysAgo(37), decidedBy: DEMO_ADMIN_ID, decisionNote: "We don't host trading-signal or guaranteed-returns content. Thanks for applying." },
  { userId: "u_s058", subject: "Mehndi design", categoryId: "cat_design", experience: "Bridal mehndi artist for 5 years in Indore.", sampleUrl: "https://example.com/samples/mehndi-photos", why: "Mehndi is a real skill and a real income for many women.", plannedCourse: "Mehndi from Basics to Bridal", status: "changes_requested", submittedAt: daysAgo(15), decidedAt: daysAgo(12), decidedBy: DEMO_ADMIN_ID, decisionNote: "Love the idea! Please share a 3-minute sample lesson video (not just photos) so we can see your teaching style." },
];
/* The course outline each applicant sketched (TutorApplication.courseOutline), by applicant. */
const APP_OUTLINES: Record<string, string[]> = {
  [PENDING_TUTOR_IDS[0]]: ["Posture, tatkar and counting the 16-beat teentaal", "Hastaks and basic chakkars without getting dizzy", "Your first tukda, slowly then at speed", "Expressions (abhinaya) for a short bhajan", "Putting it together: a 3-minute piece to perform"],
  [PENDING_TUTOR_IDS[1]]: ["How interviewers think: patterns over problems", "Two pointers and sliding window", "Hashing, prefix sums and the classic traps", "Trees and graphs: BFS, DFS and when to use which", "Dynamic programming from recursion up", "Mock interview walkthroughs with real questions"],
  [PENDING_TUTOR_IDS[2]]: ["A ₹600 starter kit and how to use it", "Washes, gradients and controlling water", "Skies and clouds in one sitting", "Trees, hills and simple reflections", "Your first full landscape, step by step"],
  [PENDING_TUTOR_IDS[3]]: ["Sounds and script basics, just enough to read signboards", "Greetings, auto rides and asking for directions", "Shopping, bargaining and numbers", "Office small talk and phone calls", "Ordering food and making friends with neighbours"],
  [PENDING_TUTOR_IDS[4]]: ["Warm-up and mobility you can do in a 1BHK", "Lower body: squats, lunges, glute bridges", "Upper body with a backpack and a chair", "Core that doesn't wreck your back", "A 4-week plan with progress checks"],
  [PENDING_TUTOR_IDS[5]]: ["What examiners actually reward", "Choosing a topic in 5 minutes", "Building a structure: intro, dimensions, way forward", "Using examples, data and quotes without stuffing", "Timed practice with model answers"],
  u_s058: ["Cones, paste consistency and clean lines", "Basic motifs: leaves, florals, paisley", "Arabic style for hands and feet", "Full bridal layout and portraits", "Pricing your work and getting first clients"],
};
/* The rest of each applicant's wizard answers (years, languages, website, payout), by applicant. */
const APP_EXTRAS: Record<string, Pick<TutorApplication, "years" | "languages" | "website" | "payout">> = {
  [PENDING_TUTOR_IDS[0]]: { years: "7+", languages: ["Hindi", "Bengali", "English"], website: "https://example.com/kathak-with-ishaan", payout: { country: "IN", method: "UPI", gst: "no" } },
  [PENDING_TUTOR_IDS[1]]: { years: "3-7", languages: ["English", "Hindi"], website: "https://example.com/arnav-codes", payout: { country: "IN", method: "Bank transfer (NEFT/IMPS)", gst: "unsure" } },
  [PENDING_TUTOR_IDS[2]]: { years: "1-3", languages: ["English", "Hindi"], website: "https://example.com/pranav-paints", payout: { country: "IN", method: "UPI", gst: "no" } },
  [PENDING_TUTOR_IDS[3]]: { years: "7+", languages: ["Tamil", "English"], payout: { country: "IN", method: "Bank transfer (NEFT/IMPS)", gst: "no" } },
  [PENDING_TUTOR_IDS[4]]: { years: "3-7", languages: ["English", "Hindi", "Kannada"], website: "https://example.com/20-min-strength", payout: { country: "AE", method: "Bank transfer" } },
  [PENDING_TUTOR_IDS[5]]: { years: "1-3", languages: ["English", "Hindi"], payout: { country: "IN", method: "UPI", gst: "yes", gstin: "07AAPFU0939F1ZV" } },
  u_lakshmi: { years: "7+", languages: ["Tamil", "English"], website: "https://example.com/lakshmis-kitchen", payout: { country: "IN", method: "Bank transfer (NEFT/IMPS)", gst: "yes", gstin: "33AAKCS2291M1Z4" } },
  u_rhea: { years: "3-7", languages: ["English", "Hindi"], website: "https://example.com/rhea-kapoor-audio", payout: { country: "IN", method: "UPI", gst: "yes", gstin: "27AAJCR4417K1ZQ" } },
  u_s052: { years: "1-3", languages: ["English"], payout: { country: "IN", method: "UPI", gst: "no" } },
  u_s058: { years: "3-7", languages: ["Hindi"], website: "https://example.com/trisha-mehndi", payout: { country: "IN", method: "UPI", gst: "unsure" } },
};
export const TUTOR_APPLICATIONS: TutorApplication[] = APPS.map((a, i) => {
  const p = STUDENTS.find((s) => s.id === a.userId);
  const fallback = { name: a.userId === "u_lakshmi" ? "Lakshmi Raman" : "Rhea Kapoor", email: a.userId === "u_lakshmi" ? "lakshmi.raman@tamada.demo" : "rhea.kapoor@tamada.demo", city: a.userId === "u_lakshmi" ? "Madurai" : "Mumbai" };
  const courseOutline = APP_OUTLINES[a.userId];
  return { id: `app_${i + 1}`, name: p?.name ?? fallback.name, email: p?.email ?? fallback.email, city: p?.city ?? fallback.city, ...a, ...APP_EXTRAS[a.userId], ...(courseOutline ? { courseOutline } : {}) };
});

/* ============================================================================= payouts */
/* A tutor's month = the sum of their courses' sales in the sales ledger (sales.ts),
   so payouts, tutor analytics, per-course revenue and the platform revenue series
   (admin) all tell one story:
     gross = units x price x COUPON_FACTOR / 1.18 (ex-GST), net = gross x revenueShare.
   One row per month since the tutor's first sale. October (the open month) is
   "scheduled" and holds the FULL-MONTH projection (month-to-date x 31/5; screens
   prorate it back with x 5/31). September is "processing" (Farhan's is on hold).
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
      const status: Payout["status"] = open ? "scheduled" : period === "2026-09" ? (tutorId === "u_farhan" ? "on_hold" : "processing") : "paid";
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
  { id: "ntf_p1", userId: DEMO_STUDENT_ID, kind: "question", title: "Arjun answered your question", body: "\"Use gap almost always: it only adds space between items…\"", href: "/learn/web-dev-from-zero/wd-2-2", createdAt: daysAgo(32, 11), read: true },
  { id: "ntf_p2", userId: DEMO_STUDENT_ID, kind: "course", title: "New lesson in Guitar in 30 Days", body: "Kabir added \"Record yourself and improve\" to module 5.", href: "/courses/guitar-in-30-days", createdAt: daysAgo(1, 18), read: false },
  { id: "ntf_p3", userId: DEMO_STUDENT_ID, kind: "order", title: "You've got Python for Data", body: "The Tamada team granted you access. Happy learning!", href: "/learn/python-for-data", createdAt: daysAgo(5, 12), read: false },
  { id: "ntf_p4", userId: DEMO_STUDENT_ID, kind: "quiz", title: "Checkpoint ahead", body: "Pass the JavaScript checkpoint to unlock module 5 of Web Dev From Zero.", href: "/learn/web-dev-from-zero/wd-4-4", createdAt: daysAgo(0, 8), read: false },
  { id: "ntf_p5", userId: DEMO_STUDENT_ID, kind: "system", title: "Diwali offer starts soon", body: "DIWALI25 gives 25% off every course from 15 October.", href: "/courses", createdAt: daysAgo(2, 10), read: true },
  { id: "ntf_a1", userId: DEMO_TUTOR_ID, kind: "question", title: `${arjunOpen.length} unanswered question${arjunOpen.length === 1 ? "" : "s"}`, body: `Learners are waiting on ${arjunOpenWhere}.`, href: "/tutor/questions", createdAt: daysAgo(0, 9), read: false },
  { id: "ntf_a2", userId: DEMO_TUTOR_ID, kind: "course", title: "Git Without Fear is in review", body: "Our team usually replies within 3 working days.", href: "/tutor/courses", createdAt: daysAgo(2, 18, 25), read: false },
  { id: "ntf_a3", userId: DEMO_TUTOR_ID, kind: "review", title: "New 5-star review", body: `"${arjunReview?.comment ?? "I shipped my first portfolio site. Recruiters actually opened it!"}"`, href: "/tutor/analytics", createdAt: arjunReview?.createdAt ?? daysAgo(1, 21), read: true },
  { id: "ntf_a4", userId: DEMO_TUTOR_ID, kind: "payout", title: "September payout is processing", body: "Expected in your bank account by 10 October.", href: "/tutor/earnings", createdAt: daysAgo(4, 10), read: true },
  { id: "ntf_ad1", userId: DEMO_ADMIN_ID, kind: "application", title: "6 tutor applications waiting", body: "Oldest one was submitted 6 days ago.", href: "/admin/tutors", createdAt: daysAgo(0, 9, 30), read: false },
  { id: "ntf_ad2", userId: DEMO_ADMIN_ID, kind: "course", title: "2 courses awaiting review", body: "Git Without Fear and UI Design in Figma.", href: "/admin/courses", createdAt: daysAgo(2, 18, 30), read: false },
  // + one "Refund requested" per open request, added at the end of the seed (refund story)
  { id: "ntf_ad4", userId: DEMO_ADMIN_ID, kind: "system", title: "DIWALI25 goes live in 10 days", body: "Check the coupon settings before it starts.", href: "/admin/coupons", createdAt: daysAgo(3, 12), read: true },
];

/* ============================================================================= reports (moderation) */
export const REPORTS: Report[] = [
  { id: "rpt_1", kind: "review", targetId: "rev_photo_offtopic", courseId: "crs_photo", reporterId: "u_s010", reason: "Review mentions a different course", status: "open", createdAt: daysAgo(1, 13) },
  { id: "rpt_2", kind: "comment", targetId: "cmt_spam_1", courseId: "crs_webdev", reporterId: "u_s002", reason: "Spam link in reply", status: "open", createdAt: daysAgo(0, 9) },
  { id: "rpt_3", kind: "course", targetId: "crs_reels", courseId: "crs_reels", reporterId: "u_s031", reason: "Uses copyrighted film audio", status: "resolved", createdAt: daysAgo(17, 16) },
  { id: "rpt_4", kind: "comment", targetId: "cmt_10", courseId: "crs_money", reporterId: "u_s045", reason: "Financial advice concern", status: "dismissed", createdAt: daysAgo(55, 10) },
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
