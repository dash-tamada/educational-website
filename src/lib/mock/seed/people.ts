import type { Category, Profile, TutorProfile, Tone } from "../types";
import { mediaSrc } from "@/lib/media";
import { daysAgo, rng, slugify } from "./util";

/* ----------------------------------------------------------------------------- categories */
/** One flagship course (AI Filmmaking) plus the two bonus tracks the studio is building. */
export const CATEGORIES: Category[] = [
  { id: "cat_film", name: "AI Filmmaking", slug: "ai-filmmaking", description: "Story, shots, motion, voice and the edit: short films made with AI, directed by you.", tone: "flame", icon: "camera", position: 1 },
  { id: "cat_musicvideo", name: "AI Music Videos", slug: "ai-music-videos", description: "Cut visuals to the beat: performance, lyric and dream-sequence videos for real tracks.", tone: "hotpink", icon: "music", position: 2 },
  { id: "cat_ads", name: "Ads & Brand Films", slug: "ads-and-brand-films", description: "Product spots, launch films and social ads that clients sign off on.", tone: "sun", icon: "briefcase", position: 3 },
];

/* ----------------------------------------------------------------------------- demo accounts */
export const DEMO_STUDENT_ID = "u_priya";
export const DEMO_TUTOR_ID = "u_arjun";
export const DEMO_ADMIN_ID = "u_admin";

/* ----------------------------------------------------------------------------- tutors */
type TutorSeed = Omit<Profile, "role" | "tutorStatus" | "status" | "lastActiveAt"> &
  Omit<TutorProfile, "userId" | "slug" | "rating" | "reviewCount" | "learners"> & {
    lastActiveDays: number;
  };

/** The lead director is the only instructor: every public lesson is his. */
const TUTOR_SEEDS: TutorSeed[] = [
  {
    id: DEMO_TUTOR_ID,
    name: "Arjun Rao",
    email: "arjun.rao@tamada.demo",
    city: "Bengaluru",
    avatar: mediaSrc("director-portrait"),
    tone: "flame",
    joinedAt: daysAgo(640),
    lastActiveDays: 0,
    headline: "Director and AI filmmaker. Lead instructor at Tamada Media",
    bio: "Arjun spent a decade directing ads, music videos and short films before the camera became optional. Today he builds whole films with AI: story in an LLM, look in Midjourney, motion in Veo and Kling, voices and score generated, then cut and graded in DaVinci Resolve. His shorts have screened at Indian indie festivals and his brand films run on national TV. He teaches the director's half of AI filmmaking: what to ask for, why, and when to cut.",
    expertise: ["AI filmmaking", "Prompt direction", "Image-to-video", "Voice and lip-sync", "Editing and colour", "Sound design"],
    languages: ["English", "Hindi", "Kannada"],
    yearsTeaching: 9,
    socials: [
      { label: "Instagram", href: "https://www.instagram.com/arjunrao.films" },
      { label: "YouTube", href: "https://www.youtube.com/@arjunraofilms" },
      { label: "Vimeo", href: "https://vimeo.com/arjunraofilms" },
    ],
    revenueShare: 0.7,
  },
];

const tutorProfiles: Profile[] = TUTOR_SEEDS.map((t) => ({
  id: t.id,
  name: t.name,
  email: t.email,
  role: "tutor",
  tutorStatus: "approved",
  status: "active",
  city: t.city,
  avatar: t.avatar,
  tone: t.tone,
  joinedAt: t.joinedAt,
  lastActiveAt: daysAgo(t.lastActiveDays, 9 + (t.lastActiveDays % 9)),
  headline: t.headline,
}));

/** Aggregates (rating, reviewCount, learners) are filled in by db.ts from courses. */
export const TUTOR_PROFILES_BASE: Omit<TutorProfile, "rating" | "reviewCount" | "learners">[] =
  TUTOR_SEEDS.map((t) => ({
    userId: t.id,
    slug: slugify(t.name.replace(/^Dr\.\s*/, "")),
    headline: t.headline!,
    bio: t.bio,
    expertise: t.expertise,
    languages: t.languages,
    yearsTeaching: t.yearsTeaching,
    socials: t.socials,
    revenueShare: t.revenueShare,
  }));

