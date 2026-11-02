/**
 * Higher Education Pack + College add-on — data model + seed.
 *
 * HE: Programme → stages (year / level) → modules with credits, prerequisites
 * and weighted assessment components; module registration; marks with
 * moderation and resit attempts; extenuating circumstances; exam-board
 * progression decisions; transcripts (computed) and classification (region).
 *
 * College add-on: qualifications + units from awarding bodies, unit
 * achievement, apprenticeships (employer, off-the-job hours, EPA) and
 * work placements.
 */

export interface ProgrammeStage {
  name: string; // "Level 4 (Year 1)"
  credits: number;
  coreModuleIds: string[];
  optionalModuleIds: string[];
  optionalCreditsRequired: number;
}

export interface Programme {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  award: string; // "BSc (Hons)"
  level: "UG" | "PGT" | "PGR" | "Sub-degree";
  department: string;
  durationYears: number;
  totalCredits: number;
  intakes: string[]; // ["Sep", "Jan"]
  mode: "Full-time" | "Part-time" | "Full-time / Part-time";
  calendarId: string;
  stages: ProgrammeStage[];
  /** Pass mark for modules on this programme. */
  passMark: number;
}

export interface AssessmentComponent {
  id: string;
  name: string;
  type: "Exam" | "Coursework" | "Practical" | "Presentation" | "Dissertation";
  weight: number; // percent, components sum to 100
  due: string;
}

export interface HeModule {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  credits: number;
  level: string; // "Level 5"
  semester: "S1" | "S2" | "Year";
  leader: string;
  prerequisites: string[]; // module codes
  capacity: number;
  components: AssessmentComponent[];
}

export interface ModuleRegistration {
  id: string;
  tenantId: string;
  studentId: string;
  moduleId: string;
  academicYear: string;
  kind: "Core" | "Optional";
  status: "Registered" | "Pending approval" | "Rejected" | "Withdrawn";
  at: string;
  /** Reason shown to the student when rejected / withdrawn. */
  note?: string;
}

export type MarkStatus = "Provisional" | "Moderated" | "Confirmed";

export interface ModuleMark {
  id: string;
  tenantId: string;
  studentId: string;
  moduleId: string;
  componentId: string;
  mark?: number;
  attempt: 1 | 2;
  status: MarkStatus;
  flag?: "EC" | "Late penalty" | "Academic misconduct";
  /** Academic year the attempt belongs to (e.g. "2026/27"). */
  academicYear?: string;
}

export interface EcClaim {
  id: string;
  tenantId: string;
  studentId: string;
  moduleId: string;
  componentId?: string;
  category: "Illness" | "Bereavement" | "Personal / family" | "Technical" | "Other";
  statement: string;
  evidence: string;
  submittedAt: string;
  status: "Submitted" | "Approved" | "Rejected" | "More evidence needed";
  outcome?:
    | "Extension (7 days)"
    | "Deferral to resit period"
    | "Uncapped resit"
    | "Mark disregarded";
}

export type BoardOutcome =
  | "Progress"
  | "Progress — trailing credit"
  | "Resit"
  | "Repeat year"
  | "Withdraw"
  | "Award";

export interface BoardDecision {
  id: string;
  tenantId: string;
  studentId: string;
  programmeId: string;
  stage: string;
  boardDate: string;
  average: number;
  creditsPassed: number;
  creditsAttempted: number;
  outcome: BoardOutcome;
  classification?: string;
  ratified: boolean;
}

/* ── College add-on ──────────────────────────────────────────────────────── */

export interface QualUnit {
  code: string;
  title: string;
  hours: number;
  core: boolean;
}

export interface Qualification {
  id: string;
  tenantId: string;
  code: string; // national code e.g. "ICT50220"
  title: string;
  awardingBody: string; // "Pearson BTEC", "City & Guilds", "Nationally recognised (AQF)"
  level: string; // "Level 3", "AQF 5"
  fundingStream: string;
  units: QualUnit[];
  /** Electives a learner must achieve for certification. */
  electivesRequired?: number;
}

export type UnitOutcome =
  | "In progress"
  | "Competent"
  | "Not yet competent"
  | "Pass"
  | "Merit"
  | "Distinction"
  | "Credit transfer";

export interface UnitAchievement {
  id: string;
  tenantId: string;
  studentId: string;
  qualificationId: string;
  unitCode: string;
  outcome: UnitOutcome;
  assessor: string;
  date?: string;
}

export interface Apprenticeship {
  id: string;
  tenantId: string;
  studentId: string;
  employer: string;
  standard: string;
  startDate: string;
  plannedEnd: string;
  offJobHoursPlanned: number;
  offJobHoursLogged: number;
  status: "On programme" | "Break in learning" | "Gateway" | "EPA booked" | "Achieved";
  reviews: { date: string; by: string; note: string }[];
}

