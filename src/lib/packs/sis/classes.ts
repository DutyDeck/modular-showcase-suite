/* ── School classes & enrolment ─────────────────────────────────────────────
 * Two kinds of class in a school:
 *   • Form class (tutor group, e.g. "10C") — schoolData TutorGroup. A pupil is
 *     in exactly ONE form; membership is Learner.group (registers and the
 *     timetable read it, so moving a pupil updates both).
 *   • Subject class (teaching set, e.g. "10 Physics Set 1") — a pupil can be
 *     in many. Membership is SubjectClass.studentIds.
 * Every enrol / remove / move goes through logChange(); capacity is a soft
 * limit (warn, don't block — schools over-fill sets in practice).
 * A pupil can't be in two sets of the same subject + year group (setClash). */

export interface SubjectClass {
  id: string;
  tenantId: string;
  curriculumId: string;
  yearGroup: string;
  subject: string;
  name: string; // "10 Physics Set 1"
  teacher: string;
  room?: string;
  capacity: number;
  /** Ability set / band, if the school sets by ability (1 = top). */
  set?: number;
  studentIds: string[];
}

const sc = (
  id: string,
  tenantId: string,
  curriculumId: string,
  yearGroup: string,
  subject: string,
  name: string,
  teacher: string,
  room: string,
  capacity: number,
  studentIds: string[],
  set?: number,
): SubjectClass => ({
  id,
  tenantId,
  curriculumId,
  yearGroup,
  subject,
  name,
  teacher,
  room,
  capacity,
  set,
  studentIds,
});

const CARTER = "Mr. James Carter";
const LEWIS = "Ms. Emma Lewis";
const DAWSON = "Mrs. Claire Dawson";
const WEBB = "Dr. Marcus Webb";
const MENON = "Ms. Anjali Menon";
const YUSUF = "Mr. Yusuf Ali";
const PERERA = "Mr. Sanjeewa Perera";
const FERNANDO = "Ms. Ishara Fernando";

/* Seeds follow the learner seeds (foundationData S-3001…S-3105) and the
 * timetable (opsData meridianSpec / colomboSpec). Deliberate gaps for the
 * "unplaced" view: Daniel Okafor (S-3008) has no Year 10 English set, Aisha
 * Rahman (S-3007) no Year 11 English set, Kabir Shah (S-3010) no Grade 7
 * Arabic set. */
