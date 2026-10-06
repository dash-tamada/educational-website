import type { Category, Profile, TutorProfile, Tone } from "../types";
import { daysAgo, rng, slugify, u } from "./util";

/* ----------------------------------------------------------------------------- categories */
/** The landing's eight category names + Creator + Life Skills. */
export const CATEGORIES: Category[] = [
  { id: "cat_coding", name: "Coding", slug: "coding", description: "Web, Python, Git and the tools developers use every day.", tone: "aqua", icon: "code", position: 1 },
  { id: "cat_design", name: "Design", slug: "design", description: "Colour, layout, UI and the eye for what feels right.", tone: "magenta", icon: "pen", position: 2 },
  { id: "cat_business", name: "Business", slug: "business", description: "Spreadsheets, accounts and the skills offices actually run on.", tone: "sun", icon: "briefcase", position: 3 },
  { id: "cat_music", name: "Music", slug: "music", description: "Instruments, voice and making sounds you are proud of.", tone: "tangerine", icon: "music", position: 4 },
  { id: "cat_languages", name: "Languages", slug: "languages", description: "Speak up in English and beyond, without the stage fright.", tone: "cyan", icon: "chat", position: 5 },
  { id: "cat_photography", name: "Photography", slug: "photography", description: "Light, framing and editing, from phone to pro.", tone: "lilac", icon: "camera", position: 6 },
  { id: "cat_exam", name: "Exam Prep", slug: "exam-prep", description: "Board and entrance-exam topics, explained visually.", tone: "blue", icon: "book", position: 7 },
  { id: "cat_cooking", name: "Cooking", slug: "cooking", description: "Real home food: dosas, curries and kitchen confidence.", tone: "green", icon: "pot", position: 8 },
  { id: "cat_creator", name: "Creator", slug: "creator", description: "Podcasts, reels and building an audience you like.", tone: "bubblegum", icon: "mic", position: 9 },
  { id: "cat_life", name: "Life Skills", slug: "life-skills", description: "Money, habits and the grown-up stuff school skipped.", tone: "mint", icon: "spark", position: 10 },
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

const TUTOR_SEEDS: TutorSeed[] = [
  {
    id: DEMO_TUTOR_ID,
    name: "Arjun Rao",
    email: "arjun.rao@tamada.demo",
    city: "Bengaluru",
    avatar: u("photo-1566492031773-4f4e44671857"),
    tone: "aqua",
    joinedAt: daysAgo(640),
    lastActiveDays: 0,
    headline: "Full-stack developer who teaches like a patient senior",
    bio: "Arjun has shipped web apps for two Bengaluru startups and mentored more than 300 first-time developers. He explains code the way he wishes someone had explained it to him: one small win at a time, with no jargon left undefined. Off screen he is usually arguing about filter coffee.",
    expertise: ["JavaScript", "React", "Python", "Git"],
    languages: ["English", "Kannada", "Hindi"],
    yearsTeaching: 7,
    socials: [
      { label: "GitHub", href: "https://github.com/arjunrao-dev" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/arjun-rao-dev" },
    ],
    revenueShare: 0.7,
  },
  {
    id: "u_meera",
    name: "Meera Shah",
    email: "meera.shah@tamada.demo",
    city: "Ahmedabad",
    avatar: u("photo-1592621385612-4d7129426394"),
    tone: "magenta",
    joinedAt: daysAgo(590),
    lastActiveDays: 1,
    headline: "Brand designer obsessed with colour that feels right",
    bio: "Meera runs a small brand studio in Ahmedabad and has built identities for textile labels, cafés and a very fussy chai brand. She teaches colour and UI as a set of decisions you can explain, not a mysterious talent.",
    expertise: ["Colour theory", "Brand identity", "Figma", "UI design"],
    languages: ["English", "Gujarati", "Hindi"],
    yearsTeaching: 5,
    socials: [{ label: "Instagram", href: "https://www.instagram.com/meerashah.colour" }],
    revenueShare: 0.7,
  },
  {
    id: "u_kabir",
    name: "Kabir Das",
    email: "kabir.das@tamada.demo",
    city: "Kolkata",
    avatar: u("photo-1600486913747-55e5470d6f40"),
    tone: "sun",
    joinedAt: daysAgo(420),
    lastActiveDays: 2,
    headline: "Session guitarist and the friendliest strict teacher you will meet",
    bio: "Kabir has played in Kolkata's indie scene for a decade and teaches beginners every weekend. His method is simple: three chords, one song, every single day. Calluses are a badge of honour.",
    expertise: ["Acoustic guitar", "Rhythm", "Song writing"],
    languages: ["English", "Bengali", "Hindi"],
    yearsTeaching: 9,
    socials: [{ label: "YouTube", href: "https://www.youtube.com/@kabirdasguitar" }],
    revenueShare: 0.7,
  },
  {
    id: "u_nisha",
    name: "Nisha Menon",
    email: "nisha.menon@tamada.demo",
    city: "Kochi",
    avatar: u("photo-1607746882042-944635dfe10e"),
    tone: "lilac",
    joinedAt: daysAgo(380),
    lastActiveDays: 3,
    headline: "Chartered accountant who makes money talk feel normal",
    bio: "Nisha spent eight years in audit before deciding the most useful thing she could do was explain SIPs, budgets and tax slabs to her cousins. Now she does it for everyone, minus the finance-bro energy.",
    expertise: ["Personal finance", "Budgeting", "Mutual funds", "Tax basics"],
    languages: ["English", "Malayalam"],
    yearsTeaching: 4,
    socials: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/nisha-menon-ca" }],
    revenueShare: 0.7,
  },
  {
    id: "u_sana",
    name: "Sana Iqbal",
    email: "sana.iqbal@tamada.demo",
    city: "Hyderabad",
    avatar: u("photo-1611601322175-ef8ec8c85f01"),
    tone: "tangerine",
    joinedAt: daysAgo(510),
    lastActiveDays: 1,
    headline: "Wedding and street photographer, phone-first",
    bio: "Sana shoots weddings across Telangana and posts street photos of old Hyderabad shot entirely on her phone. She teaches light, framing and editing so your camera roll finally looks intentional.",
    expertise: ["Mobile photography", "Lightroom", "Composition"],
    languages: ["English", "Hindi", "Urdu", "Telugu"],
    yearsTeaching: 6,
    socials: [{ label: "Instagram", href: "https://www.instagram.com/sanaiqbal.shoots" }],
    revenueShare: 0.7,
  },
  {
    id: "u_vikram",
    name: "Dr. Vikram Iyer",
    email: "vikram.iyer@tamada.demo",
    city: "Chennai",
    // lab coat, arms crossed, no stethoscope: reads "chemist", not "physician" (FND-13)
    avatar: u("photo-1659353888101-6e53e32515fe"),
    tone: "blue",
    joinedAt: daysAgo(700),
    lastActiveDays: 0,
    headline: "PhD chemist who has coached 5,000+ board and JEE students",
    bio: "Vikram did his PhD at IIT Madras and has spent twelve years coaching Class 11 and 12 students. He believes every reaction is a story and every formula has a picture behind it.",
    expertise: ["Chemistry", "Physics", "JEE", "NEET", "CBSE boards"],
    languages: ["English", "Tamil"],
    yearsTeaching: 12,
    socials: [{ label: "YouTube", href: "https://www.youtube.com/@vikramiyerphysics" }],
    revenueShare: 0.75,
  },
  {
    id: "u_rhea",
    name: "Rhea Kapoor",
    email: "rhea.kapoor@tamada.demo",
    city: "Mumbai",
    avatar: u("photo-1580489944761-15a19d654956"),
    tone: "bubblegum",
    joinedAt: daysAgo(330),
    lastActiveDays: 4,
    headline: "Podcast producer with 200+ published episodes",
    bio: "Rhea produces three chart-topping Hindi and English podcasts out of a tiny studio in Andheri. She is on a mission to prove that your phone, a quiet cupboard and a good story are enough to start.",
    expertise: ["Podcasting", "Audio editing", "Storytelling", "Short video"],
    languages: ["English", "Hindi"],
    yearsTeaching: 3,
    socials: [{ label: "Instagram", href: "https://www.instagram.com/rheakapoor.audio" }],
    revenueShare: 0.7,
  },
  {
    id: "u_farhan",
    name: "Farhan Qureshi",
    email: "farhan.qureshi@tamada.demo",
    city: "Lucknow",
    avatar: u("photo-1629425733761-caae3b5f2e50"),
    tone: "green",
    joinedAt: daysAgo(560),
    lastActiveDays: 6,
    headline: "Excel trainer for banks, startups and one very large wedding",
    bio: "Farhan has trained finance teams at three banks and built dashboards for everything from inventory to wedding guest lists. He teaches the 20% of Excel that does 80% of the work.",
    expertise: ["Excel", "Google Sheets", "Tally", "GST"],
    languages: ["English", "Hindi", "Urdu"],
    yearsTeaching: 8,
    socials: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/farhan-qureshi-excel" }],
    revenueShare: 0.7,
  },
  {
    id: "u_tara",
    name: "Tara Fernandes",
    email: "tara.fernandes@tamada.demo",
    city: "Panaji",
    avatar: u("photo-1618085222100-93f0eecad0aa"),
    tone: "cyan",
    joinedAt: daysAgo(450),
    lastActiveDays: 2,
    headline: "Communication coach for interviews, stages and meetings",
    bio: "Tara coached call-centre trainers and college debaters before going independent. Her spoken English course is about confidence first and grammar second, because nobody remembers your tenses, they remember your story.",
    expertise: ["Spoken English", "Public speaking", "Interview prep"],
    languages: ["English", "Konkani", "Hindi"],
    yearsTeaching: 10,
    socials: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/tara-fernandes-coach" }],
    revenueShare: 0.7,
  },
  {
    id: "u_lakshmi",
    name: "Lakshmi Raman",
    email: "lakshmi.raman@tamada.demo",
    city: "Madurai",
    avatar: u("photo-1662186762208-e00fb67e1b31"),
    tone: "mint",
    joinedAt: daysAgo(300),
    lastActiveDays: 5,
    headline: "Home cook and recipe developer, three generations deep",
    bio: "Lakshmi learned to cook in her grandmother's Madurai kitchen and now develops recipes for food brands. She teaches the batters, tempers and podis that make South Indian food taste like home.",
    expertise: ["South Indian cooking", "Fermentation", "Meal prep"],
    languages: ["English", "Tamil"],
    yearsTeaching: 4,
    socials: [{ label: "Instagram", href: "https://www.instagram.com/lakshmis.kitchen" }],
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
  joinedAt: daysAgo(214, 21, 10),
  lastActiveAt: daysAgo(0, 8, 40),
  phone: "+91 98470 12345",
  headline: "Learning to code after work, one lesson at a time",
};

/** 60 sample students (s001..s060) incl. a few suspended and pending-tutor accounts. */
const generatedStudents: Profile[] = Array.from({ length: 59 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
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
    headline: "Keeps the catalogue healthy",
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
