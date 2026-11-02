/* ── LMS content for pack tenants: lessons, resources, live classes, quizzes
 * per teaching group (see ./learning.ts), written for the group's AGE BAND.
 *
 * Seeds are generated deterministically from the teaching-group seeds (school
 * subject classes, university modules, college qualifications) plus one
 * LEARNING JOURNAL per early-years form (nursery / FS2 children have no subject
 * classes — their form is their group). Dates sit around DEMO_TODAY
 * (Mon 2 Nov 2026) and follow the tenant timetable where a slot matches.
 *
 * Pure: never import "@/lib/store" here (the store imports this file). */
import { DEMO_TODAY, learners as seedLearners, type Learner } from "../foundationData";
import {
  heModules as seedModules,
  moduleRegistrations as seedRegistrations,
  qualifications as seedQualifications,
  type HeModule,
  type Qualification,
} from "../heData";
import { timetableSlots as seedSlots, type TimetableSlot } from "../opsData";
import { tutorGroups as seedTutorGroups, type TutorGroup } from "../schoolData";
import { subjectClasses as seedClasses } from "./classes";
import { ageBandFor, buildTeachingGroups, type AgeBand, type TeachingGroup } from "./learning";

export type LearningKind =
  | "Lesson"
  | "Resource"
  | "Live class"
  | "Recording"
  | "Quiz"
  | "Activity"
  | "Observation";

export interface LearningItem {
  id: string;
  tenantId: string;
  groupId: string; // TeachingGroup.id (early years: the form's TutorGroup id)
  kind: LearningKind;
  title: string;
  /** ISO date (lessons / live classes) — around DEMO_TODAY. */
  date?: string;
  start?: string; // "09:00"
  durationMins?: number;
  topic?: string; // unit / topic heading
  detail?: string;
  /** Who it is for when it isn't the whole group (e.g. an EY observation). */
  studentId?: string;
  author?: string;
  /** Due date for homework / quizzes / tasks (ISO). */
  due?: string;
  /** Where it happens: a room, "Online (Teams)", "Workplace". */
  location?: string;
  /** Early years: visible to the family in the learning journal. */
  sharedWithFamily?: boolean;
  /** Early years: area of learning (EYFS / national pre-school framework). */
  area?: string;
}

/* ── Pure helpers shared by the Courses and LMS pages ───────────────────── */

export const DEMO_MONDAY = "2026-11-02"; // DEMO_TODAY is a Monday
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
type Wd = (typeof WD)[number];

export function isoAddDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const dateFor = (day: Wd, week: number) => isoAddDays(DEMO_MONDAY, WD.indexOf(day) + 7 * week);
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Early-years forms as teaching groups — one learning journal per form. */
export function journalGroups(learners: Learner[], forms: TutorGroup[]): TeachingGroup[] {
  const out: TeachingGroup[] = [];
  for (const f of forms) {
    if (ageBandFor(f.yearGroup) !== "early") continue;
    const kids = learners.filter(
      (l) => l.tenantId === f.tenantId && l.group === f.name && ageBandFor(l.level) === "early",
    );
    if (!kids.length) continue;
    out.push({
      id: f.id,
      tenantId: f.tenantId,
      kind: "class",
      code: f.name,
      title: `Learning journal — ${f.name}`,
      subject: "Early years",
      level: f.yearGroup,
      band: "early",
      teacher: f.tutor,
      studentIds: kids.map((k) => k.id),
      room: f.room,
    });
  }
  return out;
}

const looseSubject = (a: string, b: string) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.endsWith(y) || y.endsWith(x);
};

/** Timetable slots that belong to a teaching group (best effort). */
export function slotsForGroup(
  g: TeachingGroup,
  slots: TimetableSlot[],
  learners: Learner[],
): TimetableSlot[] {
  const mine = slots.filter((s) => s.tenantId === g.tenantId);
  if (g.kind === "module") return mine.filter((s) => s.groupLabel.startsWith(`${g.code} `));
  if (g.kind === "qualification") return mine.filter((s) => s.subject.startsWith(g.code));
  const forms = new Set(
    learners.filter((l) => g.studentIds.includes(l.id) && l.group).map((l) => l.group!),
  );
  return mine.filter(
    (s) =>
      s.teacherName === g.teacher &&
      looseSubject(s.subject, g.subject) &&
      (s.cohorts ?? [s.groupLabel]).some((c) => forms.has(c)),
  );
}

/** "Mon 07:45 · Tue 10:05" from slots, or a sensible line for the age band. */
export function scheduleLabel(
  g: TeachingGroup,
  slots: TimetableSlot[],
  term: ModuleTerm = "now",
): string {
  if (term === "upcoming") return "Starts 25 Jan 2027";
  if (term === "finished") return "Finished (semester 1)";
  if (!slots.length && g.band === "early") return "Every weekday morning";
  const meets = meetingsFor(g, slots);
  const order = (m: Meet) => WD.indexOf(m.day) * 10000 + toMin(m.start);
  const byStart = new Map<string, Wd[]>();
  for (const m of [...meets].sort((a, b) => order(a) - order(b)))
    byStart.set(m.start, [...(byStart.get(m.start) ?? []), m.day]);
  if (byStart.size === 1 && [...byStart.values()][0].length === 5)
    return `Daily ${[...byStart.keys()][0]}`;
  return [...meets]
    .sort((a, b) => order(a) - order(b))
    .map((m) => `${m.day} ${m.start}`)
    .join(" · ");
}

export type ModuleTerm = "now" | "upcoming" | "finished";

/** Whether a module's semester is running now (2 Nov 2026), ahead, or over. */
export function moduleTerm(tenantId: string, semester?: HeModule["semester"]): ModuleTerm {
  if (!semester || (ACTIVE[tenantId] ?? ["S1", "Year"]).includes(semester)) return "now";
  return tenantId === "T-011" ? "finished" : "upcoming"; // AU semester 1 ended in June
}

const BAND_LABEL: Record<AgeBand, string> = {
  early: "Early years",
  primary: "Primary",
  "lower-secondary": "Lower secondary",
  "upper-secondary": "Upper secondary",
  "sixth-form": "Sixth form",
  "higher-ed": "Higher education",
  vocational: "Vocational",
};
export const bandLabel = (b: AgeBand) => BAND_LABEL[b];

const SYLLABUS: Record<string, string> = {
  "IGCSE Physics": "Cambridge IGCSE Physics 0625",
  "IGCSE Mathematics": "Cambridge IGCSE Mathematics 0580",
  "IGCSE English": "Cambridge IGCSE English",
  "IGCSE Chemistry": "Cambridge IGCSE Chemistry 0620",
  "A Level Physics": "Cambridge International A Level Physics 9702",
  "A Level Mathematics": "Cambridge International A Level Mathematics 9709",
  "International A Level Chemistry": "Pearson Edexcel International A Level Chemistry",
  "IB Physics HL": "IB Diploma · Physics Higher Level",
  "IB Mathematics AA HL": "IB Diploma · Maths Analysis & Approaches HL",
  "IB Theory of Knowledge": "IB Diploma core · Theory of Knowledge",
  "CBSE Science": "CBSE · NCERT Science, Class 7",
  "CBSE Mathematics": "CBSE · NCERT Mathematics, Class 7",
  "Arabic A": "Arabic for native speakers (UAE MoE)",
  "Arabic B": "Arabic for non-native speakers (UAE MoE)",
  English: "English · Key Stage 2",
  Mathematics: "Maths · Key Stage 2",
  "Early years": "Learning through play",
};

