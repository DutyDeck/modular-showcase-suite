/* ── Lecturer tools: QR attendance, class changes, teaching load. ────────── */

/** A live QR attendance session: the lecturer shows a rotating code, students
 *  scan it (or a biometric terminal posts the scan) and are marked present. */
export interface QrSession {
  id: string;
  tenantId: string;
  groupLabel: string; // register group / module cohort
  date: string;
  session: string; // register session key: "AM" / "PM" (school) or "Mon 10:00" (slot)
  code: string; // the code on screen when last rotated
  openedBy: string;
  openedAt: string;
  expiresAt: string;
  closed?: boolean;
  scans: { studentId: string; at: string; via: "QR" | "Biometric" }[];
  /** Timetable slot the session belongs to (HE / college contact points). */
  slotId?: string;
  /** Learner groups (Learner.group) on the roster — who may check in. */
  cohorts?: string[];
  /** Register marks written when the session closed. */
  savedMarks?: number;
}

/** A one-off change to a timetabled class; affected people are notified. */
export interface ClassChange {
  id: string;
  tenantId: string;
  slotId: string;
  date: string; // the occurrence affected
  kind: "Cancelled" | "Moved" | "Room change";
  newDate?: string;
  newStart?: string;
  newEnd?: string;
  newRoomId?: string;
  /** School period the class moves to (period timetables). */
  newPeriod?: string;
  reason: string;
  by: string;
  at: string;
  notified: number; // people notified
}

/** Who teaches what this term — drives workload and lecturer assignment. */
export interface TeachingAssignment {
  id: string;
  tenantId: string;
  staffName: string;
  moduleId?: string;
  groupLabel?: string;
  role: "Module leader" | "Lecturer" | "Tutor" | "Second marker" | "Supervisor";
  hours: number; // contact hours for the term
  term: string;
}

/** Staff teaching profile: contract load, expertise and availability. */
export interface StaffTeachingProfile {
  id: string;
  tenantId: string;
  staffName: string;
  contractHours: number; // per term (or per week when basis is "week")
  expertise: string[];
  availability: string; // "Mon–Thu", "Not Fridays"
  /** Schools count timetabled hours a week; HE / college count hours a term. */
  basis?: "term" | "week";
}

/* ── Helpers (pure) ──────────────────────────────────────────────────────── */

/** The code on screen changes every 30 seconds. */
export const QR_ROTATE_SECONDS = 30;
/** A check-in stays open for 20 minutes unless the lecturer closes it earlier. */
export const QR_SESSION_MINUTES = 20;

const QR_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** FNV-1a — small deterministic hash for demo codes and QR patterns. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Finaliser so near-identical inputs give unrelated outputs.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Which 30-second window of the session a moment falls in. */
export function qrWindow(s: Pick<QrSession, "openedAt">, nowMs: number): number {
  return Math.max(
    0,
    Math.floor((nowMs - new Date(s.openedAt).getTime()) / (QR_ROTATE_SECONDS * 1000)),
  );
}

/** The 6-character code shown during a given window. */
export function qrCodeFor(s: Pick<QrSession, "id">, window: number): string {
  let out = "";
  for (let i = 0; i < 6; i++)
    out += QR_ALPHABET[hashString(`${s.id}:${window}:${i}`) % QR_ALPHABET.length];
  return out;
}

export function qrCodeAt(s: Pick<QrSession, "id" | "openedAt">, nowMs: number): string {
  return qrCodeFor(s, qrWindow(s, nowMs));
}

export function qrIsLive(s: QrSession, nowMs: number): boolean {
  return !s.closed && nowMs < new Date(s.expiresAt).getTime();
}

/** Which term the load view counts, and which module deliveries run in it. */
export const TEACHING_TERMS: Record<string, { term: string; semesters: string[] }> = {
  "T-010": { term: "2026/27 S1", semesters: ["S1", "Year"] },
  "T-011": { term: "2026 S2", semesters: ["S2", "Year"] },
  "T-009": { term: "2026/27 Term 1", semesters: [] },
};

