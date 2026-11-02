/* Who is a minor — so avatars never show an adult portrait for a child.
 * Under-18s get an initials avatar instead of a stock photo (schools don't
 * publish pupils' photos, and a stock adult face on a Year 3 pupil is wrong).
 * Sources: date of birth where we have one (pack learners, demo accounts);
 * for the classic seed roster, which has no DOB, a school "Grade N" label. */
import { ageOn, demoUsers, students } from "./mockData";
import { DEMO_TODAY, learners, type Learner } from "./packs/foundationData";

const TODAY = new Date(DEMO_TODAY + "T00:00:00Z");

export const isMinorDob = (dob?: string) => !!dob && ageOn(dob, TODAY) < 18;

const SEED_MINORS = new Set<string>([
  ...learners.filter((l) => isMinorDob(l.dob)).map((l) => l.name),
  ...demoUsers.filter((u) => u.role === "student" && isMinorDob(u.dob)).map((u) => u.name),
  ...students.filter((s) => /^Grade \d+/.test(s.grade)).map((s) => s.name),
]);

/** Minor by name: seed data plus any learners added at runtime. */
export function isMinorName(name: string, live: Pick<Learner, "name" | "dob">[] = []): boolean {
  if (SEED_MINORS.has(name)) return true;
  return live.some((l) => l.name === name && isMinorDob(l.dob));
}
