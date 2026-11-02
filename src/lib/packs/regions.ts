/**
 * Region profiles — everything that changes with the COUNTRY a tenant operates
 * in. A tenant picks a region; the region supplies DEFAULTS (currency, tax,
 * calendar templates, attendance code set, official-id fields, staff-vetting
 * checks, statutory returns, grading scheme). The tenant can then override
 * calendars, code set and id fields in Institution Profile. Nothing is
 * hard-coded per country anywhere else in the app — pages read from here.
 *
 * Regulatory detail here is DEMO-GRADE: it is grounded in domain research but
 * every row must be confirmed against a cited source in that country's
 * compliance pack before it becomes a production requirement.
 */
import { convert, getDisplayCurrency } from "../displayCurrency";

export type RegionCode = "UK" | "LK" | "AU" | "AE" | "SA" | "QA" | "IN" | "SG" | "MY" | "GLOBAL";

export type InstitutionType = "tuition" | "school" | "university" | "college" | "club";

export const INSTITUTION_TYPE_LABEL: Record<InstitutionType, string> = {
  tuition: "Tuition / coaching centre",
  school: "School",
  university: "University",
  college: "College (FE / vocational)",
  club: "Sports / activity club",
};

/* ── Attendance code sets ─────────────────────────────────────────────────── */

export type AttendanceMeaning =
  | "present"
  | "late"
  | "aea" // approved educational activity (counts as present)
  | "authorised"
  | "unauthorised"
  | "not-required"
  | "admin";

export interface AttendanceCode {
  code: string;
  label: string;
  meaning: AttendanceMeaning;
}

export interface AttendanceCodeSet {
  id: string;
  name: string;
  description: string;
  codes: AttendanceCode[];
}

export const ATTENDANCE_CODE_SETS: AttendanceCodeSet[] = [
  {
    id: "simple",
    name: "Simple (Present / Late / Absent / Excused)",
    description: "Default for tuition centres and clubs. Equivalent to the classic register.",
    codes: [
      { code: "P", label: "Present", meaning: "present" },
      { code: "L", label: "Late", meaning: "late" },
      { code: "E", label: "Excused absence", meaning: "authorised" },
      { code: "A", label: "Absent", meaning: "unauthorised" },
    ],
  },
  {
    id: "dfe-2024",
    name: "England — DfE national attendance codes (Aug 2024)",
    description:
      "Statutory codes for schools in England (state and independent). AM/PM sessions. Confirm against DfE 'Working together to improve school attendance'.",
    codes: [
      { code: "/", label: "Present (AM)", meaning: "present" },
      { code: "\\", label: "Present (PM)", meaning: "present" },
      { code: "L", label: "Late, before register closed", meaning: "late" },
      { code: "K", label: "Education off-site arranged by LA", meaning: "aea" },
      { code: "V", label: "Educational visit or trip", meaning: "aea" },
      { code: "P", label: "Approved sporting activity", meaning: "aea" },
      { code: "W", label: "Work experience", meaning: "aea" },
      { code: "B", label: "Other approved off-site education", meaning: "aea" },
      { code: "D", label: "Dual registered", meaning: "aea" },
      {
        code: "C1",
        label: "Leave — regulated performance / employment abroad",
        meaning: "authorised",
      },
      { code: "M", label: "Leave — medical / dental appointment", meaning: "authorised" },
      { code: "J1", label: "Leave — interview", meaning: "authorised" },
      { code: "S", label: "Leave — study leave", meaning: "authorised" },
      { code: "X", label: "Not required to attend (non-compulsory age)", meaning: "not-required" },
      { code: "C2", label: "Leave — part-time timetable", meaning: "authorised" },
      { code: "C", label: "Leave — exceptional circumstances", meaning: "authorised" },
      { code: "T", label: "Parent travelling for occupation", meaning: "authorised" },
      { code: "R", label: "Religious observance", meaning: "authorised" },
      { code: "I", label: "Illness", meaning: "authorised" },
      { code: "E", label: "Suspended or excluded", meaning: "authorised" },
      {
        code: "Q",
        label: "Unable to attend — lack of access arrangements",
        meaning: "not-required",
      },
      { code: "Y1", label: "Unable to attend — transport not available", meaning: "not-required" },
      {
        code: "Y2",
        label: "Unable to attend — widespread disruption to travel",
        meaning: "not-required",
      },
      { code: "Y3", label: "Unable to attend — part of premises closed", meaning: "not-required" },
      {
        code: "Y4",
        label: "Unable to attend — whole school closed unexpectedly",
        meaning: "not-required",
      },
      {
        code: "Y5",
        label: "Unable to attend — criminal justice detention",
        meaning: "not-required",
      },
      {
        code: "Y6",
        label: "Unable to attend — public health guidance / law",
        meaning: "not-required",
      },
      { code: "Y7", label: "Unable to attend — other unavoidable cause", meaning: "not-required" },
      { code: "G", label: "Holiday not granted", meaning: "unauthorised" },
      { code: "N", label: "Reason not yet provided", meaning: "unauthorised" },
      { code: "O", label: "Absent in other / unknown circumstances", meaning: "unauthorised" },
      { code: "U", label: "Arrived after register closed", meaning: "unauthorised" },
      { code: "Z", label: "Prospective pupil not on roll", meaning: "admin" },
      { code: "#", label: "Planned whole-school closure", meaning: "admin" },
    ],
  },
  {
    id: "intl-school",
    name: "International school (authorised / unauthorised)",
    description:
      "Common set for GCC, South & South-East Asian international schools. Tenants may rename codes.",
    codes: [
      { code: "P", label: "Present", meaning: "present" },
      { code: "L", label: "Late", meaning: "late" },
      { code: "SA", label: "School activity / trip", meaning: "aea" },
      { code: "M", label: "Medical (certificate provided)", meaning: "authorised" },
      { code: "AA", label: "Authorised absence", meaning: "authorised" },
      { code: "R", label: "Religious observance", meaning: "authorised" },
      { code: "UA", label: "Unauthorised absence", meaning: "unauthorised" },
      { code: "N", label: "No reason yet", meaning: "unauthorised" },
    ],
  },
  {
    id: "he-engagement",
    name: "Higher education — engagement points",
    description:
      "Contact-point based engagement monitoring. Feeds visa-sponsor monitoring (UK Student route / AU ESOS).",
    codes: [
      { code: "A", label: "Attended", meaning: "present" },
      { code: "L", label: "Late", meaning: "late" },
      { code: "O", label: "Attended online", meaning: "present" },
      { code: "EC", label: "Absent — approved EC / leave", meaning: "authorised" },
      { code: "AA", label: "Authorised absence", meaning: "authorised" },
      { code: "X", label: "Absent — no contact", meaning: "unauthorised" },
    ],
  },
  {
    id: "vet-au",
    name: "VET / college — scheduled contact hours",
    description:
      "Contact-hours attendance for VET and ELICOS (80% threshold for overseas students).",
    codes: [
      { code: "P", label: "Present (full session)", meaning: "present" },
      { code: "PP", label: "Partial attendance", meaning: "late" },
      { code: "WP", label: "On work placement", meaning: "aea" },
      { code: "MC", label: "Medical certificate", meaning: "authorised" },
      { code: "A", label: "Absent", meaning: "unauthorised" },
    ],
  },
];

