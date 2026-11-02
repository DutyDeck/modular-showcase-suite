/* ── Governance seeds for pack tenants ──────────────────────────────────────
 * Plain reference data for the core Compliance, Migration and Users screens
 * when a segment (pack) tenant is signed in. Not registered in the store:
 * runtime changes (DSAR status, new import runs, role changes) are written to
 * the changeLog through logChange() and read back from there.
 *
 * Regulatory detail is DEMO-GRADE — each country's compliance pack confirms
 * it against cited sources before production. */
import type { RegionCode, InstitutionType } from "../regions";

/* ── Data-protection posture by region ───────────────────────────────────── */

export interface Framework {
  name: string;
  note: string;
  /** Short tag shown on the card, e.g. "Federal", "Dubai", "Sector". */
  scope: string;
}

export interface PrivacyPosture {
  /** Headline law, e.g. "UK GDPR · DPA 2018". */
  headline: string;
  frameworks: Framework[];
  /** Days to answer a rights request (calendar days, demo policy). */
  dsarDays: number;
  dsarNote: string;
  /** Under this age a guardian gives consent for online services. */
  consentAge: number;
  consentNote: string;
  /** Rights a data subject can invoke (labels used in the DSAR queue). */
  rights: string[];
  residency: string;
  regulatorContact: string;
}

export const PRIVACY: Partial<Record<RegionCode, PrivacyPosture>> = {
  AE: {
    headline: "UAE PDPL · KHDA",
    frameworks: [
      {
        name: "UAE PDPL",
        note: "Federal Decree-Law 45/2021 on personal data protection",
        scope: "Federal",
      },
      {
        name: "KHDA data requirements",
        note: "Private-school records, inspection and enrolment returns (Dubai)",
        scope: "Dubai",
      },
      {
        name: "Wadeema's Law",
        note: "Federal Law 3/2016 on child rights — safeguarding and privacy of children",
        scope: "Federal",
      },
      {
        name: "Exam-board data sharing",
        note: "Cambridge, Pearson, IB and CBSE candidate data (entries and results)",
        scope: "Sector",
      },
    ],
    dsarDays: 30,
    dsarNote: "Executive regulations still pending — 30 days is school policy.",
    consentAge: 18,
    consentNote: "Under-18s: the guardian consents (school policy under PDPL).",
    rights: ["Access", "Correction", "Erasure", "Restriction", "Objection", "Portability"],
    residency: "UAE (Dubai region)",
    regulatorContact: "UAE Data Office",
  },
  LK: {
    headline: "Sri Lanka PDPA No. 9 of 2022",
    frameworks: [
      {
        name: "Sri Lanka PDPA",
        note: "Personal Data Protection Act No. 9 of 2022 — Parts I & III from 1 Jan 2027",
        scope: "National",
      },
      {
        name: "Data Protection Authority",
        note: "Guidance and registration of controllers (DPA Sri Lanka)",
        scope: "Regulator",
      },
      {
        name: "Children's data",
        note: "PDPA treats under-18s as children — guardian consent for processing",
        scope: "National",
      },
      {
        name: "Exam-board data sharing",
        note: "Cambridge, Pearson Edexcel and Department of Examinations entries",
        scope: "Sector",
      },
    ],
    dsarDays: 21,
    dsarNote: "Part II (data-subject rights) date not yet set — 21 days is school policy.",
    consentAge: 18,
    consentNote: "Under-18s are children under the PDPA: the guardian consents.",
    rights: ["Access", "Rectification", "Erasure", "Withdraw consent", "Objection"],
    residency: "Singapore (cross-border transfer recorded)",
    regulatorContact: "Data Protection Authority of Sri Lanka",
  },
  UK: {
    headline: "UK GDPR · DPA 2018",
    frameworks: [
      {
        name: "UK GDPR",
        note: "UK General Data Protection Regulation",
        scope: "UK",
      },
      {
        name: "DPA 2018",
        note: "Data Protection Act 2018, as amended by the Data (Use and Access) Act 2025",
        scope: "UK",
      },
      {
        name: "ICO Children's Code",
        note: "Age Appropriate Design Code — applies to under-18 students and applicants",
        scope: "UK",
      },
      {
        name: "HESA Data Futures",
        note: "Student record return and collection notice (OfS / Jisc)",
        scope: "Sector",
      },
      {
        name: "UKVI sponsor duties",
        note: "Record keeping for sponsored students (Student route)",
        scope: "Sector",
      },
    ],
    dsarDays: 30,
    dsarNote: "One month, extendable by two months for complex requests.",
    consentAge: 13,
    consentNote: "Age of digital consent is 13 (UK GDPR Art. 8).",
    rights: [
      "Access (Art. 15)",
      "Rectification (Art. 16)",
      "Erasure (Art. 17)",
      "Restriction (Art. 18)",
      "Portability (Art. 20)",
      "Objection (Art. 21)",
    ],
    residency: "UK South (London)",
    regulatorContact: "Information Commission (ICO)",
  },
  AU: {
    headline: "Privacy Act 1988 · APPs",
    frameworks: [
      {
        name: "Privacy Act 1988",
        note: "Australian Privacy Principles (APPs), as amended in 2024",
        scope: "Federal",
      },
      {
        name: "Children's Online Privacy Code",
        note: "OAIC code due by 10 Dec 2026 — under-18 users",
        scope: "Federal",
      },
      {
        name: "Student Identifiers Act 2014",
        note: "USI collection, verification and use",
        scope: "VET",
      },
      {
        name: "AVETMISS / NCVER",
        note: "Total VET activity reporting and the NCVER privacy notice",
        scope: "VET",
      },
      {
        name: "ESOS Act · National Code 2018",
        note: "Overseas student records and PRISMS reporting",
        scope: "CRICOS",
      },
    ],
    dsarDays: 30,
    dsarNote: "APP 12 — respond within a reasonable period (30 days is college policy).",
    consentAge: 15,
    consentNote: "No fixed age; OAIC guidance presumes capacity from 15.",
    rights: ["Access (APP 12)", "Correction (APP 13)", "Opt out of direct marketing (APP 7)"],
    residency: "Australia East (Sydney)",
    regulatorContact: "OAIC",
  },
};

