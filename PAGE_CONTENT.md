# KIDDO page content and route map

This is the content source for the KIDDO learning club. It translates the playful, editorial feel of the reference sites into a course platform for Gen Z learners, tutors, and admins.

The voice is curious, direct, warm, and a little cheeky. Use short sentences, active verbs, and words people would actually use in a group chat. The interface can be expressive, but the content should always make the next action obvious.

## Product promise

KIDDO turns useful knowledge into short videos, tiny tests, and visible progress. Anyone can watch the first video of a course for free. Students can buy a course to unlock the rest. Tutors can turn a real skill into a course. Admins keep the catalogue healthy and the learning experience safe.

## Route map

| Route | Audience | Job to be done | Primary action |
| --- | --- | --- | --- |
| `/` | Everyone | Understand the idea and feel the KIDDO energy | Try a free lesson |
| `/courses` | Public, students | Browse, search, and filter the course library | Open a course |
| `/courses/[slug]` | Public, students | Decide whether a course is worth their time or money | Watch free preview / buy course |
| `/learn/[courseSlug]/[itemId]` | Enrolled students, preview viewers | Watch a lesson, complete a quiz, and keep progress moving | Mark complete / continue |
| `/dashboard` | Students | Resume learning and see wins in one place | Continue course |
| `/dashboard/wishlist` | Students | Keep interesting courses for later | View course |
| `/dashboard/certificates` | Students | View and share completed-course certificates | View certificate |
| `/login` | Returning users | Enter the right workspace | Log in |
| `/signup` | New students | Create a learner account | Start learning |
| `/become-tutor` | Potential tutors | Understand the tutor programme and apply | Apply to teach |
| `/tutor` | Approved tutors | See course, learner, and revenue health | Open course studio |
| `/tutor/courses` | Tutors | Manage drafts and published courses | Create course |
| `/tutor/courses/[id]/builder` | Tutors | Add modules, videos, resources, and tests | Submit for review |
| `/tutor/analytics` | Tutors | Learn what students finish and where they drop | Improve a lesson |
| `/admin` | Admins | Monitor the entire platform | Review queue |
| `/admin/users` | Admins | Manage roles and account status | Open user |
| `/admin/tutors` | Admins | Approve or reject tutor applications | Review application |
| `/admin/courses` | Admins | Review, publish, archive, or feature courses | Open review |
| `/admin/categories` | Admins | Keep catalogue taxonomy clear | Add category |
| `/admin/orders` | Admins | Check purchases, refunds, and grants | Open order |
| `/about` | Everyone | Explain why KIDDO exists and who makes it | Meet the club |
| `/faq` | Everyone | Resolve common questions before signup or purchase | Read answer |
| `/contact` | Everyone | Get help or start a partnership conversation | Send message |
| `/community` *(later)* | Students, tutors | Share progress and ask for help | Join the conversation |
| `/shop` *(later)* | Fans, students | Buy small KIDDO goods and study tools | Browse shop |

## Shared navigation and footer

**Main navigation:** Courses, How it works, Become a tutor, FAQ.

**Signed-in navigation:** Dashboard, My courses, Wishlist, Certificates, Account.

**Role switcher:** Student space, Tutor studio, Admin control room. Show only the spaces the current account can access.

**Primary button labels:** Try a free lesson, Browse courses, Continue learning, Apply to teach, Open course studio, Review queue.

**Footer copy:** “For curious humans with places to be.” Links: Courses, About KIDDO, Become a tutor, FAQ, Contact, Instagram, TikTok, Privacy, Terms.

## Page briefs and copy

### `/` — Home

**Goal:** Make a first-time visitor understand KIDDO in five seconds, then give them a low-friction way to try it.

**Hero**

- Eyebrow: `THE INTERNET'S FUN LEARNING CLUB`
- Heading: `LEARN LOUD. LIVE CURIOUS.`
- Supporting copy: “Short video lessons, tiny tests, and big ‘wait, I get it now’ moments. Pick a topic. Press play. Make it yours.”
- Primary CTA: `Try a free lesson ↗`
- Secondary CTA: `See how it works ↓`
- Social proof: `14,000+ curious humans learning this week`
- Sticker copy: `NEW DROP / every week`, `NO BORING BITS`, `learn something weird`

**Course drop section**

