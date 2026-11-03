/* =============================================================================
   Mock data model. Mirrors the platform plan (Supabase/Postgres tables) so the
   pages built on it can later swap the mock selectors for real queries.
   All ids are strings; all timestamps are ISO strings (IST offset); money is in
   whole rupees (INR) unless a field says otherwise.
   ============================================================================= */

import type { Tone } from "@/lib/tone";

export type { Tone };

export type ISODate = string;

/* ----------------------------------------------------------------------------- people */
export type Role = "admin" | "tutor" | "student";
export type TutorStatus = "none" | "pending" | "approved" | "rejected";
export type AccountStatus = "active" | "suspended";

/** profiles table. Students, tutors and admins all live here. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  tutorStatus: TutorStatus;
  status: AccountStatus;
  city: string;
  /** Unsplash photo (tutors only). Students use generated initials avatars. */
  avatar?: string;
  /** avatar fallback colour */
  tone: Tone;
  joinedAt: ISODate;
  lastActiveAt: ISODate;
  phone?: string;
  headline?: string;
  /** Why and when the account was suspended (internal, admins only). Present only while
   *  status is "suspended"; demo.setUserStatus(id, "active") clears it. */
  suspension?: Suspension;
}

/** Internal suspension record on a Profile. */
export interface Suspension {
  /** the admin's internal note ("" when none was left) */
  note: string;
  /** when it happened (ISO, IST) */
  at: ISODate;
  /** admin profile id */
  by: string;
}

/** Public tutor profile (1:1 with a Profile whose role is "tutor"). */
export interface TutorProfile {
  userId: string;
  /** /tutors/[slug] */
  slug: string;
  headline: string;
  bio: string;
  expertise: string[];
  languages: string[];
  /** cached aggregate: average rating across published courses */
  rating: number;
  reviewCount: number;
  /** cached aggregate: learners across all courses */
  learners: number;
  yearsTeaching: number;
  socials: { label: string; href: string }[];
  /** revenue share the tutor keeps (0..1) */
  revenueShare: number;
}

/** Profile + TutorProfile merged (what pages usually want). */
export type Tutor = Profile & TutorProfile;

/* ----------------------------------------------------------------------------- catalog */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  tone: Tone;
  /** emoji-free short icon key for UI (see CategoryIcon in the app kit) */
  icon: string;
  position: number;
  parentId?: string | null;
}

export type CourseLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";
export type CourseStatus = "draft" | "in_review" | "published" | "rejected" | "archived";
export type CourseBadge = "NEW" | "BESTSELLER" | "JUST DROPPED";

export interface Course {
  id: string;
  slug: string;
  tutorId: string;
  categoryId: string;
  title: string;
  /** one-line promise (card blurb) */
  promise: string;
  description: string;
  thumbnail: string;
  /** card frame colour (Aardvark colour card) */
  tone: Tone;
  level: CourseLevel;
  language: string;
  price: number;
  /** strike-through price for launch offers */
  compareAtPrice?: number;
  currency: "INR";
  status: CourseStatus;
  tags: string[];
  badge?: CourseBadge;
  outcomes: string[];
  requirements: string[];
  /** cached aggregates (denormalised like a real table) */
  rating: number;
  reviewCount: number;
  learners: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  publishedAt?: ISODate;
  submittedAt?: ISODate;
  /** admin note when rejected / sent back */
  reviewNote?: string;
  featured?: boolean;
  hasCertificate: boolean;
  /** title printed on the certificate, e.g. "Certified AI Filmmaker" (falls back to the course title) */
  certificateTitle?: string;
}

/* ----------------------------------------------------------------------------- curriculum */
export interface Lesson {
  id: string;
  title: string;
  description: string;
  /** storage path of the (mock) video; the player uses a poster + fake timeline */
  videoPath: string;
  durationSec: number;
  /** the first video of every course is a free preview */
  isFreePreview: boolean;
  hasCaptions: boolean;
  /** chapter markers inside the video */
  chapters?: { atSec: number; title: string }[];
}

