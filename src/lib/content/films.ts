import type { MediaKey } from "@/lib/media";
import { DIRECTOR } from "./director";
import { FLAGSHIP } from "./site";

/* =============================================================================
   WORK PAGE (/films -> src/components/films/*). Server- and client-safe.
   The showcase: learner and studio work made with generative tools (short films,
   movie trailers, brand films, reels, music videos).
   ALL OF THIS IS SAMPLE COPY: stand-in makers, stand-in stills (media.ts still-*
   keys). The page says so. Swap in real cohort work (and real stills) at launch;
   keep the shape. Layout (sizes, scatter) lives in the component, not here.
   ============================================================================= */

export type Film = {
  slug: string;
  title: string;
  maker: string;
  city: string;
  /** the format of the piece */
  kind: "Short film" | "Movie trailer" | "Brand film" | "Reel" | "Music video";
  year: number;
  /** m:ss */
  runtime: string;
  tools: string[];
  still: MediaKey;
  logline: string;
  /** an excerpt of the key shot's prompt, as written by the maker */
  prompt: string;
  /** which shot the prompt is from */
  shot: string;
};

export const FILMS: Film[] = [
  {
    slug: "monsoon-static",
    title: "Monsoon Static",
    maker: DIRECTOR.name,
    city: "Mumbai",
    kind: "Short film",
    year: 2025,
    runtime: "1:00",
    tools: ["Flux", "Kling", "ElevenLabs", "Suno", "DaVinci Resolve"],
    still: "still-lightning-lake",
    logline: "During a Mumbai downpour, a boy waits for the power to come back so he can hear the end of a cricket match on the radio.",
    prompt:
      "Extreme wide, 24mm, locked off. Orange lightning forks over a black lake; a small wooded island in silhouette. Long exposure feel, rain haze, no people. Hold for the second strike.",
    shot: "Shot 01 · Establishing",
  },
  {
    slug: "umbrella-season",
    title: "Umbrella Season",
    maker: "Riya Menon",
    city: "Kochi",
    kind: "Short film",
    year: 2026,
    runtime: "0:58",
    tools: ["Midjourney", "Veo", "ElevenLabs", "DaVinci Resolve"],
    still: "still-tokyo-crossing",
    logline: "A postwoman finishes her last round of the monsoon and realises the letter in her bag is addressed to her.",
    prompt:
      "Wide, 35mm, high angle from a first-floor balcony. A figure under a black umbrella crosses a rain-soaked street at night; red tail lights smear across the wet tar. Slow tilt down. Sodium practicals, cyan shop signs.",
    shot: "Shot 04 · The crossing",
  },
  {
    slug: "violet-hour",
    title: "Violet Hour",
    maker: "Kabir Shah",
    city: "Pune",
    kind: "Short film",
    year: 2026,
    runtime: "1:00",
    tools: ["Flux", "Runway", "Suno", "DaVinci Resolve"],
    still: "still-neon-alley",
    logline: "A night-shift nurse walks home through an empty city and counts the lit windows still waiting up for someone.",
    prompt:
      "Wide, 28mm, eye level, centred. An empty street at 3am in violet and teal neon, puddles holding the signs. Static for two seconds, then a slow push-in. No people. Light haze.",
    shot: "Shot 01 · Empty street",
  },
  {
    slug: "red-mile",
    title: "Red Mile",
    maker: "Aarav Jain",
    city: "Jaipur",
    kind: "Movie trailer",
    year: 2026,
    runtime: "1:30",
    tools: ["Midjourney", "Kling", "Suno", "DaVinci Resolve"],
    still: "still-desert-road",
    logline: "Trailer for a feature in development: two brothers drive their late father's truck to the edge of the desert to keep a promise neither of them understands.",
    prompt:
      "Extreme wide, 50mm, low on the tarmac. An empty road runs straight between red sandstone rocks to the horizon. Midday heat shimmer. Locked off. Faded Kodachrome palette, fine grain.",
    shot: "Shot 02 · The road",
  },
  {
    slug: "the-gate",
    title: "The Gate Keeps Nothing",
    maker: "Ishaan Bose",
    city: "Kolkata",
    kind: "Movie trailer",
    year: 2026,
    runtime: "2:00",
    tools: ["Flux", "Veo", "ElevenLabs", "Topaz Video"],
    still: "still-fog-castle",
    logline: "Trailer for a feature in development: an old watchman guards the gate of a fort the town forgot, until the fog brings someone back.",
    prompt:
      "Wide, 35mm, eye level. A stone gateway disappearing into thick fog, wet moss on the arch. Very slow dolly in. Grey dawn light, no sun, a single lantern glowing just inside the arch.",
    shot: "Shot 06 · The arch",
  },
  {
    slug: "one-sail",
    title: "One Sail",
    maker: "Ananya Iyer",
    city: "Chennai",
    kind: "Short film",
    year: 2026,
    runtime: "1:00",
    tools: ["Midjourney", "Runway", "Suno", "DaVinci Resolve"],
    still: "still-night-lake",
    logline: "A fisherman's daughter takes the boat out alone on the one night her father can't.",
    prompt:
      "Wide, 24mm, eye level from the shore. A lone sailboat on a mirror-still lake under the Milky Way. Locked off, 6 seconds. Starlight only, faint blue on the water, the sail barely lit.",
    shot: "Shot 11 · Alone",
  },
  {
    slug: "saltwater-hymn",
    title: "Saltwater Hymn",
    maker: DIRECTOR.name,
    city: DIRECTOR.city,
    kind: "Music video",
    year: 2024,
    runtime: "3:20",
    tools: ["Midjourney", "Veo", "Kling", "DaVinci Resolve"],
    still: "still-skyline-dusk",
    logline: "A music video for an independent singer: a city seen only from the water, on the evening its lights come back on.",
    prompt:
      "Wide, 85mm from a ferry deck. A city skyline across the water at dusk, windows switching on floor by floor. Static, a slight sway of the boat. Pink-violet sky, cool water, warm windows, a low moon.",
    shot: "Shot 01 · The city",
  },
  {
    slug: "ember",
    title: "Ember",
    maker: "Meher Gill",
    city: "Chandigarh",
    kind: "Short film",
    year: 2026,
    runtime: "0:52",
    tools: ["Flux", "Kling", "ElevenLabs", "DaVinci Resolve"],
    still: "still-red-sunset",
    logline: "A potter fires her last kiln before the village is relocated, and refuses to let the fire go out.",
    prompt:
      "Extreme wide, 200mm compression. A red sun sinking into a dark horizon line, heat haze bending the edge. Locked off. Deep red and black only, no sky detail. Hold until the sun touches.",
    shot: "Shot 14 · Last light",
  },
  {
    slug: "orbit-alone",
    title: "Orbit, Alone",
    maker: "Nikhil Pillai",
    city: "Thiruvananthapuram",
    kind: "Movie trailer",
    year: 2026,
    runtime: "1:45",
    tools: ["Midjourney", "Veo", "Suno", "Topaz Video"],
    still: "still-astronaut",
    logline: "Trailer for a feature in development: the first astronaut from a small coastal town hears her grandmother's voice on the station radio.",
    prompt:
      "Wide, 35mm. An astronaut floats in black space above the curve of the Earth, tethered, perfectly still. Very slow roll of the camera, 8 seconds. Hard sunlight from frame right, no fill.",
    shot: "Shot 08 · The window",
  },
  {
    slug: "before-the-storm",
    title: "Before the Storm",
    maker: "Tanvi Rao",
    city: "Hyderabad",
    kind: "Short film",
    year: 2026,
    runtime: "0:59",
    tools: ["Flux", "Runway", "ElevenLabs", "DaVinci Resolve"],
    still: "still-tornado",
    logline: "A farmer races the weather to bring his cattle home, and finds his son already out in the field.",
    prompt:
      "Extreme wide, 24mm, low over green crops. A tornado touches down beyond the field under black clouds. Handheld, slight breathing. Flat green light, wind moving the crops toward camera.",
    shot: "Shot 05 · The funnel",
  },
  {
    slug: "night-drive",
    title: "Night Drive",
    maker: "Sana Qureshi",
    city: "Lucknow",
    kind: "Brand film",
    year: 2026,
    runtime: "0:30",
    tools: ["Flux", "Veo", "Suno", "DaVinci Resolve"],
    still: "still-car-neon",
    logline: "A 30-second spot for an electric car: one city, one night, and nobody else on the road.",
    prompt:
      "Low tracking shot, 35mm, bumper height. A car glides through a wet city street at night; neon signs smear across the bodywork and the puddles. Smooth, steady, no shake. Magenta and cyan reflections, deep black sky, no logos.",
    shot: "Shot 03 · The glide",
  },
  {
    slug: "afterparty",
    title: "Afterparty",
    maker: "Dev Malhotra",
    city: "Delhi",
    kind: "Reel",
    year: 2026,
    runtime: "0:30",
    tools: ["Flux", "Runway", "Suno", "DaVinci Resolve"],
    still: "still-warehouse-haze",
    logline: "A 30-second vertical reel: three friends leave a warehouse party at dawn and realise only two of them are walking home.",
    prompt:
      "Wide, 35mm, from behind at waist height. Silhouettes walking through a hazy warehouse toward a pink and blue light at the far end. Slow follow. Heavy haze, backlight only, shadows long on the floor.",
    shot: "Shot 12 · Walking out",
  },
  {
    slug: "lantern-lane",
    title: "Lantern Lane",
    maker: "Zara Khan",
    city: "Bhopal",
    kind: "Brand film",
    year: 2026,
    runtime: "0:30",
    tools: ["Midjourney", "Veo", "ElevenLabs", "DaVinci Resolve"],
    still: "still-neon-signs",
    logline: "A Diwali spot for a family-run lantern shop: the apprentice stays up all night to finish one lantern for a customer who hasn't paid.",
    prompt:
      "Medium wide, 50mm, eye level. A red paper lantern glowing in a blue night alley lined with signs. Static, the lantern turning slightly in the wind. Red key on the lantern, cool blue everywhere else.",
    shot: "Shot 03 · The lantern",
  },
  {
    slug: "take-two",
    title: "Take Two",
    maker: "Karan Mehta",
    city: "Ahmedabad",
    kind: "Reel",
    year: 2026,
    runtime: "0:20",
    tools: ["Flux", "Kling", "ElevenLabs", "DaVinci Resolve"],
    still: "still-cinema-neon",
    logline: "A 20-second reel for a casting page: a junior artist gets one line in a film, and one chance to say it.",
    prompt:
      "Extreme close-up, 100mm macro. A pair of eyes framed between clapperboard stripes, red light from the left, blue from the right. Static. The clapper snaps shut on the cut.",
    shot: "Shot 02 · The slate",
  },
  {
    slug: "midnight-bloom",
    title: "Midnight Bloom",
    maker: "Siddharth Varma",
    city: "Visakhapatnam",
    kind: "Brand film",
    year: 2026,
    runtime: "0:15",
    tools: ["Midjourney", "Flux", "Runway", "DaVinci Resolve"],
    still: "still-product-ad",
    logline: "A 15-second perfume spot for a homegrown label: one bottle, one beam of light, one slow turn.",
    prompt:
      "Product hero, 100mm macro, locked off on a black sweep. A glass perfume bottle turns slowly on a mirrored base; a single hard light carves the edges, a thin haze behind. Rich blacks, one warm highlight, no label text.",
    shot: "Shot 01 · Hero product",
  },
  {
    slug: "night-shift-at-hanle",
    title: "Night Shift at Hanle",
    maker: "Aditi Deshmukh",
    city: "Nagpur",
    kind: "Short film",
    year: 2026,
    runtime: "1:00",
    tools: ["Flux", "Veo", "ElevenLabs", "Suno", "Topaz Video"],
    still: "still-starry-peak",
    logline: "An astronomer at India's highest observatory spends her birthday alone with the sky, and is not lonely.",
    prompt:
      "Extreme wide, 20mm, low on the ridge. A starry purple night sky over a mountain ridge, the Milky Way arching overhead. Locked off, 8 seconds. Starlight only, faint airglow green at the horizon.",
    shot: "Shot 10 · The sky",
  },
];

