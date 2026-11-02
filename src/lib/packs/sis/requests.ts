/* ── Student requests & approvals (progression, transfer, interruption,
 * withdrawal, deferral, mode change, project proposals, leave of absence).
 * Each request walks a chain of approval steps; on final approval its
 * EFFECTS are applied automatically (learner status / level / programme /
 * mode, fee schedule) and written to the change log + outbox.
 *
 * This file stays free of store imports (the store imports these seeds), so
 * the rules below are plain functions; the route applies them. */
import type { InstitutionType } from "../regions";
import type { Learner } from "../foundationData";
import { TENANT_STAFF } from "../opsData";

export type RequestKind =
  | "Progression"
  | "Programme transfer"
  | "Interruption of study"
  | "Withdrawal"
  | "Deferral"
  | "Change of study mode"
  | "Project proposal"
  | "Leave of absence";

export interface RequestStep {
  role: string; // "Personal tutor", "Head of Academic Affairs", "Registrar", "Finance", "Supervisor", "Class teacher"
  assignee: string;
  decision?: "Approved" | "Rejected" | "Returned";
  by?: string;
  at?: string;
  note?: string;
}

/** One line of the request's timeline (submit, each decision, resubmit, effects). */
export interface RequestEvent {
  at: string;
  by: string;
  action: "Submitted" | "Approved" | "Rejected" | "Returned" | "Resubmitted" | "Withdrawn";
  /** Step role the action was taken for (decisions only). */
  role?: string;
  note?: string;
}

export interface StudentRequest {
  id: string;
  tenantId: string;
  studentId: string;
  kind: RequestKind;
  submittedBy: string; // student, or parent for school leave
  submittedAt: string;
  reason: string;
  /** Kind-specific fields, e.g. { toProgramme, from, to, newMode, topic, supervisor }. */
  details: Record<string, string>;
  steps: RequestStep[];
  status: "Submitted" | "In review" | "Approved" | "Rejected" | "Withdrawn";
  /** Human-readable effects applied on approval (for the audit view). */
  effects?: string[];
  /** Full timeline, oldest first. */
  history?: RequestEvent[];
}

/* ── Kinds ─────────────────────────────────────────────────────────────── */

export const HE_KINDS: RequestKind[] = [
  "Progression",
  "Programme transfer",
  "Interruption of study",
  "Withdrawal",
  "Deferral",
  "Change of study mode",
  "Project proposal",
];
export const SCHOOL_KINDS: RequestKind[] = ["Leave of absence", "Withdrawal"];

export function kindsFor(type: InstitutionType): RequestKind[] {
  if (type === "university" || type === "college") return HE_KINDS;
  if (type === "school") return SCHOOL_KINDS;
  return [];
}

export const KIND_INFO: Record<RequestKind, { icon: string; blurb: string }> = {
  Progression: { icon: "TrendingUp", blurb: "Move to the next stage of your programme." },
  "Programme transfer": { icon: "ArrowLeftRight", blurb: "Switch to another programme." },
  "Interruption of study": {
    icon: "PauseCircle",
    blurb: "Pause your studies and return later. Fees pause too.",
  },
  Withdrawal: { icon: "LogOut", blurb: "Leave the institution. Future fees are cancelled." },
  Deferral: { icon: "CalendarClock", blurb: "Start or restart with a later intake." },
  "Change of study mode": { icon: "Repeat", blurb: "Switch between full-time and part-time." },
  "Project proposal": { icon: "Lightbulb", blurb: "Propose your project topic and supervisor." },
  "Leave of absence": { icon: "Plane", blurb: "Ask for authorised absence on set dates." },
};

/* ── Who holds each approval role ──────────────────────────────────────── */

