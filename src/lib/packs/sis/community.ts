/* ── Pack-tenant staff, teacher ratings and schedule helpers ─────────────────
 * Appraisals, My Classes and Calendar are core modules. For a pack tenant
 * they must show THAT institution's own staff and timetable:
 *   • pack staff (opsData TENANT_STAFF) get stable appraisal ids
 *     "STF-T009-02" (tenant + 1-based position in the staff list) and a
 *     Teacher-shaped record so the core appraisal scoring works unchanged;
 *   • seedTeacherRatings is merged by the store into the core
 *     `teacherRatings` collection;
 *   • the schedule helpers turn weekly timetable slots + one-off class
 *     changes into dated occurrences (pure — pass live collections).
 * Seed file: never import "@/lib/store" here. */
import type { Teacher, TeacherRating, Weekday } from "../../mockData";
import { demoUsers, tenants } from "../../mockData";
import type { Learner } from "../foundationData";
import { SCHOOL_PERIODS, TENANT_STAFF, weekdayOf, type TimetableSlot } from "../opsData";
import type { TeachingGroup } from "./learning";
import type { ClassChange } from "./teaching";

/* ── Staff ───────────────────────────────────────────────────────────────── */

export interface PackStaff extends Teacher {
  role: string;
  /** Teaches classes / modules / units — families and students rate them. */
  teaching: boolean;
}

/** Leadership / registry roles that don't teach a class of their own. */
const NON_TEACHING = /^(Principal|Registrar|Academic Registrar|Head of School)$/;

const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id;

/** "T-009", 2 → "STF-T009-02". */
export function packStaffId(tenantId: string, position: number): string {
  return `STF-${tenantId.replace("-", "")}-${String(position).padStart(2, "0")}`;
}

/** Deterministic 0–1 from a string (stable demo numbers). */
function unit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Every pack tenant's staff as Teacher-shaped appraisal records. */
export const packStaff: PackStaff[] = Object.entries(TENANT_STAFF).flatMap(([tenantId, list]) =>
  list.map((s, i) => {
    const r = unit(s.name);
    return {
      id: packStaffId(tenantId, i + 1),
      name: s.name,
      subject: s.role,
      role: s.role,
      teaching: !NON_TEACHING.test(s.role),
      institutionId: tenantId,
      institutionName: tenantName(tenantId),
      photo: demoUsers.find((u) => u.name === s.name)?.photo ?? "",
      experienceYears: 4 + Math.round(r * 18),
      avgStudentGpa: Math.round((3 + r * 0.8) * 10) / 10,
      passRate: 86 + Math.round(r * 12),
      attendanceRate: 91 + Math.round(unit(s.role) * 7),
    };
  }),
);

export const packStaffById = (id: string) => packStaff.find((s) => s.id === id);

export const packStaffByName = (tenantId: string, name: string) =>
  packStaff.find((s) => s.institutionId === tenantId && s.name === name);

/* ── Teacher ratings ─────────────────────────────────────────────────────── */

type R = [
  position: number,
  author: string,
  role: TeacherRating["authorRole"],
  stars: number,
  at: string,
  comment: string,
  childName?: string,
  anonymous?: boolean,
];

/** Ratings per tenant, keyed by TENANT_STAFF position (1-based). Parents rate
 *  school teachers; adult students rate lecturers and trainers. The demo
 *  personas (Sarah Khan, the Perera family account for Sasindu, Arjun) are
 *  left free to rate live. */
