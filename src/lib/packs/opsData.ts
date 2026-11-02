/**
 * Shared modules used by several packs — data model + seed.
 *   • Admissions: enquiry → application → assessment → offer → deposit → enrolled (+ waitlist)
 *   • Timetable & rooms: rooms, period/lecture slots, clash detection, cover requests
 *   • Attendance registers: marks recorded with the tenant's attendance CODE SET
 *   • Staff vetting register: per-staff checks defined by the tenant's region
 *
 * These are MODULES, not pack features: the same screens serve a school, a
 * university and a college, adapting to the tenant's type and region.
 */
import type { Weekday } from "../mockData";
import { DEMO_TODAY, learners as seedLearners } from "./foundationData";
import type { AttendanceCodeSet, AttendanceMeaning, VettingCheckDef } from "./regions";

export type AdmissionStage =
  | "Enquiry"
  | "Applied"
  | "Assessment"
  | "Offer"
  | "Accepted"
  | "Deposit paid"
  | "Enrolled"
  | "Waitlist"
  | "Declined"
  | "Withdrawn";

export const ADMISSION_PIPELINE: AdmissionStage[] = [
  "Enquiry",
  "Applied",
  "Assessment",
  "Offer",
  "Accepted",
  "Deposit paid",
  "Enrolled",
];

export interface Application {
  id: string;
  tenantId: string;
  applicantName: string;
  gender: "F" | "M";
  dob: string;
  email: string;
  phone?: string;
  guardianName?: string;
  nationality: string;
  source: "Website" | "Open day" | "Agent" | "UCAS" | "Referral" | "CRM lead" | "Direct";
  /** What they're applying for — year group + curriculum, or programme + intake. */
  target: string;
  curriculumId?: string;
  programmeId?: string;
  /** College add-on: the qualification applied for. */
  qualificationId?: string;
  /** School: the year group applied for. */
  yearGroup?: string;
  intake: string; // "Sep 2027", "Term 3 2026–27"
  stage: AdmissionStage;
  assessment?: {
    kind: "Entrance test" | "Interview" | "Portfolio" | "Placement test";
    date: string;
    score?: number;
    outcome?: "Pass" | "Borderline" | "Fail";
  };
  offer?: { type: "Conditional" | "Unconditional"; conditions?: string; issuedAt: string };
  deposit?: { amount: number; paid: boolean; paidAt?: string };
  visaRequired: boolean;
  documents: { name: string; status: "Missing" | "Uploaded" | "Verified" }[];
  createdAt: string;
  owner: string;
  notes?: string;
  /** Learner id once enrolled — the same permanent 1StudentID. */
  studentId?: string;
  /** How the enquiry came in (CRM). `owner` is the assigned counsellor. */
  channel?: "Walk-in" | "Phone" | "Web form" | "Exhibition" | "Email" | "WhatsApp" | "Agent";
  branch?: string;
  /** Official ids captured at enquiry (NIC, passport…) — used for duplicate checks. */
  officialIds?: Record<string, string>;
  followUps?: { id: string; due: string; note: string; by: string; done?: string }[];
  /** Existing 1StudentID this applicant was matched to (duplicate check). */
  matchedStudentId?: string;
  /** Another application this one duplicates (merged / closed). */
  duplicateOf?: string;
}

export interface Room {
  id: string;
  tenantId: string;
  name: string;
  building: string;
  capacity: number;
  type: "Classroom" | "Lab" | "Lecture theatre" | "Seminar room" | "Studio" | "Workshop" | "Sports";
}

export interface TimetableSlot {
  id: string;
  tenantId: string;
  day: Weekday;
  start: string; // "08:30"
  end: string;
  period?: string; // "P1"
  /** Who is taught: tutor group, module cohort, class. */
  groupLabel: string;
  subject: string;
  teacherName: string;
  roomId: string;
  calendarId?: string;
  /** Learner groups (Learner.group) that attend — used for HE / college cohorts. */
  cohorts?: string[];
}

export interface CoverRequest {
  id: string;
  tenantId: string;
  slotId: string;
  date: string;
  absentTeacher: string;
  reason: string;
  coverTeacher?: string;
  status: "Open" | "Covered" | "Cancelled";
}

export interface RegisterMark {
  id: string;
  tenantId: string;
  date: string;
  /** "AM" / "PM" for schools, or the slot / contact point label. */
  session: string;
  groupLabel: string;
  studentId: string;
  code: string; // code from the tenant's code set
  by: string;
}

export type VettingStatus = "Verified" | "Pending" | "Expired" | "Not required";

export interface VettingCheck {
  key: string; // VettingCheckDef.key from the region
  status: VettingStatus;
  ref?: string;
  checkedOn?: string;
  expires?: string;
  verifiedBy?: string;
}