- Kicker: `01 / THE DROP`
- Heading: `Pick your rabbit hole.`
- Copy: “Fresh courses from people who know their stuff and want you to have more fun with it.”
- Featured cards:
  - `Make it make sense.` — Creative — “Storytelling for your next big idea.”
  - `Money without ick.` — Life skills — “Money basics for your real life.”
  - `Talk to the robots.` — Tech + AI — “AI literacy for the group chat era.”
- CTA: `See all courses ↗`

**How it works**

- Kicker: `02 / THE LOOP`
- Heading: `Learning that keeps moving.`
- Step 1: `Press play` — “Watch a bite-sized lesson made for your brain, your commute, or your ‘five more minutes’ era.”
- Step 2: `Do the tiny test` — “Quick quizzes break up the scroll and help the good stuff stick around.”
- Step 3: `Keep the spark` — “Save your progress, collect wins, and come back whenever your curiosity pings.”

**Role section**

- Kicker: `03 / YOUR PEOPLE`
- Heading: `Made for every kind of learner.`
- Copy: “Here to teach, level up, or finally understand how taxes work? There’s a spot for you.”
- Student card: `STUDENT / CURIOUS HUMAN` — “Learn at your pace. Keep every win.”
- Tutor card: `TUTOR / BIG BRAIN` — “Turn your know-how into a course people love.”
- Admin card: `ADMIN / THE RINGLEADER` — “Keep the whole learning universe humming.”

**Email capture**

- Kicker: `04 / COME HANG`
- Heading: `Start with one free lesson.`
- Copy: “Get the first video in every course on us. No awkward commitment speech required.”
- Input placeholder: `your best email`
- Button: `I’m curious ↗`
- Helper text: “Occasional good stuff. Zero inbox drama.”

**FAQ preview**

- Kicker: `05 / QUESTIONS`
- Heading: `Good to know.`
- Questions: What is KIDDO? Is the first lesson really free? Can I teach on KIDDO?
- CTA: `Read all FAQs ↗`

### `/courses` — Course library

**Goal:** Help a learner find a useful, appealing next course without making the catalogue feel like a spreadsheet.

- Kicker: `THE LIBRARY`
- Heading: `Find your next rabbit hole.`
- Intro: “Browse by mood, skill, or the thing you keep saying you’ll learn someday.”
- Search placeholder: `Search “money”, “design”, “AI”…`
- Filter labels: All, Creative, Life skills, Tech + AI, Career, Culture; Beginner, Intermediate, Advanced; Free preview, Under ₹999, Newest, Top rated.
- Sort labels: `Fresh drops`, `Most loved`, `Highest rated`.
- Empty state: “No rabbit hole found. Try a broader search or browse the fresh drops.”
- Course card metadata: category, level, duration, lesson count, tutor, rating, price, `FREE PREVIEW` badge.
- Bottom prompt: “Still scrolling? Take the 30-second ‘what should I learn?’ quiz.” Button: `Find my fit ↗`

### `/courses/[slug]` — Course detail

**Goal:** Show the value of a course clearly, make the free preview easy to start, and explain what purchase unlocks.

**Hero copy pattern**

- Category: `TECH + AI`
- Title example: `Talk to the robots.`
- Subtitle: “A friendly field guide to AI for people who have questions, ideas, and 47 tabs open.”
- Tutor line: `By Maya Rao · 5 modules · 18 lessons · 2h 20m`
- Rating line: `4.9 ★ · 2,184 learners`
- Price line: `₹799 one-time · lifetime access`
- Primary CTA: `Watch free preview ↗` (for first lesson)
- Purchase CTA: `Unlock the full course ↗`
- Purchase helper: “The first video is free. See if the vibe fits before you pay.”

**What you’ll learn**

- “Use AI tools without handing over your brain.”
- “Write prompts that sound like you and get useful results.”
- “Spot hallucinations, bias, and very confident nonsense.”
- “Build a tiny workflow you can use this week.”

**Curriculum**

- Heading: `Inside the course`
- Module examples:
  1. `Meet your new robot coworker` — 3 videos · 1 quiz
  2. `Prompting without the cringe` — 4 videos · 1 quiz
  3. `Make it useful` — 4 videos · 1 resource · 1 quiz
  4. `Your tiny AI workflow` — 3 videos · final challenge
- Paid lessons display a lock and `Unlock with course access`.
- Free lesson displays `FREE PREVIEW` and `Watch now`.

**Tutor panel**

- Heading: `Your guide for this rabbit hole`
- Copy pattern: “Maya is a product designer who explains complicated things with screenshots, snacks, and zero gatekeeping.”
- CTA: `See tutor profile ↗`

