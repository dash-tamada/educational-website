import type { CourseSeed } from "./dsl";
import { daysAgo, u } from "./util";

/* The seven courses on the landing carousel (slugs must stay stable). */
export const LANDING_COURSES: CourseSeed[] = [
  /* ------------------------------------------------------------------------- Web Dev From Zero */
  {
    id: "crs_webdev",
    code: "wd",
    slug: "web-dev-from-zero",
    tutorId: "u_arjun",
    categoryId: "cat_coding",
    title: "Web Dev From Zero",
    promise: "HTML, CSS and JavaScript until you've shipped a real site you're proud of.",
    description:
      "Start with a blank file and finish with a live portfolio site. Arjun walks you through HTML, CSS and JavaScript in short, build-as-you-go lessons, with a tiny test after each big idea so nothing slips. No maths degree, no prior coding, just a laptop and a couple of evenings a week.",
    thumbnail: u("photo-1461749280684-dccba630e2f6"),
    tone: "aqua",
    level: "Beginner",
    language: "English",
    price: 1499,
    compareAtPrice: 2499,
    status: "published",
    tags: ["Coding", "Beginner", "HTML", "JavaScript"],
    badge: "BESTSELLER",
    featured: true,
    outcomes: [
      "Build and style pages with modern HTML and CSS",
      "Lay out anything with Flexbox and Grid",
      "Make pages interactive with plain JavaScript",
      "Put your own portfolio site online for free",
    ],
    requirements: ["A laptop (Windows, Mac or Linux)", "Curiosity. Zero coding experience needed"],
    rating: 4.8,
    learners: 3184,
    createdAt: daysAgo(540),
    updatedAt: daysAgo(12),
    publishedAt: daysAgo(510),
    modules: [
      {
        t: "Hello, web",
        s: "How the web works and your very first page.",
        items: [
          ["v", "How the web actually works", "Browsers, servers and what really happens when you hit Enter.", "9:24", [["0:00", "Intro"], ["2:10", "Clients and servers"], ["5:40", "What a URL is"], ["8:05", "Your plan"]]],
          ["v", "Set up VS Code and your first file", "Install the editor, two extensions, and open index.html in a browser.", "11:05"],
          ["v", "HTML: the skeleton of every page", "Headings, paragraphs, links and images, written by hand.", "14:40"],
          ["r", "Cheat sheet: 30 HTML tags you'll actually use", "One printable page. Stick it next to your screen.", "pdf", 320],
          ["q", {
            t: "Web basics check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "What does HTML mainly describe?", ["How the page looks", "*The structure and content of the page", "How the server stores data", "The page's animations"], "HTML is the structure: headings, paragraphs, links. CSS handles the looks."],
              ["tf", "A browser can open an HTML file straight from your computer, without any server.", true, "Double-click any .html file and the browser renders it. Servers matter once you share it."],
              ["m", "Which of these are real HTML elements?", ["*<section>", "*<button>", "<colour>", "*<img>"], "There is no <colour> tag. Colour is a CSS job."],
              ["sa", "Which HTML tag creates a link? (just the tag name)", ["a", "<a>"], "The anchor tag: <a href=\"...\">."],
            ],
          }],
        ],
      },
      {
        t: "CSS without tears",
        s: "Make it look good, and understand why it looks that way.",
        items: [
          ["v", "Selectors, the box model and why things jump", "Margin, border, padding, content. The four layers behind every layout bug.", "16:12"],
          ["v", "Flexbox in one sitting", "Rows, columns, alignment and the gap property.", "18:30"],
          ["v", "Grid for real layouts", "Build a magazine-style layout in twelve lines of CSS.", "15:48"],
          ["q", {
            t: "CSS layout quiz", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "In the box model, what sits between the border and the content?", ["Margin", "*Padding", "Outline", "Gap"], "Padding is inside the border, margin is outside."],
              ["s", "Which declaration turns an element into a flex container?", ["*display: flex", "flex: 1", "position: flex", "align: flex"], "display: flex on the parent; children become flex items."],
              ["tf", "CSS Grid can only create rows, not columns.", false, "Grid does both: grid-template-columns and grid-template-rows."],
              ["m", "Which units are relative?", ["*rem", "*%", "px", "*vw"], "px is absolute. rem, % and vw scale with something else."],
            ],
          }],
        ],
      },
      {
        t: "Make it responsive",
        s: "One site that works on a phone, a tablet and a giant monitor.",
        items: [
          ["v", "Mobile-first thinking", "Design for the smallest screen, then add room.", "10:20"],
          ["v", "Media queries and fluid type", "Breakpoints that follow your content, plus clamp() for text.", "13:05"],
          ["v", "Images that don't wreck your load time", "Sizes, formats and lazy loading in practice.", "9:50"],
          ["r", "Starter project files", "The full folder for modules 3 to 6, with images.", "zip", 2400],
        ],
      },
      {
        t: "JavaScript basics",
        s: "The language of the browser, one concept at a time.",
        items: [
          ["v", "Variables, types and the console", "let, const and the console as your best friend.", "15:30"],
          ["v", "Functions and why they matter", "Write once, use everywhere. Parameters and return values.", "17:10"],
          ["v", "Arrays and loops with real data", "Loop over a list of Bengaluru cafés and print the good ones.", "16:45"],
          ["q", {
            t: "JavaScript checkpoint", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "What does console.log(typeof 42) print?", ["\"string\"", "*\"number\"", "\"integer\"", "\"object\""], "JavaScript has one number type for integers and decimals."],
              ["tf", "A const variable can't be reassigned.", true, "const blocks reassignment of the name. Objects it points to can still change inside."],
              ["m", "Which of these are loops in JavaScript?", ["*for", "*while", "repeat", "*for...of"], "There's no repeat keyword in JavaScript."],
              ["sa", "Which array method adds an item to the end of an array?", ["push", "push()", ".push()"], "array.push(item) adds to the end and returns the new length."],
              ["s", "What is [1, 2, 3].length?", ["2", "*3", "4", "undefined"], "length counts items, and there are three."],
            ],
          }],
        ],
      },
      {
        t: "Talk to the page",
        s: "The DOM: change what people see when they click and type.",
        items: [
          ["v", "Selecting and changing elements", "querySelector, textContent and classList.", "12:55"],
          ["v", "Events: clicks, forms and keys", "Listen for what people do and respond.", "14:20"],
          ["v", "Build a to-do list", "Put it all together in one small, real app.", "22:40"],
          ["r", "To-do list solution code", "Compare your version with Arjun's.", "zip", 180],
        ],
      },
      {
        t: "Ship it",
        s: "Git, GitHub and a live URL you can send to anyone.",
        items: [
          ["v", "Git and GitHub in 15 minutes", "Commit, push, and never lose work again.", "15:10"],
          ["v", "Deploy your site for free", "From a GitHub repo to a live link in five clicks.", "11:35"],
          ["v", "Portfolio checklist and next steps", "What recruiters look at and what to learn next.", "8:25"],
          ["q", {
            t: "Final project review", pass: 70, tries: 0, gate: false,
            qs: [
              ["s", "Which command uploads your local commits to GitHub?", ["git pull", "git commit", "*git push", "git clone"], "push sends commits up; pull brings them down."],
              ["tf", "You have to pay for hosting to put a static site online.", false, "GitHub Pages, Netlify and others host static sites for free."],
              ["m", "What belongs on a portfolio site?", ["*Two or three finished projects", "*A way to contact you", "Every tutorial you ever followed", "*A short line about what you do"], "Quality beats quantity. Show finished work and make it easy to reach you."],
            ],
          }],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Colour, Actually */
  {
    id: "crs_colour",
    code: "cl",
    slug: "colour-for-designers",
    tutorId: "u_meera",
    categoryId: "cat_design",
    title: "Colour, Actually",
    promise: "Build palettes that feel right, and know exactly why they work.",
    description:
      "Colour isn't a talent, it's a set of decisions. Meera breaks palettes down into dials you can turn on purpose, then rebuilds real brands (including a chai stall) in front of you. You'll finish with your own palette, contrast-checked and ready for screens and print.",
    thumbnail: u("photo-1561070791-2526d30994b5"),
    tone: "magenta",
    level: "All levels",
    language: "English",
    price: 999,
    status: "published",
    tags: ["Design", "All levels", "Colour", "Branding"],
    badge: "NEW",
    outcomes: [
      "Explain any palette with hue, saturation and value",
      "Build a brand palette from one colour you love",
      "Pass accessibility contrast checks every time",
      "Use colour to guide attention in apps and posters",
    ],
    requirements: ["Any design tool (Figma is free)", "No design background needed"],
    rating: 4.9,
    learners: 1462,
    createdAt: daysAgo(210),
    updatedAt: daysAgo(20),
    publishedAt: daysAgo(180),
    modules: [
      {
        t: "Why colour feels",
        items: [
          ["v", "The three dials: hue, saturation, value", "Every colour decision is one of three dials.", "8:40"],
          ["v", "Warm, cool and the stories they tell", "Why turmeric yellow feels friendly and steel blue feels serious.", "10:15"],
          ["v", "Colour in Indian design traditions", "Rangoli, block prints and temple walls as palette lessons.", "12:30"],
          ["q", {
            t: "Colour basics", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Which dial describes how light or dark a colour is?", ["Hue", "Saturation", "*Value", "Temperature"], "Value is lightness. Squint at a design and you see its values."],
              ["tf", "Lowering saturation makes a colour look greyer.", true, "Saturation is intensity. Drain it and you head towards grey."],
              ["m", "Which are usually read as warm colours?", ["*Turmeric yellow", "*Sindoor red", "Teal", "*Saffron"], "Teal sits on the cool side of the wheel."],
              ["sa", "What's the word for the colour family itself, like red or blue?", ["hue"], "Hue is the family; saturation and value tune it."],
            ],
          }],
        ],
      },
      {
        t: "Build a palette",
        items: [
          ["v", "Start from one colour you love", "Derive a whole palette from a single swatch.", "9:55"],
          ["v", "60-30-10 and other honest rules", "Proportion matters more than the colours themselves.", "11:20"],
          ["v", "Harmonies that don't look like a textbook", "Analogous, complementary and when to break them.", "13:05"],
          ["r", "Palette worksheet", "Print it, fill it, photograph it for the critique.", "pdf", 540],
        ],
      },
      {
        t: "Contrast and access",
        items: [
          ["v", "Contrast ratios, demystified", "What 4.5:1 means and how to check it in seconds.", "10:45"],
          ["v", "Designing for colour blindness", "One in twelve men sees your palette differently.", "9:30"],
          ["q", {
            t: "Contrast check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "What's the WCAG AA minimum contrast for normal body text?", ["2:1", "3:1", "*4.5:1", "7:1"], "4.5:1 for body text, 3:1 for large text."],
              ["tf", "Red vs green on its own is a safe way to show error vs success.", false, "Red-green colour blindness is the most common kind. Add icons or text."],
              ["m", "Which of these help colour-blind users?", ["*Icons next to colours", "*Text labels", "A brighter red", "*Patterns in charts"], "Never let colour be the only signal."],
              ["sa", "What do you use to measure contrast: a contrast ___?", ["checker", "checker tool", "ratio checker"], "Any contrast checker works; Figma has plugins for it."],
            ],
          }],
        ],
      },
      {
        t: "Colour in the wild",
        items: [
          ["v", "Rebrand a chai stall (case study)", "From a faded board to a palette people remember.", "18:20"],
          ["v", "Palettes for apps and dashboards", "Neutrals, one accent, and status colours that behave.", "14:10"],
          ["r", "50 ready palettes (Figma file)", "Duplicate the file and remix freely.", "link"],
          ["v", "Your palette, critiqued", "Meera reviews three student palettes live.", "7:45"],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Guitar in 30 Days */
  {
    id: "crs_guitar",
    code: "gt",
    slug: "guitar-in-30-days",
    tutorId: "u_kabir",
    categoryId: "cat_music",
    title: "Guitar in 30 Days",
    promise: "Chords, strumming and your first three songs. Calluses not included.",
    description:
      "Fifteen minutes a day for thirty days. Kabir takes you from holding the guitar the wrong way to playing full songs, including one Bollywood unplugged favourite. Every lesson ends with a short practice loop, and the quizzes make sure your hands and your head are on the same page.",
    thumbnail: u("photo-1525201548942-d8732f6617a0"),
    tone: "sun",
    level: "Beginner",
    language: "English + Hindi",
    price: 1199,
    status: "published",
    tags: ["Music", "Beginner", "Guitar"],
    badge: "JUST DROPPED",
    outcomes: [
      "Tune your guitar by ear and with an app",
      "Play eight open chords and switch between them cleanly",
      "Strum the patterns behind hundreds of songs",
      "Play three full songs from start to finish",
    ],
    requirements: ["An acoustic guitar (any budget)", "15 minutes a day"],
    rating: 4.7,
    learners: 942,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(4),
    publishedAt: daysAgo(21),
    modules: [
      {
        t: "Meet your guitar",
        items: [
          ["v", "Parts of the guitar and how to hold it", "Posture first, so your wrist still likes you in a month.", "7:50"],
          ["v", "Tuning by ear and with an app", "Two ways to tune, and why you should learn both.", "9:10"],
          ["v", "Your first two chords: Em and G", "Clean notes, no buzzing, one finger at a time.", "12:35"],
          ["r", "Chord chart poster", "Every chord in the course on one A3 poster.", "pdf", 900],
        ],
      },
      {
        t: "Strumming that grooves",
        items: [
          ["v", "Down strokes, up strokes, the pendulum", "Keep your hand moving like a clock.", "10:40"],
          ["v", "The D DU UDU pattern", "The strum behind a thousand campfire songs.", "11:25"],
          ["v", "Switching chords without stopping", "The one-minute changes drill.", "13:15"],
          ["q", {
            t: "Strumming check", pass: 70, tries: 0, gate: true,
            qs: [
              ["s", "Which string is the thickest on a standard-tuned guitar?", ["*Low E", "A", "High E", "B"], "The low E string is the thickest and lowest-pitched."],
              ["tf", "Your strumming hand should keep moving even on beats you don't hit.", true, "The pendulum keeps time. You just miss the strings on some strokes."],
              ["m", "Which chords have you learned so far?", ["*Em", "*G", "Bm", "F#"], "Em and G so far. The others are coming."],
              ["sa", "How many strings does a standard guitar have?", ["6", "six"], "Six strings: E A D G B E."],
            ],
          }],
        ],
      },
      {
        t: "Song one",
        items: [
          ["v", "C and D chords", "Two more shapes and you can play most pop songs.", "10:05"],
          ["v", "Your first full progression", "G, D, Am, C: the four chords behind half the radio.", "14:30"],
          ["r", "30-day practice tracker", "Tick off every day. Streaks are motivating.", "sheet", 60],
        ],
      },
      {
        t: "Fingers that listen",
        items: [
          ["v", "Fingerpicking basics", "Thumb on bass, fingers on melody.", "12:40"],
          ["v", "The F chord problem (and a cheat)", "Everybody hates F at first. Here's the small version.", "11:55"],
          ["q", {
            t: "Fingerstyle quiz", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "In fingerpicking, which finger usually plays the bass strings?", ["Index", "Middle", "*Thumb", "Ring"], "The thumb looks after the three bass strings."],
              ["tf", "A capo changes the key without changing your chord shapes.", true, "Clamp it on a fret and every shape moves up together."],
              ["s", "What's the easiest way to play F as a beginner?", ["Full barre", "*Small F on the top four strings", "Skip it forever", "Tune the guitar down"], "Small F builds the strength you need for the full barre later."],
              ["sa", "What tool keeps steady time while you practise?", ["metronome", "a metronome"], "A metronome. Free apps work perfectly."],
            ],
          }],
        ],
      },
      {
        t: "Play with people",
        items: [
          ["v", "Keeping time with a metronome", "Start slow, speed up 5 bpm a day.", "8:20"],
          ["v", "Bollywood unplugged: a full song", "Put every skill together in one song.", "19:45"],
          ["v", "Record yourself and improve", "Your phone is the most honest teacher you have.", "9:05"],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Money Without the Ick */
  {
    id: "crs_money",
    code: "mn",
    slug: "money-basics",
    tutorId: "u_nisha",
    categoryId: "cat_life",
    title: "Money Without the Ick",
    promise: "Budgets, savings, investing basics. Explained like a friend would.",
    description:
      "Nobody taught us money at school, so we learned it from uncles and Instagram. Nisha, a chartered accountant, fixes that with short, judgement-free lessons on budgeting, emergency funds, SIPs, credit scores and tax slabs, all in rupees and all for real Indian salaries.",
    thumbnail: u("photo-1633158829585-23ba8f7c8caf"),
    tone: "lilac",
    level: "Beginner",
    language: "English",
    price: 799,
    status: "published",
    tags: ["Finance", "Life skills", "Investing"],
    badge: "NEW",
    outcomes: [
      "Build a budget that survives a real month",
      "Set up an emergency fund and know where to keep it",
      "Start a SIP and understand what you're buying",
      "Read your payslip, credit score and tax slab with confidence",
    ],
    requirements: ["A bank account", "Willingness to look at your own numbers"],
    rating: 4.8,
    learners: 2210,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    publishedAt: daysAgo(270),
    modules: [
      {
        t: "Money, honestly",
        items: [
          ["v", "Why money feels awkward (and why it shouldn't)", "A judgement-free start, with a two-minute money check.", "8:15"],
          ["v", "Where your salary actually goes", "Track one month without changing anything.", "10:40"],
          ["v", "The 50-30-20 budget, Indian edition", "Needs, wants and future you, with rent and EMIs included.", "12:20"],
          ["r", "Budget sheet template", "Google Sheets template with the formulas already in.", "sheet", 45],
        ],
      },
      {
        t: "Save without suffering",
        items: [
          ["v", "Emergency fund: how much is enough?", "The number that turns a crisis into an inconvenience.", "9:35"],
          ["v", "FDs, RDs and savings accounts compared", "Interest, liquidity and the boring-is-good principle.", "11:50"],
          ["q", {
            t: "Saving basics", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "A common rule of thumb for an emergency fund is…", ["One week of expenses", "*Three to six months of expenses", "Two years of salary", "Whatever is left over"], "Three to six months of essential expenses covers most surprises."],
              ["tf", "In the 50-30-20 budget, 20% goes to savings and investments.", true, "50 needs, 30 wants, 20 future you."],
              ["m", "Which are sensible places for an emergency fund?", ["*Savings account", "*Liquid fund", "Small-cap stocks", "*Sweep-in FD"], "Emergency money needs to be safe and quick to reach. Stocks are neither."],
              ["sa", "What does FD stand for?", ["fixed deposit"], "Fixed deposit: lock money for a term at a fixed rate."],
            ],
          }],
        ],
      },
      {
        t: "Investing basics",
        items: [
          ["v", "What a mutual fund actually is", "A shared basket, a fund manager and a fee.", "13:10"],
          ["v", "SIPs and the magic of compounding", "₹2,000 a month at 24 vs at 34, side by side.", "12:45"],
          ["v", "Index funds vs active funds", "Why the boring option often wins.", "11:05"],
          ["v", "Risk, explained without a chart", "Volatility, time and sleeping well at night.", "9:20"],
          ["q", {
            t: "Investing check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "What does SIP stand for?", ["Stock Investment Plan", "*Systematic Investment Plan", "Savings Interest Programme", "Secure Income Policy"], "A fixed amount invested automatically on a schedule."],
              ["tf", "An index fund tries to beat the market by picking the best stocks.", false, "It copies an index like the Nifty 50 instead of picking."],
              ["m", "Which of these reduce investing risk?", ["*Diversifying", "*Investing for longer", "Checking prices every hour", "*Not investing money you'll need soon"], "Checking prices often only increases stress."],
              ["s", "Compounding means earning returns on…", ["Only your original amount", "*Your money and its past returns", "Your salary", "Tax refunds"], "Returns earn returns. That's the whole trick."],
            ],
          }],
        ],
      },
      {
        t: "Grown-up stuff",
        items: [
          ["v", "Credit scores and your first credit card", "How CIBIL works and how to use a card without debt.", "10:30"],
          ["v", "Tax slabs in plain English", "Old vs new regime with a real salary example.", "14:15"],
          ["v", "Insurance you actually need", "Term and health cover, and the policies to skip.", "11:40"],
          ["r", "Money checklist for your 20s", "Twelve things to set up, in order.", "pdf", 260],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Phone to Pro Photos */
  {
    id: "crs_photo",
    code: "ph",
    slug: "phone-to-pro-photography",
    tutorId: "u_sana",
    categoryId: "cat_photography",
    title: "Phone to Pro Photos",
    promise: "Light, framing and editing so your camera roll looks intentional.",
    description:
      "You already carry a great camera. Sana shows you how to see light, frame a story and edit with restraint, using only your phone and free apps. Lessons are shot on the streets of old Hyderabad, at weddings and at her kitchen window.",
    thumbnail: u("photo-1516035069371-29a1b244cc32"),
    tone: "tangerine",
    level: "All levels",
    language: "English",
    price: 1299,
    status: "published",
    tags: ["Photography", "All levels", "Editing"],
    badge: "BESTSELLER",
    featured: true,
    outcomes: [
      "Use your phone camera's manual controls with confidence",
      "Find good light at any time of day",
      "Compose photos that guide the viewer's eye",
      "Edit a consistent, natural look in Lightroom Mobile",
    ],
    requirements: ["Any smartphone from the last five years", "Lightroom Mobile (free)"],
    rating: 4.8,
    learners: 2675,
    createdAt: daysAgo(420),
    updatedAt: daysAgo(15),
    publishedAt: daysAgo(400),
    modules: [
      {
        t: "Your phone is enough",
        items: [
          ["v", "Camera settings worth changing today", "Gridlines, HDR, RAW and the focus lock.", "8:55"],
          ["v", "Clean lens, steady hands, sharp shots", "The three boring habits behind sharp photos.", "6:40"],
          ["v", "Gridlines and the rule of thirds", "Where to put things, and when to ignore the grid.", "9:15"],
          ["q", {
            t: "Phone camera basics", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "The rule of thirds splits the frame into…", ["Two halves", "*Nine equal parts", "Four corners", "Three circles"], "Two horizontal and two vertical lines make nine parts."],
              ["tf", "Digital zoom on most phones loses image quality.", true, "Digital zoom just crops. Walk closer instead."],
              ["m", "Which help you get sharper phone photos?", ["*Wiping the lens", "*Tapping to focus", "Shaking the phone", "*Bracing your elbows"], "A clean lens and a steady body beat any filter."],
              ["sa", "What do photographers call the hour after sunrise and before sunset?", ["golden hour", "the golden hour"], "Golden hour: soft, warm, low light."],
            ],
          }],
        ],
      },
      {
        t: "Chasing light",
        items: [
          ["v", "Golden hour and blue hour", "Plan shoots around the sun with a free app.", "11:30"],
          ["v", "Shooting in harsh noon sun", "Shade, silhouettes and contrast as a style.", "10:05"],
          ["v", "Window light portraits", "The best portrait studio in your house.", "12:20"],
          ["r", "Light cheat card", "Which light, which subject, which time.", "pdf", 380],
        ],
      },
      {
        t: "Composition",
        items: [
          ["v", "Leading lines in old city streets", "Charminar lanes as a composition classroom.", "13:45"],
          ["v", "Framing, layers and depth", "Shoot through doorways, arches and crowds.", "12:10"],
          ["v", "Shooting people without making it weird", "Consent, eye contact and patience.", "10:50"],
          ["q", {
            t: "Composition check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Leading lines are used to…", ["Fill empty space", "*Guide the eye through the photo", "Make photos brighter", "Hide the subject"], "Roads, rails and railings pull the eye towards your subject."],
              ["tf", "Putting the subject dead centre is always a mistake.", false, "Centred, symmetrical shots can be powerful. Rules are starting points."],
              ["m", "Ways to add depth to a photo", ["*Foreground objects", "*Layers at different distances", "Flat lighting only", "*Framing through a doorway"], "Depth comes from layers: near, middle and far."],
              ["s", "Before photographing a stranger up close you should…", ["Shoot quickly and leave", "*Ask, or at least make eye contact and smile", "Use the flash", "Hide your phone"], "Respect first. Most people say yes when you ask kindly."],
            ],
          }],
        ],
      },
      {
        t: "Editing",
        items: [
          ["v", "Lightroom Mobile tour", "Every panel you need and the ones you can ignore.", "14:35"],
          ["v", "A natural edit in five sliders", "Exposure, contrast, highlights, shadows, warmth.", "12:55"],
          ["v", "Make your own preset", "Save your look and apply it in one tap.", "9:40"],
          ["r", "Sana's 5 presets", "DNG presets for Lightroom Mobile and desktop.", "zip", 1800],
        ],
      },
      {
        t: "Tell a story",
        items: [
          ["v", "Photo essays: twelve frames, one story", "Plan, shoot and sequence a mini essay.", "15:20"],
          ["v", "A grid that feels like you", "Consistency without sameness on Instagram.", "11:25"],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Chemistry, Made Visual */
  {
    id: "crs_chem",
    code: "ch",
    slug: "chemistry-made-visual",
    tutorId: "u_vikram",
    categoryId: "cat_exam",
    title: "Chemistry, Made Visual",
    promise: "Exam-ready chemistry with experiments you can actually picture.",
    description:
      "Class 11 and 12 chemistry for boards, JEE and NEET, built around pictures instead of rote. Dr. Vikram turns atoms into stadiums, bonds into tug-of-wars and equilibrium into a seesaw, then drills you with previous-year questions until the pictures stick.",
    thumbnail: u("photo-1614935151651-0bea6508db6b"),
    tone: "blue",
    level: "Intermediate",
    language: "English",
    price: 1599,
    compareAtPrice: 2199,
    status: "published",
    tags: ["Science", "Exam prep", "JEE", "NEET"],
    badge: "NEW",
    outcomes: [
      "Picture atomic structure, bonding and shapes instead of memorising",
      "Solve mole-concept and stoichiometry problems step by step",
      "Reason through equilibrium and pH questions",
      "Tackle previous-year JEE and NEET questions with confidence",
    ],
    requirements: ["Class 10 science", "A notebook for practice problems"],
    rating: 4.9,
    learners: 4120,
    createdAt: daysAgo(250),
    updatedAt: daysAgo(8),
    publishedAt: daysAgo(230),
    modules: [
      {
        t: "Atoms you can picture",
        items: [
          ["v", "Atomic structure as a stadium", "Nucleus on the pitch, electrons in the stands.", "12:40"],
          ["v", "Electron configuration without memorising", "Aufbau, Hund and Pauli as seating rules.", "14:55"],
          ["v", "Periodic trends in one picture", "Radius, ionisation energy and electronegativity on one map.", "13:30"],
          ["q", {
            t: "Atomic structure", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "How many electrons can the 2p subshell hold?", ["2", "*6", "8", "10"], "Three p orbitals with two electrons each: six."],
              ["tf", "Atomic radius generally decreases across a period from left to right.", true, "More protons pull the same shell in tighter."],
              ["m", "Which of these are noble gases?", ["*Neon", "*Argon", "Nitrogen", "*Krypton"], "Nitrogen is in group 15, not 18."],
              ["sa", "What is the atomic number of carbon?", ["6", "six"], "Carbon has six protons."],
            ],
          }],
        ],
      },
      {
        t: "Bonding",
        items: [
          ["v", "Ionic vs covalent, a tug of war", "Electronegativity difference decides who wins.", "11:45"],
          ["v", "VSEPR shapes with clay balls", "Predict molecular shapes you can hold.", "15:20"],
          ["v", "Hybridisation made visual", "sp, sp² and sp³ as mixing paint.", "16:05"],
          ["r", "Molecular shapes flashcards", "36 cards to cut out and quiz yourself.", "pdf", 1100],
        ],
      },
      {
        t: "Mole concept",
        items: [
          ["v", "The mole is just a dozen", "A counting unit, nothing scarier.", "10:50"],
          ["v", "Stoichiometry step by step", "The four-step method for every problem.", "17:35"],
          ["v", "Limiting reagent problems", "Who runs out first decides everything.", "15:15"],
          ["q", {
            t: "Mole concept", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Avogadro's number is approximately…", ["6.02 × 10²²", "*6.02 × 10²³", "3.0 × 10⁸", "1.6 × 10⁻¹⁹"], "6.022 × 10²³ particles per mole."],
              ["tf", "The limiting reagent is always the one present in the largest mass.", false, "It's the one that runs out first, which depends on moles and ratios, not mass."],
              ["s", "Molar mass of water (H₂O) in g/mol?", ["16", "*18", "20", "10"], "2 × 1 + 16 = 18 g/mol."],
              ["sa", "How many moles are in 36 g of water?", ["2", "two", "2 mol"], "36 ÷ 18 = 2 moles."],
            ],
          }],
        ],
      },
      {
        t: "Thermodynamics",
        items: [
          ["v", "Enthalpy as a bank account", "Deposits, withdrawals and Hess's law.", "13:20"],
          ["v", "Entropy and why rooms get messy", "Disorder, probability and your hostel room.", "12:05"],
          ["v", "Gibbs energy and spontaneity", "ΔG = ΔH − TΔS, with a feel for each term.", "14:45"],
        ],
      },
      {
        t: "Equilibrium",
        items: [
          ["v", "Le Chatelier with a seesaw", "Push the system and watch it push back.", "12:30"],
          ["v", "pH and buffers", "Logs without fear and why blood stays at 7.4.", "16:10"],
          ["q", {
            t: "Equilibrium check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Adding more reactant to a system at equilibrium shifts it…", ["*Towards products", "Towards reactants", "Nowhere", "It stops the reaction"], "The system uses up the extra reactant by making more product."],
              ["tf", "A solution with pH 3 is more acidic than one with pH 5.", true, "Lower pH, more H⁺. pH 3 has 100× the H⁺ of pH 5."],
              ["m", "Which pairs form buffers?", ["*Acetic acid + sodium acetate", "*Ammonia + ammonium chloride", "HCl + NaCl", "Pure water"], "A buffer needs a weak acid or base with its conjugate."],
              ["sa", "pH of a neutral solution at 25 °C?", ["7", "seven"], "Neutral water at 25 °C has pH 7."],
            ],
          }],
        ],
      },
      {
        t: "Organic starter",
        items: [
          ["v", "Naming compounds (IUPAC) fast", "Longest chain, lowest locants, alphabetical order.", "18:25"],
          ["v", "Reaction mechanisms: arrows that mean something", "Curly arrows as electron traffic.", "19:40"],
          ["r", "Previous-year JEE questions", "60 questions with worked solutions.", "pdf", 2400],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Start a Podcast */
  {
    id: "crs_podcast",
    code: "pd",
    slug: "start-a-podcast",
    tutorId: "u_rhea",
    categoryId: "cat_creator",
    title: "Start a Podcast",
    promise: "From a voice memo to a published show, with gear on any budget.",
    description:
      "Rhea has produced more than 200 episodes from a tiny Mumbai studio. In this course she shows you how to find a show idea people actually want, record great audio on a phone or a ₹1,500 mic, edit in free software and publish to Spotify, all in about a weekend.",
    thumbnail: u("photo-1478737270239-2f02b77fc618"),
    tone: "bubblegum",
    level: "Beginner",
    language: "English + Hindi",
    price: 899,
    status: "published",
    tags: ["Creator", "Beginner", "Audio"],
    badge: "JUST DROPPED",
    outcomes: [
      "Shape a show idea and a one-line pitch",
      "Record clean audio with gear you already own",
      "Edit an episode in Audacity from start to finish",
      "Publish to Spotify and Apple Podcasts and find your first listeners",
    ],
    requirements: ["A smartphone or a laptop", "Something you can't stop talking about"],
    rating: 4.6,
    learners: 688,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
    publishedAt: daysAgo(14),
    modules: [
      {
        t: "Find your show",
        items: [
          ["v", "What makes a podcast worth subscribing to", "Promise, personality and a reason to come back.", "9:20"],
          ["v", "Pick a format: solo, duo or interview", "Match the format to your energy and schedule.", "10:35"],
          ["v", "Name, cover art and a one-line pitch", "Make it findable and clickable.", "11:10"],
          ["r", "Show planning canvas", "One page to plan your first season.", "pdf", 420],
        ],
      },
      {
        t: "Gear on any budget",
        items: [
          ["v", "Recording on your phone (seriously)", "Settings and placement for surprisingly good audio.", "8:45"],
          ["v", "Mic buying guide: ₹1,500 to ₹15,000", "What each price jump actually gets you.", "12:25"],
          ["v", "Make a cupboard studio", "Clothes are the best acoustic foam money can't buy.", "7:30"],
          ["q", {
            t: "Gear check", pass: 70, tries: 0, gate: true,
            qs: [
              ["s", "What's the biggest sound upgrade on a budget?", ["A pricier laptop", "*A quieter room with soft surfaces", "More cables", "A ring light"], "Room sound matters more than mic price at the start."],
              ["tf", "A dynamic mic usually picks up less room noise than a condenser mic.", true, "Dynamics are less sensitive, which is great for untreated rooms."],
              ["m", "Which of these soak up echo?", ["*Clothes in a cupboard", "*Pillows and blankets", "Bare tiled walls", "*A rug"], "Soft, uneven surfaces absorb reflections. Tiles bounce them."],
              ["sa", "What feed lets apps like Spotify find your show? (three letters)", ["rss"], "Your host gives you an RSS feed that directories read."],
            ],
          }],
        ],
      },
      {
        t: "Record and edit",
        items: [
          ["v", "Interview like a curious friend", "Questions that get stories, not one-word answers.", "13:50"],
          ["v", "Editing in Audacity, step by step", "Cut, clean, level and export.", "18:15"],
          ["v", "Music, intros and loudness", "Royalty-free music and -16 LUFS explained.", "10:40"],
          ["r", "Royalty-free intro pack", "Eight short intro stings you can use forever.", "audio", 5200],
        ],
      },
      {
        t: "Publish and grow",
        items: [
          ["v", "Hosting, RSS and Spotify in one go", "Pick a host and go live in twenty minutes.", "11:55"],
          ["v", "Your first 100 listeners", "Clips, guests and asking for reviews without cringing.", "12:30"],
          ["q", {
            t: "Launch quiz", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "A good episode title should be…", ["Episode 7", "*Specific about what listeners get", "As long as possible", "Only emojis"], "Tell people what they'll get from pressing play."],
              ["tf", "You need ten episodes recorded before you can launch.", false, "Three is plenty to show the shape of your show."],
              ["m", "Good ways to find your first listeners", ["*Share clips on Instagram", "*Guest on other podcasts", "Buy fake followers", "*Ask friends for honest reviews"], "Real people beat fake numbers every time."],
            ],
          }],
        ],
      },
    ],
  },
];
