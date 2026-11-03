import { mediaSrc } from "@/lib/media";
import type { CourseSeed } from "./dsl";
import { daysAgo } from "./util";

/* Internal, non-public courses: the two bonus packs Arjun is building. They power the
   tutor studio (a draft in the builder, one in review) and the admin course-review queue.
   Neither is published, so neither appears on public pages. */
export const MORE_COURSES: CourseSeed[] = [
  /* ------------------------------------------------------------------------- AI Music Videos (draft) */
  {
    id: "crs_aimv",
    code: "mv",
    slug: "ai-music-videos-bonus",
    tutorId: "u_arjun",
    categoryId: "cat_musicvideo",
    title: "AI Music Videos (bonus pack)",
    promise: "Cut AI visuals to the beat: performance, lyric and dream-sequence videos for real tracks.",
    description:
      "A bonus pack for AI Filmmaking graduates. Take a real track, find its visual idea, and build a full music video: beat maps, performance shots with lip-sync, lyric moments and a dream sequence, cut to the drop. Still being recorded.",
    thumbnail: mediaSrc("course-music-videos"),
    tone: "hotpink",
    level: "Intermediate",
    language: "English",
    price: 1499,
    status: "draft",
    tags: ["AI Music Videos", "Editing", "Lip-sync"],
    outcomes: [
      "Turn a track into a visual treatment",
      "Map shots to the beat before you generate",
      "Make performance shots that sync to vocals",
      "Cut a full video that hits every drop",
    ],
    requirements: ["AI Filmmaking: Prompt to Premiere, or the same skills"],
    rating: 0,
    learners: 0,
    createdAt: daysAgo(21),
    updatedAt: daysAgo(1),
    modules: [
      {
        t: "Hear it, then see it",
        items: [
          ["v", "Finding the visual idea in a track", "Lyrics, mood and tempo into one clear visual concept.", "9:40"],
          ["v", "Beat maps and shot timing", "Mark the beats, bars and drops, then plan a shot for each.", "12:15"],
          ["r", "Treatment template", "A one-page music-video treatment, with an example.", "template", 160],
        ],
      },
      {
        t: "Performance and lyric shots",
        items: [
          ["v", "Performance shots that sync to vocals", "Close-ups, mids and wides of an AI performer, lip-synced to the verse.", "14:05"],
          ["v", "Lyric moments and typography", "When to put words on screen, and how to make them feel designed.", "10:30"],
          ["q", {
            t: "Performance check", pass: 70, tries: 0, gate: true,
            qs: [
              ["s", "Where do performance shots usually sync best?", ["*Front-facing close-ups during clear vocals", "Wide shots during the instrumental", "Back-of-head shots", "Fast whip-pans"], "Lip-sync needs a visible mouth and clean vocals."],
              ["tf", "A beat map is planned before any shot is generated.", true, "Timing first, then pictures: it saves credits and the edit."],
              ["sa", "What do we call the moment a track's energy lands after a build?", ["drop", "the drop"], "The drop: plan your biggest shot for it."],
            ],
          }],
        ],
      },
      {
        t: "Cut to the drop",
        items: [
          ["v", "Editing to the beat in Resolve", "Markers, cut points and the rhythm that makes a video feel inevitable.", "15:20"],
          ["v", "Release: covers, cut-downs and credits", "Square, vertical and widescreen versions, plus the credit line for AI tools.", "8:50"],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- AI Ads & Brand Films (in review) */
  {
    id: "crs_aiads",
    code: "ad",
    slug: "ai-ads-brand-films",
    tutorId: "u_arjun",
    categoryId: "cat_ads",
    title: "AI Ads & Brand Films (bonus)",
    promise: "Pitch, produce and deliver AI product spots and brand films that clients sign off on.",
    description:
      "A bonus pack on the paid side of AI filmmaking. Read a client brief, pitch a concept with style frames, make product shots that stay on-brand, and deliver a 30-second spot with every cut-down a brand asks for, plus pricing, rights and disclosure for commercial work.",
    thumbnail: mediaSrc("course-ads"),
    tone: "sun",
    level: "Intermediate",
    language: "English",
    price: 1999,
    status: "in_review",
    tags: ["Ads", "Brand films", "Client work"],
    outcomes: [
      "Turn a client brief into a pitch with style frames",
      "Generate product shots that stay on-brand",
      "Deliver a 30-second spot and its cut-downs",
      "Price, license and disclose commercial AI work",
    ],
    requirements: ["AI Filmmaking: Prompt to Premiere, or the same skills"],
    rating: 0,
    learners: 0,
    createdAt: daysAgo(48),
    updatedAt: daysAgo(2),
    submittedAt: daysAgo(2, 18, 20),
    modules: [
      {
        t: "From brief to pitch",
        items: [
          ["v", "Reading a client brief", "What the brand actually wants, what it fears, and the questions to ask first.", "9:15"],
          ["v", "Pitch decks with style frames", "Three concepts, one page each, with frames that sell the idea.", "12:40"],
          ["r", "Brief questionnaire and pitch template", "Send the questionnaire, fill the deck, win the job.", "template", 220],
          ["q", {
            t: "Brief check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "The first thing to agree with a client is…", ["The edit software", "*The goal, audience and deliverables", "Your favourite model", "The music genre"], "Goal, audience and deliverables define everything else."],
              ["tf", "Style frames in a pitch help a client approve a look before you spend video credits.", true, "Approve the look in stills; animate only what's signed off."],
              ["sa", "What do we call the shorter versions of an ad made for different placements?", ["cut-downs", "cutdowns", "cut downs"], "Cut-downs: the 15s, 6s and vertical versions."],
            ],
          }],
        ],
      },
      {
        t: "Product shots that stay on-brand",
        items: [
          ["v", "Product consistency: packs, labels and logos", "Keep the product exactly right in every frame, and fix it when it drifts.", "14:30"],
          ["v", "Hero shots: macro, splash and turntable", "The three shots every product film needs, prompted and animated.", "13:10"],
        ],
      },
      {
        t: "Deliver like a studio",
        items: [
          ["v", "The 30-second spot and its cut-downs", "Edit the master, then the 15s, 6s and vertical versions.", "12:05"],
          ["v", "Pricing, rights and AI disclosure for clients", "Quote the job, license the work and label it properly.", "11:20"],
          ["q", {
            t: "Delivery check", pass: 60, tries: 0, gate: false,
            qs: [
              ["m", "What should a commercial delivery include?", ["*The master spot", "*Cut-downs for each placement", "Your private prompt notes", "*A rights and disclosure note"], "Master, cut-downs and paperwork. Prompts stay yours."],
              ["tf", "Using a celebrity look-alike in an ad without consent is fine if it's AI-generated.", false, "Likeness rules apply to AI too. Get consent or don't use it."],
            ],
          }],
        ],
      },
    ],
  },
];