export type QuestionType = "single" | "multiple" | "true_false" | "short";

export interface QuestionOption {
  id: string;
  text: string;
  /** NEVER render before the attempt is submitted (use getQuizForTaking). */
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  explanation: string;
  position: number;
  /** single / multiple / true_false. true_false always has two options "True", "False". */
  options: QuestionOption[];
  /** short answers: accepted answers, compared case/space-insensitively */
  acceptedAnswers?: string[];
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  /** 0..100 */
  passPercentage: number;
  /** 0 = unlimited */
  maxAttempts: number;
  /** when true, items after this quiz stay locked until it is passed */
  isGating: boolean;
  timeLimitMin?: number;
  questions: Question[];
}

/** Quiz as a learner sees it before submitting: no isCorrect / acceptedAnswers. */
export interface QuizForTaking extends Omit<Quiz, "questions"> {
  questions: (Omit<Question, "options" | "acceptedAnswers" | "explanation"> & {
    options: Omit<QuestionOption, "isCorrect">[];
  })[];
}

export type ResourceFileType = "pdf" | "zip" | "sheet" | "template" | "link" | "audio";

export interface Resource {
  id: string;
  title: string;
  description: string;
  fileType: ResourceFileType;
  /** file size in KB (not for links) */
  sizeKb?: number;
  url: string;
}

export type ItemType = "video" | "quiz" | "resource";

interface ModuleItemBase {
  /** stable id used in URLs: /learn/[courseSlug]/[item.id] */
  id: string;
  moduleId: string;
  /** 1-based position inside the module */
  position: number;
}
export type VideoItem = ModuleItemBase & { type: "video"; lesson: Lesson };
export type QuizItem = ModuleItemBase & { type: "quiz"; quiz: Quiz };
export type ResourceItem = ModuleItemBase & { type: "resource"; resource: Resource };
/** module_items row with its referenced lesson / quiz / resource resolved. */
export type ModuleItem = VideoItem | QuizItem | ResourceItem;

export interface Module {
  id: string;
  courseId: string;
  title: string;
  summary?: string;
  /** 1-based */
  position: number;
  items: ModuleItem[];
}

/** A module item with its course-wide context (from flattenCurriculum / getItem). */
export interface ItemContext {
  item: ModuleItem;
  module: Module;
  /** 0-based index across the whole course */
  index: number;
  /** "MODULE 01 / LESSON 02" style label */
  label: string;
  prev: ModuleItem | null;
  next: ModuleItem | null;
}

/* ----------------------------------------------------------------------------- commerce */
export type EnrollmentSource = "purchase" | "admin_grant" | "free";

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  source: EnrollmentSource;
  orderId?: string;
  createdAt: ISODate;
  completedAt?: ISODate;
  /** admin revoked (refund) */
  revokedAt?: ISODate;
}

export type OrderStatus = "paid" | "pending" | "failed" | "refunded";
export type PaymentProvider = "razorpay" | "stripe" | "upi" | "admin";

export interface Order {
  id: string;
  /** human-facing number, e.g. TM-24817 */
  number: string;
  userId: string;
  courseId: string;
  /** list price at purchase time */
  subtotal: number;
  discount: number;
  /** charged amount (subtotal - discount) */
  amount: number;
  /** 18% GST included in amount */
  tax: number;
  currency: "INR";
  provider: PaymentProvider;
  providerRef: string;
  method: "UPI" | "Card" | "Netbanking" | "Wallet" | "Grant";
  status: OrderStatus;
  couponCode?: string;
  createdAt: ISODate;
  refundedAt?: ISODate;
  refundReason?: string;
  /** learner asked for a refund (admin queue: "Refunds to check") */
  refundRequest?: {
    reason: string;
    requestedAt: ISODate;
    /** set when the request falls outside the refund policy (shown to the admin, who still decides) */
    outsidePolicy?: string;
  };
  /** admin note when a refund request was declined (the request itself is cleared) */
  refundDeclinedAt?: ISODate;
  refundDeclineNote?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "flat";
  /** percent (0..100) or flat rupees */
  value: number;
  /** null = every course */
  courseIds: string[] | null;
  /** minimum course price in rupees (inclusive) for the code to apply; unset = no minimum */
  minAmount?: number;
  /** only for someone who hasn't bought a course yet (no paid order with an amount); unset = anyone */
  firstPurchaseOnly?: boolean;
  maxRedemptions: number;
  redemptions: number;
  startsAt: ISODate;
  endsAt: ISODate;
  active: boolean;
  createdBy: string;
}

