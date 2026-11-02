/* ── Results: grading schemes (GPA / CGPA), mark-batch approval & release,
 * academic appeals, certificate issue. ──────────────────────────────────── */

import { heModules, moduleMarks } from "../heData";
import type { ModuleMark } from "../heData";
import type { RegionCode } from "../regions";

/** A tenant's grading scheme. "classification" = UK-style honours from a
 *  credit-weighted average; "gpa" = grade points per module → GPA / CGPA
 *  (LK SLQF-style 4.0, India 10-point, AU 7-point…). */
export interface GradeBand {
  min: number; // minimum mark (%) for this grade
  grade: string; // "A+", "A", "B+", "1st"…
  points: number; // grade points (0 when not a GPA scheme)
}

export interface GradingScheme {
  id: string; // = tenantId
  tenantId: string;
  kind: "classification" | "gpa";
  scale: number; // 4, 4.2, 7, 10 … (100 for classification)
  bands: GradeBand[]; // highest first
  /** Minimum CGPA in good standing (probation below). For a classification
   *  scheme this is the minimum credit-weighted average mark. */
  goodStanding?: number;
  /** Preset the scheme started from (see GRADING_PRESETS). */
  presetId?: string;
  note?: string;
}

/** A module's marks move through approval before students can see them. */
export interface MarkBatch {
  id: string;
  tenantId: string;
  moduleId: string;
  attempt: number;
  /** Academic year of the marks in the batch (matches ModuleMark.academicYear). */
  academicYear?: string;
  /** Interim release of some components only (e.g. coursework). Empty = whole module. */
  componentIds?: string[];
  status: "Draft" | "Submitted" | "Approved" | "Returned" | "Published";
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  returnedNote?: string;
  /** Scheduled release (results day); published batches are visible to students. */
  releaseDate?: string;
  publishedBy?: string;
  publishedAt?: string;
}

export type AppealGround =
  | "Procedural irregularity"
  | "Administrative error"
  | "Bias or prejudice"
  | "Extenuating circumstances not previously considered";

export const APPEAL_GROUNDS: AppealGround[] = [
  "Procedural irregularity",
  "Administrative error",
  "Bias or prejudice",
  "Extenuating circumstances not previously considered",
];

export interface GradeAppeal {
  id: string;
  tenantId: string;
  studentId: string;
  moduleId: string;
  ground: AppealGround;
  statement: string;
  submittedAt: string;
  status: "Submitted" | "Under review" | "Upheld" | "Not upheld" | "Withdrawn";
  outcome?: string;
  decidedBy?: string;
  decidedAt?: string;
  /** Batch the appealed result was published in. */
  batchId?: string;
  history: { at: string; by: string; action: string }[];
}

