/* ── Coursework & progress for pack tenants: homework / coursework / projects
 * per teaching group, each learner's submission, and termly progress reports
 * graded the way the AGE BAND and curriculum grade (descriptors in primary,
 * 9–1 / A*–U predictions at IGCSE / A Level, CBSE marks, competency for VET).
 * University module marks stay in heData moduleMarks (results release).
 *
 * Seeds are generated deterministically from the class / module /
 * qualification seeds via buildTeachingGroups — no store access here. */
import { DEMO_TODAY, learners as seedLearners, type Learner } from "../foundationData";
import {
  heModules as seedModules,
  moduleRegistrations as seedRegs,
  qualifications as seedQuals,
  unitAchievements as seedUnits,
} from "../heData";
import { tutorGroups as seedTutorGroups, curricula as seedCurricula } from "../schoolData";
import { subjectClasses as seedClasses } from "./classes";
import { ageBandFor, buildTeachingGroups, type AgeBand, type TeachingGroup } from "./learning";

export interface Coursework {
  id: string;
  tenantId: string;
  groupId: string; // TeachingGroup.id
  title: string;
  kind: "Homework" | "Reading" | "Project" | "Coursework" | "Quiz" | "Practical" | "Portfolio";
  set: string; // ISO date
  due: string; // ISO date
  maxScore?: number; // omitted = feedback only (e.g. primary reading)
  instructions?: string;
  setBy: string;
  /** Practice work that doesn't count towards a module mark (university). */
  formative?: boolean;
  /** Unit of competency the task evidences (college). */
  unitCode?: string;
}

export interface Submission {
  id: string;
  tenantId: string;
  courseworkId: string;
  studentId: string;
  status: "Not submitted" | "Submitted" | "Late" | "Marked";
  submittedAt?: string;
  score?: number;
  feedback?: string;
  markedBy?: string;
  /** Attached file name. */
  fileName?: string;
  /** Who handed it in when not the learner (a parent on a family account). */
  submittedBy?: string;
  /** Descriptor instead of a score (primary) or Satisfactory / Not yet (college). */
  descriptor?: string;
  markedAt?: string;
  /** Handed in after the due date (kept once marked). */
  late?: boolean;
}

/** Termly report line per learner per teaching group. */
export interface ProgressReport {
  id: string;
  tenantId: string;
  studentId: string;
  groupId: string; // TeachingGroup.id, or the tutor group id for early years
  term: string; // "Term 1 2026–27"
  /** How `value` reads: a descriptor, a grade, a percentage, or competency. */
  scheme: "descriptor" | "grade" | "percent" | "competency";
  value: string; // "Expected", "7", "A", "86%", "Competent"
  target?: string; // target / predicted
  effort?: "Excellent" | "Good" | "Needs improvement";
  comment?: string;
  teacher: string;
  /** Early-years learning area (EYFS / ECD) — early years report per area. */
  area?: string;
  /** Scale shown with the value, e.g. "IGCSE 9–1", "CBSE marks". */
  scale?: string;
  /** Component breakdown, e.g. "PT1 17/20 · Half-yearly 66/80 · A2". */
  detail?: string;
}

/* ── Scales & descriptors (pure) ─────────────────────────────────────────── */

export const REPORT_TERM = "Term 1 2026–27";
export const EARLY_DESCRIPTORS = ["Emerging", "Expected", "Exceeding"];
export const PRIMARY_DESCRIPTORS = ["Working towards", "Expected", "Greater depth"];
export const TASK_OUTCOMES = ["Satisfactory", "Not yet satisfactory"];
export const EFFORTS: NonNullable<ProgressReport["effort"]>[] = [
  "Excellent",
  "Good",
  "Needs improvement",
];

export const EYFS_AREAS = [
  "Communication and language",
  "Personal, social and emotional development",
  "Physical development",
  "Literacy",
  "Mathematics",
  "Understanding the world",
  "Expressive arts and design",
];
/** Sri Lankan pre-school early childhood development (ECD) areas. */
export const ECD_AREAS = [
  "Language and communication",
  "Early numeracy and thinking",
  "Physical and motor development",
  "Social and emotional development",
  "Creative expression",
  "Knowledge of the environment",
];

const isEyfs = (level: string) => /^(FS1|FS2|Reception)/i.test(level);
export const earlyAreasFor = (level: string) => (isEyfs(level) ? EYFS_AREAS : ECD_AREAS);

export interface ReportScale {
  scheme: ProgressReport["scheme"];
  label: string;
  /** Allowed values (empty = free entry, e.g. marks). */
  options: string[];
  hasTarget: boolean;
}

const NINE_ONE = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "U"];
const A_STAR_G = ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];
const A_STAR_E = ["A*", "A", "B", "C", "D", "E", "U"];
const IB_1_7 = ["7", "6", "5", "4", "3", "2", "1"];
const A_E = ["A", "B", "C", "D", "E"];

