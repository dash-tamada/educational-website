import { mediaSrc } from "@/lib/media";
import type { CourseSeed } from "./dsl";
import { daysAgo } from "./util";

/* The flagship course: the one public product (slug and item ids must stay stable,
   pages and links point at /courses/ai-filmmaking and /learn/ai-filmmaking/af-1-1). */
export const LANDING_COURSES: CourseSeed[] = [
  /* ------------------------------------------------------------------------- AI Filmmaking: Prompt to Premiere */
  {
    id: "crs_aifilm",
    code: "af",
    slug: "ai-filmmaking",
    tutorId: "u_arjun",
    categoryId: "cat_film",
    title: "AI Filmmaking: Prompt to Premiere",
    promise: "Write, shoot, voice, score and cut a short film with AI. No camera, no crew, your vision.",
    description:
      "Direct your first AI short from a one-line idea to a finished, graded film you can release. Arjun Rao takes you through the whole pipeline the way a director thinks: story and shot list, look development, camera language for prompts, image-to-video with Veo, Kling and Runway, consistent characters, voices and lip-sync, music and sound, then the edit and grade in DaVinci Resolve. Ten modules, a checkpoint after every big idea, and a capstone: your own 60-second short, ready for Reels, YouTube or a festival.",
    thumbnail: mediaSrc("course-flagship"),
    tone: "flame",
    level: "All levels",
    language: "English",
    price: 2999,
    compareAtPrice: 4999,
    status: "published",
    tags: ["AI Filmmaking", "Prompting", "Image-to-video", "Lip-sync", "DaVinci Resolve", "Sound design"],
    badge: "BESTSELLER",
    featured: true,
    outcomes: [
      "Turn a one-line idea into a script and a shot list you can generate from",
      "Lock a film's look with style frames before spending video credits",
      "Prompt the shot like a director: lens, movement and light",
      "Animate stills into motion with Veo, Kling and Runway, and fix the artefacts",
      "Keep characters consistent and give them voices that lip-sync",
      "Score, sound-design, edit and grade a finished 60-second short",
    ],
    requirements: [
      "A laptop (Windows or Mac). A phone works for the first modules",
      "Free tiers of the tools to start; about ₹2,000 of credits for the capstone",
      "No camera, no editing experience. Just a story you want to tell",
    ],
    rating: 4.8,
    learners: 2480,
    hasCertificate: true,
    certificateTitle: "Certified AI Filmmaker",
    createdAt: daysAgo(372),
    updatedAt: daysAgo(6),
    publishedAt: daysAgo(330),
    modules: [
      {
        t: "The AI film stack",
        s: "The tools, the credits, and the pipeline from prompt to premiere.",
        items: [
          ["v", "Prompt to premiere: the whole pipeline in one lesson", "Watch a 60-second short go from a one-line idea to final export, then map every step you'll master.", "12:40", [["0:00", "The finished short"], ["1:50", "Idea and script"], ["4:10", "Look and shots"], ["7:30", "Motion, voice and sound"], ["10:20", "Edit, grade, export"]]],
          ["v", "The AI film stack in 2026", "Image, video, voice and music models: what each one is best at, and which ones you actually need.", "10:15"],
          ["v", "Credits, budgets and free tiers", "Plan a short on ₹2,000 of credits: what costs what, and how to stop burning generations.", "9:30"],
          ["r", "Tool stack and credit planner", "Every tool in the course with free tiers, INR pricing and a per-shot budget sheet.", "sheet", 240],
          ["q", {
            t: "Pipeline check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "What should exist before you generate a single video shot?", ["A finished soundtrack", "*A script and a shot list", "A 4K upscale preset", "A festival submission"], "Video credits are the expensive step. Script and shot list first, so every generation has a job."],
              ["tf", "Image models and video models do the same job, so one tool can cover the whole film.", false, "Each model family is strong at one stage: stills, motion, voice, music. The pipeline combines them."],
              ["m", "Which of these belong to the pipeline taught in this course?", ["*Look development", "*Image-to-video", "Buying a cinema camera", "*Sound design"], "No camera needed. Look-dev, motion and sound are all part of the pipeline."],
              ["s", "Your credits run out halfway through the shot list. What's the smartest fix?", ["Drop every shot to the cheapest model", "*Re-plan: test on stills, spend video credits only on locked shots", "Generate everything again at higher quality", "Skip the edit"], "Stills are cheap, video is not. Lock the frame before you animate it."],
            ],
          }],
        ],
      },
      {
        t: "Story and script with AI",
        s: "From a one-line idea to a script and a shot list you can generate from.",
        items: [
          ["v", "Loglines that survive the edit", "Write a one-line story with a want, an obstacle and a turn, then pressure-test it with an LLM.", "11:20"],
          ["v", "From logline to a 60-second script", "Beat sheets, scene cards and dialogue that fits inside a minute.", "13:05"],
          ["v", "The shot list is your prompt list", "Break the script into numbered shots with framing, action and mood, ready to generate.", "12:10"],
          ["r", "Script and shot-list templates", "A one-page script format and a shot list that doubles as your prompt sheet.", "template", 180],
          ["q", {
            t: "Story check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "A strong logline needs…", ["A twist ending", "*A character, a want and an obstacle", "At least three locations", "A famous actor"], "Who wants what, and what stands in the way. Everything else follows."],
              ["tf", "A 60-second script usually fits on one page.", true, "Roughly a page a minute. If it runs to three pages, it's a three-minute film."],
              ["m", "What belongs on each line of a shot list?", ["*Shot size and framing", "*What happens in the shot", "The model's price per second", "*A mood or lighting note"], "Framing, action and mood: that line becomes your prompt."],
              ["sa", "What do we call the one-sentence summary of a film's story?", ["logline", "a logline", "log line"], "The logline: the whole film in one sentence."],
            ],
          }],
        ],
      },
      {
        t: "Look development and style frames",
        s: "Find the film's look before you spend a single video credit.",
        items: [
          ["v", "Moodboards with intent", "Collect references for light, colour and texture, and know why each one is there.", "10:40"],
          ["v", "Style frames in Midjourney and Flux", "Generate hero frames that lock the look: palette, lens, era and grain.", "15:20"],
          ["v", "A style bible your whole film can follow", "Turn your best frames into reusable style prompts and reference sheets.", "11:45"],
          ["r", "Look-dev prompt library", "120 tested style prompts: noir, monsoon, retro Bollywood, neon, documentary.", "pdf", 860],
        ],
      },
      {
        t: "Prompting the shot",
        s: "Camera language for models: lens, movement and light.",
        items: [
          ["v", "Lens language: wide, normal, long", "What 18mm, 35mm and 85mm say about a scene, and the words that make a model obey.", "12:30"],
          ["v", "Camera movement that means something", "Push-ins, dolly, handheld, crane and orbit: when to move, and how to prompt it.", "14:10", [["0:00", "Why the camera moves"], ["2:40", "Push-in and pull-out"], ["6:05", "Dolly and tracking"], ["9:20", "Handheld and crane"], ["12:10", "Prompt patterns"]]],
          ["v", "Lighting a scene with words", "Key, fill, rim, practicals and golden hour: lighting prompts that read as cinema.", "13:25"],
          ["r", "Camera and lighting prompt cheat sheet", "Shot sizes, lenses, moves and light setups on one printable page.", "pdf", 320],
          ["q", {
            t: "Shot prompting checkpoint", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Which lens choice makes a face feel intimate with a soft background?", ["14mm ultra-wide", "24mm wide", "*85mm portrait", "A fisheye"], "Longer lenses compress space and blur the background: classic close-up territory."],
              ["s", "A slow push-in towards a character usually tells the audience…", ["The scene is ending", "*Something important is landing for this character", "The operator slipped", "It's a flashback"], "Moving closer raises intensity. Use it when a realisation lands."],
              ["tf", "Rim light helps separate a subject from a dark background.", true, "Light from behind traces the edges, so the subject lifts off the background."],
              ["m", "Which of these describe camera movement?", ["*Dolly in", "*Crane up", "Golden hour", "*Handheld"], "Golden hour is lighting. The others move the camera."],
              ["sa", "Which shot size frames a character from the waist up?", ["medium shot", "medium", "mid shot", "ms"], "A medium shot (MS): waist up."],
            ],
          }],
        ],
      },
      {
        t: "Image-to-video",
        s: "Veo, Kling, Runway and Sora-class models, shot by shot.",
        items: [
          ["v", "Image-to-video: how the models think", "Start frames, end frames, motion strength, and why your shot melts at second four.", "11:50"],
          ["v", "Veo, Kling and Runway, side by side", "One storyboard, three models: motion, physics, faces and cost compared, with every prompt.", "16:40", [["0:00", "The storyboard"], ["2:30", "Veo"], ["6:15", "Kling"], ["10:05", "Runway"], ["13:40", "Which model for which shot"]]],
          ["v", "Directing motion: brushes, paths and keyframes", "Motion brush, camera paths and start-end frames to get exactly the move you planned.", "13:15"],
          ["v", "Fixing the uncanny: artefacts and rerolls", "Warped hands, melting faces, flicker: diagnose it, re-prompt it, or know when to cut.", "12:20"],
          ["q", {
            t: "Image-to-video checkpoint", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Your shot melts into mush after four seconds. What do you try first?", ["Add more adjectives", "*Shorten the clip and lower the motion strength", "Switch to a 16:9 crop", "Upscale it"], "Most models hold together for a few seconds. Shorter clips and gentler motion stay coherent."],
              ["tf", "Giving the model a start frame and an end frame gives you more control over the move.", true, "Start and end frames pin down where the shot begins and where it lands."],
              ["m", "Good reasons to reroll a generation", ["*Warped hands in a hero close-up", "*Flicker on the main subject", "You just want to try another model for fun", "*The move doesn't match the shot list"], "Reroll for problems the audience will see or shots that are off-plan, not out of habit."],
              ["s", "Which input usually gives the most consistent image-to-video results?", ["A text prompt alone", "*A locked style frame plus a short motion prompt", "A screenshot of another film", "A long paragraph of adjectives"], "Lock the look in a still, then describe only the motion."],
            ],
          }],
        ],
      },
      {
        t: "Characters and continuity",
        s: "Same face, same costume, every shot.",
        items: [
          ["v", "Character sheets and reference packs", "Build a cast: turnarounds, expressions and wardrobe references the models can follow.", "12:00"],
          ["v", "Consistent faces across shots", "Reference images, character tools and seed habits that keep your lead recognisable.", "14:30"],
          ["v", "Continuity: costume, props and light direction", "The small details audiences notice, and a checklist that catches them before the edit.", "10:50"],
          ["q", {
            t: "Continuity check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "What is a character sheet for?", ["Tracking the budget", "*Locking a character's face, costume and proportions across shots", "Writing dialogue", "Exporting subtitles"], "One reference pack, reused in every shot, keeps the face and wardrobe stable."],
              ["tf", "If the key light comes from the left in one shot, it should usually stay on the left in the next shot of the same scene.", true, "Light direction is continuity. Flip it and the cut feels wrong, even if nobody can say why."],
              ["m", "Which details break continuity most often in AI shots?", ["*Costume colours", "*Props that appear or vanish", "The film's title card", "*Hair and accessories"], "Small wardrobe and prop changes are exactly what audiences notice."],
              ["sa", "What do we call the imaginary line the camera shouldn't cross in a dialogue scene?", ["the axis", "axis", "180-degree line", "180 degree line", "the line of action", "line of action"], "The axis (or line of action) keeps who's looking where consistent."],
            ],
          }],
        ],
      },
      {
        t: "Voice, dialogue and lip-sync",
        s: "Cast voices, direct the performance, and sync it to faces.",
        items: [
          ["v", "Casting an AI voice", "Voice design, cloning your own voice with consent, and delivery in English, Hindi and Tamil.", "11:10"],
          ["v", "Dialogue that sounds acted", "Direct the performance: pace, breath, emotion notes and multiple takes.", "12:45"],
          ["v", "Lip-sync that holds up in close-up", "Pick the right shots, sync the dialogue, and hide the frames that don't land.", "13:40"],
          ["q", {
            t: "Voice and lip-sync check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Before cloning someone's voice you need…", ["A paid plan", "*Their clear, written consent", "A studio microphone", "A Hindi script"], "Consent first, always. It's also what platforms and clients ask for."],
              ["tf", "Lip-sync holds up best on clear, front-facing close-ups with the mouth visible.", true, "Side profiles, hands over mouths and fast motion are where lip-sync breaks."],
              ["m", "Ways to make an AI voice performance sound acted", ["*Direct pace and pauses in the script", "*Generate several takes and pick the best", "Use the same take for every line", "*Add emotion or delivery notes"], "Treat it like a recording session: direction, multiple takes, then choose."],
            ],
          }],
        ],
      },
      {
        t: "Music and sound design",
        s: "Score it, design it, mix it: the half of the film you hear.",
        items: [
          ["v", "Scoring with AI music tools", "Brief music models like a composer: tempo, instruments, structure and stems.", "12:15"],
          ["v", "Sound design: the half of the film you hear", "Foley, ambience, whooshes and silence, layered so the picture feels real.", "13:30"],
          ["v", "Mixing for phones and cinemas", "Dialogue first, loudness targets, and a mix that survives phone speakers.", "10:25"],
          ["r", "Sound effects and ambience pack", "200 royalty-free effects and room tones, organised by scene type.", "audio", 52000],
          ["q", {
            t: "Sound check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Ambience (room tone, street noise) mainly helps a scene…", ["Get louder", "*Feel like a real place", "Hide bad dialogue", "Hit loudness specs"], "Ambience is the air of a location. Without it, shots feel pasted together."],
              ["tf", "Silence can be a sound-design choice.", true, "A sudden drop to silence is one of the strongest tools you have."],
              ["m", "What should a brief to a music model include?", ["*Tempo or BPM", "*Instruments and mood", "The director's name", "*Structure: intro, build, drop"], "Brief it like a composer: tempo, palette, mood and structure."],
              ["sa", "What do we call everyday sound effects recreated for film, like footsteps and cloth?", ["foley", "foley sound", "foley effects"], "Foley, named after the sound artist Jack Foley."],
            ],
          }],
        ],
      },
      {
        t: "Edit and grade",
        s: "Cut and colour in DaVinci Resolve until it feels like one film.",
        items: [
          ["v", "Cutting AI footage in DaVinci Resolve", "Media, timelines, and the J and L cuts that hide every generation seam.", "15:10"],
          ["v", "Rhythm, pacing and the 60-second cut", "Cut on action, cut on sound, and lose everything the story doesn't need.", "12:40"],
          ["v", "Colour grading for a consistent look", "Match shots from different models, then build the grade from your style bible.", "14:20"],
          ["r", "Resolve project and LUT pack", "The lesson project file plus five film-look LUTs: teal and orange, monsoon green and more.", "zip", 18400],
          ["q", {
            t: "Edit and grade checkpoint", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "In a J-cut, the audience…", ["Sees the next shot before hearing it", "*Hears the next shot before seeing it", "Sees a jump in time", "Hears only music"], "J-cut: sound leads. L-cut: sound lingers after the picture changes."],
              ["tf", "Matching shots from different models before the creative grade makes the film feel like one piece.", true, "Balance first, then style. Mismatched shots give away the seams."],
              ["m", "Good reasons to cut a shot early", ["*An artefact appears at the end", "*The beat has landed", "It cost a lot of credits", "*It slows the rhythm"], "Credits spent are spent. Cut for the film."],
              ["s", "A LUT in your grade is best used as…", ["*A starting look you adjust shot by shot", "A replacement for exposure correction", "A fix for out-of-focus shots", "Something to stack three times"], "A LUT is a starting point, not a finished grade."],
            ],
          }],
        ],
      },
      {
        t: "Finish and release",
        s: "Upscale, deliver, and release it honestly.",
        items: [
          ["v", "Upscale, frame interpolation and clean-up", "Sharpen, smooth and de-flicker the final cut without the plastic look.", "11:30"],
          ["v", "Deliverables: Reels, YouTube, festivals and clients", "Aspect ratios, bitrates, subtitles and export presets that survive compression.", "10:45"],
          ["v", "Rights, consent and AI disclosure", "What you own, what you can't use, platform labels and an honest credit line.", "12:05"],
          ["r", "Release checklist and disclosure templates", "Export settings, a festival-submission checklist and AI disclosure text for every platform.", "pdf", 290],
          ["q", {
            t: "Release-ready check", pass: 70, tries: 3, gate: false,
            qs: [
              ["s", "Which aspect ratio fits Instagram Reels and YouTube Shorts?", ["16:9", "2.39:1", "*9:16", "4:3"], "Vertical 9:16 fills a phone screen."],
              ["tf", "If a platform asks you to label realistic AI-generated content, you should label it.", true, "Disclose honestly. It protects you, your client and your audience."],
              ["m", "What belongs in a delivery package for a client?", ["*The final master export", "*A subtitle or caption file", "Screenshots of your prompt history", "*Social cut-downs in the right ratios"], "Masters, captions and cut-downs. Prompts are your working files."],
              ["s", "Using a famous actor's face in your short without permission is…", ["Fine if it's a parody", "Fine under 60 seconds", "*Not okay: it needs their consent", "Fine if you credit them"], "A real person's likeness needs their consent, credited or not."],
            ],
          }],
        ],
      },
      {
        t: "Capstone: your 60-second short",
        s: "Make it, finish it, premiere it.",
        items: [
          ["v", "Capstone brief: your 60-second short", "The brief, the rules and a production calendar that fits two weekends.", "8:20"],
          ["v", "Production week: from script to locked cut", "Follow one short through the whole pipeline in real time, mistakes included.", "14:50"],
          ["v", "Premiere night: share, submit and get feedback", "Release plan, festival picks, and how to ask for feedback that makes the next film better.", "9:40"],
          ["r", "Capstone workbook and feedback rubric", "Plan every shot, track credits, and score your cut the way Arjun does.", "template", 210],
        ],
      },
    ],
  },
];
