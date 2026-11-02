/**
 * Foundations — per-tenant configuration that every pack builds on:
 *   • TenantProfile: institution type, region, enabled packs, code set, id fields
 *   • AcademicCalendar: one or MORE calendars per tenant (terms / semesters /
 *     intakes), replacing any "academic year comes from the country" rule
 *   • Learner: the segment student record (official ids, visa, support plan)
 *   • TenantGroup: a school group / multi-campus university spanning tenants
 *
 * All rows carry `tenantId`. Pages filter by the signed-in user's tenant.
 */
import type { InstitutionType, RegionCode } from "./regions";

export type PackId = "swim" | "intl-school" | "higher-ed" | "college";

/** "classic" keeps the original tuition/school menus; "segment" tenants get
 *  the lean core menu that packs + modules compose on top of. */
export type Experience = "classic" | "segment";

/* ── Student accounts & sign-in ──────────────────────────────────────────────
 * Many schools issue every pupil a Microsoft 365 or Google Workspace account
 * (Teams / OneDrive / Classroom). 1StudentID signs pupils in WITH that account
 * (SSO — the school's IdP stays the source of truth for the password), and
 * maps it to the learner's permanent 1StudentID.
 *
 * Who actually uses the account depends on age — so the policy is set per
 * stage of the school, not per tenant:
 *   • "own"      — the pupil signs in themself (secondary / university).
 *   • "family"   — the school account is used BY THE FAMILY (common for
 *                  primary years in LK and Gulf international schools): the
 *                  session shows family features (trips, meetings, fees),
 *                  but legally significant actions (consent) are confirmed by
 *                  the registered guardian with a one-time code — a shared
 *                  pupil login is never treated as the guardian's identity.
 *   • "guardian" — no pupil login at all; parents use their own account
 *                  (early years).
 * Parents can always ALSO have their own 1StudentID parent account (one login
 * for every child, across institutions) — the family mode supports the
 * school's practice, it doesn't replace it. */
export type SignInProvider = "microsoft" | "google" | "native";
export type AccountMode = "own" | "family" | "guardian";

export interface AccountBand {
  /** Stage label shown to admins, e.g. "Primary (Years 1–6)". */
  label: string;
  /** Year groups / levels in this stage (matches Learner.level). */
  levels: string[];
  mode: AccountMode;
}

export interface StudentAccountPolicy {
  provider: SignInProvider;
  /** School-issued student email domain — also used for sign-in routing. */
  domain?: string;
  bands: AccountBand[];
  /** Mode for levels not listed in any band. */
  defaultMode: AccountMode;
  /** Accounts are created / disabled from Student Records (roster sync). */
  rosterSync: boolean;
}

export const PROVIDER_LABEL: Record<SignInProvider, string> = {
  microsoft: "Microsoft 365 (Entra ID)",
  google: "Google Workspace for Education",
  native: "1StudentID sign-in",
};

export const ACCOUNT_MODE_LABEL: Record<AccountMode, string> = {
  own: "Pupil signs in",
  family: "Family uses pupil account",
  guardian: "Parent account only",
};

export interface TenantProfile {
  id: string; // = tenantId
  tenantId: string;
  type: InstitutionType;
  experience: Experience;
  region: RegionCode;
  /** Sub-jurisdiction whose regulator applies (emirate, state, UK nation). */
  subRegion?: string;
  city: string;
  packs: PackId[];
  /** Attendance code set id (see ATTENDANCE_CODE_SETS). */
  codeSetId: string;
  /** Official-id field keys enabled for student records. */
  idFields: string[];
  /** Optional second pricing currency (e.g. USD-priced boarding in an AED school). */
  secondCurrency?: string;
  groupId?: string;
  /** Visa-sponsor licence held (enables sponsor monitoring). */
  visaSponsor?: boolean;
  /** How pupils sign in (provider, domain, per-stage account mode). */
  studentAccounts?: StudentAccountPolicy;
}

