// Static landing-page content. Courses, categories and reviews move to DB queries
// once the catalog (milestone 6) exists, so keep these shapes close to the schema.

const u = (id: string) => `https://images.unsplash.com/${id}`;

export type Tone =
  | "cyan"
  | "magenta"
  | "yellow"
  | "lilac"
  | "lime"
  | "orange"
  | "tomato"
  | "aqua";

export const toneBg: Record<Tone, string> = {
  cyan: "bg-cyan",
  magenta: "bg-magenta",
  yellow: "bg-yellow",
  lilac: "bg-lilac",
  lime: "bg-lime",
  orange: "bg-orange",
  tomato: "bg-tomato",
  aqua: "bg-aqua",
};

export const navLinks = [
  { label: "Courses", href: "/#courses" },
  { label: "How it works", href: "/#how" },
  { label: "For tutors", href: "/#tutors" },
  { label: "FAQ", href: "/#faq" },
];

export const heroCards = [
  {
    caption: "Shipping my first app",
    img: u("photo-1513258496099-48168024aec0"),
    rotate: -9,
    y: 34,
  },
  {
    caption: "Drawing on my new tablet",
    img: u("photo-1611241893603-3c359704e0ee"),
    rotate: -5,
    y: 8,
  },
  {
    caption: "Finally nailing that riff",
    img: u("photo-1510915361894-db8b60106cb1"),
    rotate: -2,
    y: 18,
  },
  {
    caption: "Budgeting without the panic",
    img: u("photo-1554224155-6726b3ff858f"),
    rotate: 3,
    y: 0,
  },
  {
    caption: "Ordering coffee in Spanish",
    img: u("photo-1522202176988-66273c2fd55f"),
    rotate: 6,
    y: 16,
  },
  {
    caption: "Cooking for the whole flat",
    img: u("photo-1507048331197-7d4ac70811cf"),
    rotate: 10,
    y: 38,
  },
];

export const marqueeItems = [
  "1st video free",
  "Learn at your pace",
  "Tests that make it stick",
  "Real tutors",
  "Certificates",
  "Pay once, keep forever",
];

export type Course = {
  slug: string;
  title: string;
  blurb: string;
  tutor: string;
  img: string;
  tone: Tone;
  badge: "NEW" | "BESTSELLER" | "JUST DROPPED";
  tags: string[];
  modules: number;
  lessons: number;
  price: number;
};

export const courses: Course[] = [
  {
    slug: "web-dev-from-zero",
    title: "Web Dev From Zero",
    blurb:
      "HTML, CSS and JavaScript until you've shipped a real site you're proud of.",
    tutor: "Arjun Rao",
    img: u("photo-1461749280684-dccba630e2f6"),
    tone: "cyan",
    badge: "BESTSELLER",
    tags: ["Coding", "Beginner"],
    modules: 6,
    lessons: 42,
    price: 1499,
  },
  {
    slug: "colour-for-designers",
    title: "Colour, Actually",
    blurb: "Build palettes that feel right, and know exactly why they work.",
    tutor: "Meera Shah",
    img: u("photo-1561070791-2526d30994b5"),
    tone: "magenta",
    badge: "NEW",
    tags: ["Design", "All levels"],
    modules: 4,
    lessons: 24,
    price: 999,
  },
  {
    slug: "guitar-in-30-days",
    title: "Guitar in 30 Days",
    blurb:
      "Chords, strumming and your first three songs. Calluses not included.",
    tutor: "Kabir Das",
    img: u("photo-1525201548942-d8732f6617a0"),
    tone: "yellow",
    badge: "JUST DROPPED",
    tags: ["Music", "Beginner"],
    modules: 5,
    lessons: 30,
    price: 1199,
  },
  {
    slug: "money-basics",
    title: "Money Without the Ick",
    blurb: "Budgets, savings, investing basics. Explained like a friend would.",
    tutor: "Priya Nair",
    img: u("photo-1633158829585-23ba8f7c8caf"),
    tone: "lime",
    badge: "NEW",
    tags: ["Finance", "Life skills"],
    modules: 4,
    lessons: 20,
    price: 799,
  },
  {
    slug: "phone-to-pro-photography",
    title: "Phone to Pro Photos",
    blurb: "Light, framing and editing so your camera roll looks intentional.",
    tutor: "Sana Iqbal",
    img: u("photo-1516035069371-29a1b244cc32"),
    tone: "lilac",
    badge: "BESTSELLER",
    tags: ["Photography", "All levels"],
    modules: 5,
    lessons: 28,
    price: 1299,
  },
  {
    slug: "chemistry-made-visual",
    title: "Chemistry, Made Visual",
    blurb: "Exam-ready chemistry with experiments you can actually picture.",
    tutor: "Dr. Vikram Iyer",
    img: u("photo-1614935151651-0bea6508db6b"),
    tone: "orange",
    badge: "NEW",
    tags: ["Science", "Exam prep"],
    modules: 8,
    lessons: 56,
    price: 1599,
  },
  {
    slug: "start-a-podcast",
    title: "Start a Podcast",
    blurb: "From a voice memo to a published show, with gear on any budget.",
    tutor: "Rhea Kapoor",
    img: u("photo-1478737270239-2f02b77fc618"),
    tone: "aqua",
    badge: "JUST DROPPED",
    tags: ["Creator", "Beginner"],
    modules: 4,
    lessons: 22,
    price: 899,
  },
];