/* ── Retention schedules by segment ──────────────────────────────────────── */

export interface RetentionRow {
  category: string;
  basis: string;
  period: string;
  action: string;
}

export const RETENTION: Partial<Record<InstitutionType, RetentionRow[]>> = {
  school: [
    {
      category: "Pupil record (admission, attendance, reports)",
      basis: "Legal obligation / regulator inspection",
      period: "7 years after leaving",
      action: "Anonymise, keep summary",
    },
    {
      category: "Exam entries and certificates",
      basis: "Legitimate interests (re-issue)",
      period: "Until the pupil's 25th birthday",
      action: "Archive, restricted",
    },
    {
      category: "Safeguarding and wellbeing notes",
      basis: "Vital interests / legal obligation",
      period: "Until the pupil's 25th birthday",
      action: "Sealed archive",
    },
    {
      category: "Medical, allergy and SEN details",
      basis: "Explicit consent / vital interests",
      period: "While enrolled + 1 year",
      action: "Purge",
    },
    {
      category: "Trip and photo consents",
      basis: "Consent (guardian)",
      period: "Academic year + 1 year",
      action: "Purge",
    },
    {
      category: "Fee invoices and receipts",
      basis: "Legal obligation (tax)",
      period: "7 years",
      action: "Purge",
    },
  ],
  university: [
    {
      category: "Core student record and award",
      basis: "Public task / contract",
      period: "Permanent (transcript and award only)",
      action: "Reduce to core record",
    },
    {
      category: "Assessment scripts and marks",
      basis: "Contract",
      period: "1 year after the exam board",
      action: "Purge scripts, keep marks",
    },
    {
      category: "Extenuating circumstances evidence",
      basis: "Explicit consent (health data)",
      period: "6 years after leaving",
      action: "Purge",
    },
    {
      category: "Sponsored-student (visa) records",
      basis: "Legal obligation (UKVI)",
      period: "End of sponsorship + 1 year",
      action: "Purge",
    },
    {
      category: "Fees and payments",
      basis: "Legal obligation (HMRC)",
      period: "6 years",
      action: "Purge",
    },
    {
      category: "Applicant records (not enrolled)",
      basis: "Legitimate interests",
      period: "1 year after the cycle",
      action: "Purge",
    },
  ],
  college: [
    {
      category: "Qualifications and statements issued",
      basis: "Legal obligation (ASQA)",
      period: "30 years",
      action: "Archive",
    },
    {
      category: "Assessment evidence",
      basis: "Legal obligation (RTO Standards)",
      period: "6 months after the result",
      action: "Purge, keep outcome",
    },
    {
      category: "AVETMISS enrolment data",
      basis: "Legal obligation (NCVER)",
      period: "7 years",
      action: "Anonymise",
    },
    {
      category: "Overseas student records (CRICOS)",
      basis: "Legal obligation (ESOS Act)",
      period: "2 years after the student leaves",
      action: "Purge",
    },
    {
      category: "USI and identity documents",
      basis: "Legal obligation (Student Identifiers Act)",
      period: "Verify, then do not store copies",
      action: "Delete copies",
    },
    {
      category: "Fees and payments",
      basis: "Legal obligation (ATO)",
      period: "5 years",
      action: "Purge",
    },
  ],
};