export interface CertificateIssue {
  id: string;
  tenantId: string;
  studentId: string;
  award: string;
  classification?: string;
  status: "Awaiting results" | "Ready to issue" | "Issued";
  batch?: string;
  serial?: string;
  verifyCode?: string; // public verification code
  issuedAt?: string;
  issuedBy?: string;
  /** Holder name for graduates no longer on the active learner list. */
  holderName?: string;
  /** Date the award was conferred (board / ceremony). */
  awardDate?: string;
  revoked?: boolean;
  revokedReason?: string;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Grading-scheme presets & calculations
 * ════════════════════════════════════════════════════════════════════════════ */

export interface GradingPreset {
  id: string;
  label: string;
  kind: GradingScheme["kind"];
  scale: number;
  bands: GradeBand[];
  goodStanding: number;
  note: string;
}

const b = (min: number, grade: string, points = 0): GradeBand => ({ min, grade, points });

export const GRADING_PRESETS: GradingPreset[] = [
  {
    id: "uk-honours",
    label: "UK honours (classification)",
    kind: "classification",
    scale: 100,
    bands: [b(70, "1st"), b(60, "2:1"), b(50, "2:2"), b(40, "3rd"), b(0, "Fail")],
    goodStanding: 40,
    note: "Degree class from the credit-weighted average. Good standing = average at or above the pass mark.",
  },
  {
    id: "gpa-4-south-asia",
    label: "4.0 GPA (South Asia)",
    kind: "gpa",
    scale: 4,
    bands: [
      b(85, "A+", 4),
      b(80, "A", 4),
      b(75, "A-", 3.7),
      b(70, "B+", 3.3),
      b(65, "B", 3),
      b(60, "B-", 2.7),
      b(55, "C+", 2.3),
      b(50, "C", 2),
      b(45, "C-", 1.7),
      b(40, "D+", 1.3),
      b(35, "D", 1),
      b(0, "E", 0),
    ],
    goodStanding: 2,
    note: "As used by many Sri Lankan / South Asian private HEIs (SLQF-style). Demo-grade — each institution confirms its own bands.",
  },
  {
    id: "gpa-7-au",
    label: "AU 7-point GPA",
    kind: "gpa",
    scale: 7,
    bands: [b(85, "HD", 7), b(75, "D", 6), b(65, "C", 5), b(50, "P", 4), b(0, "N", 0)],
    goodStanding: 4,
    note: "High Distinction / Distinction / Credit / Pass / Fail. Demo-grade — some providers score N as 1–3.",
  },
  {
    id: "gpa-10-in",
    label: "India 10-point (CGPA)",
    kind: "gpa",
    scale: 10,
    bands: [
      b(90, "O", 10),
      b(80, "A+", 9),
      b(70, "A", 8),
      b(60, "B+", 7),
      b(50, "B", 6),
      b(45, "C", 5),
      b(40, "P", 4),
      b(0, "F", 0),
    ],
    goodStanding: 5,
    note: "UGC choice-based credit system style. Demo-grade.",
  },
];

export const presetById = (id?: string) => GRADING_PRESETS.find((p) => p.id === id);

/** Region default when a tenant hasn't saved a scheme yet. */
export function defaultPresetFor(region?: RegionCode | string): GradingPreset {
  const id =
    region === "AU" || region === "NZ"
      ? "gpa-7-au"
      : region === "IN"
        ? "gpa-10-in"
        : region === "LK" || region === "BD" || region === "PK" || region === "NP"
          ? "gpa-4-south-asia"
          : "uk-honours";
  return presetById(id)!;
}

export function schemeFromPreset(tenantId: string, p: GradingPreset): GradingScheme {
  return {
    id: tenantId,
    tenantId,
    kind: p.kind,
    scale: p.scale,
    bands: p.bands.map((x) => ({ ...x })),
    goodStanding: p.goodStanding,
    presetId: p.id,
    note: p.note,
  };
}

/** The tenant's scheme, falling back to the region default. */
export function schemeFor(
  schemes: GradingScheme[],
  tenantId: string,
  region?: RegionCode | string,
): GradingScheme {
  return (
    schemes.find((s) => s.tenantId === tenantId) ??
    schemeFromPreset(tenantId, defaultPresetFor(region))
  );
}

/** Grade band for a module mark (bands sorted high → low defensively). */
export function gradeFor(scheme: GradingScheme, mark: number): GradeBand {
  const sorted = [...scheme.bands].sort((a, c) => c.min - a.min);
  return sorted.find((x) => mark >= x.min) ?? sorted[sorted.length - 1] ?? b(0, "—");
}

export interface GpaInput {
  credits: number;
  mark: number;
  /** Term label used to group semester GPA, e.g. "2025/26 · Semester 1". */
  term: string;
  /** Sort key for the term. */
  termKey: string;
}

export interface GpaSummary {
  terms: { term: string; termKey: string; value: number; credits: number }[];
  /** CGPA (gpa) or credit-weighted average mark (classification). */
  cumulative: number;
  credits: number;
  goodStanding: boolean;
}

const weighted = (scheme: GradingScheme, rows: GpaInput[]) => {
  const credits = rows.reduce((a, r) => a + r.credits, 0);
  if (!credits) return 0;
  const sum = rows.reduce(
    (a, r) => a + r.credits * (scheme.kind === "gpa" ? gradeFor(scheme, r.mark).points : r.mark),
    0,
  );
  return Math.round((sum / credits) * 100) / 100;
};

/** Semester GPA + CGPA (credit-weighted), or average mark for classification. */
export function gpaSummary(scheme: GradingScheme, rows: GpaInput[]): GpaSummary {
  const byTerm = new Map<string, GpaInput[]>();
  for (const r of rows) byTerm.set(r.termKey, [...(byTerm.get(r.termKey) ?? []), r]);
  const terms = Array.from(byTerm.entries())
    .sort(([a], [c]) => a.localeCompare(c))
    .map(([termKey, list]) => ({
      term: list[0].term,
      termKey,
      value: weighted(scheme, list),
      credits: list.reduce((a, r) => a + r.credits, 0),
    }));
  const cumulative = weighted(scheme, rows);
  const credits = rows.reduce((a, r) => a + r.credits, 0);
  return {
    terms,
    cumulative,
    credits,
    goodStanding: !credits || cumulative >= (scheme.goodStanding ?? 0),
  };
}

/** "3.42 / 4" for GPA, "64.5%" for classification. */
export function fmtGpa(scheme: GradingScheme, v: number): string {
  return scheme.kind === "gpa" ? `${v.toFixed(2)} / ${scheme.scale}` : `${v.toFixed(1)}%`;
}

export const SEMESTER_LABEL: Record<string, string> = {
  S1: "Semester 1",
  S2: "Semester 2",
  Year: "Full year",
};

/* ════════════════════════════════════════════════════════════════════════════
 * Mark batches & release
 * ════════════════════════════════════════════════════════════════════════════ */

/** Does a batch cover this mark (same module, attempt, year and component)? */
export function batchCovers(batch: MarkBatch, m: ModuleMark): boolean {
  return (
    batch.moduleId === m.moduleId &&
    batch.attempt === m.attempt &&
    (batch.academicYear ?? "") === (m.academicYear ?? "") &&
    (!batch.componentIds?.length || batch.componentIds.includes(m.componentId))
  );
}

/** Students only see marks in a Published batch. */
export function isReleased(batches: MarkBatch[], m: ModuleMark): boolean {
  return batches.some((x) => x.status === "Published" && batchCovers(x, m));
}

/** The batch (any status) a mark sits in — newest first. */
export function batchForMark(batches: MarkBatch[], m: ModuleMark): MarkBatch | undefined {
  return batches
    .filter((x) => batchCovers(x, m))
    .sort((a, c) => (c.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0];
}

/** Same scope (module · year · attempt · components). */
export function sameScope(a: MarkBatch, c: Omit<MarkBatch, "id" | "tenantId" | "status">) {
  const key = (ids?: string[]) => [...(ids ?? [])].sort().join(",");
  return (
    a.moduleId === c.moduleId &&
    a.attempt === c.attempt &&
    (a.academicYear ?? "") === (c.academicYear ?? "") &&
    key(a.componentIds) === key(c.componentIds)
  );
}

/** Add working days (Mon–Fri) to an ISO date; returns YYYY-MM-DD. */
export function addWorkingDays(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

export const APPEAL_WINDOW_DAYS = 10;
export const appealDeadline = (publishedAt: string) =>
  addWorkingDays(publishedAt, APPEAL_WINDOW_DAYS);

/* ════════════════════════════════════════════════════════════════════════════
 * Certificates
 * ════════════════════════════════════════════════════════════════════════════ */

export const CERT_PREFIX: Record<string, string> = { "T-010": "NBU", "T-011": "HBC" };

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 8-character public verification code (deterministic when seeded). */
export function makeVerifyCode(seed?: string): string {
  let h = 2166136261;
  const src = seed ?? `${Date.now()}-${Math.random()}`;
  let out = "";
  for (let i = 0; i < 8; i++) {
    for (const ch of src + i) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    out += CODE_CHARS[Math.abs(h) % CODE_CHARS.length];
  }
  return out;
}

/** Next serial in a tenant's sequence, e.g. NBU-2026-000123. */
export function nextSerials(
  certs: CertificateIssue[],
  tenantId: string,
  year: number,
  count: number,
): string[] {
  const prefix = `${CERT_PREFIX[tenantId] ?? "CRT"}-${year}-`;
  const max = certs
    .filter((c) => c.tenantId === tenantId && c.serial?.startsWith(prefix))
    .map((c) => parseInt(c.serial!.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, n) => Math.max(a, n), 100);
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(max + 1 + i).padStart(6, "0")}`,
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * Seed
 * ════════════════════════════════════════════════════════════════════════════ */

export const gradingSchemes: GradingScheme[] = [
  schemeFromPreset("T-010", presetById("uk-honours")!),
  schemeFromPreset("T-011", presetById("gpa-7-au")!),
];

const HUGHES = "Dr. Eleanor Hughes"; // registrar@demo.com — Head of Academic Affairs
const OCONNOR = "Liam O'Connor"; // college@demo.com
const leaderOf = (id: string) => heModules.find((m) => m.id === id)?.leader ?? "Module leader";

let mbN = 1000;
const published = (
  tenantId: string,
  moduleId: string,
  academicYear: string,
  publishedAt: string,
  by: string,
  attempt = 1,
  componentIds?: string[],
): MarkBatch => ({
  id: `MB-${++mbN}`,
  tenantId,
  moduleId,
  attempt,
  academicYear,
  componentIds,
  status: "Published",
  submittedBy: leaderOf(moduleId),
  submittedAt: addDaysIso(publishedAt, -9),
  approvedBy: by,
  approvedAt: addDaysIso(publishedAt, -4),
  releaseDate: publishedAt.slice(0, 10),
  publishedBy: by,
  publishedAt,
});

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

const L4 = ["MOD-1001", "MOD-1002", "MOD-1013", "MOD-1014", "MOD-1015", "MOD-1016"];
const L5_2526 = ["MOD-1003", "MOD-1004", "MOD-1005", "MOD-1006", "MOD-1007", "MOD-1009"];

export const markBatches: MarkBatch[] = [
  // Northbridge — last year's results, released after the June board.
  ...L4.map((m) => published("T-010", m, "2024/25", "2025-07-02T09:00:00Z", HUGHES)),
  ...L4.map((m) => published("T-010", m, "2025/26", "2026-07-01T09:00:00Z", HUGHES)),
  ...L5_2526.map((m) => published("T-010", m, "2025/26", "2026-07-01T09:00:00Z", HUGHES)),
  // Chen Wei's August resit — released after external examiner sign-off.
  published("T-010", "MOD-1002", "2025/26", "2026-10-21T09:00:00Z", HUGHES, 2),
  // In-year coursework: CS201 submitted (awaiting moderation + approval)…
  {
    id: `MB-${++mbN}`,
    tenantId: "T-010",
    moduleId: "MOD-1003",
    attempt: 1,
    academicYear: "2026/27",
    componentIds: ["c1"],
    status: "Submitted",
    submittedBy: "Dr. Samuel Reid",
    submittedAt: "2026-10-30T16:05:00Z",
  },
  // …CS204 returned to the module leader.
  {
    id: `MB-${++mbN}`,
    tenantId: "T-010",
    moduleId: "MOD-1006",
    attempt: 1,
    academicYear: "2026/27",
    componentIds: ["c1"],
    status: "Returned",
    submittedBy: "Dr. Samuel Reid",
    submittedAt: "2026-10-29T11:20:00Z",
    returnedNote:
      "Ananya Rao has no Full-stack app mark and no EC claim. Add the mark (or a flag) and resubmit once second marking is done.",
  },
  // Harbourside — Year 1 (2025) published; Year 2 S1 approved for results day.
  ...["MOD-1101", "MOD-1102", "MOD-1103", "MOD-1104"].map((m) =>
    published("T-011", m, "2025", "2025-12-08T09:00:00Z", OCONNOR),
  ),
  ...["MOD-1105", "MOD-1106"].map(
    (m): MarkBatch => ({
      id: `MB-${++mbN}`,
      tenantId: "T-011",
      moduleId: m,
      attempt: 1,
      academicYear: "2026",
      status: "Approved",
      submittedBy: leaderOf(m),
      submittedAt: "2026-10-22T10:00:00Z",
      approvedBy: OCONNOR,
      approvedAt: "2026-10-28T14:30:00Z",
      releaseDate: "2026-11-27",
    }),
  ),
  published("T-011", "MOD-1107", "2026", "2026-10-20T09:00:00Z", OCONNOR, 1, ["c1"]),
];

/* ── Appeals ── */

const markOf = (studentId: string, moduleId: string, componentId: string) =>
  moduleMarks.find(
    (m) =>
      m.studentId === studentId &&
      m.moduleId === moduleId &&
      m.componentId === componentId &&
      m.attempt === 1,
  )?.mark ?? 50;
const noahExam = markOf("S-4003", "MOD-1013", "c2");

export const gradeAppeals: GradeAppeal[] = [
  {
    id: "GA-1001",
    tenantId: "T-010",
    studentId: "S-4003",
    moduleId: "MOD-1013",
    ground: "Administrative error",
    statement:
      "My exam feedback shows no marks for question 6, but I answered it on page 6 of the script.",
    submittedAt: "2026-07-08T10:15:00Z",
    status: "Upheld",
    outcome: `Page 6 of the script was not marked. Re-marked by a second examiner: exam mark corrected from ${noahExam - 6} to ${noahExam}.`,
    decidedBy: HUGHES,
    decidedAt: "2026-07-20T15:00:00Z",
    history: [
      { at: "2026-07-08T10:15:00Z", by: "Noah Bennett", action: "Appeal submitted" },
      { at: "2026-07-09T09:00:00Z", by: HUGHES, action: "Under review — script requested" },
      {
        at: "2026-07-20T15:00:00Z",
        by: HUGHES,
        action: `Upheld — exam mark ${noahExam - 6} → ${noahExam}`,
      },
    ],
  },
  {
    id: "GA-1002",
    tenantId: "T-010",
    studentId: "S-4010",
    moduleId: "MOD-1013",
    ground: "Extenuating circumstances not previously considered",
    statement:
      "I was unwell during the May exam period but did not submit an EC claim at the time.",
    submittedAt: "2026-07-10T13:40:00Z",
    status: "Not upheld",
    outcome:
      "The circumstances were known before the exam and no good reason was given for not using the EC process at the time. The trailing-credit resit stands.",
    decidedBy: HUGHES,
    decidedAt: "2026-07-24T11:30:00Z",
    history: [
      { at: "2026-07-10T13:40:00Z", by: "Ananya Rao", action: "Appeal submitted" },
      { at: "2026-07-13T09:30:00Z", by: HUGHES, action: "Under review" },
      { at: "2026-07-24T11:30:00Z", by: HUGHES, action: "Not upheld" },
    ],
  },
  {
    id: "GA-1003",
    tenantId: "T-010",
    studentId: "S-4004",
    moduleId: "MOD-1002",
    ground: "Procedural irregularity",
    statement:
      "My resit was capped at 40%. I was in hospital for part of the first exam period and believe the resit should have been uncapped.",
    submittedAt: "2026-10-28T18:10:00Z",
    status: "Submitted",
    history: [{ at: "2026-10-28T18:10:00Z", by: "Chen Wei", action: "Appeal submitted" }],
  },
  {
    id: "GA-1004",
    tenantId: "T-011",
    studentId: "S-5004",
    moduleId: "MOD-1107",
    ground: "Administrative error",
    statement:
      "The lab portfolio rubric total doesn't match the mark released — section 3 looks unmarked.",
    submittedAt: "2026-10-26T08:45:00Z",
    status: "Under review",
    history: [
      { at: "2026-10-26T08:45:00Z", by: "Lachlan Murphy", action: "Appeal submitted" },
      { at: "2026-10-27T10:00:00Z", by: OCONNOR, action: "Under review — rubric requested" },
    ],
  },
];

/* ── Certificates ── */

const issued = (
  id: string,
  tenantId: string,
  studentId: string,
  holderName: string,
  award: string,
  classification: string,
  serial: string,
  issuedAt: string,
  by: string,
  batch: string,
  extra: Partial<CertificateIssue> = {},
): CertificateIssue => ({
  id,
  tenantId,
  studentId,
  holderName,
  award,
  classification,
  status: "Issued",
  batch,
  serial,
  verifyCode: makeVerifyCode(serial),
  issuedAt,
  issuedBy: by,
  awardDate: addDaysIso(issuedAt, -20).slice(0, 10),
  ...extra,
});

const ready = (
  id: string,
  tenantId: string,
  studentId: string,
  holderName: string | undefined,
  award: string,
  classification: string | undefined,
  awardDate: string | undefined,
  status: "Ready to issue" | "Awaiting results" = "Ready to issue",
): CertificateIssue => ({
  id,
  tenantId,
  studentId,
  holderName,
  award,
  classification,
  status,
  awardDate,
});

const BSC_CS = "BSc (Hons) Computer Science";
const BSC_BM = "BSc (Hons) Business Management";
const MSC_DS = "MSc Data Science";
const BIT = "Bachelor of Information Technology";

export const certificateIssues: CertificateIssue[] = [
  // Northbridge — summer 2026 graduates (issued in July).
  issued(
    "CI-1001",
    "T-010",
    "S-3801",
    "Olivia Turner",
    BSC_CS,
    "First Class Honours",
    "NBU-2026-000118",
    "2026-07-15T10:00:00Z",
    HUGHES,
    "NBU-B-2026-07",
  ),
  issued(
    "CI-1002",
    "T-010",
    "S-3802",
    "James Okafor",
    BSC_CS,
    "Upper Second (2:1)",
    "NBU-2026-000119",
    "2026-07-15T10:00:00Z",
    HUGHES,
    "NBU-B-2026-07",
  ),
  issued(
    "CI-1003",
    "T-010",
    "S-3803",
    "Sophie Clarke",
    BSC_BM,
    "Lower Second (2:2)",
    "NBU-2026-000120",
    "2026-07-15T10:00:00Z",
    HUGHES,
    "NBU-B-2026-07",
    { revoked: true, revokedReason: "Replaced by NBU-2026-000121 after a legal name change" },
  ),
  issued(
    "CI-1004",
    "T-010",
    "S-3803",
    "Sophie Clarke-Ahmed",
    BSC_BM,
    "Lower Second (2:2)",
    "NBU-2026-000121",
    "2026-09-02T10:00:00Z",
    HUGHES,
    "NBU-B-2026-09",
  ),
  // Resit & progression board graduates — November ceremony.
  ready("CI-1005", "T-010", "S-3805", "Ethan Brooks", BSC_CS, "Upper Second (2:1)", "2026-09-09"),
  ready("CI-1006", "T-010", "S-3806", "Amara Nwosu", BSC_BM, "First Class Honours", "2026-09-09"),
  ready("CI-1007", "T-010", "S-3807", "Lucas Fernando", MSC_DS, "Distinction", "2026-09-09"),
  // Final-year students still awaiting results.
  ready("CI-1008", "T-010", "S-4008", undefined, BSC_CS, undefined, undefined, "Awaiting results"),
  ready("CI-1009", "T-010", "S-4006", undefined, MSC_DS, undefined, undefined, "Awaiting results"),
  ready("CI-1010", "T-010", "S-4009", undefined, MSC_DS, undefined, undefined, "Awaiting results"),
  // Harbourside
  issued(
    "CI-1011",
    "T-011",
    "S-5901",
    "Mei Lin",
    BIT,
    "Distinction (GPA 6)",
    "HBC-2026-000041",
    "2026-04-10T10:00:00Z",
    OCONNOR,
    "HBC-B-2026-04",
  ),
  ready("CI-1012", "T-011", "S-5902", "Jack Wilson", BIT, "Credit (GPA 5)", "2026-10-15"),
];
