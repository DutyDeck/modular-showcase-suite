/* ── Learning layer for pack tenants ─────────────────────────────────────────
 * The core modules (Courses, LMS, Assignments, Grades, Calendar, My Classes,
 * Grading, Appraisals, Messages, AI Insights) are SHARED by every tenant. For
 * a pack tenant they must show THAT institution's teaching, at the right age:
 * a Year 3 pupil sees phonics and times tables, Arjun sees CS201 Algorithms,
 * an Upper Nursery child's parent sees a learning journal — never the classic
 * demo's "Advanced Physics".
 *
 * One abstraction feeds them all — the TEACHING GROUP (what a "course" is):
 *   • school     → a subject class / set (sis/classes SubjectClass)
 *   • university → a module run (heData HeModule + registrations)
 *   • college    → a qualification (heData Qualification + enrolled learners)
 * plus an AGE BAND that decides what content, assessment and grading look
 * like. Built from data only (pure) so seeds and pages share it. */
import type { Learner } from "../foundationData";
import type { HeModule, ModuleRegistration, Qualification } from "../heData";
import type { SubjectClass } from "./classes";

export type AgeBand =
  | "early" // nursery / reception / LKG–UKG — learning journal, no homework or grades
  | "primary" // Year/Grade 1–6 — homework, descriptors (Working towards / Expected / Greater depth)
  | "lower-secondary" // Year 7–9 / Grade 6–8 — homework, % and grades
  | "upper-secondary" // Year 10–11 / Grade 9–10 — IGCSE / CBSE board years, predicted grades
  | "sixth-form" // Year 12–13 / IB DP / Grade 11–12 — A Level / IB / CBSE XII
  | "higher-ed" // university modules — coursework + exams, module marks
  | "vocational"; // VET / apprenticeships — competency-based units

const EARLY =
  /^(FS1|FS2|Nursery|LKG|UKG|Lower Nursery|Upper Nursery|Pre-Grade|Reception|Pre-K|Preschool|Kindergarten|PYP Early Years)/i;

/** Age band from a level / year-group label (school), or the segment. */
export function ageBandFor(level: string, segment?: "school" | "he" | "vet"): AgeBand {
  if (segment === "he") return "higher-ed";
  if (segment === "vet") return "vocational";
  if (EARLY.test(level)) return "early";
  if (/IB DP|A Level|AS Level/i.test(level)) return "sixth-form";
  if (/MYP/i.test(level)) return "lower-secondary";
  const n = Number(level.match(/(\d+)/)?.[1] ?? NaN);
  if (Number.isNaN(n)) return "primary";
  const grade = /Grade/i.test(level); // CBSE / US-style numbering is one higher
  const y = grade ? n + 1 : n; // Grade 7 ≈ Year 8
  if (y <= 6) return "primary";
  if (y <= 9) return "lower-secondary";
  if (y <= 11) return "upper-secondary";
  return "sixth-form";
}

export interface TeachingGroup {
  id: string; // subject-class id / module id / qualification id
  tenantId: string;
  kind: "class" | "module" | "qualification";
  code: string; // "3B ENG", "CS201", "ICT50220"
  title: string; // "3B English", "Algorithms", "Diploma of IT"
  subject: string;
  level: string; // year group / module level / AQF level
  band: AgeBand;
  teacher: string;
  studentIds: string[];
  room?: string;
}

export interface TeachingGroupInput {
  subjectClasses: SubjectClass[];
  heModules: HeModule[];
  moduleRegistrations: ModuleRegistration[];
  qualifications: Qualification[];
  learners: Learner[];
}

/** Every teaching group of every pack tenant (pure; pass live collections). */
export function buildTeachingGroups(i: TeachingGroupInput): TeachingGroup[] {
  const out: TeachingGroup[] = [];
  for (const c of i.subjectClasses) {
    out.push({
      id: c.id,
      tenantId: c.tenantId,
      kind: "class",
      code: c.name,
      title: c.name,
      subject: c.subject,
      level: c.yearGroup,
      band: ageBandFor(c.yearGroup),
      teacher: c.teacher,
      studentIds: c.studentIds,
      room: c.room,
    });
  }
  for (const m of i.heModules) {
    const studentIds = i.moduleRegistrations
      .filter((r) => r.moduleId === m.id && r.status === "Registered")
      .map((r) => r.studentId);
    out.push({
      id: m.id,
      tenantId: m.tenantId,
      kind: "module",
      code: m.code,
      title: m.title,
      subject: m.title,
      level: m.level,
      band: "higher-ed",
      teacher: m.leader,
      studentIds: Array.from(new Set(studentIds)),
    });
  }
  for (const q of i.qualifications) {
    out.push({
      id: q.id,
      tenantId: q.tenantId,
      kind: "qualification",
      code: q.code,
      title: q.title,
      subject: q.title,
      level: q.level,
      band: "vocational",
      teacher: "",
      studentIds: i.learners.filter((l) => l.qualificationId === q.id).map((l) => l.id),
    });
  }
  return out;
}

/** Early-years children have no subject classes — their form is their group. */
export function earlyYearsLearners(learners: Learner[], tenantId: string): Learner[] {
  return learners.filter((l) => l.tenantId === tenantId && ageBandFor(l.level) === "early");
}

/** Teaching groups a user sees: student → own, parent → children's, teacher →
 *  ones they teach (by name), admin → the whole tenant. */
export function groupsForUser(
  user: { role?: string; name?: string; oneEduId?: string; institutionId?: string } | null,
  groups: TeachingGroup[],
  learners: Learner[],
  actingFor?: string[], // studentIds a parent / family account acts for
): TeachingGroup[] {
  if (!user?.institutionId) return [];
  const mine = groups.filter((g) => g.tenantId === user.institutionId);
  if (user.role === "admin") return mine;
  if (user.role === "teacher") return mine.filter((g) => g.teacher === user.name);
  const kids =
    actingFor ??
    (user.role === "parent"
      ? learners
          .filter(
            (l) => l.tenantId === user.institutionId && l.guardians?.includes(user.name ?? ""),
          )
          .map((l) => l.id)
      : user.oneEduId
        ? [user.oneEduId]
        : []);
  return mine.filter((g) => g.studentIds.some((id) => kids.includes(id)));
}