/* ── Rights-request (DSAR) queue seeds ───────────────────────────────────── */

export interface DsarSeed {
  id: string;
  tenantId: string;
  subject: string;
  /** Learner the request is about, if any. */
  studentId?: string;
  /** Who made it (guardian on behalf of a child, or the person). */
  requester: string;
  right: string;
  raised: string; // ISO date
  origin: string;
  status: "Open" | "Verified" | "Fulfilled";
  note?: string;
}

export const DSAR_SEEDS: DsarSeed[] = [
  // Meridian International School, Dubai (T-009)
  {
    id: "RR-0901",
    tenantId: "T-009",
    subject: "Zara Khan, Adam Khan",
    studentId: "S-3001",
    requester: "Sarah Khan (guardian)",
    right: "Access",
    raised: "2026-10-20",
    origin: "Parent app",
    status: "Verified",
    note: "Copy of both children's records, incl. behaviour notes",
  },
  {
    id: "RR-0902",
    tenantId: "T-009",
    subject: "Freya Morgan",
    studentId: "S-3005",
    requester: "Tom Morgan (guardian)",
    right: "Objection",
    raised: "2026-10-28",
    origin: "Email to DPO",
    status: "Open",
    note: "No photos on the school's social media",
  },
  {
    id: "RR-0903",
    tenantId: "T-009",
    subject: "Omar Haddad",
    studentId: "S-3003",
    requester: "Rana Haddad (guardian)",
    right: "Correction",
    raised: "2026-09-14",
    origin: "Front office",
    status: "Fulfilled",
    note: "Arabic name spelling on the Emirates ID record",
  },
  {
    id: "RR-0904",
    tenantId: "T-009",
    subject: "Mr. Peter Holt (former staff)",
    requester: "Mr. Peter Holt",
    right: "Access",
    raised: "2026-08-02",
    origin: "Email to DPO",
    status: "Fulfilled",
  },
  // Meridian International School, Colombo (T-012)
  {
    id: "RR-1201",
    tenantId: "T-012",
    subject: "Nethmi, Sasindu and Senuli Perera",
    studentId: "S-3101",
    requester: "Dilani Perera (guardian)",
    right: "Access",
    raised: "2026-10-22",
    origin: "Parent app",
    status: "Open",
  },
  {
    id: "RR-1202",
    tenantId: "T-012",
    subject: "Ashan Jayasuriya",
    studentId: "S-3104",
    requester: "Nimali Jayasuriya (guardian)",
    right: "Withdraw consent",
    raised: "2026-10-05",
    origin: "Front office",
    status: "Fulfilled",
    note: "Withdrew consent for the alumni newsletter",
  },
  {
    id: "RR-1203",
    tenantId: "T-012",
    subject: "Tharushi Silva",
    studentId: "S-3103",
    requester: "Chamari Silva (guardian)",
    right: "Rectification",
    raised: "2026-10-30",
    origin: "Email to office",
    status: "Open",
    note: "Date of birth differs from the birth certificate",
  },
  // Northbridge University (T-010)
  {
    id: "RR-1001",
    tenantId: "T-010",
    subject: "Arjun Mehta",
    studentId: "S-4001",
    requester: "Arjun Mehta",
    right: "Access (Art. 15)",
    raised: "2026-10-12",
    origin: "Student portal",
    status: "Verified",
    note: "All marks and moderation comments for CS201",
  },
  {
    id: "RR-1002",
    tenantId: "T-010",
    subject: "Priya Shah (alumna)",
    studentId: "S-4801",
    requester: "Priya Shah",
    right: "Objection (Art. 21)",
    raised: "2026-10-26",
    origin: "Email to DPO",
    status: "Open",
    note: "Stop alumni fundraising contact; keep transcript",
  },
  {
    id: "RR-1003",
    tenantId: "T-010",
    subject: "Daniel Price",
    studentId: "S-4009",
    requester: "Daniel Price",
    right: "Portability (Art. 20)",
    raised: "2026-09-18",
    origin: "Student portal",
    status: "Fulfilled",
  },
  {
    id: "RR-1004",
    tenantId: "T-010",
    subject: "Isabelle Fox",
    studentId: "S-4008",
    requester: "Isabelle Fox",
    right: "Rectification (Art. 16)",
    raised: "2026-09-02",
    origin: "Registry desk",
    status: "Open",
    note: "Mode of study shown as full-time during interruption",
  },
  // Harbourside College, Sydney (T-011)
  {
    id: "RR-1101",
    tenantId: "T-011",
    subject: "Riley Cooper",
    studentId: "S-5002",
    requester: "Riley Cooper",
    right: "Access (APP 12)",
    raised: "2026-10-24",
    origin: "Student portal",
    status: "Open",
  },
  {
    id: "RR-1102",
    tenantId: "T-011",
    subject: "Tom Nguyen",
    studentId: "S-5007",
    requester: "Tom Nguyen",
    right: "Correction (APP 13)",
    raised: "2026-10-08",
    origin: "Student services",
    status: "Fulfilled",
    note: "Name order on the USI did not match the passport",
  },
  {
    id: "RR-1103",
    tenantId: "T-011",
    subject: "Ella Brooks",
    studentId: "S-5008",
    requester: "Ella Brooks",
    right: "Opt out of direct marketing (APP 7)",
    raised: "2026-10-30",
    origin: "Email",
    status: "Open",
  },
];