export const codeSetById = (id: string) =>
  ATTENDANCE_CODE_SETS.find((s) => s.id === id) ?? ATTENDANCE_CODE_SETS[0];

/** Present-equivalent for attendance %: present, late and approved activity. */
export function countsAsPresent(m: AttendanceMeaning) {
  return m === "present" || m === "late" || m === "aea";
}

/* ── Official identifier fields ──────────────────────────────────────────── */

export interface IdFieldDef {
  key: string;
  label: string;
  hint: string;
  /** Segments where the field applies. Empty = all. */
  segments?: InstitutionType[];
  sensitive?: boolean;
}

export const ID_FIELDS: Record<string, IdFieldDef> = {
  passport: { key: "passport", label: "Passport no.", hint: "With expiry date", sensitive: true },
  upn: {
    key: "upn",
    label: "UPN",
    hint: "Unique Pupil Number (England schools)",
    segments: ["school"],
  },
  uln: {
    key: "uln",
    label: "ULN",
    hint: "Unique Learner Number (LRS) — FE, apprenticeships, HE",
    segments: ["college", "university", "school"],
  },
  ucas: {
    key: "ucas",
    label: "UCAS Personal ID",
    hint: "10-digit applicant id",
    segments: ["university"],
  },
  husid: {
    key: "husid",
    label: "HESA SID / HUSID",
    hint: "17-char SID (entry year + UKPRN + ref + check); continuing students keep 13-digit HUSID",
    segments: ["university"],
  },
  cas: {
    key: "cas",
    label: "CAS number",
    hint: "Confirmation of Acceptance for Studies (Student route)",
    segments: ["university", "college"],
  },
  nic: {
    key: "nic",
    label: "NIC",
    hint: "12 digits since 2016 (old: 9 digits + V/X); issued at 16+",
    sensitive: true,
  },
  birthCert: {
    key: "birthCert",
    label: "Birth certificate no.",
    hint: "Minors without NIC",
    segments: ["school"],
  },
  examIndex: {
    key: "examIndex",
    label: "Exam index no.",
    hint: "Dept. of Examinations O/L / A/L index",
    segments: ["school"],
  },
  usi: {
    key: "usi",
    label: "USI",
    hint: "10 characters; no AQF certificate without a verified USI",
    segments: ["college", "university"],
  },
  chessn: {
    key: "chessn",
    label: "CHESSN (legacy)",
    hint: "Being phased out but still issued by TCSI — store read-only",
    segments: ["university", "college"],
  },
  coe: {
    key: "coe",
    label: "CoE / CRICOS",
    hint: "CoE + CRICOS codes (provider code = 5 digits + letter)",
    segments: ["university", "college", "school"],
  },
  emiratesId: {
    key: "emiratesId",
    label: "Emirates ID",
    hint: "784-YYYY-NNNNNNN-C — never derive date of birth from it",
    sensitive: true,
  },
  regulatorNo: {
    key: "regulatorNo",
    label: "Regulator student no.",
    hint: "KHDA / ADEK eSIS / SPEA / MoE student number (by emirate)",
    segments: ["school"],
  },
  iqama: {
    key: "iqama",
    label: "National ID / Iqama",
    hint: "10 digits: starts 1 = Saudi national, 2 = Iqama; check digit",
    sensitive: true,
  },
  noor: { key: "noor", label: "Noor ID", hint: "MoE Noor student number", segments: ["school"] },
  qid: { key: "qid", label: "QID", hint: "Qatar ID — 11 digits", sensitive: true },
  apaar: {
    key: "apaar",
    label: "APAAR ID",
    hint: "12 digits, created with parental consent; status ID / REFUSED / NOGEN; CBSE schools abroad exempt",
  },
  aadhaar: {
    key: "aadhaar",
    label: "Aadhaar (optional)",
    hint: "Voluntary — store masked",
    sensitive: true,
  },
  nric: {
    key: "nric",
    label: "NRIC / FIN",
    hint: "Singapore id — store partially masked",
    sensitive: true,
  },
  mykad: { key: "mykad", label: "MyKad / MyKid", hint: "YYMMDD-PB-###G", sensitive: true },
  nationalId: {
    key: "nationalId",
    label: "National ID",
    hint: "Generic national identifier",
    sensitive: true,
  },
};

/* ── Staff vetting checks ────────────────────────────────────────────────── */

export interface VettingCheckDef {
  key: string;
  label: string;
  /** Months until re-check is due (undefined = one-off). */
  renewMonths?: number;
}

/* ── Statutory / regulator returns ───────────────────────────────────────── */

export interface RegulatorReturnDef {
  key: string;
  name: string;
  regulator: string;
  segments: InstitutionType[];
  frequency: string;
  /** Next due date in the demo year (ISO). */
  nextDue: string;
  description: string;
  /** Column headings of the export file (demo preview). */
  fields: string[];
  /** Only for these sub-jurisdictions (emirate / state / nation). Absent = all. */
  subRegions?: string[];
}

/* ── Grading / classification ────────────────────────────────────────────── */

export interface ClassBand {
  min: number; // inclusive lower bound on the 0–100 weighted average
  label: string;
}

export interface RegionProfile {
  code: RegionCode;
  name: string;
  flag: string;
  currency: string;
  tax: { name: string; rate: number; note: string };
  dataProtection: string;
  paymentGateways: string[];
  /** Default attendance code set per institution type. */
  codeSet: Partial<Record<InstitutionType, string>>;
  /** Default official-id field keys (filtered by segment at use). */
  idFields: string[];
  vettingChecks: VettingCheckDef[];
  returns: RegulatorReturnDef[];
  examBoards: string[];
  /** Degree classification bands (UG). */
  degreeBands: ClassBand[];
  creditScheme: string;
  /** Visa / sponsor monitoring — summary text for people. */
  visaMonitoring?: { body: string; rule: string };
  /** Visa / sponsor monitoring — the rules the registers engine applies, by learner scope. */
  visaRules?: VisaRule[];
  /** Sub-jurisdictions whose regulator differs (emirate, state, UK nation). */
  subRegions?: { code: string; name: string; regulator: string }[];
  /** Calendar templates (month numbers 1–12) per segment. */
  calendarTemplate: Partial<
    Record<InstitutionType, { startMonth: number; periods: string[]; note: string }>
  >;
}

/* ── Visa / sponsor monitoring rules ──────────────────────────────────────────
 * The rule depends on WHO the learner is, not just the country: UKVI treats
 * degree-level university students (engagement policy) differently from
 * below-degree and school students (contact points); ESOS attendance duties
 * cover VET / ELICOS / schools but not HE award courses (progress only). */

export type VisaScope = "he-degree" | "below-degree" | "school";