/** Page copy. */
export const FILMS_PAGE = {
  label: "Work",
  kicker: "Made with AI",
  title: "Work",
  hint: "Scroll / Drag",
  hintTouch: "Swipe / Scroll",
  count: `${FILMS.length} pieces`,
  note: "Short films, movie trailers, brand films, reels and music videos. Every frame generated, every decision human.",
  sample: "Sample showcase: titles, makers and stills are stand-ins until the first cohort's work lands.",
  views: { canvas: "Canvas", grid: "Grid" },
  cta: {
    label: "Make your own",
    title: "Every piece here started as one idea.",
    red: ["idea"],
    body: "Start with the film course: ten modules from the first prompt to a finished 60-second short. Standout work earns a slot on this page, and a look from the studio for paid Tamada Media productions.",
    primary: { label: "See the film course", href: FLAGSHIP.href },
    secondary: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
  },
} as const;

/** Distinct tools across the showcase (for the CTA band's numbers). */
export const FILM_TOOLS = Array.from(new Set(FILMS.flatMap((f) => f.tools)));

/** Average runtime as m:ss. */
export function averageRuntime(films: Film[] = FILMS) {
  const secs = films.map((f) => {
    const [m, s] = f.runtime.split(":").map(Number);
    return m * 60 + s;
  });
  const avg = Math.round(secs.reduce((a, b) => a + b, 0) / Math.max(1, secs.length));
  return `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, "0")}`;
}