/* ── Migration: source systems and historic runs ─────────────────────────── */

export interface SourceSystem {
  name: string;
  exportNote: string;
  method: "API" | "CSV" | "SFTP";
  /** IntegrationDef key, when the tenant can connect it live. */
  integrationKey?: string;
}

const SCHOOL_UK_STYLE: SourceSystem[] = [
  { name: "iSAMS", exportNote: "Report Writer → pupil, contact and fee exports", method: "API" },
  { name: "SIMS", exportNote: "Reports → Export pupil and contact data as CSV", method: "CSV" },
  { name: "Arbor", exportNote: "Data export → students, guardians, attendance", method: "API" },
  {
    name: "ManageBac",
    exportNote: "IB / MYP classes, students and grades export",
    method: "API",
  },
  {
    name: "Excel / Google Sheets",
    exportNote: "Any roster or fee sheet — save as CSV (UTF-8)",
    method: "CSV",
  },
];

export function sourcesFor(region: RegionCode, type: InstitutionType): SourceSystem[] {
  if (type === "university")
    return [
      {
        name: "Tribal SITS:Vision",
        exportNote: "Student, programme and module records via SITS API",
        method: "API",
        integrationKey: "sits",
      },
      {
        name: "Ellucian Banner",
        exportNote: "Ethos API or SPRIDEN / SFRSTCR extracts",
        method: "API",
      },
      {
        name: "Oracle PeopleSoft Campus Solutions",
        exportNote: "Query Manager → student and enrolment CSV",
        method: "CSV",
      },
      {
        name: "Moodle",
        exportNote: "Course and enrolment data",
        method: "API",
        integrationKey: "moodle",
      },
      { name: "Excel", exportNote: "Legacy spreadsheets — save as CSV (UTF-8)", method: "CSV" },
    ];
  if (type === "college")
    return [
      {
        name: "aXcelerate",
        exportNote: "Contacts, enrolments and unit outcomes via API",
        method: "API",
      },
      {
        name: "VETtrak",
        exportNote: "Client, enrolment and AVETMISS NAT file export",
        method: "CSV",
      },
      {
        name: "AVETMISS NAT files",
        exportNote: "NAT00080 / 00085 / 00120 from any previous SMS",
        method: "SFTP",
      },
      { name: "Excel", exportNote: "Employer and placement sheets — save as CSV", method: "CSV" },
    ];
  if (region === "LK")
    return [
      {
        name: "Excel / Google Sheets",
        exportNote: "Class registers and fee books — save as CSV (UTF-8)",
        method: "CSV",
      },
      {
        name: "Legacy school system (MS Access / local SQL)",
        exportNote: "Table export to CSV; we map admission numbers",
        method: "CSV",
      },
      {
        name: "Accounting package (QuickBooks / Tally)",
        exportNote: "Customer balances report → CSV",
        method: "CSV",
      },
      { name: "SIMS", exportNote: "Reports → Export pupil and contact data as CSV", method: "CSV" },
    ];
  return SCHOOL_UK_STYLE;
}