export interface Payout {
  id: string;
  tutorId: string;
  /** "2026-09" */
  period: string;
  gross: number;
  platformFee: number;
  net: number;
  status: "scheduled" | "processing" | "paid" | "on_hold";
  paidAt?: ISODate;
  reference?: string;
  sales: number;
}

/* ----------------------------------------------------------------------------- learning */
export interface LessonProgress {
  id: string;
  userId: string;
  courseId: string;
  /** module item id of the video / resource */
  itemId: string;
  lastPositionSec: number;
  /** watched (or opened, for resources). Videos complete at 90% watched. */
  completed: boolean;
  completedAt?: ISODate;
  updatedAt: ISODate;
}

/** answers: questionId -> option ids (single/multiple/true_false) or text (short) */
export type QuizAnswers = Record<string, string[] | string>;

export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  quizId: string;
  /** module item id of the quiz */
  itemId: string;
  /** 0..100 */
  score: number;
  passed: boolean;
  answers: QuizAnswers;
  /** per question result */
  results: { questionId: string; correct: boolean }[];
  createdAt: ISODate;
}

export interface Note {
  id: string;
  userId: string;
  courseId: string;
  itemId: string;
  atSec: number;
  text: string;
  createdAt: ISODate;
}

export interface Review {
  id: string;
  userId: string;
  courseId: string;
  /** 1..5 */
  rating: number;
  title?: string;
  comment: string;
  createdAt: ISODate;
  /** tutor reply */
  reply?: { body: string; createdAt: ISODate };
  hidden?: boolean;
  helpful: number;
}

export interface WishlistItem {
  id: string;
  userId: string;
  courseId: string;
  createdAt: ISODate;
}

export interface Certificate {
  id: string;
  /** verifiable at /certificates/[code], format TM-XXXX-XXXX */
  code: string;
  userId: string;
  courseId: string;
  issuedAt: ISODate;
  /** total course hours shown on the certificate */
  hours: number;
}

export interface LessonComment {
  id: string;
  courseId: string;
  itemId: string;
  userId: string;
  body: string;
  createdAt: ISODate;
  /** reply thread (tutor answers are replies by the course tutor) */
  parentId?: string | null;
  /** resolved by the tutor */
  resolved?: boolean;
  likes: number;
  /** user ids who liked it through the demo store (seed likes are anonymous counts) */
  likedBy?: string[];
}

/* ----------------------------------------------------------------------------- operations */
export type ApplicationStatus = "pending" | "approved" | "rejected" | "changes_requested";

export interface TutorApplication {
  id: string;
  /** applicant profile id (may be a student account) */
  userId: string;
  name: string;
  email: string;
  city: string;
  subject: string;
  categoryId: string;
  experience: string;
  sampleUrl: string;
  why: string;
  /** the planned course's working title */
  plannedCourse: string;
  /** the planned course's outline, one step per entry (no "1." numbering). Optional:
   *  older applications only have a title. */
  courseOutline?: string[];
  status: ApplicationStatus;
  submittedAt: ISODate;
  decidedAt?: ISODate;
  decidedBy?: string;
  decisionNote?: string;
  /** personal site / portfolio / channel (optional) */
  website?: string;
  /** languages they can teach in, e.g. ["English", "Malayalam"] */
  languages?: string[];
  /** teaching experience band: "lt1" | "1-3" | "3-7" | "7+" (or a ready label such as "3 to 7 years").
   *  Format it with applicationYearsLabel() from "@/lib/mock". */
  years?: string;
  /** where payouts would go once approved */
  payout?: ApplicationPayout;
  /** earlier review rounds, oldest first. demo.resubmitTutorApplication moves the last decision
   *  here (so the row itself reads as a fresh pending application). */
  history?: ApplicationRound[];
}