export interface VettingRecord {
  id: string;
  tenantId: string;
  staffName: string;
  role: string;
  startDate: string;
  checks: VettingCheck[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function slotsOverlap(a: { day: string; start: string; end: string }, b: typeof a) {
  return a.day === b.day && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
}

/** Why a proposed slot can't go in: same teacher, same room or same group overlapping. */
export function findClashes(
  slot: Pick<
    TimetableSlot,
    "id" | "day" | "start" | "end" | "teacherName" | "roomId" | "groupLabel"
  >,
  all: TimetableSlot[],
  roomName: (id: string) => string = (id) => id,
): string[] {
  const out: string[] = [];
  for (const s of all) {
    if (s.id === slot.id || !slotsOverlap(slot, s)) continue;
    const when = `${s.day} ${s.start}–${s.end}`;
    if (s.teacherName === slot.teacherName)
      out.push(`${slot.teacherName} already teaches ${s.groupLabel} (${s.subject}) ${when}`);
    if (s.roomId === slot.roomId)
      out.push(`${roomName(s.roomId)} is booked by ${s.groupLabel} ${when}`);
    if (s.groupLabel === slot.groupLabel)
      out.push(`${slot.groupLabel} already has ${s.subject} ${when}`);
  }
  return out;
}

/** Teachers in the pool who have nothing timetabled during `slot`. */
export function freeTeachers(
  slot: TimetableSlot,
  all: TimetableSlot[],
  pool: string[],
  busyElsewhere: string[] = [],
): string[] {
  return pool.filter(
    (t) =>
      t !== slot.teacherName &&
      !busyElsewhere.includes(t) &&
      !all.some((s) => s.teacherName === t && slotsOverlap(s, slot)),
  );
}

export function weekdayOf(iso: string): Weekday {
  const d = new Date(iso + "T00:00:00Z").getUTCDay();
  return (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as Weekday[])[d];
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  authorised: number;
  unauthorised: number;
  pct: number; // present-equivalent / possible (excludes not-required & admin)
}

export function meaningOf(set: AttendanceCodeSet, code: string): AttendanceMeaning {
  return set.codes.find((c) => c.code === code)?.meaning ?? "unauthorised";
}

export function summarise(marks: RegisterMark[], set: AttendanceCodeSet): AttendanceSummary {
  let possible = 0;
  let present = 0;
  let late = 0;
  let authorised = 0;
  let unauthorised = 0;
  for (const m of marks) {
    const meaning = meaningOf(set, m.code);
    if (meaning === "not-required" || meaning === "admin") continue;
    possible++;
    if (meaning === "present" || meaning === "aea") present++;
    else if (meaning === "late") {
      present++;
      late++;
    } else if (meaning === "authorised") authorised++;
    else unauthorised++;
  }
  return {
    total: possible,
    present,
    late,
    authorised,
    unauthorised,
    pct: possible ? Math.round((present / possible) * 1000) / 10 : 100,
  };
}

/** Trailing run of unauthorised absences (most recent first) — UKVI style. */
export function consecutiveMissed(marks: RegisterMark[], set: AttendanceCodeSet): number {
  const sorted = [...marks].sort((a, b) =>
    a.date === b.date ? b.session.localeCompare(a.session) : b.date.localeCompare(a.date),
  );
  let n = 0;
  for (const m of sorted) {
    const meaning = meaningOf(set, m.code);
    if (meaning === "unauthorised") n++;
    else if (meaning === "not-required" || meaning === "admin") continue;
    else break;
  }
  return n;
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Effective status: a Verified check past its expiry reads as Expired. */
export function effectiveVettingStatus(c: VettingCheck, today = DEMO_TODAY): VettingStatus {
  if (c.status === "Verified" && c.expires && c.expires < today) return "Expired";
  return c.status;
}

/** Staff known per tenant — used for cover pools and the vetting "add staff" picker. */
export const TENANT_STAFF: Record<string, { name: string; role: string }[]> = {
  "T-009": [
    { name: "Hannah Clarke", role: "Principal" },
    { name: "Mr. James Carter", role: "Physics teacher · Tutor 10C" },
    { name: "Ms. Emma Lewis", role: "Mathematics teacher · Tutor 11A" },
    { name: "Mrs. Claire Dawson", role: "English teacher · Tutor 12B" },
    { name: "Dr. Marcus Webb", role: "IB Diploma Coordinator" },
    { name: "Ms. Anjali Menon", role: "CBSE Science teacher · Tutor 7B" },
    { name: "Mr. Yusuf Ali", role: "Arabic & Islamic Studies teacher" },
    { name: "Ms. Laura Bennett", role: "FS2 class teacher · FS2 Falcons" },
  ],
  "T-010": [
    { name: "Dr. Eleanor Hughes", role: "Academic Registrar" },
    { name: "Dr. Samuel Reid", role: "Senior Lecturer, Computer Science" },
    { name: "Prof. Helen Moore", role: "Head of School, Computing" },
    { name: "Dr. Aisha Bello", role: "Lecturer, Data Science" },
    { name: "Dr. Tom Hartley", role: "Lecturer, Software Engineering" },
    { name: "Mr. Gareth Evans", role: "Lecturer, Business" },
  ],
  "T-011": [
    { name: "Liam O'Connor", role: "Registrar" },
    { name: "Ms. Kate Sullivan", role: "ICT trainer & assessor" },
    { name: "Mr. Darren Walsh", role: "Electrotechnology trainer" },
    { name: "Ms. Jess Kowalski", role: "Nursing & Ageing Support trainer" },
    { name: "Mr. Ben Archer", role: "Carpentry trainer" },
    { name: "Dr. Nina Patel", role: "Lecturer, Bachelor of IT" },
  ],
  "T-012": [
    { name: "Mrs. Dilrukshi Gunawardena", role: "Head of School" },
    { name: "Mr. Sanjeewa Perera", role: "Science teacher" },
    { name: "Ms. Ishara Fernando", role: "Year 3 class teacher · 3B" },
    { name: "Mrs. Nadeesha Silva", role: "Early Years lead · Upper Nursery" },
  ],
};

/** Visa document wording by region (CAS in the UK, CoE in Australia…). */
export function visaDocLabel(region: string): string {
  switch (region) {
    case "UK":
      return "CAS issued via the UKVI Sponsor Management System once the offer is unconditional and the deposit is paid";
    case "AU":
      return "CoE issued in PRISMS after the offer is accepted and the deposit paid";
    case "AE":
      return "Residence visa — sponsored by a parent or by the school";
    case "SG":
      return "Student's Pass application via ICA (Student's Pass Online Application)";
    case "MY":
      return "Student pass via EMGS after the offer letter";
    default:
      return "Student visa / residence permit to be confirmed";
  }
}

/* ── Seeded pseudo-random (deterministic — no Math.random at load) ──────── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function schoolDays(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const d = new Date(fromIso + "T00:00:00Z");
  const end = new Date(toIso + "T00:00:00Z");
  while (d <= end) {
    const wd = d.getUTCDay();
    if (wd >= 1 && wd <= 5) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/* ── Rooms ───────────────────────────────────────────────────────────────── */

export const rooms: Room[] = [
  {
    id: "ROOM-0901",
    tenantId: "T-009",
    name: "S1 Physics Lab",
    building: "Science Block",
    capacity: 28,
    type: "Lab",
  },
  {
    id: "ROOM-0902",
    tenantId: "T-009",
    name: "M2",
    building: "Main Block",
    capacity: 30,
    type: "Classroom",
  },
  {
    id: "ROOM-0903",
    tenantId: "T-009",
    name: "E4",
    building: "Main Block",
    capacity: 30,
    type: "Classroom",
  },
  {
    id: "ROOM-0904",
    tenantId: "T-009",
    name: "Library Seminar Room",
    building: "Library",
    capacity: 20,
    type: "Seminar room",
  },
  {
    id: "ROOM-0905",
    tenantId: "T-009",
    name: "C7 Science Lab",
    building: "Science Block",
    capacity: 32,
    type: "Lab",
  },
  {
    id: "ROOM-0906",
    tenantId: "T-009",
    name: "A3",
    building: "Arabic Wing",
    capacity: 30,
    type: "Classroom",
  },
  {
    id: "ROOM-0907",
    tenantId: "T-009",
    name: "Sports Hall",
    building: "Sports Centre",
    capacity: 120,
    type: "Sports",
  },
  {
    id: "ROOM-1001",
    tenantId: "T-010",
    name: "Turing LT1",
    building: "Turing Building",
    capacity: 220,
    type: "Lecture theatre",
  },
  {
    id: "ROOM-1002",
    tenantId: "T-010",
    name: "Lovelace Lab 2.14",
    building: "Lovelace Building",
    capacity: 60,
    type: "Lab",
  },
  {
    id: "ROOM-1003",
    tenantId: "T-010",
    name: "Babbage SR 3.02",
    building: "Babbage Building",
    capacity: 40,
    type: "Seminar room",
  },
  {
    id: "ROOM-1004",
    tenantId: "T-010",
    name: "Hopper LT2",
    building: "Hopper Building",
    capacity: 150,
    type: "Lecture theatre",
  },
  {
    id: "ROOM-1005",
    tenantId: "T-010",
    name: "Data Lab 4.01",
    building: "Turing Building",
    capacity: 40,
    type: "Lab",
  },
  {
    id: "ROOM-1101",
    tenantId: "T-011",
    name: "ICT Lab B2",
    building: "Block B",
    capacity: 24,
    type: "Lab",
  },
  {
    id: "ROOM-1102",
    tenantId: "T-011",
    name: "Electrotech Workshop W1",
    building: "Trades Centre",
    capacity: 16,
    type: "Workshop",
  },
  {
    id: "ROOM-1103",
    tenantId: "T-011",
    name: "Clinical Skills Lab N1",
    building: "Health Precinct",
    capacity: 20,
    type: "Lab",
  },
  {
    id: "ROOM-1104",
    tenantId: "T-011",
    name: "Seminar Room S3",
    building: "Block A",
    capacity: 30,
    type: "Seminar room",
  },
  {
    id: "ROOM-1105",
    tenantId: "T-011",
    name: "Carpentry Workshop W2",
    building: "Trades Centre",
    capacity: 16,
    type: "Workshop",
  },
  {
    id: "ROOM-1201",
    tenantId: "T-012",
    name: "Room 10A",
    building: "Senior School",
    capacity: 28,
    type: "Classroom",
  },
  {
    id: "ROOM-1202",
    tenantId: "T-012",
    name: "Science Lab",
    building: "Senior School",
    capacity: 26,
    type: "Lab",
  },
  {
    id: "ROOM-1203",
    tenantId: "T-012",
    name: "Room 3B",
    building: "Junior School",
    capacity: 28,
    type: "Classroom",
  },
  {
    id: "ROOM-1204",
    tenantId: "T-012",
    name: "Early Years Room",
    building: "Early Years Block",
    capacity: 18,
    type: "Classroom",
  },
];

/* ── Timetable ───────────────────────────────────────────────────────────── */

/** School periods (UAE day). */
export const SCHOOL_PERIODS: { period: string; start: string; end: string }[] = [
  { period: "P1", start: "07:45", end: "08:45" },
  { period: "P2", start: "08:45", end: "09:45" },
  { period: "P3", start: "10:05", end: "11:05" },
  { period: "P4", start: "11:05", end: "12:05" },
  { period: "P5", start: "12:45", end: "13:45" },
  { period: "P6", start: "13:45", end: "14:45" },
];

type SchoolSpec = [Weekday, string, string, string, string, string];

const CARTER = "Mr. James Carter";
const LEWIS = "Ms. Emma Lewis";
const DAWSON = "Mrs. Claire Dawson";
const WEBB = "Dr. Marcus Webb";
const MENON = "Ms. Anjali Menon";
const YUSUF = "Mr. Yusuf Ali";

const meridianSpec: SchoolSpec[] = [
  // 10C
  ["Mon", "P1", "10C", "IGCSE Physics", CARTER, "ROOM-0901"],
  ["Mon", "P2", "10C", "IGCSE Mathematics", LEWIS, "ROOM-0902"],
  ["Mon", "P3", "10C", "IGCSE English", DAWSON, "ROOM-0903"],
  ["Tue", "P1", "10C", "IGCSE Mathematics", LEWIS, "ROOM-0902"],
  ["Tue", "P3", "10C", "IGCSE Physics", CARTER, "ROOM-0901"],
  ["Tue", "P5", "10C", "Arabic B", YUSUF, "ROOM-0906"],
  ["Wed", "P2", "10C", "IGCSE English", DAWSON, "ROOM-0903"],
  ["Wed", "P4", "10C", "IGCSE Physics", CARTER, "ROOM-0901"],
  ["Thu", "P1", "10C", "IGCSE Mathematics", LEWIS, "ROOM-0902"],
  ["Fri", "P1", "10C", "Islamic Studies / Moral Education", YUSUF, "ROOM-0906"],
  ["Fri", "P2", "10C", "IGCSE Physics", CARTER, "ROOM-0901"],
  // 11A
  ["Mon", "P1", "11A", "IGCSE Mathematics", LEWIS, "ROOM-0902"],
  ["Mon", "P4", "11A", "IGCSE Physics", CARTER, "ROOM-0901"],
  ["Tue", "P2", "11A", "IGCSE English", DAWSON, "ROOM-0903"],
  ["Wed", "P1", "11A", "IGCSE Mathematics", LEWIS, "ROOM-0902"],
  ["Wed", "P3", "11A", "IGCSE Physics", CARTER, "ROOM-0901"],
  ["Thu", "P2", "11A", "Arabic B", YUSUF, "ROOM-0906"],
  ["Fri", "P3", "11A", "IGCSE English", DAWSON, "ROOM-0903"],
  // 12B
  ["Mon", "P5", "12B", "A Level Physics", CARTER, "ROOM-0901"],
  ["Tue", "P4", "12B", "A Level Mathematics", LEWIS, "ROOM-0902"],
  ["Wed", "P5", "12B", "A Level English Literature", DAWSON, "ROOM-0903"],
  ["Thu", "P3", "12B", "A Level Physics", CARTER, "ROOM-0901"],
  // DP2
  ["Mon", "P3", "DP2", "IB Theory of Knowledge", WEBB, "ROOM-0904"],
  ["Tue", "P2", "DP2", "IB Physics HL", CARTER, "ROOM-0901"],
  ["Wed", "P1", "DP2", "IB Extended Essay supervision", WEBB, "ROOM-0904"],
  ["Thu", "P4", "DP2", "IB Mathematics AA HL", LEWIS, "ROOM-0902"],
  // 7B (CBSE stream)
  ["Mon", "P2", "7B", "CBSE Science", MENON, "ROOM-0905"],
  ["Tue", "P1", "7B", "CBSE Science", MENON, "ROOM-0905"],
  ["Wed", "P3", "7B", "Arabic A", YUSUF, "ROOM-0906"],
  ["Thu", "P1", "7B", "CBSE Mathematics", MENON, "ROOM-0905"],
  ["Fri", "P4", "7B", "Islamic Studies / Moral Education", YUSUF, "ROOM-0906"],
];

type BlockSpec = [Weekday, string, string, string, string, string, string, string[]];

const REID = "Dr. Samuel Reid";
const MOORE = "Prof. Helen Moore";
const BELLO = "Dr. Aisha Bello";
const HARTLEY = "Dr. Tom Hartley";
const EVANS = "Mr. Gareth Evans";
const CS2 = "CS 2025 Sep cohort";
const CS1 = "CS 2026 Sep cohort";
const MSC = "MSc DS 2026 Sep cohort";

const northbridgeSpec: BlockSpec[] = [
  [
    "Mon",
    "10:00",
    "12:00",
    "CS201 · Lecture",
    "Data Structures & Algorithms",
    REID,
    "ROOM-1001",
    [CS2],
  ],
  [
    "Wed",
    "14:00",
    "16:00",
    "CS201 · Lab",
    "Data Structures & Algorithms",
    REID,
    "ROOM-1002",
    [CS2],
  ],
  ["Tue", "09:00", "11:00", "CS202 · Lecture", "Databases", MOORE, "ROOM-1001", [CS2]],
  ["Wed", "10:00", "12:00", "CS202 · Lab", "Databases", MOORE, "ROOM-1002", [CS2]],
  ["Thu", "10:00", "12:00", "CS203 · Lecture", "Software Engineering", HARTLEY, "ROOM-1004", [CS2]],
  ["Fri", "10:00", "11:00", "CS203 · Seminar", "Software Engineering", HARTLEY, "ROOM-1003", [CS2]],
  [
    "Tue",
    "14:00",
    "16:00",
    "CS204 · Lecture",
    "Web Development (optional)",
    REID,
    "ROOM-1004",
    [CS2],
  ],
  [
    "Thu",
    "14:00",
    "16:00",
    "CS205 · Lecture",
    "Machine Learning Foundations (optional)",
    BELLO,
    "ROOM-1001",
    [CS2],
  ],
  [
    "Fri",
    "13:00",
    "15:00",
    "CS205 · Lab",
    "Machine Learning Foundations (optional)",
    BELLO,
    "ROOM-1005",
    [CS2],
  ],
  [
    "Mon",
    "14:00",
    "16:00",
    "CS101 · Lecture",
    "Programming Fundamentals",
    HARTLEY,
    "ROOM-1004",
    [CS1],
  ],
  ["Tue", "11:00", "13:00", "CS102 · Lecture", "Computer Systems", MOORE, "ROOM-1004", [CS1]],
  ["Thu", "09:00", "10:00", "CS101 · Lab", "Programming Fundamentals", REID, "ROOM-1002", [CS1]],
  ["Mon", "14:00", "17:00", "DS701 · Workshop", "Statistical Learning", BELLO, "ROOM-1005", [MSC]],
  [
    "Wed",
    "13:00",
    "16:00",
    "DS702 · Workshop",
    "Big Data Engineering",
    HARTLEY,
    "ROOM-1005",
    [MSC],
  ],
  [
    "Mon",
    "09:00",
    "11:00",
    "BM201 · Lecture",
    "Marketing Management",
    EVANS,
    "ROOM-1003",
    ["BM 2025 Sep cohort"],
  ],
];

const SULLIVAN = "Ms. Kate Sullivan";
const WALSH = "Mr. Darren Walsh";
const KOWALSKI = "Ms. Jess Kowalski";
const ARCHER = "Mr. Ben Archer";
const PATEL = "Dr. Nina Patel";

const harboursideSpec: BlockSpec[] = [
  [
    "Mon",
    "09:00",
    "12:00",
    "ICT Dip · Class",
    "ICT50220 Diploma of IT — Cyber security units",
    SULLIVAN,
    "ROOM-1101",
    ["ICT Dip — Term 4"],
  ],
  [
    "Wed",
    "09:00",
    "12:00",
    "ICT Dip · Class",
    "ICT50220 Diploma of IT — Networking units",
    SULLIVAN,
    "ROOM-1101",
    ["ICT Dip — Term 4"],
  ],
  [
    "Tue",
    "08:00",
    "14:00",
    "Electrotech · Block release",
    "UEE30820 Cert III Electrotechnology",
    WALSH,
    "ROOM-1102",
    ["Electrotech apprentices 2025"],
  ],
  [
    "Thu",
    "09:00",
    "15:00",
    "Nursing · Clinical skills",
    "HLT54121 Diploma of Nursing",
    KOWALSKI,
    "ROOM-1103",
    ["Nursing Dip 2026"],
  ],
  [
    "Mon",
    "13:00",
    "16:00",
    "Ageing Support · Class",
    "CHC43015 Cert IV Ageing Support",
    KOWALSKI,
    "ROOM-1104",
    ["Ageing Support 2026"],
  ],
  [
    "Fri",
    "07:30",
    "14:30",
    "Carpentry · Block release",
    "CPC30220 Cert III Carpentry",
    ARCHER,
    "ROOM-1105",
    ["Carpentry apprentices 2026"],
  ],
  [
    "Mon",
    "13:00",
    "15:00",
    "BIT201 · Lecture",
    "Bachelor of IT — Systems Analysis",
    PATEL,
    "ROOM-1101",
    ["BIT 2025 Feb cohort"],
  ],
  [
    "Thu",
    "10:00",
    "12:00",
    "BIT202 · Tutorial",
    "Bachelor of IT — Cloud Computing",
    PATEL,
    "ROOM-1104",
    ["BIT 2025 Feb cohort"],
  ],
];

const colomboSpec: SchoolSpec[] = [
  ["Mon", "P1", "10A", "IGCSE Chemistry", "Mr. Sanjeewa Perera", "ROOM-1202"],
  ["Tue", "P2", "11A", "IGCSE Physics", "Mr. Sanjeewa Perera", "ROOM-1202"],
  ["Wed", "P3", "12A", "A Level Chemistry", "Mr. Sanjeewa Perera", "ROOM-1202"],
  ["Thu", "P1", "13A", "A Level Chemistry", "Mr. Sanjeewa Perera", "ROOM-1202"],
  // Primary (3B) and early years — appended so earlier slot ids stay stable.
  ["Mon", "P1", "3B", "English", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Tue", "P1", "3B", "English", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Wed", "P1", "3B", "English", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Thu", "P1", "3B", "English", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Fri", "P1", "3B", "English", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Mon", "P2", "3B", "Mathematics", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Tue", "P2", "3B", "Mathematics", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Wed", "P2", "3B", "Mathematics", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Thu", "P2", "3B", "Mathematics", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Fri", "P2", "3B", "Mathematics", "Ms. Ishara Fernando", "ROOM-1203"],
  ["Wed", "P3", "3B", "Science", "Ms. Ishara Fernando", "ROOM-1203"],
  [
    "Mon",
    "P1",
    "UN Butterflies",
    "Early learning (play-based)",
    "Mrs. Nadeesha Silva",
    "ROOM-1204",
  ],
  [
    "Tue",
    "P1",
    "UN Butterflies",
    "Early learning (play-based)",
    "Mrs. Nadeesha Silva",
    "ROOM-1204",
  ],
  [
    "Wed",
    "P1",
    "UN Butterflies",
    "Early learning (play-based)",
    "Mrs. Nadeesha Silva",
    "ROOM-1204",
  ],
  [
    "Thu",
    "P1",
    "UN Butterflies",
    "Early learning (play-based)",
    "Mrs. Nadeesha Silva",
    "ROOM-1204",
  ],
  [
    "Fri",
    "P1",
    "UN Butterflies",
    "Early learning (play-based)",
    "Mrs. Nadeesha Silva",
    "ROOM-1204",
  ],
];

function fromSchool(tenantId: string, prefix: string, specs: SchoolSpec[], calendarId: string) {
  return specs.map(([day, period, group, subject, teacher, roomId], i): TimetableSlot => {
    const p = SCHOOL_PERIODS.find((x) => x.period === period)!;
    return {
      id: `${prefix}${String(i + 1).padStart(3, "0")}`,
      tenantId,
      day,
      start: p.start,
      end: p.end,
      period,
      groupLabel: group,
      subject,
      teacherName: teacher,
      roomId,
      calendarId,
      cohorts: [group],
    };
  });
}

function fromBlocks(tenantId: string, prefix: string, specs: BlockSpec[], calendarId: string) {
  return specs.map(
    ([day, start, end, label, subject, teacher, roomId, cohorts], i): TimetableSlot => ({
      id: `${prefix}${String(i + 1).padStart(3, "0")}`,
      tenantId,
      day,
      start,
      end,
      groupLabel: label,
      subject,
      teacherName: teacher,
      roomId,
      calendarId,
      cohorts,
    }),
  );
}

export const timetableSlots: TimetableSlot[] = [
  ...fromSchool("T-009", "TT-09-", meridianSpec, "CAL-0901"),
  ...fromSchool("T-012", "TT-12-", colomboSpec, "CAL-1201"),
  ...fromBlocks("T-010", "TT-10-", northbridgeSpec, "CAL-1001"),
  ...fromBlocks("T-011", "TT-11-", harboursideSpec, "CAL-1102"),
];

export const coverRequests: CoverRequest[] = [
  {
    id: "CVR-0901",
    tenantId: "T-009",
    slotId: "TT-09-024",
    date: "2026-11-03",
    absentTeacher: CARTER,
    reason: "Exam board moderation meeting (off-site)",
    status: "Open",
  },
  {
    id: "CVR-0902",
    tenantId: "T-009",
    slotId: "TT-09-005",
    date: "2026-11-03",
    absentTeacher: CARTER,
    reason: "Exam board moderation meeting (off-site)",
    status: "Open",
  },
  {
    id: "CVR-0903",
    tenantId: "T-009",
    slotId: "TT-09-003",
    date: "2026-10-26",
    absentTeacher: DAWSON,
    reason: "Illness",
    coverTeacher: "Dr. Marcus Webb",
    status: "Covered",
  },
  {
    id: "CVR-1001",
    tenantId: "T-010",
    slotId: "TT-10-005",
    date: "2026-11-05",
    absentTeacher: HARTLEY,
    reason: "Conference — ACM SIGCSE",
    coverTeacher: REID,
    status: "Covered",
  },
];

/* ── Register marks (deterministic history up to DEMO_TODAY) ───────────── */

function pick(r: number, table: [number, string][]): string {
  let acc = 0;
  for (const [p, code] of table) {
    acc += p;
    if (r < acc) return code;
  }
  return table[table.length - 1][1];
}

function buildMarks(): RegisterMark[] {
  const out: RegisterMark[] = [];
  let n = 0;
  const rnd = mulberry32(20261102);
  const mk = (
    tenantId: string,
    date: string,
    session: string,
    group: string,
    studentId: string,
    code: string,
    by: string,
  ) =>
    out.push({
      id: `RM-${String(++n).padStart(5, "0")}`,
      tenantId,
      date,
      session,
      groupLabel: group,
      studentId,
      code,
      by,
    });

  // Schools: AM / PM per tutor group, last 3 weeks.
  const tutors: Record<string, string> = {
    "10C": CARTER,
    "11A": LEWIS,
    "12B": DAWSON,
    DP2: WEBB,
    "7B": MENON,
    "10A": "Mr. Sanjeewa Perera",
    "11A-LK": "Mr. Sanjeewa Perera",
    "12A": "Mr. Sanjeewa Perera",
    "13A": "Mr. Sanjeewa Perera",
  };
  const schoolDaysList = schoolDays("2026-10-12", DEMO_TODAY);
  const normal: [number, string][] = [
    [0.93, "P"],
    [0.03, "L"],
    [0.015, "M"],
    [0.01, "AA"],
    [0.005, "SA"],
    [0.01, "UA"],
  ];
  const poor: [number, string][] = [
    [0.8, "P"],
    [0.05, "L"],
    [0.05, "M"],
    [0.07, "UA"],
    [0.03, "N"],
  ];
  for (const l of seedLearners.filter((x) => x.tenantId === "T-009" || x.tenantId === "T-012")) {
    const table = l.id === "S-3003" ? poor : normal;
    const by = tutors[l.group ?? ""] ?? "Hannah Clarke";
    for (const date of schoolDaysList) {
      for (const session of ["AM", "PM"]) {
        // Trip day for DP2 (educational visit) — keeps the AEA code visible.
        const code = l.group === "DP2" && date === "2026-10-22" ? "SA" : pick(rnd(), table);
        mk(l.tenantId, date, session, l.group ?? "", l.id, code, by);
      }
    }
  }

  // HE / college: one mark per timetabled contact point the cohort attends.
  const blockSlots = timetableSlots.filter((s) => s.tenantId === "T-010" || s.tenantId === "T-011");
  const heDays = schoolDays("2026-10-05", DEMO_TODAY);
  const heNormal: [number, string][] = [
    [0.88, "A"],
    [0.05, "L"],
    [0.03, "O"],
    [0.02, "AA"],
    [0.02, "X"],
  ];
  const vetNormal: [number, string][] = [
    [0.9, "P"],
    [0.04, "PP"],
    [0.03, "MC"],
    [0.03, "A"],
  ];
  for (const l of seedLearners.filter(
    (x) => (x.tenantId === "T-010" || x.tenantId === "T-011") && x.status === "Active",
  )) {
    const mine = blockSlots.filter(
      (s) => s.tenantId === l.tenantId && s.cohorts?.includes(l.group ?? ""),
    );
    const points: { date: string; slot: TimetableSlot }[] = [];
    for (const date of heDays) {
      for (const slot of mine.filter((s) => s.day === weekdayOf(date))) points.push({ date, slot });
    }
    points.forEach(({ date, slot }, i) => {
      let code: string;
      if (l.tenantId === "T-010") {
        // Chen Wei stops engaging: the last 12 contact points are no-shows.
        if (l.id === "S-4004" && i >= points.length - 12) code = "X";
        else code = pick(rnd(), heNormal);
      } else if (l.id === "S-5001") {
        // Sakura Tanaka: about three in every twelve sessions missed (≈75%).
        code = i % 4 === 1 ? "A" : "P";
      } else if (l.id === "S-5002" || l.id === "S-5007") {
        code = i % 5 === 3 ? "WP" : pick(rnd(), vetNormal);
      } else {
        code = pick(rnd(), vetNormal);
      }
      mk(
        l.tenantId,
        date,
        `${slot.day} ${slot.start}`,
        slot.groupLabel,
        l.id,
        code,
        slot.teacherName,
      );
    });
  }
  return out;
}

export const registerMarks: RegisterMark[] = buildMarks();

/* ── Admissions ──────────────────────────────────────────────────────────── */

const schoolDocs = (missing: string[] = []): Application["documents"] =>
  [
    "Birth certificate",
    "Passport & residence visa",
    "Emirates ID",
    "Previous school reports",
    "Transfer certificate",
  ].map((name) => ({ name, status: missing.includes(name) ? "Missing" : "Verified" }));
const heDocs = (
  overrides: Record<string, "Missing" | "Uploaded" | "Verified"> = {},
): Application["documents"] =>
  [
    "Passport",
    "Academic transcripts",
    "Personal statement",
    "Reference",
    "English language (IELTS / equivalent)",
  ].map((name) => ({ name, status: overrides[name] ?? "Verified" }));
const vetDocs = (
  overrides: Record<string, "Missing" | "Uploaded" | "Verified"> = {},
): Application["documents"] =>
  ["Proof of identity", "USI", "LLN assessment", "Previous qualifications"].map((name) => ({
    name,
    status: overrides[name] ?? "Verified",
  }));

export const applications: Application[] = [
  // ── Meridian Dubai (school) ──
  {
    id: "APP-0901",
    tenantId: "T-009",
    applicantName: "Leila Mansour",
    gender: "F",
    dob: "2014-03-02",
    email: "r.mansour@example.ae",
    guardianName: "Rami Mansour",
    nationality: "Lebanese",
    source: "Open day",
    target: "Year 7 · British (IGCSE & A Level)",
    yearGroup: "Year 7",
    curriculumId: "CUR-0901",
    intake: "Aug 2027",
    stage: "Waitlist",
    assessment: { kind: "Entrance test", date: "2026-10-14", score: 71, outcome: "Pass" },
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-09-20",
    owner: "Reem Al Hashimi",
    channel: "Walk-in",
    branch: "Al Barsha campus",
    phone: "+971 50 412 7781",
    notes: "Year 7 British is oversubscribed — waitlist position 2. Sibling priority: none.",
  },
  {
    id: "APP-0902",
    tenantId: "T-009",
    applicantName: "Noah Sinclair",
    gender: "M",
    dob: "2014-06-18",
    email: "k.sinclair@example.com",
    guardianName: "Kate Sinclair",
    nationality: "British",
    source: "Website",
    target: "Year 7 · British (IGCSE & A Level)",
    yearGroup: "Year 7",
    curriculumId: "CUR-0901",
    intake: "Aug 2027",
    stage: "Waitlist",
    assessment: { kind: "Entrance test", date: "2026-10-14", score: 68, outcome: "Pass" },
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-09-28",
    owner: "Reem Al Hashimi",
    channel: "Web form",
    branch: "Al Barsha campus",
    phone: "+971 55 208 3310",
    notes: "Waitlist position 3.",
  },
  {
    id: "APP-0903",
    tenantId: "T-009",
    applicantName: "Sofia Petrova",
    gender: "F",
    dob: "2012-09-11",
    email: "petrov.family@example.com",
    guardianName: "Elena Petrova",
    nationality: "Russian",
    source: "Website",
    target: "Year 9 · British (IGCSE & A Level)",
    yearGroup: "Year 9",
    curriculumId: "CUR-0901",
    intake: "Term 2 2026–27",
    stage: "Offer",
    assessment: { kind: "Entrance test", date: "2026-10-21", score: 82, outcome: "Pass" },
    offer: { type: "Unconditional", issuedAt: "2026-10-28" },
    deposit: { amount: 5000, paid: false },
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-10-02",
    owner: "Priya Nair",
    channel: "Web form",
    branch: "Al Barsha campus",
    phone: "+971 56 771 0923",
    followUps: [
      {
        id: "APP-0903-F1",
        due: "2026-11-04",
        note: "Chase deposit — offer holds until 11 Nov",
        by: "Priya Nair",
      },
    ],
  },
  {
    id: "APP-0904",
    tenantId: "T-009",
    applicantName: "Arman Qureshi",
    gender: "M",
    dob: "2013-11-30",
    email: "qureshi.home@example.ae",
    guardianName: "Sana Qureshi",
    nationality: "Pakistani",
    source: "Referral",
    target: "Grade 8 · CBSE",
    yearGroup: "Grade 8",
    curriculumId: "CUR-0903",
    intake: "Apr 2027",
    stage: "Applied",
    visaRequired: false,
    documents: schoolDocs(["Transfer certificate"]),
    createdAt: "2026-10-25",
    owner: "Daniel Brooks",
    channel: "Phone",
    branch: "Al Barsha campus",
    phone: "+971 50 993 2145",
    officialIds: { emiratesId: "784-2013-5512340-7" },
    followUps: [
      {
        id: "APP-0904-F1",
        due: "2026-10-31",
        note: "Chase transfer certificate from the Lahore school",
        by: "Daniel Brooks",
      },
    ],
    notes: "Transfer certificate to follow from previous school in Lahore.",
  },
  {
    id: "APP-0905",
    tenantId: "T-009",
    applicantName: "Hiba Nasser",
    gender: "F",
    dob: "2010-01-08",
    email: "nasser.h@example.ae",
    guardianName: "Omar Nasser",
    nationality: "Syrian",
    source: "Referral",
    target: "Year 12 · A Level",
    yearGroup: "Year 12",
    curriculumId: "CUR-0901",
    intake: "Term 2 2026–27",
    stage: "Assessment",
    assessment: { kind: "Interview", date: "2026-11-05" },
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-10-18",
    owner: "Priya Nair",
    channel: "Walk-in",
    branch: "Al Barsha campus",
    phone: "+971 52 340 7718",
    followUps: [
      {
        id: "APP-0905-F1",
        due: "2026-11-02",
        note: "Confirm interview time with parents",
        by: "Priya Nair",
      },
    ],
  },
  {
    id: "APP-0906",
    tenantId: "T-009",
    applicantName: "Lucas Moreau",
    gender: "M",
    dob: "2010-04-27",
    email: "moreau.fam@example.fr",
    guardianName: "Julien Moreau",
    nationality: "French",
    source: "Agent",
    target: "IB Diploma · Year 1",
    yearGroup: "IB DP Year 1",
    curriculumId: "CUR-0902",
    intake: "Term 2 2026–27",
    stage: "Deposit paid",
    assessment: { kind: "Interview", date: "2026-10-09", outcome: "Pass" },
    offer: { type: "Unconditional", issuedAt: "2026-10-15" },
    deposit: { amount: 5000, paid: true, paidAt: "2026-10-22" },
    visaRequired: true,
    documents: schoolDocs(),
    createdAt: "2026-09-30",
    owner: "Priya Nair",
    channel: "Agent",
    branch: "Al Barsha campus",
    followUps: [
      {
        id: "APP-0906-F1",
        due: "2026-10-21",
        note: "Send deposit payment link",
        by: "Priya Nair",
        done: "2026-10-21",
      },
    ],
    notes: "Relocating from Paris in December. Residence visa sponsored by the father's employer.",
  },
  {
    id: "APP-0907",
    tenantId: "T-009",
    applicantName: "Maya Fernandes",
    gender: "F",
    dob: "2019-05-03",
    email: "fernandes.m@example.ae",
    guardianName: "Clara Fernandes",
    nationality: "Indian",
    source: "CRM lead",
    target: "Year 3 · British",
    yearGroup: "Year 3",
    curriculumId: "CUR-0901",
    intake: "Aug 2027",
    stage: "Enquiry",
    visaRequired: false,
    documents: schoolDocs(["Previous school reports", "Transfer certificate", "Emirates ID"]),
    createdAt: "2026-10-30",
    owner: "Reem Al Hashimi",
    channel: "Email",
    branch: "Al Barsha campus",
    phone: "+971 55 614 2290",
    followUps: [
      {
        id: "APP-0907-F1",
        due: "2026-10-31",
        note: "First call-back — book a school tour",
        by: "Reem Al Hashimi",
      },
    ],
    notes: "Handed over from Marketing & CRM after the October open morning.",
  },
  {
    id: "APP-0908",
    tenantId: "T-009",
    applicantName: "Zaid Al Mazrouei",
    gender: "M",
    dob: "2011-08-14",
    email: "almazrouei@example.ae",
    guardianName: "Fatma Al Mazrouei",
    nationality: "Emirati",
    source: "Direct",
    target: "Year 10 · British (IGCSE)",
    yearGroup: "Year 10",
    curriculumId: "CUR-0901",
    intake: "Term 2 2026–27",
    stage: "Accepted",
    assessment: { kind: "Entrance test", date: "2026-10-07", score: 76, outcome: "Pass" },
    offer: { type: "Unconditional", issuedAt: "2026-10-13" },
    deposit: { amount: 5000, paid: false },
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-09-25",
    owner: "Daniel Brooks",
    channel: "Walk-in",
    branch: "Al Barsha campus",
    phone: "+971 50 220 4471",
    followUps: [
      { id: "APP-0908-F1", due: "2026-11-02", note: "Deposit reminder call", by: "Daniel Brooks" },
    ],
  },
  {
    id: "APP-0909",
    tenantId: "T-009",
    applicantName: "Chloe Dubois",
    gender: "F",
    dob: "2016-02-22",
    email: "dubois@example.com",
    guardianName: "Marc Dubois",
    nationality: "Belgian",
    source: "Website",
    target: "Year 6 · British",
    yearGroup: "Year 6",
    curriculumId: "CUR-0901",
    intake: "Term 2 2026–27",
    stage: "Declined",
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-09-12",
    owner: "Reem Al Hashimi",
    channel: "Web form",
    branch: "Al Barsha campus",
    notes: "Family accepted a place at another school.",
  },
  {
    id: "APP-0910",
    tenantId: "T-009",
    applicantName: "Kian Ahmadi",
    gender: "M",
    dob: "2014-10-05",
    email: "ahmadi.k@example.ae",
    guardianName: "Parisa Ahmadi",
    nationality: "Iranian",
    source: "Open day",
    target: "Year 7 · British (IGCSE & A Level)",
    yearGroup: "Year 7",
    curriculumId: "CUR-0901",
    intake: "Aug 2027",
    stage: "Waitlist",
    assessment: { kind: "Entrance test", date: "2026-10-14", score: 64, outcome: "Borderline" },
    visaRequired: false,
    documents: schoolDocs(),
    createdAt: "2026-10-01",
    owner: "Reem Al Hashimi",
    channel: "Walk-in",
    branch: "Dubai Hills info centre",
    notes: "Waitlist position 5.",
  },
  // ── Northbridge University (HE) ──
  {
    id: "APP-1001",
    tenantId: "T-010",
    applicantName: "Harriet Lane",
    gender: "F",
    dob: "2008-03-19",
    email: "harriet.lane@example.co.uk",
    nationality: "British",
    source: "UCAS",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Offer",
    offer: {
      type: "Conditional",
      conditions: "AAB at A Level including Mathematics",
      issuedAt: "2026-10-30",
    },
    visaRequired: false,
    documents: heDocs({ "English language (IELTS / equivalent)": "Verified" }),
    createdAt: "2026-10-16",
    owner: "Priya Raman",
    channel: "Web form",
    branch: "Main campus",
    phone: "+44 7700 900112",
    followUps: [
      {
        id: "APP-1001-F1",
        due: "2026-11-06",
        note: "Check firm / insurance choice on UCAS",
        by: "Priya Raman",
      },
    ],
  },
  {
    id: "APP-1002",
    tenantId: "T-010",
    applicantName: "Kwame Mensah",
    gender: "M",
    dob: "2000-07-02",
    email: "kwame.mensah@example.com.gh",
    nationality: "Ghanaian",
    source: "Agent",
    target: "MSc Data Science",
    programmeId: "PRG-1002",
    intake: "Jan 2027",
    stage: "Deposit paid",
    offer: { type: "Unconditional", issuedAt: "2026-10-05" },
    deposit: { amount: 4000, paid: true, paidAt: "2026-10-20" },
    visaRequired: true,
    documents: heDocs({ "English language (IELTS / equivalent)": "Uploaded" }),
    createdAt: "2026-09-10",
    owner: "Fatima Malik",
    channel: "Agent",
    branch: "International office",
    followUps: [
      {
        id: "APP-1002-F1",
        due: "2026-10-28",
        note: "Request CAS once IELTS is verified",
        by: "Fatima Malik",
        done: "2026-10-29",
      },
    ],
    notes: "CAS pending — financial evidence checked. Agent: Global Pathways Accra.",
  },
  {
    id: "APP-1003",
    tenantId: "T-010",
    applicantName: "Wang Lei",
    gender: "M",
    dob: "2001-12-01",
    email: "wang.lei@example.cn",
    nationality: "Chinese",
    source: "Agent",
    target: "MSc Data Science",
    programmeId: "PRG-1002",
    intake: "Jan 2027",
    stage: "Accepted",
    offer: { type: "Unconditional", issuedAt: "2026-10-12" },
    deposit: { amount: 4000, paid: false },
    visaRequired: true,
    documents: heDocs(),
    createdAt: "2026-09-22",
    owner: "Fatima Malik",
    channel: "Agent",
    branch: "International office",
    followUps: [
      {
        id: "APP-1003-F1",
        due: "2026-10-30",
        note: "Deposit reminder — CAS is blocked until paid",
        by: "Fatima Malik",
      },
    ],
    notes: "Deposit due before CAS can be issued.",
  },
  {
    id: "APP-1004",
    tenantId: "T-010",
    applicantName: "George Harris",
    gender: "M",
    dob: "2008-05-07",
    email: "g.harris@example.co.uk",
    nationality: "British",
    source: "UCAS",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Applied",
    visaRequired: false,
    documents: heDocs({ Reference: "Missing" }),
    createdAt: "2026-10-27",
    owner: "Priya Raman",
    channel: "Web form",
    branch: "Main campus",
    phone: "+44 7700 900245",
    followUps: [
      {
        id: "APP-1004-F1",
        due: "2026-11-02",
        note: "Chase missing reference from school",
        by: "Priya Raman",
      },
    ],
  },
  {
    id: "APP-1005",
    tenantId: "T-010",
    applicantName: "Amira Hassan",
    gender: "F",
    dob: "2008-01-24",
    email: "amira.hassan@example.eg",
    nationality: "Egyptian",
    source: "UCAS",
    target: "BSc (Hons) Business Management",
    programmeId: "PRG-1003",
    intake: "Sep 2027",
    stage: "Offer",
    offer: {
      type: "Conditional",
      conditions: "IGCSE + A Level equivalent ABB; IELTS 6.5 (no band below 6.0)",
      issuedAt: "2026-10-22",
    },
    visaRequired: true,
    documents: heDocs({ "English language (IELTS / equivalent)": "Missing" }),
    createdAt: "2026-10-03",
    owner: "Oliver Bennett",
    channel: "Email",
    branch: "International office",
    followUps: [
      {
        id: "APP-1005-F1",
        due: "2026-10-27",
        note: "Ask for IELTS test date",
        by: "Oliver Bennett",
      },
    ],
  },
  {
    id: "APP-1006",
    tenantId: "T-010",
    applicantName: "Sneha Pillai",
    gender: "F",
    dob: "2007-09-15",
    email: "sneha.pillai@example.in",
    nationality: "Indian",
    source: "Agent",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Assessment",
    assessment: { kind: "Interview", date: "2026-11-10" },
    visaRequired: true,
    documents: heDocs({ "English language (IELTS / equivalent)": "Uploaded" }),
    createdAt: "2026-10-11",
    owner: "Priya Raman",
    channel: "Agent",
    branch: "International office",
    followUps: [
      {
        id: "APP-1006-F1",
        due: "2026-11-09",
        note: "Credibility interview prep call",
        by: "Priya Raman",
      },
    ],
    notes: "Online credibility interview (UKVI genuine student check).",
  },
  {
    id: "APP-1007",
    tenantId: "T-010",
    applicantName: "Callum Reed",
    gender: "M",
    dob: "2008-11-02",
    email: "callum.reed@example.co.uk",
    nationality: "British",
    source: "CRM lead",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Enquiry",
    visaRequired: false,
    documents: heDocs({
      "Academic transcripts": "Missing",
      "Personal statement": "Missing",
      Reference: "Missing",
    }),
    createdAt: "2026-10-31",
    owner: "Priya Raman",
    channel: "Walk-in",
    branch: "Main campus",
    phone: "+44 7700 900398",
    followUps: [
      {
        id: "APP-1007-F1",
        due: "2026-11-01",
        note: "First call-back after the open day",
        by: "Priya Raman",
      },
    ],
    notes: "Open-day attendee handed over from Marketing & CRM — will apply via UCAS.",
  },
  {
    id: "APP-1008",
    tenantId: "T-010",
    applicantName: "Sophie Grant",
    gender: "F",
    dob: "2008-04-11",
    email: "sophie.grant@example.co.uk",
    nationality: "British",
    source: "UCAS",
    target: "BSc (Hons) Business Management",
    programmeId: "PRG-1003",
    intake: "Sep 2027",
    stage: "Declined",
    offer: { type: "Conditional", conditions: "BBB at A Level", issuedAt: "2026-10-08" },
    visaRequired: false,
    documents: heDocs(),
    createdAt: "2026-09-29",
    owner: "Oliver Bennett",
    channel: "Web form",
    branch: "Main campus",
    notes: "Declined via UCAS — firmed another provider.",
  },
  {
    id: "APP-1009",
    tenantId: "T-010",
    applicantName: "Tariq Aziz",
    gender: "M",
    dob: "1999-06-21",
    email: "tariq.aziz@example.pk",
    nationality: "Pakistani",
    source: "Agent",
    target: "MSc Data Science",
    programmeId: "PRG-1002",
    intake: "Sep 2027",
    stage: "Applied",
    visaRequired: true,
    documents: heDocs({
      "Academic transcripts": "Uploaded",
      "English language (IELTS / equivalent)": "Missing",
    }),
    createdAt: "2026-10-29",
    owner: "Fatima Malik",
    channel: "Agent",
    branch: "International office",
    followUps: [
      {
        id: "APP-1009-F1",
        due: "2026-11-03",
        note: "IELTS certificate still outstanding",
        by: "Fatima Malik",
      },
    ],
  },
  {
    id: "APP-1010",
    tenantId: "T-010",
    applicantName: "Lily Chen",
    gender: "F",
    dob: "2008-02-14",
    email: "lily.chen@example.co.uk",
    nationality: "British",
    source: "UCAS",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Offer",
    offer: { type: "Unconditional", issuedAt: "2026-10-26" },
    visaRequired: false,
    documents: heDocs(),
    createdAt: "2026-10-06",
    owner: "Priya Raman",
    channel: "Phone",
    branch: "Main campus",
    phone: "+44 7700 900531",
    notes: "Unconditional — already holds A Level results (gap year).",
  },
  // ── Harbourside College (VET + HE) ──
  {
    id: "APP-1101",
    tenantId: "T-011",
    applicantName: "Mason Kelly",
    gender: "M",
    dob: "2008-07-30",
    email: "mason.kelly@example.com.au",
    nationality: "Australian",
    source: "Referral",
    target: "UEE30820 Cert III Electrotechnology Electrician (apprenticeship)",
    qualificationId: "QUA-1102",
    intake: "Rolling (VET)",
    stage: "Applied",
    visaRequired: false,
    documents: vetDocs({ "LLN assessment": "Missing" }),
    createdAt: "2026-10-20",
    owner: "Josh Taylor",
    channel: "Walk-in",
    branch: "Parramatta",
    phone: "+61 412 555 019",
    followUps: [
      { id: "APP-1101-F1", due: "2026-10-30", note: "Book LLN assessment", by: "Josh Taylor" },
    ],
    notes:
      "Employer: Coastline Electrical Pty Ltd — training contract to be lodged with the Apprenticeship Network Provider.",
  },
  {
    id: "APP-1102",
    tenantId: "T-011",
    applicantName: "Yuki Sato",
    gender: "F",
    dob: "2005-01-12",
    email: "yuki.sato@example.jp",
    nationality: "Japanese",
    source: "Agent",
    target: "ICT50220 Diploma of Information Technology",
    qualificationId: "QUA-1101",
    intake: "Feb 2027",
    stage: "Offer",
    offer: {
      type: "Conditional",
      conditions: "IELTS 5.5 overall; payment of first study period fee",
      issuedAt: "2026-10-24",
    },
    visaRequired: true,
    documents: vetDocs({ USI: "Missing" }),
    createdAt: "2026-10-01",
    owner: "Mia Nguyen",
    channel: "Agent",
    branch: "Sydney CBD",
    followUps: [
      {
        id: "APP-1102-F1",
        due: "2026-11-03",
        note: "Remind her to create a USI",
        by: "Mia Nguyen",
      },
    ],
    notes: "CoE to be issued in PRISMS after acceptance + deposit.",
  },
  {
    id: "APP-1103",
    tenantId: "T-011",
    applicantName: "Holly Turner",
    gender: "F",
    dob: "2007-03-03",
    email: "holly.turner@example.com.au",
    nationality: "Australian",
    source: "Website",
    target: "HLT54121 Diploma of Nursing",
    qualificationId: "QUA-1104",
    intake: "Feb 2027",
    stage: "Assessment",
    assessment: { kind: "Placement test", date: "2026-11-06" },
    visaRequired: false,
    documents: vetDocs(),
    createdAt: "2026-10-15",
    owner: "Josh Taylor",
    channel: "Web form",
    branch: "Sydney CBD",
    phone: "+61 433 802 116",
    notes: "Language, literacy & numeracy (LLN) test booked.",
  },
  {
    id: "APP-1104",
    tenantId: "T-011",
    applicantName: "Nikhil Verma",
    gender: "M",
    dob: "2004-08-09",
    email: "nikhil.verma@example.in",
    nationality: "Indian",
    source: "Agent",
    target: "Bachelor of Information Technology",
    programmeId: "PRG-1101",
    intake: "Feb 2027",
    stage: "Deposit paid",
    offer: { type: "Unconditional", issuedAt: "2026-10-02" },
    deposit: { amount: 6500, paid: true, paidAt: "2026-10-19" },
    visaRequired: true,
    documents: vetDocs(),
    createdAt: "2026-09-08",
    owner: "Mia Nguyen",
    channel: "Agent",
    branch: "Sydney CBD",
    notes: "Ready to enrol — CoE to be issued.",
  },
  {
    id: "APP-1105",
    tenantId: "T-011",
    applicantName: "Zoe Mitchell",
    gender: "F",
    dob: "1986-12-19",
    email: "zoe.mitchell@example.com.au",
    nationality: "Australian",
    source: "CRM lead",
    target: "CHC43015 Cert IV Ageing Support",
    qualificationId: "QUA-1103",
    intake: "Feb 2027",
    stage: "Enquiry",
    visaRequired: false,
    documents: vetDocs({
      USI: "Missing",
      "LLN assessment": "Missing",
      "Previous qualifications": "Missing",
    }),
    createdAt: "2026-10-30",
    owner: "Josh Taylor",
    channel: "Phone",
    branch: "Parramatta",
    phone: "+61 421 377 640",
    followUps: [
      {
        id: "APP-1105-F1",
        due: "2026-11-02",
        note: "Check Fee-Free TAFE eligibility and call back",
        by: "Josh Taylor",
      },
    ],
    notes: "Career changer — asking about Fee-Free TAFE eligibility.",
  },
  {
    id: "APP-1106",
    tenantId: "T-011",
    applicantName: "Sam Fletcher",
    gender: "M",
    dob: "2008-10-10",
    email: "sam.fletcher@example.com.au",
    nationality: "Australian",
    source: "Direct",
    target: "CPC30220 Cert III Carpentry (apprenticeship)",
    qualificationId: "QUA-1105",
    intake: "Rolling (VET)",
    stage: "Accepted",
    offer: { type: "Unconditional", issuedAt: "2026-10-18" },
    deposit: { amount: 0, paid: false },
    visaRequired: false,
    documents: vetDocs(),
    createdAt: "2026-10-05",
    owner: "Liam O'Connor",
    channel: "Walk-in",
    branch: "Parramatta",
    phone: "+61 409 118 552",
    notes: "Employer: Harbour Build Co. No deposit — funded apprenticeship.",
  },
  {
    id: "APP-0911",
    tenantId: "T-009",
    applicantName: "Aarav Menon",
    gender: "M",
    dob: "2017-02-14",
    email: "vivek.menon@example.ae",
    phone: "+971 52 660 1904",
    guardianName: "Vivek Menon",
    nationality: "Indian",
    source: "Direct",
    target: "Grade 5 · CBSE",
    yearGroup: "Grade 5",
    curriculumId: "CUR-0903",
    intake: "Apr 2027",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-10-27",
    owner: "Daniel Brooks",
    channel: "Walk-in",
    branch: "Al Barsha campus",
    officialIds: { emiratesId: "784-2017-3301245-2" },
    notes: "Walked in with his father. Moving from a CBSE school in Kochi.",
    documents: schoolDocs(["Previous school reports", "Transfer certificate"]),
    followUps: [
      {
        id: "APP-0911-F1",
        due: "2026-10-29",
        note: "Send CBSE fee schedule and book the assessment",
        by: "Daniel Brooks",
      },
    ],
  },
  {
    id: "APP-0912",
    tenantId: "T-009",
    applicantName: "Mariam Al Suwaidi",
    gender: "F",
    dob: "2016-01-20",
    email: "k.alsuwaidi@example.ae",
    phone: "+971 50 118 4420",
    guardianName: "Khalid Al Suwaidi",
    nationality: "Emirati",
    source: "Direct",
    target: "Year 7 · British (IGCSE & A Level)",
    yearGroup: "Year 7",
    curriculumId: "CUR-0901",
    intake: "Aug 2027",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-11-01",
    owner: "Reem Al Hashimi",
    channel: "Phone",
    branch: "Al Barsha campus",
    documents: schoolDocs(["Previous school reports", "Transfer certificate"]),
    followUps: [
      {
        id: "APP-0912-F1",
        due: "2026-11-02",
        note: "Call back with entrance test dates",
        by: "Reem Al Hashimi",
      },
    ],
  },
  {
    id: "APP-1011",
    tenantId: "T-010",
    applicantName: "Ashan Jayasuriya",
    gender: "M",
    dob: "2009-05-30",
    email: "ashan.jayasuriya@example.lk",
    phone: "+94 77 123 4567",
    nationality: "Sri Lankan",
    source: "Open day",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Applied",
    visaRequired: true,
    createdAt: "2026-10-26",
    owner: "Priya Raman",
    channel: "Exhibition",
    branch: "International office",
    officialIds: { nic: "200915102233", passport: "N8812345" },
    notes:
      "Met at the Colombo education fair. Currently Year 13 at Meridian Colombo — A Levels in 2027.",
    documents: heDocs({
      "Academic transcripts": "Uploaded",
      Reference: "Missing",
      "English language (IELTS / equivalent)": "Missing",
    }),
    followUps: [
      {
        id: "APP-1011-F1",
        due: "2026-10-30",
        note: "Ask Meridian Colombo for predicted A Level grades",
        by: "Priya Raman",
      },
      {
        id: "APP-1011-F2",
        due: "2026-11-05",
        note: "Explain the CAS timeline and Graduate route to the family",
        by: "Priya Raman",
      },
    ],
  },
  {
    id: "APP-1012",
    tenantId: "T-010",
    applicantName: "Ella Whitaker",
    gender: "F",
    dob: "2008-08-09",
    email: "ella.whitaker@example.co.uk",
    phone: "07700 900461",
    nationality: "British",
    source: "Direct",
    target: "BSc (Hons) Business Management",
    programmeId: "PRG-1003",
    intake: "Sep 2027",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-10-24",
    owner: "Oliver Bennett",
    channel: "Walk-in",
    branch: "Main campus",
    notes: "Walked in with a parent after a campus tour.",
    documents: heDocs({
      "Academic transcripts": "Missing",
      "Personal statement": "Missing",
      Reference: "Missing",
    }),
    followUps: [
      {
        id: "APP-1012-F1",
        due: "2026-10-31",
        note: "Send the Business Management course guide",
        by: "Oliver Bennett",
      },
    ],
  },
  {
    id: "APP-1013",
    tenantId: "T-010",
    applicantName: "Ella Whitaker",
    gender: "F",
    dob: "2008-08-09",
    email: "Ella.Whitaker@Example.co.uk",
    phone: "+44 7700 900461",
    nationality: "British",
    source: "Website",
    target: "BSc (Hons) Business Management",
    programmeId: "PRG-1003",
    intake: "Sep 2027",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-10-29",
    owner: "Fatima Malik",
    channel: "Web form",
    branch: "Main campus",
    notes: "Web form: asked about a placement year.",
    documents: heDocs({
      "Academic transcripts": "Missing",
      "Personal statement": "Missing",
      Reference: "Missing",
    }),
    followUps: [
      { id: "APP-1013-F1", due: "2026-11-02", note: "First call-back", by: "Fatima Malik" },
    ],
  },
  {
    id: "APP-1014",
    tenantId: "T-010",
    applicantName: "Daniel Okafor",
    gender: "M",
    dob: "1997-03-12",
    email: "daniel.okafor@example.co.uk",
    phone: "+44 7911 123456",
    nationality: "British",
    source: "Direct",
    target: "MSc Data Science",
    programmeId: "PRG-1002",
    intake: "Jan 2027",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-10-31",
    owner: "Fatima Malik",
    channel: "Phone",
    branch: "London centre",
    documents: heDocs({
      "Academic transcripts": "Missing",
      "Personal statement": "Missing",
      Reference: "Missing",
    }),
    followUps: [
      {
        id: "APP-1014-F1",
        due: "2026-11-02",
        note: "Confirm 2:1 transcript and January start",
        by: "Fatima Malik",
      },
    ],
  },
  {
    id: "APP-1015",
    tenantId: "T-010",
    applicantName: "Mei Ling Tan",
    gender: "F",
    dob: "2001-04-08",
    email: "meiling.tan@example.my",
    nationality: "Malaysian",
    source: "Agent",
    target: "MSc Data Science",
    programmeId: "PRG-1002",
    intake: "Jan 2027",
    stage: "Deposit paid",
    offer: { type: "Unconditional", issuedAt: "2026-10-08" },
    deposit: { amount: 4000, paid: true, paidAt: "2026-10-21" },
    visaRequired: true,
    createdAt: "2026-09-18",
    owner: "Fatima Malik",
    channel: "Agent",
    branch: "International office",
    officialIds: { passport: "A51234567" },
    notes: "Agent: Bright Futures KL. CAS requested.",
    documents: heDocs(),
  },
  {
    id: "APP-1016",
    tenantId: "T-010",
    applicantName: "Rahul Iyer",
    gender: "M",
    dob: "2006-11-04",
    email: "rahul.iyer@example.in",
    nationality: "Indian",
    source: "Agent",
    target: "BSc (Hons) Business Management",
    programmeId: "PRG-1003",
    intake: "Jan 2027",
    stage: "Deposit paid",
    offer: { type: "Unconditional", issuedAt: "2026-10-10" },
    deposit: { amount: 4000, paid: true, paidAt: "2026-10-25" },
    visaRequired: true,
    createdAt: "2026-09-24",
    owner: "Oliver Bennett",
    channel: "Agent",
    branch: "International office",
    documents: heDocs(),
  },
  {
    id: "APP-1017",
    tenantId: "T-010",
    applicantName: "Rhys Morgan",
    gender: "M",
    dob: "2008-06-22",
    email: "rhys.morgan@example.co.uk",
    phone: "+44 7700 900877",
    nationality: "British",
    source: "Direct",
    target: "BSc (Hons) Computer Science",
    programmeId: "PRG-1001",
    intake: "Sep 2027",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-11-01",
    owner: "Oliver Bennett",
    channel: "WhatsApp",
    branch: "Main campus",
    documents: heDocs({
      "Academic transcripts": "Missing",
      "Personal statement": "Missing",
      Reference: "Missing",
    }),
    followUps: [
      {
        id: "APP-1017-F1",
        due: "2026-11-04",
        note: "Send the 21 Nov open day invite",
        by: "Oliver Bennett",
      },
    ],
  },
  {
    id: "APP-1107",
    tenantId: "T-011",
    applicantName: "Ngoc Anh Tran",
    gender: "F",
    dob: "2003-06-17",
    email: "ngocanh.tran@example.vn",
    phone: "+61 451 220 873",
    nationality: "Vietnamese",
    source: "Direct",
    target: "ICT50220 Diploma of Information Technology",
    qualificationId: "QUA-1101",
    intake: "Feb 2027",
    stage: "Enquiry",
    visaRequired: true,
    createdAt: "2026-10-26",
    owner: "Mia Nguyen",
    channel: "WhatsApp",
    branch: "Sydney CBD",
    officialIds: { passport: "C1234567" },
    documents: vetDocs({
      USI: "Missing",
      "LLN assessment": "Missing",
      "Previous qualifications": "Missing",
    }),
    followUps: [
      {
        id: "APP-1107-F1",
        due: "2026-10-28",
        note: "Send international fee schedule and CRICOS code",
        by: "Mia Nguyen",
      },
    ],
  },
  {
    id: "APP-1108",
    tenantId: "T-011",
    applicantName: "Jack Robinson",
    gender: "M",
    dob: "2009-02-02",
    email: "jack.robinson@example.com.au",
    phone: "0412 908 341",
    nationality: "Australian",
    source: "Direct",
    target: "CPC30220 Certificate III in Carpentry",
    qualificationId: "QUA-1105",
    intake: "Rolling (VET)",
    stage: "Enquiry",
    visaRequired: false,
    createdAt: "2026-11-01",
    owner: "Josh Taylor",
    channel: "Walk-in",
    branch: "Parramatta",
    documents: vetDocs({ USI: "Missing", "LLN assessment": "Missing" }),
    followUps: [
      {
        id: "APP-1108-F1",
        due: "2026-11-02",
        note: "Connect with an employer for the training contract",
        by: "Josh Taylor",
      },
    ],
  },
  {
    id: "APP-1109",
    tenantId: "T-011",
    applicantName: "Priya Desai",
    gender: "F",
    dob: "2004-12-01",
    email: "priya.desai@example.in",
    nationality: "Indian",
    source: "Agent",
    target: "Bachelor of Information Technology",
    programmeId: "PRG-1101",
    intake: "Jul 2027",
    stage: "Applied",
    visaRequired: true,
    createdAt: "2026-10-22",
    owner: "Mia Nguyen",
    channel: "Agent",
    branch: "Sydney CBD",
    officialIds: { passport: "Z4412098" },
    documents: vetDocs({ USI: "Missing" }),
    followUps: [
      {
        id: "APP-1109-F1",
        due: "2026-11-12",
        note: "Review her Genuine Student statement",
        by: "Mia Nguyen",
      },
    ],
  },
];

/* ── Staff vetting ───────────────────────────────────────────────────────── */

type CheckSeed = [key: string, status: VettingStatus, checkedOn?: string, ref?: string];

function checks(defs: VettingCheckDef[], seeds: CheckSeed[], by: string): VettingCheck[] {
  return seeds.map(([key, status, checkedOn, ref]) => {
    const def = defs.find((d) => d.key === key);
    const expires =
      checkedOn && def?.renewMonths ? addMonths(checkedOn, def.renewMonths) : undefined;
    return {
      key,
      status,
      checkedOn,
      ref,
      expires,
      verifiedBy: status === "Verified" || status === "Expired" ? by : undefined,
    };
  });
}

// Renewal periods mirror REGIONS[...].vettingChecks (kept local to avoid an import cycle).
const UKD: VettingCheckDef[] = [{ key: "dbs", label: "", renewMonths: 36 }];
const AED: VettingCheckDef[] = [{ key: "goodConduct", label: "", renewMonths: 12 }];
const AUD: VettingCheckDef[] = [
  { key: "wwcc", label: "", renewMonths: 60 },
  { key: "police", label: "", renewMonths: 36 },
];
const LKD: VettingCheckDef[] = [{ key: "police", label: "", renewMonths: 24 }];

const ae = (
  good: string,
  approval: VettingStatus = "Verified",
  goodStatus: VettingStatus = "Verified",
): CheckSeed[] => [
  ["identity", "Verified", "2025-08-01"],
  ["goodConduct", goodStatus, good, "GCC-" + good.replace(/-/g, "")],
  ["permit", "Verified", "2025-08-05", "MOHRE-WP"],
  [
    "approval",
    approval,
    approval === "Verified" ? "2025-08-20" : undefined,
    approval === "Verified" ? "KHDA-TA" : undefined,
  ],
  ["attest", "Verified", "2025-07-15"],
];

const uk = (
  dbs: string,
  dbsStatus: VettingStatus = "Verified",
  overseas: VettingStatus = "Not required",
): CheckSeed[] => [
  ["identity", "Verified", "2024-08-20"],
  [
    "dbs",
    dbsStatus,
    dbsStatus === "Pending" ? undefined : dbs,
    dbsStatus === "Pending" ? undefined : "0012" + dbs.replace(/-/g, "").slice(2),
  ],
  ["prohibition", "Verified", "2024-08-21"],
  ["s128", "Not required"],
  ["rtw", "Verified", "2024-08-20"],
  ["quals", "Verified", "2024-08-22"],
  ["overseas", overseas, overseas === "Verified" ? "2024-07-30" : undefined],
  ["refs", "Verified", "2024-08-15"],
];

const au = (
  wwcc: string,
  police: string,
  policeStatus: VettingStatus = "Verified",
): CheckSeed[] => [
  ["identity", "Verified", "2024-01-20"],
  ["wwcc", "Verified", wwcc, "WWC" + wwcc.replace(/-/g, "").slice(2) + "E"],
  [
    "police",
    policeStatus,
    policeStatus === "Pending" ? undefined : police,
    policeStatus === "Pending" ? undefined : "NPC-" + police.slice(0, 4),
  ],
  ["vrqa", "Not required"],
  ["quals", "Verified", "2024-01-22", "TAE40122"],
];

export const vettingRecords: VettingRecord[] = [
  // Meridian Dubai — UAE checks
  {
    id: "VET-0901",
    tenantId: "T-009",
    staffName: "Hannah Clarke",
    role: "Principal",
    startDate: "2021-08-15",
    checks: checks(AED, ae("2026-07-10"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0910",
    tenantId: "T-009",
    staffName: "Ms. Laura Bennett",
    role: "FS2 class teacher · FS2 Falcons",
    startDate: "2025-08-18",
    checks: checks(AED, ae("2026-08-04"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0902",
    tenantId: "T-009",
    staffName: CARTER,
    role: "Physics teacher · Tutor 10C",
    startDate: "2022-08-20",
    checks: checks(AED, ae("2026-06-02"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0903",
    tenantId: "T-009",
    staffName: LEWIS,
    role: "Mathematics teacher · Tutor 11A",
    startDate: "2023-08-18",
    checks: checks(AED, ae("2026-08-01"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0904",
    tenantId: "T-009",
    staffName: DAWSON,
    role: "English teacher · Tutor 12B",
    startDate: "2020-08-25",
    checks: checks(AED, ae("2025-12-20"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0905",
    tenantId: "T-009",
    staffName: WEBB,
    role: "IB Diploma Coordinator",
    startDate: "2019-08-22",
    checks: checks(AED, ae("2026-05-30"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0906",
    tenantId: "T-009",
    staffName: MENON,
    role: "CBSE Science teacher · Tutor 7B",
    startDate: "2024-04-01",
    checks: checks(AED, ae("2025-10-15"), "HR — Fatima Saeed"),
  },
  {
    id: "VET-0907",
    tenantId: "T-009",
    staffName: YUSUF,
    role: "Arabic & Islamic Studies teacher",
    startDate: "2026-08-24",
    checks: checks(AED, ae("2026-08-10", "Pending"), "HR — Fatima Saeed"),
  },
  // Northbridge — UK Single Central Record style
  {
    id: "VET-1001",
    tenantId: "T-010",
    staffName: "Dr. Eleanor Hughes",
    role: "Academic Registrar",
    startDate: "2018-09-01",
    checks: checks(UKD, uk("2024-08-19"), "HR — Peter Shaw"),
  },
  {
    id: "VET-1002",
    tenantId: "T-010",
    staffName: REID,
    role: "Senior Lecturer, Computer Science",
    startDate: "2016-09-01",
    checks: checks(UKD, uk("2025-01-10"), "HR — Peter Shaw"),
  },
  {
    id: "VET-1003",
    tenantId: "T-010",
    staffName: MOORE,
    role: "Head of School, Computing",
    startDate: "2012-01-09",
    checks: checks(UKD, uk("2024-03-02"), "HR — Peter Shaw"),
  },
  {
    id: "VET-1004",
    tenantId: "T-010",
    staffName: BELLO,
    role: "Lecturer, Data Science",
    startDate: "2024-09-01",
    checks: checks(UKD, uk("2024-08-12", "Verified", "Verified"), "HR — Peter Shaw"),
  },
  {
    id: "VET-1005",
    tenantId: "T-010",
    staffName: HARTLEY,
    role: "Lecturer, Software Engineering",
    startDate: "2026-10-01",
    checks: checks(UKD, uk("", "Pending"), "HR — Peter Shaw"),
  },
  {
    id: "VET-1006",
    tenantId: "T-010",
    staffName: EVANS,
    role: "Lecturer, Business",
    startDate: "2015-09-01",
    checks: checks(UKD, uk("2023-09-01"), "HR — Peter Shaw"),
  },
  // Harbourside — Australian checks
  {
    id: "VET-1101",
    tenantId: "T-011",
    staffName: "Liam O'Connor",
    role: "Registrar",
    startDate: "2020-01-13",
    checks: checks(AUD, au("2022-02-01", "2024-02-01"), "HR — Mia Tran"),
  },
  {
    id: "VET-1102",
    tenantId: "T-011",
    staffName: SULLIVAN,
    role: "ICT trainer & assessor",
    startDate: "2021-07-19",
    checks: checks(AUD, au("2021-11-20", "2025-03-11"), "HR — Mia Tran"),
  },
  {
    id: "VET-1103",
    tenantId: "T-011",
    staffName: WALSH,
    role: "Electrotechnology trainer",
    startDate: "2019-02-04",
    checks: checks(AUD, au("2023-05-09", "2024-05-09"), "HR — Mia Tran"),
  },
  {
    id: "VET-1104",
    tenantId: "T-011",
    staffName: KOWALSKI,
    role: "Nursing & Ageing Support trainer",
    startDate: "2022-01-24",
    checks: checks(AUD, au("2024-06-14", "2023-06-14"), "HR — Mia Tran"),
  },
  {
    id: "VET-1105",
    tenantId: "T-011",
    staffName: ARCHER,
    role: "Carpentry trainer",
    startDate: "2026-10-12",
    checks: checks(AUD, au("2026-09-30", "", "Pending"), "HR — Mia Tran"),
  },
  {
    id: "VET-1106",
    tenantId: "T-011",
    staffName: PATEL,
    role: "Lecturer, Bachelor of IT",
    startDate: "2023-02-20",
    checks: checks(AUD, au("2023-01-30", "2025-01-30"), "HR — Mia Tran"),
  },
  // Meridian Colombo — Sri Lankan checks
  {
    id: "VET-1201",
    tenantId: "T-012",
    staffName: "Mrs. Dilrukshi Gunawardena",
    role: "Head of School",
    startDate: "2017-01-09",
    checks: checks(
      LKD,
      [
        ["identity", "Verified", "2017-01-02"],
        ["police", "Verified", "2025-06-20", "PCR-25-0611"],
        ["gn", "Verified", "2017-01-05"],
        ["quals", "Verified", "2017-01-04"],
        ["refs", "Verified", "2017-01-03"],
      ],
      "Admin — Chathura",
    ),
  },
  {
    id: "VET-1202",
    tenantId: "T-012",
    staffName: "Mr. Sanjeewa Perera",
    role: "Science teacher",
    startDate: "2021-09-01",
    checks: checks(
      LKD,
      [
        ["identity", "Verified", "2021-08-20"],
        ["police", "Verified", "2024-08-15", "PCR-24-1182"],
        ["gn", "Verified", "2021-08-22"],
        ["quals", "Verified", "2021-08-21"],
        ["refs", "Pending"],
      ],
      "Admin — Chathura",
    ),
  },
  {
    id: "VET-1204",
    tenantId: "T-012",
    staffName: "Mrs. Nadeesha Silva",
    role: "Early Years lead · Upper Nursery",
    startDate: "2024-01-08",
    checks: checks(
      LKD,
      [
        ["identity", "Verified", "2023-12-11"],
        ["police", "Verified", "2025-11-20", "PCR-25-0388"],
        ["gn", "Verified", "2023-12-12"],
        ["quals", "Verified", "2023-12-12"],
        ["refs", "Verified", "2023-12-18"],
      ],
      "Admin — Chathura",
    ),
  },
  {
    id: "VET-1203",
    tenantId: "T-012",
    staffName: "Ms. Ishara Fernando",
    role: "Year 3 class teacher · 3B",
    startDate: "2023-01-09",
    checks: checks(
      LKD,
      [
        ["identity", "Verified", "2022-12-12"],
        ["police", "Verified", "2025-12-02", "PCR-25-0417"],
        ["gn", "Verified", "2022-12-14"],
        ["quals", "Verified", "2022-12-13"],
        ["refs", "Verified", "2022-12-20"],
      ],
      "Admin — Chathura",
    ),
  },
];
