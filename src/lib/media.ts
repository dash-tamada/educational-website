/* =============================================================================
   IMAGE REGISTRY  (server- and client-safe, no React)
   -----------------------------------------------------------------------------
   Every photo on the site is referenced BY KEY from this one file, with its alt
   text and credit. To swap an image later, change only the entry here (keep the
   key): every page that uses the key follows.

     import { media, mediaSrc, FILM_STILLS, lessonPoster } from "@/lib/media";
     const m = media("director-hero");          // { src, alt, credit, pos?, tone? }
     <Image src={cropSrc(m.src, 5 / 4)} alt={m.alt} fill sizes="50vw"
            className="object-cover" style={{ objectPosition: m.pos }} />

   - `src` is a bare Unsplash URL; the next/image custom loader (src/lib/image-loader.ts)
     adds w/q/auto=format, and cropSrc() from "@/lib/img" adds an aspect-correct crop.
   - Your own files: drop them in /public/media/… and set src: "/media/…" (served as-is).
   - `pos` = CSS object-position for the subject (default "50% 50%").
   - `tone` = how dark the photo is ("dark" photos take cream text on top).
   - Credits: free Unsplash images (Unsplash License). Replace with the owner's own
     stills/portraits before launch. Director / team / learner portraits are STAND-INS
     (the alt text is written in-world); swap in real photos of the real people.
   - Every id below was checked (HTTP 200, image/jpeg) and looked at in a contact sheet.
     Shape notes: [P] portrait frame, [L] landscape frame, [S] square.
   ============================================================================= */

export type MediaItem = {
  src: string;
  alt: string;
  credit: string;
  /** CSS object-position of the subject, e.g. "50% 30%" */
  pos?: string;
  /** "dark" = cream text reads on top */
  tone?: "dark" | "light";
};

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;
const UNSPLASH = "Unsplash (free licence)";