export interface ApplicationPayout {
  /** ISO 3166 country code ("IN", "AE", …) or a country name */
  country: string;
  /** e.g. "UPI", "Bank transfer (NEFT/IMPS)", "PayPal" */
  method: string;
  /** GST registration (India): yes / no / not sure yet */
  gst?: "yes" | "no" | "unsure";
  /** GSTIN, when they have one */
  gstin?: string;
}

/** One finished review round of a tutor application (kept when the applicant resubmits). */
export interface ApplicationRound {
  submittedAt: ISODate;
  status: Exclude<ApplicationStatus, "pending">;
  decisionNote?: string;
  decidedAt?: ISODate;
  decidedBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  kind: "course" | "quiz" | "order" | "review" | "question" | "system" | "application" | "payout";
  title: string;
  body: string;
  href?: string;
  createdAt: ISODate;
  read: boolean;
}

export interface Report {
  id: string;
  kind: "review" | "comment" | "course";
  targetId: string;
  courseId: string;
  reporterId: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: ISODate;
}

/* ----------------------------------------------------------------------------- analytics */
export interface SeriesPoint {
  /** "2026-09" (month) or "2026-09-28" (day) */
  key: string;
  /** short axis label: "Sep" / "28 Sep" */
  label: string;
  value: number;
}

export interface PlatformSeries {
  revenue: SeriesPoint[];
  signups: SeriesPoint[];
  enrollments: SeriesPoint[];
  activeLearners: SeriesPoint[];
}

export interface TutorAnalytics {
  tutorId: string;
  range: AnalyticsRange;
  revenue: SeriesPoint[];
  enrollments: SeriesPoint[];
  totals: {
    revenue: number;
    enrollments: number;
    avgCompletion: number;
    quizPassRate: number;
    previewToPurchase: number;
    learners: number;
    rating: number;
  };
  /** learners who reached each module (first course or the given course) */
  learnersByModule: { courseId: string; module: string; learners: number }[];
  /** completion % per lesson of the focus course */
  completionByLesson: { itemId: string; title: string; completion: number }[];
  /** quiz retry rates of the focus course */
  quizStats: { itemId: string; title: string; passRate: number; retryRate: number; avgScore: number }[];
  /** most replayed moments */
  replays: { itemId: string; title: string; atSec: number; replays: number }[];
  byCourse: { courseId: string; revenue: number; enrollments: number; completion: number; rating: number }[];
}

export type AnalyticsRange = "7d" | "30d" | "12m" | "all";

/* ----------------------------------------------------------------------------- the db */
/** Every table, as one object. The seed db and the live (store-merged) db share it. */
export interface Db {
  users: Profile[];
  tutorProfiles: TutorProfile[];
  categories: Category[];
  courses: Course[];
  /** courseId -> modules (with resolved items) */
  curricula: Record<string, Module[]>;
  enrollments: Enrollment[];
  orders: Order[];
  coupons: Coupon[];
  payouts: Payout[];
  lessonProgress: LessonProgress[];
  quizAttempts: QuizAttempt[];
  notes: Note[];
  reviews: Review[];
  wishlist: WishlistItem[];
  certificates: Certificate[];
  comments: LessonComment[];
  tutorApplications: TutorApplication[];
  notifications: Notification[];
  reports: Report[];
}