/** How a group's termly progress is reported, from its band and curriculum. */
export function reportScale(
  g: Pick<TeachingGroup, "band" | "level" | "subject">,
  curriculum?: { framework?: string; gradeScale?: string[] },
): ReportScale {
  switch (g.band) {
    case "early":
      return {
        scheme: "descriptor",
        label: isEyfs(g.level) ? "EYFS early learning goals" : "Early childhood development",
        options: EARLY_DESCRIPTORS,
        hasTarget: false,
      };
    case "primary":
      return {
        scheme: "descriptor",
        label: "Termly descriptors",
        options: PRIMARY_DESCRIPTORS,
        hasTarget: false,
      };
    case "vocational":
      return {
        scheme: "competency",
        label: "Competency",
        options: ["Competent", "Not yet competent", "In progress"],
        hasTarget: false,
      };
    case "higher-ed":
      return { scheme: "percent", label: "Module mark", options: [], hasTarget: false };
    default:
      break;
  }
  if (curriculum?.framework === "CBSE" || /^Grade/i.test(g.level))
    return {
      scheme: "percent",
      label: "CBSE marks (PT /20 · Half-yearly /80)",
      options: [],
      hasTarget: false,
    };
  if (/IB DP/i.test(g.level)) {
    const core = /Theory of Knowledge|Extended Essay/i.test(g.subject);
    return {
      scheme: "grade",
      label: core ? "IB core A–E" : "IB 1–7",
      options: core ? A_E : IB_1_7,
      hasTarget: true,
    };
  }
  if (g.band === "sixth-form")
    return {
      scheme: "grade",
      label: /International/i.test(g.subject) ? "International A Level A*–E" : "A Level A*–E",
      options: A_STAR_E,
      hasTarget: true,
    };
  if (g.band === "upper-secondary") {
    const nineOne = !curriculum?.gradeScale || curriculum.gradeScale.includes("9");
    return nineOne
      ? { scheme: "grade", label: "IGCSE 9–1", options: NINE_ONE, hasTarget: true }
      : { scheme: "grade", label: "Cambridge IGCSE A*–G", options: A_STAR_G, hasTarget: true };
  }
  return { scheme: "percent", label: "Percentage", options: [], hasTarget: false };
}

/** CBSE 9-point grade from a percentage. */
export function cbseGrade(pct: number): string {
  if (pct > 90) return "A1";
  if (pct > 80) return "A2";
  if (pct > 70) return "B1";
  if (pct > 60) return "B2";
  if (pct > 50) return "C1";
  if (pct > 40) return "C2";
  if (pct >= 33) return "D";
  return "E";
}

/** How a piece of coursework is marked for this band. */
export function markingKind(band: AgeBand, cw: Pick<Coursework, "maxScore">) {
  if (band === "early" || band === "primary") return "descriptor" as const;
  if (band === "vocational") return "outcome" as const;
  return cw.maxScore ? ("score" as const) : ("feedback" as const);
}

export type CourseworkState = "Due" | "Overdue" | "Submitted" | "Late" | "Marked";

/** A learner's state on one piece of coursework. */
export function courseworkState(
  cw: Pick<Coursework, "due">,
  sub: Pick<Submission, "status"> | undefined,
  today = DEMO_TODAY,
): CourseworkState {
  if (sub?.status === "Marked") return "Marked";
  if (sub?.status === "Late") return "Late";
  if (sub?.status === "Submitted") return "Submitted";
  return cw.due < today ? "Overdue" : "Due";
}

/** Pseudo teaching groups for early-years forms (no subject classes). */
export function earlyYearsGroups(
  tutorGroups: { id: string; tenantId: string; name: string; yearGroup: string; tutor: string }[],
  learners: Learner[],
): TeachingGroup[] {
  return tutorGroups
    .filter((t) => ageBandFor(t.yearGroup) === "early")
    .map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      kind: "class" as const,
      code: t.name,
      title: `${t.name} learning journal`,
      subject: "Early years",
      level: t.yearGroup,
      band: "early" as const,
      teacher: t.tutor,
      studentIds: learners
        .filter((l) => l.tenantId === t.tenantId && l.group === t.name)
        .map((l) => l.id),
    }));
}

/* ── Seed generation (deterministic) ─────────────────────────────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const jitter = (s: string, spread = 0.08) => ((hash(s) % 1000) / 1000 - 0.5) * 2 * spread;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const ABILITY: Record<string, number> = {
  "S-3001": 0.9, // Zara — strong all-rounder
  "S-3002": 0.74, // Adam
  "S-3105": 0.72, // Sasindu
  "S-3106": 0.7,
  "S-4001": 0.68, // Arjun
};
const ability = (id: string) => ABILITY[id] ?? 0.55 + (hash(id) % 33) / 100;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Set / due slots across Term 1 (DEMO_TODAY = 2026-11-02). */
const SLOTS: { set: string; due: string }[] = [
  { set: "2026-09-21", due: "2026-10-02" }, // marked
  { set: "2026-10-05", due: "2026-10-16" }, // marked
  { set: "2026-10-19", due: "2026-10-29" }, // handed in, awaiting marking
  { set: "2026-10-26", due: "2026-11-06" }, // due this week
  { set: "2026-11-02", due: "2026-11-13" }, // just set
];