**Reviews**

- Heading: `People are saying`
- Review prompts: “What clicked for you?”, “What did you make after the course?”
- Empty state: “Be the first human to leave a note.”

**FAQ strip:** What do I get? How long do I have access? Can I watch on mobile? Do I get a certificate?

### `/learn/[courseSlug]/[itemId]` — Learning player

**Goal:** Keep attention on the lesson while making progress, quiz gates, and the next action obvious.

- Top bar: KIDDO logo, course title, `Back to course`, progress percentage, account menu.
- Sidebar heading: `Your path`; show modules, lesson durations, completion ticks, and locked paid items.
- Video label: `MODULE 01 / LESSON 02`
- Lesson title example: `Prompting without the cringe`
- Description: “Three prompts you can copy, remix, and make your own.”
- Actions: `Mark complete`, `Save for later`, `Ask the tutor`.
- Next card: `Up next` + lesson title + duration + `Continue ↗`.
- Quiz state: `Tiny test time` — “Five quick questions. Pass with 70% to unlock the next module.”
- Quiz result states:
  - Passed: `You got it. The next lesson is unlocked.`
  - Retry: `Almost there. Rewatch the highlighted bit and try again.`
- Locked state: `This lesson is part of the full course.` Button: `Unlock the course ↗`.
- Completion state: `Course complete. Go make something with it.` Button: `View certificate ↗`.

### `/dashboard` — Student dashboard

**Goal:** Turn an account into a useful home base that brings learners back to the next lesson.

- Greeting: `Hey, [name]. What are we learning today?`
- Continue card: `Continue where you left off` + course title + module/lesson + progress + `Continue ↗`.
- Stats cards: `Minutes learned`, `Lessons finished`, `Current streak`, `Courses completed`.
- Section: `Your courses` — In progress, Completed, Wishlist.
- Section: `Tiny wins` — “You passed the Prompting quiz”, “You kept a 5-day streak”, “You finished your first module.”
- Empty state: “Your dashboard is waiting for its first rabbit hole.” Button: `Browse courses ↗`

### `/dashboard/wishlist` and `/dashboard/certificates`

**Wishlist**

- Heading: `Saved for later.`
- Copy: “The courses you bookmarked while pretending to go to sleep.”
- Empty state: “Nothing saved yet. Go window-shop the library.”

**Certificates**

- Heading: `Proof you did the thing.`
- Copy: “Download, share, or simply admire the evidence.”
- Certificate card metadata: course title, learner name, completed date, verification code.
- CTA: `View certificate ↗`, `Share win ↗`.

### `/login` and `/signup`

**Login**

- Heading: `Welcome back, curious human.`
- Supporting copy: “Your next lesson is closer than you think.”
- Fields: Email, Password.
- Buttons: `Log me in ↗`, `Continue with Google`.
- Links: Forgot password, Create an account.

**Signup**

- Heading: `Your curiosity called.`
- Supporting copy: “Make an account, save your progress, and keep every tiny win.”
- Fields: Name, Email, Password, I’m here to: Learn / Teach.
- Button: `Start learning ↗`.
- Helper: “You can browse and watch free previews before buying anything.”

### `/become-tutor` — Tutor onboarding

**Goal:** Make teaching feel approachable and show what happens after an application.

- Eyebrow: `FOR BIG BRAINS`
- Heading: `Turn your thing into a course.`
- Copy: “You know the shortcut, the weird detail, or the lesson you wish someone had taught you. Package it into short videos people can actually finish.”
- CTA: `Apply to teach ↗`
- Three benefits:
  - `Build your way` — “Add modules, videos, resources, and tiny tests in any order.”
  - `Reach curious humans` — “Give your niche a home and let the right learners find it.”
  - `See what sticks` — “Use completion and quiz data to improve the next drop.”
- Process strip: `Apply` → `Get reviewed` → `Build your first course` → `Publish and teach`.
- FAQ: Who can apply? How long is review? What equipment do I need? How do payments work?
- Application fields: Name, email, subject, teaching experience, sample link, why KIDDO.
- Submit button: `Send my application ↗`.
- Success state: `Application sent. We’ll read it with human eyes and email you within five working days.`

### `/tutor` — Tutor studio

**Goal:** Give approved tutors a quick read on course health and the next task.