export interface VisaRule {
  id: string;
  body: string;
  scope: VisaScope[];
  kind: "engagement-days" | "consecutive-missed" | "monthly-pct" | "period-pct" | "progress-only";
  label: string;
  missedPoints?: number;
  thresholdPct?: number;
  /** Below this % in a month → review (UKVI below-degree). */
  reviewPct?: number;
  /** engagement-days: statutory limit before sponsorship must be withdrawn. */
  withdrawDays?: number;
  /** engagement-days: tenant policy — contact the student after this many days. */
  interveneDays?: number;
  /** monthly-pct: also report after N consecutive days absent (SG). */
  consecutiveDays?: number;
  reportVia: string;
  reportWithin: string;
  effectiveFrom: string;
}

/** Pick the rule for a learner scope. */
export function visaRuleFor(region: RegionProfile, scope: VisaScope): VisaRule | undefined {
  return region.visaRules?.find((r) => r.scope.includes(scope));
}

const UK_BANDS: ClassBand[] = [
  { min: 70, label: "First Class Honours" },
  { min: 60, label: "Upper Second (2:1)" },
  { min: 50, label: "Lower Second (2:2)" },
  { min: 40, label: "Third Class Honours" },
  { min: 0, label: "Fail / ordinary degree" },
];

const GPA_BANDS: ClassBand[] = [
  { min: 85, label: "First Class (GPA ≥ 3.70)" },
  { min: 75, label: "Second Class Upper (GPA ≥ 3.30)" },
  { min: 65, label: "Second Class Lower (GPA ≥ 3.00)" },
  { min: 50, label: "Pass (GPA ≥ 2.00)" },
  { min: 0, label: "Fail" },
];

const AU_BANDS: ClassBand[] = [
  { min: 85, label: "High Distinction (GPA 7)" },
  { min: 75, label: "Distinction (GPA 6)" },
  { min: 65, label: "Credit (GPA 5)" },
  { min: 50, label: "Pass (GPA 4)" },
  { min: 0, label: "Fail" },
];