interface Tpl {
  title: string;
  kind: Coursework["kind"];
  max?: number;
  instructions: string;
  /** Fixed dates (e.g. IB IA deadlines) instead of the slot's. */
  set?: string;
  due?: string;
  unitCode?: string;
}

const t = (
  title: string,
  kind: Coursework["kind"],
  max: number | undefined,
  instructions: string,
  extra: Partial<Tpl> = {},
): Tpl => ({ title, kind, max, instructions, ...extra });

/** Templates by subject (regex on "subject + level") and band. First match wins. */
const SCHOOL_TEMPLATES: { band: AgeBand[]; match: RegExp; items: Tpl[] }[] = [
  // ── Primary (descriptors, no scores)
  {
    band: ["primary"],
    match: /English/i,
    items: [
      t(
        "Spellings — words ending -tion",
        "Homework",
        undefined,
        "Learn the 10 words on the sheet. Test on Friday.",
      ),
      t(
        "Reading log — three reads this week",
        "Reading",
        undefined,
        "Read with a grown-up three times. Write the title and one sentence about it.",
      ),
      t(
        "Write a postcard from the Stone Age",
        "Homework",
        undefined,
        "Use capital letters, full stops and two adjectives.",
      ),
      t(
        "Spellings — prefixes un- and dis-",
        "Homework",
        undefined,
        "Practise the words in your spelling book.",
      ),
      t(
        "Reading log — a book you chose",
        "Reading",
        undefined,
        "Draw your favourite part and say why you liked it.",
      ),
    ],
  },
  {
    band: ["primary"],
    match: /Math/i,
    items: [
      t(
        "Times tables 3 & 4 practice",
        "Homework",
        undefined,
        "10 minutes a day on the times-tables sheet.",
      ),
      t(
        "Column addition with exchanging",
        "Homework",
        undefined,
        "Page 12, questions 1–8. Show your working.",
      ),
      t(
        "Measure it! Lengths at home",
        "Practical",
        undefined,
        "Measure five things at home in cm and order them.",
      ),
      t("Times tables 8 practice", "Homework", undefined, "Chant the 8s and fill in the grid."),
      t(
        "Money — making £1 in different ways",
        "Homework",
        undefined,
        "Find three ways to make £1 using coins.",
      ),
    ],
  },
  {
    band: ["primary"],
    match: /.*/,
    items: [
      t(
        "Topic homework — my family tree",
        "Homework",
        undefined,
        "Draw your family tree with a grown-up.",
      ),
      t("Reading log", "Reading", undefined, "Read three times this week."),
      t(
        "Show and tell — something from nature",
        "Homework",
        undefined,
        "Bring one thing from nature to talk about.",
      ),
    ],
  },
  // ── CBSE Grade 6–8 (marks)
  {
    band: ["lower-secondary"],
    match: /Science/i,
    items: [
      t(
        "Nutrition in plants — NCERT Ch 1 questions",
        "Homework",
        10,
        "Answer questions 1–8 in your notebook.",
      ),
      t("Periodic Test 1 — Science", "Quiz", 20, "Chapters 1–3. 40 minutes."),
      t("Food and nutrition worksheet (Ch 2)", "Homework", 10, "NCERT Chapter 2 questions 1–10."),
      t(
        "Acids, bases and salts — indicator activity",
        "Practical",
        10,
        "Record colour changes with turmeric and litmus.",
      ),
      t("Heat — conduction model", "Project", 20, "Build and label a simple conduction model."),
    ],
  },
  {
    band: ["lower-secondary"],
    match: /Math/i,
    items: [
      t("Integers — Exercise 1.3", "Homework", 10, "All questions. Show steps."),
      t(
        "Periodic Test 1 — Mathematics",
        "Quiz",
        20,
        "Integers, fractions and decimals. 40 minutes.",
      ),
      t("Fractions and decimals worksheet", "Homework", 10, "Questions 1–12 on the worksheet."),
      t(
        "Data handling — class survey",
        "Project",
        20,
        "Collect data from 20 classmates and draw a bar graph.",
      ),
      t("Simple equations — Exercise 4.2", "Homework", 10, "Questions 1–10."),
    ],
  },
  {
    band: ["lower-secondary"],
    match: /Arabic/i,
    items: [
      t(
        "Reading — قصة قصيرة (short story)",
        "Homework",
        10,
        "Read the story and answer the five questions.",
      ),
      t("Periodic Test 1 — Arabic", "Quiz", 20, "Reading, grammar and writing."),
      t("Writing — my family (80 words)", "Homework", 10, "Use five new words from the unit."),
      t("Vocabulary quiz — food and drink", "Quiz", 20, "20 words from Unit 3."),
    ],
  },
  // ── IGCSE Year 10–11
  {
    band: ["upper-secondary"],
    match: /Physics.*Year 10/i,
    items: [
      t(
        "Speed–time graphs worksheet",
        "Homework",
        20,
        "Questions 1–10. Show the gradient and area calculations.",
      ),
      t("Forces and motion — topic test", "Quiz", 50, "45 minutes, calculator allowed."),
      t(
        "Density practical write-up",
        "Practical",
        20,
        "Method, results table, calculation and evaluation.",
      ),
      t(
        "Energy stores and transfers — questions",
        "Homework",
        30,
        "Past-paper questions on the sheet.",
      ),
      t(
        "Hooke's law practical",
        "Practical",
        20,
        "Plot extension against force and find the spring constant.",
      ),
    ],
  },
  {
    band: ["upper-secondary"],
    match: /Physics/i,
    items: [
      t("Circuits — series and parallel worksheet", "Homework", 20, "Questions 1–12."),
      t("Electricity — topic test", "Quiz", 50, "45 minutes, calculator allowed."),
      t("Specific heat capacity practical", "Practical", 20, "Full write-up with uncertainty."),
      t("Waves — past-paper questions", "Homework", 40, "Paper 4 questions on the sheet."),
      t("Radioactivity — half-life homework", "Homework", 25, "Questions 1–8."),
    ],
  },
  {
    band: ["upper-secondary"],
    match: /Chemistry/i,
    items: [
      t("Balancing equations homework", "Homework", 20, "Balance all 20 equations."),
      t("Particles and states — topic test", "Quiz", 40, "40 minutes."),
      t(
        "Rates of reaction practical",
        "Practical",
        20,
        "Marble chips and acid — record and graph.",
      ),
      t("Moles calculations", "Homework", 30, "Questions 1–15. Show units."),
      t("Electrolysis — revision questions", "Homework", 25, "Past-paper set B."),
    ],
  },
  {
    band: ["upper-secondary"],
    match: /Math/i,
    items: [
      t("Simultaneous equations homework", "Homework", 30, "Exercise 6B, all questions."),
      t("Number — topic test", "Quiz", 50, "Non-calculator, 45 minutes."),
      t("Probability trees homework", "Homework", 20, "Exercise 9C."),
      t("Quadratics — past-paper questions", "Homework", 30, "Sheet 4."),
      t("Vectors — homework", "Homework", 20, "Exercise 12A."),
    ],
  },
  {
    band: ["upper-secondary"],
    match: /English/i,
    items: [
      t("Non-fiction reading comprehension", "Homework", 25, "Read the article and answer Q1–5."),
      t(
        "An Inspector Calls — dramatic irony essay",
        "Coursework",
        40,
        "600 words on Mr Birling's dramatic irony.",
      ),
      t("Descriptive writing — a busy market", "Coursework", 40, "450–600 words. Plan first."),
      t(
        "Poetry anthology — comparison plan",
        "Homework",
        20,
        "Plan a comparison of two poems on conflict.",
      ),
      t(
        "Speaking and listening — talk outline",
        "Homework",
        undefined,
        "Bullet-point outline for your three-minute talk.",
      ),
    ],
  },
  {
    band: ["upper-secondary"],
    match: /Arabic/i,
    items: [
      t("Reading comprehension — school life", "Homework", 20, "Answer in Arabic."),
      t("Writing — email to a friend", "Homework", 20, "100–150 words."),
      t("Vocabulary quiz — holidays", "Quiz", 20, "Unit 4 words."),
      t("Listening practice — track 7", "Homework", 15, "Answer the 15 questions."),
    ],
  },
  // ── Sixth form
  {
    band: ["sixth-form"],
    match: /IB.*Physics/i,
    items: [
      t("Nuclear physics problem set", "Homework", 30, "Questions 1–10 from the booklet."),
      t(
        "Internal assessment — draft",
        "Coursework",
        24,
        "Full draft of your IA. Feedback against the criteria.",
        {
          set: "2026-09-07",
          due: "2026-10-16",
        },
      ),
      t("Paper 2 practice — fields", "Quiz", 50, "Timed, 60 minutes."),
      t(
        "Internal assessment — final",
        "Coursework",
        24,
        "Final IA with the academic integrity declaration.",
        {
          set: "2026-10-19",
          due: "2026-12-04",
        },
      ),
    ],
  },
  {
    band: ["sixth-form"],
    match: /IB.*Math/i,
    items: [
      t("Complex numbers problem set", "Homework", 30, "Exercise 3F."),
      t("Mathematical exploration (IA) — draft", "Coursework", 20, "Full draft, 12–20 pages.", {
        set: "2026-09-07",
        due: "2026-10-16",
      }),
      t("Calculus — Paper 1 practice", "Quiz", 50, "Non-calculator, 60 minutes."),
      t("Mathematical exploration (IA) — final", "Coursework", 20, "Final exploration.", {
        set: "2026-10-19",
        due: "2026-12-11",
      }),
    ],
  },
  {
    band: ["sixth-form"],
    match: /Theory of Knowledge/i,
    items: [
      t(
        "Knowledge questions — reflection",
        "Homework",
        undefined,
        "One page on a knowledge question from class.",
      ),
      t("TOK exhibition — object commentary", "Coursework", 10, "Three objects, 950 words.", {
        set: "2026-09-07",
        due: "2026-10-16",
      }),
      t(
        "TOK essay — prescribed title plan",
        "Coursework",
        undefined,
        "Choose a title and plan your argument.",
      ),
      t("TOK essay — draft", "Coursework", 10, "1,600 words.", {
        set: "2026-10-26",
        due: "2026-12-04",
      }),
    ],
  },
  {
    band: ["sixth-form"],
    match: /Physics/i,
    items: [
      t("Mechanics problem set 1", "Homework", 40, "Booklet questions 1–12."),
      t(
        "Required practical — g by free fall",
        "Practical",
        30,
        "Write-up with uncertainty analysis.",
      ),
      t("Materials — Young modulus write-up", "Practical", 30, "Graph and gradient method."),
      t("Electricity problem set", "Homework", 40, "Booklet questions 13–24."),
    ],
  },
  {
    band: ["sixth-form"],
    match: /Chemistry.*Year 13/i,
    items: [
      t("Kinetics — rate equations problem set", "Homework", 40, "Questions 1–12."),
      t("Unit 4 — topic test", "Quiz", 60, "60 minutes."),
      t("Practical skills — iodine clock", "Practical", 30, "Write-up and rate graph."),
      t("Organic synthesis routes", "Homework", 40, "Plan three two-step syntheses."),
    ],
  },
  {
    band: ["sixth-form"],
    match: /Chemistry/i,
    items: [
      t("Atomic structure problem sheet", "Homework", 30, "Questions 1–10."),
      t("Unit 1 — topic test", "Quiz", 50, "50 minutes."),
      t("Titration practical write-up", "Practical", 30, "Results, mean titre and uncertainty."),
      t("Energetics problem sheet", "Homework", 30, "Hess cycles, questions 1–8."),
    ],
  },
  {
    band: ["sixth-form"],
    match: /Math/i,
    items: [
      t("Proof and algebra problem set", "Homework", 40, "Exercise 1D and 2B."),
      t("Statistics — sampling test", "Quiz", 50, "45 minutes."),
      t("Differentiation problem set", "Homework", 40, "Exercise 9A–9C."),
      t("Integration — homework", "Homework", 40, "Exercise 11B."),
    ],
  },
  // ── Fallback
  {
    band: ["lower-secondary", "upper-secondary", "sixth-form"],
    match: /.*/,
    items: [
      t("Homework — unit questions", "Homework", 20, "Answer the unit questions."),
      t("Topic test", "Quiz", 40, "40 minutes."),
      t("Research task", "Project", 20, "One page with sources."),
      t("Revision questions", "Homework", 20, "Sheet B."),
    ],
  },
];

