/**
 * International School Pack — data model + seed.
 * Curricula (each bound to an academic calendar), tutor groups, houses,
 * external exam entries + predicted grades, parent–teacher meetings and
 * school-life services (boarding, transport, activities, trips with consent).
 */

export interface Curriculum {
  id: string;
  tenantId: string;
  name: string;
  framework: "British" | "IB" | "CBSE" | "Sri Lankan National" | "Australian" | "American";
  calendarId: string;
  yearGroups: string[];
  examBoards: string[];
  /** Grade scale used for predicted / final grades. */
  gradeScale: string[];
  /** Named stages of the programme (early years, key stages, qualification
   *  phases), each covering some of `yearGroups`. Display + reporting only. */
  stages?: { name: string; yearGroups: string[]; qualification?: string }[];
}

export interface TutorGroup {
  id: string;
  tenantId: string;
  name: string; // "10C"
  yearGroup: string;
  curriculumId: string;
  tutor: string;
  room?: string;
  /** Soft limit — the classes page warns above it. */
  capacity?: number;
}

export interface House {
  id: string;
  tenantId: string;
  name: string;
  colour: string; // tailwind-ish hex
  head: string;
}

export interface HousePointAward {
  id: string;
  tenantId: string;
  houseId: string;
  studentId?: string;
  points: number;
  reason: string;
  by: string;
  at: string;
}

export type EntryStatus = "Draft" | "Entered" | "Amended" | "Withdrawn";

export interface ExamEntry {
  id: string;
  tenantId: string;
  studentId: string;
  board: string; // "Cambridge International"
  qualification: string; // "IGCSE", "A Level", "IB DP", "G.C.E. O/L"
  subject: string;
  syllabusCode: string;
  series: string; // "May/June 2027"
  candidateNumber?: string;
  status: EntryStatus;
  fee: number;
  predictedGrade?: string;
  predictedBy?: string;
  deadline: string;
}

export interface PtmEvent {
  id: string;
  tenantId: string;
  name: string;
  date: string;
  start: string; // "15:30"
  end: string; // "18:30"
  slotMinutes: number;
  teachers: string[];
  yearGroups: string[];
  mode: "In person" | "Online" | "Both";
  bookingOpen: boolean;
}

export interface PtmBooking {
  id: string;
  tenantId: string;
  eventId: string;
  teacherName: string;
  time: string; // "16:10"
  parentName: string;
  studentId: string;
  mode: "In person" | "Online";
}

export type ServiceKind = "Boarding" | "Transport" | "Activity" | "Trip";

export interface SchoolService {
  id: string;
  tenantId: string;
  kind: ServiceKind;
  name: string;
  detail: string;
  fee: number;
  /** Currency override (second pricing currency), else tenant currency. */
  currency?: string;
  capacity: number;
  schedule?: string;
  date?: string;
  requiresConsent: boolean;
  consentDeadline?: string;
  leader: string;
}

export interface ServiceEnrolment {
  id: string;
  tenantId: string;
  serviceId: string;
  studentId: string;
  status: "Requested" | "Confirmed" | "Waitlist" | "Declined";
  consentBy?: string;
  consentAt?: string;
  paid: boolean;
}

/* ── Seed ────────────────────────────────────────────────────────────────── */

/** Grade scales per framework — used for predicted and final grades. */
export const GRADE_SCALES: Record<Curriculum["framework"], string[]> = {
  British: ["A*", "A", "B", "C", "D", "E", "U", "9", "8", "7", "6", "5", "4", "3", "2", "1"],
  IB: ["7", "6", "5", "4", "3", "2", "1"],
  CBSE: ["A1", "A2", "B1", "B2", "C1", "C2", "D", "E"],
  "Sri Lankan National": ["A", "B", "C", "S", "W"],
  Australian: ["A", "B", "C", "D", "E"],
  American: ["A", "B", "C", "D", "F"],
};

/** IGCSE uses 9–1 (or A*–G); A Level uses A*–E. */
export function gradeOptionsFor(qualification: string): string[] {
  const q = qualification.toLowerCase();
  if (q.includes("ib")) return GRADE_SCALES.IB;
  if (q.includes("igcse") || q.includes("gcse"))
    return ["9", "8", "7", "6", "5", "4", "3", "2", "1", "U"];
  if (q.includes("a level") || q.includes("as level")) return ["A*", "A", "B", "C", "D", "E", "U"];
  if (q.includes("o/l") || q.includes("a/l")) return GRADE_SCALES["Sri Lankan National"];
  if (q.includes("cbse")) return GRADE_SCALES.CBSE;
  return GRADE_SCALES.British;
}