export const subjectClasses: SubjectClass[] = [
  // ── Meridian Dubai · British · Year 10 (10C: Zara, Freya, Daniel)
  sc(
    "SC-0901",
    "T-009",
    "CUR-0901",
    "Year 10",
    "IGCSE Physics",
    "10 Physics",
    CARTER,
    "S1 Physics Lab",
    24,
    ["S-3001", "S-3005", "S-3008"],
  ),
  sc(
    "SC-0902",
    "T-009",
    "CUR-0901",
    "Year 10",
    "IGCSE Mathematics",
    "10 Maths Set 1",
    LEWIS,
    "M2",
    24,
    ["S-3001", "S-3008"],
    1,
  ),
  sc(
    "SC-0903",
    "T-009",
    "CUR-0901",
    "Year 10",
    "IGCSE Mathematics",
    "10 Maths Set 2",
    LEWIS,
    "M2",
    20,
    ["S-3005"],
    2,
  ),
  sc("SC-0904", "T-009", "CUR-0901", "Year 10", "IGCSE English", "10 English", DAWSON, "E4", 24, [
    "S-3001",
    "S-3005",
  ]),
  sc("SC-0905", "T-009", "CUR-0901", "Year 10", "Arabic B", "10 Arabic B", YUSUF, "A3", 24, [
    "S-3001",
    "S-3005",
    "S-3008",
  ]),
  // ── Year 11 (11A: Omar, Aisha)
  sc(
    "SC-0906",
    "T-009",
    "CUR-0901",
    "Year 11",
    "IGCSE Physics",
    "11 Physics",
    CARTER,
    "S1 Physics Lab",
    24,
    ["S-3003", "S-3007"],
  ),
  sc(
    "SC-0907",
    "T-009",
    "CUR-0901",
    "Year 11",
    "IGCSE Mathematics",
    "11 Maths Set 1",
    LEWIS,
    "M2",
    24,
    ["S-3007"],
    1,
  ),
  sc(
    "SC-0908",
    "T-009",
    "CUR-0901",
    "Year 11",
    "IGCSE Mathematics",
    "11 Maths Set 2",
    LEWIS,
    "M2",
    20,
    ["S-3003"],
    2,
  ),
  sc("SC-0909", "T-009", "CUR-0901", "Year 11", "IGCSE English", "11 English", DAWSON, "E4", 24, [
    "S-3003",
  ]),
  // ── Year 12 (12B: Rohan)
  sc(
    "SC-0910",
    "T-009",
    "CUR-0901",
    "Year 12",
    "A Level Physics",
    "12 A Level Physics",
    CARTER,
    "S1 Physics Lab",
    16,
    ["S-3006"],
  ),
  sc(
    "SC-0911",
    "T-009",
    "CUR-0901",
    "Year 12",
    "A Level Mathematics",
    "12 A Level Maths",
    LEWIS,
    "M2",
    18,
    ["S-3006"],
  ),
  // ── IB DP Year 2 (DP2: Layla, Mei)
  sc(
    "SC-0912",
    "T-009",
    "CUR-0902",
    "IB DP Year 2",
    "IB Physics HL",
    "DP2 Physics HL",
    CARTER,
    "S1 Physics Lab",
    16,
    ["S-3004", "S-3009"],
  ),
  sc(
    "SC-0913",
    "T-009",
    "CUR-0902",
    "IB DP Year 2",
    "IB Mathematics AA HL",
    "DP2 Maths AA HL",
    LEWIS,
    "M2",
    16,
    ["S-3004", "S-3009"],
  ),
  sc(
    "SC-0914",
    "T-009",
    "CUR-0902",
    "IB DP Year 2",
    "IB Theory of Knowledge",
    "DP2 Theory of Knowledge",
    WEBB,
    "Library Seminar Room",
    20,
    ["S-3004", "S-3009"],
  ),
  // ── CBSE Grade 7 (7B: Adam, Kabir)
  sc(
    "SC-0915",
    "T-009",
    "CUR-0903",
    "Grade 7",
    "CBSE Science",
    "7 Science",
    MENON,
    "C7 Science Lab",
    30,
    ["S-3002", "S-3010"],
  ),
  sc(
    "SC-0916",
    "T-009",
    "CUR-0903",
    "Grade 7",
    "CBSE Mathematics",
    "7 Mathematics",
    MENON,
    "C7 Science Lab",
    30,
    ["S-3002", "S-3010"],
  ),
  sc("SC-0917", "T-009", "CUR-0903", "Grade 7", "Arabic A", "7 Arabic A", YUSUF, "A3", 30, [
    "S-3002",
  ]),

  // ── Colombo · British (with O/L option)
  sc("SC-1201", "T-012", "CUR-1201", "Year 3", "English", "3B English", FERNANDO, "Room 3B", 28, [
    "S-3105",
  ]),
  sc(
    "SC-1202",
    "T-012",
    "CUR-1201",
    "Year 3",
    "Mathematics",
    "3B Mathematics",
    FERNANDO,
    "Room 3B",
    28,
    ["S-3105"],
  ),
  sc(
    "SC-1203",
    "T-012",
    "CUR-1201",
    "Year 10",
    "IGCSE Chemistry",
    "10 Science — Chemistry",
    PERERA,
    "Science Lab",
    26,
    ["S-3101"],
  ),
  sc(
    "SC-1204",
    "T-012",
    "CUR-1201",
    "Year 11",
    "IGCSE Physics",
    "11 Physics",
    PERERA,
    "Science Lab",
    26,
    ["S-3103"],
  ),
  sc(
    "SC-1205",
    "T-012",
    "CUR-1202",
    "Year 12",
    "International A Level Chemistry",
    "12 IAL Chemistry",
    PERERA,
    "Science Lab",
    18,
    ["S-3102"],
  ),
  sc(
    "SC-1206",
    "T-012",
    "CUR-1202",
    "Year 13",
    "International A Level Chemistry",
    "13 IAL Chemistry",
    PERERA,
    "Science Lab",
    18,
    ["S-3104"],
  ),
];