/** University: formative lab sheets / problem sets (not the assessed components). */
const MODULE_TEMPLATES: Record<string, Tpl[]> = {
  "MOD-1003": [
    t(
      "Lab sheet 3 — heaps and priority queues",
      "Practical",
      10,
      "Implement a binary heap and test it.",
    ),
    t("Problem set 4 — graph traversal", "Homework", 20, "BFS / DFS proofs and traces."),
    t("Problem set 5 — shortest paths", "Homework", 20, "Dijkstra and Bellman–Ford questions."),
    t(
      "Lab sheet 6 — dynamic programming",
      "Practical",
      10,
      "Knapsack and edit distance in Python.",
    ),
  ],
  "MOD-1006": [
    t(
      "Lab 4 — REST API with Express",
      "Practical",
      10,
      "Build the CRUD endpoints in the starter repo.",
    ),
    t("Lab 5 — forms and validation", "Practical", 10, "Client and server validation."),
    t("Lab 7 — ARIA landmarks", "Practical", 10, "Fix the landmark issues in the sample page."),
  ],
  "MOD-1004": [
    t("Lab sheet — SQL joins", "Practical", 10, "Queries 1–12 on the university schema."),
    t("Normalisation problem set", "Homework", 20, "Take the three tables to 3NF."),
    t("Lab sheet — transactions", "Practical", 10, "Isolation levels experiment."),
  ],
  "MOD-1001": [
    t("Lab 6 — loops and lists", "Practical", 10, "Exercises 1–8 in the lab notebook."),
    t("Lab 7 — functions", "Practical", 10, "Exercises 1–6."),
    t("Problem set 3 — recursion", "Homework", 20, "Five recursive functions with tests."),
  ],
};

