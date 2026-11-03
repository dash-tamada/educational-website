import type { MediaKey } from "@/lib/media";
import { AUTHORS, type Author } from "./team";
import { FLAGSHIP } from "./site";

/* =============================================================================
   JOURNAL ("Studio Notes": /journal, /journal/[slug] -> src/components/journal/*).
   Server- and client-safe. Posts are written as typed blocks (no MDX):
     p | h2 | quote (red words) | image (media.ts key) | prompt (a PROMPT card) | list
   The home teaser (src/lib/content/home.ts JOURNAL_TEASER) is derived from these
   posts by slug (camera-language, consistent-characters, sixty-seconds): keep the
   slugs; edit titles, dates and excerpts here only. Read times are computed from
   the text (readMinutes), never typed. Covers are media.ts journal-<slug> keys. Tool names and plan details move fast: the posts are written
   method-first and hedge prices; re-check them when you edit.
   ============================================================================= */

export const JOURNAL_TAGS = ["Prompting", "Direction", "Sound", "Edit", "Tools"] as const;
export type JournalTag = (typeof JOURNAL_TAGS)[number];

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string; red: string[] }
  | { type: "image"; image: MediaKey; caption: string }
  | { type: "prompt"; label: string; tool: string; text: string; kind?: "Prompt" | "Template" }
  | { type: "list"; items: string[] };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tag: JournalTag;
  author: keyof typeof AUTHORS | string;
  /** read time in minutes, computed by readMinutes (reading + a minute per prompt card to try it) */
  minutes: number;
  cover: MediaKey;
  body: Block[];
};