- Greeting: `Good morning, [name]. Let’s make the next lesson land.`
- Primary button: `Create a course ↗`.
- Stats: Published courses, Learners, Completion rate, This month’s earnings.
- Attention card: `Two learners are dropping at Module 02. Want to review that lesson?`
- Sections: Recent courses, Drafts, Review status, Learner questions.
- Empty state: “Your studio is ready for its first course.” Button: `Start with a title ↗`.

### `/tutor/courses` and `/tutor/courses/[id]/builder`

**Course list**

- Heading: `Your courses.`
- Filters: All, Draft, In review, Published, Archived.
- Buttons: `New course ↗`, `Duplicate`, `Archive`.

**Builder**

- Header: `Course studio` + Save status (`Saved just now`) + `Preview` + `Submit for review`.
- Course fields: Title, one-line promise, description, category, level, language, price, cover image, tags.
- Module controls: `Add module`, `Rename`, `Drag to reorder`, `Add lesson`.
- Lesson controls: Upload video, lesson name, description, duration, free preview toggle, attachments.
- Quiz controls: Question, options, correct answer, explanation, pass percentage, max attempts, `Gate next lesson` toggle.
- Helper text: “The first video is free by default. You can open more previews when it helps learners decide.”
- Review checklist: Course promise is clear; first video is marked preview; every quiz has an answer; cover image is uploaded.
- Submit success: `Course sent to the review queue. We’ll let you know what happens next.`

### `/tutor/analytics` — Tutor analytics

- Heading: `See where the spark catches.`
- Date filter: Last 7 days, Last 30 days, All time.
- Metrics: Enrollments, Revenue, Average completion, Quiz pass rate, Preview-to-purchase rate.
- Chart labels: Learners by module, Completion by lesson, Most replayed moments.
- Insight cards:
  - “Module 01 is your strongest hook.”
  - “Learners replay the example at 02:14. Consider adding another one there.”
  - “Quiz 02 has a 41% retry rate. The explanation may need a friendlier example.”

### `/admin` — Admin control room

**Goal:** Give the team a calm overview of platform health and a clear queue of work.

- Heading: `The control room.`
- Copy: “A quick read on people, courses, money, and the bits asking for attention.”
- Stats: Total learners, Active tutors, Published courses, Monthly revenue.
- Attention queue: Tutor applications pending, Courses awaiting review, Reports to resolve, Refunds to check.
- Sections: Latest signups, Top courses, Recent orders, Platform activity.
- CTA labels: `Review queue ↗`, `Manage people ↗`, `View reports ↗`.

### `/admin/users`, `/admin/tutors`, `/admin/courses`, `/admin/categories`, `/admin/orders`

**Users**

- Heading: `People on KIDDO.`
- Search placeholder: `Search by name or email`
- Filters: All, Student, Tutor, Admin, Suspended.
- Row actions: View profile, Change role, Suspend, Grant course access.

**Tutor approvals**

- Heading: `Who wants to teach?`
- Copy: “Read the idea, check the sample, and help good teachers find their people.”
- Actions: `Approve tutor`, `Request changes`, `Reject`.
- Request changes helper: “Tell them what would make the application stronger.”

**Course review**

- Heading: `Courses waiting for a green light.`
- Review checklist: Clear promise, useful first video, accessible captions, quiz answers verified, thumbnail and price present.
- Actions: `Publish course`, `Send back with note`, `Archive`.

**Categories**

- Heading: `Keep the rabbit holes tidy.`
- Fields: Name, slug, parent category, colour, display order.
- Example categories: Creative, Life skills, Tech + AI, Career, Culture.

**Orders**

- Heading: `Money moving through the club.`
- Filters: Paid, Pending, Refunded, Admin grant.
- Row fields: Order ID, learner, course, amount, provider, date, status.
- Actions: `View order`, `Grant access`, `Issue refund`.

### `/about` — Our story

**Goal:** Explain the human reason behind the product and make the brand feel like a club people want to join.

- Kicker: `WHY KIDDO EXISTS`
- Heading: `Learning got too serious.`
- Story copy: “Somewhere between school and the internet, learning became a performance. KIDDO brings it back to curiosity: one useful idea, one generous teacher, one small win at a time.”
- Values:
  - `Useful over impressive`
  - `Curious over certain`
  - `Progress over perfection`
  - `Human over hype`
- Team strip heading: `The people behind the pixels.`
- CTA: `Come learn with us ↗`

### `/faq` — Frequently asked questions

**Goal:** Remove friction around access, previews, purchases, teaching, and account support.

