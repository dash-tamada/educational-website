# Tamada Media

Video-course marketplace with admin, tutor and student access. Tutors build courses from modules, video lessons and tests between lessons. The first video of every course is free, and buying a course unlocks the rest.

**Status:** step 1 is done: the public landing page (`/`). Other routes (`/login`, `/courses`, `/become-tutor`, `/admin`…) show a "coming soon" page until their milestones are built.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- GSAP (ScrollTrigger) + Lenis for scroll animation, which turns off under `prefers-reduced-motion`
- `output: "standalone"` so the same build can be deployed to Vercel now and Docker/AWS later

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

## Where things live

| Path | What |
| --- | --- |
| `src/app/(public)/page.tsx` | Landing page, made up of the section components |
| `src/components/landing/` | One component per landing section |
| `src/components/decor/` | Mascot, scallop edges and badges, stickers, buttons, blobs |
| `src/components/motion/` | Lenis smooth scroll + `Reveal` scroll animation helper |
| `src/lib/landing-data.ts` | All landing copy, courses, FAQs and images (moves to the DB later) |
| `src/lib/image-loader.ts` | `next/image` loader (Unsplash CDN sizing now, CloudFront later) |
| `src/app/globals.css` | Design tokens (colours, fonts, animations) |
| `PAGE_CONTENT.md` | Voice, route map and content notes for the whole platform |

The design blends two references: aardvarkbookclub.com (saturated rounded panels, tilted step cards, giant category list, stickers) and krackerz.com (cream dotted canvas, lime highlight boxes, scalloped edges, sticky feature tabs). Everything here is original copy and art. Photos are free Unsplash images, hotlinked through the loader.

Testimonials in `landing-data.ts` are **placeholders** and must be replaced with real reviews before launch.