/* ----------------------------------------------------------------------------- students */
const FIRST = [
  "Aarav", "Ananya", "Rohan", "Ishaan", "Diya", "Kavya", "Aditya", "Saanvi", "Vihaan", "Meher",
  "Arnav", "Riya", "Kabir", "Zoya", "Yash", "Tanvi", "Siddharth", "Nandini", "Pranav", "Aisha",
  "Harsh", "Pooja", "Nikhil", "Sneha", "Rahul", "Shreya", "Varun", "Neha", "Karthik", "Divya",
  "Manav", "Ira", "Dev", "Simran", "Aryan", "Gauri", "Omkar", "Fatima", "Rishi", "Lavanya",
  "Abhinav", "Mitali", "Sahil", "Anushka", "Tejas", "Bhavya", "Kunal", "Rutuja", "Ayaan", "Esha",
  "Vivek", "Pallavi", "Jai", "Sakshi", "Ritvik", "Madhu", "Naveen", "Trisha", "Imran",
];
const LAST = [
  "Sharma", "Iyer", "Patel", "Reddy", "Gupta", "Nair", "Singh", "Kulkarni", "Banerjee", "Menon",
  "Joshi", "Khan", "Pillai", "Chopra", "Desai", "Mehta", "Rao", "Bhat", "Sen", "Mishra",
  "Agarwal", "Hegde", "Shetty", "Thomas", "Fernandes", "Chatterjee", "Verma", "Naidu", "Gill", "Saxena",
];
const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur",
  "Lucknow", "Kochi", "Indore", "Bhopal", "Chandigarh", "Nagpur", "Surat", "Coimbatore", "Guwahati",
  "Bhubaneswar", "Mysuru", "Visakhapatnam", "Dehradun", "Patna", "Thiruvananthapuram", "Vadodara",
];
const TONES: Tone[] = ["sun", "aqua", "magenta", "tangerine", "lilac", "mint", "cyan", "bubblegum", "blue", "green", "flame", "butter"];

const r = rng(20261005);

const demoStudent: Profile = {
  id: DEMO_STUDENT_ID,
  name: "Priya Nair",
  email: "priya.nair@tamada.demo",
  role: "student",
  tutorStatus: "none",
  status: "active",
  city: "Kochi",
  tone: "hotpink",
  joinedAt: daysAgo(58, 21, 10),
  lastActiveAt: daysAgo(0, 8, 40),
  phone: "+91 98470 12345",
  headline: "Wedding filmmaker in Kochi, learning to direct with AI",
};

/** First names for s060..s149 (the first 59 keep FIRST, so their identities never change). */
const FIRST_MORE = [
  "Harini", "Joel", "Ketaki", "Mohit", "Nupur", "Parag", "Rachana", "Sushant", "Ujjwal", "Vaishnavi",
  "Yamini", "Zubin", "Akash", "Bhoomi", "Chirag", "Deepika", "Eshan", "Falguni", "Girish", "Hemant",
  "Indu", "Jatin", "Kritika", "Lokesh", "Mansi", "Nakul", "Ojas", "Prachi", "Rajat", "Sonal",
  "Tushar", "Urvashi", "Vinay", "Yogita", "Aniket", "Bindu", "Chetan", "Dimple", "Gaurav", "Hina",
  "Irfan", "Juhi", "Kshitij", "Leela", "Mayank",
];

/** 149 sample students (s001..s149) incl. a few suspended and pending-tutor accounts. The rng is
 *  drawn in the same order as before, so s001..s059 are exactly the accounts they always were. */
const generatedStudents: Profile[] = Array.from({ length: 149 }, (_, i) => {
  const first = i < FIRST.length ? FIRST[i] : FIRST_MORE[(i - FIRST.length) % FIRST_MORE.length];
  const last = LAST[(i * 7 + 3) % LAST.length];
  const joined = r.int(2, 360);
  const id = `u_s${String(i + 1).padStart(3, "0")}`;
  const status = i === 13 || i === 41 ? "suspended" : "active";
  return {
    id,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i % 4 === 0 ? i : ""}@${r.pick(["gmail.com", "outlook.com", "yahoo.in", "proton.me"])}`,
    role: "student",
    tutorStatus: "none",
    status,
    city: r.pick(CITIES),
    tone: TONES[i % TONES.length],
    joinedAt: daysAgo(joined, r.int(7, 23), r.int(0, 59)),
    lastActiveAt: daysAgo(Math.max(0, Math.min(joined, r.int(0, 40))), r.int(7, 23)),
  } satisfies Profile;
});

export const STUDENTS: Profile[] = [demoStudent, ...generatedStudents];

const admins: Profile[] = [
  {
    id: DEMO_ADMIN_ID,
    name: "Admin",
    email: "admin@tamada.demo",
    role: "admin",
    tutorStatus: "none",
    status: "active",
    city: "Bengaluru",
    tone: "purple",
    joinedAt: daysAgo(720),
    lastActiveAt: daysAgo(0, 10, 5),
    headline: "Keeps the school running: reviews, refunds and reports",
  },
  {
    id: "u_ops_karan",
    name: "Karan Malhotra",
    email: "karan@tamada.demo",
    role: "admin",
    tutorStatus: "none",
    status: "active",
    city: "Gurugram",
    tone: "indigo",
    joinedAt: daysAgo(600),
    lastActiveAt: daysAgo(1, 18),
    headline: "Support and refunds",
  },
];

export const USERS: Profile[] = [...admins, ...tutorProfiles, ...STUDENTS];

/** Applicant accounts that applied to teach (pending tutorStatus). Their ids are student ids. */
export const PENDING_TUTOR_IDS = ["u_s004", "u_s011", "u_s019", "u_s027", "u_s033", "u_s046"];
for (const user of USERS) if (PENDING_TUTOR_IDS.includes(user.id)) user.tutorStatus = "pending";
const rejectedApplicant = USERS.find((x) => x.id === "u_s052");
if (rejectedApplicant) rejectedApplicant.tutorStatus = "rejected";
