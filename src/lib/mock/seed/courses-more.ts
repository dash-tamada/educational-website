import type { CourseSeed } from "./dsl";
import { daysAgo, u } from "./util";

/* The rest of the catalogue: published, in review, drafts, rejected, archived. */
export const MORE_COURSES: CourseSeed[] = [
  /* ------------------------------------------------------------------------- Python for Data */
  {
    id: "crs_python",
    code: "py",
    slug: "python-for-data",
    tutorId: "u_arjun",
    categoryId: "cat_coding",
    title: "Python for Data",
    promise: "pandas, charts and a real IPL analysis, without a stats degree.",
    description:
      "Go from Python basics to analysing real Indian datasets: IPL seasons, monsoon rainfall and UPI transactions. Arjun teaches the 20% of pandas and plotting you'll use every day, then you build a full analysis you can show in interviews.",
    thumbnail: u("photo-1526379095098-d400fd0bf935"),
    tone: "turquoise",
    level: "Intermediate",
    language: "English",
    price: 1799,
    status: "published",
    tags: ["Coding", "Data", "Python"],
    outcomes: [
      "Load, clean and reshape messy data with pandas",
      "Answer real questions with group-by and pivots",
      "Make honest, readable charts with matplotlib and seaborn",
      "Present a complete data project end to end",
    ],
    requirements: ["Basic Python (variables, loops) or Web Dev From Zero", "A laptop that can run Jupyter"],
    rating: 4.7,
    learners: 1386,
    createdAt: daysAgo(330),
    updatedAt: daysAgo(25),
    publishedAt: daysAgo(300),
    modules: [
      {
        t: "Python warm-up",
        items: [
          ["v", "Install Python and Jupyter", "One clean setup that won't fight you later.", "9:30"],
          ["v", "Variables, lists and dicts", "The three containers you'll use in every notebook.", "14:20"],
          ["v", "Loops and functions refresher", "Enough to feel at home before pandas.", "13:15"],
          ["q", {
            t: "Python basics", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Which type stores key-value pairs?", ["list", "tuple", "*dict", "set"], "dicts map keys to values: {\"city\": \"Pune\"}."],
              ["tf", "Python lists are zero-indexed.", true, "The first item is items[0]."],
              ["m", "Which of these are valid ways to loop?", ["*for x in items:", "*while condition:", "loop items:", "*for i in range(5):"], "There's no loop keyword in Python."],
              ["sa", "Which keyword defines a function in Python?", ["def"], "def name(args): starts a function."],
            ],
          }],
        ],
      },
      {
        t: "pandas, properly",
        items: [
          ["v", "DataFrames are just smart tables", "Rows, columns, index and dtypes.", "15:40"],
          ["v", "Cleaning messy CSVs", "Missing values, wrong types and duplicate rows.", "18:05"],
          ["v", "Group by and pivot", "Answer 'which team, which season, which city' questions.", "16:30"],
          ["r", "Practice datasets (IPL, rainfall, UPI)", "Three cleaned and three messy CSVs.", "zip", 6400],
        ],
      },
      {
        t: "Charts that tell the truth",
        items: [
          ["v", "matplotlib basics", "Figures, axes and the three charts you'll use most.", "12:50"],
          ["v", "Seaborn for quick insights", "Distributions and relationships in one line.", "13:25"],
          ["v", "Choosing the right chart", "Bars for comparison, lines for time, and no pie charts (mostly).", "10:15"],
          ["q", {
            t: "pandas and charts", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Which method shows the first five rows of a DataFrame?", ["df.top()", "*df.head()", "df.first()", "df.show()"], "df.head() defaults to five rows."],
              ["tf", "A bar chart is the best way to show a trend across 50 time points.", false, "A line chart shows trends over time much more clearly."],
              ["m", "Common cleaning steps", ["*Dropping duplicates", "*Fixing data types", "Deleting the whole dataset", "*Handling missing values"], "Clean, don't destroy."],
              ["sa", "Which pandas method groups rows by a column?", ["groupby", "groupby()", ".groupby()"], "df.groupby(\"team\") then aggregate."],
            ],
          }],
        ],
      },
      {
        t: "Mini project",
        items: [
          ["v", "Analysing IPL seasons end to end", "Question, clean, analyse, chart, conclude.", "24:10"],
          ["v", "Presenting your findings", "Turn a notebook into a story people follow.", "9:45"],
          ["r", "Project template notebook", "A tidy notebook structure to reuse.", "template", 120],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- React in Practice (draft) */
  {
    id: "crs_react",
    code: "rx",
    slug: "react-in-practice",
    tutorId: "u_arjun",
    categoryId: "cat_coding",
    title: "React in Practice",
    promise: "Components, hooks and a real app, the way teams build them today.",
    description:
      "A practical React course for people who know some JavaScript. Build an expense splitter for your flatmates while learning components, state, effects and data fetching. Still being recorded.",
    thumbnail: u("photo-1633356122544-f134324a6cee"),
    tone: "indigo",
    level: "Intermediate",
    language: "English",
    price: 1999,
    status: "draft",
    tags: ["Coding", "React", "JavaScript"],
    outcomes: [
      "Think in components and props",
      "Manage state and effects without bugs",
      "Fetch and display data the modern way",
      "Ship a small React app",
    ],
    requirements: ["Comfortable with JavaScript basics"],
    rating: 0,
    learners: 0,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(1),
    modules: [
      {
        t: "Thinking in components",
        items: [
          ["v", "Why React exists", "The problem React solves, in one small demo.", "8:30"],
          ["v", "Components and props", "Split a UI into pieces that make sense.", "13:40"],
          ["v", "State with useState", "Make components remember things.", "15:10"],
        ],
      },
      {
        t: "Effects and data",
        items: [
          ["v", "useEffect without the footguns", "When you need it, and when you really don't.", "16:45"],
          ["v", "Fetching data the modern way", "Loading, error and empty states done right.", "14:20"],
          ["q", {
            t: "Hooks check", pass: 70, tries: 0, gate: true,
            qs: [
              ["s", "Which hook stores local component state?", ["useEffect", "*useState", "useMemo", "useRef"], "useState returns the value and a setter."],
              ["tf", "Changing ref.current from useRef triggers a re-render.", false, "Refs are mutable boxes; changing them doesn't re-render."],
              ["sa", "What do you pass to a component to configure it?", ["props"], "Props flow down from parent to child."],
            ],
          }],
        ],
      },
      {
        t: "Ship a real app",
        items: [
          ["v", "Build an expense splitter", "Flatmates, bills and who owes whom.", "26:30"],
          ["r", "Starter repo", "Clone it to code along.", "link"],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Git Without Fear (in review) */
  {
    id: "crs_git",
    code: "gf",
    slug: "git-without-fear",
    tutorId: "u_arjun",
    categoryId: "cat_coding",
    title: "Git Without Fear",
    promise: "Commit, branch and undo anything, so you never lose work again.",
    description:
      "Git scares people because nobody explains what it's actually doing. Arjun uses a notebook analogy to make commits, branches and merges obvious, then shows you how to undo almost any mistake. Ideal before your first team project or internship.",
    thumbnail: u("photo-1556075798-4825dfaaf498"),
    tone: "butter",
    level: "Beginner",
    language: "English",
    price: 699,
    status: "in_review",
    tags: ["Coding", "Git", "Beginner"],
    outcomes: [
      "Understand commits, branches and merges",
      "Fix merge conflicts calmly",
      "Collaborate with pull requests on GitHub",
      "Undo mistakes without panic",
    ],
    requirements: ["A laptop with a terminal"],
    rating: 0,
    learners: 0,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(2),
    submittedAt: daysAgo(2, 18, 20),
    modules: [
      {
        t: "Why Git",
        items: [
          ["v", "Version control explained with a notebook", "Snapshots, history and why it matters.", "7:15"],
          ["v", "Install and configure Git", "Name, email, editor and a sensible default branch.", "8:40"],
          ["v", "Your first commit", "init, add, commit, log.", "10:25"],
          ["q", {
            t: "Commit basics", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Which command stages all changes in the current folder?", ["git commit -a", "*git add .", "git push", "git stage all"], "git add . stages everything under the current folder."],
              ["tf", "A commit saves a snapshot of your staged changes.", true, "Only what's staged goes into the commit."],
              ["sa", "Which command shows the state of your working tree?", ["git status", "status"], "Run git status constantly. It's free."],
            ],
          }],
        ],
      },
      {
        t: "Branches",
        items: [
          ["v", "Branches are cheap, use them", "One branch per idea.", "11:30"],
          ["v", "Merging and fixing conflicts", "Conflicts are just Git asking a question.", "15:55"],
          ["r", "Git command cheat sheet", "Every command in the course on one page.", "pdf", 210],
        ],
      },
      {
        t: "Teamwork on GitHub",
        items: [
          ["v", "Pull requests and reviews", "Propose, discuss, merge.", "13:10"],
          ["v", "Undo almost anything", "restore, revert, reset and reflog.", "12:45"],
          ["q", {
            t: "Branches and undo", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Which command creates and switches to a new branch?", ["git branch -d new", "*git switch -c new", "git merge new", "git checkout main"], "switch -c creates and switches in one go."],
              ["m", "Safe ways to undo", ["*git revert", "*git restore", "Deleting the .git folder", "*git commit --amend (before pushing)"], "Deleting .git deletes your history."],
              ["tf", "A merge conflict means you broke the repository.", false, "It means two changes touched the same lines. You decide which wins."],
            ],
          }],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Excel for Work */
  {
    id: "crs_excel",
    code: "xl",
    slug: "excel-for-work",
    tutorId: "u_farhan",
    categoryId: "cat_business",
    title: "Excel for Work",
    promise: "XLOOKUP, pivots and dashboards that make you the office spreadsheet person.",
    description:
      "The Excel skills that actually come up at work, taught with real sales, inventory and attendance sheets. Farhan skips the trivia and goes straight to formulas, pivot tables and a dashboard your manager will want every Monday.",
    thumbnail: u("photo-1460925895917-afdab827c52f"),
    tone: "mint",
    level: "Beginner",
    language: "English + Hindi",
    price: 899,
    status: "published",
    tags: ["Business", "Excel", "Career"],
    badge: "BESTSELLER",
    outcomes: [
      "Write formulas with confident cell references",
      "Use IF, XLOOKUP and SUMIFS on real reports",
      "Summarise thousands of rows with pivot tables",
      "Build a one-page sales dashboard",
    ],
    requirements: ["Excel 2021 / Microsoft 365, or Google Sheets"],
    rating: 4.7,
    learners: 3540,
    createdAt: daysAgo(480),
    updatedAt: daysAgo(40),
    publishedAt: daysAgo(460),
    modules: [
      {
        t: "Excel, minus the fear",
        items: [
          ["v", "The interface in 8 minutes", "Ribbons, sheets and the shortcuts worth learning.", "8:05"],
          ["v", "Formulas and cell references", "Make Excel do the maths.", "12:30"],
          ["v", "Absolute vs relative references", "The dollar sign that saves careers.", "10:20"],
          ["q", {
            t: "Formula basics", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Which reference stays fixed when you copy a formula?", ["A1", "*$A$1", "A1:A2", "R1C1"], "Dollar signs lock the column and the row."],
              ["tf", "Every Excel formula starts with an equals sign.", true, "= tells Excel it's a formula, not text."],
              ["sa", "Which function adds up a range of numbers?", ["sum", "sum()", "=sum"], "=SUM(A1:A10)."],
              ["m", "Which are valid cell references?", ["*B7", "*$C$2", "7B", "*AA10"], "Column letters come first, then the row number."],
            ],
          }],
        ],
      },
      {
        t: "Formulas that save hours",
        items: [
          ["v", "IF, AND, OR in real reports", "Flag late payments and low stock automatically.", "13:40"],
          ["v", "XLOOKUP (and why VLOOKUP retired)", "Find anything, in any direction.", "14:55"],
          ["v", "SUMIFS and COUNTIFS", "Totals by region, month and salesperson.", "12:15"],
          ["r", "Practice workbook", "Every exercise from this module with answers.", "sheet", 340],
        ],
      },
      {
        t: "Pivot tables",
        items: [
          ["v", "Your first pivot table", "From 10,000 rows to one clear summary.", "11:50"],
          ["v", "Slicers and grouping by month", "Interactive filters people love clicking.", "10:35"],
          ["q", {
            t: "Pivot check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Pivot tables are best for…", ["Writing letters", "*Summarising large tables quickly", "Drawing shapes", "Spell check"], "Drag fields to summarise in seconds."],
              ["tf", "A slicer filters a pivot table with clickable buttons.", true, "Slicers are visual filters."],
              ["s", "To show monthly totals from daily dates you should…", ["Retype every date", "*Group the date field by months", "Delete rows", "Make a chart first"], "Right-click a date field and choose Group."],
            ],
          }],
        ],
      },
      {
        t: "Dashboards",
        items: [
          ["v", "Charts your manager will actually read", "Fewer colours, clearer titles.", "12:25"],
          ["v", "Build a sales dashboard", "KPIs, a trend line and a top-ten table.", "21:40"],
          ["r", "Dashboard template", "Plug in your data and go.", "sheet", 520],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Spoken English Confidence */
  {
    id: "crs_english",
    code: "en",
    slug: "spoken-english-confidence",
    tutorId: "u_tara",
    categoryId: "cat_languages",
    title: "Spoken English Confidence",
    promise: "Speak up in meetings, calls and interviews without freezing.",
    description:
      "Confidence first, grammar second. Tara's course is built on short daily speaking habits, clear pronunciation and real situations: small talk, video calls, disagreeing politely and the dreaded 'tell me about yourself'.",
    thumbnail: u("photo-1543269865-cbf427effbad"),
    tone: "cyan",
    level: "All levels",
    language: "English",
    price: 1099,
    status: "published",
    tags: ["Languages", "Career", "Speaking"],
    outcomes: [
      "Stop translating in your head and speak more naturally",
      "Pronounce clearly with good stress and rhythm",
      "Handle calls, meetings and small talk with ease",
      "Answer common interview questions confidently",
    ],
    requirements: ["Basic English reading", "Ten minutes a day to speak out loud"],
    rating: 4.8,
    learners: 2890,
    createdAt: daysAgo(390),
    updatedAt: daysAgo(18),
    publishedAt: daysAgo(370),
    modules: [
      {
        t: "Confidence first",
        items: [
          ["v", "Why you freeze (and how to unfreeze)", "The science of speaking anxiety, plus one trick.", "9:40"],
          ["v", "Thinking in English, not translating", "Build a running commentary habit.", "11:15"],
          ["v", "The 2-minute daily speaking habit", "Record, listen, repeat.", "7:50"],
          ["r", "30-day speaking prompts", "A prompt a day, from easy to tricky.", "pdf", 280],
        ],
      },
      {
        t: "Sound clear",
        items: [
          ["v", "Pronunciation people understand", "Clarity over accent. Always.", "12:35"],
          ["v", "Stress, rhythm and pauses", "Why pauses make you sound confident.", "10:55"],
          ["q", {
            t: "Clear speech check", pass: 70, tries: 0, gate: true,
            qs: [
              ["s", "Which word is stressed on the second syllable?", ["TA-ble", "*ho-TEL", "WA-ter", "PIC-ture"], "ho-TEL. Most two-syllable nouns stress the first, hotel doesn't."],
              ["tf", "Pausing between ideas makes you sound less confident.", false, "Short pauses sound calm and in control."],
              ["m", "Good habits for clarity", ["*Slowing down slightly", "*Finishing word endings", "Speaking as fast as possible", "*Pausing at commas"], "Speed is not fluency."],
              ["sa", "Fill in: 'Could you ___ that again, please?'", ["say", "repeat"], "Both 'say' and 'repeat' work politely."],
            ],
          }],
        ],
      },
      {
        t: "Everyday conversations",
        items: [
          ["v", "Small talk that doesn't feel small", "Questions that open people up.", "11:30"],
          ["v", "Phone calls and video meetings", "Openers, interruptions and wrapping up.", "12:45"],
          ["v", "Disagreeing politely", "Phrases that keep the conversation friendly.", "9:25"],
        ],
      },
      {
        t: "High-stakes moments",
        items: [
          ["v", "Tell me about yourself (interview)", "A 60-second answer structure.", "14:10"],
          ["v", "Presenting to a room", "Open strong, land the ending.", "13:20"],
          ["q", {
            t: "Interview ready", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "A strong 'tell me about yourself' answer is mostly about…", ["Your childhood", "*Your recent work and what you want next", "Only your hobbies", "Your expected salary"], "Present, past highlights, future."],
              ["tf", "It's fine to ask the interviewer to repeat a question.", true, "Asking shows you care about answering well."],
              ["m", "Polite ways to disagree", ["*I see it a bit differently…", "*That's a fair point, but…", "You're wrong.", "*Could we look at another option?"], "Soften, then state your view."],
            ],
          }],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- South Indian Kitchen */
  {
    id: "crs_kitchen",
    code: "sk",
    slug: "south-indian-kitchen",
    tutorId: "u_lakshmi",
    categoryId: "cat_cooking",
    title: "South Indian Kitchen",
    promise: "Batter, sambar and chutneys that taste like a Madurai home.",
    description:
      "Lakshmi teaches the foundations of South Indian home cooking: a reliable idli-dosa batter, everyday sambar and rasam, quick poriyals and the chutneys and podis that tie a meal together. Measurements in cups and grams, with fixes for cold-weather fermentation.",
    thumbnail: u("photo-1589301760014-d929f3979dbc"),
    tone: "green",
    level: "Beginner",
    language: "English + Tamil",
    price: 799,
    status: "published",
    tags: ["Cooking", "Beginner", "Vegetarian"],
    outcomes: [
      "Make and ferment idli-dosa batter in any climate",
      "Cook sambar and rasam from scratch",
      "Temper spices properly for maximum flavour",
      "Prep a week of chutneys and podis",
    ],
    requirements: ["A mixer-grinder", "A basic kitchen"],
    rating: 4.9,
    learners: 1730,
    createdAt: daysAgo(280),
    updatedAt: daysAgo(35),
    publishedAt: daysAgo(260),
    modules: [
      {
        t: "The pantry",
        items: [
          ["v", "Dals, rice and the spice box", "What to stock and what to skip.", "9:10"],
          ["v", "Tempering done right", "Mustard seeds should pop, not burn.", "8:35"],
          ["v", "Coconut: fresh, frozen or dry?", "When each one works.", "6:50"],
          ["r", "Pantry shopping list", "Printable, with quantities for a month.", "pdf", 190],
        ],
      },
      {
        t: "Batter school",
        items: [
          ["v", "Idli-dosa batter, start to finish", "Soak, grind, ferment.", "16:40"],
          ["v", "Fermenting in cold weather", "Oven light, casseroles and patience.", "8:15"],
          ["v", "Crispy dosa technique", "Pan heat, spread and the oil trick.", "12:05"],
          ["q", {
            t: "Batter basics", pass: 60, tries: 0, gate: true,
            qs: [
              ["s", "Typical rice to urad dal ratio for idli batter?", ["1:1", "*4:1", "1:4", "10:1"], "Four parts rice to one part urad dal is a common home ratio."],
              ["tf", "In warm weather, salt is usually added before fermentation.", true, "Salt slows fermentation slightly, which helps in hot kitchens."],
              ["m", "Signs your batter is well fermented", ["*It has risen", "*A slightly sour smell", "It turned green", "*Bubbly, airy texture"], "Green means something went wrong. Throw it out."],
              ["sa", "What is tempering called in Tamil? (starts with 't')", ["thalippu", "thaalippu", "tadka"], "Thalippu in Tamil, tadka in Hindi."],
            ],
          }],
        ],
      },
      {
        t: "Everyday curries",
        items: [
          ["v", "Sambar like a Madurai home", "Freshly ground masala, worth every minute.", "14:25"],
          ["v", "Rasam in 20 minutes", "Tomato, tamarind, pepper, comfort.", "9:45"],
          ["v", "Poriyal and kootu", "Two quick vegetable sides for any meal.", "11:30"],
        ],
      },
      {
        t: "Chutneys and podis",
        items: [
          ["v", "Three chutneys, one blender", "Coconut, tomato and coriander.", "10:10"],
          ["v", "Gunpowder podi", "The idli's best friend.", "7:40"],
          ["q", {
            t: "Chutney check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Gunpowder podi is traditionally eaten with…", ["Bread", "*Idli and sesame oil", "Pasta", "Ice cream"], "Mix it with sesame oil or ghee and dip away."],
              ["tf", "Coconut chutney keeps for a week at room temperature.", false, "Refrigerate it and finish within two days."],
              ["m", "Common tempering ingredients", ["*Mustard seeds", "*Curry leaves", "Only cinnamon sticks", "*Urad dal"], "Mustard, urad dal and curry leaves are the classic trio."],
            ],
          }],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- UI Design in Figma (in review) */
  {
    id: "crs_figma",
    code: "ui",
    slug: "ui-design-in-figma",
    tutorId: "u_meera",
    categoryId: "cat_design",
    title: "UI Design in Figma",
    promise: "From wireframe to polished app screens, with a hand-off developers love.",
    description:
      "Design a complete food-delivery app in Figma: auto layout, components, a type scale, prototypes and a clean developer hand-off. Meera shares the systems she uses with real clients.",
    thumbnail: u("photo-1581291518857-4e27b48ff24e"),
    tone: "blush",
    level: "Intermediate",
    language: "English",
    price: 1499,
    status: "in_review",
    tags: ["Design", "Figma", "UI"],
    outcomes: [
      "Use auto layout and constraints like a pro",
      "Build a reusable component library",
      "Design a full app flow at high fidelity",
      "Prototype and hand off to developers",
    ],
    requirements: ["Figma (free plan is fine)", "Colour, Actually recommended"],
    rating: 0,
    learners: 0,
    createdAt: daysAgo(70),
    updatedAt: daysAgo(5),
    submittedAt: daysAgo(5, 11, 45),
    modules: [
      {
        t: "Figma foundations",
        items: [
          ["v", "Frames, auto layout and constraints", "Layouts that resize properly.", "14:15"],
          ["v", "Components and variants", "Build once, reuse everywhere.", "16:20"],
          ["q", {
            t: "Figma basics", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Auto layout is most like…", ["Grouping layers", "*CSS flexbox", "A mask", "A plugin"], "Direction, spacing and padding, just like flexbox."],
              ["tf", "Changing a main component updates its instances.", true, "That's the whole point of components."],
              ["sa", "What do you call a reusable design element in Figma?", ["component", "a component", "components"], "Components (and their variants)."],
            ],
          }],
        ],
      },
      {
        t: "Design an app",
        items: [
          ["v", "Wireframes to hi-fi", "Grey boxes first, colour last.", "18:40"],
          ["v", "Type scales and spacing systems", "An 8-point grid and a 1.25 type scale.", "12:05"],
          ["r", "UI kit starter", "Duplicate the Figma community file.", "link"],
        ],
      },
      {
        t: "Hand-off",
        items: [
          ["v", "Prototyping interactions", "Smart animate and overlays.", "13:30"],
          ["v", "Dev hand-off without drama", "Naming, tokens and Dev Mode.", "10:45"],
          ["q", {
            t: "Hand-off check", pass: 60, tries: 0, gate: false,
            qs: [
              ["m", "Good hand-off includes", ["*Named layers", "*Spacing tokens", "Random one-off colours", "*Interaction notes"], "Developers need names, tokens and intent."],
              ["tf", "Developers can inspect CSS values in Dev Mode.", true, "Dev Mode shows spacing, colours and code snippets."],
              ["s", "Smart animate works best when layers…", ["Have random names", "*Share the same names across frames", "Are flattened", "Are hidden"], "Matching names tell Figma what to animate."],
            ],
          }],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Reels That Don't Flop (rejected) */
  {
    id: "crs_reels",
    code: "rl",
    slug: "reels-that-dont-flop",
    tutorId: "u_rhea",
    categoryId: "cat_creator",
    title: "Reels That Don't Flop",
    promise: "Hooks, shooting and editing for short videos people actually finish.",
    description:
      "Short-form video for creators and small businesses: hooks that stop the scroll, shooting vertical with intent, editing in CapCut and reading your analytics.",
    thumbnail: u("photo-1611224923853-80b023f02d71"),
    tone: "hotpink",
    level: "Beginner",
    language: "English + Hindi",
    price: 999,
    status: "rejected",
    reviewNote:
      "Lovely energy! Two things before we can publish: the examples in module 2 use copyrighted film audio, and the first video doesn't say what learners will make by the end. Swap the audio for royalty-free tracks, add a 30-second promise at the start, then resubmit.",
    tags: ["Creator", "Short video", "Marketing"],
    outcomes: [
      "Write hooks that hold the first two seconds",
      "Shoot vertical video with a plan",
      "Edit quickly in CapCut",
      "Read analytics and post with a rhythm",
    ],
    requirements: ["A smartphone"],
    rating: 0,
    learners: 0,
    createdAt: daysAgo(55),
    updatedAt: daysAgo(9),
    submittedAt: daysAgo(16),
    modules: [
      {
        t: "Hooks",
        items: [
          ["v", "The first 1.5 seconds", "Why most reels die before they start.", "7:20"],
          ["v", "Ten hook formulas", "Copy, remix, make them yours.", "11:45"],
          ["q", {
            t: "Hook check", pass: 70, tries: 0, gate: true,
            qs: [
              ["s", "Where should your hook appear?", ["At the end", "*In the first second or two", "Only in the caption", "Halfway through"], "Viewers decide almost instantly."],
              ["tf", "On-screen captions help people who watch on mute.", true, "Most people scroll with the sound off."],
              ["m", "Strong hook types", ["*A bold claim", "*A question", "A long intro", "*Showing the result first"], "Lead with the payoff."],
            ],
          }],
        ],
      },
      {
        t: "Shoot and cut",
        items: [
          ["v", "Shooting vertical with intent", "Plan shots before you press record.", "9:55"],
          ["v", "Editing in CapCut", "Cuts, captions and pacing.", "15:30"],
          ["r", "Shot list template", "Plan a week of reels in one sitting.", "template", 80],
        ],
      },
      {
        t: "Grow",
        items: [
          ["v", "Posting rhythm and analytics", "What to measure and what to ignore.", "10:40"],
          ["v", "Collabs and trends without cringe", "Join trends that fit your voice.", "9:15"],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- Tally & GST Basics (archived) */
  {
    id: "crs_tally",
    code: "tl",
    slug: "tally-gst-basics",
    tutorId: "u_farhan",
    categoryId: "cat_business",
    title: "Tally & GST Basics",
    promise: "Ledgers, vouchers and GST returns for small businesses.",
    description:
      "An introduction to TallyPrime and GST filing for small-business owners and accounts assistants. Archived while Farhan records an updated version for the 2026 return formats.",
    thumbnail: u("photo-1554224154-26032ffc0d07"),
    tone: "sun",
    level: "Beginner",
    language: "Hindi",
    price: 1299,
    status: "archived",
    reviewNote: "Archived at the tutor's request: GST return formats changed. A refreshed edition is planned.",
    tags: ["Business", "Accounting", "GST"],
    outcomes: [
      "Set up a company and ledgers in TallyPrime",
      "Record sales, purchase, payment and receipt vouchers",
      "Understand GST rates and HSN codes",
      "Prepare a basic GSTR-1",
    ],
    requirements: ["TallyPrime (educational mode is free)"],
    rating: 4.4,
    learners: 860,
    createdAt: daysAgo(690),
    updatedAt: daysAgo(50),
    publishedAt: daysAgo(670),
    modules: [
      {
        t: "Getting started",
        items: [
          ["v", "Company setup in TallyPrime", "Features, financial year and GST details.", "11:20"],
          ["v", "Ledgers and groups", "Where every account belongs.", "13:35"],
          ["q", {
            t: "Tally basics", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "Which group does a bank account ledger belong to?", ["Sales Accounts", "*Bank Accounts", "Indirect Expenses", "Capital Account"], "Bank ledgers go under Bank Accounts."],
              ["tf", "Every voucher must balance debits and credits.", true, "Double entry: debits always equal credits."],
              ["sa", "Shortcut to create a ledger while entering a voucher? (e.g. Alt+C)", ["alt+c", "alt c", "alt + c"], "Alt+C creates a master on the fly."],
            ],
          }],
        ],
      },
      {
        t: "Vouchers",
        items: [
          ["v", "Sales and purchase entries", "Item invoices with GST.", "15:45"],
          ["v", "Payment and receipt vouchers", "Cash, bank and UPI entries.", "12:10"],
          ["r", "Voucher practice set", "30 transactions to enter yourself.", "pdf", 450],
        ],
      },
      {
        t: "GST",
        items: [
          ["v", "GST rates and HSN codes", "Which rate, which code, and where to check.", "14:05"],
          ["v", "Filing GSTR-1 basics", "From Tally report to portal upload.", "16:30"],
          ["q", {
            t: "GST check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "GSTR-1 reports…", ["Purchases", "*Outward supplies (sales)", "Salaries", "Bank interest"], "GSTR-1 is the return for outward supplies."],
              ["tf", "IGST applies to inter-state supplies.", true, "Inter-state: IGST. Intra-state: CGST + SGST."],
              ["m", "Components of GST", ["*CGST", "*SGST", "VAT", "*IGST"], "VAT was replaced by GST in 2017."],
            ],
          }],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------------- JEE Physics: Mechanics */
  {
    id: "crs_jee",
    code: "jp",
    slug: "jee-physics-mechanics",
    tutorId: "u_vikram",
    categoryId: "cat_exam",
    title: "JEE Physics: Mechanics",
    promise: "Kinematics to rotation, with the problem patterns toppers spot instantly.",
    description:
      "Mechanics is a third of JEE physics. Dr. Vikram teaches it through motion graphs, free-body diagrams and energy shortcuts, then walks through previous-year problems with the exact thinking you need in the exam hall.",
    thumbnail: u("photo-1636466497217-26a8cbeaf0aa"),
    tone: "purple",
    level: "Advanced",
    language: "English",
    price: 1999,
    status: "published",
    tags: ["Exam prep", "Physics", "JEE"],
    outcomes: [
      "Read motion graphs and solve projectile problems fast",
      "Draw correct free-body diagrams every time",
      "Use work-energy shortcuts to skip long algebra",
      "Solve rotation and rolling problems confidently",
    ],
    requirements: ["Class 11 maths (vectors, basic calculus)"],
    rating: 4.8,
    learners: 2045,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(10),
    publishedAt: daysAgo(190),
    modules: [
      {
        t: "Kinematics",
        items: [
          ["v", "Motion graphs you can read in seconds", "Slopes and areas, nothing else.", "15:20"],
          ["v", "Projectile motion, visualised", "Split it into two simple motions.", "17:45"],
          ["v", "Relative motion tricks", "Rain, boats and trains made easy.", "14:10"],
          ["q", {
            t: "Kinematics check", pass: 70, tries: 3, gate: true,
            qs: [
              ["s", "The slope of a velocity-time graph gives…", ["Displacement", "*Acceleration", "Speed", "Jerk"], "Slope of v-t is acceleration; area under it is displacement."],
              ["tf", "At the top of a projectile's path, its vertical velocity is zero.", true, "Only the horizontal component remains at the peak."],
              ["sa", "Range is maximum at what launch angle in degrees (no air resistance)?", ["45", "45°", "45 degrees"], "sin 2θ is largest at θ = 45°."],
              ["m", "Which are vector quantities?", ["*Velocity", "*Displacement", "Speed", "*Acceleration"], "Speed has no direction, so it's a scalar."],
            ],
          }],
        ],
      },
      {
        t: "Newton's laws",
        items: [
          ["v", "Free-body diagrams, the right way", "Isolate, list forces, choose axes.", "16:35"],
          ["v", "Friction problems that trap toppers", "Static vs kinetic and the 'does it move?' check.", "18:20"],
          ["r", "FBD practice sheet", "25 diagrams to draw before checking answers.", "pdf", 760],
        ],
      },
      {
        t: "Work, energy and power",
        items: [
          ["v", "Work-energy theorem shortcuts", "Skip the kinematics when energy is faster.", "15:05"],
          ["v", "Conservation of energy in springs", "Spring problems in three lines.", "14:40"],
          ["q", {
            t: "Energy check", pass: 60, tries: 0, gate: false,
            qs: [
              ["s", "Work done by a force perpendicular to the motion is…", ["Maximum", "*Zero", "Negative", "Infinite"], "W = Fd cos 90° = 0."],
              ["tf", "Kinetic energy can be negative.", false, "½mv² is never negative."],
              ["s", "Energy stored in a spring of constant k stretched by x:", ["kx", "*½kx²", "kx²", "2kx"], "U = ½kx²."],
            ],
          }],
        ],
      },
      {
        t: "Rotation",
        items: [
          ["v", "Moment of inertia without tears", "Shapes, axes and the parallel-axis theorem.", "19:10"],
          ["v", "Rolling motion", "Rolling without slipping, demystified.", "17:25"],
          ["r", "Previous-year problems with solutions", "40 JEE Main and Advanced problems.", "pdf", 3100],
        ],
      },
    ],
  },
];