export function teachingTermFor(tenantId: string) {
  return TEACHING_TERMS[tenantId] ?? { term: "Current term", semesters: ["S1", "S2", "Year"] };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** "Mon–Thu", "Tue, Wed", "Not Fridays" → the weekdays someone can teach. */
export function availableDays(text: string): string[] {
  const t = text.trim();
  const not = /^not\s+(\w{3})/i.exec(t);
  if (not) return DAYS.filter((d) => d.toLowerCase() !== not[1].slice(0, 3).toLowerCase());
  const range = /(\w{3})\w*\s*[–-]\s*(\w{3})/.exec(t);
  if (range) {
    const a = DAYS.indexOf(range[1]);
    const b = DAYS.indexOf(range[2]);
    if (a >= 0 && b >= a) return DAYS.slice(a, b + 1);
  }
  const listed = DAYS.filter((d) => t.includes(d));
  return listed.length ? listed : DAYS;
}

/* ── Seeds ───────────────────────────────────────────────────────────────── */

const CS2 = "CS 2025 Sep cohort";

export const qrSessions: QrSession[] = [
  {
    id: "QR-1001",
    tenantId: "T-010",
    groupLabel: "CS201 · Lecture",
    slotId: "TT-10-001",
    cohorts: [CS2],
    date: "2026-10-26",
    session: "Mon 10:00",
    code: "K7P2QX",
    openedBy: "Dr. Samuel Reid",
    openedAt: "2026-10-26T10:04:00.000Z",
    expiresAt: "2026-10-26T10:24:00.000Z",
    closed: true,
    savedMarks: 5,
    scans: [
      { studentId: "S-4001", at: "2026-10-26T10:05:12.000Z", via: "QR" },
      { studentId: "S-4002", at: "2026-10-26T10:05:40.000Z", via: "QR" },
      { studentId: "S-4003", at: "2026-10-26T10:06:02.000Z", via: "Biometric" },
      { studentId: "S-4005", at: "2026-10-26T10:07:31.000Z", via: "QR" },
      { studentId: "S-4010", at: "2026-10-26T10:09:15.000Z", via: "QR" },
    ],
  },
  {
    id: "QR-0901",
    tenantId: "T-009",
    groupLabel: "10C",
    cohorts: ["10C"],
    date: "2026-10-30",
    session: "AM",
    code: "M4TR8W",
    openedBy: "Mr. James Carter",
    openedAt: "2026-10-30T07:41:00.000Z",
    expiresAt: "2026-10-30T08:01:00.000Z",
    closed: true,
    savedMarks: 3,
    scans: [
      { studentId: "S-3001", at: "2026-10-30T07:41:50.000Z", via: "QR" },
      { studentId: "S-3005", at: "2026-10-30T07:42:20.000Z", via: "QR" },
      { studentId: "S-3008", at: "2026-10-30T07:44:05.000Z", via: "Biometric" },
    ],
  },
];

export const classChanges: ClassChange[] = [
  {
    id: "CC-1001",
    tenantId: "T-010",
    slotId: "TT-10-003", // CS202 Databases lecture, Tue 09:00
    date: "2026-11-03",
    kind: "Cancelled",
    reason: "Lecturer at an external examiners' meeting. A recording will be on the VLE.",
    by: "Prof. Helen Moore",
    at: "2026-10-30T16:20:00.000Z",
    notified: 6,
  },
  {
    id: "CC-1002",
    tenantId: "T-010",
    slotId: "TT-10-002", // CS201 lab, Wed 14:00
    date: "2026-11-04",
    kind: "Moved",
    newDate: "2026-11-05",
    newStart: "16:00",
    newEnd: "18:00",
    newRoomId: "ROOM-1002",
    reason: "Lab PCs are being re-imaged on Wednesday.",
    by: "Dr. Samuel Reid",
    at: "2026-10-31T09:05:00.000Z",
    notified: 6,
  },
  {
    id: "CC-0901",
    tenantId: "T-009",
    slotId: "TT-09-008", // 10C IGCSE Physics, Wed P4
    date: "2026-11-04",
    kind: "Room change",
    newRoomId: "ROOM-0905",
    reason: "Fume cupboard service in the S1 Physics Lab.",
    by: "Hannah Clarke",
    at: "2026-11-01T12:30:00.000Z",
    notified: 7,
  },
];

const T10 = "2026/27 S1";
const T11 = "2026 S2";

/** [staff, moduleId, role, hours] — Northbridge, Semester 1. CS306 is left unstaffed. */
const northbridge: [string, string, TeachingAssignment["role"], number][] = [
  ["Dr. Samuel Reid", "MOD-1001", "Module leader", 22],
  ["Dr. Samuel Reid", "MOD-1003", "Module leader", 44],
  ["Dr. Samuel Reid", "MOD-1006", "Module leader", 22],
  ["Dr. Samuel Reid", "MOD-1004", "Second marker", 8],
  ["Dr. Tom Hartley", "MOD-1001", "Lecturer", 22],
  ["Dr. Tom Hartley", "MOD-1002", "Module leader", 22],
  ["Dr. Tom Hartley", "MOD-1005", "Module leader", 33],
  ["Dr. Tom Hartley", "MOD-1019", "Module leader", 33],
  ["Dr. Tom Hartley", "MOD-1011", "Module leader", 33],
  ["Prof. Helen Moore", "MOD-1013", "Module leader", 44],
  ["Prof. Helen Moore", "MOD-1004", "Lecturer", 22],
  ["Prof. Helen Moore", "MOD-1018", "Module leader", 30],
  ["Prof. Helen Moore", "MOD-1012", "Module leader", 15],
  ["Dr. Aisha Bello", "MOD-1004", "Module leader", 22],
  ["Dr. Aisha Bello", "MOD-1020", "Module leader", 33],
  ["Dr. Aisha Bello", "MOD-1010", "Module leader", 33],
  ["Dr. Aisha Bello", "MOD-1035", "Module leader", 22],
  ["Dr. Aisha Bello", "MOD-1012", "Supervisor", 15],
  // One lecturer carries the whole business programme — over contract.
  ["Mr. Gareth Evans", "MOD-1030", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1031", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1032", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1033", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1034", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1036", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1037", "Module leader", 22],
  ["Mr. Gareth Evans", "MOD-1038", "Module leader", 22],
];

const harbourside: [
  string,
  string | undefined,
  string | undefined,
  TeachingAssignment["role"],
  number,
][] = [
  ["Dr. Nina Patel", "MOD-1103", undefined, "Module leader", 26],
  ["Dr. Nina Patel", "MOD-1109", undefined, "Module leader", 26],
  ["Dr. Nina Patel", "MOD-1110", undefined, "Module leader", 39],
  ["Dr. Nina Patel", "MOD-1112", undefined, "Module leader", 26],
  ["Ms. Kate Sullivan", "MOD-1104", undefined, "Module leader", 26],
  ["Ms. Kate Sullivan", "MOD-1107", undefined, "Module leader", 26],
  ["Ms. Kate Sullivan", "MOD-1108", undefined, "Module leader", 26],
  ["Ms. Kate Sullivan", undefined, "ICT Dip — Term 4", "Tutor", 60],
  ["Mr. Darren Walsh", undefined, "Electrotech apprentices 2025", "Tutor", 60],
  ["Ms. Jess Kowalski", undefined, "Nursing Dip 2026", "Tutor", 60],
  ["Ms. Jess Kowalski", undefined, "Ageing Support 2026", "Tutor", 30],
  ["Mr. Ben Archer", undefined, "Carpentry apprentices 2026", "Tutor", 70],
];

export const teachingAssignments: TeachingAssignment[] = [
  ...northbridge.map(
    ([staffName, moduleId, role, hours], i): TeachingAssignment => ({
      id: `TA-${1001 + i}`,
      tenantId: "T-010",
      staffName,
      moduleId,
      role,
      hours,
      term: T10,
    }),
  ),
  ...harbourside.map(
    ([staffName, moduleId, groupLabel, role, hours], i): TeachingAssignment => ({
      id: `TA-${1101 + i}`,
      tenantId: "T-011",
      staffName,
      moduleId,
      groupLabel,
      role,
      hours,
      term: T11,
    }),
  ),
];

const profile = (
  id: string,
  tenantId: string,
  staffName: string,
  contractHours: number,
  expertise: string[],
  availability: string,
  basis: "term" | "week" = "term",
): StaffTeachingProfile => ({
  id,
  tenantId,
  staffName,
  contractHours,
  expertise,
  availability,
  basis,
});

export const staffTeachingProfiles: StaffTeachingProfile[] = [
  // Northbridge University — hours a term.
  profile(
    "STP-1001",
    "T-010",
    "Dr. Samuel Reid",
    150,
    ["Programming", "Algorithms", "Data structures", "Web", "Mobile", "Cloud", "Visualisation"],
    "Mon–Thu",
  ),
  profile(
    "STP-1002",
    "T-010",
    "Dr. Tom Hartley",
    150,
    ["Software engineering", "Distributed systems", "Big data", "Web", "Interaction", "Systems"],
    "Not Fridays",
  ),
  profile(
    "STP-1003",
    "T-010",
    "Prof. Helen Moore",
    120,
    ["Databases", "Security", "Mathematics", "Research methods", "Computer systems"],
    "Tue–Thu",
  ),
  profile(
    "STP-1004",
    "T-010",
    "Dr. Aisha Bello",
    150,
    ["Machine learning", "Statistics", "Data science", "Artificial intelligence", "Analytics"],
    "Mon–Fri",
  ),
  profile(
    "STP-1005",
    "T-010",
    "Mr. Gareth Evans",
    150,
    ["Business", "Management", "Marketing", "Accounting", "Strategy", "Ethics"],
    "Mon–Thu",
  ),
  // Harbourside College — hours a term.
  profile(
    "STP-1101",
    "T-011",
    "Dr. Nina Patel",
    120,
    ["Information systems", "Software", "UX", "Data analytics", "Capstone"],
    "Mon–Thu",
  ),
  profile(
    "STP-1102",
    "T-011",
    "Ms. Kate Sullivan",
    160,
    ["Networking", "Cyber security", "Cloud", "Web", "Project management"],
    "Mon–Fri",
  ),
  profile("STP-1103", "T-011", "Mr. Darren Walsh", 160, ["Electrotechnology"], "Tue–Thu"),
  profile(
    "STP-1104",
    "T-011",
    "Ms. Jess Kowalski",
    160,
    ["Nursing", "Ageing support", "Clinical skills"],
    "Mon–Thu",
  ),
  profile("STP-1105", "T-011", "Mr. Ben Archer", 160, ["Carpentry", "Construction"], "Not Mondays"),
  // Meridian Dubai — timetabled hours a week.
  profile("STP-0901", "T-009", "Mr. James Carter", 12, ["Physics", "Science"], "Mon–Fri", "week"),
  profile("STP-0902", "T-009", "Ms. Emma Lewis", 10, ["Mathematics"], "Mon–Fri", "week"),
  profile(
    "STP-0903",
    "T-009",
    "Mrs. Claire Dawson",
    10,
    ["English", "Literature"],
    "Mon–Fri",
    "week",
  ),
  profile(
    "STP-0904",
    "T-009",
    "Dr. Marcus Webb",
    6,
    ["IB Diploma", "Theory of Knowledge"],
    "Mon–Thu",
    "week",
  ),
  profile(
    "STP-0905",
    "T-009",
    "Ms. Anjali Menon",
    6,
    ["CBSE Science", "Mathematics"],
    "Mon–Thu",
    "week",
  ),
  // Part-time (0.2 FTE) — timetabled beyond contract.
  profile(
    "STP-0906",
    "T-009",
    "Mr. Yusuf Ali",
    4,
    ["Arabic", "Islamic Studies", "Moral Education"],
    "Tue, Wed, Fri",
    "week",
  ),
];