export const tenantProfiles: TenantProfile[] = [
  {
    id: "T-001",
    tenantId: "T-001",
    type: "tuition",
    experience: "classic",
    region: "LK",
    city: "Colombo",
    packs: [],
    codeSetId: "simple",
    idFields: ["nic", "passport"],
  },
  {
    id: "T-002",
    tenantId: "T-002",
    type: "tuition",
    experience: "classic",
    region: "IN",
    city: "Bengaluru",
    packs: [],
    codeSetId: "simple",
    idFields: ["apaar", "passport"],
  },
  {
    id: "T-003",
    tenantId: "T-003",
    type: "tuition",
    experience: "classic",
    region: "AE",
    subRegion: "SHJ",
    city: "Sharjah",
    packs: [],
    codeSetId: "simple",
    idFields: ["emiratesId", "passport"],
  },
  {
    id: "T-004",
    tenantId: "T-004",
    type: "tuition",
    experience: "classic",
    region: "GLOBAL",
    city: "Austin",
    packs: [],
    codeSetId: "simple",
    idFields: ["nationalId"],
  },
  {
    id: "T-005",
    tenantId: "T-005",
    type: "tuition",
    experience: "classic",
    region: "GLOBAL",
    city: "Lyon",
    packs: [],
    codeSetId: "simple",
    idFields: ["nationalId"],
  },
  {
    id: "T-006",
    tenantId: "T-006",
    type: "school",
    experience: "classic",
    region: "LK",
    city: "Colombo",
    packs: ["swim"],
    codeSetId: "simple",
    idFields: ["nic", "birthCert", "examIndex"],
  },
  {
    id: "T-007",
    tenantId: "T-007",
    type: "tuition",
    experience: "classic",
    region: "LK",
    city: "Kandy",
    packs: [],
    codeSetId: "simple",
    idFields: ["nic"],
  },
  {
    id: "T-008",
    tenantId: "T-008",
    type: "tuition",
    experience: "classic",
    region: "LK",
    city: "Galle",
    packs: [],
    codeSetId: "simple",
    idFields: ["birthCert"],
  },
  {
    id: "T-009",
    tenantId: "T-009",
    type: "school",
    experience: "segment",
    region: "AE",
    subRegion: "DXB",
    city: "Dubai",
    packs: ["intl-school"],
    codeSetId: "intl-school",
    idFields: ["emiratesId", "regulatorNo", "passport"],
    secondCurrency: "USD",
    groupId: "G-01",
    visaSponsor: false,
    studentAccounts: {
      provider: "microsoft",
      domain: "meridian.ae",
      bands: [
        {
          label: "Foundation Stage / Pre-primary",
          levels: ["FS1", "FS2", "Nursery", "LKG", "UKG"],
          mode: "guardian",
        },
        {
          label: "Primary (Years 1–6 / Grades 1–5)",
          levels: [
            "Year 1",
            "Year 2",
            "Year 3",
            "Year 4",
            "Year 5",
            "Year 6",
            "Grade 1",
            "Grade 2",
            "Grade 3",
            "Grade 4",
            "Grade 5",
          ],
          mode: "family",
        },
      ],
      defaultMode: "own",
      rosterSync: true,
    },
  },
  {
    id: "T-010",
    tenantId: "T-010",
    type: "university",
    experience: "segment",
    region: "UK",
    subRegion: "ENG",
    city: "Manchester",
    packs: ["higher-ed"],
    codeSetId: "he-engagement",
    idFields: ["ucas", "husid", "uln", "cas", "passport"],
    visaSponsor: true,
    studentAccounts: {
      provider: "microsoft",
      domain: "northbridge.ac.uk",
      bands: [],
      defaultMode: "own",
      rosterSync: true,
    },
  },
  {
    id: "T-011",
    tenantId: "T-011",
    type: "college",
    experience: "segment",
    region: "AU",
    subRegion: "NSW",
    city: "Sydney",
    packs: ["higher-ed", "college"],
    codeSetId: "vet-au",
    idFields: ["usi", "chessn", "coe", "passport"],
    visaSponsor: true,
    studentAccounts: {
      provider: "google",
      domain: "harbourside.edu.au",
      bands: [],
      defaultMode: "own",
      rosterSync: true,
    },
  },
  {
    id: "T-012",
    tenantId: "T-012",
    type: "school",
    experience: "segment",
    region: "LK",
    city: "Colombo",
    packs: ["intl-school"],
    codeSetId: "intl-school",
    idFields: ["nic", "birthCert", "passport"],
    groupId: "G-01",
    studentAccounts: {
      provider: "microsoft",
      domain: "meridian.lk",
      bands: [
        {
          label: "Early Years (Lower Nursery – Pre-Grade)",
          levels: ["Lower Nursery", "Upper Nursery", "Pre-Grade"],
          mode: "guardian",
        },
        {
          label: "Primary (Years 1–6)",
          levels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
          mode: "family",
        },
      ],
      defaultMode: "own",
      rosterSync: true,
    },
  },
];

/** The sign-in account and mode for a learner under their tenant's policy. */
export function studentAccountFor(
  learner: Pick<Learner, "email" | "level">,
  policy: StudentAccountPolicy | undefined,
): { provider: SignInProvider; login: string; mode: AccountMode; band?: string } {
  if (!policy) return { provider: "native", login: learner.email, mode: "own" };
  const band = policy.bands.find((b) => b.levels.includes(learner.level));
  return {
    provider: policy.provider,
    login: learner.email,
    mode: band?.mode ?? policy.defaultMode,
    band: band?.label,
  };
}

/** Tenant whose student domain matches an email (sign-in routing). */
export function tenantForStudentDomain(email: string, profiles: TenantProfile[]) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return undefined;
  return profiles.find((p) => p.studentAccounts?.domain === domain);
}

/* ── Academic calendars ──────────────────────────────────────────────────── */

export type TermKind = "teaching" | "exams" | "break" | "resit" | "induction";

export interface AcademicTerm {
  id: string;
  name: string;
  start: string; // ISO date
  end: string;
  kind: TermKind;
}

export interface AcademicCalendar {
  id: string;
  tenantId: string;
  name: string;
  /** What this calendar governs — a curriculum, an intake, a programme family. */
  appliesTo: string;
  academicYear: string;
  start: string;
  end: string;
  periodType: "Terms" | "Semesters" | "Trimesters" | "Blocks";
  terms: AcademicTerm[];
  isDefault?: boolean;
}