const RATINGS: Record<string, R[]> = {
  // Meridian International School Dubai
  "T-009": [
    [
      2,
      "Tom Morgan",
      "parent",
      5,
      "2026-10-28",
      "Freya finally enjoys Physics. The forces practicals were brilliant and she always knows what is due.",
      "Freya Morgan",
    ],
    [
      2,
      "Grace Okafor",
      "parent",
      4,
      "2026-10-21",
      "Clear lessons and quick replies on the Record Book. More past-paper practice before mocks would help.",
      "Daniel Okafor",
    ],
    [
      2,
      "Rana Haddad",
      "parent",
      5,
      "2026-10-09",
      "Omar's predicted grade went up two levels this term. Mr Carter spots gaps early.",
      "Omar Haddad",
    ],
    [
      2,
      "Meera Iyer",
      "parent",
      4,
      "2026-09-30",
      "Rohan says the A Level Physics pace is fast but well explained.",
      "Rohan Iyer",
    ],
    [
      2,
      "Hiro Tanaka",
      "parent",
      4,
      "2026-10-15",
      "Good support with the IB Physics IA. Feedback was detailed.",
      undefined,
      true,
    ],
    [
      3,
      "Tom Morgan",
      "parent",
      4,
      "2026-10-27",
      "Freya moved up to more challenging work in Set 2 and feels confident.",
      "Freya Morgan",
    ],
    [
      3,
      "Grace Okafor",
      "parent",
      5,
      "2026-10-12",
      "Excellent maths teacher. Daniel's homework comes back marked within days.",
      "Daniel Okafor",
    ],
    [
      3,
      "Khalid Rahman",
      "parent",
      3,
      "2026-10-19",
      "Strong teaching, but the homework load before mocks was heavy for Aisha.",
      "Aisha Rahman",
    ],
    [
      3,
      "Meera Iyer",
      "parent",
      5,
      "2026-09-25",
      "Rohan's A Level Maths has really clicked this year.",
      "Rohan Iyer",
    ],
    [
      4,
      "Tom Morgan",
      "parent",
      5,
      "2026-10-30",
      "The An Inspector Calls unit was superb. Freya reads more at home now.",
      "Freya Morgan",
    ],
    [
      4,
      "Rana Haddad",
      "parent",
      4,
      "2026-10-06",
      "Helpful essay feedback for Omar. Would like reading lists earlier.",
      "Omar Haddad",
    ],
    [
      4,
      "Meera Iyer",
      "parent",
      4,
      "2026-09-29",
      "A caring form tutor for 12B and quick to call home.",
      "Rohan Iyer",
    ],
    [
      5,
      "Hiro Tanaka",
      "parent",
      5,
      "2026-10-22",
      "Mei always knows her EE and IA deadlines. Very organised DP coordinator.",
      "Mei Tanaka",
    ],
    [
      5,
      "Rana Haddad",
      "parent",
      4,
      "2026-10-02",
      "Good CAS guidance for Layla. The Sri Lanka trip info came late.",
      "Layla Haddad",
    ],
    [
      6,
      "Neha Shah",
      "parent",
      5,
      "2026-10-26",
      "Kabir loves Science now. The NCERT worksheets are well set out.",
      "Kabir Shah",
    ],
    [
      6,
      "Priya Nair",
      "parent",
      3,
      "2026-10-08",
      "Good teacher. More notice for worksheet deadlines, please.",
      undefined,
      true,
    ],
    [
      7,
      "Grace Okafor",
      "parent",
      4,
      "2026-10-14",
      "Daniel's Arabic has improved a lot. Patient with non-native speakers.",
      "Daniel Okafor",
    ],
    [
      7,
      "Tom Morgan",
      "parent",
      4,
      "2026-10-01",
      "Freya enjoys the Arabic B role-plays.",
      "Freya Morgan",
    ],
    [
      7,
      "Khalid Rahman",
      "parent",
      5,
      "2026-09-24",
      "Thoughtful Islamic Studies lessons. Aisha talks about them at dinner.",
      "Aisha Rahman",
    ],
    [
      8,
      "Rana Haddad",
      "parent",
      5,
      "2026-10-29",
      "Yousef is so happy in FS2. We love the learning-journal photos.",
      "Yousef Haddad",
    ],
    [
      8,
      "Emily Carter-Hayes",
      "parent",
      5,
      "2026-10-11",
      "Warm, calm and very good with settling in. Our son runs into class.",
      undefined,
      true,
    ],
  ],
  // Northbridge University
  "T-010": [
    [
      2,
      "Grace Walker",
      "student",
      5,
      "2026-10-27",
      "CS201 lectures are clear and the worked examples on graphs really help.",
    ],
    [
      2,
      "Noah Bennett",
      "student",
      4,
      "2026-10-20",
      "Good module. Labs get busy, so the queue for help can be long.",
    ],
    [
      2,
      "Chen Wei",
      "student",
      5,
      "2026-10-13",
      "Best lecturer this year. Coursework brief was very clear.",
    ],
    [2, "Leo Ward", "student", 4, "2026-10-06", "CS101 labs are well paced for first years."],
    [
      2,
      "Isabelle Fox",
      "student",
      5,
      "2026-10-23",
      "A great dissertation supervisor. Weekly check-ins keep me on track.",
    ],
    [
      2,
      "Mia Collins",
      "student",
      3,
      "2026-10-16",
      "Teaching is good, but coursework feedback took three weeks.",
      undefined,
      true,
    ],
    [
      3,
      "Leo Ward",
      "student",
      4,
      "2026-10-19",
      "CS102 is hard going but the lecture notes are excellent.",
    ],
    [
      3,
      "Ananya Rao",
      "student",
      5,
      "2026-10-02",
      "Very approachable and makes time for student reps.",
    ],
    [
      4,
      "Fatima Noor",
      "student",
      5,
      "2026-10-28",
      "Statistical Learning workshops are hands-on and practical.",
    ],
    [
      4,
      "Daniel Price",
      "student",
      4,
      "2026-10-12",
      "Strong content. The pace in week 3 was quick.",
    ],
    [
      4,
      "Hannah Lee",
      "student",
      4,
      "2026-09-30",
      "Clear slides and useful office hours.",
      undefined,
      true,
    ],
    [
      5,
      "Leo Ward",
      "student",
      4,
      "2026-10-26",
      "Good intro to programming. Lab sheets are easy to follow.",
    ],
    [
      5,
      "Fatima Noor",
      "student",
      4,
      "2026-10-09",
      "Big Data Engineering is interesting. Spark setup notes helped.",
    ],
    [5, "Daniel Price", "student", 3, "2026-10-21", "Workshops often run over time."],
    [
      6,
      "Olivia Grant",
      "student",
      4,
      "2026-10-17",
      "Real case studies make Marketing Management relevant.",
    ],
    [6, "Samuel Osei", "student", 5, "2026-10-04", "Engaging lectures and fair marking."],
  ],
  // Harbourside College Sydney
  "T-011": [
    [
      2,
      "Sakura Tanaka",
      "student",
      5,
      "2026-10-29",
      "Kate explains cyber security units in plain English. Assessments are fair.",
    ],
    [
      2,
      "Ella Brooks",
      "student",
      4,
      "2026-10-15",
      "Good networking labs. Would like more practice tasks before assessment.",
    ],
    [
      2,
      "Josh Kelly",
      "student",
      4,
      "2026-09-28",
      "Supportive trainer, quick with resubmission feedback.",
      undefined,
      true,
    ],
    [
      3,
      "Riley Cooper",
      "student",
      5,
      "2026-10-21",
      "Darren makes the wiring rules make sense. Block release days fly by.",
    ],
    [
      3,
      "Jack Turner",
      "student",
      4,
      "2026-10-07",
      "Practical and safety-first. Theory pace is fast.",
    ],
    [
      4,
      "Chloe Martin",
      "student",
      5,
      "2026-10-27",
      "Clinical skills days are brilliant. Very well organised.",
    ],
    [
      4,
      "Ruby Evans",
      "student",
      5,
      "2026-10-13",
      "Jess helped me get my placement hours signed off on time.",
    ],
    [
      4,
      "Mai Pham",
      "student",
      4,
      "2026-09-30",
      "Kind and knowledgeable. Notes could be uploaded earlier.",
      undefined,
      true,
    ],
    [
      5,
      "Tom Nguyen",
      "student",
      4,
      "2026-10-24",
      "Good on the tools. Explains the why, not just the how.",
    ],
    [5, "Mason Reid", "student", 5, "2026-10-10", "Best trainer I've had. Real site experience."],
    [
      6,
      "Lachlan Murphy",
      "student",
      4,
      "2026-10-22",
      "Systems Analysis tutorials are useful. Group work is well run.",
    ],
    [
      6,
      "Ishaan Kapoor",
      "student",
      5,
      "2026-10-08",
      "Cloud Computing labs are excellent and very current.",
    ],
    [
      6,
      "Zoe Hart",
      "student",
      3,
      "2026-09-26",
      "Content is good, but slides go up late.",
      undefined,
      true,
    ],
  ],
  // Meridian International School Colombo
  "T-012": [
    [
      2,
      "Dilani Perera",
      "parent",
      4,
      "2026-10-25",
      "Nethmi says Chemistry practicals are the best part of her week.",
      "Nethmi Perera",
    ],
    [
      2,
      "Ruwan Fernando",
      "parent",
      5,
      "2026-10-18",
      "Kavin's IAL Chemistry results improved after the past-paper clinics.",
      "Kavin Fernando",
    ],
    [
      2,
      "Chamari Silva",
      "parent",
      4,
      "2026-10-05",
      "Clear about O/L and IGCSE choices. Very helpful at the options evening.",
      "Tharushi Silva",
    ],
    [
      2,
      "Nimali Jayasuriya",
      "parent",
      5,
      "2026-09-27",
      "Ashan feels ready for his A Levels. Thank you, Sir.",
      "Ashan Jayasuriya",
    ],
    [
      3,
      "Roshan de Silva",
      "parent",
      5,
      "2026-10-28",
      "Thevin loves the reading corner. Reading record comments are lovely.",
      "Thevin de Silva",
    ],
    [
      3,
      "Fathima Rizvi",
      "parent",
      4,
      "2026-10-16",
      "Good times-tables practice. A little more homework notice would help.",
      "Aysha Rizvi",
    ],
    [
      3,
      "Kasun Bandara",
      "parent",
      5,
      "2026-10-03",
      "Our daughter settled into Year 3 quickly. Very caring teacher.",
      undefined,
      true,
    ],
    [
      4,
      "Dilani Perera",
      "parent",
      5,
      "2026-10-30",
      "Senuli comes home singing. The daily learning-journal photos are wonderful.",
      "Senuli Perera",
    ],
    [
      4,
      "Kushani Wickramasinghe",
      "parent",
      4,
      "2026-10-09",
      "Calm, gentle start to Upper Nursery.",
      undefined,
      true,
    ],
  ],
};

