import type { Course, Module } from "../types";
import { buildCurriculum } from "./dsl";
import { LANDING_COURSES } from "./courses-landing";
import { MORE_COURSES } from "./courses-more";

const ALL = [...LANDING_COURSES, ...MORE_COURSES];

/** Course rows before review aggregates are computed (db.ts fills rating/reviewCount). */
export const COURSES_BASE: Course[] = ALL.map((c) => {
  const { code: _code, modules: _modules, ...rest } = c;
  void _code;
  void _modules;
  return {
    ...rest,
    currency: "INR" as const,
    reviewCount: 0,
    hasCertificate: c.hasCertificate ?? true,
  };
});

export const CURRICULA: Record<string, Module[]> = Object.fromEntries(
  ALL.map((c) => [c.id, buildCurriculum(c.id, c.code, c.modules)]),
);

export const courseBySlug = (slug: string) => COURSES_BASE.find((c) => c.slug === slug)!;