export interface MigrationRunSeed {
  id: string;
  tenantId: string;
  entity: "Learners" | "Guardians" | "Results" | "Fee balances" | "Documents";
  source: string;
  date: string; // ISO date
  /** Rows = per-learner multiplier × tenant learners (Results, Fee balances). */
  perLearner?: number;
  status: "Completed" | "Partial";
  note?: string;
}

export const MIGRATION_RUNS: MigrationRunSeed[] = [
  {
    id: "MIG-0901",
    tenantId: "T-009",
    entity: "Learners",
    source: "iSAMS (British)",
    date: "2026-08-12",
    status: "Completed",
  },
  {
    id: "MIG-0902",
    tenantId: "T-009",
    entity: "Guardians",
    source: "iSAMS contacts",
    date: "2026-08-12",
    status: "Completed",
  },
  {
    id: "MIG-0903",
    tenantId: "T-009",
    entity: "Results",
    source: "ManageBac (IB) + iSAMS",
    date: "2026-08-14",
    perLearner: 8,
    status: "Completed",
  },
  {
    id: "MIG-0904",
    tenantId: "T-009",
    entity: "Fee balances",
    source: "Excel (CBSE fee book)",
    date: "2026-08-15",
    perLearner: 1,
    status: "Partial",
    note: "2 rows held: guardian name mismatch",
  },
  {
    id: "MIG-0905",
    tenantId: "T-009",
    entity: "Documents",
    source: "Shared drive (passports, EID)",
    date: "2026-08-18",
    status: "Completed",
  },
  {
    id: "MIG-1201",
    tenantId: "T-012",
    entity: "Learners",
    source: "Legacy school system (Access)",
    date: "2026-08-05",
    status: "Completed",
  },
  {
    id: "MIG-1202",
    tenantId: "T-012",
    entity: "Guardians",
    source: "Excel (admission register)",
    date: "2026-08-05",
    status: "Completed",
  },
  {
    id: "MIG-1203",
    tenantId: "T-012",
    entity: "Fee balances",
    source: "QuickBooks customer balances",
    date: "2026-08-08",
    perLearner: 1,
    status: "Completed",
  },
  {
    id: "MIG-1204",
    tenantId: "T-012",
    entity: "Results",
    source: "Excel (term test sheets)",
    date: "2026-08-10",
    perLearner: 6,
    status: "Partial",
    note: "Early-years rows skipped (no marks)",
  },
  {
    id: "MIG-1001",
    tenantId: "T-010",
    entity: "Learners",
    source: "Tribal SITS:Vision",
    date: "2026-07-20",
    status: "Completed",
  },
  {
    id: "MIG-1002",
    tenantId: "T-010",
    entity: "Results",
    source: "Tribal SITS:Vision (module marks)",
    date: "2026-07-22",
    perLearner: 12,
    status: "Completed",
  },
  {
    id: "MIG-1003",
    tenantId: "T-010",
    entity: "Fee balances",
    source: "SITS fees + Agresso",
    date: "2026-07-24",
    perLearner: 1,
    status: "Completed",
  },
  {
    id: "MIG-1004",
    tenantId: "T-010",
    entity: "Documents",
    source: "SITS document store (CAS, passports)",
    date: "2026-07-27",
    status: "Completed",
  },
  {
    id: "MIG-1101",
    tenantId: "T-011",
    entity: "Learners",
    source: "aXcelerate",
    date: "2026-06-16",
    status: "Completed",
  },
  {
    id: "MIG-1102",
    tenantId: "T-011",
    entity: "Results",
    source: "VETtrak (unit outcomes)",
    date: "2026-06-18",
    perLearner: 10,
    status: "Partial",
    note: "Superseded units mapped to current codes",
  },
  {
    id: "MIG-1103",
    tenantId: "T-011",
    entity: "Fee balances",
    source: "aXcelerate invoices",
    date: "2026-06-19",
    perLearner: 1,
    status: "Completed",
  },
  {
    id: "MIG-1104",
    tenantId: "T-011",
    entity: "Documents",
    source: "AVETMISS NAT files + USI checks",
    date: "2026-06-22",
    status: "Completed",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Whole years between an ISO date of birth and an ISO "today" (string maths, no TZ drift). */
export function ageAt(dob: string, today: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

/** ISO date plus n days. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Users & Roles ───────────────────────────────────────────────────────── */

/** Staff platform roles an institute admin can assign, by segment. */
export const STAFF_ROLES: Record<"school" | "university" | "college", string[]> = {
  school: [
    "Institute admin",
    "Senior leader",
    "Coordinator",
    "Teacher",
    "Office / admissions",
    "Finance officer",
    "Read-only",
  ],
  university: [
    "Institute admin",
    "Head of school",
    "Lecturer",
    "Registry officer",
    "Admissions officer",
    "Finance officer",
    "Read-only",
  ],
  college: [
    "Institute admin",
    "Trainer & assessor",
    "Lecturer",
    "Compliance officer",
    "Student services",
    "Finance officer",
    "Read-only",
  ],
};

/** Default platform role from a staff job title. */
export function defaultStaffRole(
  title: string,
  segment: "school" | "university" | "college",
): string {
  const t = title.toLowerCase();
  if (/principal|head of school|registrar/.test(t))
    return segment === "university" && /head of school/.test(t)
      ? "Head of school"
      : "Institute admin";
  if (/coordinator|lead/.test(t)) return segment === "school" ? "Coordinator" : "Lecturer";
  if (/trainer|assessor/.test(t)) return "Trainer & assessor";
  if (/lecturer/.test(t)) return "Lecturer";
  return "Teacher";
}