const POSTS_UNSORTED: Omit<Post, "minutes">[] = [
  /* ------------------------------------------------------------------ monsoon */
  {
    slug: "monsoon-diary",
    title: "Monsoon diary: one minute, one wet week",
    excerpt: "A production diary from Monsoon Static: seven evenings, fourteen shots, about ₹1,800 of credits and the three decisions that saved the film.",
    date: "2026-10-28",
    tag: "Direction",
    author: "arjun",
    cover: "journal-monsoon-diary",
    body: [
      { type: "p", text: "Monsoon Static started as a sound: the hum a tube light makes when the power flickers during a storm. Everyone who grew up in an Indian city knows it. I wanted to make a minute that felt like that hum. This is the diary of how it got made, in seven evenings after work, with a laptop, a pair of headphones and about ₹1,800 of credits." },
      { type: "h2", text: "Monday · The logline" },
      { type: "p", text: "“During a Mumbai downpour, a boy in a one-room flat waits for the power to come back so he can hear the end of a cricket match on the radio.” A world, a want and a clock. Everything else in the film came out of that one sentence, and every time I got lost later in the week, I went back to it." },
      { type: "p", text: "I didn't open a single generation tool that night. I wrote the logline, then a sixty-second script of about ninety words, then I went to bed. If the logline doesn't survive a night's sleep, no amount of beautiful frames will save it." },
      { type: "h2", text: "Tuesday · The look" },
      { type: "p", text: "The whole evening went on stills, no video at all. Moodboard first: sodium orange outside, cold blue tube light inside, every surface wet. I generated about sixty frames and kept six. Those six became the style bible: one image per lighting state, with the exact palette and the light sources written underneath each one." },
      { type: "p", text: "This is the cheapest evening of the week and the one that decides whether the film looks like one film. Images cost almost nothing. Skipping this step and discovering the look inside a video model is how budgets disappear." },
      { type: "h2", text: "Wednesday · The shot list" },
      { type: "p", text: "Fourteen shots on a single page. Each line has a shot size, a lens, a camera height, a move, the light and a duration. The radio got three shots of its own, because in this film the radio is the second character. By the end of the evening the shot list was, line for line, my prompt list." },
      {
        type: "prompt",
        label: "Shot 07 · Insert",
        tool: "Still: Flux · Motion: Kling",
        text: "Insert, 50mm macro. A transistor radio on a windowsill, rain streaking the glass behind it, the dial glowing faint orange. Static, locked off. The tube light flickers off and on twice; the dial light dims with it. Night, humid, condensation on the metal grille. 4 seconds.",
      },
      { type: "h2", text: "Thursday · Generation night" },
      { type: "p", text: "This is where the money goes. I animated only the stills I had already approved, three takes each, and stopped. Two shots needed a fourth take. One shot, the boy's face in the window, drifted every single time: a different boy in every take." },
      { type: "p", text: "So I didn't fight it. I changed the shot to a silhouette against the window, lit only by lightning. It's now the best image in the film, and it cost two takes." },
      { type: "quote", text: "When a shot won't behave, change the shot. Never the story.", red: ["story."] },
      { type: "h2", text: "Friday · Sound" },
      { type: "p", text: "I cut the film silent first and it was dead. Then I built the sound in layers: room tone, rain on a tin roof, the tube light hum, a local train somewhere far off, and the radio commentary, generated in Hindi and English and pitched down until it sounded like AM. The hum carries the whole minute. Without it, the film is a slideshow." },
      { type: "image", image: "bts-microphone", caption: "Fig. 2 · Sound was built before the final cut, not after it. It told me which shots I didn't need." },
      { type: "h2", text: "Saturday · The cut and the grade" },
      { type: "p", text: "The first assembly ran 1:24. Getting it to sixty seconds meant losing two shots I loved, including a lovely wide of the flooded street. The grade pushed the outside towards orange and the inside towards green-blue, so every cut between them feels like a change in temperature." },
      { type: "h2", text: "Sunday · Release" },
      { type: "p", text: "I exported a 4K master, a 9:16 version for Reels with the title moved up out of the caption zone, and a festival copy with the AI disclosure and the full tool stack in the end credits. Then I watched it once on a phone, with the brightness down, in a noisy room, because that's how most people will see it." },
      { type: "p", text: "What I'd tell anyone starting their first one:" },
      {
        type: "list",
        items: [
          "Lock the look in stills before you spend a single video credit.",
          "Give objects shots of their own. A radio, a cup, a phone screen: they carry emotion cheaply and they never drift.",
          "Build the sound early. It tells you which shots you don't need.",
          "Watch the final cut on the worst screen you own.",
        ],
      },
      { type: "p", text: "The full breakdown of Monsoon Static, every prompt, every take and the project file, is part of the capstone module." },
    ],
  },

  /* ------------------------------------------------------------------ credits */
  {
    slug: "credits-budget",
    title: "A ₹2,000 film: budgeting credits shot by shot",
    excerpt: "How to plan a 60-second short on about ₹2,000 of AI credits, and why most of it should go to video, not images.",
    date: "2026-10-21",
    tag: "Tools",
    author: "zoya",
    cover: "journal-credits-budget",
    body: [
      { type: "p", text: "The question we hear most before anyone enrolls: how much will the tools cost? For the capstone, our answer is about ₹2,000. Not because the tools are cheap, but because a plan is. People who overspend aren't using expensive tools. They're generating without a shot list." },
      { type: "p", text: "A note before the numbers: plans and prices change constantly, and every tool counts credits differently. Treat the figures below as a planning shape, not a price list, and check the current plans before you buy anything." },
      { type: "h2", text: "Where the money actually goes" },
      { type: "p", text: "In a typical sixty-second short, the split looks like this:" },
      {
        type: "list",
        items: [
          "Script and shot list: ₹0. Free tiers of ChatGPT or Claude are plenty.",
          "Look development and stills: around 15%. Images are cheap and fast, so this is where you experiment.",
          "Video generation: around 60%. The expensive stage, and the one to plan hardest.",
          "Voice and music: around 15%. One month of a voice tool and a music tool, or free tiers if your film has little dialogue.",
          "Reserve: around 10%. For the one shot that needs one more take.",
        ],
      },
      { type: "p", text: "Editing, grading and the mix cost nothing at all: the free version of DaVinci Resolve does every one of them." },
      { type: "h2", text: "Count takes, not shots" },
      { type: "p", text: "A film of fifteen shots does not need fifteen generations. It needs fifteen shots multiplied by however many takes each one takes, and that multiplier is the whole budget. Our rule of thumb: three takes for a simple shot (static, one subject, no hands) and five or six for a hard one (a face in motion, hands doing something, a crowd)." },
      {
        type: "prompt",
        kind: "Template",
        label: "Budget sheet · one line per shot",
        tool: "Any spreadsheet",
        text: "Shot | Size + move            | Difficulty | Takes | Credits/take | Total\n01   | Wide, static street     | Easy       | 3     | 10           | 30\n02   | MCU, slow push on face  | Hard       | 6     | 10           | 60\n03   | Insert, radio dial      | Easy       | 2     | 10           | 20\n...\nTOTAL credits x price per credit = your video budget",
      },
      { type: "h2", text: "Approve the still before you animate" },
      { type: "p", text: "The single biggest saving: never send a video model a text-only prompt. Generate the frame as a still, which costs very little, fix it until it's right, then animate the approved still. You'll roughly halve your video takes, because you're no longer paying the video model to discover your composition for you." },
      { type: "h2", text: "A fifteen-shot plan, worked through" },
      { type: "p", text: "Here's the maths on a typical capstone. Five easy shots at three takes, seven medium shots at four and three hard shots at six: 15 + 28 + 18 = 61 video takes. If a short take costs you somewhere around ₹20 to ₹30 on a monthly plan (check the current pricing; it moves), that's roughly ₹1,200 to ₹1,800 for video, which leaves room for voice, music and the reserve. Most people underestimate the hard shots, so park the reserve there before you start." },
      { type: "h2", text: "Generate short, cut shorter" },
      { type: "p", text: "Most shots in a short live on screen for three or four seconds. Generate at the shortest duration the tool allows, and only go longer for the shots that genuinely need the time. A ten-second take you use four seconds of is six seconds of credits you paid for and threw away." },
      { type: "quote", text: "Overspending is a planning problem, not a tools problem.", red: ["planning"] },
      { type: "h2", text: "Free tiers first, then one paid month" },
      { type: "p", text: "Do everything you can on free tiers: scripting, moodboards, a few test generations to choose your models. Then buy one month of the video tool you've settled on, and do all of your generation inside that month. Most people find they never need a second one." },
      { type: "image", image: "bts-edit-timeline", caption: "Fig. 2 · Keep a log as you go: shot, model, takes, credits. Your next budget writes itself." },
      { type: "p", text: "And keep that log. After one film you'll know your real cost per finished second, which is the most useful number an AI filmmaker can have. Module one includes the budget sheet we use, pre-filled for a fifteen-shot capstone." },
    ],
  },

  /* ------------------------------------------------------------ camera language */
  {
    slug: "camera-language",
    title: "Camera language for prompts",
    excerpt: "Why “85mm, slow push-in, one practical” beats “cinematic, 8K, masterpiece” every single time.",
    date: "2026-10-14",
    tag: "Prompting",
    author: "arjun",
    cover: "journal-camera-language",
    body: [
      { type: "p", text: "Open any prompt library and you'll find the same incantation: cinematic, 8K, ultra-detailed, masterpiece. It feels like asking for quality. It isn't. Those words sit on millions of images, so they pull the model towards the middle of all of them: glossy, centred, evenly lit and instantly forgettable." },
      { type: "p", text: "A cinematographer never says “make it cinematic”. They say which lens, where the camera is, how it moves and where the light comes from. Those are decisions, and decisions are what a model can actually follow. This is the vocabulary we use on day one of module four." },
      { type: "h2", text: "Lens first: the frame is a choice" },
      { type: "p", text: "Focal length changes more than how wide a shot is. It changes how a face feels. A 24mm close to someone stretches their features and pushes the room away: intimate, a little uneasy. An 85mm flattens the face, compresses the street behind it and melts it into soft shapes. A 135mm from across the road feels like you're being watched." },
      { type: "p", text: "Models learned from millions of captioned photographs, and photographers caption with lenses. So “85mm, f/1.8” isn't decoration. It pulls the generation towards a family of images with real optical behaviour." },
      {
        type: "list",
        items: [
          "24mm or wider: space, architecture, unease when you're close.",
          "35mm: the honest eye. Street, documentary, walk-and-talks.",
          "50mm: neutral and conversational. Mid shots.",
          "85mm: portraits, longing, a subject isolated from the world.",
          "135mm and up: watching from a distance, crowds stacked into one plane.",
        ],
      },
      { type: "h2", text: "Then position and height" },
      { type: "p", text: "Where is the camera? “Low angle from the pavement.” “Eye level across the chai stall counter.” “High angle from a second-floor balcony.” Height tells the audience who holds power in the frame. A low angle on a bus conductor makes him monumental; a high angle on the same man makes him small in his own city." },
      { type: "p", text: "Be concrete about distance as well: extreme wide, wide, medium, medium close-up, close-up, insert. If you only write one word about the shot, make it the shot size, and put it first." },
      { type: "h2", text: "Movement is a sentence, not an adjective" },
      { type: "p", text: "“Dynamic camera” means nothing. “Slow push-in”, “lateral dolly left, tracking her walk”, “locked off” and “handheld, slight breathing” all describe a physical move. Video models respond far better to one clear move than to a list of three. If you want a push-in and a pan, you probably want two shots." },
      { type: "p", text: "Keep moves slow. Fast moves invite warping: faces smear and hands multiply. A slow push over five seconds reads as intention; a fast whip reads as an artefact." },
      {
        type: "prompt",
        label: "Shot 03 · Medium close-up",
        tool: "Still: Midjourney / Flux · Motion: Veo",
        text: "Medium close-up, 85mm, f/2. A tram conductor in a grey cardigan leans on the rail, rain behind him. Eye level. Slow push-in over 6 seconds. One practical: a sodium-vapour street lamp frame left, warm on his cheek; cool blue fill from a shop window. Shallow depth of field, the wet street in soft bokeh. 1990s Kolkata, 35mm film grain.",
      },
      { type: "h2", text: "Light: name the source" },
      { type: "p", text: "“Moody lighting” gets you blue haze and lens flares. Name the source instead: one tube light in a corridor, a phone screen under a blanket, late sun through a jaali screen, headlights sweeping across a ceiling. Say where it is (frame left, behind, above) and what colour it is. Real sources make real shadows, and shadows are where mood lives." },
      { type: "quote", text: "The model can render anything. Your job is to tell it where the light is coming from.", red: ["light"] },
      { type: "h2", text: "Delete the magic words" },
      { type: "p", text: "Run a test. Take your best prompt, delete “cinematic, 8K, masterpiece, hyper-realistic” and generate again. Nine times out of ten the image gets better, or nothing changes at all, which tells you those words were doing nothing. Spend them on lens, position, move and light instead." },
      { type: "image", image: "bts-camera-rig", caption: "Fig. 2 · A shot list is a prompt list. Write it like a camera report before you open the tool." },
      { type: "p", text: "That's the habit: write your shot list like a camera report before you open any tool. Shot size, lens, height, move, light, duration. When the shot list is right, the prompt list is already written. Module four turns this into the template you'll use for every shot of your capstone." },
    ],
  },

  /* ------------------------------------------------------------------- grade */
  {
    slug: "grade-the-feeling",
    title: "Grade the feeling, not the footage",
    excerpt: "Generated shots arrive with fifteen different looks. Here's how to grade them into one film in DaVinci Resolve.",
    date: "2026-10-06",
    tag: "Edit",
    author: "naina",
    cover: "journal-grade-the-feeling",
    body: [
      { type: "p", text: "Cut fifteen generated shots together and something feels off, even when every shot is beautiful. Shot four is warmer. Shot nine has crushed blacks. Shot twelve looks like it's from a different decade. The models don't know your shots belong to one film. The grade is where you tell them." },
      { type: "h2", text: "Balance first, then the look" },
      { type: "p", text: "Grading has two jobs and the order matters. First, make every shot match: similar exposure, similar white balance, similar contrast. Only then apply a look, the creative colour that makes it feel like your film. A look on top of mismatched shots just gives you fifteen versions of the same look." },
      { type: "h2", text: "A three-node tree for every clip" },
      { type: "p", text: "In DaVinci Resolve (the free version is enough), build the same three nodes on every clip:" },
      {
        type: "list",
        items: [
          "Node 1 · Balance: exposure and white balance, judged on the scopes, not your eyes.",
          "Node 2 · Match: nudge the shot towards your hero shot, skin tones sitting on the skin-tone line.",
          "Node 3 · Look: shared across every clip (a shared node or a group), so one change updates the whole film.",
        ],
      },
      { type: "h2", text: "Pick a hero shot" },
      { type: "p", text: "Choose the one shot that best carries the film's feeling and grade it first. Every other shot is compared against it, side by side, with a split-screen still. Matching everything to one reference is far faster than matching everything to everything." },
      { type: "p", text: "A quick check that saves hours: drop the saturation of the whole timeline to zero for a minute. Without colour you only see exposure and contrast, and the mismatches jump straight out. Fix those, then bring the colour back." },
      { type: "h2", text: "Colour is emotion" },
      { type: "p", text: "Decide what the film feels like before you touch a wheel. Lonely? Pull the saturation down and let the shadows lean cool. Nostalgic? Warm the highlights, lift the blacks a touch, soften the contrast. Tense? Harder contrast, greener mids. In Monsoon Static the outside world is orange and the inside is green-blue, so every cut between them feels like stepping through a door." },
      { type: "p", text: "Keep the palette small: two or three dominant hues for the whole film. A short where every shot introduces a new colour feels like a mood board, not a world. If a generated shot brings in a colour you didn't plan, a hue-versus-hue curve will usually pull it back into the family." },
      { type: "quote", text: "Grade the feeling first. The footage will follow.", red: ["feeling"] },
      { type: "h2", text: "Fix the AI tells" },
      { type: "p", text: "Generated footage has its own habits. These are the four we fix on almost every film:" },
      {
        type: "list",
        items: [
          "Flicker: brightness pulsing between frames. Deflicker tools or gentle temporal noise reduction help; sometimes the fix is to cut around it.",
          "Over-sharpened edges: a touch of softening plus grain takes away the plastic look.",
          "Skin that's too perfect: add texture back with grain, and never stack beauty smoothing on top.",
          "Mismatched blacks: set every shot's black point to the same level on the waveform.",
        ],
      },
      {
        type: "prompt",
        kind: "Template",
        label: "Look notes · write before you grade",
        tool: "Your edit notebook",
        text: "Film: Monsoon Static\nFeeling: humid, waiting, a little hopeful\nHero shot: 09 (silhouette in the window)\nOutside: warm, sodium orange, highlights soft\nInside: cool green-blue, tube light, mids slightly green\nBlacks: lifted 2-3%, never crushed\nGrain: fine 35mm, same on every clip",
      },
      { type: "h2", text: "Add grain last" },
      { type: "p", text: "A fine layer of film grain over the whole timeline is the cheapest way to make shots from different models feel like they were shot on the same stock. Keep it subtle: if you notice it, it's too much." },
      { type: "image", image: "poster-m09", caption: "Fig. 2 · Grade on the scopes, judge on a phone. Most films end up too dark for the screens they're watched on." },
      { type: "p", text: "Then export and watch on a phone. Grading on a bright monitor and watching on a dim phone is how most films end up too dark. Module nine covers all of this end to end, including the shared-node setup and the Resolve project we use for every capstone." },
    ],
  },

  /* ---------------------------------------------------------- characters */
  {
    slug: "consistent-characters",
    title: "Same face, every shot",
    excerpt: "A working method for character continuity across forty generations and three different models.",
    date: "2026-09-28",
    tag: "Prompting",
    author: "zoya",
    cover: "journal-consistent-characters",
    body: [
      { type: "p", text: "Every AI filmmaker hits this moment. Shot one is perfect: your lead, a schoolteacher from Madurai in her thirties, mustard cotton saree, tired eyes, a small scar over one eyebrow. In shot two she's ten years younger. In shot three the saree is green. By shot six she's a different woman who happens to be standing in the same classroom." },
      { type: "p", text: "Audiences forgive a lot. They don't forgive a face that changes. Continuity is what separates a film from a playlist of clips, so we treat it as a production department, not a prompt trick. This is the method we use across forty-odd generations and three different models." },
      { type: "h2", text: "1. Cast before you shoot" },
      { type: "p", text: "Don't generate your character inside the first scene. Generate them on their own, against a plain grey backdrop, front-lit, neutral expression. Make twenty variations and choose one. This is your casting session and it's worth a whole evening. Then name her and write down her age, build, skin tone, hair length and parting, and one distinguishing mark." },
      { type: "h2", text: "2. Build a character sheet" },
      { type: "p", text: "From the chosen image, generate a turnaround: front, three-quarter, profile and a full-length shot that shows the costume and footwear. Same backdrop, same light. Add a small expression set: neutral, smiling, worried, angry. Put it all on one sheet. That sheet is the reference you feed into every generation that follows." },
      {
        type: "prompt",
        label: "Character sheet",
        tool: "Still: Flux / Midjourney with a reference image",
        text: "Character turnaround sheet of the same woman: front view, three-quarter view, side profile, full body. Indian schoolteacher, 34, mustard cotton saree with a thin maroon border, hair in a low bun with a centre parting, small scar above the left eyebrow, silver watch on the right wrist. Plain mid-grey studio backdrop, soft even front light, neutral expression. Clean and consistent, no props.",
      },
      { type: "h2", text: "3. Lock the constants" },
      { type: "p", text: "Most drift isn't in the face. It's in the details the model treats as optional. Write one “constants” line and paste it, word for word, into every prompt: the saree and its border, the bun, the scar, the watch. Never paraphrase it. “Mustard saree” in one prompt and “yellow sari” in the next is an invitation to change." },
      { type: "p", text: "Keep the list short, five or six items at most. The more constants you list, the more the model has to juggle, and the more it drops." },
      { type: "h2", text: "4. Generate the still, then animate it" },
      { type: "p", text: "Don't ask a video model to invent your character from text. Generate the frame as a still with your reference image, fix it until it's right, then send that still to image-to-video. The video model inherits the face instead of guessing it. It's the biggest continuity win there is, and it saves credits, because you only animate frames you've already approved." },
      { type: "h2", text: "5. Check every shot against the sheet" },
      { type: "p", text: "Before a shot goes into the edit, put it next to the character sheet. Same jaw? Same parting? Scar on the correct side? (Mirrored generations put it on the wrong side more often than you'd think.) Keep a simple log: shot number, model, reference used, pass or fail. When a shot fails, fix the still, not the video." },
      { type: "quote", text: "Continuity is a department, not a prompt. Somebody has to own it.", red: ["department,"] },
      { type: "h2", text: "6. When the models disagree" },
      { type: "p", text: "You'll probably use more than one model: one that's great with faces, another that's better with motion or physics. Each reads your reference a little differently. Two habits help. Always feed the same crop from the character sheet, not whichever frame is handy. And cut on motion: a cut in the middle of a turn or a walk hides small differences that a static two-shot would expose." },
      { type: "image", image: "poster-m06", caption: "Fig. 2 · A profile against strong backlight: the safest shot when a face won't hold." },
      { type: "p", text: "When a shot really won't match, change the shot, not the character. A profile, an over-the-shoulder or a silhouette against a window can carry the scene without asking the model to match a face it keeps getting wrong. Directors have always written around problems. You're allowed to as well." },
      { type: "p", text: "Module six walks through the whole method on a real scene, with the character-sheet template, the constants line and the shot log we use in the studio." },
    ],
  },

  /* ------------------------------------------------------------------- sound */
  {
    slug: "sound-half",
    title: "Sound is half the picture",
    excerpt: "Audiences forgive a soft frame. They never forgive bad sound. A five-layer method for AI films that sound like films.",
    date: "2026-09-17",
    tag: "Sound",
    author: "rohan",
    cover: "journal-sound-half",
    body: [
      { type: "p", text: "Show someone a beautiful AI shot with no sound and they'll say “nice”. Play the same shot with rain on a tin roof, a pressure-cooker whistle two flats away and a low drone underneath, and they'll ask what happens next. Sound is where an image becomes a place." },
      { type: "p", text: "AI films are especially exposed here, because generated pictures often arrive with no sound, or with a guess at it. Every sound you keep is a decision someone made, or forgot to make. This is the layering method we teach in module eight, bottom layer first." },
      { type: "h2", text: "Layer 1 · Room tone" },
      { type: "p", text: "Every space makes a sound even when nothing happens: a ceiling fan, a fridge, traffic through a closed window. Lay room tone under every shot before anything else. It glues the cuts together. Without it, every edit sounds like a hole in the film." },
      { type: "h2", text: "Layer 2 · Ambience" },
      { type: "p", text: "The world outside the frame: autos, a temple bell, crows at dawn, a local train in the distance. Ambience tells the audience where and when they are faster than any establishing shot. Keep it a few decibels under everything else, and let it change when the location changes." },
      { type: "h2", text: "Layer 3 · Foley" },
      { type: "p", text: "The small sounds of things on screen: footsteps, a steel tumbler set down, a dupatta brushing a door frame. Generated video gives you motion without contact; foley is what makes the contact believable. You don't need every footstep. You need the ones the camera is close to." },
      { type: "p", text: "Free libraries are fine to start with; record the rest on your phone. A phone held close to a steel tumbler on a granite counter sounds more like home than anything in a library, and it costs nothing but a quiet room." },
      { type: "h2", text: "Layer 4 · Voice" },
      { type: "p", text: "Cast voices the way you'd cast actors: age, region, texture. Then direct the performance, not just the words. Write the emotion and the pace into the line itself, generate several reads and choose. If your film has dialogue on a face, the lip-sync can only be as good as the read you feed it." },
      {
        type: "prompt",
        label: "Voice direction",
        tool: "Voice: ElevenLabs",
        text: "Line: \"Amma, the battery is about to go.\"\nVoice: woman, early 30s, Marathi-accented English, soft and hoarse after a long shift.\nDirection: quiet, hurried, trying not to sound worried. A small smile on \"Amma\". A beat before \"go\".\nTakes: 4. Keep the breaths in.",
      },
      { type: "h2", text: "Layer 5 · Score" },
      { type: "p", text: "Music goes in last, not first. Lay a track early and you'll cut to its beats, and the film turns into a music video. Score after the picture is locked, and leave silence wherever the story needs it. One sustained note under a reveal does more than a full orchestra." },
      { type: "p", text: "Give each film one musical idea, whether that's a three-note motif, a drone or a rhythm, and let it return at the turn. Repetition is what makes a score feel composed rather than picked from a list." },
      { type: "quote", text: "Audiences forgive a soft frame. They never forgive bad sound.", red: ["sound."] },
      { type: "h2", text: "Mix for phones" },
      { type: "p", text: "Most of your audience will hear your film through a phone speaker, in a noisy room, at a third of the volume. Check the mix there. Dialogue should sit clearly above everything; music ducks under it. Aim for a consistent loudness for online delivery (around -14 LUFS integrated is a safe target for most platforms), and listen once on cheap earphones before you export." },
      { type: "image", image: "bts-music-studio", caption: "Fig. 2 · Mix on good speakers, check on bad ones. The phone is the real premiere." },
      {
        type: "list",
        items: [
          "Room tone under every cut, no exceptions.",
          "Ambience that changes when the place changes.",
          "Foley only where the camera is close.",
          "Directed voice reads, several takes, choose one.",
          "Score after picture lock, with room for silence.",
        ],
      },
      { type: "p", text: "Do all five and something odd happens: people start describing your images as sharper. They aren't. They just sound true." },
    ],
  },

  /* ------------------------------------------------------------------- sixty */
  {
    slug: "sixty-seconds",
    title: "Sixty seconds is a discipline",
    excerpt: "What a one-minute film teaches you about structure that a feature never will.",
    date: "2026-09-09",
    tag: "Direction",
    author: "arjun",
    cover: "journal-sixty-seconds",
    body: [
      { type: "p", text: "Every cohort, someone asks if their capstone can be three minutes long. The answer is always no, and it's the best “no” in the course." },
      { type: "p", text: "Sixty seconds sounds tiny. It's about fifteen shots, maybe a hundred words of dialogue if you're greedy. But a minute is long enough to make someone feel something, and short enough that every frame has to earn its place. That pressure is the whole point." },
      { type: "h2", text: "A minute still has three acts" },
      { type: "p", text: "In a sixty-second film the acts run roughly fifteen, thirty and fifteen seconds. The first fifteen set a world and a want: who is this, and what do they need? The middle thirty complicate it. The last fifteen land a turn: something changes, or something is revealed." },
      { type: "p", text: "Write it as a logline first. “A night-shift nurse in Pune tries to call her mother before her phone battery dies.” That's a world, a want and a clock. If you can't write the logline, no number of beautiful shots will save the minute." },
      { type: "h2", text: "Count your shots before your credits" },
      {
        type: "list",
        items: [
          "0:00–0:15 · Setup, 3 to 4 shots. The place, then the person, then the want.",
          "0:15–0:45 · Complication, 6 to 8 shots. Obstacles, rising pace, one moment of stillness.",
          "0:45–1:00 · Turn, 3 to 4 shots. The reveal, the reaction, the last image.",
        ],
      },
      { type: "p", text: "Most video models give you clips of five to ten seconds, but very few shots in a short should run that long. Plan for three- and four-second shots, and generate a little longer than you need so you have handles in the edit." },
      { type: "p", text: "One test before you generate anything: read the script aloud with a stopwatch, describing each shot as you go. If the read-through runs past seventy seconds, the cut will run past sixty, because a finished film always feels longer than its plan." },
      { type: "h2", text: "The first frame is a promise" },
      { type: "p", text: "On Reels and Shorts, the first second decides whether anyone watches the second. That doesn't mean you need an explosion. It means the opening frame has to ask a question: a light on in an empty classroom at 3am, a hand hovering over a phone, a tram with no driver. Make the audience lean in before they know why." },
      { type: "p", text: "Then hold that first image a beat longer than feels comfortable. Rushing the opening frame is the most common mistake in first films; confidence on screen starts with letting a shot breathe." },
      { type: "quote", text: "Sixty seconds is not a limitation. It's a discipline. Every shot has to earn its place.", red: ["earn"] },
      { type: "h2", text: "Cut the shot you love most" },
      { type: "p", text: "This is the hardest exercise in module two. Lay out your shot list and find the shot you're proudest of, the one that took forty generations to get right. Ask: if it vanished, would the story break? If the answer is no, cut it. In a minute, a beautiful shot that doesn't move the story is a five-second hole." },
      {
        type: "prompt",
        label: "Logline to shot list",
        tool: "Script: ChatGPT / Claude",
        text: "You are a script editor for 60-second films. Logline: \"A night-shift nurse in Pune tries to call her mother before her phone battery dies.\" Break it into 14 shots across setup (0-15s), complication (15-45s) and turn (45-60s). For each shot give: timecode, shot size, lens, camera move, what we see, and any sound. No line of dialogue longer than six words. End on an image, not a line.",
      },
      { type: "h2", text: "End on an image, not an explanation" },
      { type: "p", text: "The weakest one-minute films end with a line of dialogue explaining what we just watched. The strongest end on an image that makes the audience finish the thought: the phone screen lighting up, an empty chair, a mother's voice over a black frame. Trust the audience. They're smarter than a caption." },
      { type: "p", text: "The capstone brief in module eleven is exactly this: one logline, one minute, about fifteen shots. It's the most constrained thing you'll make in the course, and it's the one you'll keep showing people." },
    ],
  },

  /* ------------------------------------------------------------------- rights */
  {
    slug: "rights-disclosure",
    title: "Before you post: disclosure, rights and festivals",
    excerpt: "A practical checklist for releasing AI films on Instagram, YouTube and the festival circuit, without surprises.",
    date: "2026-08-26",
    tag: "Tools",
    author: "vikram",
    cover: "journal-rights-disclosure",
    body: [
      { type: "p", text: "The film is finished. Before you press publish, there's a short checklist that saves you from takedowns, angry comments and rejected festival entries. This isn't legal advice, and the rules are changing quickly in India and everywhere else, so check the current terms of each platform and tool before you release. But these habits keep you on the right side of almost all of them." },
      { type: "h2", text: "1. Read your tools' terms" },
      { type: "p", text: "Paid plans on most generation tools give you broad rights to use what you make, often commercially. Free tiers sometimes don't. Before a film goes to a client or a festival, check the terms of every tool that touched it, and note which plan you were on when you generated each shot." },
      { type: "h2", text: "2. Disclose on the platform" },
      { type: "p", text: "YouTube asks creators to disclose realistic altered or synthetic content when they upload, and Meta's apps label AI-made content too. Use the toggles. Disclosure rarely hurts reach the way people fear; being flagged later does. India's IT ministry has also proposed rules for labelling synthetic media, so expect these requirements to tighten rather than relax." },
      { type: "p", text: "Put the disclosure in the film itself as well: a line in the end credits or the description travels with the file when it's downloaded and reposted, which a platform toggle doesn't." },
      { type: "h2", text: "3. No real people without permission" },
      { type: "p", text: "No real faces, voices or names of people who haven't agreed to it, and that includes film stars, politicians and your friends. A voice clone of a famous actor might feel like a tribute, but it's someone else's likeness. Cast synthetic characters, or cast real people with written consent." },
      { type: "p", text: "That includes voices. A cloned voice of your grandmother for a family tribute still needs the family's agreement in writing, and a voice tool's own rules may ask for proof of consent before it will clone anyone at all." },
      { type: "quote", text: "If you'd need a release form on a real set, you need one here too.", red: ["release"] },
      { type: "h2", text: "4. Mind the music and the logos" },
      { type: "p", text: "Generated music is only as safe as the tool's licence. Don't upload someone else's song into a music tool to “remix” it. And watch for brand logos, trademarked characters and recognisable products that slip into generations: regenerate the shot or paint them out." },
      { type: "h2", text: "5. Credit your stack" },
      { type: "p", text: "End credits are the right place for honesty: the tools you used, the human crew (voice, sound, edit) and the source of the music. Festivals increasingly ask for this in the submission form. Some now run categories for AI-assisted work and some don't accept it at all, so read each festival's rules before you pay an entry fee." },
      {
        type: "prompt",
        kind: "Template",
        label: "End-credit block",
        tool: "Your title card",
        text: "Written and directed by Riya Menon\nImages generated with Midjourney and Flux\nMotion generated with Veo\nVoices: ElevenLabs, directed by Riya Menon\nMusic: Suno, arranged by Rohan D'Souza\nEdit, grade and mix: DaVinci Resolve\nThis film contains AI-generated imagery and sound.",
      },
      { type: "h2", text: "6. Keep your receipts" },
      {
        type: "list",
        items: [
          "The project file and your shot log: prompt, model, plan, date.",
          "Character sheets and references, showing they were generated, not copied.",
          "Consent forms for any real person's face or voice.",
          "Licences for music and fonts.",
        ],
      },
      { type: "image", image: "bts-film-reels", caption: "Fig. 2 · Ten minutes of admin at the end of a project is the difference between “we can prove it” and “we think so”." },
      { type: "p", text: "Module ten covers release, disclosure and rights in more detail, with the checklist we run before every studio release." },
    ],
  },
];