const MEDIA = {
  /* ---- Lead director (Arjun Rao): dramatic low-key portraits -------------------- */
  // [P 4:5] Tight, side-lit face on near-black; face sits right of centre, black space
  // on the left for type. In wide crops it becomes an eyes-to-mouth extreme close-up.
  "director-hero": { src: u("1545996124-0501ebae84d0"), alt: "Arjun Rao, lead director, half his face lit from the side against black", credit: UNSPLASH, pos: "68% 40%", tone: "dark" },
  // [L 3:2] Same type (dark hair, full beard); daylight, hazy city behind, face on the right third.
  "director-portrait": { src: u("1607346256330-dee7af15f7c5"), alt: "Arjun Rao, lead director at Tamada Media", credit: UNSPLASH, pos: "68% 42%", tone: "light" },
  // [L 3:2] Backlit silhouette of a camera operator in haze; identity hidden, reads as Arjun.
  "director-on-set": { src: u("1576280314550-773c50583407"), alt: "Arjun Rao silhouetted behind a camera, backlit by a haze light on set", credit: UNSPLASH, pos: "60% 40%", tone: "dark" },

  /* ---- Team portraits (plain studio backdrops) ------------------------------------ */
  "team-producer": { src: u("1629425733761-caae3b5f2e50"), alt: "Portrait of the Tamada Media producer, smiling, arms folded", credit: UNSPLASH, pos: "45% 20%", tone: "light" },
  "team-editor": { src: u("1602442787305-decbd65be507"), alt: "Portrait of the Tamada Media edit and colour lead", credit: UNSPLASH, pos: "45% 32%", tone: "dark" },
  "team-sound": { src: u("1600180758890-6b94519a8ba6"), alt: "Portrait of the Tamada Media sound and music lead", credit: UNSPLASH, pos: "50% 35%", tone: "light" },
  "team-technologist": { src: u("1531746020798-e6953c6e8e04"), alt: "Portrait of the Tamada Media AI pipeline lead", credit: UNSPLASH, pos: "50% 38%", tone: "light" },

  /* ---- Learner portraits (testimonials, clearly labelled samples) ---------------- */
  "learner-1": { src: u("1558507652-2d9626c4e67a"), alt: "Portrait of a course learner, smiling outdoors", credit: UNSPLASH, pos: "52% 60%" },
  "learner-2": { src: u("1595152772835-219674b2a8a6"), alt: "Portrait of a course learner, laughing", credit: UNSPLASH, pos: "52% 42%", tone: "dark" },
  "learner-3": { src: u("1544725176-7c40e5a71c5e"), alt: "Portrait of a course learner, smiling", credit: UNSPLASH, pos: "50% 40%" },
  "learner-4": { src: u("1654110455429-cf322b40a906"), alt: "Portrait of a course learner in glasses", credit: UNSPLASH, pos: "50% 40%", tone: "light" },

  /* ---- Cinematic film stills (films page, showreel, drag canvas) ------------------ */
  "still-neon-alley": { src: u("1519608487953-e999c86e7455"), alt: "Empty neon-lit street at night in violet and teal", credit: UNSPLASH, tone: "dark" },
  "still-tokyo-crossing": { src: u("1519692933481-e162a57d6721"), alt: "A figure under an umbrella crossing a rain-soaked city street at night", credit: UNSPLASH, pos: "45% 60%", tone: "dark" },
  "still-desert-road": { src: u("1500530855697-b586d89ba3ee"), alt: "Empty road running between red desert rocks", credit: UNSPLASH },
  "still-fog-castle": { src: u("1518709268805-4e9042af9f23"), alt: "Stone castle gate disappearing into fog", credit: UNSPLASH, tone: "dark" },
  "still-night-lake": { src: u("1534447677768-be436bb09401"), alt: "A lone sailboat on a still lake under the Milky Way", credit: UNSPLASH, tone: "dark" },
  "still-mountain-mist": { src: u("1506905925346-21bda4d32df4"), alt: "Mountain peaks rising above a sea of clouds at dusk", credit: UNSPLASH },
  "still-red-sunset": { src: u("1495567720989-cebdbdd97913"), alt: "A red sun sinking below a dark horizon", credit: UNSPLASH, tone: "dark" },
  "still-earth-orbit": { src: u("1446776811953-b23d57bd21aa"), alt: "Earth seen from orbit, clouds over the ocean", credit: UNSPLASH, tone: "dark" },
  "still-teal-storm": { src: u("1478760329108-5c3ed9d495a0"), alt: "Dark teal storm clouds", credit: UNSPLASH, tone: "dark" },
  "still-hands-light": { src: u("1478147427282-58a87a120781"), alt: "Raised hands silhouetted against a stage light", credit: UNSPLASH, tone: "dark" },
  "still-cloud-rays": { src: u("1500835556837-99ac94a94552"), alt: "Sun rays breaking through towering clouds", credit: UNSPLASH },
  "still-explorer-ridge": { src: u("1492691527719-9d1e07e534b4"), alt: "A lone photographer on a rocky ridge above the clouds", credit: UNSPLASH },
  "still-city-canyon": { src: u("1449824913935-59a10b8d2000"), alt: "A city avenue between tall skyscrapers", credit: UNSPLASH },
  "still-retro-tech": { src: u("1550745165-9bc0b252726f"), alt: "Retro computers and consoles in pink and blue light", credit: UNSPLASH, tone: "dark" },
  "still-vr-figure": { src: u("1593508512255-86ab42a8e620"), alt: "A man in a VR headset lit in blue", credit: UNSPLASH, tone: "dark" },
  "still-arcade-glow": { src: u("1511512578047-dfb367046420"), alt: "A dark arcade room glowing with neon screens", credit: UNSPLASH, tone: "dark" },
  "still-starry-peak": { src: u("1419242902214-272b3f66ee7a"), alt: "A starry purple night sky over a mountain ridge", credit: UNSPLASH, tone: "dark" },
  "still-lake-mirror": { src: u("1493246507139-91e8fad9978e"), alt: "Mountains mirrored in a turquoise lake", credit: UNSPLASH },
  "still-pastel-ridges": { src: u("1500964757637-c85e8a162699"), alt: "Layers of mountain ridges in pastel haze", credit: UNSPLASH },
  "still-skyline-dusk": { src: u("1514565131-fce0801e5785"), alt: "A city skyline across the water at dusk", credit: UNSPLASH },
  "still-neon-signs": { src: u("1528360983277-13d401cdc186"), alt: "A red paper lantern glowing in a blue night alley lined with signs", credit: UNSPLASH, pos: "35% 50%", tone: "dark" },
  "still-cinema-neon": { src: u("1585951237318-9ea5e175b891"), alt: "Eyes framed between clapperboard stripes in red and blue light", credit: UNSPLASH, tone: "dark" },
  "still-ink-abstract": { src: u("1567095761054-7a02e69e5c43"), alt: "Swirls of dark ink and red pigment", credit: UNSPLASH, tone: "dark" },
  "still-nebula": { src: u("1462331940025-496dfbfc7564"), alt: "A glowing nebula in deep space", credit: UNSPLASH, tone: "dark" },
  "still-astronaut": { src: u("1454789548928-9efd52dc4031"), alt: "An astronaut floating in black space above the curve of the Earth", credit: UNSPLASH, tone: "dark" },
  "still-tornado": { src: u("1527482797697-8795b05a13fe"), alt: "A tornado touching down beyond a green field under black clouds", credit: UNSPLASH, pos: "50% 40%", tone: "dark" },
  "still-fog-tree": { src: u("1505672678657-cc7037095e60"), alt: "A lone wind-bent tree on a green field in thick fog", credit: UNSPLASH, pos: "50% 40%" },
  "still-warehouse-haze": { src: u("1574391884720-bbc3740c59d1"), alt: "Silhouettes walking through a hazy warehouse towards a pink and blue light", credit: UNSPLASH, pos: "50% 65%", tone: "dark" },
  "still-lightning-lake": { src: u("1500674425229-f692875b0ab7"), alt: "Orange lightning over a dark lake with a small wooded island", credit: UNSPLASH, tone: "dark" },

  /* ---- Behind the scenes (set, gear, edit suite) --------------------------------- */
  "bts-clapper-desert": { src: u("1485846234645-a62644f84728"), alt: "A hand holding a clapperboard on a desert shoot", credit: UNSPLASH },
  "bts-clapper-set": { src: u("1515634928627-2a4e0dae3ddf"), alt: "A clapperboard marking a take on set", credit: UNSPLASH },
  "bts-slate-hands": { src: u("1594909122845-11baa439b7bf"), alt: "A crew member holding up a slate", credit: UNSPLASH },
  "bts-projector": { src: u("1478720568477-152d9b164e26"), alt: "A vintage projector throwing a beam through haze", credit: UNSPLASH, tone: "dark" },
  "bts-projector-beam": { src: u("1535016120720-40c646be5580"), alt: "A projector lens throwing a beam of light", credit: UNSPLASH, tone: "dark" },
  "bts-edit-timeline": { src: u("1574717024653-61fd2cf4d44d"), alt: "An edit timeline on a monitor", credit: UNSPLASH, tone: "dark" },
  "bts-film-reels": { src: u("1568876694728-451bbf694b83"), alt: "Film reels on a vintage projector in black and white", credit: UNSPLASH, tone: "dark" },
  "bts-film-strip": { src: u("1518676590629-3dcbd9c5a5c9"), alt: "A curl of film strip", credit: UNSPLASH },
  "bts-cinema-seats": { src: u("1489599849927-2ee91cede3ba"), alt: "Empty red cinema seats in the dark", credit: UNSPLASH, tone: "dark" },
  "bts-audience": { src: u("1517604931442-7e0c8ed2963c"), alt: "An audience watching a film in a dark cinema", credit: UNSPLASH, tone: "dark" },
  "bts-music-studio": { src: u("1598488035139-bdbb2231ce04"), alt: "A music studio desk with guitars on the wall", credit: UNSPLASH, tone: "dark" },
  "bts-microphone": { src: u("1516280440614-37939bbacd81"), alt: "A studio microphone in warm light", credit: UNSPLASH, tone: "dark" },
  "bts-code-monitors": { src: u("1534972195531-d756b9bfa9f2"), alt: "A workstation with code and a landscape on two monitors", credit: UNSPLASH, tone: "dark" },
  "bts-camera-rig": { src: u("1601506521793-dc748fc80b67"), alt: "A camera operator building a shoulder rig with a monitor in blue studio light", credit: UNSPLASH, pos: "55% 40%", tone: "dark" },
  "bts-crew-location": { src: u("1518929458119-e5bf444c30f4"), alt: "A film crew laying dolly track and rigging a camera cart on a desert western set", credit: UNSPLASH, pos: "60% 60%" },
  "bts-director-monitor": { src: u("1497015289639-54688650d173"), alt: "A cinema camera with field monitors framing an interview in a library", credit: UNSPLASH, pos: "70% 35%", tone: "dark" },
  "bts-lighting-setup": { src: u("1471341971476-ae15ff5dd4ea"), alt: "A studio lit with softboxes and a ceiling lighting grid", credit: UNSPLASH, tone: "dark" },
  "bts-handheld-operator": { src: u("1543242594-c8bae8b9e708"), alt: "A camera operator with a handheld rig and monitor filming a group conversation", credit: UNSPLASH, pos: "70% 40%" },
  "bts-cinema-camera": { src: u("1532800783378-1bed60adaf58"), alt: "An operator with a cinema camera filming an actor by a bright studio window", credit: UNSPLASH, pos: "40% 40%" },
  "bts-studio-camera": { src: u("1594394489098-74ac04c0fc2e"), alt: "A camera on a tripod, its monitor showing the framed studio set behind", credit: UNSPLASH, pos: "65% 45%", tone: "dark" },

  /* ---- Course covers -------------------------------------------------------------- */
  // [P 2:3] cinema camera on a tripod head, neon streaks; centre-crops well to 16:9.
  "course-flagship": { src: u("1490971588422-52f6262a237a"), alt: "A cinema camera rig under pink and blue neon light", credit: UNSPLASH, pos: "50% 62%", tone: "dark" },
  "course-music-videos": { src: u("1601506521937-0121a7fc2a6b"), alt: "A camera rig filming a dancer in a blue studio lined with LED tubes", credit: UNSPLASH, pos: "55% 50%", tone: "dark" },
  "course-ads": { src: u("1527011046414-4781f1f94f8c"), alt: "A bright product studio set with softboxes and a white backdrop", credit: UNSPLASH, pos: "50% 55%", tone: "light" },

  /* ---- Lesson posters (one per module; M11 = capstone) ---------------------------- */
  "poster-m01": { src: u("1550439062-609e1531270e"), alt: "Module 1: the AI film stack. A creator at a desk of three glowing monitors, from above", credit: UNSPLASH, tone: "dark" },
  "poster-m02": { src: u("1471107340929-a87cd0f5b5f3"), alt: "Module 2: story and script. A fountain pen on a blank notebook", credit: UNSPLASH, tone: "light" },
  "poster-m03": { src: u("1500964757637-c85e8a162699"), alt: "Module 3: look development. Mountain ridges in pastel haze", credit: UNSPLASH, tone: "light" },
  "poster-m04": { src: u("1497316730643-415fac54a2af"), alt: "Module 4: prompting the shot. A silhouette lining up a shot at sunset", credit: UNSPLASH, pos: "50% 45%", tone: "dark" },
  "poster-m05": { src: u("1527066579998-dbbae57f45ce"), alt: "Module 5: image to video. Star trails circling the night sky", credit: UNSPLASH, tone: "dark" },
  "poster-m06": { src: u("1640960543409-dbe56ccc30e2"), alt: "Module 6: characters and continuity. A profile in silhouette against red", credit: UNSPLASH, pos: "55% 40%", tone: "dark" },
  "poster-m07": { src: u("1516280440614-37939bbacd81"), alt: "Module 7: voice and lip-sync. A studio microphone in warm light", credit: UNSPLASH, tone: "dark" },
  "poster-m08": { src: u("1598488035139-bdbb2231ce04"), alt: "Module 8: music and sound design. A music studio desk", credit: UNSPLASH, tone: "dark" },
  "poster-m09": { src: u("1574717025058-2f8737d2e2b7"), alt: "Module 9: edit and grade. An edit timeline with colour wheels on a laptop", credit: UNSPLASH, tone: "dark" },
  "poster-m10": { src: u("1478720568477-152d9b164e26"), alt: "Module 10: finish and release. A projector beam through haze", credit: UNSPLASH, tone: "dark" },
  "poster-m11": { src: u("1595769816263-9b910be24d5f"), alt: "Capstone: your 60-second short. An empty screening room facing a blank screen", credit: UNSPLASH, tone: "dark" },

  /* ---- Journal covers (one per post; keys match post slugs in src/lib/content) ---- */
  "journal-camera-language": { src: u("1532800783378-1bed60adaf58"), alt: "An operator framing an actor through a cinema camera", credit: UNSPLASH, pos: "40% 40%" },
  "journal-consistent-characters": { src: u("1515202913167-d9a698095ebf"), alt: "A woman in profile, hair falling over her face, in a dim teal room", credit: UNSPLASH, pos: "55% 12%", tone: "dark" },
  "journal-credits-budget": { src: u("1593062096033-9a26b09da705"), alt: "A laptop on a wooden desk under a lamp at night", credit: UNSPLASH, tone: "dark" },
  "journal-sound-half": { src: u("1478737270239-2f02b77fc618"), alt: "A condenser microphone in a shock mount in a dark studio", credit: UNSPLASH, tone: "dark" },
  "journal-sixty-seconds": { src: u("1585951237313-1979e4df7385"), alt: "A clapperboard raised in pink and violet light, ready for the take", credit: UNSPLASH, tone: "dark" },
  "journal-grade-the-feeling": { src: u("1517511620798-cec17d428bc0"), alt: "A city skyline in silhouette over water, graded teal and orange", credit: UNSPLASH, tone: "dark" },
  "journal-rights-disclosure": { src: u("1543536448-d209d2d13a1c"), alt: "A red film strip curling away from a reel on a white table", credit: UNSPLASH, tone: "light" },
  "journal-monsoon-diary": { src: u("1610741083757-1ae88e1a17f7"), alt: "Rain streaming down a window onto a wet street of traffic lights", credit: UNSPLASH, tone: "light" },
} satisfies Record<string, MediaItem>;

export type MediaKey = keyof typeof MEDIA;

/** The registry entry for `key`. */
export function media(key: MediaKey): MediaItem {
  return MEDIA[key];
}
/** Just the src for `key`. */
export function mediaSrc(key: MediaKey): string {
  return MEDIA[key].src;
}
/** Every key (handy for QA contact sheets). */
export const MEDIA_KEYS = Object.keys(MEDIA) as MediaKey[];

/** Cinematic stills in display order (films page, drag canvas, showreel). */
export const FILM_STILLS = MEDIA_KEYS.filter((k) => k.startsWith("still-"));
/** Behind-the-scenes set photos. */
export const BTS_PHOTOS = MEDIA_KEYS.filter((k) => k.startsWith("bts-"));
/** Lesson posters, index 0 = module 1 … index 10 = capstone (module 11). */
export const LESSON_POSTERS = MEDIA_KEYS.filter((k) => k.startsWith("poster-"));

/** Poster for a 1-based module number (wraps past the capstone). */
export function lessonPoster(moduleNumber: number): MediaItem {
  const i = Math.max(0, Math.floor(moduleNumber) - 1) % LESSON_POSTERS.length;
  return MEDIA[LESSON_POSTERS[i]];
}