/** College: workplace tasks evidencing a unit (marked Satisfactory / Not yet). */
const QUAL_TASKS: Record<string, Tpl[]> = {
  "QUA-1101": [
    t(
      "Workplace task — cyber security briefing",
      "Portfolio",
      undefined,
      "Deliver a 10-minute briefing at your host workplace and upload the slides and supervisor sign-off.",
      { unitCode: "BSBXCS402" },
    ),
    t(
      "Client problem log",
      "Portfolio",
      undefined,
      "Log three client problems you resolved, with the outcome.",
      { unitCode: "ICTSAS527" },
    ),
    t(
      "IP and privacy policy review",
      "Project",
      undefined,
      "Review your host's privacy policy against the checklist.",
      { unitCode: "ICTICT532" },
    ),
  ],
  "QUA-1102": [
    t(
      "Logbook — week 8 site tasks",
      "Portfolio",
      undefined,
      "Supervisor-signed logbook pages for week 8.",
      { unitCode: "UEECD0046" },
    ),
    t(
      "Safe isolation procedure — observed",
      "Practical",
      undefined,
      "Observed by your workplace supervisor.",
      { unitCode: "UEERE0001" },
    ),
  ],
  "QUA-1103": [
    t(
      "Placement reflection — person-centred care",
      "Portfolio",
      undefined,
      "500-word reflection with your supervisor's comments.",
      { unitCode: "CHCCCS023" },
    ),
    t(
      "Third-party report — placement hours",
      "Portfolio",
      undefined,
      "Upload the signed third-party report.",
      { unitCode: "CHCAGE005" },
    ),
  ],
  "QUA-1104": [
    t(
      "Clinical placement — medication round",
      "Practical",
      undefined,
      "Observed medication round with the facilitator.",
      { unitCode: "HLTENN038" },
    ),
    t("Care plan case study", "Project", undefined, "Care plan for one resident (de-identified).", {
      unitCode: "HLTENN039",
    }),
  ],
  "QUA-1105": [
    t(
      "Workplace task — framing a wall",
      "Practical",
      undefined,
      "Photos and supervisor sign-off.",
      { unitCode: "CPCCCA3002" },
    ),
    t(
      "Site safety induction record",
      "Portfolio",
      undefined,
      "Upload your White Card and induction record.",
      { unitCode: "CPCCWHS2001" },
    ),
  ],
};