Categories: Getting started, Courses, Payments, Tutors, Progress and certificates, Privacy and safety.

Core answers:

- **What is KIDDO?** A video-course club with short lessons and small tests for practical, interesting skills.
- **Can I try a course first?** Yes. The first video in every published course is free.
- **What happens when I buy a course?** You get lifetime access to every lesson, quiz, and resource in that course.
- **Can I watch on my phone?** Yes. Your progress follows you across devices.
- **Do I get a certificate?** Complete every lesson and required quiz to unlock a shareable certificate.
- **Can I teach on KIDDO?** Apply through Become a tutor. We review each application before opening tutor tools.
- **How do quizzes work?** They are short checks between lessons. Some courses use a pass mark to unlock the next section.
- **Can I get a refund?** Contact support with your order details and we’ll review the request under the refund policy.
- **How do you protect videos?** Paid videos are served through short-lived signed links and are only available to people with access.

### `/contact` — Contact and support

- Heading: `Say hi. We’re around.`
- Copy: “A stuck lesson, a tutor idea, a partnership, or a very specific question? Send it over.”
- Contact cards: Learner support, Tutor support, Partnerships, Press.
- Form fields: Name, email, I’m contacting about, message, optional order/course link.
- Button: `Send message ↗`.
- Success state: `Message sent. A human will get back to you within two working days.`
- Support helper: `support@kiddo.club`.

## Content model

Use these fields as the shared source for cards, detail pages, dashboards, and admin tools. Keep labels short so the same data works on desktop and mobile.

### Course

```ts
type Course = {
  slug: string;
  title: string;
  promise: string;
  description: string;
  category: 'Creative' | 'Life skills' | 'Tech + AI' | 'Career' | 'Culture';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  price: number;
  currency: 'INR';
  thumbnail: string;
  accent: 'coral' | 'lime' | 'blue' | 'paper';
  tutor: Tutor;
  stats: { modules: number; lessons: number; minutes: number; rating: number; learners: number };
  learningOutcomes: string[];
  modules: Module[];
  status: 'draft' | 'in_review' | 'published' | 'rejected' | 'archived';
};
```

### Module, lesson, and quiz

```ts
type Module = {
  id: string;
  title: string;
  position: number;
  items: Array<VideoLesson | Quiz | Resource>;
};

type VideoLesson = {
  type: 'video';
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  isFreePreview: boolean;
  isComplete?: boolean;
};

type Quiz = {
  type: 'quiz';
  id: string;
  title: string;
  questionCount: number;
  passPercentage: number;
  isGating: boolean;
  isPassed?: boolean;
};

type Resource = {
  type: 'resource';
  id: string;
  title: string;
  fileType: 'pdf' | 'link' | 'template';
};
```

### Tutor and learner

```ts
type Tutor = {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  speciality: string;
  courseCount: number;
  learnerCount: number;
};

type LearnerProgress = {
  courseSlug: string;
  percentComplete: number;
  currentItemId: string;
  lastWatchedAt: string;
  completedLessons: number;
  totalLessons: number;
  streakDays: number;
};
```

## Motion and interaction cues

Each page should feel like the same KIDDO world while giving the visitor a small reward for moving through it.

- **Home:** hero collage drifts a few pixels on pointer movement; sticker labels bob; the tape ticker loops; cards tilt toward the cursor and settle softly.
- **Course library:** filter changes use a quick lift and fade; cards reveal tutor and rating details on hover; the empty state doodle wiggles once.
- **Course detail:** curriculum rows open with a spring; preview card has a subtle play pulse; locked rows use a gentle shimmer on hover.
- **Learning player:** sidebar progress fills as lessons complete; the next lesson card slides in after completion; quiz answers snap into place and show a clear pass or retry moment.
- **Student dashboard:** progress bars draw from zero on first view; tiny wins pop in with a confetti burst; completed course cards stamp themselves `DONE`.
- **Tutor builder:** drag-and-drop modules leave a bright placeholder; upload progress uses a chunky bar; autosave status changes from `Saving…` to `Saved just now`.
- **Admin:** queue items enter with a short stagger; status pills change colour smoothly; charts draw line-by-line when the range changes.
- **About / FAQ / Contact:** story illustrations reveal as the page scrolls; FAQ answers expand with height and opacity; the form success state swaps in without a full-page reload.

Keep motion short, interruptible, and respectful of `prefers-reduced-motion`. The copy should still make sense when all motion is disabled.

