/**
 * Teacher-appraisal scoring.
 *
 * The headline "appraisal score" blends two inputs into a single 5-star number:
 *   • what families say  — the average of submitted star ratings (parents and
 *     adult, self-managed students), and
 *   • how students do    — objective outcomes carried on the teacher record
 *     (average student GPA, exam pass-rate, class attendance).
 *
 * Weighting is 60% submitted ratings / 40% student performance. When a teacher
 * has no submitted ratings yet, the score falls back to performance alone so the
 * card still shows something meaningful.
 */
import type { Teacher, TeacherRating } from "./mockData";

export interface Appraisal {
  ratingAvg: number; // 0–5, average of submitted stars (0 when none)
  ratingCount: number; // number of submitted ratings
  /** Count of submitted ratings per star bucket, index 1–5 (0 unused). */
  distribution: number[];
  performanceStars: number; // 0–5, student-outcome signals mapped to stars
  blended: number; // 0–5, the headline score (1 decimal)
}

const RATING_WEIGHT = 0.6;
const PERF_WEIGHT = 0.4;

/** Map a teacher's student-outcome signals onto a 0–5 scale. */
export function performanceStars(t: Teacher): number {
  const gpaStars = (t.avgStudentGpa / 4) * 5;
  const passStars = (t.passRate / 100) * 5;
  const attnStars = (t.attendanceRate / 100) * 5;
  // GPA and pass-rate matter most; attendance is a lighter signal.
  return gpaStars * 0.45 + passStars * 0.4 + attnStars * 0.15;
}

export function computeAppraisal(t: Teacher, ratings: TeacherRating[]): Appraisal {
  const mine = ratings.filter((r) => r.teacherId === t.id);
  const ratingCount = mine.length;
  const ratingSum = mine.reduce((a, r) => a + r.stars, 0);
  const ratingAvg = ratingCount ? ratingSum / ratingCount : 0;

  const distribution = [0, 0, 0, 0, 0, 0];
  for (const r of mine) {
    const b = Math.min(5, Math.max(1, Math.round(r.stars)));
    distribution[b] += 1;
  }

  const perf = performanceStars(t);
  const blendedRaw = ratingCount ? ratingAvg * RATING_WEIGHT + perf * PERF_WEIGHT : perf;

  return {
    ratingAvg,
    ratingCount,
    distribution,
    performanceStars: round1(perf),
    blended: round1(blendedRaw),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** A short qualitative label for a blended score, for badges/tooltips. */
export function appraisalLabel(score: number): string {
  if (score >= 4.5) return "Outstanding";
  if (score >= 4) return "Excellent";
  if (score >= 3.5) return "Very good";
  if (score >= 3) return "Good";
  if (score > 0) return "Developing";
  return "Not yet rated";
}