/** Newest first. */
/** Words in a post's text (paragraphs, headings, quotes, prompts, lists, captions). */
export function wordCount(post: Pick<Post, "body">) {
  const text = post.body
    .map((b) => (b.type === "list" ? b.items.join(" ") : b.type === "image" ? b.caption : b.text))
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

/** Read time: about 230 words a minute, plus a minute for every prompt card (time to try it). */
export function readMinutes(post: Pick<Post, "body">) {
  const prompts = post.body.filter((b) => b.type === "prompt").length;
  return Math.max(2, Math.ceil(wordCount(post) / 230) + prompts);
}

export const POSTS: Post[] = POSTS_UNSORTED.map((p) => ({ ...p, minutes: readMinutes(p) })).sort((a, b) => b.date.localeCompare(a.date));

export const JOURNAL = {
  label: "Journal",
  title: "Studio Notes",
  note: "Working notes from the edit suite: techniques, tool shifts worth knowing, and the films we keep rewatching.",
  all: "All",
  featured: "Latest note",
  more: "Load more notes",
  empty: "No notes under this tag yet.",
  pageSize: 6,
  cta: {
    label: "The course",
    title: "Every note here is a lesson, unabridged.",
    red: ["lesson,"],
    body: `${FLAGSHIP.title}: ${FLAGSHIP.modules} modules, ${FLAGSHIP.lessons} lessons, a 60-second capstone. The first lesson is free.`,
    primary: { label: "Watch free lesson", href: FLAGSHIP.freeLessonHref },
    secondary: { label: "See the course", href: FLAGSHIP.href },
  },
} as const;

/* ---- Home "Studio Notes" teaser (src/components/home/JournalTeaser): three posts by slug. */
export type PostTeaser = { slug: string; date: string; title: string; excerpt: string; cover: MediaKey; read: string };

const TEASER_SLUGS = ["camera-language", "consistent-characters", "sixty-seconds"] as const;

export const JOURNAL_TEASER = {
  label: JOURNAL.label,
  title: JOURNAL.title,
  note: JOURNAL.note,
  cta: { label: "Read all", href: "/journal" },
  posts: TEASER_SLUGS.flatMap((slug): PostTeaser[] => {
    const p = POSTS.find((x) => x.slug === slug);
    return p ? [{ slug, date: p.date, title: p.title, excerpt: p.excerpt, cover: p.cover, read: p.minutes + " min read" }] : [];
  }),
} as const;

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getAuthor(post: Post): Author {
  return AUTHORS[post.author] ?? AUTHORS.arjun;
}

/** 1-based position in the feed (newest = 1) and the total, for the "03/08" ghost index. */
export function postIndex(slug: string) {
  return { n: POSTS.findIndex((p) => p.slug === slug) + 1, total: POSTS.length };
}

/** The next (older) note, wrapping to the newest. */
export function nextPost(slug: string): Post {
  const i = POSTS.findIndex((p) => p.slug === slug);
  return POSTS[(i + 1) % POSTS.length];
}

/** Up to `n` related notes: same tag first, then the most recent; never the post itself or `exclude`. */
export function relatedPosts(slug: string, n = 2, exclude: string[] = []): Post[] {
  const post = getPost(slug);
  const skip = new Set([slug, ...exclude]);
  const pool = POSTS.filter((p) => !skip.has(p.slug));
  const same = pool.filter((p) => p.tag === post?.tag);
  const rest = pool.filter((p) => p.tag !== post?.tag);
  return [...same, ...rest].slice(0, n);
}

export function tagCounts() {
  return Object.fromEntries(JOURNAL_TAGS.map((t) => [t, POSTS.filter((p) => p.tag === t).length])) as Record<JournalTag, number>;
}

/** "14 October 2026" in IST. */
export const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** "14 OCT 2026" style for mono meta lines. */
export const fmtDateShort = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Slug for an h2 anchor. */
export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