const FEEDBACK: Record<"primary" | "school" | "uni", [string, string, string]> = {
  primary: [
    "Fantastic work — you should be really proud!",
    "Good effort. Keep practising the tricky ones.",
    "Let's go over this together in class this week.",
  ],
  school: [
    "Excellent — accurate, well set out and clearly explained.",
    "Good work. Show every step and check your units.",
    "Some gaps here — review the notes and redo the starred questions.",
  ],
  uni: [
    "Correct and efficient — good analysis.",
    "Mostly correct; tighten the edge cases.",
    "Revisit the lecture notes and come to the drop-in.",
  ],
};

const tierOf = (x: number) => (x >= 0.82 ? 0 : x >= 0.62 ? 1 : 2);

/** Scores other seeds already quote (Zara's 47/50 is in her record book). */
const SCORE_FIX: Record<string, number> = {
  "SC-0901|Forces and motion — topic test|S-3001": 47,
};

function genSeeds() {
  const groups = buildTeachingGroups({
    subjectClasses: seedClasses,
    heModules: seedModules,
    moduleRegistrations: seedRegs,
    qualifications: seedQuals,
    learners: seedLearners,
  });
  const cw: Coursework[] = [];
  const subs: Submission[] = [];
  const reps: ProgressReport[] = [];
  let cwN = 1000;
  let subN = 10000;
  let prN = 10000;
  const first = (id: string) => seedLearners.find((l) => l.id === id)?.name.split(" ")[0] ?? "";

  const addSubs = (c: Coursework, g: TeachingGroup) => {
    const kind = markingKind(g.band, c);
    const fb =
      g.band === "primary"
        ? FEEDBACK.primary
        : g.band === "higher-ed"
          ? FEEDBACK.uni
          : FEEDBACK.school;
    for (const sid of g.studentIds) {
      const r = hash(c.id + sid) % 100;
      const a = clamp01(ability(sid) + jitter(c.id + sid, g.band === "primary" ? 0.14 : 0.08));
      const base = { tenantId: c.tenantId, courseworkId: c.id, studentId: sid };
      const file = `${first(sid).toLowerCase()}-${c.title
        .split(" ")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}.pdf`;
      if (c.due <= addDays(DEMO_TODAY, -14)) {
        // Older work: marked (a few late), the odd one never handed in.
        if (r < 6) {
          subs.push({ id: `SUB-${++subN}`, ...base, status: "Not submitted" });
          continue;
        }
        const late = r < 16;
        const tier = tierOf(a);
        const s: Submission = {
          id: `SUB-${++subN}`,
          ...base,
          status: "Marked",
          submittedAt: addDays(c.due, late ? 2 : -1),
          fileName: c.kind === "Quiz" ? undefined : file,
          late: late || undefined,
          markedBy: c.setBy,
          markedAt: addDays(c.due, 4),
          feedback: fb[tier],
        };
        if (kind === "score")
          s.score =
            SCORE_FIX[`${c.groupId}|${c.title}|${sid}`] ??
            Math.max(0, Math.min(c.maxScore!, Math.round(c.maxScore! * a)));
        if (kind === "descriptor") s.descriptor = PRIMARY_DESCRIPTORS[2 - tier];
        if (kind === "outcome") {
          s.descriptor = a >= 0.6 ? TASK_OUTCOMES[0] : TASK_OUTCOMES[1];
          s.feedback =
            a >= 0.6
              ? "Meets the performance criteria — well documented."
              : "Evidence incomplete — add the supervisor sign-off and resubmit.";
        }
        subs.push(s);
      } else if (c.due < DEMO_TODAY) {
        // Recently due: handed in and awaiting marking, some late, some missing.
        if (r < 14) continue; // overdue
        const late = r < 30;
        subs.push({
          id: `SUB-${++subN}`,
          ...base,
          status: late ? "Late" : "Submitted",
          submittedAt: late ? addDays(c.due, 2) : addDays(c.due, -1),
          fileName: c.kind === "Quiz" ? undefined : file,
          late: late || undefined,
        });
      } else if (c.set < DEMO_TODAY && r < 30) {
        subs.push({
          id: `SUB-${++subN}`,
          ...base,
          status: "Submitted",
          submittedAt: addDays(DEMO_TODAY, -1),
          fileName: file,
        });
      }
    }
  };

  // ── School teaching groups
  for (const g of groups.filter((x) => x.kind === "class")) {
    const key = `${g.subject} ${g.level}`;
    const tpl = SCHOOL_TEMPLATES.find((x) => x.band.includes(g.band) && x.match.test(key));
    if (!tpl) continue;
    const n = 3 + (hash(g.id) % 3); // 3–5 items
    tpl.items.slice(0, Math.max(n, Math.min(4, tpl.items.length))).forEach((it, i) => {
      const slot = SLOTS[Math.min(i, SLOTS.length - 1)];
      const c: Coursework = {
        id: `CW-${++cwN}`,
        tenantId: g.tenantId,
        groupId: g.id,
        title: it.title,
        kind: it.kind,
        set: it.set ?? slot.set,
        due: it.due ?? slot.due,
        maxScore: g.band === "primary" ? undefined : it.max,
        instructions: it.instructions,
        setBy: g.teacher,
      };
      cw.push(c);
      addSubs(c, g);
    });
  }

  // ── University formative work
  for (const g of groups.filter((x) => x.kind === "module" && MODULE_TEMPLATES[x.id])) {
    MODULE_TEMPLATES[g.id].forEach((it, i) => {
      const slot = SLOTS[Math.min(i + 1, SLOTS.length - 1)];
      const c: Coursework = {
        id: `CW-${++cwN}`,
        tenantId: g.tenantId,
        groupId: g.id,
        title: it.title,
        kind: it.kind,
        set: slot.set,
        due: slot.due,
        maxScore: it.max,
        instructions: it.instructions,
        setBy: g.teacher,
        formative: true,
      };
      cw.push(c);
      addSubs(c, g);
    });
  }

  // ── College workplace tasks
  for (const g of groups.filter((x) => x.kind === "qualification" && QUAL_TASKS[x.id])) {
    const assessor =
      seedUnits.find((u) => u.qualificationId === g.id)?.assessor ?? "Workplace assessor";
    QUAL_TASKS[g.id].forEach((it, i) => {
      const slot = SLOTS[Math.min(i + 1, SLOTS.length - 1)];
      const c: Coursework = {
        id: `CW-${++cwN}`,
        tenantId: g.tenantId,
        groupId: g.id,
        title: it.title,
        kind: it.kind,
        set: slot.set,
        due: slot.due,
        instructions: it.instructions,
        setBy: assessor,
        unitCode: it.unitCode,
      };
      cw.push(c);
      addSubs(c, g);
    });
  }

  // ── Term 1 progress reports: every school learner × subject group
  const curriculumOf = (groupId: string) => {
    const cid = seedClasses.find((s) => s.id === groupId)?.curriculumId;
    return seedCurricula.find((c) => c.id === cid);
  };
  for (const g of groups.filter((x) => x.kind === "class")) {
    const scale = reportScale(g, curriculumOf(g.id));
    for (const sid of g.studentIds) {
      const a = clamp01(ability(sid) + jitter(g.id + sid, 0.06));
      const tier = tierOf(a);
      const fn = first(sid);
      const subj = g.subject.replace(/^(IGCSE|CBSE|IB|A Level|International A Level)\s+/i, "");
      let value = "";
      let target: string | undefined;
      let detail: string | undefined;
      if (scale.scheme === "descriptor") value = PRIMARY_DESCRIPTORS[2 - tier];
      else if (scale.scheme === "percent") {
        const pt = Math.round(20 * clamp01(a + jitter(`pt${g.id}${sid}`, 0.05)));
        const hy = Math.round(80 * clamp01(a + jitter(`hy${g.id}${sid}`, 0.05)));
        value = `${pt + hy}%`;
        detail = `PT1 ${pt}/20 · Half-yearly ${hy}/80 · ${cbseGrade(pt + hy)}`;
      } else {
        const opts = scale.options.filter((o) => o !== "U");
        const idx = Math.min(
          opts.length - 1,
          Math.max(0, Math.round((1 - a) * (opts.length - 1) * 1.15)),
        );
        value = opts[idx];
        const stretch = hash(`tg${g.id}${sid}`) % 3 === 0 ? 0 : 1;
        target = opts[Math.max(0, idx - stretch)];
      }
      // Zara's Physics prediction was raised to 8 (see her record book).
      if (sid === "S-3001" && g.id === "SC-0901") {
        value = "8";
        target = "8";
      }
      const comment =
        tier === 0
          ? `${fn} works with real confidence in ${subj}. Next step: take on the extension tasks.`
          : tier === 1
            ? `${fn} is making steady progress in ${subj}. Next step: check work carefully before handing it in.`
            : `${fn} is trying hard in ${subj}. Next step: hand homework in on time and ask for help early.`;
      reps.push({
        id: `PR-${++prN}`,
        tenantId: g.tenantId,
        studentId: sid,
        groupId: g.id,
        term: REPORT_TERM,
        scheme: scale.scheme,
        value,
        target: scale.hasTarget ? target : undefined,
        effort: EFFORTS[hash(`ef${g.id}${sid}`) % 4 === 0 ? 1 : tier === 2 ? 2 : tier],
        comment: g.band === "primary" ? primaryComment(fn, subj, tier) : comment,
        teacher: g.teacher,
        scale: scale.label,
        detail,
      });
    }
  }

  // ── Early years: per learning area, against the form (no subject classes)
  for (const eg of earlyYearsGroups(seedTutorGroups, seedLearners)) {
    const scale = reportScale(eg);
    for (const sid of eg.studentIds) {
      const fn = first(sid);
      earlyAreasFor(eg.level).forEach((area, i) => {
        const a = clamp01(ability(sid) + jitter(area + sid, 0.12));
        reps.push({
          id: `PR-${++prN}`,
          tenantId: eg.tenantId,
          studentId: sid,
          groupId: eg.id,
          term: REPORT_TERM,
          scheme: "descriptor",
          value: EARLY_DESCRIPTORS[a >= 0.8 ? 2 : a >= 0.55 ? 1 : 0],
          comment: `${fn} ${EARLY_NOTES[i % EARLY_NOTES.length]}`,
          teacher: eg.teacher,
          area,
          scale: scale.label,
        });
      });
    }
  }

  return { cw, subs, reps };
}