/** Named role holders per tenant. Teams stand in where no named person exists. */
const ROLE_HOLDERS: Record<string, Record<string, string>> = {
  "T-010": {
    Registrar: "Dr. Eleanor Hughes",
    "Head of Academic Affairs": "Prof. Helen Moore",
    Finance: "Finance Office",
    "Visa compliance": "International Compliance Team",
    "Module leader": "Dr. Tom Hartley",
  },
  "T-011": {
    Registrar: "Liam O'Connor",
    "Head of Academic Affairs": "Academic Affairs Office",
    Finance: "Finance Office",
    "Visa compliance": "International Office",
    "Module leader": "Dr. Nina Patel",
  },
  "T-009": {
    "Head of School": "Hannah Clarke",
    Registrar: "Hannah Clarke",
    Finance: "Finance Office",
  },
  "T-012": {
    "Head of School": "Mrs. Dilrukshi Gunawardena",
    Registrar: "Mrs. Dilrukshi Gunawardena",
    Finance: "Finance Office",
  },
};

/** Programme leaders (receiving leader for transfers; personal tutor fallback). */
export const PROGRAMME_LEADERS: Record<string, string> = {
  "PRG-1001": "Dr. Samuel Reid",
  "PRG-1002": "Dr. Aisha Bello",
  "PRG-1003": "Mr. Gareth Evans",
  "PRG-1101": "Dr. Nina Patel",
};

/** College personal tutors by cohort keyword (trainer of the group). */
const COLLEGE_TUTORS: [string, string][] = [
  ["ICT", "Ms. Kate Sullivan"],
  ["Electrotech", "Mr. Darren Walsh"],
  ["Ageing", "Ms. Jess Kowalski"],
  ["Nursing", "Ms. Jess Kowalski"],
  ["Carpentry", "Mr. Ben Archer"],
  ["BIT", "Dr. Nina Patel"],
];

export function roleHolder(tenantId: string, role: string): string {
  return ROLE_HOLDERS[tenantId]?.[role] ?? `${role} office`;
}

export function personalTutorFor(l: Learner): string {
  if (l.programmeId && PROGRAMME_LEADERS[l.programmeId] && l.tenantId === "T-010")
    return PROGRAMME_LEADERS[l.programmeId];
  for (const [k, name] of COLLEGE_TUTORS) if (l.group?.includes(k)) return name;
  if (l.programmeId && PROGRAMME_LEADERS[l.programmeId]) return PROGRAMME_LEADERS[l.programmeId];
  return roleHolder(l.tenantId, "Head of Academic Affairs");
}

/** School class / form teacher, read from the staff list ("Tutor 10C", "· 3B"). */
export function classTeacherFor(l: Learner): string {
  const staff = TENANT_STAFF[l.tenantId] ?? [];
  const g = l.group ?? "";
  const hit = staff.find(
    (s) => g && (s.role.includes(`Tutor ${g}`) || s.role.trim().endsWith(`· ${g}`)),
  );
  return hit?.name ?? roleHolder(l.tenantId, "Head of School");
}

/** Lecturers who can supervise projects (tenant staff minus the registrar). */
export function supervisorsFor(tenantId: string): string[] {
  return (TENANT_STAFF[tenantId] ?? [])
    .filter((s) => /Lecturer|Head of School|trainer/i.test(s.role))
    .map((s) => s.name);
}

/* ── Approval chains ───────────────────────────────────────────────────── */

/** Step roles for a request kind (visa step added for sponsored learners). */
export function chainRoles(kind: RequestKind, l: Learner, type: InstitutionType): string[] {
  const visa = !!l.visa?.sponsored;
  if (type === "school") {
    if (kind === "Leave of absence") return ["Class teacher", "Head of School"];
    if (kind === "Withdrawal") return ["Head of School", "Finance"];
  }
  switch (kind) {
    case "Interruption of study":
      return [
        "Personal tutor",
        "Head of Academic Affairs",
        "Registrar",
        ...(visa ? ["Visa compliance"] : []),
      ];
    case "Withdrawal":
      return ["Registrar", "Finance", ...(visa ? ["Visa compliance"] : [])];
    case "Programme transfer":
      return ["Receiving programme leader", "Registrar", "Finance"];
    case "Progression":
      return ["Head of Academic Affairs", "Registrar", "Finance"];
    case "Change of study mode":
      return ["Registrar", "Finance", ...(visa ? ["Visa compliance"] : [])];
    case "Deferral":
      return ["Registrar"];
    case "Project proposal":
      return ["Supervisor", "Module leader"];
    case "Leave of absence":
      return ["Personal tutor"];
  }
}