export const academicCalendars: AcademicCalendar[] = [
  {
    id: "CAL-0901",
    tenantId: "T-009",
    name: "British curriculum 2026–27",
    appliesTo: "British (IGCSE / A Level) and IB streams",
    academicYear: "2026–27",
    start: "2026-08-31",
    end: "2027-07-02",
    periodType: "Terms",
    isDefault: true,
    terms: [
      { id: "t1", name: "Term 1", start: "2026-08-31", end: "2026-12-11", kind: "teaching" },
      { id: "t1b", name: "Winter break", start: "2026-12-12", end: "2027-01-03", kind: "break" },
      { id: "t2", name: "Term 2", start: "2027-01-04", end: "2027-03-26", kind: "teaching" },
      { id: "t3", name: "Term 3", start: "2027-04-12", end: "2027-07-02", kind: "teaching" },
    ],
  },
  {
    id: "CAL-0902",
    tenantId: "T-009",
    name: "CBSE 2026–27",
    appliesTo: "Indian curriculum (CBSE) stream",
    academicYear: "2026–27",
    start: "2026-04-01",
    end: "2027-03-31",
    periodType: "Terms",
    terms: [
      { id: "c1", name: "Term 1", start: "2026-04-01", end: "2026-09-30", kind: "teaching" },
      {
        id: "c1e",
        name: "Half-yearly exams",
        start: "2026-09-14",
        end: "2026-09-25",
        kind: "exams",
      },
      { id: "c2", name: "Term 2", start: "2026-10-05", end: "2027-03-31", kind: "teaching" },
      { id: "c2e", name: "Annual exams", start: "2027-02-22", end: "2027-03-12", kind: "exams" },
    ],
  },
  {
    id: "CAL-1201",
    tenantId: "T-012",
    name: "International calendar 2026–27",
    appliesTo: "All streams (late Aug–early Jul — overrides LK Jan–Dec government default)",
    academicYear: "2026–27",
    start: "2026-08-24",
    end: "2027-07-02",
    periodType: "Terms",
    isDefault: true,
    terms: [
      { id: "t1", name: "Term 1", start: "2026-08-24", end: "2026-12-11", kind: "teaching" },
      { id: "t2", name: "Term 2", start: "2027-01-05", end: "2027-04-02", kind: "teaching" },
      { id: "t3", name: "Term 3", start: "2027-04-19", end: "2027-07-02", kind: "teaching" },
    ],
  },
  {
    id: "CAL-1001",
    tenantId: "T-010",
    name: "UG/PGT September intake 2026/27",
    appliesTo: "September intake — all UG and PGT programmes",
    academicYear: "2026/27",
    start: "2026-09-14",
    end: "2027-08-27",
    periodType: "Semesters",
    isDefault: true,
    terms: [
      {
        id: "ind",
        name: "Welcome week",
        start: "2026-09-14",
        end: "2026-09-18",
        kind: "induction",
      },
      { id: "s1", name: "Semester 1", start: "2026-09-21", end: "2027-01-22", kind: "teaching" },
      {
        id: "s1e",
        name: "Semester 1 exams",
        start: "2027-01-11",
        end: "2027-01-22",
        kind: "exams",
      },
      { id: "s2", name: "Semester 2", start: "2027-01-25", end: "2027-06-04", kind: "teaching" },
      {
        id: "s2e",
        name: "Semester 2 exams",
        start: "2027-05-17",
        end: "2027-06-04",
        kind: "exams",
      },
      { id: "rs", name: "Resit period", start: "2027-08-09", end: "2027-08-20", kind: "resit" },
    ],
  },
  {
    id: "CAL-1002",
    tenantId: "T-010",
    name: "PGT January intake 2027",
    appliesTo: "January intake — MSc programmes",
    academicYear: "2027",
    start: "2027-01-18",
    end: "2028-01-14",
    periodType: "Semesters",
    terms: [
      { id: "s1", name: "Semester A", start: "2027-01-25", end: "2027-05-28", kind: "teaching" },
      { id: "s2", name: "Semester B", start: "2027-06-07", end: "2027-09-24", kind: "teaching" },
      { id: "dis", name: "Dissertation", start: "2027-09-27", end: "2028-01-14", kind: "teaching" },
    ],
  },
  {
    id: "CAL-1101",
    tenantId: "T-011",
    name: "Higher education 2026",
    appliesTo: "Bachelor programmes (Feb & Jul intakes)",
    academicYear: "2026",
    start: "2026-02-23",
    end: "2026-11-27",
    periodType: "Semesters",
    isDefault: true,
    terms: [
      { id: "s1", name: "Semester 1", start: "2026-02-23", end: "2026-06-19", kind: "teaching" },
      { id: "s2", name: "Semester 2", start: "2026-07-20", end: "2026-11-13", kind: "teaching" },
      {
        id: "s2e",
        name: "Semester 2 exams",
        start: "2026-11-02",
        end: "2026-11-13",
        kind: "exams",
      },
    ],
  },
  {
    id: "CAL-1102",
    tenantId: "T-011",
    name: "VET 2026 (4 terms)",
    appliesTo: "Certificate & Diploma (VET) and apprenticeships",
    academicYear: "2026",
    start: "2026-01-27",
    end: "2026-12-11",
    periodType: "Terms",
    terms: [
      { id: "v1", name: "Term 1", start: "2026-01-27", end: "2026-04-10", kind: "teaching" },
      { id: "v2", name: "Term 2", start: "2026-04-27", end: "2026-07-03", kind: "teaching" },
      { id: "v3", name: "Term 3", start: "2026-07-20", end: "2026-09-25", kind: "teaching" },
      { id: "v4", name: "Term 4", start: "2026-10-12", end: "2026-12-11", kind: "teaching" },
    ],
  },
  {
    id: "CAL-0601",
    tenantId: "T-006",
    name: "School year 2026",
    appliesTo: "All classes (LK government calendar)",
    academicYear: "2026",
    start: "2026-01-02",
    end: "2026-12-04",
    periodType: "Terms",
    isDefault: true,
    terms: [
      { id: "t1", name: "Term 1", start: "2026-01-02", end: "2026-04-09", kind: "teaching" },
      { id: "t2", name: "Term 2", start: "2026-04-20", end: "2026-08-07", kind: "teaching" },
      { id: "t3", name: "Term 3", start: "2026-08-24", end: "2026-12-04", kind: "teaching" },
    ],
  },
];

/** Demo "today" — keeps seeded data meaningful regardless of the real clock. */
export const DEMO_TODAY = "2026-11-02";

export function currentTerm(cal: AcademicCalendar, today = DEMO_TODAY): AcademicTerm | undefined {
  return (
    cal.terms.find((t) => t.kind === "teaching" && t.start <= today && today <= t.end) ??
    cal.terms.find((t) => t.start <= today && today <= t.end)
  );
}

/* ── Learners (segment student records) ──────────────────────────────────── */

export type LearnerStatus =
  | "Active"
  | "Applicant"
  | "Interrupted"
  | "Withdrawn"
  | "Graduated"
  | "Deferred";

export interface Learner {
  id: string; // 1StudentID — permanent, platform-wide
  tenantId: string;
  name: string;
  gender: "F" | "M";
  dob: string;
  email: string;
  status: LearnerStatus;
  /** Year group / level / stage label, e.g. "Year 10", "Level 5 (Year 2)". */
  level: string;
  curriculumId?: string; // school pack
  programmeId?: string; // HE pack
  qualificationId?: string; // college add-on
  calendarId: string;
  /** Tutor group, form, section or cohort. */
  group?: string;
  house?: string;
  guardians?: string[];
  nationality: string;
  officialIds: Record<string, string>;
  visa?: { type: string; expiry: string; ref?: string; sponsored: boolean };
  eal?: boolean;
  supportPlan?: string;
  funding?: string;
  /** Intake label (matches Intake.name within the tenant). */
  intake?: string;
  intakeId?: string;
  /** Actual first day — drives pro-rata fees, census and regulator returns. */
  startDate?: string;
  /** Planned completion (start + programme / qualification duration). */
  expectedEnd?: string;
  mode?: "Full-time" | "Part-time" | "Apprenticeship";
  /** Platform access revoked (leaver) — set by IT Administration. */
  accessRevoked?: boolean;
  /** The person's lifelong 1StudentID when this is a further institution's
   *  record (e.g. a school leaver now at university). Production: ONE person
   *  id with a per-institution enrolment — the prototype keys rows by id, so a
   *  second institution gets a local row that links back. */
  linkedStudentId?: string;
}