export const steps = [
  {
    title: "Pick a course",
    body: "Browse by topic, level or price. Every course shows its full curriculum up front.",
    tone: "cyan" as Tone,
    icon: "search",
  },
  {
    title: "Watch the first video free",
    body: "No card, no commitment. If the tutor clicks with you, keep going.",
    tone: "magenta" as Tone,
    icon: "play",
  },
  {
    title: "Unlock & pass the tests",
    body: "Buy once to open every module. Short tests between lessons keep it sticking.",
    tone: "yellow" as Tone,
    icon: "check",
  },
  {
    title: "Earn your certificate",
    body: "Finish every lesson and test, then grab a certificate with a shareable code.",
    tone: "lilac" as Tone,
    icon: "badge",
  },
];

export const features = [
  {
    tab: "Video modules",
    title: "Bite-size video modules",
    bullets: [
      "Lessons grouped into clear modules",
      "Resume exactly where you left off",
      "Speed controls & notes",
    ],
    img: u("photo-1588196749597-9ff075ee6b5b"),
  },
  {
    tab: "Tests between lessons",
    title: "Tests between lessons",
    bullets: [
      "Quick quizzes after key videos",
      "Pass mark unlocks the next part",
      "Explanations for every answer",
    ],
    img: u("photo-1514369118554-e20d93546b30"),
  },
  {
    tab: "Progress & certificates",
    title: "Progress you can see",
    bullets: [
      "Progress bars on every course",
      '"Continue where you left off"',
      "Verified certificates",
    ],
    img: u("photo-1601097874965-f940d4f012b5"),
  },
  {
    tab: "Real tutors",
    title: "Taught by real tutors",
    bullets: [
      "Vetted, approved tutors",
      "Ask questions under each lesson",
      "New courses every month",
    ],
    img: u("photo-1664382953518-4a664ab8a8c9"),
  },
];

export const categories = [
  "Coding",
  "Design",
  "Business",
  "Music",
  "Languages",
  "Finance",
  "Photography",
  "Science",
  "Exam Prep",
  "Cooking",
];

export const whyStickers: { label: string; tone: Tone; className: string }[] = [
  {
    label: "First lesson free",
    tone: "magenta",
    className: "md:left-[3%] md:top-[14%] -rotate-6",
  },
  {
    label: "Expert tutors",
    tone: "orange",
    className: "md:right-[2%] md:top-[30%] rotate-3",
  },
  {
    label: "Fair prices",
    tone: "lilac",
    className: "md:left-[7%] md:top-[50%] rotate-2",
  },
  {
    label: "Learn anywhere",
    tone: "aqua",
    className: "md:right-[6%] md:top-[64%] -rotate-[4deg]",
  },
  {
    label: "Real certificates",
    tone: "lime",
    className: "md:left-[14%] md:top-[80%] -rotate-3",
  },
];

// TODO: replace with real reviews once students start leaving them (reviews table, milestone 9).
export const testimonials = [
  {
    quote:
      "I'd bought three courses elsewhere and finished none. The tests in between kept me going here.",
    name: "Sample learner",
    role: "Placeholder review",
  },
  {
    quote:
      "Watching the free first video made it easy to pick a tutor whose style actually suits me.",
    name: "Sample learner",
    role: "Placeholder review",
  },
  {
    quote:
      "Short lessons, clear modules. I learn on the metro and pick up exactly where I stopped.",
    name: "Sample learner",
    role: "Placeholder review",
  },
  {
    quote:
      "Getting the certificate at the end felt like a real win, and the code makes it easy to share.",
    name: "Sample learner",
    role: "Placeholder review",
  },
];

export const tutorPhotos = [
  u("photo-1580894732930-0babd100d356"),
  u("photo-1522881193457-37ae97c905bf"),
  u("photo-1664382953647-5c6c76dd63b9"),
];

export const testimonialBg = u("photo-1543269865-cbf427effbad");

export const pricing = [
  {
    name: "Just looking",
    note: "Try before you buy",
    price: "Free",
    per: "",
    cta: "Watch a free lesson",
    href: "/courses",
    perks: [
      "First video of every course",
      "Full curriculum preview",
      "Save courses to your wishlist",
    ],
  },
  {
    name: "Buy a course",
    note: "Most popular",
    price: "₹799+",
    per: "/ course",
    cta: "Browse courses",
    href: "/courses",
    featured: true,
    perks: [
      "Every module & video unlocked",
      "Tests between lessons",
      "Lifetime access, no subscription",
      "Certificate on completion",
    ],
  },
  {
    name: "Teach",
    note: "For tutors",
    price: "₹0",
    per: "to publish",
    cta: "Become a tutor",
    href: "/become-tutor",
    perks: [
      "Upload videos & build modules",
      "Add tests anywhere",
      "Earn on every sale",
      "Tutor analytics",
    ],
  },
];

export const faqs = [
  {
    q: "Is the first video really free?",
    a: "Yes. The first video of every course is free to watch, no card needed. If you like it, buy the course to unlock everything else.",
  },
  {
    q: "Do I pay monthly?",
    a: "No subscriptions. You pay once per course and keep access to it, including future updates the tutor adds.",
  },
  {
    q: "What are the tests between lessons?",
    a: "Short quizzes that tutors place between videos. Some are checkpoints you need to pass before the next part unlocks, and you see explanations after each attempt.",
  },
  {
    q: "Do I get a certificate?",
    a: "When you finish every lesson and pass the tests, you get a certificate with a unique verification code you can share.",
  },
  {
    q: "How do I become a tutor?",
    a: "Create an account and apply on the Become a tutor page. Once our team approves you, you can build courses, upload videos and submit them for review.",
  },
  {
    q: "Can I watch on my phone?",
    a: "Yes. Courses work in any modern browser on phone, tablet or laptop, and your progress syncs across all of them.",
  },
];

export const footerLinks = [
  { label: "Courses", href: "/courses" },
  { label: "Become a tutor", href: "/become-tutor" },
  { label: "Log in", href: "/login" },
  { label: "Sign up", href: "/signup" },
  { label: "Admin login", href: "/admin" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];