export const REGIONS: Record<RegionCode, RegionProfile> = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    tax: {
      name: "VAT",
      rate: 0.2,
      note: "Education by eligible bodies exempt; private school fees standard-rated from Jan 2025",
    },
    dataProtection:
      "UK GDPR + DPA 2018, as amended by the Data (Use and Access) Act 2025 (core in force 5 Feb 2026); regulator: Information Commission (from 30 Sep 2026)",
    paymentGateways: ["Stripe", "GoCardless (Direct Debit)", "Flywire (international)"],
    codeSet: {
      school: "dfe-2024",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["upn", "uln", "ucas", "husid", "cas", "passport"],
    vettingChecks: [
      { key: "identity", label: "Identity verified" },
      { key: "barred", label: "Standalone children's barred list check" },
      { key: "dbs", label: "Enhanced DBS (with barred list)", renewMonths: 36 },
      { key: "prohibition", label: "Prohibition from teaching check" },
      { key: "s128", label: "Section 128 check (management)" },
      { key: "rtw", label: "Right to work in the UK" },
      { key: "quals", label: "Qualifications verified" },
      { key: "overseas", label: "Overseas criminal record check" },
      { key: "refs", label: "References (2) received" },
    ],
    returns: [
      {
        key: "school-census",
        name: "School Census",
        regulator: "Department for Education",
        segments: ["school"],
        frequency: "Termly (Oct, Jan, May) — state-funded schools",
        nextDue: "2027-01-21",
        description:
          "Pupil-level census: UPN, attendance codes, SEN, FSM, exclusions. Daily attendance data to DfE is mandatory for state-funded schools only.",
        fields: [
          "UPN",
          "Surname",
          "Forename",
          "DOB",
          "NCYearActual",
          "SENprovision",
          "SessionsPossible",
          "SessionsAuthorised",
          "SessionsUnauthorised",
        ],
      },
      {
        key: "slasc",
        name: "Independent Schools Census (SLASC)",
        regulator: "Department for Education",
        segments: ["school"],
        frequency: "Annual — census day 3rd Thursday of January, due ~1 month later (COLLECT)",
        nextDue: "2027-02-21",
        description: "Aggregate return for independent schools (census day 21 Jan 2027).",
        fields: ["NCYearActual", "Male", "Female", "Boarders", "SENprovision", "EHCP"],
      },
      {
        key: "la-new-pupil",
        name: "LA new-pupil / deletion notifications",
        regulator: "Local authority",
        segments: ["school"],
        frequency: "Event-driven — within 5 days of admission; on deletion",
        nextDue: "2026-11-09",
        description: "Notify the local authority of every admission and every removal from roll.",
        fields: ["UPN", "Surname", "Forename", "DOB", "Address", "EventType", "EventDate"],
      },
      {
        key: "swf-census",
        name: "School Workforce Census",
        regulator: "Department for Education",
        segments: ["school"],
        frequency: "Annual (Nov)",
        nextDue: "2026-11-05",
        description: "Staff contracts, absence and curriculum taught.",
        fields: ["TeacherNumber", "Role", "ContractType", "FTE", "QTS", "DaysAbsent"],
      },
      {
        key: "ilr",
        name: "Individualised Learner Record (ILR)",
        regulator: "DfE (apprenticeships & adult skills: DWP / Skills England from Sep 2025)",
        segments: ["college"],
        frequency: "Monthly collection periods R01 (4 Sep 2026) – R14 (21 Oct 2027), 6pm cut-off",
        nextDue: "2026-12-04",
        description: "Learner, aim and funding data for FE and apprenticeships.",
        fields: [
          "ULN",
          "LearnRefNumber",
          "LearnAimRef",
          "FundModel",
          "LearnStartDate",
          "LearnPlanEndDate",
          "CompStatus",
          "Outcome",
        ],
      },
      {
        key: "hesa-df",
        name: "HESA Data Futures",
        regulator: "HESA (Jisc) / OfS",
        segments: ["university"],
        subRegions: ["ENG", "WAL", "NIR"],
        frequency: "Annual (first full in-year collection: Winter 2028)",
        nextDue: "2026-12-15",
        description: "Student, engagement, course and qualification-awarded data.",
        fields: [
          "SID",
          "OWNSTU",
          "COURSEID",
          "ENGSTARTDATE",
          "STULOAD",
          "MODE",
          "QUALAWARDED",
          "CLASSIFICATION",
        ],
      },
      {
        key: "ukvi",
        name: "UKVI sponsor reporting (SMS)",
        regulator: "UK Visas & Immigration",
        segments: ["university", "college", "school"],
        frequency: "Event-driven — within 10 working days (SMS)",
        nextDue: "2026-11-13",
        description:
          "Report non-enrolment, withdrawal, deferral > 60 days and students who stop engaging (Student Sponsor Guidance Doc 2, Oct 2026).",
        fields: ["CAS", "Passport", "EventType", "EventDate", "LastEngagement"],
      },
    ],
    examBoards: ["AQA", "Pearson Edexcel", "OCR", "WJEC / Eduqas", "Cambridge International", "IB"],
    degreeBands: UK_BANDS,
    creditScheme: "UK CATS (120 credits / year)",
    visaMonitoring: {
      body: "UKVI Student route (Doc 2, Oct 2026)",
      rule: "Degree level: academic engagement policy — intervene within 60 days of non-engagement and withdraw sponsorship if not re-engaged 60 days after contact. Below degree / FE / schools: 10 consecutive missed contact points. Report via SMS within 10 working days.",
    },
    visaRules: [
      {
        id: "ukvi-he",
        body: "UKVI",
        scope: ["he-degree"],
        kind: "engagement-days",
        label: "Academic engagement policy — 60 days",
        withdrawDays: 60,
        interveneDays: 14,
        reportVia: "SMS (Sponsor Management System)",
        reportWithin: "10 working days",
        effectiveFrom: "2026-10-08",
      },
      {
        id: "ukvi-below-degree",
        body: "UKVI",
        scope: ["below-degree", "school"],
        kind: "consecutive-missed",
        label: "10 consecutive missed contact points",
        missedPoints: 10,
        reportVia: "SMS (Sponsor Management System)",
        reportWithin: "10 working days",
        effectiveFrom: "2026-10-08",
      },
    ],
    subRegions: [
      { code: "ENG", name: "England", regulator: "DfE / OfS" },
      { code: "WAL", name: "Wales", regulator: "Welsh Government / Medr" },
      { code: "SCT", name: "Scotland", regulator: "Scottish Government / SFC" },
      { code: "NIR", name: "Northern Ireland", regulator: "DE / DfE NI" },
    ],
    calendarTemplate: {
      school: {
        startMonth: 9,
        periods: ["Autumn term", "Spring term", "Summer term"],
        note: "September–July, three terms with half-terms",
      },
      university: {
        startMonth: 9,
        periods: ["Semester 1", "Semester 2", "Resit period"],
        note: "September intake; many also run January intake",
      },
      college: {
        startMonth: 9,
        periods: ["Term 1", "Term 2", "Term 3"],
        note: "Academic year Aug–Jul for ILR",
      },
      tuition: {
        startMonth: 9,
        periods: ["Autumn", "Spring", "Summer"],
        note: "Follows school year",
      },
      club: {
        startMonth: 9,
        periods: ["Autumn block", "Spring block", "Summer block"],
        note: "Seasonal blocks",
      },
    },
  },
  LK: {
    code: "LK",
    name: "Sri Lanka",
    flag: "🇱🇰",
    currency: "LKR",
    tax: {
      name: "VAT",
      rate: 0.18,
      note: "Educational services largely exempt — confirm per service",
    },
    dataProtection:
      "Personal Data Protection Act No. 9 of 2022 — Parts I & III in force 1 Jan 2027; Part II (data-subject rights) date not yet set",
    paymentGateways: ["PayHere", "LankaPay / JustPay", "Bank transfer (slip upload)"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "vet-au",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["nic", "birthCert", "examIndex", "passport"],
    vettingChecks: [
      { key: "identity", label: "NIC verified" },
      {
        key: "police",
        label: "Police clearance report (recommended — not mandated for private schools)",
        renewMonths: 24,
      },
      { key: "gn", label: "Grama Niladhari character certificate" },
      { key: "quals", label: "Qualifications verified" },
      { key: "refs", label: "References received" },
    ],
    returns: [
      {
        key: "moe-census",
        name: "Annual School Census (government & assisted schools)",
        regulator: "Ministry of Education",
        segments: ["school"],
        subRegions: ["GOV"],
        frequency: "Annual",
        nextDue: "2027-03-31",
        description:
          "Government schools only — MoE has no legal authority over international schools (registered as companies), which have no government return.",
        fields: ["SchoolCensusNo", "Grade", "Medium", "Male", "Female", "Teachers"],
      },
      {
        key: "doe-entries",
        name: "G.C.E. O/L & A/L entries",
        regulator: "Department of Examinations",
        segments: ["school"],
        frequency: "Per exam series",
        nextDue: "2027-01-15",
        description:
          "International-school students sit O/L and A/L as private (external) candidates.",
        fields: ["NIC/BirthCert", "Name", "Medium", "Subjects", "IndexNo"],
      },
      {
        key: "ugc",
        name: "UGC statistics return",
        regulator: "University Grants Commission",
        segments: ["university"],
        frequency: "Annual",
        nextDue: "2027-02-28",
        description: "Enrolment, intake and graduate output by programme.",
        fields: ["ProgrammeCode", "Intake", "Enrolled", "Graduated", "Gender"],
      },
      {
        key: "tvec",
        name: "TVEC course & learner return",
        regulator: "Tertiary & Vocational Education Commission",
        segments: ["college"],
        frequency: "Annual",
        nextDue: "2027-01-31",
        description: "Registered course delivery and NVQ outcomes.",
        fields: ["CourseRegNo", "NVQLevel", "Enrolled", "Completed", "Certified"],
      },
    ],
    examBoards: [
      "Department of Examinations (O/L, A/L)",
      "Cambridge International",
      "Pearson Edexcel",
      "IB",
    ],
    degreeBands: GPA_BANDS,
    creditScheme: "SLQF credits (30 / year)",
    calendarTemplate: {
      school: {
        startMonth: 1,
        periods: ["Term 1", "Term 2", "Term 3"],
        note: "Government schools Jan–Dec; international schools late Aug – late Jun/early Jul",
      },
      university: {
        startMonth: 3,
        periods: ["Semester 1", "Semester 2"],
        note: "Intake dates vary by UGC cycle",
      },
      college: { startMonth: 1, periods: ["Intake 1", "Intake 2"], note: "Rolling intakes" },
      tuition: {
        startMonth: 1,
        periods: ["Term 1", "Term 2", "Term 3"],
        note: "Follows school year",
      },
      club: { startMonth: 1, periods: ["Season 1", "Season 2"], note: "Seasonal" },
    },
  },
  AU: {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    tax: { name: "GST", rate: 0.1, note: "Most education courses GST-free" },
    dataProtection:
      "Privacy Act 1988 + 2024 amendments (statutory privacy tort from 10 Jun 2025); Children's Online Privacy Code due by 10 Dec 2026",
    paymentGateways: ["Stripe", "BPAY", "Flywire"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "vet-au",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["usi", "chessn", "coe", "passport"],
    vettingChecks: [
      { key: "identity", label: "Identity (100-point check)" },
      {
        key: "wwcc",
        label: "Working With Children Check (state — NSW/VIC/SA/ACT 5y, QLD 3y, NT 2y)",
        renewMonths: 60,
      },
      { key: "police", label: "National police check", renewMonths: 36 },
      { key: "vrqa", label: "Teacher registration (state)" },
      { key: "quals", label: "Qualifications / TAE verified" },
    ],
    returns: [
      {
        key: "avetmiss",
        name: "AVETMISS",
        regulator: "NCVER / ASQA",
        segments: ["college"],
        frequency: "Quarterly (AVETMISS Release 8.0); fee-for-service window 1–17 Aug",
        nextDue: "2027-02-28",
        description: "Total VET activity: clients, enrolments, outcomes.",
        fields: [
          "ClientID",
          "USI",
          "CourseID",
          "SubjectID",
          "ActivityStartDate",
          "OutcomeID",
          "FundingSource",
        ],
      },
      {
        key: "tcsi",
        name: "TCSI",
        regulator: "Department of Education",
        segments: ["university", "college"],
        frequency: "Event-based, continuous — corrections within 7 days",
        nextDue: "2026-11-30",
        description: "HE student, course, HELP loan and unit enrolment data.",
        fields: [
          "CHESSN",
          "USI",
          "CourseCode",
          "UnitOfStudyCode",
          "CensusDate",
          "EFTSL",
          "HELPLoan",
        ],
      },
      {
        key: "prisms",
        name: "PRISMS (ESOS)",
        regulator: "Department of Education",
        segments: ["university", "college", "school"],
        frequency:
          "Event-driven — non-commencement / termination within 14 days (<18) or 31 days (18+)",
        nextDue: "2026-11-16",
        description:
          "Overseas students: CoEs, course changes, unsatisfactory attendance (VET / ELICOS / schools) or course progress (HE).",
        fields: ["CoE", "CRICOS", "Passport", "EventType", "AttendancePct"],
      },
      {
        key: "schools-census",
        name: "Non-government Schools Census",
        regulator: "Department of Education",
        segments: ["school"],
        frequency: "Annual — census day early August (7 Aug 2026)",
        nextDue: "2027-08-06",
        description: "Enrolments for recurrent funding.",
        fields: ["StudentID", "YearLevel", "Indigenous", "Disability", "FTE"],
      },
    ],
    examBoards: ["NESA (HSC)", "VCAA (VCE)", "QCAA", "IB"],
    degreeBands: AU_BANDS,
    creditScheme: "Credit points (AQF levels)",
    visaMonitoring: {
      body: "ESOS / National Code 2018 (Standard 8)",
      rule: "VET, ELICOS and schools: ≥80% of scheduled contact hours per study period (Notice of Intention to Report → 20 working days → PRISMS). HE award courses: course progress only, no attendance duty.",
    },
    visaRules: [
      {
        id: "esos-attendance",
        body: "ESOS",
        scope: ["below-degree", "school"],
        kind: "period-pct",
        label: "≥ 80% contact hours per study period",
        thresholdPct: 80,
        reportVia: "PRISMS (after Notice of Intention to Report + 20 working days)",
        reportWithin: "After the appeal window",
        effectiveFrom: "2018-01-01",
      },
      {
        id: "esos-he-progress",
        body: "ESOS",
        scope: ["he-degree"],
        kind: "progress-only",
        label: "Course progress only — no attendance duty for HE award courses",
        reportVia: "PRISMS (unsatisfactory course progress)",
        reportWithin: "After intervention strategy",
        effectiveFrom: "2018-01-01",
      },
    ],
    subRegions: [
      { code: "NSW", name: "New South Wales", regulator: "NESA" },
      { code: "VIC", name: "Victoria", regulator: "VRQA" },
      { code: "QLD", name: "Queensland", regulator: "NSSAB / QCAA" },
      { code: "WA", name: "Western Australia", regulator: "Department of Education WA" },
      { code: "SA", name: "South Australia", regulator: "ESB" },
    ],
    calendarTemplate: {
      school: {
        startMonth: 1,
        periods: ["Term 1", "Term 2", "Term 3", "Term 4"],
        note: "Late January–December, four terms",
      },
      university: {
        startMonth: 2,
        periods: ["Semester 1", "Semester 2", "Summer session"],
        note: "Feb and July intakes",
      },
      college: {
        startMonth: 2,
        periods: ["Term 1", "Term 2", "Term 3", "Term 4"],
        note: "TAFE / RTO terms",
      },
      tuition: {
        startMonth: 1,
        periods: ["Term 1", "Term 2", "Term 3", "Term 4"],
        note: "Follows school year",
      },
      club: { startMonth: 1, periods: ["Summer", "Winter"], note: "Seasonal" },
    },
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    currency: "AED",
    tax: {
      name: "VAT",
      rate: 0.05,
      note: "Core education zero-rated; uniforms, transport extras may be standard",
    },
    dataProtection:
      "Federal Decree-Law 45/2021 (PDPL) — executive regulations reportedly still pending; DIFC / ADGM have their own regimes",
    paymentGateways: ["Network International", "Telr", "Bank transfer"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["emiratesId", "regulatorNo", "passport"],
    vettingChecks: [
      { key: "identity", label: "Emirates ID / passport verified" },
      { key: "goodConduct", label: "Good conduct certificate", renewMonths: 12 },
      { key: "permit", label: "Work permit / visa (MoHRE)" },
      {
        key: "approval",
        label: "Regulator approval (KHDA Appointment Notice per school / ADEK PASS / SPEA / MoE)",
      },
      { key: "licence", label: "UAE teacher licence" },
      { key: "attest", label: "Attested degree certificate" },
    ],
    returns: [
      {
        key: "khda",
        name: "KHDA student & staff data",
        regulator: "KHDA (Dubai)",
        segments: ["school", "university"],
        subRegions: ["DXB"],
        frequency: "Termly + on change",
        nextDue: "2026-12-10",
        description: "Enrolment, nationality, SEND, staff approvals for Dubai private schools.",
        fields: ["KHDAStudentNo", "EmiratesID", "Grade", "Curriculum", "Nationality", "SEND"],
      },
      {
        key: "adek",
        name: "ADEK eSIS sync",
        regulator: "ADEK (Abu Dhabi)",
        segments: ["school"],
        subRegions: ["AUH"],
        frequency: "Daily — attendance follow-up within 2 hours (vendor-certified eSIS)",
        nextDue: "2026-11-03",
        description:
          "Abu Dhabi private schools: mandatory eSIS — daily attendance (13 authorised-absence reasons, no codes), registration needs Emirates ID + attested transfer certificate.",
        fields: ["eSISNo", "EmiratesID", "Grade", "AttendanceCode", "AssessmentResult"],
      },
      {
        key: "moe",
        name: "MoE student information",
        regulator: "Ministry of Education",
        segments: ["school", "university", "college"],
        subRegions: ["NE"],
        frequency: "Per term",
        nextDue: "2027-01-15",
        description: "Ajman, Umm Al Quwain, RAK and Fujairah private schools; HE via MoHESR HEDB.",
        fields: ["MoEStudentNo", "EmiratesID", "Grade", "Result"],
      },
      {
        key: "spea",
        name: "SPEA student data",
        regulator: "SPEA (Sharjah Private Education Authority)",
        segments: ["school"],
        subRegions: ["SHJ"],
        frequency: "Per term",
        nextDue: "2027-01-20",
        description: "Sharjah private schools (Decree 18/2020).",
        fields: ["SPEAStudentNo", "EmiratesID", "Grade", "Curriculum", "Attendance"],
      },
      {
        key: "hedb",
        name: "MoHESR HEDB",
        regulator: "Ministry of Higher Education & Scientific Research",
        segments: ["university"],
        frequency: "Real-time integration (from Jan 2026)",
        nextDue: "2026-12-01",
        description: "Mandatory for CAA-accredited universities.",
        fields: ["StudentID", "EmiratesID", "Programme", "Status", "CGPA"],
      },
    ],
    subRegions: [
      { code: "DXB", name: "Dubai", regulator: "KHDA" },
      { code: "AUH", name: "Abu Dhabi", regulator: "ADEK" },
      { code: "SHJ", name: "Sharjah", regulator: "SPEA" },
      { code: "NE", name: "Northern Emirates", regulator: "Ministry of Education" },
    ],
    examBoards: ["Cambridge International", "Pearson Edexcel", "IB", "CBSE", "MoE"],
    degreeBands: GPA_BANDS,
    creditScheme: "US-style credit hours (CAA)",
    calendarTemplate: {
      school: {
        startMonth: 8,
        periods: ["Term 1", "Term 2", "Term 3"],
        note: "Unified calendar 31 Aug 2026 – 2 Jul 2027; Indian-curriculum schools April–March",
      },
      university: {
        startMonth: 9,
        periods: ["Fall", "Spring", "Summer"],
        note: "Fall/Spring semesters",
      },
      college: { startMonth: 9, periods: ["Fall", "Spring"], note: "" },
      tuition: { startMonth: 9, periods: ["Term 1", "Term 2", "Term 3"], note: "" },
      club: { startMonth: 9, periods: ["Season"], note: "" },
    },
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    currency: "SAR",
    tax: { name: "VAT", rate: 0.15, note: "Private education for citizens may be state-borne" },
    dataProtection: "Personal Data Protection Law (SDAIA)",
    paymentGateways: ["mada", "HyperPay", "SADAD"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["iqama", "noor", "passport"],
    vettingChecks: [
      { key: "identity", label: "National ID / Iqama verified" },
      { key: "police", label: "Police clearance", renewMonths: 12 },
      { key: "license", label: "Teaching licence" },
      { key: "attest", label: "Attested qualifications" },
    ],
    returns: [
      {
        key: "noor",
        name: "Noor system sync",
        regulator: "Ministry of Education",
        segments: ["school"],
        frequency: "Per term",
        nextDue: "2027-01-10",
        description: "Student enrolment, attendance and results.",
        fields: ["NoorID", "NationalID", "Grade", "Attendance", "Result"],
      },
    ],
    examBoards: ["MoE", "Cambridge International", "IB"],
    degreeBands: GPA_BANDS,
    creditScheme: "Credit hours",
    calendarTemplate: {
      school: { startMonth: 8, periods: ["Term 1", "Term 2", "Term 3"], note: "Three-term model" },
      university: { startMonth: 8, periods: ["Semester 1", "Semester 2"], note: "" },
    },
  },
  QA: {
    code: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    currency: "QAR",
    tax: { name: "None", rate: 0, note: "No VAT" },
    dataProtection: "Law No. 13 of 2016 (Personal Data Privacy)",
    paymentGateways: ["QPay", "CyberSource"],
    codeSet: { school: "intl-school", university: "he-engagement", tuition: "simple" },
    idFields: ["qid", "passport"],
    vettingChecks: [
      { key: "identity", label: "QID verified" },
      { key: "police", label: "Good conduct certificate", renewMonths: 12 },
      { key: "license", label: "MoEHE teacher licence" },
    ],
    returns: [
      {
        key: "moehe",
        name: "MoEHE private school data",
        regulator: "Ministry of Education & Higher Education",
        segments: ["school"],
        frequency: "Per term",
        nextDue: "2027-01-15",
        description: "Enrolment and staffing.",
        fields: ["QID", "Grade", "Curriculum", "Nationality"],
      },
    ],
    examBoards: ["Cambridge International", "Pearson Edexcel", "IB"],
    degreeBands: GPA_BANDS,
    creditScheme: "Credit hours",
    calendarTemplate: {
      school: { startMonth: 8, periods: ["Term 1", "Term 2", "Term 3"], note: "" },
    },
  },
  IN: {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    tax: { name: "GST", rate: 0.18, note: "Core school education exempt; coaching taxable" },
    dataProtection: "Digital Personal Data Protection Act 2023",
    paymentGateways: ["Razorpay", "UPI", "PayU"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["apaar", "aadhaar", "passport"],
    vettingChecks: [
      { key: "identity", label: "Identity verified" },
      { key: "police", label: "Police verification", renewMonths: 36 },
      { key: "quals", label: "Qualifications (B.Ed / TET) verified" },
    ],
    returns: [
      {
        key: "udise",
        name: "UDISE+",
        regulator: "Ministry of Education",
        segments: ["school"],
        frequency: "Annual (31 March reference date)",
        nextDue: "2027-03-31",
        description:
          "School, teacher and student-level data incl. PEN (11 digits) and APAAR; covers private unaided schools.",
        fields: ["UDISECode", "StudentPEN", "APAAR", "Class", "Gender", "SocialCategory"],
      },
      {
        key: "aishe",
        name: "AISHE",
        regulator: "Ministry of Education",
        segments: ["university", "college"],
        frequency: "Annual",
        nextDue: "2027-01-31",
        description: "Higher-education enrolment, faculty and outturn.",
        fields: ["AISHECode", "Programme", "Enrolled", "PassedOut", "Faculty"],
      },
    ],
    examBoards: ["CBSE", "CISCE", "State boards", "Cambridge International", "IB"],
    degreeBands: [
      { min: 75, label: "First Class with Distinction (CGPA ≥ 7.5)" },
      { min: 60, label: "First Class" },
      { min: 50, label: "Second Class" },
      { min: 40, label: "Pass" },
      { min: 0, label: "Fail" },
    ],
    creditScheme: "NCrF / CBCS credits",
    calendarTemplate: {
      school: { startMonth: 4, periods: ["Term 1", "Term 2"], note: "April–March (CBSE)" },
      university: {
        startMonth: 7,
        periods: ["Odd semester", "Even semester"],
        note: "July/August start",
      },
    },
  },
  SG: {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    currency: "SGD",
    tax: { name: "GST", rate: 0.09, note: "Private education taxable for GST-registered PEIs" },
    dataProtection: "Personal Data Protection Act 2012 (PDPC)",
    paymentGateways: ["PayNow", "Stripe"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
    },
    idFields: ["nric", "passport"],
    vettingChecks: [
      { key: "identity", label: "NRIC / FIN verified" },
      { key: "declaration", label: "Criminal record declaration" },
      { key: "pass", label: "Work pass" },
      { key: "quals", label: "Teacher qualifications (CPE)" },
    ],
    returns: [
      {
        key: "cpe",
        name: "CPE student & course returns",
        regulator: "Committee for Private Education (SSG)",
        segments: ["college", "university", "school"],
        frequency: "Per intake + annual",
        nextDue: "2027-01-31",
        description: "Student contracts, fee protection, attendance (90% for Student's Pass).",
        fields: ["FIN", "CourseCode", "ContractDate", "FPSRef", "AttendancePct"],
      },
    ],
    examBoards: ["SEAB (GCE O/A)", "Cambridge International", "IB"],
    degreeBands: GPA_BANDS,
    creditScheme: "Modular credits",
    visaMonitoring: {
      body: "ICA Student's Pass",
      rule: "Notify ICA if a Student's Pass holder attends < 90% in any month or is absent 7+ consecutive days. Foreign-system schools must be EduTrust-certified to sponsor.",
    },
    visaRules: [
      {
        id: "ica-stp",
        body: "ICA",
        scope: ["he-degree", "below-degree", "school"],
        kind: "monthly-pct",
        label: "≥ 90% each month; 7 consecutive days absent",
        thresholdPct: 90,
        consecutiveDays: 7,
        reportVia: "ICA notification",
        reportWithin: "Promptly after the month / on the 7th day",
        effectiveFrom: "2020-01-01",
      },
    ],
    calendarTemplate: {
      school: {
        startMonth: 1,
        periods: ["Term 1", "Term 2", "Term 3", "Term 4"],
        note: "January–November",
      },
      university: { startMonth: 8, periods: ["Semester 1", "Semester 2"], note: "August start" },
    },
  },
  MY: {
    code: "MY",
    name: "Malaysia",
    flag: "🇲🇾",
    currency: "MYR",
    tax: {
      name: "SST",
      rate: 0.06,
      note: "Private education service tax rules apply from 2025 — confirm",
    },
    dataProtection: "Personal Data Protection Act 2010 (amended 2024)",
    paymentGateways: ["FPX", "iPay88", "DuitNow"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
    },
    idFields: ["mykad", "passport"],
    vettingChecks: [
      { key: "identity", label: "MyKad verified" },
      { key: "police", label: "PDRM police vetting", renewMonths: 36 },
      { key: "permit", label: "Teaching permit (Permit Mengajar)" },
    ],
    returns: [
      {
        key: "mqa",
        name: "MQA programme returns",
        regulator: "Malaysian Qualifications Agency",
        segments: ["university", "college"],
        frequency: "Annual",
        nextDue: "2027-03-31",
        description: "Accredited programme delivery and outcomes.",
        fields: ["MQARef", "Programme", "Intake", "Enrolled", "Graduated"],
      },
      {
        key: "emgs",
        name: "EMGS international student reporting",
        regulator: "Education Malaysia Global Services",
        segments: ["university", "college"],
        frequency: "Event-driven",
        nextDue: "2026-11-20",
        description: "Student pass attendance & status (80%).",
        fields: ["Passport", "EMGSRef", "Programme", "AttendancePct", "Status"],
      },
    ],
    examBoards: ["Lembaga Peperiksaan (SPM)", "Cambridge International", "IB"],
    degreeBands: GPA_BANDS,
    creditScheme: "MQF credits",
    visaMonitoring: {
      body: "EMGS (HE) / Immigration IMM.14 (schools)",
      rule: "HE student pass renewal needs ≥ 80% attendance and CGPA 2.0 (EMGS). International-school passes are filed with Immigration (IMM.14) plus MOHA approval.",
    },
    visaRules: [
      {
        id: "emgs",
        body: "EMGS",
        scope: ["he-degree", "below-degree"],
        kind: "period-pct",
        label: "≥ 80% attendance (and CGPA 2.0) for pass renewal",
        thresholdPct: 80,
        reportVia: "EMGS",
        reportWithin: "At pass renewal",
        effectiveFrom: "2020-01-01",
      },
    ],
    calendarTemplate: {
      school: {
        startMonth: 1,
        periods: ["Term 1", "Term 2", "Term 3"],
        note: "Calendar transitioning back to January start",
      },
      university: {
        startMonth: 9,
        periods: ["Semester 1", "Semester 2"],
        note: "Multiple intakes",
      },
    },
  },
  GLOBAL: {
    code: "GLOBAL",
    name: "Other / international (generic)",
    flag: "🌐",
    currency: "USD",
    tax: { name: "Tax", rate: 0, note: "Configure per jurisdiction" },
    dataProtection: "Configure applicable law (GDPR-equivalent defaults)",
    paymentGateways: ["Stripe"],
    codeSet: {
      school: "intl-school",
      university: "he-engagement",
      college: "he-engagement",
      tuition: "simple",
      club: "simple",
    },
    idFields: ["nationalId", "passport"],
    vettingChecks: [
      { key: "identity", label: "Identity verified" },
      { key: "police", label: "Criminal record check", renewMonths: 36 },
      { key: "quals", label: "Qualifications verified" },
    ],
    returns: [],
    examBoards: ["Cambridge International", "Pearson Edexcel", "IB"],
    degreeBands: GPA_BANDS,
    creditScheme: "Credits",
    calendarTemplate: {
      school: { startMonth: 9, periods: ["Term 1", "Term 2", "Term 3"], note: "" },
      university: { startMonth: 9, periods: ["Semester 1", "Semester 2"], note: "" },
    },
  },
};

export const REGION_LIST: RegionProfile[] = Object.values(REGIONS);

/* ── Intake templates ────────────────────────────────────────────────────────
 * Typical entry points per region × segment. A tenant creates its REAL intakes
 * (dates, deadline, capacity, programmes) from these, then overrides freely —
 * intakes differ by region, by institution and by programme. */

export interface IntakeTemplate {
  name: string; // "September", "Rolling (VET)"
  month: number; // 1–12 typical start month (rolling: first month)
  kind: "Fixed" | "Rolling";
  note: string;
}

const t = (
  name: string,
  month: number,
  note = "",
  kind: "Fixed" | "Rolling" = "Fixed",
): IntakeTemplate => ({
  name,
  month,
  kind,
  note,
});

export const INTAKE_TEMPLATES: Record<
  RegionCode,
  Partial<Record<InstitutionType, IntakeTemplate[]>>
> = {
  UK: {
    university: [
      t("September", 9, "Main UG/PGT entry; UCAS cycle"),
      t("January", 1, "PGT and selected UG"),
    ],
    college: [
      t("September", 9, "Main FE entry"),
      t("Rolling (apprenticeships)", 9, "Start any date with employer", "Rolling"),
    ],
    school: [
      t("September", 9, "Main entry"),
      t("In-year admission", 9, "Joins mid-year", "Rolling"),
    ],
  },
  LK: {
    university: [
      t("Main intake", 3, "State universities follow the UGC cycle"),
      t("February", 2, "Private / transnational HE"),
      t("June", 6),
      t("October", 10),
    ],
    college: [t("Rolling (NVQ)", 1, "Monthly batches", "Rolling")],
    school: [
      t("January", 1, "Government calendar"),
      t("Late August", 8, "International schools (late Aug – early Jul)"),
    ],
  },
  AU: {
    university: [
      t("Semester 1 (Feb)", 2, "Census date applies (TCSI/HELP)"),
      t("Semester 2 (Jul)", 7, "Census date applies"),
    ],
    college: [
      t("Term intakes", 2, "VET terms"),
      t("Rolling (VET)", 1, "Start any Monday", "Rolling"),
    ],
    school: [t("Term 1 (late Jan)", 1, "Main entry"), t("In-year admission", 1, "", "Rolling")],
  },
  AE: {
    university: [t("Fall (Sep)", 9), t("Spring (Jan)", 1)],
    college: [t("Fall (Sep)", 9), t("Spring (Jan)", 1)],
    school: [
      t("Late August", 8, "Unified calendar — 31 Aug 2026 start (British / IB / American)"),
      t("April", 4, "Indian curriculum (CBSE)"),
      t("In-year admission", 8, "", "Rolling"),
    ],
  },
  SA: {
    university: [t("Semester 1 (Aug)", 8), t("Semester 2 (Jan)", 1)],
    school: [t("August", 8)],
  },
  QA: {
    university: [t("Fall (Sep)", 9), t("Spring (Jan)", 1)],
    school: [t("August/September", 8)],
  },
  IN: {
    university: [
      t("July/August", 7, "Main academic session"),
      t("January", 1, "Some universities (UGC permits biannual)"),
    ],
    school: [t("April", 4, "CBSE / CISCE")],
  },
  SG: {
    university: [t("August", 8, "Autonomous universities")],
    college: [
      t("Monthly (PEI)", 1, "Private education institutions run frequent intakes", "Rolling"),
    ],
    school: [t("January", 1)],
  },
  MY: {
    university: [t("September", 9), t("February/March", 2, "Private HEIs"), t("July", 7)],
    school: [t("January", 1)],
  },
  GLOBAL: {
    university: [t("September", 9), t("January", 1)],
    school: [t("September", 9)],
  },
};

/** Regions where per-unit census dates drive funding / loan liability. */
export const CENSUS_DATE_REGIONS: RegionCode[] = ["AU"];

/* ── Year-group placement by age ─────────────────────────────────────────────
 * Schools place an entrant by age on the curriculum's cut-off date. Rules are
 * keyed by curriculum framework (a British school in Dubai uses 31 Aug; its
 * CBSE stream uses 31 Mar). Demo-grade — confirm per regulator. */

export interface PlacementRule {
  cutoff: string; // "MM-DD"
  /** Year number = age on cut-off − offset. */
  offset: number;
  /** Label for year 1 and above. */
  label: (n: number) => string;
  /** Default early-years stages, youngest first; the LAST is the year before
   *  year 1 (n = 0). A curriculum's own stage names override these. */
  earlyYears: string[];
  note: string;
}

export const PLACEMENT_RULES: Record<string, PlacementRule> = {
  British: {
    cutoff: "08-31",
    offset: 4,
    label: (n) => `Year ${n}`,
    earlyYears: ["Nursery (FS1)", "Reception (FS2)"],
    note: "Age on 31 August before the year; Year 1 = age 5, Reception = 4, Nursery = 3",
  },
  IB: {
    cutoff: "08-31",
    offset: 4,
    label: (n) => (n >= 12 ? `IB DP Year ${n - 11}` : n >= 7 ? `MYP ${n - 6}` : `Year ${n}`),
    earlyYears: ["PYP Early Years 1", "PYP Early Years 2"],
    note: "Mapped to British year equivalents (DP1 ≈ Year 12)",
  },
  CBSE: {
    cutoff: "03-31",
    offset: 5,
    label: (n) => `Grade ${n}`,
    earlyYears: ["Nursery", "LKG", "UKG"],
    note: "Age on 31 March; Grade 1 = age 6, UKG = 5, LKG = 4, Nursery = 3",
  },
  "Sri Lankan National": {
    cutoff: "01-31",
    offset: 5,
    label: (n) => `Grade ${n}`,
    earlyYears: ["Pre-school"],
    note: "Grade 1 = age 5 by 31 January",
  },
  Australian: {
    cutoff: "07-31",
    offset: 5,
    label: (n) => `Year ${n}`,
    earlyYears: ["Preschool", "Kindergarten"],
    note: "NSW: Kindergarten if 5 by 31 July (varies by state)",
  },
  American: {
    cutoff: "08-31",
    offset: 5,
    label: (n) => `Grade ${n}`,
    earlyYears: ["Pre-K", "Kindergarten"],
    note: "Grade 1 = age 6 by cut-off (varies by state/emirate)",
  },
};

/**
 * Suggested year group for a date of birth entering on `start`. The cut-off
 * used is the latest one on or before start + 2 months, so an in-year joiner
 * in January is placed by the cut-off that opened that academic year.
 */
export function suggestYearGroup(
  framework: string,
  dob: string,
  start: string,
  /** The curriculum's year groups (youngest first). Stages before year 1 —
   *  e.g. "Lower Nursery", "Upper Nursery", "Pre-Grade" — name early years. */
  yearGroups?: string[],
): { label: string; cutoffDate: string; tooYoung?: boolean } | null {
  const rule = PLACEMENT_RULES[framework];
  if (!rule || !dob || !start) return null;
  const limit = new Date(start + "T00:00:00Z");
  limit.setUTCMonth(limit.getUTCMonth() + 2);
  let y = limit.getUTCFullYear();
  if (`${y}-${rule.cutoff}` > limit.toISOString().slice(0, 10)) y--;
  const cutoffDate = `${y}-${rule.cutoff}`;
  const b = new Date(dob + "T00:00:00Z");
  const c = new Date(cutoffDate + "T00:00:00Z");
  let age = c.getUTCFullYear() - b.getUTCFullYear();
  if (
    c.getUTCMonth() < b.getUTCMonth() ||
    (c.getUTCMonth() === b.getUTCMonth() && c.getUTCDate() < b.getUTCDate())
  )
    age--;
  const n = age - rule.offset;
  if (n >= 1) return { label: rule.label(n), cutoffDate };
  // Early years: count back from the stage just before year 1.
  const first = yearGroups?.indexOf(rule.label(1)) ?? -1;
  const stages = first > 0 ? yearGroups!.slice(0, first) : rule.earlyYears;
  const idx = stages.length - 1 + n;
  if (idx >= 0) return { label: stages[idx], cutoffDate };
  return { label: `Too young for ${stages[0]}`, cutoffDate, tooYoung: true };
}

/** Official-id fields a region exposes for a segment. */
export function idFieldsFor(
  region: RegionCode,
  type: InstitutionType,
  keys?: string[],
): IdFieldDef[] {
  const list = keys ?? REGIONS[region].idFields;
  return list
    .map((k) => ID_FIELDS[k])
    .filter((f): f is IdFieldDef => !!f && (!f.segments || f.segments.includes(type)));
}

/** Regulator returns a region expects from a segment. */
export function returnsFor(
  region: RegionCode,
  type: InstitutionType,
  subRegion?: string,
): RegulatorReturnDef[] {
  return REGIONS[region].returns.filter(
    (r) => r.segments.includes(type) && appliesInSubRegion(r, subRegion),
  );
}

/** A sub-jurisdiction return (KHDA vs ADEK vs SPEA) applies only where the tenant is. */
export function appliesInSubRegion(r: RegulatorReturnDef, subRegion?: string): boolean {
  return !r.subRegions || (!!subRegion && r.subRegions.includes(subRegion));
}

export function classify(region: RegionCode, avg: number): string {
  const bands = REGIONS[region].degreeBands;
  return (bands.find((b) => avg >= b.min) ?? bands[bands.length - 1]).label;
}

/** Format money in a currency (whole units). */
/** Format a ledger amount (in `currency`) in the app's display currency —
 *  one currency across every screen (see lib/displayCurrency.ts). */
export function money(amount: number, currency: string): string {
  const to = getDisplayCurrency();
  const v = convert(amount, currency, to);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: to,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${to} ${Math.round(v).toLocaleString()}`;
  }
}