/* ── Intakes ─────────────────────────────────────────────────────────────────
 * An intake is a dated entry point into the institution. Intakes are defined
 * per TENANT (from region templates, then overridden), and scoped to the
 * programmes / curricula / qualifications they admit to — so a university can
 * run January entry for its MSc but not its BSc, and a school can start CBSE in
 * April while the British stream starts in August. Rolling intakes (VET,
 * apprenticeships, in-year school admissions) admit on any start date within
 * the window. */

export interface Intake {
  id: string;
  tenantId: string;
  name: string; // matches Application.intake / Learner.intake
  kind: "Fixed" | "Rolling";
  /** Programme / curriculum / qualification ids admitted. Empty = all. */
  scope: string[];
  scopeLabel: string;
  calendarId: string;
  opens: string; // applications open
  deadline: string; // application deadline
  start: string; // first teaching day (rolling: earliest start)
  /** Rolling intakes: latest start date. */
  lastStart?: string;
  /** AU: census date — liability / funding fixed on this date. */
  census?: string;
  capacity: number;
}

export const intakes: Intake[] = [
  {
    id: "INT-0901",
    tenantId: "T-009",
    name: "Aug 2027",
    kind: "Fixed",
    scope: ["CUR-0901", "CUR-0902"],
    scopeLabel: "British & IB streams — all year groups",
    calendarId: "CAL-0901",
    opens: "2026-09-01",
    deadline: "2027-03-31",
    start: "2027-08-30",
    capacity: 160,
  },
  {
    id: "INT-0902",
    tenantId: "T-009",
    name: "Apr 2027",
    kind: "Fixed",
    scope: ["CUR-0903"],
    scopeLabel: "CBSE stream (April–March year)",
    calendarId: "CAL-0902",
    opens: "2026-10-01",
    deadline: "2027-02-15",
    start: "2027-04-01",
    capacity: 60,
  },
  {
    id: "INT-0903",
    tenantId: "T-009",
    name: "Term 2 2026–27",
    kind: "Rolling",
    scope: [],
    scopeLabel: "In-year admissions — any stream, subject to space",
    calendarId: "CAL-0901",
    opens: "2026-08-24",
    deadline: "2027-02-28",
    start: "2027-01-04",
    lastStart: "2027-03-12",
    capacity: 18,
  },
  {
    id: "INT-1201",
    tenantId: "T-012",
    name: "Aug 2027",
    kind: "Fixed",
    scope: [],
    scopeLabel: "All year groups (late Aug–Jul — overrides LK January default)",
    calendarId: "CAL-1201",
    opens: "2026-10-01",
    deadline: "2027-05-31",
    start: "2027-08-23",
    capacity: 90,
  },
  {
    id: "INT-1202",
    tenantId: "T-012",
    name: "Jan 2027",
    kind: "Rolling",
    scope: [],
    scopeLabel: "In-year admissions",
    calendarId: "CAL-1201",
    opens: "2026-09-01",
    deadline: "2026-12-15",
    start: "2027-01-05",
    lastStart: "2027-02-26",
    capacity: 12,
  },
  {
    id: "INT-1001",
    tenantId: "T-010",
    name: "Sep 2027",
    kind: "Fixed",
    scope: ["PRG-1001", "PRG-1002", "PRG-1003"],
    scopeLabel: "All UG and PGT programmes (UCAS for UG)",
    calendarId: "CAL-1001",
    opens: "2026-09-01",
    deadline: "2027-01-28",
    start: "2027-09-20",
    capacity: 420,
  },
  {
    id: "INT-1002",
    tenantId: "T-010",
    name: "Jan 2027",
    kind: "Fixed",
    scope: ["PRG-1002", "PRG-1003"],
    scopeLabel: "MSc Data Science, BSc Business Management",
    calendarId: "CAL-1002",
    opens: "2026-06-01",
    deadline: "2026-11-30",
    start: "2027-01-25",
    capacity: 60,
  },
  {
    id: "INT-1101",
    tenantId: "T-011",
    name: "Feb 2027",
    kind: "Fixed",
    scope: ["PRG-1101", "QUA-1101", "QUA-1103", "QUA-1104"],
    scopeLabel: "Bachelor of IT + Diplomas / Cert IV",
    calendarId: "CAL-1101",
    opens: "2026-08-01",
    deadline: "2027-01-31",
    start: "2027-02-22",
    census: "2027-03-31",
    capacity: 180,
  },
  {
    id: "INT-1102",
    tenantId: "T-011",
    name: "Jul 2027",
    kind: "Fixed",
    scope: ["PRG-1101", "QUA-1101"],
    scopeLabel: "Bachelor of IT, Diploma of IT",
    calendarId: "CAL-1101",
    opens: "2027-01-15",
    deadline: "2027-06-15",
    start: "2027-07-19",
    census: "2027-08-31",
    capacity: 80,
  },
  {
    id: "INT-1103",
    tenantId: "T-011",
    name: "Rolling (VET)",
    kind: "Rolling",
    scope: ["QUA-1102", "QUA-1105", "QUA-1101"],
    scopeLabel: "Apprenticeships & VET — start any Monday",
    calendarId: "CAL-1102",
    opens: "2026-01-05",
    deadline: "2026-12-04",
    start: "2026-01-27",
    lastStart: "2026-12-04",
    capacity: 40,
  },
];

/** Add whole months to an ISO date (expected end = start + duration). */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/* Seeded learners joined on past intakes — give them their real start and
 * expected end so fees, registers and returns all read the same dates. */
const PAST_INTAKE_START: Record<string, string> = {
  "Sep 2024": "2024-09-23",
  "Sep 2025": "2025-09-22",
  "Sep 2026": "2026-09-21",
  "Feb 2025": "2025-02-24",
  "Feb 2026": "2026-02-23",
  "Jul 2026": "2026-07-20",
};
/** Duration in months of each seeded programme / qualification. */
const DURATION_MONTHS: Record<string, number> = {
  "PRG-1001": 36,
  "PRG-1002": 12,
  "PRG-1003": 36,
  "PRG-1101": 36,
  "QUA-1101": 12,
  "QUA-1102": 48,
  "QUA-1103": 12,
  "QUA-1104": 18,
  "QUA-1105": 48,
};
function backfillStartDates(list: Learner[]) {
  for (const l of list) {
    if (l.intake && !l.startDate && PAST_INTAKE_START[l.intake]) {
      l.startDate = PAST_INTAKE_START[l.intake];
      const months = DURATION_MONTHS[l.programmeId ?? l.qualificationId ?? ""];
      // Part-time study takes twice as long.
      if (months)
        l.expectedEnd = addMonthsIso(l.startDate, l.mode === "Part-time" ? months * 2 : months);
    }
  }
}