export const seedTeacherRatings: TeacherRating[] = Object.entries(RATINGS).flatMap(
  ([tenantId, rows]) =>
    rows.map(([pos, author, role, stars, at, comment, childName, anonymous], i) => {
      const staff = TENANT_STAFF[tenantId][pos - 1];
      return {
        id: `TRP-${tenantId.replace("-", "")}-${String(i + 1).padStart(2, "0")}`,
        teacherId: packStaffId(tenantId, pos),
        teacherName: staff.name,
        authorName: author,
        authorRole: role,
        stars,
        comment,
        at: `${at}T${String(9 + (i % 9)).padStart(2, "0")}:15:00.000Z`,
        childName,
        anonymous,
      };
    }),
);

/* ── Schedule helpers (pure) ─────────────────────────────────────────────── */

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOfISO(iso: string): string {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay(); // 0 Sun
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow);
}

/** Learner forms of a group's students ("10C"). */
function formsOf(g: TeachingGroup, learners: Learner[]): Set<string> {
  return new Set(
    learners.filter((l) => g.studentIds.includes(l.id) && l.group).map((l) => l.group as string),
  );
}

/** Timetable slots that belong to a teaching group. */
export function slotsForGroup(
  g: TeachingGroup,
  slots: TimetableSlot[],
  learners: Learner[],
): TimetableSlot[] {
  const mine = slots.filter((s) => s.tenantId === g.tenantId);
  if (g.kind === "module") return mine.filter((s) => s.groupLabel.startsWith(g.code));
  if (g.kind === "qualification") {
    const forms = formsOf(g, learners);
    return mine.filter((s) => s.subject.startsWith(g.code) || s.cohorts?.some((c) => forms.has(c)));
  }
  const forms = formsOf(g, learners);
  return mine.filter(
    (s) =>
      s.teacherName === g.teacher &&
      s.subject.toLowerCase() === g.subject.toLowerCase() &&
      (s.cohorts ?? [s.groupLabel]).some((c) => forms.has(c)),
  );
}

const DAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Primary / early-years classes taught by the class teacher every morning
 *  have no period timetable in the seed. Give them a daily slot (literacy P1,
 *  numeracy P2…) so calendars show the school day. */
export function derivedSlots(
  groups: TeachingGroup[],
  slots: TimetableSlot[],
  learners: Learner[],
): TimetableSlot[] {
  const bare = groups.filter(
    (g) =>
      g.kind === "class" &&
      (g.band === "primary" || g.band === "early") &&
      slotsForGroup(g, slots, learners).length === 0,
  );
  return bare.flatMap((g, i) => {
    const p = SCHOOL_PERIODS[i % SCHOOL_PERIODS.length];
    const forms = [...formsOf(g, learners)];
    return DAYS.map(
      (day): TimetableSlot => ({
        id: `DER-${g.id}-${day}`,
        tenantId: g.tenantId,
        day,
        start: p.start,
        end: p.end,
        period: p.period,
        groupLabel: forms[0] ?? g.code,
        subject: g.subject,
        teacherName: g.teacher,
        roomId: g.room ?? "",
        cohorts: forms,
      }),
    );
  });
}

export interface Occurrence {
  slot: TimetableSlot;
  date: string;
  start: string;
  end: string;
  roomId: string;
  change?: ClassChange;
}