export const curricula: Curriculum[] = [
  {
    id: "CUR-0901",
    tenantId: "T-009",
    name: "British — EYFS to A Level",
    framework: "British",
    calendarId: "CAL-0901",
    yearGroups: [
      "FS1",
      "FS2",
      "Year 1",
      "Year 2",
      "Year 3",
      "Year 4",
      "Year 5",
      "Year 6",
      "Year 7",
      "Year 8",
      "Year 9",
      "Year 10",
      "Year 11",
      "Year 12",
      "Year 13",
    ],
    examBoards: ["Cambridge International", "Pearson Edexcel"],
    stages: [
      { name: "Early Years Foundation Stage", yearGroups: ["FS1", "FS2"] },
      { name: "Key Stage 1", yearGroups: ["Year 1", "Year 2"] },
      { name: "Key Stage 2", yearGroups: ["Year 3", "Year 4", "Year 5", "Year 6"] },
      { name: "Key Stage 3", yearGroups: ["Year 7", "Year 8", "Year 9"] },
      {
        name: "Key Stage 4",
        yearGroups: ["Year 10", "Year 11"],
        qualification: "IGCSE / International GCSE",
      },
      { name: "Sixth Form", yearGroups: ["Year 12", "Year 13"], qualification: "AS & A Level" },
    ],
    gradeScale: ["9", "8", "7", "6", "5", "4", "3", "2", "1", "A*", "A", "B", "C", "D", "E", "U"],
  },
  {
    id: "CUR-0902",
    tenantId: "T-009",
    name: "IB — MYP & Diploma Programme",
    framework: "IB",
    calendarId: "CAL-0901",
    yearGroups: ["MYP 4", "MYP 5", "IB DP Year 1", "IB DP Year 2"],
    examBoards: ["International Baccalaureate"],
    gradeScale: GRADE_SCALES.IB,
  },
  {
    id: "CUR-0903",
    tenantId: "T-009",
    name: "Indian — CBSE",
    framework: "CBSE",
    calendarId: "CAL-0902",
    yearGroups: [
      "Nursery",
      "LKG",
      "UKG",
      "Grade 1",
      "Grade 2",
      "Grade 3",
      "Grade 4",
      "Grade 5",
      "Grade 6",
      "Grade 7",
      "Grade 8",
      "Grade 9",
      "Grade 10",
      "Grade 11",
      "Grade 12",
    ],
    examBoards: ["CBSE"],
    stages: [
      { name: "Pre-primary", yearGroups: ["Nursery", "LKG", "UKG"] },
      { name: "Primary", yearGroups: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"] },
      { name: "Middle", yearGroups: ["Grade 6", "Grade 7", "Grade 8"] },
      { name: "Secondary", yearGroups: ["Grade 9", "Grade 10"], qualification: "AISSE (Class X)" },
      {
        name: "Senior Secondary",
        yearGroups: ["Grade 11", "Grade 12"],
        qualification: "AISSCE (Class XII)",
      },
    ],
    gradeScale: GRADE_SCALES.CBSE,
  },
  {
    id: "CUR-1201",
    tenantId: "T-012",
    name: "Cambridge International — Early Years to A Level",
    framework: "British",
    calendarId: "CAL-1201",
    // Sri Lankan international-school naming for the early years.
    yearGroups: [
      "Lower Nursery",
      "Upper Nursery",
      "Pre-Grade",
      "Year 1",
      "Year 2",
      "Year 3",
      "Year 4",
      "Year 5",
      "Year 6",
      "Year 7",
      "Year 8",
      "Year 9",
      "Year 10",
      "Year 11",
      "Year 12",
      "Year 13",
    ],
    examBoards: ["Cambridge International", "Department of Examinations (O/L)"],
    gradeScale: ["A*", "A", "B", "C", "D", "E", "U"],
    stages: [
      { name: "Early Years", yearGroups: ["Lower Nursery", "Upper Nursery", "Pre-Grade"] },
      {
        name: "Cambridge Primary",
        yearGroups: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
      },
      { name: "Cambridge Lower Secondary", yearGroups: ["Year 7", "Year 8", "Year 9"] },
      {
        name: "Cambridge IGCSE",
        yearGroups: ["Year 10", "Year 11"],
        qualification: "Cambridge IGCSE (+ optional G.C.E. O/L)",
      },
      {
        name: "Cambridge Advanced",
        yearGroups: ["Year 12", "Year 13"],
        qualification: "Cambridge International AS & A Level",
      },
    ],
  },
  {
    id: "CUR-1202",
    tenantId: "T-012",
    name: "Pearson Edexcel International — Lower Secondary to A Level",
    framework: "British",
    calendarId: "CAL-1201",
    yearGroups: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"],
    examBoards: ["Pearson Edexcel"],
    gradeScale: ["9", "8", "7", "6", "5", "4", "3", "2", "1", "A*", "A", "B", "C", "D", "E", "U"],
    stages: [
      { name: "Pearson iLowerSecondary", yearGroups: ["Year 7", "Year 8", "Year 9"] },
      {
        name: "International GCSE",
        yearGroups: ["Year 10", "Year 11"],
        qualification: "Pearson Edexcel International GCSE (9–1)",
      },
      {
        name: "International A Level",
        yearGroups: ["Year 12", "Year 13"],
        qualification: "Pearson Edexcel International AS / A Level",
      },
    ],
  },
];

export const tutorGroups: TutorGroup[] = [
  {
    id: "TG-0901",
    tenantId: "T-009",
    name: "10C",
    yearGroup: "Year 10",
    curriculumId: "CUR-0901",
    tutor: "Mr. James Carter",
    room: "S-204",
    capacity: 24,
  },
  {
    id: "TG-0902",
    tenantId: "T-009",
    name: "11A",
    yearGroup: "Year 11",
    curriculumId: "CUR-0901",
    tutor: "Ms. Emma Lewis",
    room: "M-112",
    capacity: 24,
  },
  {
    id: "TG-0903",
    tenantId: "T-009",
    name: "12B",
    yearGroup: "Year 12",
    curriculumId: "CUR-0901",
    tutor: "Mrs. Claire Dawson",
    room: "E-301",
    capacity: 20,
  },
  {
    id: "TG-0904",
    tenantId: "T-009",
    name: "DP2",
    yearGroup: "IB DP Year 2",
    curriculumId: "CUR-0902",
    tutor: "Dr. Marcus Webb",
    room: "IB-01",
    capacity: 20,
  },
  {
    id: "TG-0905",
    tenantId: "T-009",
    name: "7B",
    yearGroup: "Grade 7",
    curriculumId: "CUR-0903",
    tutor: "Ms. Anjali Menon",
    room: "C-108",
    capacity: 30,
  },
  {
    // New second Year 10 form — empty, ready for "Add pupils" / "Auto-place".
    id: "TG-0906",
    tenantId: "T-009",
    name: "10D",
    yearGroup: "Year 10",
    curriculumId: "CUR-0901",
    tutor: "Mr. Yusuf Ali",
    room: "A3",
    capacity: 24,
  },
  {
    id: "TG-1201",
    tenantId: "T-012",
    name: "10A",
    yearGroup: "Year 10",
    curriculumId: "CUR-1201",
    tutor: "Mr. Sanjeewa Perera",
    room: "B-12",
    capacity: 26,
  },
  {
    id: "TG-1202",
    tenantId: "T-012",
    name: "11A",
    yearGroup: "Year 11",
    curriculumId: "CUR-1201",
    tutor: "Mrs. Dilrukshi Gunawardena",
    room: "B-14",
    capacity: 26,
  },
  {
    id: "TG-1203",
    tenantId: "T-012",
    name: "12A",
    yearGroup: "Year 12",
    curriculumId: "CUR-1202",
    tutor: "Mr. Sanjeewa Perera",
    room: "Science Lab",
    capacity: 20,
  },
  {
    id: "TG-1204",
    tenantId: "T-012",
    name: "13A",
    yearGroup: "Year 13",
    curriculumId: "CUR-1202",
    tutor: "Mrs. Dilrukshi Gunawardena",
    room: "B-16",
    capacity: 20,
  },
  {
    id: "TG-1205",
    tenantId: "T-012",
    name: "3B",
    yearGroup: "Year 3",
    curriculumId: "CUR-1201",
    tutor: "Ms. Ishara Fernando",
    room: "Room 3B",
    capacity: 28,
  },
  {
    id: "TG-1206",
    tenantId: "T-012",
    name: "UN Butterflies",
    yearGroup: "Upper Nursery",
    curriculumId: "CUR-1201",
    tutor: "Mrs. Nadeesha Silva",
    room: "Early Years Block",
    capacity: 18,
  },
  {
    id: "TG-0910",
    tenantId: "T-009",
    name: "FS2 Falcons",
    yearGroup: "FS2",
    curriculumId: "CUR-0901",
    tutor: "Ms. Laura Bennett",
    room: "EY-02",
    capacity: 20,
  },
];

export const houses: House[] = [
  { id: "HSE-0901", tenantId: "T-009", name: "Falcon", colour: "#dc2626", head: "Ms. Emma Lewis" },
  { id: "HSE-0902", tenantId: "T-009", name: "Oryx", colour: "#2563eb", head: "Mr. Yusuf Ali" },
  {
    id: "HSE-0903",
    tenantId: "T-009",
    name: "Gazelle",
    colour: "#16a34a",
    head: "Mrs. Claire Dawson",
  },
  { id: "HSE-0904", tenantId: "T-009", name: "Dhow", colour: "#d97706", head: "Mr. James Carter" },
  {
    id: "HSE-1201",
    tenantId: "T-012",
    name: "Lotus",
    colour: "#db2777",
    head: "Mrs. Dilrukshi Gunawardena",
  },
  {
    id: "HSE-1202",
    tenantId: "T-012",
    name: "Peacock",
    colour: "#0891b2",
    head: "Mr. Sanjeewa Perera",
  },
];

const hp = (
  id: string,
  houseId: string,
  points: number,
  reason: string,
  by: string,
  at: string,
  studentId?: string,
): HousePointAward => ({
  id,
  tenantId: houseId.startsWith("HSE-12") ? "T-012" : "T-009",
  houseId,
  studentId,
  points,
  reason,
  by,
  at,
});

export const housePoints: HousePointAward[] = [
  hp(
    "HP-1001",
    "HSE-0901",
    120,
    "Inter-house swimming gala — 1st place",
    "Hannah Clarke",
    "2026-10-08T14:00:00Z",
  ),
  hp(
    "HP-1002",
    "HSE-0902",
    90,
    "Inter-house swimming gala — 2nd place",
    "Hannah Clarke",
    "2026-10-08T14:00:00Z",
  ),
  hp(
    "HP-1003",
    "HSE-0903",
    60,
    "Inter-house swimming gala — 3rd place",
    "Hannah Clarke",
    "2026-10-08T14:00:00Z",
  ),
  hp(
    "HP-1004",
    "HSE-0904",
    40,
    "Inter-house swimming gala — 4th place",
    "Hannah Clarke",
    "2026-10-08T14:00:00Z",
  ),
  hp(
    "HP-1005",
    "HSE-0904",
    15,
    "Outstanding physics practical write-up",
    "Mr. James Carter",
    "2026-10-21T09:10:00Z",
    "S-3008",
  ),
  hp(
    "HP-1006",
    "HSE-0901",
    10,
    "Science fair — best poster",
    "Mr. James Carter",
    "2026-10-23T11:00:00Z",
    "S-3001",
  ),
  hp(
    "HP-1007",
    "HSE-0903",
    25,
    "UAE National Day assembly performance",
    "Mr. Yusuf Ali",
    "2026-10-27T08:30:00Z",
    "S-3007",
  ),
  hp(
    "HP-1008",
    "HSE-0902",
    20,
    "CBSE maths olympiad — merit",
    "Ms. Anjali Menon",
    "2026-10-29T10:00:00Z",
    "S-3002",
  ),
  hp(
    "HP-1009",
    "HSE-0904",
    30,
    "Debating league win",
    "Mrs. Claire Dawson",
    "2026-10-30T15:00:00Z",
    "S-3005",
  ),
  hp(
    "HP-1010",
    "HSE-0901",
    12,
    "Community service — beach clean-up",
    "Dr. Marcus Webb",
    "2026-10-31T09:00:00Z",
    "S-3009",
  ),
  hp(
    "HP-1201",
    "HSE-1201",
    70,
    "Sports meet — relay",
    "Mrs. Dilrukshi Gunawardena",
    "2026-10-15T12:00:00Z",
  ),
  hp(
    "HP-1202",
    "HSE-1202",
    85,
    "Sports meet — athletics",
    "Mrs. Dilrukshi Gunawardena",
    "2026-10-15T12:00:00Z",
  ),
];

const ee = (
  id: string,
  studentId: string,
  board: string,
  qualification: string,
  subject: string,
  syllabusCode: string,
  series: string,
  status: EntryStatus,
  fee: number,
  deadline: string,
  extra: Partial<ExamEntry> = {},
): ExamEntry => ({
  id,
  tenantId: studentId.startsWith("S-31") ? "T-012" : "T-009",
  studentId,
  board,
  qualification,
  subject,
  syllabusCode,
  series,
  status,
  fee,
  deadline,
  ...extra,
});

const CIE = "Cambridge International";
const PE = "Pearson Edexcel";
const IBO = "International Baccalaureate";
const MJ27 = "May/June 2027";
const IGCSE_DL = "2027-02-21";

export const examEntries: ExamEntry[] = [
  // Year 11 — IGCSE entries already submitted
  ee("EX-1001", "S-3003", CIE, "IGCSE", "Physics", "0625", MJ27, "Entered", 620, IGCSE_DL, {
    candidateNumber: "0417",
    predictedGrade: "6",
    predictedBy: "Mr. James Carter",
  }),
  ee("EX-1002", "S-3003", CIE, "IGCSE", "Mathematics", "0580", MJ27, "Entered", 620, IGCSE_DL, {
    candidateNumber: "0417",
    predictedGrade: "7",
    predictedBy: "Ms. Emma Lewis",
  }),
  ee(
    "EX-1003",
    "S-3003",
    CIE,
    "IGCSE",
    "English as a Second Language",
    "0510",
    MJ27,
    "Entered",
    580,
    IGCSE_DL,
    { candidateNumber: "0417", predictedGrade: "6", predictedBy: "Mrs. Claire Dawson" },
  ),
  ee("EX-1004", "S-3007", CIE, "IGCSE", "Physics", "0625", MJ27, "Entered", 620, IGCSE_DL, {
    candidateNumber: "0422",
    predictedGrade: "8",
    predictedBy: "Mr. James Carter",
  }),
  ee("EX-1005", "S-3007", CIE, "IGCSE", "Mathematics", "0580", MJ27, "Entered", 620, IGCSE_DL, {
    candidateNumber: "0422",
    predictedGrade: "8",
    predictedBy: "Ms. Emma Lewis",
  }),
  ee(
    "EX-1006",
    "S-3007",
    CIE,
    "IGCSE",
    "Arabic — First Language",
    "0508",
    MJ27,
    "Amended",
    580,
    IGCSE_DL,
    { candidateNumber: "0422", predictedGrade: "9", predictedBy: "Mr. Yusuf Ali" },
  ),
  // Year 10 — drafts awaiting entry (sitting a year early for some subjects)
  ee("EX-1010", "S-3001", CIE, "IGCSE", "Physics", "0625", MJ27, "Draft", 620, IGCSE_DL, {
    predictedGrade: "8",
    predictedBy: "Mr. James Carter",
  }),
  ee("EX-1011", "S-3001", CIE, "IGCSE", "Mathematics", "0580", MJ27, "Draft", 620, IGCSE_DL),
  ee(
    "EX-1012",
    "S-3001",
    CIE,
    "IGCSE",
    "English — First Language",
    "0500",
    MJ27,
    "Draft",
    580,
    IGCSE_DL,
  ),
  ee("EX-1013", "S-3005", CIE, "IGCSE", "Physics", "0625", MJ27, "Draft", 620, IGCSE_DL),
  ee("EX-1014", "S-3005", CIE, "IGCSE", "Mathematics", "0580", MJ27, "Draft", 620, IGCSE_DL),
  ee("EX-1015", "S-3008", CIE, "IGCSE", "Physics", "0625", MJ27, "Draft", 620, IGCSE_DL, {
    predictedGrade: "6",
    predictedBy: "Mr. James Carter",
  }),
  ee("EX-1016", "S-3008", CIE, "IGCSE", "Mathematics", "0580", MJ27, "Draft", 620, IGCSE_DL),
  // Year 12 — Pearson Edexcel International A Level (AS units)
  ee(
    "EX-1020",
    "S-3006",
    PE,
    "International AS Level",
    "Physics (Unit 1)",
    "WPH11",
    "January 2027",
    "Entered",
    540,
    "2026-10-04",
    { candidateNumber: "3102", predictedGrade: "A", predictedBy: "Mr. James Carter" },
  ),
  ee(
    "EX-1021",
    "S-3006",
    PE,
    "International A Level",
    "Mathematics",
    "YMA01",
    MJ27,
    "Draft",
    1450,
    "2027-02-21",
    { predictedGrade: "A*", predictedBy: "Ms. Emma Lewis" },
  ),
  ee(
    "EX-1022",
    "S-3006",
    PE,
    "International A Level",
    "Chemistry",
    "YCH11",
    MJ27,
    "Draft",
    1450,
    "2027-02-21",
  ),
  // IB DP Year 2 — registered with the IBO
  ee(
    "EX-1030",
    "S-3004",
    IBO,
    "IB DP",
    "Physics HL",
    "PHY-HL",
    "May 2027",
    "Entered",
    1180,
    "2026-11-15",
    { candidateNumber: "abc123-0007", predictedGrade: "6", predictedBy: "Mr. James Carter" },
  ),
  ee(
    "EX-1031",
    "S-3004",
    IBO,
    "IB DP",
    "English A: Language & Literature SL",
    "ENG-A-SL",
    "May 2027",
    "Entered",
    1180,
    "2026-11-15",
    { candidateNumber: "abc123-0007", predictedGrade: "6", predictedBy: "Mrs. Claire Dawson" },
  ),
  ee(
    "EX-1032",
    "S-3009",
    IBO,
    "IB DP",
    "Physics HL",
    "PHY-HL",
    "May 2027",
    "Draft",
    1180,
    "2026-11-15",
  ),
  ee(
    "EX-1033",
    "S-3009",
    IBO,
    "IB DP",
    "Mathematics: AA HL",
    "MAA-HL",
    "May 2027",
    "Draft",
    1180,
    "2026-11-15",
    { predictedGrade: "7", predictedBy: "Ms. Emma Lewis" },
  ),
  // Colombo — Sri Lankan O/L alongside IGCSE
  ee(
    "EX-1201",
    "S-3103",
    "Department of Examinations",
    "G.C.E. O/L",
    "Science",
    "34",
    "December 2026",
    "Entered",
    0,
    "2026-06-30",
    { candidateNumber: "1123456", predictedGrade: "A" },
  ),
  ee("EX-1202", "S-3101", CIE, "IGCSE", "Physics", "0625", MJ27, "Draft", 52000, IGCSE_DL),
];

export const ptmEvents: PtmEvent[] = [
  {
    id: "PTM-0901",
    tenantId: "T-009",
    name: "Year 10 & 11 Parent–Teacher Evening",
    date: "2026-11-19",
    start: "15:30",
    end: "18:30",
    slotMinutes: 10,
    teachers: ["Mr. James Carter", "Ms. Emma Lewis", "Mrs. Claire Dawson", "Mr. Yusuf Ali"],
    yearGroups: ["Year 10", "Year 11"],
    mode: "Both",
    bookingOpen: true,
  },
  {
    id: "PTM-0902",
    tenantId: "T-009",
    name: "CBSE Grade 7 Term 1 Review",
    date: "2026-11-26",
    start: "14:30",
    end: "16:30",
    slotMinutes: 10,
    teachers: ["Ms. Anjali Menon", "Mr. Yusuf Ali"],
    yearGroups: ["Grade 7"],
    mode: "In person",
    bookingOpen: true,
  },
  {
    id: "PTM-0903",
    tenantId: "T-009",
    name: "Settling-in Meetings (new families)",
    date: "2026-09-24",
    start: "15:00",
    end: "17:00",
    slotMinutes: 15,
    teachers: ["Mr. James Carter", "Ms. Emma Lewis"],
    yearGroups: ["Year 10", "Year 11"],
    mode: "In person",
    bookingOpen: false,
  },
  {
    id: "PTM-1201",
    tenantId: "T-012",
    name: "Term 1 Progress Meetings",
    date: "2026-12-03",
    start: "14:00",
    end: "17:00",
    slotMinutes: 10,
    teachers: ["Mr. Sanjeewa Perera", "Mrs. Dilrukshi Gunawardena"],
    yearGroups: ["Year 10", "Year 11"],
    mode: "Both",
    bookingOpen: true,
  },
  {
    id: "PTM-1202",
    tenantId: "T-012",
    name: "Primary Parent Consultations",
    date: "2026-11-26",
    start: "13:30",
    end: "16:00",
    slotMinutes: 10,
    teachers: ["Ms. Ishara Fernando", "Mrs. Dilrukshi Gunawardena"],
    yearGroups: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    mode: "Both",
    bookingOpen: true,
  },
];

export const ptmBookings: PtmBooking[] = [
  {
    id: "PB-1001",
    tenantId: "T-009",
    eventId: "PTM-0901",
    teacherName: "Ms. Emma Lewis",
    time: "15:30",
    parentName: "Rana Haddad",
    studentId: "S-3003",
    mode: "In person",
  },
  {
    id: "PB-1002",
    tenantId: "T-009",
    eventId: "PTM-0901",
    teacherName: "Mr. James Carter",
    time: "15:40",
    parentName: "Rana Haddad",
    studentId: "S-3003",
    mode: "In person",
  },
  {
    id: "PB-1003",
    tenantId: "T-009",
    eventId: "PTM-0901",
    teacherName: "Mr. James Carter",
    time: "16:00",
    parentName: "Grace Okafor",
    studentId: "S-3008",
    mode: "Online",
  },
  {
    id: "PB-1004",
    tenantId: "T-009",
    eventId: "PTM-0901",
    teacherName: "Mr. Yusuf Ali",
    time: "16:00",
    parentName: "Khalid Rahman",
    studentId: "S-3007",
    mode: "In person",
  },
  {
    id: "PB-1005",
    tenantId: "T-009",
    eventId: "PTM-0901",
    teacherName: "Mr. James Carter",
    time: "16:30",
    parentName: "Tom Morgan",
    studentId: "S-3005",
    mode: "In person",
  },
  {
    id: "PB-1006",
    tenantId: "T-009",
    eventId: "PTM-0901",
    teacherName: "Mrs. Claire Dawson",
    time: "16:30",
    parentName: "Grace Okafor",
    studentId: "S-3008",
    mode: "Online",
  },
  {
    id: "PB-1007",
    tenantId: "T-009",
    eventId: "PTM-0903",
    teacherName: "Mr. James Carter",
    time: "15:00",
    parentName: "Sarah Khan",
    studentId: "S-3001",
    mode: "In person",
  },
];

export const schoolServices: SchoolService[] = [
  // Boarding — priced in USD (second pricing currency) at an AED school
  {
    id: "SVC-0901",
    tenantId: "T-009",
    kind: "Boarding",
    name: "Weekly boarding — Al Noor House",
    detail: "Sun–Thu nights, supervised prep 19:00–21:00, all meals.",
    fee: 4200,
    currency: "USD",
    capacity: 40,
    schedule: "Per term",
    requiresConsent: true,
    leader: "Mrs. Claire Dawson",
  },
  {
    id: "SVC-0902",
    tenantId: "T-009",
    kind: "Boarding",
    name: "Full boarding — Al Noor House",
    detail: "7 nights, weekend activity programme, laundry.",
    fee: 6900,
    currency: "USD",
    capacity: 24,
    schedule: "Per term",
    requiresConsent: true,
    leader: "Mrs. Claire Dawson",
  },
  // Transport
  {
    id: "SVC-0911",
    tenantId: "T-009",
    kind: "Transport",
    name: "Route 3 — Dubai Marina / JLT",
    detail: "AM pick-up 06:45 · PM drop 15:30 · RTA-licensed driver + attendant.",
    fee: 2400,
    capacity: 48,
    schedule: "Per term",
    requiresConsent: false,
    leader: "Transport office",
  },
  {
    id: "SVC-0912",
    tenantId: "T-009",
    kind: "Transport",
    name: "Route 7 — Mirdif / Al Warqa",
    detail: "AM pick-up 06:30 · PM drop 15:45.",
    fee: 2400,
    capacity: 48,
    schedule: "Per term",
    requiresConsent: false,
    leader: "Transport office",
  },
  // Activities (ECAs)
  {
    id: "SVC-0921",
    tenantId: "T-009",
    kind: "Activity",
    name: "Robotics & Coding Club",
    detail: "VEX robotics, competition team for Year 7–11.",
    fee: 950,
    capacity: 20,
    schedule: "Tuesdays 15:30–16:45",
    requiresConsent: false,
    leader: "Mr. James Carter",
  },
  {
    id: "SVC-0922",
    tenantId: "T-009",
    kind: "Activity",
    name: "Model United Nations",
    detail: "Prep for Dubai MUN conference.",
    fee: 0,
    capacity: 30,
    schedule: "Wednesdays 15:30–16:30",
    requiresConsent: false,
    leader: "Mrs. Claire Dawson",
  },
  {
    id: "SVC-0923",
    tenantId: "T-009",
    kind: "Activity",
    name: "Swimming squad",
    detail: "Coached squad training, inter-school galas.",
    fee: 1200,
    capacity: 24,
    schedule: "Mon & Thu 06:30–07:30",
    requiresConsent: true,
    leader: "Mr. Yusuf Ali",
  },
  {
    id: "SVC-0924",
    tenantId: "T-009",
    kind: "Activity",
    name: "Arabic calligraphy",
    detail: "Beginner to intermediate, all curricula.",
    fee: 600,
    capacity: 16,
    schedule: "Thursdays 14:30–15:30",
    requiresConsent: false,
    leader: "Mr. Yusuf Ali",
  },
  // Trips
  {
    id: "SVC-0931",
    tenantId: "T-009",
    kind: "Trip",
    name: "Year 10 Physics — Dubai Museum of the Future",
    detail: "Curriculum-linked visit; packed lunch; coach transport.",
    fee: 180,
    capacity: 60,
    date: "2026-11-24",
    requiresConsent: true,
    consentDeadline: "2026-11-17",
    leader: "Mr. James Carter",
  },
  {
    id: "SVC-0932",
    tenantId: "T-009",
    kind: "Trip",
    name: "Grade 7 Field Trip — Hatta Dam & Heritage Village",
    detail: "Geography field study; departs 07:30, returns 16:00.",
    fee: 220,
    capacity: 50,
    date: "2026-12-03",
    requiresConsent: true,
    consentDeadline: "2026-11-25",
    leader: "Ms. Anjali Menon",
  },
  {
    id: "SVC-0933",
    tenantId: "T-009",
    kind: "Trip",
    name: "IB DP CAS Week — Sri Lanka",
    detail: "5-day service & adventure trip, flights included.",
    fee: 2950,
    currency: "USD",
    capacity: 24,
    date: "2027-02-14",
    requiresConsent: true,
    consentDeadline: "2026-12-10",
    leader: "Dr. Marcus Webb",
  },
  // Colombo
  {
    id: "SVC-1201",
    tenantId: "T-012",
    kind: "Transport",
    name: "Route A — Nugegoda / Maharagama",
    detail: "AM 06:15 · PM 14:15.",
    fee: 45000,
    capacity: 30,
    schedule: "Per term",
    requiresConsent: false,
    leader: "Transport office",
  },
  {
    id: "SVC-1202",
    tenantId: "T-012",
    kind: "Trip",
    name: "Year 11 — Sigiriya & Dambulla",
    detail: "Overnight heritage trip.",
    fee: 18500,
    capacity: 40,
    date: "2026-12-12",
    requiresConsent: true,
    consentDeadline: "2026-12-01",
    leader: "Mr. Sanjeewa Perera",
  },
  {
    id: "SVC-1203",
    tenantId: "T-012",
    kind: "Trip",
    name: "Year 3 — Dehiwala Zoo day visit",
    detail:
      "Science topic 'Animals and their habitats'. Coach leaves 08:00, back 13:30. Packed lunch.",
    fee: 3500,
    capacity: 60,
    date: "2026-11-20",
    requiresConsent: true,
    consentDeadline: "2026-11-13",
    leader: "Ms. Ishara Fernando",
  },
];

const se = (
  id: string,
  serviceId: string,
  studentId: string,
  status: ServiceEnrolment["status"],
  paid: boolean,
  consentBy?: string,
  consentAt?: string,
): ServiceEnrolment => ({
  id,
  tenantId: serviceId.startsWith("SVC-12") ? "T-012" : "T-009",
  serviceId,
  studentId,
  status,
  paid,
  consentBy,
  consentAt,
});

export const serviceEnrolments: ServiceEnrolment[] = [
  se("SE-1001", "SVC-0901", "S-3009", "Confirmed", true, "Hiro Tanaka", "2026-08-12T10:00:00Z"),
  se("SE-1002", "SVC-0902", "S-3004", "Confirmed", true, "Rana Haddad", "2026-08-15T10:00:00Z"),
  se("SE-1003", "SVC-0911", "S-3001", "Confirmed", true),
  se("SE-1004", "SVC-0911", "S-3002", "Confirmed", true),
  se("SE-1005", "SVC-0912", "S-3007", "Confirmed", true),
  se("SE-1006", "SVC-0912", "S-3010", "Confirmed", false),
  se("SE-1007", "SVC-0921", "S-3001", "Confirmed", true),
  se("SE-1008", "SVC-0921", "S-3008", "Confirmed", true),
  se("SE-1009", "SVC-0921", "S-3005", "Waitlist", false),
  se("SE-1010", "SVC-0922", "S-3006", "Confirmed", true),
  se("SE-1011", "SVC-0923", "S-3003", "Confirmed", true, "Rana Haddad", "2026-09-02T08:00:00Z"),
  se("SE-1012", "SVC-0924", "S-3002", "Confirmed", true),
  // Physics trip — some consents still outstanding (Zara's included)
  se("SE-1020", "SVC-0931", "S-3005", "Confirmed", true, "Tom Morgan", "2026-10-29T18:20:00Z"),
  se("SE-1021", "SVC-0931", "S-3008", "Confirmed", false, "Grace Okafor", "2026-10-30T07:45:00Z"),
  se("SE-1022", "SVC-0931", "S-3001", "Requested", false),
  // Grade 7 field trip — Adam awaiting consent
  se("SE-1023", "SVC-0932", "S-3002", "Requested", false),
  se("SE-1024", "SVC-0932", "S-3010", "Confirmed", true, "Neha Shah", "2026-10-31T12:00:00Z"),
  se("SE-1025", "SVC-0933", "S-3004", "Confirmed", false, "Rana Haddad", "2026-10-20T09:00:00Z"),
  se("SE-1026", "SVC-0933", "S-3009", "Requested", false),
  se("SE-1201", "SVC-1202", "S-3103", "Requested", false),
  // Year 3 zoo visit — Sasindu's family uses his school account to give consent
  se("SE-1202", "SVC-1203", "S-3105", "Requested", false),
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** "15:30" → minutes since midnight and back. */
export const ptmToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const ptmFromMin = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** All slot start times for a PTM event. */
export function ptmSlots(ev: PtmEvent): string[] {
  const out: string[] = [];
  for (let t = ptmToMin(ev.start); t + ev.slotMinutes <= ptmToMin(ev.end); t += ev.slotMinutes) {
    out.push(ptmFromMin(t));
  }
  return out;
}

/** Total house points per house id. */
export function houseTotals(awards: HousePointAward[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of awards) m.set(a.houseId, (m.get(a.houseId) ?? 0) + a.points);
  return m;
}

/** Demo FX: 1 USD in each tenant currency (indicative only). */
export const USD_RATE: Record<string, number> = {
  AED: 3.6725,
  LKR: 300,
  GBP: 0.79,
  AUD: 1.52,
  USD: 1,
};