export function assigneeFor(role: string, l: Learner, details: Record<string, string>): string {
  switch (role) {
    case "Personal tutor":
      return personalTutorFor(l);
    case "Class teacher":
      return classTeacherFor(l);
    case "Supervisor":
      return details.supervisor || personalTutorFor(l);
    case "Receiving programme leader":
      return (
        PROGRAMME_LEADERS[details.toProgramme] ?? roleHolder(l.tenantId, "Head of Academic Affairs")
      );
    default:
      return roleHolder(l.tenantId, role);
  }
}

export function buildChain(
  kind: RequestKind,
  l: Learner,
  type: InstitutionType,
  details: Record<string, string>,
): RequestStep[] {
  return chainRoles(kind, l, type).map((role) => ({
    role,
    assignee: assigneeFor(role, l, details),
  }));
}

/** The step waiting for a decision (first not yet approved), if still open. */
export function currentStep(r: StudentRequest): RequestStep | undefined {
  if (r.status === "Approved" || r.status === "Rejected" || r.status === "Withdrawn")
    return undefined;
  return r.steps.find((s) => s.decision !== "Approved");
}

export function isReturned(r: StudentRequest): boolean {
  return currentStep(r)?.decision === "Returned";
}

/** Status to show: "Returned" is a sub-state of an open request. */
export function displayStatus(r: StudentRequest): string {
  return isReturned(r) ? "Returned" : r.status;
}

/** Visa-reporting effect wording by region (UK → UKVI, AU → PRISMS). */
export function visaReportLine(region: string | undefined): string {
  if (region === "UK") return "Report to UKVI within 10 working days";
  if (region === "AU") return "Report via PRISMS";
  return "Report to the immigration authority";
}

/** One-line summary of the kind-specific details. */
export function detailSummary(r: StudentRequest, programmeName?: (id: string) => string): string {
  const d = r.details;
  switch (r.kind) {
    case "Interruption of study":
      return `From ${d.from ?? "—"} · return ${d.returnDate ?? "—"}`;
    case "Leave of absence":
      return `${d.from ?? "—"} to ${d.to ?? "—"}`;
    case "Withdrawal":
      return `Last day ${d.lastDay ?? "—"}`;
    case "Deferral":
      return `Defer to ${d.deferTo ?? "—"}`;
    case "Programme transfer":
      return `To ${programmeName?.(d.toProgramme) ?? d.toProgramme ?? "—"}${d.toLevel ? ` · ${d.toLevel}` : ""}`;
    case "Progression":
      return `To ${d.toLevel ?? "next stage"}`;
    case "Change of study mode":
      return `To ${d.newMode ?? "—"} from ${d.from ?? "—"}`;
    case "Project proposal":
      return `${d.topic ?? "—"} · ${d.supervisor ?? ""}`;
  }
}

/* ── Seeds ─────────────────────────────────────────────────────────────── */

type Seed = Omit<StudentRequest, "history">;

const at = (date: string, time = "09:30") => `${date}T${time}:00Z`;
const ok = (role: string, assignee: string, date: string, note?: string): RequestStep => ({
  role,
  assignee,
  decision: "Approved",
  by: assignee,
  at: at(date, "11:15"),
  note,
});

