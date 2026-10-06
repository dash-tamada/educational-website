/* =============================================================================
   Older, already-answered lesson Q&A threads (ids "xcmt_*"), first written for
   the player and now part of the seed, so the tutor inbox, admin reports and
   the store's likes / reports treat them like every other comment.

   Raw thread data only: activity.ts turns them into LessonComment rows, checks
   that each asker could actually see that lesson on that date (free preview,
   or enrolled before asking) and swaps in an enrolled learner when not.
   ============================================================================= */

export type PlayerThread = {
  course: string;
  /** the course's tutor (answers as a reply) */
  tutor: string;
  item: string;
  user: string;
  days: number;
  q: string;
  a: string;
  likes: number;
  /** a follow-up reply from [userId, body] */
  follow?: [string, string];
};

export const PLAYER_THREADS: PlayerThread[] = [
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-1-1",
    user: "u_s022",
    days: 52,
    q: "Does it matter which browser I use for this course? I'm on Brave.",
    a: "Brave is Chromium underneath, so everything in the course works the same. The dev tools I show are identical.",
    likes: 8,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-1-1",
    user: "u_s037",
    days: 47,
    q: "What actually happens if two websites try to use the same domain?",
    a: "They can't. A domain is registered to one owner at a time, and DNS points it to exactly one place. Think of it like a phone number.",
    likes: 5,
    follow: ["u_s037", "That analogy finally made DNS click. Thank you!"],
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-1-2",
    user: "u_s008",
    days: 44,
    q: "Can I follow along on a Chromebook?",
    a: "Yes. Enable the Linux environment in Settings and install VS Code there, or use vscode.dev in the browser for the first three modules.",
    likes: 11,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-1-3",
    user: "u_s013",
    days: 41,
    q: "Why do we need alt text if the image is decorative?",
    a: 'For decorative images, use alt="" (empty). Screen readers then skip it. Only meaningful images need a description.',
    likes: 14,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-1-3",
    user: "u_s025",
    days: 38,
    q: "Is <br> bad practice? My college teacher said never use it.",
    a: "Not bad, just often misused. It's fine for line breaks inside an address or a poem. Don't use it to create spacing; that's CSS's job.",
    likes: 9,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-2-1",
    user: "u_s031",
    days: 30,
    q: "box-sizing: border-box on everything, is that a hack?",
    a: "It's the default most teams use. It makes width include padding and border, which matches how you think about boxes. Keep it.",
    likes: 17,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-2-2",
    user: "u_s049",
    days: 27,
    q: "justify-content isn't doing anything on my column layout.",
    a: "With flex-direction: column the main axis is vertical, so justify-content works top to bottom. Give the container a height and you'll see it.",
    likes: 6,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-3-1",
    user: "u_s006",
    days: 21,
    q: "Should I design mobile-first even if most of my users are on desktop?",
    a: "Mobile-first is about writing simpler base CSS and adding complexity upwards. It still pays off on desktop-heavy sites.",
    likes: 7,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-3-2",
    user: "u_s017",
    days: 18,
    q: "What breakpoints do you personally use?",
    a: "I start with none and add one when the layout breaks. Usually that lands around 640px, 1024px and 1280px.",
    likes: 12,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-4-1",
    user: "u_s029",
    days: 9,
    q: "When do I use let and when const?",
    a: "Default to const. Switch to let only when you actually need to reassign, like a counter in a loop.",
    likes: 10,
  },
  {
    course: "crs_webdev",
    tutor: "u_arjun",
    item: "wd-4-2",
    user: "u_s010",
    days: 6,
    q: "Can a function return two values?",
    a: "Return an object or an array: return { total, count }. Then destructure it where you call the function.",
    likes: 4,
  },
  {
    course: "crs_guitar",
    tutor: "u_kabir",
    item: "gt-1-1",
    user: "u_s023",
    days: 15,
    q: "Acoustic or electric for a complete beginner?",
    a: "Whatever you'll actually pick up every day. Acoustic builds finger strength faster; electric is easier on the fingers.",
    likes: 9,
  },
  {
    course: "crs_guitar",
    tutor: "u_kabir",
    item: "gt-1-2",
    user: "u_s041",
    days: 12,
    q: "My fingertips hurt after 10 minutes. Normal?",
    a: "Totally normal for the first two weeks. Practise in short bursts of 10 minutes, three times a day, and calluses will form.",
    likes: 13,
  },
  {
    course: "crs_colour",
    tutor: "u_meera",
    item: "cl-1-1",
    user: "u_s024",
    days: 70,
    q: "Is value more important than hue?",
    a: "For readability, yes. If a design works in greyscale, it will almost always work in colour.",
    likes: 16,
  },
  {
    course: "crs_python",
    tutor: "u_arjun",
    item: "py-1-1",
    user: "u_s035",
    days: 25,
    q: "Jupyter or VS Code for this course?",
    a: "Either works. I use Jupyter in the videos because you see output right under each cell.",
    likes: 6,
  },
];