function primaryComment(fn: string, subj: string, tier: number) {
  if (/English/i.test(subj))
    return [
      `${fn} reads with expression and writes in full sentences with interesting words.`,
      `${fn} enjoys stories and is learning to use capital letters and full stops every time.`,
      `${fn} is building confidence with reading. Please keep up reading at home each night.`,
    ][tier];
  if (/Math/i.test(subj))
    return [
      `${fn} knows the 3 and 4 times tables quickly and explains methods clearly.`,
      `${fn} is secure with column addition and is learning the 4 times table.`,
      `${fn} is working on number bonds to 20. Short daily practice at home will help.`,
    ][tier];
  return `${fn} takes part well and is making good progress in ${subj}.`;
}

const EARLY_NOTES = [
  "listens well at group time and retells familiar stories.",
  "plays happily with friends and is learning to take turns.",
  "climbs, balances and uses scissors with growing control.",
  "recognises the sounds of most letters and loves sharing books.",
  "counts objects to 10 and spots shapes around the classroom.",
  "asks lots of questions about plants and animals outdoors.",
  "enjoys painting and making up songs in the role-play corner.",
];

const generated = genSeeds();

export const coursework: Coursework[] = generated.cw;
export const submissions: Submission[] = generated.subs;
export const progressReports: ProgressReport[] = generated.reps;