/* ── Pure helpers (no store access) ───────────────────────────────────────── */

/** Learner statuses that count as "on roll" for class placement. */
export const ON_ROLL_STATUSES = ["Active", "Interrupted"];

/** A learner's curriculum: explicit id, else the tenant curriculum that offers their year group. */
export function curriculumIdFor(
  l: { tenantId: string; level: string; curriculumId?: string },
  curricula: { id: string; tenantId: string; yearGroups: string[] }[],
): string | undefined {
  if (l.curriculumId) return l.curriculumId;
  return curricula.find((c) => c.tenantId === l.tenantId && c.yearGroups.includes(l.level))?.id;
}

/** Another set of the same subject + year group (+ curriculum) the pupil is already in. */
export function setClash(
  sets: SubjectClass[],
  studentId: string,
  target: Pick<SubjectClass, "id" | "tenantId" | "curriculumId" | "yearGroup" | "subject">,
): SubjectClass | undefined {
  return sets.find(
    (s) =>
      s.id !== target.id &&
      s.tenantId === target.tenantId &&
      s.curriculumId === target.curriculumId &&
      s.yearGroup === target.yearGroup &&
      s.subject.toLowerCase() === target.subject.toLowerCase() &&
      s.studentIds.includes(studentId),
  );
}

/** Suggested set name: "10 Physics Set 2", "DP2 Maths", "7 Science". */
export function suggestSetName(yearGroup: string, subject: string, set?: number): string {
  const yr = /^IB DP Year (\d)/.exec(yearGroup)
    ? `DP${/(\d)/.exec(yearGroup)![1]}`
    : (/(\d+)/.exec(yearGroup)?.[1] ?? yearGroup);
  const subj = subject.replace(/^(IGCSE|A Level|CBSE|IB)\s+/i, "").trim() || subject;
  return `${yr} ${subj}${set ? ` Set ${set}` : ""}`.trim();
}

/**
 * Auto-place pupils into forms: each pupil goes to the form with the most free
 * room (fewest pupils relative to capacity). Twins / siblings in the same year
 * group go to different forms where possible.
 */
export function autoPlace(
  pupils: { id: string; name: string; guardians?: string[] }[],
  forms: { name: string; capacity?: number; members: { id: string; guardians?: string[] }[] }[],
): { studentId: string; form: string }[] {
  if (forms.length === 0) return [];
  const state = forms.map((f) => ({
    name: f.name,
    capacity: f.capacity ?? 30,
    members: [...f.members],
  }));
  const out: { studentId: string; form: string }[] = [];
  const isSibling = (a?: string[], b?: string[]) =>
    !!a?.length && !!b?.length && a.some((g) => b.includes(g));
  for (const p of [...pupils].sort((a, b) => a.name.localeCompare(b.name))) {
    const load = (f: (typeof state)[number]) => f.members.length / Math.max(1, f.capacity);
    const ranked = [...state].sort((a, b) => load(a) - load(b) || a.name.localeCompare(b.name));
    const apart = ranked.find((f) => !f.members.some((m) => isSibling(m.guardians, p.guardians)));
    const pick = apart ?? ranked[0];
    pick.members.push({ id: p.id, guardians: p.guardians });
    out.push({ studentId: p.id, form: pick.name });
  }
  return out;
}