export interface Placement {
  id: string;
  tenantId: string;
  studentId: string;
  host: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  hoursRequired: number;
  hoursLogged: number;
  status: "Arranged" | "In progress" | "Completed";
  riskAssessed: boolean;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Calculation helpers — shared by registration, assessment, board, transcript
 * ════════════════════════════════════════════════════════════════════════════ */

export interface ModuleOutcome {
  /** Weighted module mark (capped at the pass mark for a non-EC resit). */
  mark?: number;
  attempt: 1 | 2;
  /** Every component has a mark. */
  complete: boolean;
  passed: boolean;
  capped: boolean;
  /** Raw (uncapped) weighted mark. */
  raw?: number;
}

/**
 * Weighted module result for a student. A component's attempt-2 mark (resit)
 * replaces attempt 1. A resit that wasn't EC-approved is capped at the pass
 * mark (standard UK practice); an EC-flagged resit is uncapped.
 */
export function moduleOutcome(
  mod: HeModule,
  marks: ModuleMark[],
  studentId: string,
  passMark: number,
): ModuleOutcome {
  const mine = marks.filter((m) => m.studentId === studentId && m.moduleId === mod.id);
  let sum = 0;
  let weight = 0;
  let complete = true;
  let resit = false;
  let ecResit = false;
  for (const c of mod.components) {
    const a2 = mine.find((m) => m.componentId === c.id && m.attempt === 2 && m.mark !== undefined);
    const a1 = mine.find((m) => m.componentId === c.id && m.attempt === 1 && m.mark !== undefined);
    const use = a2 ?? a1;
    if (!use || use.mark === undefined) {
      complete = false;
      continue;
    }
    if (a2) {
      resit = true;
      if (a2.flag === "EC") ecResit = true;
    }
    sum += use.mark * c.weight;
    weight += c.weight;
  }
  if (!weight) return { attempt: 1, complete: false, passed: false, capped: false };
  const raw = Math.round(sum / weight);
  const capped = resit && !ecResit && raw > passMark;
  const mark = capped ? passMark : raw;
  return {
    mark,
    raw,
    attempt: resit ? 2 : 1,
    complete,
    passed: complete && mark >= passMark,
    capped,
  };
}

export interface StageSummary {
  modules: { mod: HeModule; outcome: ModuleOutcome; kind: "Core" | "Optional" }[];
  /** Credit-weighted average over complete modules. */
  average: number;
  creditsAttempted: number;
  creditsPassed: number;
  creditsFailed: number;
  complete: boolean;
}

/** Modules a student is taking in a stage = core ∪ optionals they registered for or have marks in. */
export function stageModulesFor(
  stage: ProgrammeStage,
  modules: HeModule[],
  regs: ModuleRegistration[],
  marks: ModuleMark[],
  studentId: string,
): { mod: HeModule; kind: "Core" | "Optional" }[] {
  const taking = (id: string) =>
    regs.some((r) => r.studentId === studentId && r.moduleId === id && r.status === "Registered") ||
    marks.some((m) => m.studentId === studentId && m.moduleId === id);
  const out: { mod: HeModule; kind: "Core" | "Optional" }[] = [];
  for (const id of stage.coreModuleIds) {
    const mod = modules.find((m) => m.id === id);
    if (mod) out.push({ mod, kind: "Core" });
  }
  for (const id of stage.optionalModuleIds) {
    const mod = modules.find((m) => m.id === id);
    if (mod && taking(id)) out.push({ mod, kind: "Optional" });
  }
  return out;
}

export function stageSummary(
  programme: Programme,
  stage: ProgrammeStage,
  modules: HeModule[],
  regs: ModuleRegistration[],
  marks: ModuleMark[],
  studentId: string,
): StageSummary {
  const list = stageModulesFor(stage, modules, regs, marks, studentId).map((x) => ({
    ...x,
    outcome: moduleOutcome(x.mod, marks, studentId, programme.passMark),
  }));
  let w = 0;
  let s = 0;
  let attempted = 0;
  let passed = 0;
  for (const { mod, outcome } of list) {
    if (!outcome.complete || outcome.mark === undefined) continue;
    attempted += mod.credits;
    if (outcome.passed) passed += mod.credits;
    s += outcome.mark * mod.credits;
    w += mod.credits;
  }
  return {
    modules: list,
    average: w ? Math.round((s / w) * 10) / 10 : 0,
    creditsAttempted: attempted,
    creditsPassed: passed,
    creditsFailed: attempted - passed,
    complete: list.length > 0 && list.every((x) => x.outcome.complete),
  };
}

/** Progression rule used by the exam board (tenant-configurable in production). */
export function suggestOutcome(sum: StageSummary, isFinalStage: boolean): BoardOutcome {
  if (!sum.creditsAttempted) return "Resit";
  const failed = sum.creditsFailed;
  if (failed === 0) return isFinalStage ? "Award" : "Progress";
  if (failed <= 20 && !isFinalStage) return "Progress — trailing credit";
  if (failed <= 60) return "Resit";
  return "Repeat year";
}

/** UK PGT classification (Distinction / Merit / Pass). */
export function pgtClassification(avg: number): string {
  if (avg >= 70) return "Distinction";
  if (avg >= 60) return "Merit";
  if (avg >= 50) return "Pass";
  return "Fail";
}

/** Stage of a programme a learner is currently on (matched by level label). */
export function stageIndexFor(programme: Programme, level: string): number {
  const i = programme.stages.findIndex((s) => s.name === level);
  return i < 0 ? 0 : i;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Seed
 * ════════════════════════════════════════════════════════════════════════════ */

type Comp = AssessmentComponent;
const cw = (due: string, weight = 50, name = "Coursework"): Comp => ({
  id: "c1",
  name,
  type: "Coursework",
  weight,
  due,
});
const ex = (due: string, weight = 50, id = "c2", name = "Examination"): Comp => ({
  id,
  name,
  type: "Exam",
  weight,
  due,
});

function mod(
  id: string,
  tenantId: string,
  code: string,
  title: string,
  credits: number,
  level: string,
  semester: HeModule["semester"],
  leader: string,
  components: Comp[],
  prerequisites: string[] = [],
  capacity = 120,
): HeModule {
  return {
    id,
    tenantId,
    code,
    title,
    credits,
    level,
    semester,
    leader,
    prerequisites,
    capacity,
    components,
  };
}

const REID = "Dr. Samuel Reid";
const HARTLEY = "Dr. Tom Hartley";
const BELLO = "Dr. Aisha Bello";
const MOORE = "Prof. Helen Moore";
const EVANS = "Mr. Gareth Evans";
const PATEL = "Dr. Nina Patel";
const SULLIVAN = "Ms. Kate Sullivan";

const S1 = { cw: "2026-11-20", ex: "2027-01-14" };
const S2 = { cw: "2027-03-19", ex: "2027-05-24" };

export const heModules: HeModule[] = [
  // ── Northbridge — BSc Computer Science, Level 4 ──
  mod("MOD-1001", "T-010", "CS101", "Programming Fundamentals", 20, "Level 4", "S1", REID, [
    cw("2026-10-16", 50, "Programming portfolio"),
    ex(S1.ex),
  ]),
  mod("MOD-1002", "T-010", "CS102", "Computer Systems", 20, "Level 4", "S1", HARTLEY, [
    cw(S1.cw, 40, "Lab reports"),
    ex(S1.ex, 60),
  ]),
  mod("MOD-1013", "T-010", "CS103", "Mathematics for Computing", 20, "Level 4", "S1", MOORE, [
    cw(S1.cw, 30, "Problem sheets"),
    ex(S1.ex, 70),
  ]),
  mod("MOD-1014", "T-010", "CS104", "Professional Practice", 20, "Level 4", "S2", EVANS, [
    cw(S2.cw, 60, "Reflective portfolio"),
    { id: "c2", name: "Presentation", type: "Presentation", weight: 40, due: "2027-04-23" },
  ]),
  mod("MOD-1015", "T-010", "CS105", "Web Foundations", 20, "Level 4", "S2", HARTLEY, [
    cw(S2.cw, 100, "Website project"),
  ]),
  mod("MOD-1016", "T-010", "CS106", "Object-Oriented Programming", 20, "Level 4", "S2", BELLO, [
    cw(S2.cw, 50),
    ex(S2.ex),
  ]),
  // ── Level 5 ──
  mod(
    "MOD-1003",
    "T-010",
    "CS201",
    "Data Structures & Algorithms",
    20,
    "Level 5",
    "S1",
    REID,
    [cw("2026-10-23", 40, "Algorithms coursework"), ex(S1.ex, 60)],
    ["CS101"],
  ),
  mod(
    "MOD-1004",
    "T-010",
    "CS202",
    "Databases",
    20,
    "Level 5",
    "S1",
    BELLO,
    [cw("2026-11-27", 50, "Database design project"), ex("2027-01-18")],
    ["CS101"],
  ),
  mod(
    "MOD-1005",
    "T-010",
    "CS203",
    "Software Engineering",
    20,
    "Level 5",
    "Year",
    HARTLEY,
    [
      cw(S2.cw, 60, "Group project"),
      {
        id: "c2",
        name: "Individual presentation",
        type: "Presentation",
        weight: 40,
        due: "2027-04-30",
      },
    ],
    ["CS106"],
  ),
  mod(
    "MOD-1006",
    "T-010",
    "CS204",
    "Web Development",
    20,
    "Level 5",
    "S1",
    REID,
    [cw("2026-10-30", 50, "Full-stack app"), cw("2026-12-11", 50, "Accessibility audit")].map(
      (c, i) => ({ ...c, id: `c${i + 1}` }),
    ),
    ["CS105"],
    60,
  ),
  mod(
    "MOD-1007",
    "T-010",
    "CS205",
    "Machine Learning Foundations",
    20,
    "Level 5",
    "S2",
    BELLO,
    [cw(S2.cw, 50, "ML notebook"), ex(S2.ex)],
    ["CS101", "CS103"],
    40,
  ),
  mod(
    "MOD-1008",
    "T-010",
    "CS206",
    "Human–Computer Interaction",
    20,
    "Level 5",
    "S2",
    HARTLEY,
    [cw(S2.cw, 100, "Usability study")],
    [],
    50,
  ),
  mod(
    "MOD-1009",
    "T-010",
    "CS207",
    "Cyber Security Fundamentals",
    20,
    "Level 5",
    "S2",
    MOORE,
    [cw(S2.cw, 40, "Capture-the-flag log"), ex(S2.ex, 60)],
    ["CS102"],
    50,
  ),
  mod(
    "MOD-1017",
    "T-010",
    "CS208",
    "Mobile App Development",
    20,
    "Level 5",
    "S2",
    REID,
    [cw(S2.cw, 100, "App build")],
    ["CS106"],
    2,
  ),
  // ── Level 6 ──
  mod(
    "MOD-1018",
    "T-010",
    "CS301",
    "Final Year Project",
    40,
    "Level 6",
    "Year",
    MOORE,
    [
      { id: "c1", name: "Dissertation", type: "Dissertation", weight: 80, due: "2027-04-30" },
      { id: "c2", name: "Viva", type: "Presentation", weight: 20, due: "2027-05-14" },
    ],
    ["CS203"],
  ),
  mod(
    "MOD-1019",
    "T-010",
    "CS302",
    "Distributed Systems",
    20,
    "Level 6",
    "S1",
    HARTLEY,
    [cw(S1.cw, 40), ex(S1.ex, 60)],
    ["CS102"],
  ),
  mod(
    "MOD-1020",
    "T-010",
    "CS303",
    "Artificial Intelligence",
    20,
    "Level 6",
    "S1",
    BELLO,
    [cw(S1.cw), ex(S1.ex)],
    ["CS205"],
  ),
  mod("MOD-1021", "T-010", "CS304", "Cloud Computing", 20, "Level 6", "S2", REID, [
    cw(S2.cw, 100, "Cloud deployment"),
  ]),
  mod(
    "MOD-1022",
    "T-010",
    "CS305",
    "Information Security Management",
    20,
    "Level 6",
    "S2",
    MOORE,
    [cw(S2.cw), ex(S2.ex)],
    ["CS207"],
  ),
  mod(
    "MOD-1023",
    "T-010",
    "CS306",
    "Advanced Web Engineering",
    20,
    "Level 6",
    "S1",
    REID,
    [cw(S1.cw, 100, "Progressive web app")],
    ["CS204"],
  ),
  // ── MSc Data Science (Level 7) ──
  mod("MOD-1010", "T-010", "DS701", "Statistical Learning", 20, "Level 7", "S1", BELLO, [
    cw("2026-10-30", 50, "Modelling report"),
    ex(S1.ex),
  ]),
  mod("MOD-1011", "T-010", "DS702", "Big Data Engineering", 20, "Level 7", "S1", HARTLEY, [
    cw(S1.cw, 100, "Pipeline project"),
  ]),
  mod("MOD-1024", "T-010", "DS703", "Research Methods", 20, "Level 7", "S2", MOORE, [
    cw(S2.cw, 100, "Research proposal"),
  ]),
  mod("MOD-1012", "T-010", "DS799", "Dissertation", 60, "Level 7", "Year", MOORE, [
    { id: "c1", name: "Dissertation", type: "Dissertation", weight: 100, due: "2027-09-10" },
  ]),
  mod(
    "MOD-1025",
    "T-010",
    "DS704",
    "Deep Learning",
    20,
    "Level 7",
    "S2",
    BELLO,
    [cw(S2.cw, 60), ex(S2.ex, 40)],
    ["DS701"],
    40,
  ),
  mod(
    "MOD-1026",
    "T-010",
    "DS705",
    "Data Visualisation",
    20,
    "Level 7",
    "S2",
    REID,
    [cw(S2.cw, 100, "Dashboard portfolio")],
    [],
    40,
  ),
  mod(
    "MOD-1027",
    "T-010",
    "DS706",
    "Data Ethics & Governance",
    20,
    "Level 7",
    "S2",
    EVANS,
    [cw(S2.cw, 100, "Policy essay")],
    [],
    40,
  ),
  mod(
    "MOD-1028",
    "T-010",
    "DS707",
    "Natural Language Processing",
    20,
    "Level 7",
    "S2",
    BELLO,
    [cw(S2.cw, 100, "NLP project")],
    ["DS701"],
    40,
  ),
  // ── BSc Business Management ──
  mod("MOD-1030", "T-010", "BM101", "Principles of Management", 40, "Level 4", "Year", EVANS, [
    cw(S2.cw, 50, "Case report"),
    ex(S2.ex),
  ]),
  mod("MOD-1031", "T-010", "BM102", "Accounting for Managers", 40, "Level 4", "Year", EVANS, [
    cw(S1.cw, 30),
    ex(S2.ex, 70),
  ]),
  mod("MOD-1032", "T-010", "BM103", "Marketing Principles", 40, "Level 4", "Year", EVANS, [
    cw(S2.cw, 100, "Marketing plan"),
  ]),
  mod("MOD-1033", "T-010", "BM201", "Strategic Management", 40, "Level 5", "Year", EVANS, [
    cw(S2.cw),
    ex(S2.ex),
  ]),
  mod("MOD-1034", "T-010", "BM202", "Organisational Behaviour", 40, "Level 5", "Year", EVANS, [
    cw(S2.cw, 100, "Essay"),
  ]),
  mod("MOD-1035", "T-010", "BM203", "Business Analytics", 40, "Level 5", "Year", BELLO, [
    cw(S2.cw),
    ex(S2.ex),
  ]),
  mod("MOD-1036", "T-010", "BM301", "Business Dissertation", 40, "Level 6", "Year", EVANS, [
    { id: "c1", name: "Dissertation", type: "Dissertation", weight: 100, due: "2027-04-30" },
  ]),
  mod("MOD-1037", "T-010", "BM302", "Global Business", 40, "Level 6", "Year", EVANS, [
    cw(S2.cw),
    ex(S2.ex),
  ]),
  mod("MOD-1038", "T-010", "BM303", "Entrepreneurship", 40, "Level 6", "Year", EVANS, [
    cw(S2.cw, 100, "Venture pitch"),
  ]),
  // ── Harbourside — Bachelor of Information Technology (credit points) ──
  mod("MOD-1101", "T-011", "BIT101", "Programming Principles", 20, "Year 1", "S1", PATEL, [
    cw("2026-04-10"),
    ex("2026-06-12"),
  ]),
  mod("MOD-1102", "T-011", "BIT102", "Networking Fundamentals", 20, "Year 1", "S1", SULLIVAN, [
    cw("2026-04-17", 40),
    ex("2026-06-15", 60),
  ]),
  mod("MOD-1103", "T-011", "BIT103", "Information Systems", 20, "Year 1", "S2", PATEL, [
    cw("2026-09-18", 100, "Systems analysis report"),
  ]),
  mod("MOD-1104", "T-011", "BIT104", "Web Design", 20, "Year 1", "S2", SULLIVAN, [
    cw("2026-09-25", 100, "Responsive site"),
  ]),
  mod(
    "MOD-1105",
    "T-011",
    "BIT201",
    "Database Systems",
    20,
    "Year 2",
    "S1",
    PATEL,
    [cw("2026-04-24"), ex("2026-06-16")],
    ["BIT101"],
  ),
  mod(
    "MOD-1106",
    "T-011",
    "BIT202",
    "Software Development",
    20,
    "Year 2",
    "S1",
    PATEL,
    [cw("2026-05-08", 60, "Team project"), ex("2026-06-18", 40)],
    ["BIT101"],
  ),
  mod(
    "MOD-1107",
    "T-011",
    "BIT203",
    "Cloud Infrastructure",
    20,
    "Year 2",
    "S2",
    SULLIVAN,
    [cw("2026-09-11", 50, "AWS lab portfolio"), ex("2026-11-06")],
    ["BIT102"],
    30,
  ),
  mod(
    "MOD-1108",
    "T-011",
    "BIT204",
    "Cyber Security",
    20,
    "Year 2",
    "S2",
    SULLIVAN,
    [cw("2026-09-25", 50, "Pen-test report"), ex("2026-11-09")],
    ["BIT102"],
    30,
  ),
  mod(
    "MOD-1109",
    "T-011",
    "BIT205",
    "UX Design",
    20,
    "Year 2",
    "S2",
    PATEL,
    [cw("2026-10-02", 100, "Prototype & usability test")],
    [],
    30,
  ),
  mod(
    "MOD-1110",
    "T-011",
    "BIT301",
    "Capstone Project",
    40,
    "Year 3",
    "Year",
    PATEL,
    [{ id: "c1", name: "Industry project", type: "Dissertation", weight: 100, due: "2026-11-06" }],
    ["BIT202"],
  ),
  mod("MOD-1111", "T-011", "BIT302", "IT Project Management", 20, "Year 3", "S1", SULLIVAN, [
    cw("2026-05-01"),
    ex("2026-06-19"),
  ]),
  mod(
    "MOD-1112",
    "T-011",
    "BIT303",
    "Data Analytics",
    20,
    "Year 3",
    "S2",
    PATEL,
    [cw("2026-09-18", 100, "Analytics case study")],
    ["BIT201"],
  ),
];

export const programmes: Programme[] = [
  {
    id: "PRG-1001",
    tenantId: "T-010",
    code: "G400",
    name: "Computer Science",
    award: "BSc (Hons)",
    level: "UG",
    department: "School of Computing",
    durationYears: 3,
    totalCredits: 360,
    intakes: ["Sep"],
    mode: "Full-time",
    calendarId: "CAL-1001",
    passMark: 40,
    stages: [
      {
        name: "Level 4 (Year 1)",
        credits: 120,
        coreModuleIds: ["MOD-1001", "MOD-1002", "MOD-1013", "MOD-1014", "MOD-1015", "MOD-1016"],
        optionalModuleIds: [],
        optionalCreditsRequired: 0,
      },
      {
        name: "Level 5 (Year 2)",
        credits: 120,
        coreModuleIds: ["MOD-1003", "MOD-1004", "MOD-1005"],
        optionalModuleIds: ["MOD-1006", "MOD-1007", "MOD-1008", "MOD-1009", "MOD-1017"],
        optionalCreditsRequired: 60,
      },
      {
        name: "Level 6 (Year 3)",
        credits: 120,
        coreModuleIds: ["MOD-1018", "MOD-1019"],
        optionalModuleIds: ["MOD-1020", "MOD-1021", "MOD-1022", "MOD-1023"],
        optionalCreditsRequired: 60,
      },
    ],
  },
  {
    id: "PRG-1002",
    tenantId: "T-010",
    code: "I1D7",
    name: "Data Science",
    award: "MSc",
    level: "PGT",
    department: "School of Computing",
    durationYears: 1,
    totalCredits: 180,
    intakes: ["Sep", "Jan"],
    mode: "Full-time / Part-time",
    calendarId: "CAL-1001",
    passMark: 50,
    stages: [
      {
        name: "PGT (MSc)",
        credits: 180,
        coreModuleIds: ["MOD-1010", "MOD-1011", "MOD-1024", "MOD-1012"],
        optionalModuleIds: ["MOD-1025", "MOD-1026", "MOD-1027", "MOD-1028"],
        optionalCreditsRequired: 60,
      },
    ],
  },
  {
    id: "PRG-1003",
    tenantId: "T-010",
    code: "N200",
    name: "Business Management",
    award: "BSc (Hons)",
    level: "UG",
    department: "Northbridge Business School",
    durationYears: 3,
    totalCredits: 360,
    intakes: ["Sep", "Jan"],
    mode: "Full-time",
    calendarId: "CAL-1001",
    passMark: 40,
    stages: [
      {
        name: "Level 4 (Year 1)",
        credits: 120,
        coreModuleIds: ["MOD-1030", "MOD-1031", "MOD-1032"],
        optionalModuleIds: [],
        optionalCreditsRequired: 0,
      },
      {
        name: "Level 5 (Year 2)",
        credits: 120,
        coreModuleIds: ["MOD-1033", "MOD-1034"],
        optionalModuleIds: ["MOD-1035"],
        optionalCreditsRequired: 40,
      },
      {
        name: "Level 6 (Year 3)",
        credits: 120,
        coreModuleIds: ["MOD-1036"],
        optionalModuleIds: ["MOD-1037", "MOD-1038"],
        optionalCreditsRequired: 80,
      },
    ],
  },
  {
    id: "PRG-1101",
    tenantId: "T-011",
    code: "BIT-2024",
    name: "Information Technology",
    award: "Bachelor of",
    level: "UG",
    department: "Faculty of Technology",
    durationYears: 3,
    totalCredits: 240,
    intakes: ["Feb", "Jul"],
    mode: "Full-time / Part-time",
    calendarId: "CAL-1101",
    passMark: 50,
    stages: [
      {
        name: "Bachelor Year 1",
        credits: 80,
        coreModuleIds: ["MOD-1101", "MOD-1102", "MOD-1103", "MOD-1104"],
        optionalModuleIds: [],
        optionalCreditsRequired: 0,
      },
      {
        name: "Bachelor Year 2",
        credits: 80,
        coreModuleIds: ["MOD-1105", "MOD-1106"],
        optionalModuleIds: ["MOD-1107", "MOD-1108", "MOD-1109"],
        optionalCreditsRequired: 40,
      },
      {
        name: "Bachelor Year 3",
        credits: 80,
        coreModuleIds: ["MOD-1110", "MOD-1111"],
        optionalModuleIds: ["MOD-1112"],
        optionalCreditsRequired: 20,
      },
    ],
  },
];

/* ── Registrations ── */

let regN = 1000;
const reg = (
  tenantId: string,
  studentId: string,
  moduleId: string,
  academicYear: string,
  kind: "Core" | "Optional",
  status: ModuleRegistration["status"] = "Registered",
  at = "2026-09-15T10:00:00Z",
  note?: string,
): ModuleRegistration => ({
  id: `REG-${++regN}`,
  tenantId,
  studentId,
  moduleId,
  academicYear,
  kind,
  status,
  at,
  note,
});

const CS25 = ["S-4001", "S-4002", "S-4003", "S-4004", "S-4005", "S-4010"];
const Y = "2026/27";

export const moduleRegistrations: ModuleRegistration[] = [
  ...CS25.flatMap((s) =>
    ["MOD-1003", "MOD-1004", "MOD-1005"].map((m) => reg("T-010", s, m, Y, "Core")),
  ),
  reg("T-010", "S-4001", "MOD-1006", Y, "Optional"),
  reg("T-010", "S-4001", "MOD-1007", Y, "Optional", "Pending approval", "2026-10-28T09:12:00Z"),
  reg("T-010", "S-4002", "MOD-1006", Y, "Optional"),
  reg("T-010", "S-4002", "MOD-1007", Y, "Optional"),
  reg("T-010", "S-4002", "MOD-1008", Y, "Optional"),
  reg("T-010", "S-4003", "MOD-1006", Y, "Optional"),
  reg("T-010", "S-4003", "MOD-1008", Y, "Optional"),
  reg("T-010", "S-4003", "MOD-1009", Y, "Optional", "Pending approval", "2026-10-30T16:40:00Z"),
  reg("T-010", "S-4004", "MOD-1007", Y, "Optional", "Pending approval", "2026-10-29T11:05:00Z"),
  reg("T-010", "S-4004", "MOD-1009", Y, "Optional"),
  reg("T-010", "S-4004", "MOD-1017", Y, "Optional"),
  reg("T-010", "S-4005", "MOD-1006", Y, "Optional"),
  reg("T-010", "S-4005", "MOD-1008", Y, "Optional"),
  reg("T-010", "S-4005", "MOD-1017", Y, "Optional"),
  reg("T-010", "S-4010", "MOD-1006", Y, "Optional"),
  reg(
    "T-010",
    "S-4010",
    "MOD-1007",
    Y,
    "Optional",
    "Rejected",
    "2026-09-20T10:00:00Z",
    "Prerequisite CS103 not yet passed (trailing credit)",
  ),
  reg("T-010", "S-4010", "MOD-1009", Y, "Optional", "Pending approval", "2026-10-31T13:20:00Z"),
  // Level 4 — Leo Ward (Sep 2026 intake)
  ...["MOD-1001", "MOD-1002", "MOD-1013", "MOD-1014", "MOD-1015", "MOD-1016"].map((m) =>
    reg("T-010", "S-4007", m, Y, "Core"),
  ),
  // MSc Data Science
  ...["S-4006", "S-4009"].flatMap((s) =>
    ["MOD-1010", "MOD-1011", "MOD-1024", "MOD-1012"].map((m) => reg("T-010", s, m, Y, "Core")),
  ),
  reg("T-010", "S-4006", "MOD-1025", Y, "Optional"),
  reg("T-010", "S-4006", "MOD-1026", Y, "Optional", "Pending approval", "2026-10-27T08:30:00Z"),
  reg("T-010", "S-4009", "MOD-1026", Y, "Optional"),
  reg("T-010", "S-4009", "MOD-1027", Y, "Optional"),
  reg("T-010", "S-4009", "MOD-1028", Y, "Optional"),
  // Harbourside — Bachelor of IT, Year 2 (2026)
  ...["S-5004", "S-5005"].flatMap((s) =>
    ["MOD-1105", "MOD-1106"].map((m) =>
      reg("T-011", s, m, "2026", "Core", "Registered", "2026-02-16T10:00:00Z"),
    ),
  ),
  reg("T-011", "S-5004", "MOD-1107", "2026", "Optional", "Registered", "2026-07-06T10:00:00Z"),
  reg("T-011", "S-5004", "MOD-1108", "2026", "Optional", "Registered", "2026-07-06T10:00:00Z"),
  reg("T-011", "S-5005", "MOD-1108", "2026", "Optional", "Registered", "2026-07-06T10:00:00Z"),
  reg(
    "T-011",
    "S-5005",
    "MOD-1109",
    "2026",
    "Optional",
    "Pending approval",
    "2026-10-21T10:00:00Z",
  ),
];

/* ── Marks ── deterministic per student / module / component ── */

function jitter(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 15) - 7;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
let mkN = 1000;
const moduleById = (id: string) => heModules.find((m) => m.id === id)!;

function marksFor(
  studentId: string,
  moduleIds: string[],
  base: number,
  year: string,
  status: MarkStatus,
  overrides: Record<string, number> = {},
  onlyComponent?: string,
): ModuleMark[] {
  const out: ModuleMark[] = [];
  for (const id of moduleIds) {
    const m = moduleById(id);
    for (const c of m.components) {
      if (onlyComponent && c.id !== onlyComponent) continue;
      const key = `${m.code}.${c.id}`;
      const mark = overrides[key] ?? clamp(base + jitter(studentId + key));
      out.push({
        id: `MK-${++mkN}`,
        tenantId: m.tenantId,
        studentId,
        moduleId: id,
        componentId: c.id,
        mark,
        attempt: 1,
        status,
        academicYear: year,
      });
    }
  }
  return out;
}

const L4 = ["MOD-1001", "MOD-1002", "MOD-1013", "MOD-1014", "MOD-1015", "MOD-1016"];
const ABILITY: Record<string, number> = {
  "S-4001": 67,
  "S-4002": 73,
  "S-4003": 58,
  "S-4004": 52,
  "S-4005": 63,
  "S-4010": 54,
};

const resit = (
  studentId: string,
  moduleId: string,
  componentId: string,
  mark: number | undefined,
  year: string,
  flag?: ModuleMark["flag"],
  status: MarkStatus = "Confirmed",
): ModuleMark => ({
  id: `MK-${++mkN}`,
  tenantId: moduleById(moduleId).tenantId,
  studentId,
  moduleId,
  componentId,
  mark,
  attempt: 2,
  status,
  flag,
  academicYear: year,
});

export const moduleMarks: ModuleMark[] = [
  // 2025/26 Level 4 — confirmed at the June 2026 board
  ...CS25.flatMap((s) =>
    marksFor(s, L4, ABILITY[s], "2025/26", "Confirmed", {
      // Chen Wei failed the CS102 exam first time and passed the August resit.
      ...(s === "S-4004" ? { "CS102.c2": 31, "CS102.c1": 44 } : {}),
      // Ananya Rao failed CS103 (20 credits) — trailing into Year 2.
      ...(s === "S-4010" ? { "CS103.c1": 38, "CS103.c2": 33 } : {}),
    }),
  ),
  resit("S-4004", "MOD-1002", "c2", 52, "2025/26"),
  // Isabelle Fox (2024 cohort): L4 + L5 confirmed, then interrupted
  ...marksFor("S-4008", L4, 66, "2024/25", "Confirmed"),
  ...marksFor(
    "S-4008",
    ["MOD-1003", "MOD-1004", "MOD-1005", "MOD-1006", "MOD-1007", "MOD-1009"],
    64,
    "2025/26",
    "Confirmed",
  ),
  // 2026/27 in-year — provisional, awaiting moderation
  ...["S-4001", "S-4002", "S-4003", "S-4005", "S-4010"].flatMap((s) =>
    marksFor(s, ["MOD-1003"], ABILITY[s] + 2, Y, "Provisional", {}, "c1"),
  ),
  ...["S-4001", "S-4002", "S-4005"].flatMap((s) =>
    marksFor(s, ["MOD-1006"], ABILITY[s] + 4, Y, "Provisional", {}, "c1"),
  ),
  ...marksFor("S-4007", ["MOD-1001"], 64, Y, "Provisional", {}, "c1"),
  ...marksFor("S-4009", ["MOD-1010"], 71, Y, "Provisional", {}, "c1"),
  // Harbourside — BIT Year 1 (2025) confirmed; Year 2 S1 (2026) confirmed; S2 coursework provisional
  ...marksFor("S-5004", ["MOD-1101", "MOD-1102", "MOD-1103", "MOD-1104"], 71, "2025", "Confirmed"),
  ...marksFor("S-5005", ["MOD-1101", "MOD-1102", "MOD-1103", "MOD-1104"], 78, "2025", "Confirmed"),
  ...marksFor("S-5004", ["MOD-1105", "MOD-1106"], 69, "2026", "Confirmed"),
  ...marksFor("S-5005", ["MOD-1105", "MOD-1106"], 81, "2026", "Confirmed"),
  ...marksFor("S-5004", ["MOD-1107", "MOD-1108"], 66, "2026", "Moderated", {}, "c1"),
  ...marksFor("S-5005", ["MOD-1108"], 77, "2026", "Provisional", {}, "c1"),
];

/* ── Extenuating circumstances ── */

export const ecClaims: EcClaim[] = [
  {
    id: "EC-1001",
    tenantId: "T-010",
    studentId: "S-4004",
    moduleId: "MOD-1003",
    componentId: "c1",
    category: "Illness",
    statement:
      "Admitted to hospital with appendicitis 19–24 October; unable to complete the algorithms coursework.",
    evidence: "Hospital discharge letter (PDF)",
    submittedAt: "2026-10-26T09:30:00Z",
    status: "Submitted",
  },
  {
    id: "EC-1002",
    tenantId: "T-010",
    studentId: "S-4003",
    moduleId: "MOD-1006",
    componentId: "c1",
    category: "Personal / family",
    statement: "Caring responsibilities for a parent after surgery during submission week.",
    evidence: "Letter from GP (PDF)",
    submittedAt: "2026-10-24T14:10:00Z",
    status: "Approved",
    outcome: "Extension (7 days)",
  },
  {
    id: "EC-1003",
    tenantId: "T-010",
    studentId: "S-4006",
    moduleId: "MOD-1010",
    componentId: "c1",
    category: "Bereavement",
    statement: "Death of a grandparent; travelled home for the funeral.",
    evidence: "Awaiting death certificate",
    submittedAt: "2026-10-29T08:00:00Z",
    status: "More evidence needed",
  },
  {
    id: "EC-1004",
    tenantId: "T-011",
    studentId: "S-5005",
    moduleId: "MOD-1108",
    componentId: "c2",
    category: "Illness",
    statement: "Influenza during the exam period — medical certificate covers 6–10 November.",
    evidence: "Medical certificate (PDF)",
    submittedAt: "2026-10-31T10:00:00Z",
    status: "Submitted",
  },
];

/* ── Exam-board decisions ── computed from the seeded marks so averages agree */

function decide(
  id: string,
  studentId: string,
  programmeId: string,
  stageIdx: number,
  boardDate: string,
  ratified: boolean,
  marksUpTo: ModuleMark[] = moduleMarks,
  outcome?: BoardOutcome,
): BoardDecision {
  const p = programmes.find((x) => x.id === programmeId)!;
  const st = p.stages[stageIdx];
  const sum = stageSummary(p, st, heModules, moduleRegistrations, marksUpTo, studentId);
  return {
    id,
    tenantId: p.tenantId,
    studentId,
    programmeId,
    stage: st.name,
    boardDate,
    average: sum.average,
    creditsPassed: sum.creditsPassed,
    creditsAttempted: sum.creditsAttempted,
    outcome: outcome ?? suggestOutcome(sum, stageIdx === p.stages.length - 1),
    ratified,
  };
}

// Marks as they stood at the June board (before Chen Wei's August resit).
const juneMarks = moduleMarks.filter((m) => m.attempt === 1);

export const boardDecisions: BoardDecision[] = [
  decide("BD-1001", "S-4001", "PRG-1001", 0, "2026-06-24", true),
  decide("BD-1002", "S-4002", "PRG-1001", 0, "2026-06-24", true),
  decide("BD-1003", "S-4003", "PRG-1001", 0, "2026-06-24", true),
  decide("BD-1004", "S-4005", "PRG-1001", 0, "2026-06-24", true),
  // Board chose a resit over trailing credit: CS102 is a prerequisite for Level 5.
  decide("BD-1005", "S-4004", "PRG-1001", 0, "2026-06-24", true, juneMarks, "Resit"),
  // Resit & progression board (Sept) — awaiting Academic Board ratification
  decide("BD-1006", "S-4004", "PRG-1001", 0, "2026-09-09", false),
  decide("BD-1007", "S-4010", "PRG-1001", 0, "2026-09-09", false),
  decide("BD-1008", "S-4008", "PRG-1001", 0, "2025-06-25", true),
  decide("BD-1009", "S-4008", "PRG-1001", 1, "2026-06-24", true),
  decide("BD-1010", "S-5004", "PRG-1101", 0, "2025-12-03", true),
  decide("BD-1011", "S-5005", "PRG-1101", 0, "2025-12-03", true),
];

/** Next scheduled boards (demo). */
export const NEXT_BOARDS: Record<string, { date: string; name: string }> = {
  "T-010": { date: "2027-02-03", name: "Semester 1 Board of Examiners" },
  "T-011": { date: "2026-11-25", name: "End-of-year Assessment Board" },
};

/* ── College add-on ── (unit codes are illustrative) ── */

const U = (code: string, title: string, hours: number, core = true): QualUnit => ({
  code,
  title,
  hours,
  core,
});
const RTO = "Nationally recognised training (AQF) — RTO 91234";

export const qualifications: Qualification[] = [
  {
    id: "QUA-1101",
    tenantId: "T-011",
    code: "ICT50220",
    title: "Diploma of Information Technology",
    awardingBody: RTO,
    level: "AQF 5",
    fundingStream: "Fee for service / international",
    electivesRequired: 2,
    units: [
      U("BSBCRT512", "Originate and develop concepts", 40),
      U("BSBXCS402", "Promote workplace cyber security awareness and best practices", 30),
      U("BSBXTW401", "Lead and facilitate a team", 40),
      U("ICTICT517", "Match ICT needs with the strategic direction of the organisation", 50),
      U("ICTICT532", "Apply IP, ethics and privacy policies in ICT environments", 40),
      U("ICTSAS527", "Manage client problems", 40),
      U("ICTPRG535", "Build advanced user interfaces", 60, false),
      U("ICTPRG547", "Apply advanced programming skills in another language", 60, false),
      U("ICTCLD505", "Implement cloud infrastructure with code", 50, false),
      U("ICTDBS506", "Design databases", 50, false),
    ],
  },
  {
    id: "QUA-1102",
    tenantId: "T-011",
    code: "UEE30820",
    title: "Certificate III in Electrotechnology Electrician",
    awardingBody: RTO,
    level: "AQF 3",
    fundingStream: "Smart and Skilled (NSW) — apprenticeship",
    electivesRequired: 1,
    units: [
      U(
        "UEECD0007",
        "Apply work health and safety regulations, codes and practices in the workplace",
        20,
      ),
      U("UEECD0019", "Fabricate, assemble and dismantle utilities industry components", 40),
      U("UEECD0020", "Fix and secure electrotechnology equipment", 40),
      U("UEECD0046", "Solve problems in single path circuits", 60),
      U("UEECD0051", "Use drawings, diagrams, schedules, standards, codes and specifications", 40),
      U("UEEEL0019", "Isolate, test and troubleshoot low voltage electrical circuits", 60),
      U("UEERE0001", "Apply environmentally and sustainable procedures in the energy sector", 20),
      U(
        "UEEEL0003",
        "Arrange circuits, control and protection for electrical installations",
        60,
        false,
      ),
      U("UEEEL0008", "Evaluate and modify low voltage heating equipment", 40, false),
    ],
  },
  {
    id: "QUA-1103",
    tenantId: "T-011",
    code: "CHC43015",
    title: "Certificate IV in Ageing Support",
    awardingBody: RTO,
    level: "AQF 4",
    fundingStream: "Fee-free TAFE / Smart and Skilled",
    electivesRequired: 1,
    units: [
      U("CHCAGE001", "Facilitate the empowerment of older people", 50),
      U("CHCCCS023", "Support independence and well-being", 40),
      U("CHCLEG001", "Work legally and ethically", 40),
      U("HLTWHS002", "Follow safe work practices for direct client care", 25),
      U("CHCDIV001", "Work with diverse people", 40),
      U("CHCPAL001", "Deliver care services using a palliative approach", 40, false),
      U("CHCAGE005", "Provide support to people living with dementia", 50, false),
    ],
  },
  {
    id: "QUA-1104",
    tenantId: "T-011",
    code: "HLT54121",
    title: "Diploma of Nursing",
    awardingBody: RTO,
    level: "AQF 5",
    fundingStream: "VET Student Loan",
    electivesRequired: 1,
    units: [
      U("HLTENN035", "Practise nursing within the Australian health care system", 50),
      U("HLTENN036", "Apply communication skills in nursing practice", 40),
      U("HLTENN037", "Perform clinical assessment and contribute to planning nursing care", 60),
      U("HLTENN038", "Implement, monitor and evaluate nursing care", 60),
      U("HLTENN039", "Apply principles of wound management in the clinical environment", 40),
      U("HLTENN040", "Administer and monitor medicines and intravenous therapy", 80),
      U(
        "HLTINF006",
        "Apply basic principles and practices of infection prevention and control",
        25,
      ),
      U("HLTENN045", "Implement and monitor care of the older person", 40, false),
      U("HLTENN047", "Apply principles of mental health nursing", 40, false),
    ],
  },
  {
    id: "QUA-1105",
    tenantId: "T-011",
    code: "CPC30220",
    title: "Certificate III in Carpentry",
    awardingBody: RTO,
    level: "AQF 3",
    fundingStream: "Smart and Skilled (NSW) — apprenticeship",
    electivesRequired: 1,
    units: [
      U(
        "CPCCWHS2001",
        "Apply WHS requirements, policies and procedures in the construction industry",
        20,
      ),
      U("CPCCCA2002", "Use carpentry tools and equipment", 40),
      U("CPCCCA3002", "Carry out setting out", 40),
      U("CPCCCA3003", "Install flooring systems", 40),
      U("CPCCCA3004", "Construct and erect wall frames", 60),
      U("CPCCCA3005", "Construct ceiling frames", 40),
      U("CPCCCA3006", "Erect roof trusses", 40),
      U("CPCCCA3016", "Construct, assemble and install timber external stairs", 40, false),
      U("CPCCCA3017", "Install exterior cladding", 40, false),
    ],
  },
];

let uaN = 1000;
function achievements(
  studentId: string,
  qualificationId: string,
  assessor: string,
  outcomes: Record<string, UnitOutcome>,
): UnitAchievement[] {
  return Object.entries(outcomes).map(([unitCode, outcome]) => ({
    id: `UA-${++uaN}`,
    tenantId: "T-011",
    studentId,
    qualificationId,
    unitCode,
    outcome,
    assessor,
    date: outcome === "In progress" ? undefined : "2026-09-30",
  }));
}

export const unitAchievements: UnitAchievement[] = [
  ...achievements("S-5001", "QUA-1101", SULLIVAN, {
    BSBCRT512: "Competent",
    BSBXCS402: "Competent",
    BSBXTW401: "In progress",
    ICTICT517: "Competent",
    ICTICT532: "Not yet competent",
    ICTSAS527: "In progress",
    ICTPRG535: "Competent",
    ICTCLD505: "In progress",
  }),
  ...achievements("S-5008", "QUA-1101", SULLIVAN, {
    BSBCRT512: "Competent",
    BSBXCS402: "Credit transfer",
    ICTICT517: "In progress",
    ICTDBS506: "Competent",
  }),
  ...achievements("S-5002", "QUA-1102", "Mr. Darren Walsh", {
    UEECD0007: "Competent",
    UEECD0019: "Competent",
    UEECD0020: "Competent",
    UEECD0046: "In progress",
    UEECD0051: "Competent",
    UEERE0001: "Competent",
  }),
  ...achievements("S-5003", "QUA-1103", "Ms. Jess Kowalski", {
    CHCAGE001: "Competent",
    CHCCCS023: "Competent",
    CHCLEG001: "Competent",
    HLTWHS002: "Competent",
    CHCDIV001: "Competent",
    CHCAGE005: "Competent",
  }),
  ...achievements("S-5006", "QUA-1104", "Ms. Jess Kowalski", {
    HLTENN035: "Competent",
    HLTENN036: "Competent",
    HLTENN037: "Competent",
    HLTENN038: "In progress",
    HLTINF006: "Competent",
    HLTENN039: "In progress",
  }),
  ...achievements("S-5007", "QUA-1105", "Mr. Ben Archer", {
    CPCCWHS2001: "Competent",
    CPCCCA2002: "Competent",
    CPCCCA3002: "In progress",
  }),
];

export const apprenticeships: Apprenticeship[] = [
  {
    id: "APP-1001",
    tenantId: "T-011",
    studentId: "S-5002",
    employer: "Coastline Electrical Pty Ltd",
    standard: "UEE30820 Certificate III in Electrotechnology Electrician",
    startDate: "2025-02-03",
    plannedEnd: "2028-12-15",
    offJobHoursPlanned: 960,
    offJobHoursLogged: 412,
    status: "On programme",
    reviews: [
      {
        date: "2026-05-12",
        by: "Mr. Darren Walsh",
        note: "Workplace visit — conduit installation signed off by supervisor.",
      },
      {
        date: "2026-09-08",
        by: "Mr. Darren Walsh",
        note: "Logbook up to date; three units signed off. Capstone booking discussed for 2028.",
      },
    ],
  },
  {
    id: "APP-1002",
    tenantId: "T-011",
    studentId: "S-5007",
    employer: "Harbour Build Co",
    standard: "CPC30220 Certificate III in Carpentry",
    startDate: "2026-02-09",
    plannedEnd: "2029-12-14",
    offJobHoursPlanned: 900,
    offJobHoursLogged: 118,
    status: "On programme",
    reviews: [
      {
        date: "2026-08-19",
        by: "Mr. Ben Archer",
        note: "Settling in well on site; needs to catch up on setting-out theory block.",
      },
    ],
  },
];

export const placements: Placement[] = [
  {
    id: "PLC-1001",
    tenantId: "T-011",
    studentId: "S-5003",
    host: "Bayview Aged Care",
    supervisor: "Margaret Doyle (RN, Care Manager)",
    startDate: "2026-09-14",
    endDate: "2026-11-27",
    hoursRequired: 120,
    hoursLogged: 96,
    status: "In progress",
    riskAssessed: true,
  },
  {
    id: "PLC-1002",
    tenantId: "T-011",
    studentId: "S-5006",
    host: "Northshore Community Hospital",
    supervisor: "Daniel Reeves (Clinical Facilitator)",
    startDate: "2026-10-12",
    endDate: "2027-02-26",
    hoursRequired: 400,
    hoursLogged: 64,
    status: "In progress",
    riskAssessed: true,
  },
  {
    id: "PLC-1003",
    tenantId: "T-011",
    studentId: "S-5001",
    host: "Cloudbridge IT Services",
    supervisor: "Aroha Ngata (Service Desk Lead)",
    startDate: "2027-01-18",
    endDate: "2027-03-12",
    hoursRequired: 80,
    hoursLogged: 0,
    status: "Arranged",
    riskAssessed: false,
  },
];

/* ── College helpers ── */

export interface QualProgress {
  coreTotal: number;
  coreDone: number;
  electivesRequired: number;
  electivesDone: number;
  pct: number;
  eligible: boolean;
}

const DONE: UnitOutcome[] = ["Competent", "Pass", "Merit", "Distinction", "Credit transfer"];
export const isUnitDone = (o?: UnitOutcome) => !!o && DONE.includes(o);

export function qualProgress(
  q: Qualification,
  rows: UnitAchievement[],
  studentId: string,
): QualProgress {
  const mine = rows.filter((r) => r.studentId === studentId && r.qualificationId === q.id);
  const done = (code: string) => isUnitDone(mine.find((r) => r.unitCode === code)?.outcome);
  const core = q.units.filter((u) => u.core);
  const coreDone = core.filter((u) => done(u.code)).length;
  const electivesRequired = q.electivesRequired ?? 0;
  const electivesDone = Math.min(
    electivesRequired,
    q.units.filter((u) => !u.core && done(u.code)).length,
  );
  const needed = core.length + electivesRequired;
  return {
    coreTotal: core.length,
    coreDone,
    electivesRequired,
    electivesDone,
    pct: needed ? Math.round(((coreDone + electivesDone) / needed) * 100) : 0,
    eligible: coreDone === core.length && electivesDone >= electivesRequired,
  };
}

/* ── Module runs per intake ──────────────────────────────────────────────────
 * A module's teaching period (S1 / S2 / Year) is RELATIVE: it maps onto the
 * calendar of each intake that admits to a programme containing the module.
 * So CS-style "Semester 1" is Sep–Jan for the September cohort and Jan–May
 * (Semester A) for the January cohort. Census dates (AU) sit ~20% into the
 * run. Block-taught modules would need explicit run dates (production). */

export interface ModuleRun {
  intakeName: string;
  period: string;
  start: string;
  end: string;
  census?: string;
}

type CalendarLike = {
  id: string;
  terms: { name: string; start: string; end: string; kind: string }[];
};

function shiftYears(iso: string, years: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** The module's teaching period on a calendar, rolled forward to on/after `from`. */
export function periodOnCalendar(
  semester: HeModule["semester"],
  cal: CalendarLike | undefined,
  from?: string,
): { period: string; start: string; end: string } | null {
  if (!cal) return null;
  const teaching = cal.terms.filter((t) => t.kind === "teaching");
  if (!teaching.length) return null;
  const pick =
    semester === "Year"
      ? { name: "Full year", start: teaching[0].start, end: teaching[teaching.length - 1].end }
      : semester === "S2"
        ? (teaching[1] ?? teaching[0])
        : teaching[0];
  let years = 0;
  while (from && shiftYears(pick.end, years) < from && years < 5) years++;
  return {
    period: pick.name,
    start: shiftYears(pick.start, years),
    end: shiftYears(pick.end, years),
  };
}

export function moduleRuns(
  m: HeModule,
  programmes: Programme[],
  intakes: { name: string; tenantId: string; scope: string[]; calendarId: string; start: string }[],
  calendars: CalendarLike[],
  withCensus: boolean,
): ModuleRun[] {
  const progIds = programmes
    .filter(
      (p) =>
        p.tenantId === m.tenantId &&
        p.stages.some((s) => s.coreModuleIds.includes(m.id) || s.optionalModuleIds.includes(m.id)),
    )
    .map((p) => p.id);
  return intakes
    .filter(
      (i) =>
        i.tenantId === m.tenantId &&
        (i.scope.length === 0 || i.scope.some((s) => progIds.includes(s))),
    )
    .map((i): ModuleRun | null => {
      const p = periodOnCalendar(
        m.semester,
        calendars.find((c) => c.id === i.calendarId),
        i.start,
      );
      if (!p) return null;
      const span = new Date(p.end).getTime() - new Date(p.start).getTime();
      const run: ModuleRun = { intakeName: i.name, ...p };
      if (withCensus)
        run.census = new Date(new Date(p.start).getTime() + span * 0.2).toISOString().slice(0, 10);
      return run;
    })
    .filter((r): r is ModuleRun => !!r)
    .sort((a, b) => a.start.localeCompare(b.start));
}
