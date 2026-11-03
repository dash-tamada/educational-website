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
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-1-1",
    user: "u_s022",
    days: 52,
    q: "Do I need a powerful PC for this course? I'm on a five-year-old laptop.",
    a: "No. Every generation runs in the cloud, in your browser. You only need a decent machine for the edit in module 9, and Resolve runs fine on most laptops at 1080p.",
    likes: 8,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-1-1",
    user: "u_s037",
    days: 47,
    q: "Is AI filmmaking even allowed on YouTube and Instagram?",
    a: "Yes. Both allow it. They ask you to label realistic AI content, and module 10 shows exactly where those toggles are. Be honest in the label and you're fine.",
    likes: 5,
    follow: ["u_s037", "That clears it up. Starting module 1 tonight!"],
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-1-2",
    user: "u_s008",
    days: 44,
    q: "Which video model should I pay for first if I can only afford one?",
    a: "Start with free tiers for all three in module 5 and see which suits your style. If I had to pick one today for a beginner, I'd take the one with the best start-and-end-frame control, because that's what saves rerolls.",
    likes: 11,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-1-3",
    user: "u_s013",
    days: 41,
    q: "Do unused credits roll over to the next month?",
    a: "Depends on the tool. Most monthly plans reset, top-up packs usually don't expire. The planner sheet in this module has a column for that so you never lose credits by surprise.",
    likes: 14,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-2-3",
    user: "u_s025",
    days: 38,
    q: "How many shots should a 60-second short have?",
    a: "Usually 12 to 20. Fewer, longer shots feel calm and cinematic; more cuts feel energetic. Start with 15 and let the edit decide.",
    likes: 9,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-3-2",
    user: "u_s031",
    days: 30,
    q: "My style frames all look like generic AI art. How do I get a real film look?",
    a: "Name real craft, not adjectives: a lens, a film stock, an era, a light source. 'Shot on 35mm, tungsten practicals, 1970s Bombay interior' beats 'cinematic, beautiful, 8K' every time.",
    likes: 17,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-4-1",
    user: "u_s049",
    days: 27,
    q: "Does writing '85mm lens' in a prompt actually change anything?",
    a: "It does on most image models: tighter framing, compressed background, softer depth. Video models listen less, which is why we lock the lens look in the still first.",
    likes: 6,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-4-3",
    user: "u_s006",
    days: 21,
    q: "Golden hour prompts keep coming out orange and flat. Any fix?",
    a: "Ask for the direction and the contrast, not just the time: 'low sun from camera left, long shadows, warm key, cool shadows'. Flat usually means the model has no idea where the light is.",
    likes: 7,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-5-1",
    user: "u_s017",
    days: 18,
    q: "What motion strength do you usually start at?",
    a: "Low. Around a third of the slider for dialogue and portraits, higher for action. It's easier to add energy than to fix a face that melted.",
    likes: 12,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-5-3",
    user: "u_s029",
    days: 9,
    q: "Can I combine a motion brush with a camera move in the same shot?",
    a: "In some tools, yes. Keep it simple though: one subject move plus one gentle camera move. Two big moves at once is where things fall apart.",
    likes: 10,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-6-2",
    user: "u_s010",
    days: 6,
    q: "My lead's face changes slightly in every shot. Is that normal?",
    a: "Very normal without references. Build the character sheet from lesson 1 and feed the same three reference images every time. Most of the drift disappears.",
    likes: 4,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-7-3",
    user: "u_s023",
    days: 15,
    q: "Lip-sync looks fine on the phone but off on my TV. Why?",
    a: "Bigger screens expose sync errors. Check your export frame rate matches the timeline, and nudge the audio a frame or two in Resolve. Frame rate mismatch is the usual culprit.",
    likes: 9,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-9-1",
    user: "u_s041",
    days: 12,
    q: "Resolve keeps stuttering when I play back AI clips. Help?",
    a: "Generate optimised media or proxies (right-click the clips in the media pool) and set playback to proxy. AI clips often come in odd codecs that are heavy to decode.",
    likes: 13,
  },
  {
    course: "crs_aifilm",
    tutor: "u_arjun",
    item: "af-9-3",
    user: "u_s024",
    days: 70,
    q: "Should I grade each clip or use one LUT for everything?",
    a: "Both, in order. Balance each clip first so they match, then put the look on a group or adjustment clip so the whole film shares one grade.",
    likes: 16,
  },
];