/** Short, age-appropriate line under a course title. */
export function groupSubtitle(g: TeachingGroup): string {
  if (g.band === "early") return `${g.level} · learning through play`;
  if (g.band === "higher-ed") return `${g.level} module`;
  if (g.band === "vocational") return `${g.level} · competency-based units`;
  return `${g.level} · ${SYLLABUS[g.subject] ?? g.subject}`;
}

/* ── Formatting ── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon 2 Nov" (fixed demo calendar, no time zones). */
export function fmtDay(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[wd]} ${d} ${MONTHS[m - 1]}${y !== 2026 ? ` ${y}` : ""}`;
}

export function whenLabel(iso?: string): string {
  if (!iso) return "";
  if (iso === DEMO_TODAY) return "Today";
  return fmtDay(iso);
}

export function endTime(start: string, mins = 60): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
/** How a kind of item is named for an age band (plain words for young ones). */
export function kindLabel(kind: LearningKind, band: AgeBand): string {
  if (band === "early") {
    if (kind === "Observation") return "Observation";
    if (kind === "Resource") return "For home";
    return "Activity";
  }
  if (band === "primary") {
    const m: Partial<Record<LearningKind, string>> = {
      Lesson: "In class",
      Activity: "Home learning",
      Quiz: "Practice",
      Recording: "Video",
      Resource: "Resource",
      "Live class": "Online session",
    };
    return m[kind] ?? kind;
  }
  if (band === "higher-ed") {
    const m: Partial<Record<LearningKind, string>> = {
      Lesson: "Teaching session",
      Recording: "Lecture recording",
      Quiz: "Formative quiz",
      Activity: "Coursework",
    };
    return m[kind] ?? kind;
  }
  if (band === "vocational") {
    const m: Partial<Record<LearningKind, string>> = {
      Lesson: "Training session",
      Activity: "Task",
      Quiz: "Knowledge check",
    };
    return m[kind] ?? kind;
  }
  const m: Partial<Record<LearningKind, string>> = { Activity: "Homework" };
  return m[kind] ?? kind;
}

/* ── Seed templates ─────────────────────────────────────────────────────── */

type T2 = [title: string, detail: string];
type T3 = [title: string, detail: string, topic?: string];

interface SchoolPlan {
  unit: string;
  /** Last lesson, next lesson, then the two after. */
  lessons: [string, string, string, string];
  resources: T3[];
  homework: T2;
  quiz: T2;
  live?: T2;
  recording?: T2;
}

const SCHOOL_PLANS: Record<string, SchoolPlan> = {
  // ── Meridian Dubai ──
  "SC-0901": {
    unit: "Forces and motion",
    lessons: [
      "Speed, velocity and distance–time graphs",
      "Acceleration and velocity–time graphs",
      "Newton's laws and resultant force",
      "Practical: Hooke's law — extending a spring",
    ],
    resources: [
      ["Forces and motion notes (0625 topic 1)", "Key definitions, equations and worked examples."],
      ["Equation sheet: motion", "s = d/t, a = Δv/t, F = ma — with units."],
      [
        "Past paper questions: motion (Paper 4)",
        "2023–2024 questions with mark schemes.",
        "Exam practice",
      ],
    ],
    homework: [
      "Practical write-up: spring extension",
      "Results table, force–extension graph, conclusion and evaluation.",
    ],
    quiz: ["Forces and motion check", "15 multiple-choice questions, 20 minutes."],
    live: ["Revision drop-in: motion graphs", "Optional online session — bring your questions."],
    recording: ["Recap: distance–time vs velocity–time graphs", "12-minute video."],
  },
  "SC-0902": {
    unit: "Algebra: quadratics",
    lessons: [
      "Factorising quadratics",
      "Solving quadratics with the formula",
      "Completing the square",
      "Quadratic graphs and turning points",
    ],
    resources: [
      ["Quadratics notes (Extended tier)", "Methods side by side with worked examples."],
      ["Exercise 12C answers", "Check your working after you try each question."],
    ],
    homework: ["Exercise 12C: solving quadratics", "Questions 1–20. Show full working."],
    quiz: ["Quadratics quick quiz", "10 questions, calculator allowed."],
    live: ["Maths clinic (online)", "Drop in for help with any homework question."],
    recording: ["Completing the square, step by step", "9-minute video."],
  },
  "SC-0903": {
    unit: "Algebra: linear equations",
    lessons: [
      "Solving one- and two-step equations",
      "Equations with brackets",
      "Forming equations from words",
      "Straight-line graphs: y = mx + c",
    ],
    resources: [
      ["Linear equations notes (Core tier)", "Step-by-step methods with examples."],
      ["Balancing method poster", "Do the same to both sides."],
    ],
    homework: ["Worksheet: equations with brackets", "20 questions. Check with the answers."],
    quiz: ["Linear equations quiz", "10 questions, no calculator."],
    live: ["Maths clinic (online)", "Drop in for help with any homework question."],
    recording: ["Forming equations from word problems", "8-minute video."],
  },
  "SC-0904": {
    unit: "An Inspector Calls",
    lessons: [
      "Act 1: Mr Birling and dramatic irony",
      "Act 2: Sheila's change",
      "Act 3: the Inspector's final speech",
      "Essay planning: PEE paragraphs",
    ],
    resources: [
      ["Character map: the Birling family", "Who they are and how they change."],
      ["Context: 1912 and 1945", "Why Priestley set the play before the wars."],
      ["Key quotations booklet", "20 quotations to learn by heart.", "Revision"],
    ],
    homework: ["Essay: Mr Birling and dramatic irony", "600 words. Submit on the LMS by Thursday."],
    quiz: ["Act 1 quotation quiz", "Match the quotation to the character."],
    live: ["Revision: writing about context", "Online session after school."],
    recording: ["Act 2 read-through (full cast)", "Audio recording, 35 minutes."],
  },
  "SC-0905": {
    unit: "Daily life and routines",
    lessons: [
      "Vocabulary: my daily routine",
      "Telling the time",
      "Reading: a day in Dubai",
      "Writing: describe your weekend",
    ],
    resources: [
      ["Vocabulary list with audio: daily routine", "Listen and repeat each word."],
      ["Verb chart: present tense", "Regular verbs with all pronouns."],
    ],
    homework: ["Write 80 words about your weekend", "Use at least five time phrases."],
    quiz: ["Vocabulary quiz: daily routine", "15 words, picture to word."],
    live: ["Speaking practice (online)", "Short conversations in pairs."],
    recording: ["Listening: a conversation at the souq", "4-minute audio."],
  },
  "SC-0906": {
    unit: "Electricity",
    lessons: [
      "Current, voltage and resistance",
      "Series and parallel circuits",
      "Electrical power and energy",
      "Mock exam preparation: Paper 4",
    ],
    resources: [
      ["Electricity notes (0625 topic 4)", "Circuit symbols, rules and equations."],
      ["Circuit symbols sheet", "All symbols you need for the exam."],
      ["Mock exam: Paper 4 practice set", "Timed practice with mark scheme.", "Mock exams"],
    ],
    homework: ["Circuit calculations worksheet", "12 questions on series and parallel circuits."],
    quiz: ["Electricity check", "15 questions, 20 minutes."],
    live: ["Mock revision: electricity (online)", "Go through the hardest past questions."],
    recording: ["Series vs parallel circuits explained", "10-minute video."],
  },
  "SC-0907": {
    unit: "Trigonometry",
    lessons: [
      "The sine rule",
      "The cosine rule",
      "Area of a triangle: ½ab sin C",
      "Mock paper walkthrough",
    ],
    resources: [
      ["Trigonometry notes (Extended)", "When to use each rule."],
      ["Mock exam: Paper 4 practice set", "Timed practice with mark scheme.", "Mock exams"],
    ],
    homework: ["Exercise 15B: sine and cosine rules", "Questions 1–16."],
    quiz: ["Trigonometry quiz", "10 questions, calculator allowed."],
    live: ["Mock revision clinic (online)", "Bring your hardest questions."],
    recording: ["Choosing the sine or cosine rule", "7-minute video."],
  },
  "SC-0908": {
    unit: "Percentages and ratio",
    lessons: [
      "Percentage increase and decrease",
      "Compound interest",
      "Ratio and proportion",
      "Mock practice: Paper 1",
    ],
    resources: [
      ["Percentages notes (Core)", "Multipliers explained with examples."],
      ["Mock exam: Paper 1 practice set", "Timed practice with mark scheme.", "Mock exams"],
    ],
    homework: ["Worksheet: percentage change", "15 questions."],
    quiz: ["Percentages quiz", "10 questions, calculator allowed."],
    live: ["Mock revision clinic (online)", "Bring your hardest questions."],
    recording: ["Compound interest in three steps", "6-minute video."],
  },
  "SC-0909": {
    unit: "Directed writing",
    lessons: [
      "Reading for argument",
      "Directed writing: letters and speeches",
      "Descriptive writing techniques",
      "Timed practice: Paper 2",
    ],
    resources: [
      ["Directed writing checklist", "Audience, purpose and tone."],
      ["Model answers: band 5 responses", "Annotated examples."],
    ],
    homework: ["Write a speech to the school council", "350–450 words."],
    quiz: ["Language techniques quiz", "Spot the technique in each extract."],
    live: ["Mock revision: Paper 2 (online)", "Planning under timed conditions."],
    recording: ["How to plan directed writing in 5 minutes", "8-minute video."],
  },
  "SC-0910": {
    unit: "Dynamics: momentum",
    lessons: [
      "Newton's laws and linear momentum",
      "Conservation of momentum",
      "Elastic and inelastic collisions",
      "Practical: trolley collisions with data loggers",
    ],
    resources: [
      ["Dynamics notes (9702 topic 3)", "Definitions, derivations and examples."],
      ["Data booklet", "Formulae and constants for the course."],
    ],
    homework: ["Practical report: trolley collisions", "Include uncertainties and a graph."],
    quiz: ["Momentum problem set", "8 structured questions."],
    live: ["Problem-solving session (online)", "Collision problems worked live."],
    recording: ["Elastic vs inelastic collisions", "14-minute video."],
  },
  "SC-0911": {
    unit: "Differentiation",
    lessons: [
      "Gradient from first principles",
      "Differentiating powers of x",
      "Tangents and normals",
      "Stationary points",
    ],
    resources: [
      ["Pure 1 notes: differentiation", "Rules with worked examples."],
      ["Past paper questions: differentiation", "With mark schemes.", "Exam practice"],
    ],
    homework: ["Exercise 7D: tangents and normals", "Questions 1–14."],
    quiz: ["Differentiation quiz", "10 questions, no calculator."],
    live: ["Pure 1 clinic (online)", "Drop in for help."],
    recording: ["Stationary points: max or min?", "11-minute video."],
  },
  "SC-0912": {
    unit: "Theme D: Fields",
    lessons: [
      "D.1 Gravitational fields and orbits",
      "D.2 Electric fields and potential",
      "D.3 Charged particles in magnetic fields",
      "D.4 Electromagnetic induction",
    ],
    resources: [
      ["Theme D notes", "Fields, potential and induction."],
      ["Internal assessment criteria", "Research design, analysis, conclusion, evaluation.", "IA"],
    ],
    homework: ["Internal assessment: final draft", "Upload to the LMS for feedback."],
    quiz: ["Paper 1 practice: fields", "20 multiple-choice questions."],
    live: ["IA drop-in (online)", "One-to-one help with your investigation."],
    recording: ["Orbits and escape velocity", "15-minute video."],
  },
  "SC-0913": {
    unit: "Calculus",
    lessons: [
      "Integration by parts",
      "Volumes of revolution",
      "Separable differential equations",
      "Maclaurin series",
    ],
    resources: [
      ["Calculus notes (AA HL)", "Methods and examples."],
      ["Exploration guide", "Criteria and examples of strong explorations.", "IA"],
    ],
    homework: ["Mathematical exploration: final submission", "Upload your PDF to the LMS."],
    quiz: ["Integration practice set", "12 questions, Paper 1 style."],
    live: ["Exploration clinic (online)", "Last checks before submission."],
    recording: ["Volumes of revolution explained", "13-minute video."],
  },
  "SC-0914": {
    unit: "TOK essay",
    lessons: [
      "Prescribed titles: unpacking the question",
      "Knowledge questions and claims",
      "Using real-life examples",
      "Essay planning conference",
    ],
    resources: [
      ["Prescribed titles (November session)", "Choose one title."],
      ["TOK essay assessment instrument", "How the essay is marked."],
    ],
    homework: ["TOK essay: first draft", "1,600 words. Submit on the LMS."],
    quiz: ["Areas of knowledge recap", "Short check on key terms."],
    live: ["Essay drop-in (online)", "Talk through your argument."],
    recording: ["What makes a strong TOK essay", "10-minute video."],
  },
  "SC-0915": {
    unit: "Nutrition in plants (NCERT Ch. 1)",
    lessons: [
      "Photosynthesis: how plants make food",
      "Other modes of nutrition in plants",
      "Nutrition in animals: human digestion (Ch. 2)",
      "Activity: testing a leaf for starch",
    ],
    resources: [
      ["NCERT Chapter 1 notes", "Key terms and diagrams."],
      ["Diagram: parts of a leaf", "Label and learn."],
    ],
    homework: ["NCERT Chapter 2: questions 1–10", "Write answers in your notebook."],
    quiz: ["Chapter 1 MCQ quiz", "10 questions."],
    recording: ["Video: the iodine test for starch", "5-minute demonstration."],
  },
  "SC-0916": {
    unit: "Integers and fractions (NCERT Ch. 1–2)",
    lessons: [
      "Properties of integers",
      "Multiplying and dividing integers",
      "Multiplying fractions",
      "Word problems with fractions",
    ],
    resources: [
      ["NCERT Chapter 2 notes", "Fractions and decimals."],
      ["Integer rules chart", "Signs when multiplying and dividing."],
    ],
    homework: ["NCERT Exercise 2.3", "All questions in your notebook."],
    quiz: ["Integers quiz", "10 questions."],
    recording: ["Multiplying fractions with diagrams", "6-minute video."],
  },
  "SC-0917": {
    unit: "Reading and comprehension",
    lessons: [
      "Reading: a short story",
      "Grammar: nominal sentences",
      "Dictation practice",
      "Writing: describe your family",
    ],
    resources: [
      ["Short story text with questions", "Read twice, then answer."],
      ["Grammar sheet: nominal sentences", "Examples and practice."],
    ],
    homework: ["Comprehension questions", "Answer in full sentences."],
    quiz: ["Grammar quiz", "10 questions."],
  },
  // ── Meridian Colombo ──
  "SC-1201": {
    unit: "Phonics and reading",
    lessons: [
      "Phonics: split digraph a-e (cake, make)",
      "Phonics: split digraph i-e (bike, time)",
      "Guided reading: The Owl Who Was Afraid of the Dark, chapter 2",
      "Writing: a letter to Plop the owl",
    ],
    resources: [
      ["Spelling list: a-e and i-e words", "cake, make, came, bike, time, like, hide, ride."],
      [
        "Reading book: The Owl Who Was Afraid of the Dark",
        "Read for 10 minutes each night and sign the reading record.",
        "Reading",
      ],
    ],
    homework: ["Spelling practice", "Look, say, cover, write, check — 10 minutes a day."],
    quiz: ["Friday spelling test", "10 words from this week's list."],
    live: [
      "Phonics workshop for parents (online)",
      "How we teach sounds, and games to play at home.",
    ],
    recording: ["Sounds video: a-e and i-e", "Watch and say the sounds together."],
  },
  "SC-1202": {
    unit: "Times tables and addition",
    lessons: [
      "The 3 times table",
      "The 4 and 8 times tables: doubling",
      "Column addition with exchanging",
      "Problem solving: money word problems",
    ],
    resources: [
      ["Times tables chart: 3, 4 and 8", "Stick it on the fridge!"],
      ["Column addition step by step", "A picture guide for home."],
    ],
    homework: ["Times tables practice", "10 minutes a day — say them out loud."],
    quiz: ["Times tables check: 3, 4 and 8", "A quick game, 20 questions."],
    recording: ["Column addition with exchanging", "A short video to watch together."],
  },
  "SC-1203": {
    unit: "Stoichiometry: the mole",
    lessons: [
      "Relative formula mass",
      "The mole and the Avogadro constant",
      "Reacting masses",
      "Practical: making copper sulfate crystals",
    ],
    resources: [
      ["Mole calculations notes (0620 topic 3)", "Formula triangle and worked examples."],
      ["Periodic table (exam copy)", "Use it for every calculation."],
    ],
    homework: ["Practical write-up: copper sulfate crystals", "Method, results and yield."],
    quiz: ["Mole calculations quiz", "10 questions, calculator allowed."],
    live: ["Revision clinic (Zoom)", "Mole calculations step by step."],
    recording: ["Reacting masses in four steps", "9-minute video."],
  },
  "SC-1204": {
    unit: "Electromagnetism",
    lessons: [
      "Magnetic effect of a current",
      "The motor effect",
      "Electromagnetic induction",
      "Transformers",
    ],
    resources: [
      ["Electromagnetism notes (0625 topic 4.5)", "Rules, diagrams and examples."],
      ["Left-hand rule sheet", "Field, current, force."],
    ],
    homework: ["Transformer calculations", "10 questions using Vp/Vs = Np/Ns."],
    quiz: ["Electromagnetism check", "12 questions."],
    live: ["Revision clinic (Zoom)", "Motor effect past questions."],
    recording: ["How a transformer works", "8-minute video."],
  },
  "SC-1205": {
    unit: "Organic chemistry: halogenoalkanes",
    lessons: [
      "Nucleophilic substitution: SN1 and SN2",
      "Substitution vs elimination",
      "Alcohols: oxidation",
      "Practical: hydrolysis rates of halogenoalkanes",
    ],
    resources: [
      ["Mechanisms sheet: curly arrows", "Every mechanism for Unit 2."],
      ["Unit 2 specification checklist", "Tick off what you know."],
    ],
    homework: ["Mechanism practice set", "Draw the full mechanism for each reaction."],
    quiz: ["Halogenoalkanes quiz", "10 questions."],
    live: ["Mechanisms clinic (Zoom)", "Curly arrows, worked live."],
    recording: ["SN1 vs SN2 explained", "12-minute video."],
  },
  "SC-1206": {
    unit: "Carbonyl compounds and mechanisms",
    lessons: [
      "Aldehydes and ketones: nucleophilic addition",
      "Carboxylic acids and esters",
      "Acyl chlorides: addition–elimination",
      "Practical: tests for carbonyl groups",
    ],
    resources: [
      ["Unit 4 mechanisms sheet", "Nucleophilic addition and addition–elimination."],
      ["Past paper questions: carbonyls", "With mark schemes.", "Exam practice"],
    ],
    homework: ["Organic synthesis routes", "Plan three two-step syntheses."],
    quiz: ["Carbonyl compounds quiz", "12 questions."],
    live: ["Synthesis clinic (Zoom)", "Plan routes together."],
    recording: ["Nucleophilic addition to carbonyls", "11-minute video."],
  },
};

/** Generic plan when a school group has no template (keeps new groups useful). */
function genericSchoolPlan(g: TeachingGroup): SchoolPlan {
  const young = g.band === "primary";
  return {
    unit: `${g.subject}: this half term`,
    lessons: [
      `${g.subject}: recap`,
      `${g.subject}: new topic`,
      `${g.subject}: practice`,
      `${g.subject}: review`,
    ],
    resources: [[`${g.subject} notes`, young ? "A picture guide for home." : "Key points."]],
    homework: [young ? "Practice at home" : "Homework task", "See your teacher's instructions."],
    quiz: [young ? "Practice game" : "Topic quiz", "Short check."],
  };
}

/* ── University modules ── [last topic, this week, next week, reading, class type] */
type HeTopics = [string, string, string, string, string];
const HE_TOPICS: Record<string, HeTopics> = {
  CS101: [
    "Loops and lists",
    "Functions and decomposition",
    "Dictionaries and files",
    "Think Python, ch. 6–8",
    "Lab",
  ],
  CS102: [
    "Memory hierarchy and caches",
    "Processes and scheduling",
    "Virtual memory",
    "Bryant & O'Hallaron, ch. 6",
    "Lab",
  ],
  CS103: [
    "Sets, relations and functions",
    "Proof by induction",
    "Graph theory basics",
    "Rosen, Discrete Mathematics, ch. 5",
    "Tutorial",
  ],
  CS104: [
    "Ethics in computing",
    "Teamwork and agile roles",
    "Reflective writing",
    "BCS Code of Conduct",
    "Seminar",
  ],
  CS105: [
    "HTML semantics",
    "CSS layout: flexbox and grid",
    "Accessibility basics",
    "MDN Learn Web Development",
    "Lab",
  ],
  CS106: [
    "Classes and objects",
    "Inheritance and interfaces",
    "Design patterns",
    "Head First Java, ch. 7",
    "Lab",
  ],
  CS201: [
    "Recursion and divide-and-conquer",
    "Sorting algorithms and complexity",
    "Hash tables",
    "CLRS, ch. 2 and 7 (sorting)",
    "Lab",
  ],
  CS202: [
    "ER modelling",
    "Normalisation to 3NF",
    "SQL joins and indexing",
    "Connolly & Begg, ch. 14",
    "Lab",
  ],
  CS203: [
    "Requirements and user stories",
    "UML class and sequence diagrams",
    "Testing strategies",
    "Sommerville, Software Engineering, ch. 5",
    "Seminar",
  ],
  CS204: [
    "REST APIs",
    "Authentication and sessions",
    "Front-end state management",
    "MDN: HTTP and fetch",
    "Lab",
  ],
  CS205: [
    "Linear regression",
    "Classification and logistic regression",
    "Decision trees",
    "Géron, Hands-On Machine Learning, ch. 4",
    "Lab",
  ],
  CS206: [
    "User research",
    "Prototyping",
    "Usability testing",
    "Norman, The Design of Everyday Things",
    "Workshop",
  ],
  CS207: [
    "Threat modelling",
    "Cryptography basics",
    "Web vulnerabilities: OWASP Top 10",
    "OWASP Top 10",
    "Lab",
  ],
  CS208: [
    "Mobile UI patterns",
    "State and navigation",
    "Device APIs",
    "Android developer guides",
    "Lab",
  ],
  CS301: [
    "Literature review",
    "Project planning and ethics approval",
    "Interim report",
    "Dawson, Projects in Computing",
    "Supervision",
  ],
  CS302: [
    "Consistency models",
    "Consensus: Raft",
    "Distributed transactions",
    "Kleppmann, Designing Data-Intensive Applications, ch. 9",
    "Lab",
  ],
  CS303: [
    "Search algorithms",
    "Knowledge representation",
    "Planning under uncertainty",
    "Russell & Norvig, ch. 3",
    "Tutorial",
  ],
  CS304: [
    "IaaS and PaaS",
    "Containers and orchestration",
    "Infrastructure as code",
    "AWS Well-Architected Framework",
    "Lab",
  ],
  CS305: [
    "Risk management",
    "ISO/IEC 27001 controls",
    "Incident response",
    "ISO/IEC 27001 overview",
    "Seminar",
  ],
  CS306: [
    "Progressive web apps",
    "Performance budgets",
    "Web security headers",
    "web.dev PWA guide",
    "Lab",
  ],
  DS701: [
    "Linear models",
    "Regularisation: ridge and lasso",
    "Cross-validation and model selection",
    "James et al., ISLR, ch. 6",
    "Workshop",
  ],
  DS702: [
    "Distributed storage",
    "Spark DataFrames",
    "Streaming pipelines",
    "Spark: The Definitive Guide, ch. 5",
    "Workshop",
  ],
  DS703: [
    "Research questions",
    "Research design",
    "Writing a proposal",
    "Creswell, Research Design",
    "Seminar",
  ],
  DS799: [
    "Choosing a topic",
    "Proposal and supervisor meeting",
    "Data management plan",
    "School dissertation handbook",
    "Supervision",
  ],
  DS704: [
    "Neural network basics",
    "Convolutional networks",
    "Transformers",
    "Goodfellow et al., Deep Learning, ch. 6",
    "Lab",
  ],
  DS705: [
    "Visual encoding",
    "Dashboards",
    "Storytelling with data",
    "Knaflic, Storytelling with Data",
    "Workshop",
  ],
  DS706: [
    "GDPR and data protection",
    "Algorithmic bias",
    "Data governance frameworks",
    "ICO guide to the UK GDPR",
    "Seminar",
  ],
  DS707: [
    "Tokenisation and embeddings",
    "Sequence models",
    "Transformers for NLP",
    "Jurafsky & Martin, ch. 6",
    "Lab",
  ],
  BM101: [
    "What managers do",
    "Motivation theories",
    "Leadership styles",
    "Robbins & Coulter, ch. 1",
    "Seminar",
  ],
  BM102: [
    "Financial statements",
    "Ratio analysis",
    "Budgeting and variance",
    "Drury, Management Accounting, ch. 2",
    "Tutorial",
  ],
  BM103: [
    "The marketing mix",
    "Segmentation and targeting",
    "Consumer behaviour",
    "Kotler, Principles of Marketing, ch. 7",
    "Seminar",
  ],
  BM201: [
    "PESTLE and Porter's five forces",
    "The resource-based view",
    "Strategic choice",
    "Johnson, Whittington & Scholes, ch. 2",
    "Seminar",
  ],
  BM202: [
    "Personality and perception",
    "Team dynamics",
    "Organisational culture",
    "Mullins, Organisational Behaviour, ch. 8",
    "Seminar",
  ],
  BM203: [
    "Descriptive analytics",
    "Regression for business",
    "Dashboards in Power BI",
    "Evans, Business Analytics, ch. 3",
    "Lab",
  ],
  BM301: [
    "Choosing a topic",
    "Literature review",
    "Methodology",
    "Saunders, Research Methods for Business Students",
    "Supervision",
  ],
  BM302: [
    "Globalisation",
    "Market entry modes",
    "Cultural dimensions",
    "Hofstede, Cultures and Organizations",
    "Seminar",
  ],
  BM303: [
    "Opportunity recognition",
    "The business model canvas",
    "Pitching to investors",
    "Osterwalder, Business Model Generation",
    "Workshop",
  ],
  BIT101: [
    "Variables and control flow",
    "Functions",
    "Collections",
    "Programming Principles study guide",
    "Lab",
  ],
  BIT102: [
    "The OSI model",
    "IP addressing and subnetting",
    "Routing basics",
    "Cisco Networking Academy: ITN",
    "Lab",
  ],
  BIT103: [
    "Systems analysis",
    "Process modelling",
    "Information systems in organisations",
    "Laudon, Management Information Systems",
    "Tutorial",
  ],
  BIT104: [
    "Responsive layout",
    "Visual hierarchy",
    "Accessibility (WCAG 2.2)",
    "WCAG 2.2 quick reference",
    "Lab",
  ],
  BIT201: ["Relational design", "SQL queries", "Transactions", "Elmasri & Navathe, ch. 5", "Lab"],
  BIT202: [
    "Version control with Git",
    "Agile delivery",
    "Testing and CI",
    "Pro Git, ch. 3",
    "Tutorial",
  ],
  BIT203: [
    "Virtual networks (VPC)",
    "Auto scaling and load balancing",
    "Exam revision",
    "AWS Cloud Practitioner essentials",
    "Lab",
  ],
  BIT204: [
    "Penetration testing method",
    "Network defence",
    "Exam revision",
    "OWASP Testing Guide",
    "Lab",
  ],
  BIT205: [
    "User research",
    "Wireframes and prototypes",
    "Usability testing",
    "Krug, Don't Make Me Think",
    "Workshop",
  ],
  BIT301: [
    "Client requirements",
    "Build sprint",
    "Final presentation",
    "Capstone handbook",
    "Supervision",
  ],
  BIT302: [
    "Project scope",
    "Scheduling and risk",
    "Agile vs waterfall",
    "PMBOK Guide, ch. 4",
    "Tutorial",
  ],
  BIT303: [
    "Data cleaning",
    "Exploratory analysis",
    "Exam revision",
    "Python for Data Analysis, ch. 7",
    "Lab",
  ],
};

/** Which semesters are teaching now (2 Nov 2026), per tenant. */
const ACTIVE: Record<string, HeModule["semester"][]> = {
  "T-010": ["S1", "Year"], // UK year: semester 1 runs Sep–Jan
  "T-011": ["S2", "Year"], // AU year: semester 2 runs Jul–Nov (exam weeks now)
};

/* ── College qualifications ── */
interface VetPlan {
  units: [string, string, string]; // unit codes: last, current, next
  workplace: T2;
  video: T2;
  live: T2;
}
const VET_PLANS: Record<string, VetPlan> = {
  ICT50220: {
    units: ["BSBXCS402", "ICTSAS527", "ICTDBS506"],
    workplace: [
      "Workplace project: cyber security briefing for a client team",
      "Plan and deliver a 15-minute awareness session. Upload slides and attendee feedback.",
    ],
    video: ["Recording: normalising a database to 3NF", "Trainer walkthrough, 18 minutes."],
    live: ["Online theory: managing client problems", "Case studies and help-desk role play."],
  },
  UEE30820: {
    units: ["UEECD0046", "UEEEL0019", "UEECD0051"],
    workplace: [
      "Logbook: isolate and test a lighting circuit",
      "Under supervision on site. Record test results and supervisor sign-off.",
    ],
    video: ["Demonstration: safe isolation (test before you touch)", "Workshop video, 9 minutes."],
    live: ["Online theory: AS/NZS 3000 wiring rules", "Q&A before next block release."],
  },
  CHC43015: {
    units: ["CHCCCS023", "CHCAGE005", "CHCLEG001"],
    workplace: [
      "Placement task: person-centred activity plan",
      "Plan an activity with a resident at your host facility. Supervisor to sign.",
    ],
    video: ["Demonstration: talking with a person living with dementia", "Role-play video."],
    live: ["Online theory: duty of care and dignity of risk", "Case discussion."],
  },
  HLT54121: {
    units: ["HLTENN039", "HLTENN040", "HLTENN037"],
    workplace: [
      "Clinical placement: supervised medication round",
      "Complete the medication administration checklist with your clinical facilitator.",
    ],
    video: ["Skills lab demo: aseptic wound dressing", "Step-by-step video, 14 minutes."],
    live: ["Online theory: IV therapy safety", "Calculations and case scenarios."],
  },
  CPC30220: {
    units: ["CPCCCA3003", "CPCCCA3004", "CPCCCA3005"],
    workplace: [
      "On-site task: set out and frame a stud wall",
      "Photo evidence and supervisor sign-off in your logbook.",
    ],
    video: ["Demonstration: marking out top and bottom plates", "Workshop video, 11 minutes."],
    live: ["Online theory: reading framing plans", "Span tables and bracing."],
  },
};

/* ── Early years ── [title, detail, area] */
type Ey = [string, string, string];
interface EyPlan {
  activities: Ey[];
  forHome: T2[];
  observations: Ey[];
}
const EY_PLANS: Record<string, EyPlan> = {
  // Colombo — Upper Nursery (Sri Lankan pre-school / ECCD domains)
  "TG-1206": {
    activities: [
      [
        "Sounds of the week: s and a",
        "Songs, actions and a hunt for things that start with s and a.",
        "Language and literacy",
      ],
      [
        "Counting song: Five Little Ducks",
        "Counting back from five with finger puppets.",
        "Numeracy",
      ],
      [
        "Messy play: mixing colours",
        "Red and yellow, blue and yellow — what do we get?",
        "Creative expression",
      ],
      [
        "Deepavali: decorating clay lamps",
        "Talking about festivals of light and decorating diyas.",
        "World around us",
      ],
      [
        "Outdoor play: planting bean seeds",
        "We will water them every day and watch them grow.",
        "World around us",
      ],
      [
        "Story time: The Very Hungry Caterpillar",
        "Counting the fruit and naming the days of the week.",
        "Language and literacy",
      ],
    ],
    forHome: [
      [
        "Counting songs to sing at home",
        "Five Little Ducks and Ten in the Bed — words and actions.",
      ],
      ["Letter sounds card: s and a", "Spot things at home that start with these sounds."],
    ],
    observations: [
      [
        "Counted five ducks in the song",
        "Counted to five with the finger puppets and held up the right number of fingers. Next step: counting back from five.",
        "Numeracy",
      ],
      [
        "Shared the spades at the sand tray",
        "Offered a spade to a friend without being asked and waited for a turn.",
        "Personal and social",
      ],
      [
        "Made orange!",
        "Mixed red and yellow paint and said “orange!” with a big smile.",
        "Creative expression",
      ],
      [
        "Found things that start with s",
        "Found a sock, a spoon and the sun picture during the sound hunt.",
        "Language and literacy",
      ],
      [
        "Climbed the low frame confidently",
        "Climbed up and down using hands and feet, and waited for her turn on the slide.",
        "Physical development",
      ],
    ],
  },
  // Dubai — FS2 (EYFS)
  "TG-0910": {
    activities: [
      [
        "Phonics: Set 1 sounds m, a, s, d, t",
        "Sound actions, songs and blending games.",
        "Literacy",
      ],
      [
        "Number of the week: 6",
        "Counting, making and finding 6 around the classroom.",
        "Mathematics",
      ],
      [
        "Junk modelling: build a dhow",
        "Boxes, tubes and tape — then a test sail in the water tray.",
        "Expressive Arts and Design",
      ],
      [
        "UAE National Day: flag collage",
        "Talking about the UAE flag colours and what they mean.",
        "Understanding the World",
      ],
      [
        "Ball skills: throwing and catching",
        "Large balls and bean bags in the outdoor area.",
        "Physical Development",
      ],
      [
        "Story time: Handa's Surprise",
        "Predicting what happens next and naming the fruits.",
        "Communication and Language",
      ],
    ],
    forHome: [
      ["Sound mat: Set 1 sounds", "Practise the sounds and actions together."],
      ["Tricky words for home: I, the, to", "Spot them in bedtime stories."],
    ],
    observations: [
      [
        "Wrote his name on his picture",
        "Wrote “Yousef” independently, forming most letters correctly.",
        "Literacy",
      ],
      [
        "Counted six objects and found the numeral 6",
        "Counted carefully, touching each object once.",
        "Mathematics",
      ],
      [
        "Took turns in the role-play shop",
        "Played the shopkeeper and gave change with the play coins.",
        "Personal, Social and Emotional Development",
      ],
      [
        "Cut along a line with scissors",
        "Held the scissors correctly and followed a curved line.",
        "Physical Development",
      ],
      [
        "Explained how he built his dhow",
        "Told the group how he made the sail stand up: “I used two sticks.”",
        "Communication and Language",
      ],
    ],
  },
};

function genericEyPlan(): EyPlan {
  return {
    activities: [
      ["Sounds of the week", "Songs, actions and sound hunts.", "Literacy"],
      ["Counting songs", "Counting to ten with actions.", "Mathematics"],
      ["Messy play", "Exploring colours and textures.", "Expressive Arts and Design"],
      ["Outdoor play", "Running, climbing and balancing.", "Physical Development"],
    ],
    forHome: [["Songs to sing at home", "Words and actions for this week's songs."]],
    observations: [
      ["Joined in the counting song", "Counted along and did the actions.", "Mathematics"],
      [
        "Played well with friends",
        "Shared toys and took turns.",
        "Personal, Social and Emotional Development",
      ],
      [
        "Explored the paint tray",
        "Mixed colours and talked about them.",
        "Expressive Arts and Design",
      ],
      [
        "Listened to the story",
        "Answered a question about the story.",
        "Communication and Language",
      ],
    ],
  };
}

/* ── Generator ──────────────────────────────────────────────────────────── */

interface Meet {
  day: Wd;
  start: string;
  mins: number;
  location?: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function meetingsFor(g: TeachingGroup, slots: TimetableSlot[]): Meet[] {
  const real = slots
    .filter((s) => (WD as readonly string[]).includes(s.day))
    .map((s) => ({
      day: s.day as Wd,
      start: s.start,
      mins: toMin(s.end) - toMin(s.start),
      location: g.room,
    }));
  if (real.length) return real;
  if (g.band === "early")
    return WD.map((day) => ({ day, start: "08:30", mins: 45, location: g.room }));
  if (g.band === "primary") {
    const start = /math/i.test(g.subject) ? "09:40" : "08:00";
    return WD.map((day) => ({ day, start, mins: 60, location: g.room }));
  }
  const h = hash(g.id);
  const he = g.band === "higher-ed" || g.band === "vocational";
  return [
    {
      day: WD[h % 5],
      start: he ? ["09:00", "11:00", "14:00"][h % 3] : "10:05",
      mins: he ? 120 : 60,
      location: g.room,
    },
    {
      day: WD[(h + 2) % 5],
      start: he ? ["10:00", "13:00", "15:00"][h % 3] : "12:45",
      mins: he ? 60 : 60,
      location: g.room,
    },
  ];
}

/** Occurrences of a weekly pattern from last week to the week after next. */
function occurrences(meets: Meet[]): (Meet & { date: string })[] {
  const out: (Meet & { date: string })[] = [];
  for (let w = -1; w <= 2; w++) for (const m of meets) out.push({ ...m, date: dateFor(m.day, w) });
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export interface SeedInput {
  groups: TeachingGroup[];
  learners: Learner[];
  slots: TimetableSlot[];
  modules: HeModule[];
  qualifications: Qualification[];
}

/** Deterministic learning items for every teaching group (pure). */
export function buildLearningItems(i: SeedInput): LearningItem[] {
  const out: LearningItem[] = [];
  let n = 0;
  const add = (g: TeachingGroup, it: Omit<LearningItem, "id" | "tenantId" | "groupId">) =>
    out.push({
      id: `LI-${String(++n).padStart(4, "0")}`,
      tenantId: g.tenantId,
      groupId: g.id,
      author: g.teacher || undefined,
      ...it,
    });

  for (const g of i.groups) {
    const slots = slotsForGroup(g, i.slots, i.learners);
    const occ = occurrences(meetingsFor(g, slots));
    const past = occ.filter((o) => o.date < DEMO_TODAY);
    const upcoming = occ.filter((o) => o.date >= DEMO_TODAY);
    const last = past[past.length - 1];
    const author = g.teacher || slots[0]?.teacherName || undefined;

    if (g.band === "early") {
      const p = EY_PLANS[g.id] ?? genericEyPlan();
      const days = [-4, -3, -2, 0, 1, 2]; // Wed last week … Wed this week
      p.activities.forEach(([title, detail, area], k) =>
        add(g, {
          kind: "Activity",
          title,
          detail,
          area,
          topic: area,
          date: isoAddDays(DEMO_MONDAY, days[k % days.length]),
          start: k % 2 ? "10:30" : "08:30",
          durationMins: 45,
          location: g.room,
          sharedWithFamily: true,
          author,
        }),
      );
      p.forHome.forEach(([title, detail]) =>
        add(g, {
          kind: "Resource",
          title,
          detail,
          topic: "For home",
          date: isoAddDays(DEMO_MONDAY, -3),
          sharedWithFamily: true,
          author,
        }),
      );
      for (const sid of g.studentIds) {
        p.observations.forEach(([title, detail, area], k) =>
          add(g, {
            kind: "Observation",
            title,
            detail,
            area,
            topic: area,
            studentId: sid,
            date: isoAddDays(DEMO_MONDAY, -12 + k * 3),
            sharedWithFamily: true,
            author,
          }),
        );
      }
      continue;
    }

    if (g.kind === "class") {
      const p = SCHOOL_PLANS[g.id] ?? genericSchoolPlan(g);
      const young = g.band === "primary";
      const lessonOcc = [last, ...upcoming.slice(0, 3)];
      p.lessons.forEach((title, k) => {
        const o = lessonOcc[k];
        if (!o) return;
        add(g, {
          kind: "Lesson",
          title,
          topic: p.unit,
          date: o.date,
          start: o.start,
          durationMins: o.mins,
          location: o.location,
          author,
        });
      });
      p.resources.forEach(([title, detail, topic]) =>
        add(g, {
          kind: "Resource",
          title,
          detail,
          topic: topic ?? p.unit,
          date: isoAddDays(DEMO_MONDAY, -5),
          author,
        }),
      );
      add(g, {
        kind: "Activity",
        title: p.homework[0],
        detail: p.homework[1],
        topic: p.unit,
        date: DEMO_MONDAY,
        due: young ? isoAddDays(DEMO_MONDAY, 4) : isoAddDays(DEMO_MONDAY, 3),
        author,
      });
      add(g, {
        kind: "Quiz",
        title: p.quiz[0],
        detail: p.quiz[1],
        topic: p.unit,
        date: isoAddDays(DEMO_MONDAY, young ? 4 : 1),
        due: isoAddDays(DEMO_MONDAY, young ? 4 : 7),
        author,
      });
      if (p.live)
        add(g, {
          kind: "Live class",
          title: p.live[0],
          detail: p.live[1],
          topic: p.unit,
          date: isoAddDays(DEMO_MONDAY, 2),
          start: young ? "18:00" : "16:00",
          durationMins: young ? 30 : 45,
          location: g.tenantId === "T-012" ? "Online (Zoom)" : "Online (Teams)",
          author,
        });
      if (p.recording)
        add(g, {
          kind: "Recording",
          title: p.recording[0],
          detail: p.recording[1],
          topic: p.unit,
          date: isoAddDays(DEMO_MONDAY, -6),
          author,
        });
      continue;
    }

    if (g.kind === "module") {
      const m = i.modules.find((x) => x.id === g.id);
      const t: HeTopics = HE_TOPICS[g.code] ?? [
        `${g.title}: foundations`,
        `${g.title}: core ideas`,
        `${g.title}: applications`,
        `${g.title} reading list`,
        "Seminar",
      ];
      const [prev, cur, next, reading, kind] = t;
      const term = moduleTerm(g.tenantId, m?.semester);
      const finished = term === "finished";
      if (term === "upcoming") {
        // Semester 2 has not started yet — welcome material only.
        const wk1 = "2027-01-25";
        add(g, {
          kind: "Resource",
          title: "Module handbook 2026/27",
          detail: "Aims, weekly plan and assessment.",
          topic: "Getting started",
          date: "2026-10-15",
        });
        add(g, {
          kind: "Resource",
          title: `Pre-reading: ${reading}`,
          detail: "Read before week 1.",
          topic: "Getting started",
          date: "2026-10-15",
        });
        add(g, {
          kind: "Live class",
          title: "Module welcome Q&A",
          detail: "Meet the module team and ask about assessment.",
          topic: "Getting started",
          date: "2027-01-20",
          start: "12:00",
          durationMins: 45,
          location: "Online (Teams)",
        });
        add(g, {
          kind: "Lesson",
          title: `Week 1 lecture: ${prev}`,
          topic: prev,
          date: wk1,
          start: "10:00",
          durationMins: 120,
        });
        add(g, {
          kind: "Lesson",
          title: `Week 1 ${kind.toLowerCase()}: ${prev}`,
          topic: prev,
          date: isoAddDays(wk1, 2),
          start: "14:00",
          durationMins: 120,
        });
        add(g, {
          kind: "Quiz",
          title: "Diagnostic quiz",
          detail: "Not marked — helps us plan week 1.",
          topic: "Getting started",
          date: "2027-01-18",
          due: "2027-01-29",
        });
        continue;
      }
      if (finished) {
        add(g, {
          kind: "Recording",
          title: `Lecture recordings: ${prev}`,
          detail: "Archive from semester 1.",
          topic: prev,
          date: "2026-04-14",
        });
        add(g, {
          kind: "Recording",
          title: `Lecture recordings: ${cur}`,
          detail: "Archive from semester 1.",
          topic: cur,
          date: "2026-05-12",
        });
        add(g, {
          kind: "Resource",
          title: "Module handbook",
          detail: "Kept for reference.",
          topic: "Module information",
          date: "2026-02-16",
        });
        add(g, {
          kind: "Resource",
          title: "Exam feedback",
          detail: "General feedback on the semester 1 exam.",
          topic: "Module information",
          date: "2026-07-10",
        });
        add(g, {
          kind: "Resource",
          title: `Reading: ${reading}`,
          topic: cur,
          date: "2026-02-16",
        });
        add(g, {
          kind: "Quiz",
          title: "Practice exam",
          detail: "Closed — kept for revision.",
          topic: "Module information",
          date: "2026-06-01",
        });
        continue;
      }
      // Teaching now.
      const revision = g.tenantId === "T-011";
      const lecOcc = [last, ...upcoming.slice(0, 3)];
      const titles = revision
        ? [`Revision: ${prev}`, `Revision: ${cur}`, "Exam briefing", `${kind}: past paper practice`]
        : [`Lecture: ${prev}`, `Lecture: ${cur}`, `${kind}: ${cur}`, `Lecture: ${next}`];
      titles.forEach((title, k) => {
        const o = lecOcc[k];
        if (!o) return;
        add(g, {
          kind: "Lesson",
          title,
          topic: k === 0 ? prev : k === 3 && !revision ? next : cur,
          date: o.date,
          start: o.start,
          durationMins: o.mins,
          location: k === 2 ? `${kind} room` : undefined,
        });
      });
      if (last)
        add(g, {
          kind: "Recording",
          title: `Lecture recording: ${prev}`,
          detail: "Captions available.",
          topic: prev,
          date: last.date,
          durationMins: last.mins,
        });
      add(g, {
        kind: "Resource",
        title: `${kind} sheet: ${cur}`,
        detail: kind === "Lab" ? "Exercises and starter code." : "Questions to prepare.",
        topic: cur,
        date: isoAddDays(DEMO_MONDAY, -3),
      });
      add(g, {
        kind: "Resource",
        title: `Reading: ${reading}`,
        detail: "Core reading on the library list.",
        topic: cur,
        date: isoAddDays(DEMO_MONDAY, -7),
      });
      add(g, {
        kind: "Quiz",
        title: revision ? "Practice exam" : `Formative quiz: ${prev}`,
        detail: revision ? "Timed, 2 hours. Not marked." : "Not marked. Instant feedback.",
        topic: prev,
        date: isoAddDays(DEMO_MONDAY, -1),
        due: isoAddDays(DEMO_MONDAY, 6),
      });
      add(g, {
        kind: "Live class",
        title: revision ? "Exam Q&A" : "Online office hours",
        detail: revision ? "Last questions before the exam." : "Drop in with questions.",
        topic: cur,
        date: isoAddDays(DEMO_MONDAY, 2),
        start: "16:00",
        durationMins: 60,
        location: "Online (Teams)",
      });
      const nextCw = m?.components
        .filter((c) => c.due && c.due >= DEMO_TODAY)
        .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))[0];
      if (nextCw)
        add(g, {
          kind: "Activity",
          title: nextCw.type === "Exam" ? `${g.code} exam` : nextCw.name,
          detail: `${nextCw.type} · ${nextCw.weight}% of the module mark.`,
          topic: "Assessment",
          date: isoAddDays(DEMO_MONDAY, -14),
          due: nextCw.due,
        });
      continue;
    }

    // Qualification (vocational).
    const q = i.qualifications.find((x) => x.id === g.id);
    const vp = VET_PLANS[g.code];
    const unitCodes = vp?.units ?? q?.units.slice(0, 3).map((u) => u.code) ?? [];
    const units = unitCodes
      .map((code) => q?.units.find((u) => u.code === code))
      .filter((u): u is NonNullable<typeof u> => !!u);
    const label = (u: (typeof units)[number]) => `${u.code} ${u.title}`;
    const sessOcc = [last, ...upcoming.slice(0, 2)];
    units.forEach((u, k) => {
      const o = sessOcc[k];
      if (!o) return;
      add(g, {
        kind: "Lesson",
        title: k === 0 ? `Recap: ${u.title}` : u.title,
        topic: label(u),
        date: o.date,
        start: o.start,
        durationMins: o.mins,
        author,
      });
    });
    const cu = units[1] ?? units[0];
    if (cu) {
      add(g, {
        kind: "Resource",
        title: `Learner guide: ${cu.code}`,
        detail: cu.title,
        topic: label(cu),
        date: isoAddDays(DEMO_MONDAY, -7),
        author,
      });
      add(g, {
        kind: "Resource",
        title: `Assessment tool: ${cu.code}`,
        detail: "Observation checklist and evidence guide.",
        topic: label(cu),
        date: isoAddDays(DEMO_MONDAY, -7),
        author,
      });
      add(g, {
        kind: "Quiz",
        title: `Knowledge check: ${cu.code}`,
        detail: "Short-answer questions. Resubmit until satisfactory.",
        topic: label(cu),
        date: isoAddDays(DEMO_MONDAY, -2),
        due: isoAddDays(DEMO_MONDAY, 9),
        author,
      });
      add(g, {
        kind: "Activity",
        title: `Practical assessment: ${cu.title}`,
        detail: "Observed by your trainer. Bring PPE.",
        topic: label(cu),
        date: upcoming[1]?.date ?? isoAddDays(DEMO_MONDAY, 7),
        due: upcoming[1]?.date ?? isoAddDays(DEMO_MONDAY, 7),
        author,
      });
    }
    if (vp) {
      add(g, {
        kind: "Activity",
        title: vp.workplace[0],
        detail: vp.workplace[1],
        topic: "Workplace",
        date: isoAddDays(DEMO_MONDAY, -5),
        due: isoAddDays(DEMO_MONDAY, 12),
        location: "Workplace",
        author,
      });
      add(g, {
        kind: "Recording",
        title: vp.video[0],
        detail: vp.video[1],
        topic: cu ? label(cu) : "Recordings",
        date: isoAddDays(DEMO_MONDAY, -6),
        author,
      });
      add(g, {
        kind: "Live class",
        title: vp.live[0],
        detail: vp.live[1],
        topic: cu ? label(cu) : "Online",
        date: isoAddDays(DEMO_MONDAY, 3),
        start: "18:00",
        durationMins: 60,
        location: "Online (Teams)",
        author,
      });
    }
  }
  return out;
}

const seedGroups: TeachingGroup[] = [
  ...buildTeachingGroups({
    subjectClasses: seedClasses,
    heModules: seedModules,
    moduleRegistrations: seedRegistrations,
    qualifications: seedQualifications,
    learners: seedLearners,
  }),
  ...journalGroups(seedLearners, seedTutorGroups),
];

export const learningItems: LearningItem[] = buildLearningItems({
  groups: seedGroups,
  learners: seedLearners,
  slots: seedSlots,
  modules: seedModules,
  qualifications: seedQualifications,
});