const periodTimes = (p?: string) => SCHOOL_PERIODS.find((x) => x.period === p);

/** Dated lessons between two ISO days (inclusive) with class changes applied:
 *  cancelled lessons stay (flagged), moved lessons appear on their new day,
 *  room changes swap the room. */
export function occurrences(
  slots: TimetableSlot[],
  changes: ClassChange[],
  from: string,
  to: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    const wd = weekdayOf(d);
    for (const s of slots) {
      if (s.day !== wd) continue;
      const c = changes.find((x) => x.slotId === s.id && x.date === d);
      if (c?.kind === "Moved") continue; // shown on its new day below
      out.push({
        slot: s,
        date: d,
        start: s.start,
        end: s.end,
        roomId: c?.newRoomId ?? s.roomId,
        change: c,
      });
    }
  }
  for (const c of changes) {
    if (c.kind !== "Moved" || !c.newDate || c.newDate < from || c.newDate > to) continue;
    const s = slots.find((x) => x.id === c.slotId);
    if (!s) continue;
    const p = periodTimes(c.newPeriod);
    out.push({
      slot: s,
      date: c.newDate,
      start: c.newStart ?? p?.start ?? s.start,
      end: c.newEnd ?? p?.end ?? s.end,
      roomId: c.newRoomId ?? s.roomId,
      change: c,
    });
  }
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/* ── Who teaches whom ────────────────────────────────────────────────────── */

export interface TaughtLink {
  learnerId: string;
  learnerName: string;
  what: string; // "10 Physics", "Form tutor · 10C", "CS201 · Lab"
}

/** Staff who teach these learners (by staff name): teaching groups, form
 *  tutors and timetabled lessons (labs, form-wide lessons). */
export function teachersOfLearners(
  mine: Learner[],
  groups: TeachingGroup[],
  tutorGroups: { tenantId: string; name: string; tutor: string }[],
  slots: TimetableSlot[],
  moduleCodesFor: (learnerId: string) => string[],
): Map<string, TaughtLink[]> {
  const out = new Map<string, TaughtLink[]>();
  const add = (teacher: string, l: Learner, what: string) => {
    if (!teacher) return;
    const list = out.get(teacher) ?? [];
    if (list.some((x) => x.learnerId === l.id && x.what === what)) return;
    list.push({ learnerId: l.id, learnerName: l.name, what });
    out.set(teacher, list);
  };
  for (const l of mine) {
    for (const g of groups) {
      if (g.tenantId === l.tenantId && g.studentIds.includes(l.id)) add(g.teacher, l, g.title);
    }
    for (const t of tutorGroups) {
      if (t.tenantId === l.tenantId && t.name === l.group)
        add(t.tutor, l, `Form tutor · ${t.name}`);
    }
    const codes = moduleCodesFor(l.id);
    for (const s of slots) {
      if (s.tenantId !== l.tenantId) continue;
      const hit =
        s.cohorts?.includes(l.group ?? "") ||
        s.groupLabel === l.group ||
        codes.some((c) => s.groupLabel.startsWith(c));
      if (!hit) continue;
      const known = out.get(s.teacherName)?.some((x) => x.learnerId === l.id);
      if (!known) add(s.teacherName, l, codes.length ? s.groupLabel : s.subject);
    }
  }
  return out;
}