export type IntakeStatus = "Upcoming" | "Open" | "Closed" | "Started";

export function intakeStatus(i: Intake, today = DEMO_TODAY): IntakeStatus {
  if (today < i.opens) return "Upcoming";
  if (i.kind === "Rolling") return today <= i.deadline ? "Open" : "Closed";
  if (today <= i.deadline) return "Open";
  return today < i.start ? "Closed" : "Started";
}

/** Next Monday on/after a date (rolling intakes start on Mondays). */
export function nextMonday(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** First day an applicant on this intake would start, if enrolled today. */
export function startDateFor(i: Intake | undefined, today = DEMO_TODAY): string {
  if (!i) return today;
  if (i.kind === "Fixed") return i.start;
  const earliest = nextMonday(today > i.start ? today : i.start);
  return i.lastStart && earliest > i.lastStart ? i.lastStart : earliest;
}

/** Intakes a programme / curriculum / qualification can be entered on. */
export function intakesFor(all: Intake[], tenantId: string, scopeId?: string): Intake[] {
  return all.filter(
    (i) =>
      i.tenantId === tenantId && (!scopeId || i.scope.length === 0 || i.scope.includes(scopeId)),
  );
}

/**
 * Teaching periods a learner starting on `start` is billed for, shifting the
 * calendar forward by whole years when the start is after it ends (a
 * 2027 intake on a 2026–27 calendar), and pro-rating the period they join in.
 */
export function billablePeriods(
  cal: AcademicCalendar | undefined,
  start: string,
): { label: string; due: string; factor: number }[] {
  if (!cal) return [];
  const shift = (iso: string, y: number) => {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCFullYear(d.getUTCFullYear() + y);
    return d.toISOString().slice(0, 10);
  };
  let years = 0;
  while (shift(cal.end, years) < start && years < 5) years++;
  const out: { label: string; due: string; factor: number }[] = [];
  for (const tm of cal.terms.filter((x) => x.kind === "teaching")) {
    const s = shift(tm.start, years);
    const e = shift(tm.end, years);
    if (e < start) continue; // ended before they join — not billed
    const label = years ? `${tm.name} ${s.slice(0, 4)}` : tm.name;
    if (s >= start) out.push({ label, due: s, factor: 1 });
    else {
      const span = new Date(e).getTime() - new Date(s).getTime();
      const left = new Date(e).getTime() - new Date(start).getTime();
      out.push({
        label: `${label} (pro-rata)`,
        due: start,
        factor: Math.max(0, Math.min(1, left / span)),
      });
    }
  }
  return out;
}

const ae = (n: string) => `784-${n}`;

export const learners: Learner[] = [
  // ── Meridian International School Dubai (T-009) ──
  {
    id: "S-3001",
    tenantId: "T-009",
    name: "Zara Khan",
    gender: "F",
    dob: "2012-05-12",
    email: "zara.khan@meridian.ae",
    status: "Active",
    level: "Year 10",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "10C",
    house: "Falcon",
    guardians: ["Sarah Khan"],
    nationality: "British",
    officialIds: {
      emiratesId: ae("2012-4417821-3"),
      regulatorNo: "KHDA-118204",
      passport: "553201874",
    },
  },
  {
    id: "S-3002",
    tenantId: "T-009",
    name: "Adam Khan",
    gender: "M",
    dob: "2013-08-02",
    email: "adam.khan@meridian.ae",
    status: "Active",
    level: "Grade 7",
    curriculumId: "CUR-0903",
    calendarId: "CAL-0902",
    group: "7B",
    house: "Oryx",
    guardians: ["Sarah Khan"],
    nationality: "British",
    officialIds: {
      emiratesId: ae("2013-7720145-1"),
      regulatorNo: "KHDA-118205",
      passport: "553201875",
    },
  },
  {
    id: "S-3003",
    tenantId: "T-009",
    name: "Omar Haddad",
    gender: "M",
    dob: "2011-02-20",
    email: "omar.haddad@meridian.ae",
    status: "Active",
    level: "Year 11",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "11A",
    house: "Falcon",
    guardians: ["Rana Haddad"],
    nationality: "Jordanian",
    eal: true,
    officialIds: { emiratesId: ae("2011-3318840-2"), regulatorNo: "KHDA-109331" },
  },
  {
    id: "S-3004",
    tenantId: "T-009",
    name: "Layla Haddad",
    gender: "F",
    dob: "2008-11-03",
    email: "layla.haddad@meridian.ae",
    status: "Active",
    level: "IB DP Year 2",
    curriculumId: "CUR-0902",
    calendarId: "CAL-0901",
    group: "DP2",
    house: "Gazelle",
    guardians: ["Rana Haddad"],
    nationality: "Jordanian",
    officialIds: { emiratesId: ae("2008-1123907-6"), regulatorNo: "KHDA-098110" },
  },
  {
    id: "S-3005",
    tenantId: "T-009",
    name: "Freya Morgan",
    gender: "F",
    dob: "2012-01-15",
    email: "freya.morgan@meridian.ae",
    status: "Active",
    level: "Year 10",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "10C",
    house: "Dhow",
    guardians: ["Tom Morgan"],
    nationality: "British",
    officialIds: { emiratesId: ae("2012-5561002-9"), regulatorNo: "KHDA-118377" },
  },
  {
    id: "S-3006",
    tenantId: "T-009",
    name: "Rohan Iyer",
    gender: "M",
    dob: "2010-06-30",
    email: "rohan.iyer@meridian.ae",
    status: "Active",
    level: "Year 12",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "12B",
    house: "Oryx",
    guardians: ["Meera Iyer"],
    nationality: "Indian",
    officialIds: { emiratesId: ae("2010-2208815-4"), regulatorNo: "KHDA-101920" },
  },
  {
    id: "S-3007",
    tenantId: "T-009",
    name: "Aisha Rahman",
    gender: "F",
    dob: "2010-09-09",
    email: "aisha.rahman@meridian.ae",
    status: "Active",
    level: "Year 11",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "11A",
    house: "Gazelle",
    guardians: ["Khalid Rahman"],
    nationality: "Emirati",
    officialIds: { emiratesId: ae("2010-6610023-7"), regulatorNo: "KHDA-109502" },
  },
  {
    id: "S-3008",
    tenantId: "T-009",
    name: "Daniel Okafor",
    gender: "M",
    dob: "2012-03-22",
    email: "daniel.okafor@meridian.ae",
    status: "Active",
    level: "Year 10",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "10C",
    house: "Dhow",
    guardians: ["Grace Okafor"],
    nationality: "Nigerian",
    supportPlan: "Learning support — dyslexia (IEP, extra time 25%)",
    officialIds: { emiratesId: ae("2012-8840271-0"), regulatorNo: "KHDA-118418" },
  },
  {
    id: "S-3009",
    tenantId: "T-009",
    name: "Mei Tanaka",
    gender: "F",
    dob: "2009-04-18",
    email: "mei.tanaka@meridian.ae",
    status: "Active",
    level: "IB DP Year 2",
    curriculumId: "CUR-0902",
    calendarId: "CAL-0901",
    group: "DP2",
    house: "Falcon",
    guardians: ["Hiro Tanaka"],
    nationality: "Japanese",
    eal: true,
    officialIds: {
      emiratesId: ae("2009-9903412-5"),
      regulatorNo: "KHDA-098233",
      passport: "TR4471023",
    },
  },
  {
    id: "S-3010",
    tenantId: "T-009",
    name: "Kabir Shah",
    gender: "M",
    dob: "2013-12-01",
    email: "kabir.shah@meridian.ae",
    status: "Active",
    level: "Grade 7",
    curriculumId: "CUR-0903",
    calendarId: "CAL-0902",
    group: "7B",
    house: "Dhow",
    guardians: ["Neha Shah"],
    nationality: "Indian",
    officialIds: { emiratesId: ae("2013-4410982-8"), regulatorNo: "KHDA-118690" },
  },
  {
    id: "S-3011",
    tenantId: "T-009",
    name: "Yousef Haddad",
    gender: "M",
    dob: "2022-02-14",
    email: "yousef.haddad@meridian.ae",
    status: "Active",
    level: "FS2",
    curriculumId: "CUR-0901",
    calendarId: "CAL-0901",
    group: "FS2 Falcons",
    house: "Falcon",
    guardians: ["Rana Haddad"],
    nationality: "Jordanian",
    officialIds: { emiratesId: ae("2022-6609413-8"), regulatorNo: "KHDA-118311" },
  },
  // ── Meridian International School Colombo (T-012) ──
  {
    id: "S-3101",
    tenantId: "T-012",
    name: "Nethmi Perera",
    gender: "F",
    dob: "2012-07-07",
    email: "nethmi.p@meridian.lk",
    status: "Active",
    level: "Year 10",
    curriculumId: "CUR-1201",
    calendarId: "CAL-1201",
    group: "10A",
    house: "Lotus",
    guardians: ["Dilani Perera"],
    nationality: "Sri Lankan",
    officialIds: { birthCert: "BC-12-COL-22014" },
  },
  {
    id: "S-3102",
    tenantId: "T-012",
    name: "Kavin Fernando",
    gender: "M",
    dob: "2010-02-14",
    email: "kavin.f@meridian.lk",
    status: "Active",
    level: "Year 12",
    curriculumId: "CUR-1202",
    calendarId: "CAL-1201",
    group: "12A",
    house: "Peacock",
    guardians: ["Ruwan Fernando"],
    nationality: "Sri Lankan",
    officialIds: { nic: "201004501234" },
  },
  {
    id: "S-3103",
    tenantId: "T-012",
    name: "Tharushi Silva",
    gender: "F",
    dob: "2010-10-21",
    email: "tharushi.s@meridian.lk",
    status: "Active",
    level: "Year 11",
    curriculumId: "CUR-1201",
    calendarId: "CAL-1201",
    group: "11A",
    house: "Lotus",
    guardians: ["Chamari Silva"],
    nationality: "Sri Lankan",
    officialIds: { nic: "201079504112" },
  },
  {
    id: "S-3104",
    tenantId: "T-012",
    name: "Ashan Jayasuriya",
    gender: "M",
    dob: "2009-05-30",
    email: "ashan.j@meridian.lk",
    status: "Active",
    level: "Year 13",
    curriculumId: "CUR-1202",
    calendarId: "CAL-1201",
    group: "13A",
    house: "Peacock",
    guardians: ["Nimali Jayasuriya"],
    nationality: "Sri Lankan",
    officialIds: { nic: "200915102233" },
  },
  {
    // Primary pupil — the family uses his school Microsoft 365 account.
    id: "S-3105",
    tenantId: "T-012",
    name: "Sasindu Perera",
    gender: "M",
    dob: "2019-03-15",
    email: "sasindu.p@meridian.lk",
    status: "Active",
    level: "Year 3",
    curriculumId: "CUR-1201",
    calendarId: "CAL-1201",
    group: "3B",
    house: "Lotus",
    guardians: ["Dilani Perera"],
    nationality: "Sri Lankan",
    officialIds: { birthCert: "BC-19-COL-08311" },
  },
  {
    // Early years — Upper Nursery (age 3 on 31 Aug 2026); no pupil login
    // (parent account only), sibling of Nethmi and Sasindu.
    id: "S-3106",
    tenantId: "T-012",
    name: "Senuli Perera",
    gender: "F",
    dob: "2023-01-10",
    email: "senuli.p@meridian.lk",
    status: "Active",
    level: "Upper Nursery",
    curriculumId: "CUR-1201",
    calendarId: "CAL-1201",
    group: "UN Butterflies",
    house: "Lotus",
    guardians: ["Dilani Perera"],
    nationality: "Sri Lankan",
    officialIds: { birthCert: "BC-23-COL-00412" },
  },
  // ── Northbridge University (T-010) ──
  {
    id: "S-4001",
    tenantId: "T-010",
    name: "Arjun Mehta",
    gender: "M",
    dob: "2005-07-14",
    email: "arjun.mehta@northbridge.ac.uk",
    status: "Active",
    level: "Level 5 (Year 2)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2025 Sep cohort",
    nationality: "Indian",
    intake: "Sep 2025",
    mode: "Full-time",
    funding: "Self-funded (international)",
    visa: { type: "Student route", expiry: "2028-10-31", ref: "CAS E4G7H2K9P1", sponsored: true },
    officialIds: {
      ucas: "1234567890",
      husid: "2511234567890",
      cas: "E4G7H2K9P1",
      passport: "Z8812047",
    },
  },
  {
    // Graduate (2025) — keeps her 1StudentID for life; alumni record ALU-1001.
    id: "S-4801",
    tenantId: "T-010",
    name: "Priya Shah",
    gender: "F",
    dob: "2003-04-22",
    email: "priya.shah@alumni.northbridge.ac.uk",
    status: "Graduated",
    level: "Graduated 2025",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2022 Sep cohort",
    nationality: "British",
    intake: "Sep 2022",
    startDate: "2022-09-19",
    expectedEnd: "2025-07-15",
    mode: "Full-time",
    officialIds: { ucas: "1209876543", husid: "2211098765432" },
  },
  {
    id: "S-4002",
    tenantId: "T-010",
    name: "Grace Walker",
    gender: "F",
    dob: "2006-02-11",
    email: "grace.walker@northbridge.ac.uk",
    status: "Active",
    level: "Level 5 (Year 2)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2025 Sep cohort",
    nationality: "British",
    intake: "Sep 2025",
    mode: "Full-time",
    funding: "Student Finance England (tuition loan)",
    officialIds: { ucas: "1209981223", husid: "2511234500112", uln: "4419920318" },
  },
  {
    id: "S-4003",
    tenantId: "T-010",
    name: "Noah Bennett",
    gender: "M",
    dob: "2005-10-30",
    email: "noah.bennett@northbridge.ac.uk",
    status: "Active",
    level: "Level 5 (Year 2)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2025 Sep cohort",
    nationality: "British",
    intake: "Sep 2025",
    mode: "Full-time",
    funding: "Student Finance England (tuition loan)",
    supportPlan: "DSA — assistive software, exam rest breaks",
    officialIds: { ucas: "1210045677", husid: "2511234500245", uln: "4419920442" },
  },
  {
    id: "S-4004",
    tenantId: "T-010",
    name: "Chen Wei",
    gender: "M",
    dob: "2004-05-05",
    email: "chen.wei@northbridge.ac.uk",
    status: "Active",
    level: "Level 5 (Year 2)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2025 Sep cohort",
    nationality: "Chinese",
    intake: "Sep 2025",
    mode: "Full-time",
    funding: "Self-funded (international)",
    eal: true,
    visa: { type: "Student route", expiry: "2028-10-31", ref: "CAS E4G7H3M2Q8", sponsored: true },
    officialIds: {
      ucas: "1210988211",
      husid: "2511234500378",
      cas: "E4G7H3M2Q8",
      passport: "EK2290471",
    },
  },
  {
    id: "S-4005",
    tenantId: "T-010",
    name: "Mia Collins",
    gender: "F",
    dob: "2006-08-19",
    email: "mia.collins@northbridge.ac.uk",
    status: "Active",
    level: "Level 5 (Year 2)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2025 Sep cohort",
    nationality: "Irish",
    intake: "Sep 2025",
    mode: "Full-time",
    funding: "Student Finance England (tuition loan)",
    officialIds: { ucas: "1211002934", husid: "2511234500401" },
  },
  {
    id: "S-4006",
    tenantId: "T-010",
    name: "Fatima Noor",
    gender: "F",
    dob: "2001-12-12",
    email: "fatima.noor@northbridge.ac.uk",
    status: "Active",
    level: "PGT (MSc)",
    programmeId: "PRG-1002",
    calendarId: "CAL-1001",
    group: "MSc DS 2026 Sep cohort",
    nationality: "Pakistani",
    intake: "Sep 2026",
    mode: "Full-time",
    funding: "Scholarship — Commonwealth Shared Scholarship (50%)",
    visa: { type: "Student route", expiry: "2028-01-31", ref: "CAS E5K1L9N3R4", sponsored: true },
    officialIds: { husid: "2611234500044", cas: "E5K1L9N3R4", passport: "AB9910442" },
  },
  {
    id: "S-4007",
    tenantId: "T-010",
    name: "Leo Ward",
    gender: "M",
    dob: "2007-01-25",
    email: "leo.ward@northbridge.ac.uk",
    status: "Active",
    level: "Level 4 (Year 1)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2026 Sep cohort",
    nationality: "British",
    intake: "Sep 2026",
    mode: "Full-time",
    funding: "Student Finance England (tuition loan)",
    officialIds: { ucas: "1301239981", husid: "2611234500122", uln: "4420018876" },
  },
  {
    id: "S-4008",
    tenantId: "T-010",
    name: "Isabelle Fox",
    gender: "F",
    dob: "2004-09-03",
    email: "isabelle.fox@northbridge.ac.uk",
    status: "Interrupted",
    level: "Level 6 (Year 3)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2024 Sep cohort",
    nationality: "British",
    intake: "Sep 2024",
    mode: "Full-time",
    funding: "Student Finance England (tuition loan)",
    officialIds: { ucas: "1122340987", husid: "2411234500987" },
  },
  {
    id: "S-4009",
    tenantId: "T-010",
    name: "Daniel Price",
    gender: "M",
    dob: "1998-04-08",
    email: "daniel.price@northbridge.ac.uk",
    status: "Active",
    level: "PGT (MSc)",
    programmeId: "PRG-1002",
    calendarId: "CAL-1001",
    group: "MSc DS 2026 Sep cohort",
    nationality: "British",
    intake: "Sep 2026",
    mode: "Part-time",
    funding: "Employer-sponsored — Northwind Analytics Ltd (100%)",
    officialIds: { husid: "2611234500311", uln: "4402219983" },
  },
  {
    id: "S-4010",
    tenantId: "T-010",
    name: "Ananya Rao",
    gender: "F",
    dob: "2005-03-17",
    email: "ananya.rao@northbridge.ac.uk",
    status: "Active",
    level: "Level 5 (Year 2)",
    programmeId: "PRG-1001",
    calendarId: "CAL-1001",
    group: "CS 2025 Sep cohort",
    nationality: "Indian",
    intake: "Sep 2025",
    mode: "Full-time",
    funding: "Self-funded (international)",
    visa: { type: "Student route", expiry: "2028-10-31", ref: "CAS E4G7H4T6W2", sponsored: true },
    officialIds: {
      ucas: "1211457702",
      husid: "2511234500512",
      cas: "E4G7H4T6W2",
      passport: "V4410982",
    },
  },
  // ── Harbourside College Sydney (T-011) ──
  {
    id: "S-5001",
    tenantId: "T-011",
    name: "Sakura Tanaka",
    gender: "F",
    dob: "2004-06-21",
    email: "sakura.t@harbourside.edu.au",
    status: "Active",
    level: "Diploma (AQF 5)",
    qualificationId: "QUA-1101",
    calendarId: "CAL-1102",
    group: "ICT Dip — Term 4",
    nationality: "Japanese",
    intake: "Jul 2026",
    mode: "Full-time",
    funding: "International full fee",
    eal: true,
    visa: {
      type: "Student visa (subclass 500)",
      expiry: "2027-12-15",
      ref: "CoE 0XQ2291-1",
      sponsored: true,
    },
    officialIds: {
      usi: "3HKW7R2PQX",
      coe: "CoE 0XQ2291-1 · CRICOS 109876K",
      passport: "TK8814402",
    },
  },
  {
    id: "S-5002",
    tenantId: "T-011",
    name: "Riley Cooper",
    gender: "M",
    dob: "2006-09-14",
    email: "riley.c@harbourside.edu.au",
    status: "Active",
    level: "Certificate III (AQF 3)",
    qualificationId: "QUA-1102",
    calendarId: "CAL-1102",
    group: "Electrotech apprentices 2025",
    nationality: "Australian",
    intake: "Feb 2025",
    mode: "Apprenticeship",
    funding: "Smart and Skilled (NSW) — apprenticeship",
    officialIds: { usi: "9JDP4LMX22" },
  },
  {
    id: "S-5003",
    tenantId: "T-011",
    name: "Ruby Evans",
    gender: "F",
    dob: "2005-02-02",
    email: "ruby.e@harbourside.edu.au",
    status: "Active",
    level: "Certificate IV (AQF 4)",
    qualificationId: "QUA-1103",
    calendarId: "CAL-1102",
    group: "Ageing Support 2026",
    nationality: "Australian",
    intake: "Feb 2026",
    mode: "Full-time",
    funding: "Fee-free TAFE / Smart and Skilled",
    officialIds: { usi: "7WQX2KDP91" },
  },
  {
    id: "S-5004",
    tenantId: "T-011",
    name: "Lachlan Murphy",
    gender: "M",
    dob: "2003-11-11",
    email: "lachlan.m@harbourside.edu.au",
    status: "Active",
    level: "Bachelor Year 2",
    programmeId: "PRG-1101",
    calendarId: "CAL-1101",
    group: "BIT 2025 Feb cohort",
    nationality: "Australian",
    intake: "Feb 2025",
    mode: "Full-time",
    funding: "Commonwealth supported + HECS-HELP",
    officialIds: { usi: "2LMQ8XWD44", chessn: "1100294471" },
  },
  {
    id: "S-5005",
    tenantId: "T-011",
    name: "Ishaan Kapoor",
    gender: "M",
    dob: "2004-01-30",
    email: "ishaan.k@harbourside.edu.au",
    status: "Active",
    level: "Bachelor Year 2",
    programmeId: "PRG-1101",
    calendarId: "CAL-1101",
    group: "BIT 2025 Feb cohort",
    nationality: "Indian",
    intake: "Feb 2025",
    mode: "Full-time",
    funding: "International full fee",
    visa: {
      type: "Student visa (subclass 500)",
      expiry: "2028-03-30",
      ref: "CoE 0XP9912-3",
      sponsored: true,
    },
    officialIds: { usi: "5KQW2PZX17", coe: "CoE 0XP9912-3 · CRICOS 101122B", passport: "W2209817" },
  },
  {
    id: "S-5006",
    tenantId: "T-011",
    name: "Chloe Martin",
    gender: "F",
    dob: "2006-05-05",
    email: "chloe.m@harbourside.edu.au",
    status: "Active",
    level: "Diploma (AQF 5)",
    qualificationId: "QUA-1104",
    calendarId: "CAL-1102",
    group: "Nursing Dip 2026",
    nationality: "Australian",
    intake: "Feb 2026",
    mode: "Full-time",
    funding: "VET Student Loan",
    officialIds: { usi: "8PZD3QWK55" },
  },
  {
    id: "S-5007",
    tenantId: "T-011",
    name: "Tom Nguyen",
    gender: "M",
    dob: "2005-08-08",
    email: "tom.n@harbourside.edu.au",
    status: "Active",
    level: "Certificate III (AQF 3)",
    qualificationId: "QUA-1105",
    calendarId: "CAL-1102",
    group: "Carpentry apprentices 2026",
    nationality: "Australian",
    intake: "Feb 2026",
    mode: "Apprenticeship",
    funding: "Smart and Skilled (NSW) — apprenticeship",
    officialIds: { usi: "4XKD9PLW38" },
  },
  {
    id: "S-5008",
    tenantId: "T-011",
    name: "Ella Brooks",
    gender: "F",
    dob: "2004-04-04",
    email: "ella.b@harbourside.edu.au",
    status: "Active",
    level: "Diploma (AQF 5)",
    qualificationId: "QUA-1101",
    calendarId: "CAL-1102",
    group: "ICT Dip — Term 4",
    nationality: "New Zealander",
    intake: "Feb 2026",
    mode: "Part-time",
    funding: "Fee for service",
    officialIds: { usi: "6QWP2XKD80" },
  },
];
backfillStartDates(learners);

/* ── Groups & campuses ───────────────────────────────────────────────────── */

export interface TenantGroup {
  id: string;
  name: string;
  hq: string;
  tenantIds: string[];
  /** Group-level staff who see the cross-campus view. */
  groupAdmins: string[];
}

export const tenantGroups: TenantGroup[] = [
  {
    id: "G-01",
    name: "Meridian Education Group",
    hq: "Dubai, UAE",
    tenantIds: ["T-009", "T-012"],
    groupAdmins: ["Hannah Clarke"],
  },
];