const seeds: Seed[] = [
  // ── Northbridge University (T-010) ──
  {
    id: "REQ-1001",
    tenantId: "T-010",
    studentId: "S-4001",
    kind: "Project proposal",
    submittedBy: "Arjun Mehta",
    submittedAt: at("2026-10-29", "16:05"),
    reason: "I want to build on my Level 5 networking coursework for my final-year project.",
    details: {
      topic: "Federated learning for campus Wi-Fi anomaly detection",
      supervisor: "Dr. Samuel Reid",
      method: "Prototype + evaluation on anonymised campus logs",
    },
    steps: [
      { role: "Supervisor", assignee: "Dr. Samuel Reid" },
      { role: "Module leader", assignee: "Dr. Tom Hartley" },
    ],
    status: "Submitted",
  },
  {
    id: "REQ-1002",
    tenantId: "T-010",
    studentId: "S-4004",
    kind: "Interruption of study",
    submittedBy: "Chen Wei",
    submittedAt: at("2026-10-30", "10:12"),
    reason: "Medical treatment at home in Chengdu. GP letter attached to my record.",
    details: { from: "2026-11-16", returnDate: "2027-09-13" },
    steps: [
      { role: "Personal tutor", assignee: "Dr. Samuel Reid" },
      { role: "Head of Academic Affairs", assignee: "Prof. Helen Moore" },
      { role: "Registrar", assignee: "Dr. Eleanor Hughes" },
      { role: "Visa compliance", assignee: "International Compliance Team" },
    ],
    status: "Submitted",
  },
  {
    id: "REQ-1003",
    tenantId: "T-010",
    studentId: "S-4005",
    kind: "Programme transfer",
    submittedBy: "Mia Collins",
    submittedAt: at("2026-10-21", "14:40"),
    reason:
      "I enjoy the business modules more than programming and want to graduate in BSc Business.",
    details: { toProgramme: "PRG-1003", toLevel: "Level 5 (Year 2)", from: "2027-01-25" },
    steps: [
      ok(
        "Receiving programme leader",
        "Mr. Gareth Evans",
        "2026-10-24",
        "Credits map across — OK.",
      ),
      { role: "Registrar", assignee: "Dr. Eleanor Hughes" },
      { role: "Finance", assignee: "Finance Office" },
    ],
    status: "In review",
  },
  {
    id: "REQ-1004",
    tenantId: "T-010",
    studentId: "S-4009",
    kind: "Change of study mode",
    submittedBy: "Daniel Price",
    submittedAt: at("2026-10-27", "08:50"),
    reason: "My employer has agreed to release me full-time for the dissertation period.",
    details: { newMode: "Full-time", from: "2027-01-25" },
    steps: [
      { role: "Registrar", assignee: "Dr. Eleanor Hughes" },
      { role: "Finance", assignee: "Finance Office" },
    ],
    status: "Submitted",
  },
  {
    id: "REQ-1005",
    tenantId: "T-010",
    studentId: "S-4003",
    kind: "Progression",
    submittedBy: "Noah Bennett",
    submittedAt: at("2026-10-14", "12:00"),
    reason: "Resit passed in August — asking to progress to Level 6 from January.",
    details: { toLevel: "Level 6 (Year 3)" },
    steps: [
      ok(
        "Head of Academic Affairs",
        "Prof. Helen Moore",
        "2026-10-16",
        "Resit confirmed by board.",
      ),
      ok("Registrar", "Dr. Eleanor Hughes", "2026-10-20"),
      { role: "Finance", assignee: "Finance Office" },
    ],
    status: "In review",
  },
  {
    id: "REQ-1006",
    tenantId: "T-010",
    studentId: "S-4008",
    kind: "Interruption of study",
    submittedBy: "Isabelle Fox",
    submittedAt: at("2026-09-08", "09:10"),
    reason: "Caring for a family member for the rest of the academic year.",
    details: { from: "2026-09-21", returnDate: "2027-09-13" },
    steps: [
      ok("Personal tutor", "Dr. Samuel Reid", "2026-09-09", "Supported — wellbeing plan agreed."),
      ok("Head of Academic Affairs", "Prof. Helen Moore", "2026-09-10"),
      ok("Registrar", "Dr. Eleanor Hughes", "2026-09-11"),
    ],
    status: "Approved",
    effects: [
      "Learner status: Active → Interrupted",
      "Return date recorded: 2027-09-13",
      "Fee schedule: no future instalments to suspend (fees settled for 2025/26)",
      "Isabelle Fox notified by email",
    ],
  },
  {
    id: "REQ-1007",
    tenantId: "T-010",
    studentId: "S-4002",
    kind: "Change of study mode",
    submittedBy: "Grace Walker",
    submittedAt: at("2026-10-05", "15:22"),
    reason: "I would like to work part-time alongside my studies.",
    details: { newMode: "Part-time", from: "2026-10-19" },
    steps: [
      {
        role: "Registrar",
        assignee: "Dr. Eleanor Hughes",
        decision: "Rejected",
        by: "Dr. Eleanor Hughes",
        at: at("2026-10-08", "10:05"),
        note: "Mode changes take effect at the start of a semester. Please reapply for January.",
      },
      { role: "Finance", assignee: "Finance Office" },
    ],
    status: "Rejected",
  },
  {
    id: "REQ-1008",
    tenantId: "T-010",
    studentId: "S-4007",
    kind: "Withdrawal",
    submittedBy: "Leo Ward",
    submittedAt: at("2026-10-26", "18:30"),
    reason: "Not sure university is right for me.",
    details: { lastDay: "2026-11-06" },
    steps: [
      {
        role: "Registrar",
        assignee: "Dr. Eleanor Hughes",
        decision: "Returned",
        by: "Dr. Eleanor Hughes",
        at: at("2026-10-28", "09:45"),
        note: "Please speak to Student Support first and confirm you have seen the refund dates.",
      },
      { role: "Finance", assignee: "Finance Office" },
    ],
    status: "In review",
  },
  // ── Harbourside College Sydney (T-011) ──
  {
    id: "REQ-1009",
    tenantId: "T-011",
    studentId: "S-5005",
    kind: "Interruption of study",
    submittedBy: "Ishaan Kapoor",
    submittedAt: at("2026-10-22", "11:00"),
    reason: "Compassionate grounds — family bereavement in India.",
    details: { from: "2026-11-09", returnDate: "2027-02-22" },
    steps: [
      ok("Personal tutor", "Dr. Nina Patel", "2026-10-23", "Supported."),
      { role: "Head of Academic Affairs", assignee: "Academic Affairs Office" },
      { role: "Registrar", assignee: "Liam O'Connor" },
      { role: "Visa compliance", assignee: "International Office" },
    ],
    status: "In review",
  },
  {
    id: "REQ-1010",
    tenantId: "T-011",
    studentId: "S-5001",
    kind: "Deferral",
    submittedBy: "Sakura Tanaka",
    submittedAt: at("2026-10-31", "13:20"),
    reason: "I want to finish my Diploma work placement in Japan before Term 1.",
    details: { deferTo: "2027 Term 2 intake" },
    steps: [{ role: "Registrar", assignee: "Liam O'Connor" }],
    status: "Submitted",
  },
  // ── Meridian International School Dubai (T-009) ──
  {
    id: "REQ-1011",
    tenantId: "T-009",
    studentId: "S-3001",
    kind: "Leave of absence",
    submittedBy: "Sarah Khan",
    submittedAt: at("2026-10-30", "19:45"),
    reason: "Family wedding in Lahore.",
    details: { from: "2026-11-19", to: "2026-11-24" },
    steps: [
      { role: "Class teacher", assignee: "Mr. James Carter" },
      { role: "Head of School", assignee: "Hannah Clarke" },
    ],
    status: "Submitted",
  },
  // ── Meridian International School Colombo (T-012) ──
  {
    id: "REQ-1012",
    tenantId: "T-012",
    studentId: "S-3105",
    kind: "Leave of absence",
    submittedBy: "Dilani Perera (guardian code · family account)",
    submittedAt: at("2026-10-28", "07:55"),
    reason: "Family pilgrimage to Anuradhapura for Poya.",
    details: { from: "2026-11-23", to: "2026-11-25" },
    steps: [
      ok("Class teacher", "Ms. Ishara Fernando", "2026-10-29"),
      { role: "Head of School", assignee: "Mrs. Dilrukshi Gunawardena" },
    ],
    status: "In review",
  },
];

/** Timeline derived from the seed's submit + decisions. */
function seedHistory(r: Seed): RequestEvent[] {
  const out: RequestEvent[] = [{ at: r.submittedAt, by: r.submittedBy, action: "Submitted" }];
  for (const s of r.steps)
    if (s.decision && s.at)
      out.push({
        at: s.at,
        by: s.by ?? s.assignee,
        action: s.decision,
        role: s.role,
        note: s.note,
      });
  return out;
}

export const studentRequests: StudentRequest[] = seeds.map((r) => ({
  ...r,
  history: seedHistory(r),
}));
